import { INITIAL_DEFAULT_CONFIG, UserAccount, DEFAULT_LICENSE } from '../config';
import { Security, StateManager } from '../core';
import { 
    isSupabaseConfigured, 
    fetchUsersFromSupabase, 
    syncUserToSupabase, 
    logoutWithSupabaseAuth,
    loginWithSupabaseAuth,
    registerWithSupabaseAuth,
    fetchConfigFromSupabase,
    syncConfigToSupabase,
    unsubscribeFromConfigChanges,
    checkIfSuperAdmin
} from '../supabase';
import { appWheel } from '../engine';
import { showAppMain } from './publicidadController';

// --- ARQUITECTURA MODULAR Y ESCALABLE DE AUTENTICACIÓN ---

export type AuthEvent = 
    | 'beforeLogin' | 'loginSuccess' | 'loginFailure'
    | 'beforeRegister' | 'registerSuccess' | 'registerFailure'
    | 'fieldChanged' | 'modeChanged' | 'passwordToggle'
    | 'logout';

export type AuthCallback = (...args: any[]) => void;

export interface ValidationResult {
    isValid: boolean;
    message?: string;
}

export class AuthController {
    private static instance: AuthController;
    private eventListeners: Map<AuthEvent, Set<AuthCallback>> = new Map();
    private customValidators: Map<string, Array<(value: string) => ValidationResult>> = new Map();

    private constructor() {
        const events: AuthEvent[] = [
            'beforeLogin', 'loginSuccess', 'loginFailure',
            'beforeRegister', 'registerSuccess', 'registerFailure',
            'fieldChanged', 'modeChanged', 'passwordToggle',
            'logout'
        ];
        events.forEach(evt => this.eventListeners.set(evt, new Set()));
        
        // Registrar validadores por defecto de forma modular
        this.registerDefaultValidators();
    }

    public static getInstance(): AuthController {
        if (!AuthController.instance) {
            AuthController.instance = new AuthController();
        }
        return AuthController.instance;
    }

    // --- REGISTRO DE EVENTOS (Observer / PubSub) ---

    public on(event: AuthEvent, callback: AuthCallback): () => void {
        const set = this.eventListeners.get(event);
        if (set) {
            set.add(callback);
        }
        return () => this.off(event, callback);
    }

    public off(event: AuthEvent, callback: AuthCallback): void {
        const set = this.eventListeners.get(event);
        if (set) {
            set.delete(callback);
        }
    }

    public emit(event: AuthEvent, ...args: any[]): void {
        const set = this.eventListeners.get(event);
        if (set) {
            set.forEach(cb => {
                try {
                    cb(...args);
                } catch (e) {
                    console.error(`[AuthController Event Error] Evento '${event}':`, e);
                }
            });
        }
    }

    // --- PIPELINE DE VALIDACIÓN MODULAR ---

    public addValidator(fieldName: string, validator: (value: string) => ValidationResult): void {
        if (!this.customValidators.has(fieldName)) {
            this.customValidators.set(fieldName, []);
        }
        this.customValidators.get(fieldName)!.push(validator);
    }

    public validateField(fieldName: string, value: string): ValidationResult {
        const validators = this.customValidators.get(fieldName);
        if (validators) {
            for (const val of validators) {
                const res = val(value);
                if (!res.isValid) return res;
            }
        }
        return { isValid: true };
    }

    private registerDefaultValidators(): void {
        // Validador por defecto para emails (cuando no se está en modo ID de Acceso)
        this.addValidator('authEmail', (val) => {
            if (!val.trim()) {
                return { isValid: false, message: "El campo no puede estar vacío." };
            }

            // Si es modo tradicional o normal, validar formato email
            if (!val.includes('@')) {
                return { isValid: false, message: "Por favor, ingresa un correo electrónico válido." };
            }

            return { isValid: true };
        });

        // Validador de PIN / Contraseña por defecto
        this.addValidator('authPin', (val) => {
            if (!val.trim()) {
                return { isValid: false, message: "El PIN / Contraseña no puede estar vacío." };
            }
            if (val.length < 4) {
                return { isValid: false, message: "Debe tener al menos 4 caracteres." };
            }
            return { isValid: true };
        });
    }
}

export const authController = AuthController.getInstance();

// --- RETROCOMPATIBILIDAD CON FUNCIONES ANTERIORES ---

interface AuthCallbacks {
    showCustomAlert: (message: string, title?: string) => void;
    addAuditEntry: (action: string) => void;
    initApp: () => Promise<void>;
}

let authCallbacks: AuthCallbacks | null = null;

export const setAuthCallbacks = (cb: AuthCallbacks) => {
    authCallbacks = cb;
};

export const togglePassword = (inputId: string, btn: HTMLElement) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerText = 'Ocultar';
        } else {
            input.type = 'password';
            btn.innerText = 'Ver';
        }
        authController.emit('passwordToggle', inputId, input.type);
    }
};

export const handleLogout = async (
    stopSyncSpinPolling: () => void,
    INITIAL_DEFAULT_CONFIG_REF: any
) => {
    stopSyncSpinPolling();
    unsubscribeFromConfigChanges();
    sessionStorage.removeItem('nexo_auth_active');
    sessionStorage.removeItem('nexo_current_session_pin');
    sessionStorage.removeItem('nexo_current_user_email');
    sessionStorage.removeItem('nexo_sub_account_active');
    sessionStorage.removeItem('nexo_sub_account_name');
    sessionStorage.removeItem('nexo_sub_account_role');
    sessionStorage.removeItem('nexo_sub_account_permissions');
    sessionStorage.removeItem('nexo_menu_open');
    sessionStorage.removeItem('nexo_active_tab');
    
    if (isSupabaseConfigured) {
        await logoutWithSupabaseAuth();
    }
    
    StateManager.config = JSON.parse(JSON.stringify(INITIAL_DEFAULT_CONFIG_REF));
    
    if (document.getElementById('modalConfig')) document.getElementById('modalConfig')!.style.display = 'none';
    if (document.getElementById('appMain')) document.getElementById('appMain')!.style.display = 'none';
    if (document.getElementById('loginScreen')) document.getElementById('loginScreen')!.style.display = 'flex';
    
    const pinVal = document.getElementById('authPin') as HTMLInputElement;
    if (pinVal) pinVal.value = "";
    const emailVal = document.getElementById('authEmail') as HTMLInputElement;
    if (emailVal) emailVal.value = "";

    authController.emit('logout');
};

export const initAuthHandlers = () => {
    const loginArea = document.getElementById('loginFormArea');
    const registerArea = document.getElementById('registerFormArea');
    const linkToRegister = document.getElementById('linkToRegister');
    const linkToLogin = document.getElementById('linkToLogin');

    const lblAuthEmail = document.getElementById('lblAuthEmail');
    const lblAuthPin = document.getElementById('lblAuthPin');
    const authEmailInput = document.getElementById('authEmail') as HTMLInputElement;
    const authPinInput = document.getElementById('authPin') as HTMLInputElement;

    const showCustomAlert = (m: string, t?: string) => {
        if (authCallbacks) authCallbacks.showCustomAlert(m, t);
    };

    const addAuditEntry = (a: string) => {
        if (authCallbacks) authCallbacks.addAuditEntry(a);
    };

    const initApp = async () => {
        if (authCallbacks) await authCallbacks.initApp();
    };

    // Detener la propagación de eventos táctiles y de clic para evitar efectos secundarios globales (ej. fullscreen no deseado)
    const preventPropagation = (e: Event) => {
        e.stopPropagation();
    };

    const setupInputSecurityAndPropagation = (input: HTMLInputElement | null, fieldName: string) => {
        if (!input) return;
        
        // Evitar propagación a gestos globales del juego
        input.addEventListener('click', preventPropagation);
        input.addEventListener('touchstart', preventPropagation, { passive: true });
        input.addEventListener('pointerdown', preventPropagation, { passive: true });
        
        // Notificar en tiempo real cambios de campo de manera modular
        input.addEventListener('input', (e) => {
            const val = (e.target as HTMLInputElement).value;
            authController.emit('fieldChanged', fieldName, val);
        });
    };

    // Configurar todos los campos interactivos de manera modular
    setupInputSecurityAndPropagation(authEmailInput, 'authEmail');
    setupInputSecurityAndPropagation(authPinInput, 'authPin');
    setupInputSecurityAndPropagation(document.getElementById('regCorpName') as HTMLInputElement, 'regCorpName');
    setupInputSecurityAndPropagation(document.getElementById('regEmail') as HTMLInputElement, 'regEmail');
    setupInputSecurityAndPropagation(document.getElementById('regPin') as HTMLInputElement, 'regPin');
    setupInputSecurityAndPropagation(document.getElementById('regPinConfirm') as HTMLInputElement, 'regPinConfirm');

    // Evitar propagación en los check de edad y términos
    const preventCheckboxPropagation = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', preventPropagation);
            el.addEventListener('touchstart', preventPropagation, { passive: true });
            el.addEventListener('pointerdown', preventPropagation, { passive: true });
        }
    };
    preventCheckboxPropagation('regAgeCheck');
    preventCheckboxPropagation('regTermsCheck');

    const showTermsAndConditions = (e: Event) => {
        e.preventDefault();
        preventPropagation(e);
        const termsText = `TÉRMINOS Y CONDICIONES DE USO - RULETA NEXO PREMIUM

1. ACEPTACIÓN DE LOS TÉRMINOS
Al registrarse o iniciar sesión y utilizar el sistema de sorteos "Ruleta Nexo Premium", usted acepta de manera irrevocable estos Términos y Condiciones. El sistema es desarrollado y de propiedad intelectual exclusiva de Nexo Network Ec.

2. REQUISITO DE EDAD (MAYORÍA DE EDAD)
Este sistema está diseñado y regulado para el uso exclusivo de personas mayores de 18 años. El administrador del local comercial o el usuario asume la total responsabilidad de verificar la identidad y edad legal de los participantes que interactúan con la ruleta.

3. USO DE LA PLATAFORMA
- Se prohíbe el uso fraudulento, manipulación de código o alteración de los mecanismos probabilísticos de la ruleta.
- La configuración de premios, probabilidades y stock de premios es responsabilidad única y exclusiva del administrador de la cuenta licenciataria. Nexo Network Ec no se responsabiliza por las pérdidas o reclamos derivados de la entrega de premios.

4. POLÍTICA DE DATOS Y PRIVACIDAD
El sistema puede almacenar de forma segura información sobre los participantes (leads) y logs de auditoría para fines estadísticos e históricos del local. Estos datos se manejan con estricto apego a las políticas de seguridad de la información.

5. LICENCIA Y PROPIEDAD
El software se distribuye bajo licencias individuales autorizadas por Nexo Network Ec. Queda prohibida la reproducción, reventa o distribución no autorizada de la plataforma.

Para mayor información o soporte técnico, contáctenos en:
WhatsApp: +593 0998166596
Email: contacto@tuempresa.com`;

        showCustomAlert(termsText, "TÉRMINOS Y CONDICIONES");
    };

    const linkTermsAuth = document.getElementById('linkTermsAuth');
    const linkTermsReg = document.getElementById('linkTermsReg');
    if (linkTermsAuth) linkTermsAuth.onclick = showTermsAndConditions;
    if (linkTermsReg) linkTermsReg.onclick = showTermsAndConditions;

    const btnAuthAction = document.getElementById('btnAuthAction') as HTMLButtonElement;

    const updateAuthButtonState = () => {
        if (btnAuthAction) {
            btnAuthAction.disabled = false;
        }
    };

    updateAuthButtonState();

    const regAgeCheck = document.getElementById('regAgeCheck') as HTMLInputElement;
    const regTermsCheck = document.getElementById('regTermsCheck') as HTMLInputElement;
    const btnRegisterAction = document.getElementById('btnRegisterAction') as HTMLButtonElement;

    const updateRegButtonState = () => {
        if (btnRegisterAction) {
            const ageOk = regAgeCheck ? regAgeCheck.checked : false;
            const termsOk = regTermsCheck ? regTermsCheck.checked : false;
            btnRegisterAction.disabled = !(ageOk && termsOk);
        }
    };

    if (regAgeCheck) {
        regAgeCheck.onchange = (e) => { preventPropagation(e); updateRegButtonState(); };
        regAgeCheck.onclick = (e) => { preventPropagation(e); updateRegButtonState(); };
        regAgeCheck.oninput = (e) => { preventPropagation(e); updateRegButtonState(); };
    }
    if (regTermsCheck) {
        regTermsCheck.onchange = (e) => { preventPropagation(e); updateRegButtonState(); };
        regTermsCheck.onclick = (e) => { preventPropagation(e); updateRegButtonState(); };
        regTermsCheck.oninput = (e) => { preventPropagation(e); updateRegButtonState(); };
    }
    updateRegButtonState();

    if (linkToRegister) {
        linkToRegister.onclick = (e) => {
            e.preventDefault();
            preventPropagation(e);
            if (loginArea) loginArea.style.display = 'none';
            if (registerArea) registerArea.style.display = 'block';
            authController.emit('modeChanged', 'view', 'register');
        };
    }

    if (linkToLogin) {
        linkToLogin.onclick = (e) => {
            e.preventDefault();
            preventPropagation(e);
            if (registerArea) registerArea.style.display = 'none';
            if (loginArea) loginArea.style.display = 'block';
            authController.emit('modeChanged', 'view', 'login');
        };
    }

    if (btnAuthAction) {
        btnAuthAction.onclick = async (e) => {
            preventPropagation(e);
            const emailInputVal = (document.getElementById('authEmail') as HTMLInputElement).value.trim();
            const pin = (document.getElementById('authPin') as HTMLInputElement).value.trim();
            const isSub = false;

            // Emitir evento 'beforeLogin' para permitir validaciones/modificaciones externas
            authController.emit('beforeLogin', { email: emailInputVal, pin, isSub, isKiosk: false });

            // Ejecutar validaciones modulares configuradas
            const emailValidation = authController.validateField('authEmail', emailInputVal);
            if (!emailValidation.isValid) {
                authController.emit('loginFailure', { error: emailValidation.message });
                return showCustomAlert(emailValidation.message || "Validación de email fallida.", "CREDENCIALES INVÁLIDAS");
            }

            const pinValidation = authController.validateField('authPin', pin);
            if (!pinValidation.isValid) {
                authController.emit('loginFailure', { error: pinValidation.message });
                return showCustomAlert(pinValidation.message || "Validación de contraseña/PIN fallida.", "CREDENCIALES INVÁLIDAS");
            }



            let authenticated = false;
            let subAccountData: any = null;
            let loadedConfig: any = null;
            let email = emailInputVal.toLowerCase();

            if (isSupabaseConfigured) {
                const res = await loginWithSupabaseAuth(email, pin);
                if (res.success) {
                    authenticated = true;
                    try {
                        let cloudConfig = await fetchConfigFromSupabase(email);
                        if (!cloudConfig) {
                            cloudConfig = JSON.parse(JSON.stringify(INITIAL_DEFAULT_CONFIG));
                            cloudConfig.license = { ...DEFAULT_LICENSE };
                            await syncConfigToSupabase(email, cloudConfig);
                        }
                        loadedConfig = cloudConfig;
                    } catch (err) {
                            console.error("Error sincronizando config al iniciar sesión:", err);
                        }
                    } else {
                        authController.emit('loginFailure', { error: res.error });
                        return showCustomAlert(res.error || "Credenciales incorrectas en Supabase.", "ERROR DE AUTENTICACIÓN");
                    }
            } else {
                authController.emit('loginFailure', { error: "Supabase no configurado" });
                return showCustomAlert("Error: Supabase no está configurado.", "ERROR");
            }

            if (authenticated && loadedConfig) {
                sessionStorage.setItem('nexo_auth_active', 'true');
                sessionStorage.setItem('nexo_current_session_pin', pin);
                sessionStorage.setItem('nexo_current_user_email', email);

                sessionStorage.removeItem('nexo_sub_account_active');
                sessionStorage.removeItem('nexo_sub_account_name');
                sessionStorage.removeItem('nexo_sub_account_role');
                sessionStorage.removeItem('nexo_sub_account_permissions');

                // Check and cache the Super Admin role status dynamically
                const isSuper = await checkIfSuperAdmin(email);
                sessionStorage.setItem('nexo_current_user_role', isSuper ? 'superadmin' : 'admin');
                sessionStorage.setItem('nexo_is_super_admin', isSuper ? 'true' : 'false');

                appWheel.audio.init();
                await initApp();

                if (document.getElementById('loginScreen')) document.getElementById('loginScreen')!.style.display = 'none';
                showAppMain();
                
                addAuditEntry(`[ÉXITO] Sesión iniciada para el usuario admin: ${email}`);
                authController.emit('loginSuccess', { type: isSub ? 'subaccount' : 'admin', email });
            } else {
                authController.emit('loginFailure', { error: "No se pudo cargar la configuración" });
                showCustomAlert("CREDENCIALES INCORRECTAS", "ERROR");
            }
        };
    }

    const btnRegisterActionEl = document.getElementById('btnRegisterAction') as HTMLButtonElement;
    if (btnRegisterActionEl) {
        btnRegisterActionEl.onclick = async (e) => {
            preventPropagation(e);
            const company = (document.getElementById('regCorpName') as HTMLInputElement).value.trim();
            const email = (document.getElementById('regEmail') as HTMLInputElement).value.trim().toLowerCase();
            const pin = (document.getElementById('regPin') as HTMLInputElement).value.trim();
            const pinConfirm = (document.getElementById('regPinConfirm') as HTMLInputElement).value.trim();

            authController.emit('beforeRegister', { company, email, pin });

            if (!company || !email || !pin || !pinConfirm) {
                authController.emit('registerFailure', { error: "Campos incompletos" });
                return showCustomAlert("POR FAVOR, COMPLETE TODOS LOS CAMPOS", "ATENCIÓN");
            }
            if (pin.length < 4) {
                authController.emit('registerFailure', { error: "Contraseña muy corta" });
                return showCustomAlert("LA CONTRASEÑA DEBE TENER AL MENOS 4 CARACTERES", "ATENCIÓN");
            }
            if (pin !== pinConfirm) {
                authController.emit('registerFailure', { error: "Contraseñas no coinciden" });
                return showCustomAlert("LAS CONTRASEÑAS NO COINCIDEN", "ATENCIÓN");
            }

            const regAgeCheck = document.getElementById('regAgeCheck') as HTMLInputElement;
            const regTermsCheck = document.getElementById('regTermsCheck') as HTMLInputElement;

            if (regAgeCheck && !regAgeCheck.checked) {
                authController.emit('registerFailure', { error: "Debe ser mayor de 18 años" });
                return showCustomAlert("Debe certificar que es mayor de 18 años para poder registrarse.", "REQUISITO DE EDAD");
            }
            if (regTermsCheck && !regTermsCheck.checked) {
                authController.emit('registerFailure', { error: "Debe aceptar términos" });
                return showCustomAlert("Debe aceptar los Términos y Condiciones para poder registrarse.", "TÉRMINOS Y CONDICIONES");
            }

            if (isSupabaseConfigured) {
                const res = await registerWithSupabaseAuth(email, pin, company);
                if (res.success) {
                    authController.emit('registerSuccess', { email, company });
                    if (res.fallbackUsed) {
                        showCustomAlert(
                            "¡REGISTRO COMPLETADO EXITOSAMENTE!\n\n" +
                            "Tu cuenta ha sido creada directamente en el sistema de base de datos de manera segura.\n\n" +
                            "Ya puedes iniciar sesión inmediatamente con tu correo y PIN/Contraseña sin necesidad de confirmación por correo.",
                            "REGISTRO EXITOSO (SISTEMA DE RESPALDO)"
                        );
                    } else if (res.confirmationRequired) {
                        showCustomAlert(
                            "¡REGISTRO INICIADO EN SUPABASE!\n\n" +
                            "Se ha enviado un correo electrónico de confirmación desde Supabase.\n" +
                            "Por favor, revisa tu bandeja de entrada y confirma tu cuenta haciendo clic en el enlace para poder iniciar sesión por primera vez.\n\n" +
                            "Si no encuentras el correo, revisa tu carpeta de Spam.",
                            "CONFIRMACIÓN REQUERIDA"
                        );
                    } else {
                        showCustomAlert(
                            "¡REGISTRO EXITOSO NATIVAMENTE EN SUPABASE!\n\n" +
                            "Tu cuenta ha sido creada con éxito. Ya puedes iniciar sesión con tus credenciales.",
                            "ÉXITO"
                        );
                    }
                    if (linkToLogin) linkToLogin.click();
                } else {
                    authController.emit('registerFailure', { error: res.error });
                    showCustomAlert(`Error de registro en Supabase: ${res.error}`, "ERROR");
                }
            } else {
                authController.emit('registerFailure', { error: "Supabase no configurado" });
                showCustomAlert("Error: Supabase no está configurado.", "ERROR");
            }
        };
    }

    const btnLogOut = document.getElementById('btnLogOut');
    if (btnLogOut) {
        btnLogOut.onclick = async (e) => {
            preventPropagation(e);
            const handleLogoutExported = (window as any).handleLogout;
            if (handleLogoutExported) {
                await handleLogoutExported();
            }
        };
    }
};
