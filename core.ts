
import { AppConfig, INITIAL_DEFAULT_CONFIG, LicenseControl, OFFLINE_SECRET, DEVICE_ID_KEY, Prize, THEME_PRESETS } from './config';
import { isSupabaseConfigured, syncConfigToSupabase, fetchConfigFromSupabase, syncSorteoToSupabase, Sorteo } from './supabase';

/**
 * Enterprise Security Engine
 * Proporciona criptografía asíncrona de grado militar para proteger bases de datos locales.
 */
export class Security {
    static getDeviceId(): string {
        let id = localStorage.getItem(DEVICE_ID_KEY);
        if (!id) {
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            const gen = (len: number) => Array.from({ length: len }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
            id = `NX-${gen(4)}-${gen(4)}`;
            localStorage.setItem(DEVICE_ID_KEY, id);
        }
        return id;
    }

    private static async getAesKey(): Promise<CryptoKey> {
        const enc = new TextEncoder();
        const salt = enc.encode("NEXO_PRO_SALT_2025");
        const keyMaterial = await crypto.subtle.importKey(
            "raw", enc.encode(this.getDeviceId() + "NEXO_SECURE"),
            { name: "PBKDF2" }, false, ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
            keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
        );
    }

    static async encrypt(data: any): Promise<string> {
        try {
            const key = await this.getAesKey();
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const enc = new TextEncoder();
            const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(data)));
            return btoa(JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) }));
        } catch (e) {
            console.error("Encryption failed, falling back to base64", e);
            return btoa(JSON.stringify(data));
        }
    }

    static async decrypt(base64Str: string): Promise<any> {
        try {
            const payload = JSON.parse(atob(base64Str));
            if (payload.iv && payload.data) {
                const key = await this.getAesKey();
                const decrypted = await crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: new Uint8Array(payload.iv) },
                    key, new Uint8Array(payload.data)
                );
                return JSON.parse(new TextDecoder().decode(decrypted));
            }
            return payload;
        } catch (e) {
            try { return JSON.parse(base64Str); } catch (ex) { return null; }
        }
    }

    static generateNexoSignature(deviceId: string, secret: string): string {
        const raw = deviceId + secret;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            hash = ((hash << 5) - hash) + raw.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0').substring(0, 8);
    }

    static generateNexoChecksum(tierCode: string, dateStr: string): string {
        const salt = "NEXO_SECURE_PRO_2025";
        const raw = tierCode + dateStr + salt;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            hash = ((hash << 5) - hash) + raw.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash).toString(36).toUpperCase().substring(0, 5);
    }

    static validateOfflineLicenseV1(input: string, currentSessionEmail: string | null): LicenseControl | null {
        // Normalizar solo el prefijo para la comprobación, pero usar la entrada original para el split
        if (!input.toUpperCase().startsWith("NEXO-V1-")) return null;
        const parts = input.split("-");
        if (parts.length < 4) return null;

        const dataBase64 = parts[2];
        const signature = parts[3];

        try {
            // Base64 es sensible a mayúsculas, por eso 'input' no debe ser normalizado antes del split
            const decoded = JSON.parse(atob(dataBase64));
            const { id, exp, type, email } = decoded;

            // Verificaciones estrictas de hardware e identidad
            if (id !== this.getDeviceId()) return null;
            if (email && email.toLowerCase() !== currentSessionEmail?.toLowerCase()) return null;
            
            const expiryDate = new Date(exp);
            if (expiryDate < new Date()) return null;
            
            const expectedSign = this.generateNexoSignature(id, OFFLINE_SECRET);
            if (signature.toUpperCase() !== expectedSign) return null;

            return { tier: type as any, expiryDate: expiryDate.toISOString(), licenseKey: input, isActive: true };
        } catch (e) { return null; }
    }

    static validateLicenseAlgorithm(key: string, currentSessionEmail: string | null): LicenseControl | null {
        // Intentar validación V1 primero (sensible a mayúsculas en el bloque de datos)
        const v1License = this.validateOfflineLicenseV1(key, currentSessionEmail);
        if (v1License) return v1License;

        // Validación estándar NX- (Normalizar solo para el chequeo de formato)
        const parts = key.split('-');
        if (parts.length !== 4 || parts[0].toUpperCase() !== 'NX') return null;
        
        const tierMap: Record<string, 'LITE' | 'PRO' | 'ENTERPRISE'> = { 'LT': 'LITE', 'PR': 'PRO', 'ENT': 'ENTERPRISE' };
        const tier = tierMap[parts[1].toUpperCase()];
        if (!tier) return null;

        const dateStr = parts[2];
        if (dateStr.length !== 8) return null;
        
        try {
            const year = parseInt(dateStr.substring(0,4));
            const month = parseInt(dateStr.substring(4,6)) - 1;
            const day = parseInt(dateStr.substring(6,8));
            const expiry = new Date(year, month, day);
            if (isNaN(expiry.getTime())) return null;

            const checksum = parts[3].toUpperCase();
            const expectedChecksum = this.generateNexoChecksum(parts[1].toUpperCase(), dateStr);
            
            if (checksum !== expectedChecksum) return null;

            return { tier: tier, expiryDate: expiry.toISOString(), licenseKey: key.toUpperCase(), isActive: true };
        } catch (e) { return null; }
    }
}

export class StateManager {
    static config: AppConfig = JSON.parse(JSON.stringify(INITIAL_DEFAULT_CONFIG));
    static saveTimeout: number | undefined;
    static onSaveComplete: () => void = () => {};
    static lastSaveTime: number = 0;

    static async load() {
        const userEmail = sessionStorage.getItem('nexo_current_user_email');
        if (!userEmail) return;
        
        let loadedConfig: any = null;
        let loadedFromSupabase = false;

        if (isSupabaseConfigured) {
            try {
                loadedConfig = await fetchConfigFromSupabase(userEmail);
                if (loadedConfig) {
                    console.log("Configuración cargada exitosamente desde Supabase.");
                    loadedFromSupabase = true;
                }
            } catch (err) {
                console.error("Error cargando desde Supabase:", err);
            }
        }

        // Si no se encuentra en la nube, intenta cargar desde la caché local segura antes de reiniciar de fábrica
        if (!loadedConfig) {
            try {
                const workspaceKey = "nexo_pro_workspace_" + btoa(userEmail.toLowerCase()).substring(0, 16);
                const stored = localStorage.getItem(workspaceKey);
                if (stored) {
                    const decrypted = await Security.decrypt(stored);
                    if (decrypted) {
                        loadedConfig = decrypted;
                        console.log("Configuración cargada desde la caché local segura como respaldo.");
                        // Sincronizar inmediatamente de vuelta a Supabase para migrar el estado local a la nube
                        if (isSupabaseConfigured) {
                            await syncConfigToSupabase(userEmail, loadedConfig);
                            console.log("Configuración local migrada exitosamente a la nube en Supabase.");
                            loadedFromSupabase = true;
                        }
                    }
                }
            } catch (e) {
                console.error("Error al recuperar caché local segura:", e);
            }
        }

        if (loadedConfig) {
            this.config = { ...JSON.parse(JSON.stringify(INITIAL_DEFAULT_CONFIG)), ...loadedConfig };
            
            // Upgrade standard preset theme customizations to the new trending colors if they use old values or are missing
            if (this.config.themeCustomizations) {
                const OLD_PRESETS: Record<string, { primary: string, secondary: string }> = {
                    'nexo-gold': { primary: '#d4af37', secondary: '#8a6d1d' },
                    'nexo-store': { primary: '#e63946', secondary: '#1d3557' },
                    'nexo-beauty': { primary: '#ec4899', secondary: '#be185d' },
                    'nexo-family': { primary: '#f97316', secondary: '#7c2d12' },
                    'nexo-kids': { primary: '#0ea5e9', secondary: '#facc15' },
                    'nexo-halloween': { primary: '#ea580c', secondary: '#4c1d95' }
                };
                const CURRENT_PRESETS = JSON.parse(JSON.stringify(THEME_PRESETS));
                for (const key of Object.keys(CURRENT_PRESETS)) {
                    const loadedPreset = this.config.themeCustomizations[key];
                    if (!loadedPreset) {
                        this.config.themeCustomizations[key] = CURRENT_PRESETS[key];
                    } else {
                        const old = OLD_PRESETS[key];
                        const isPrimaryOld = !loadedPreset.primary || (old && loadedPreset.primary.toLowerCase() === old.primary.toLowerCase());
                        const isSecondaryOld = !loadedPreset.secondary || (old && loadedPreset.secondary.toLowerCase() === old.secondary.toLowerCase());
                        if (isPrimaryOld || isSecondaryOld) {
                            this.config.themeCustomizations[key].primary = CURRENT_PRESETS[key].primary;
                            this.config.themeCustomizations[key].secondary = CURRENT_PRESETS[key].secondary;
                            this.config.themeCustomizations[key].logo = CURRENT_PRESETS[key].logo;
                            this.config.themeCustomizations[key].bg = CURRENT_PRESETS[key].bg;
                        }
                    }
                }
            }
        } else {
            this.config = JSON.parse(JSON.stringify(INITIAL_DEFAULT_CONFIG));
            await this.saveImmediate();
        }

        // Seeding and synchronization of games / prize lists
        let needsSave = false;

        if (!this.config.savedPrizeLists) {
            this.config.savedPrizeLists = [];
            needsSave = true;
        } else {
            // Saneamiento de listas de premios con ID duplicado para corregir la anomalía heredada
            const seenIds = new Set<string>();
            const uniqueLists = [];
            for (const list of this.config.savedPrizeLists) {
                if (list && list.id) {
                    if (!seenIds.has(list.id)) {
                        seenIds.add(list.id);
                        uniqueLists.push(list);
                    } else {
                        needsSave = true;
                    }
                }
            }
            this.config.savedPrizeLists = uniqueLists;
        }

        let leadsGame = this.config.savedPrizeLists.find(l => l.id === "list_leads_default" || l.name === "Captura de Leads");
        if (!leadsGame) {
            leadsGame = {
                id: "list_leads_default",
                name: "Captura de Leads",
                prizes: [
                    { name: "PREMIO 1" },
                    { name: "PREMIO 2" },
                    { name: "PREMIO 3" },
                    { name: "PREMIO 4" }
                ],
                formFields: [
                    { id: "nombre", label: "Nombre Completo", placeholder: "Ej: Juan Pérez" },
                    { id: "telefono", label: "Teléfono / WhatsApp", placeholder: "Ej: 0998877665" },
                    { id: "email", label: "Correo Electrónico", placeholder: "Ej: juan@mail.com" }
                ],
                localRequireRegister: false,
                autoRemoveWinner: false,
                localSessionListEnabled: false,
                localSessionId: "session_leads_" + Date.now().toString(),
                raffleMode: false
            };
            this.config.savedPrizeLists.push(leadsGame);
            needsSave = true;
        } else {
            if (leadsGame.id !== "list_leads_default") {
                leadsGame.id = "list_leads_default";
                needsSave = true;
            }
        }

        let raffleGame = this.config.savedPrizeLists.find(l => l.id === "list_raffle_default" || l.name === "Modo Sorteo (Ruleta de Participantes)" || l.name === "Modo Sorteo (Participantes como opciones)");
        if (!raffleGame) {
            raffleGame = {
                id: "list_raffle_default",
                name: "Modo Sorteo (Ruleta de Participantes)",
                prizes: [],
                formFields: JSON.parse(JSON.stringify(leadsGame.formFields)),
                localRequireRegister: true,
                autoRemoveWinner: leadsGame.autoRemoveWinner !== undefined ? leadsGame.autoRemoveWinner : false,
                localSessionListEnabled: leadsGame.localSessionListEnabled !== undefined ? leadsGame.localSessionListEnabled : false,
                localSessionId: "session_raffle_" + Date.now().toString(),
                raffleMode: true
            };
            this.config.savedPrizeLists.push(raffleGame);
            needsSave = true;
        } else {
            raffleGame.name = "Modo Sorteo (Ruleta de Participantes)";
            if (raffleGame.id !== "list_raffle_default") {
                raffleGame.id = "list_raffle_default";
                needsSave = true;
            }
            // Update to match "Captura de Leads" options if not already present, ensuring independence
            if (!raffleGame.formFields || raffleGame.formFields.length === 0) {
                raffleGame.formFields = JSON.parse(JSON.stringify(leadsGame.formFields));
                needsSave = true;
            }
            if (!raffleGame.prizes) {
                raffleGame.prizes = [];
                needsSave = true;
            }
            if (raffleGame.autoRemoveWinner === undefined) {
                raffleGame.autoRemoveWinner = leadsGame.autoRemoveWinner;
                needsSave = true;
            }
            if (raffleGame.localSessionListEnabled === undefined) {
                raffleGame.localSessionListEnabled = leadsGame.localSessionListEnabled;
                needsSave = true;
            }
            if (!raffleGame.localRequireRegister || !raffleGame.raffleMode) {
                raffleGame.localRequireRegister = true; // Always true for raffle mode
                raffleGame.raffleMode = true; // Always true for raffle mode
                needsSave = true;
            }
        }

        // Clean default/residual prizes for returning users in raffleGame
        const isDefaultName = (name: string) => {
            const n = name.toUpperCase().trim();
            return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                   n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                   n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
        };
        if (raffleGame.prizes && raffleGame.prizes.length > 0) {
            const filtered = raffleGame.prizes.filter(p => !isDefaultName(p.name));
            if (filtered.length !== raffleGame.prizes.length) {
                raffleGame.prizes = filtered;
                needsSave = true;
            }
        }
        
        // Also clean current active config if raffleMode is enabled and current prizes are default ones
        if (this.config.raffleMode && this.config.prizes && this.config.prizes.length > 0) {
            const filtered = this.config.prizes.filter(p => !isDefaultName(p.name));
            if (filtered.length !== this.config.prizes.length) {
                this.config.prizes = filtered;
                needsSave = true;
            }
        }

        let publicQrGame = this.config.savedPrizeLists.find(l => l.id === "list_public_qr_default" || l.name === "Participación Pública (Modo QR)");
        if (!publicQrGame) {
            publicQrGame = {
                id: "list_public_qr_default",
                name: "Participación Pública (Modo QR)",
                prizes: JSON.parse(JSON.stringify(leadsGame.prizes)),
                formFields: JSON.parse(JSON.stringify(leadsGame.formFields)),
                localRequireRegister: false,
                autoRemoveWinner: false,
                localSessionListEnabled: false,
                localSessionId: "session_public_" + Date.now().toString(),
                raffleMode: false,
                publicJoinEnabled: false,
                publicRegisterEnabled: false,
                publicRemoveWinner: false,
                publicSessionListEnabled: false,
                publicLiveViewEnabled: false,
                publicAfterAction: 'none',
                publicPromoUrl: '',
                publicMaxParticipants: 0,
                publicTimeLimit: 0,
                syncSpinEnabled: false
            };
            this.config.savedPrizeLists.push(publicQrGame);
            needsSave = true;
        } else {
            publicQrGame.name = "Participación Pública (Modo QR)";
            if (publicQrGame.id !== "list_public_qr_default") {
                publicQrGame.id = "list_public_qr_default";
                needsSave = true;
            }
        }

        let lightningGame = this.config.savedPrizeLists.find(l => l.id === "list_lightning_game" || l.name === "Juego Relámpago");
        if (!lightningGame) {
            lightningGame = {
                id: "list_lightning_game",
                name: "Juego Relámpago",
                prizes: JSON.parse(JSON.stringify(leadsGame.prizes)),
                formFields: JSON.parse(JSON.stringify(leadsGame.formFields)),
                localRequireRegister: false,
                autoRemoveWinner: false,
                localSessionListEnabled: false,
                localSessionId: "session_lightning_" + Date.now().toString(),
                raffleMode: false,
                publicJoinEnabled: false,
                publicRegisterEnabled: false,
                publicRemoveWinner: false,
                publicSessionListEnabled: false,
                publicLiveViewEnabled: false,
                publicAfterAction: 'none',
                publicPromoUrl: '',
                publicMaxParticipants: 0,
                publicTimeLimit: 3, // 3 minutes default for lightning game
                syncSpinEnabled: false
            };
            this.config.savedPrizeLists.push(lightningGame);
            needsSave = true;
        } else {
            lightningGame.name = "Juego Relámpago";
            if (lightningGame.id !== "list_lightning_game") {
                lightningGame.id = "list_lightning_game";
                needsSave = true;
            }
        }

        let juegoEstandar = this.config.savedPrizeLists.find(l => l.id === "list_juego_estandar" || l.name === "Juego Estándar");
        if (!juegoEstandar) {
            juegoEstandar = {
                id: "list_juego_estandar",
                name: "Juego Estándar",
                prizes: [
                    { name: "DESCUENTO 10%" },
                    { name: "PREMIO SORPRESA" },
                    { name: "INTÉNTALO OTRA VEZ" },
                    { name: "ENVÍO GRATIS" },
                    { name: "REGALO ESPECIAL" },
                    { name: "Cupón de $5" }
                ],
                formFields: [
                    { id: "nombre", label: "Nombre Completo", placeholder: "Ej: Juan Pérez" },
                    { id: "telefono", label: "Teléfono / WhatsApp", placeholder: "Ej: 0998877665" },
                    { id: "email", label: "Correo Electrónico", placeholder: "Ej: juan@mail.com" }
                ],
                localRequireRegister: false,
                autoRemoveWinner: false,
                localSessionListEnabled: false,
                localSessionId: "session_estandar_" + Date.now().toString(),
                raffleMode: false
            };
            this.config.savedPrizeLists.push(juegoEstandar);
            needsSave = true;
        } else {
            juegoEstandar.name = "Juego Estándar";
            if (juegoEstandar.id !== "list_juego_estandar") {
                juegoEstandar.id = "list_juego_estandar";
                needsSave = true;
            }
        }
        
        // Data Migration Layer
        if (this.config.adBannersImages && (!this.config.adBannersMedia || this.config.adBannersMedia.length === 0)) {
            this.config.adBannersMedia = this.config.adBannersImages.map(img => ({ type: 'image', data: img }));
            delete this.config.adBannersImages;
            needsSave = true;
        }
        
        // Migración de premios (Eliminando pesos heredados pero preservando otras propiedades especiales)
        if (this.config.prizes.length > 0) {
            const originalPrizes = JSON.stringify(this.config.prizes);
            // @ts-ignore
            this.config.prizes = this.config.prizes.map((p: any) => {
                if (typeof p === 'string') return { name: p };
                return { ...p, name: p.name };
            });
            if (originalPrizes !== JSON.stringify(this.config.prizes)) {
                needsSave = true;
            }
        }

        if (this.config.adHomeImage && (!this.config.adHomeImages || this.config.adHomeImages.length === 0)) {
            this.config.adHomeImages = [this.config.adHomeImage];
            needsSave = true;
        }

        // Auto-load "LISTA PREDETERMINADA" if current prizes are factory defaults
        const defaultSaved = this.config.savedPrizeLists?.find(l => l.name === "LISTA PREDETERMINADA");
        const isFactoryDefault = JSON.stringify(this.config.prizes) === JSON.stringify(INITIAL_DEFAULT_CONFIG.prizes);
        if (defaultSaved && isFactoryDefault) {
            this.config.prizes = JSON.parse(JSON.stringify(defaultSaved.prizes));
            if (defaultSaved.formFields) {
                this.config.formFields = JSON.parse(JSON.stringify(defaultSaved.formFields));
            }
            this.config.localRequireRegister = defaultSaved.localRequireRegister !== undefined ? defaultSaved.localRequireRegister : this.config.localRequireRegister;
            this.config.autoRemoveWinner = defaultSaved.autoRemoveWinner !== undefined ? defaultSaved.autoRemoveWinner : this.config.autoRemoveWinner;
            this.config.localSessionListEnabled = defaultSaved.localSessionListEnabled !== undefined ? defaultSaved.localSessionListEnabled : this.config.localSessionListEnabled;
            this.config.localSessionId = defaultSaved.localSessionId || this.config.localSessionId;
            this.config.raffleMode = defaultSaved.raffleMode !== undefined ? defaultSaved.raffleMode : this.config.raffleMode;
            this.config.activeSavedListId = defaultSaved.id;
            needsSave = true;
        }

        if (needsSave) {
            await this.saveImmediate();
        }
    }

    static save() {
        this.lastSaveTime = Date.now();
        if (this.saveTimeout) window.clearTimeout(this.saveTimeout);
        this.saveTimeout = window.setTimeout(() => this.saveImmediate(), 500);
    }

    static async saveImmediate() {
        this.lastSaveTime = Date.now();
        const userEmail = sessionStorage.getItem('nexo_current_user_email');
        if (!userEmail) return;

        // Auto-propagate current configuration back to the loaded list/game if activeSavedListId is set
        if (this.config.activeSavedListId && this.config.savedPrizeLists) {
            const listIndex = this.config.savedPrizeLists.findIndex(l => l.id === this.config.activeSavedListId);
            if (listIndex >= 0) {
                this.config.savedPrizeLists[listIndex].prizes = JSON.parse(JSON.stringify(this.config.prizes));
                this.config.savedPrizeLists[listIndex].formFields = JSON.parse(JSON.stringify(this.config.formFields));
                this.config.savedPrizeLists[listIndex].localRequireRegister = !!this.config.localRequireRegister;
                this.config.savedPrizeLists[listIndex].autoRemoveWinner = !!this.config.autoRemoveWinner;
                this.config.savedPrizeLists[listIndex].localSessionListEnabled = !!this.config.localSessionListEnabled;
                this.config.savedPrizeLists[listIndex].localSessionId = this.config.localSessionId || "local_" + Date.now().toString();
                this.config.savedPrizeLists[listIndex].raffleMode = !!this.config.raffleMode;
            }
        }

        if (isSupabaseConfigured) {
            try {
                await syncConfigToSupabase(userEmail, this.config);
                
                // Sincronizar el juego/modo activo con la tabla 'sorteos' de Supabase
                if (this.config.activeSavedListId && this.config.savedPrizeLists) {
                    const activeGame = this.config.savedPrizeLists.find(l => l.id === this.config.activeSavedListId);
                    if (activeGame) {
                        await syncSorteoToSupabase({
                            id: activeGame.id,
                            name: activeGame.name,
                            email: userEmail,
                            prizes: activeGame.prizes || [],
                            form_fields: activeGame.formFields || [],
                            local_require_register: !!activeGame.localRequireRegister,
                            auto_remove_winner: !!activeGame.autoRemoveWinner,
                            local_session_list_enabled: !!activeGame.localSessionListEnabled,
                            local_session_id: activeGame.localSessionId || '',
                            raffle_mode: !!activeGame.raffleMode,
                            spin_state: (activeGame as any).spin_state || { is_spinning: false, trigger_spin: false, timestamp: "" },
                            timer_state: (activeGame as any).timer_state || { time_remaining: 180, is_running: false, timestamp: "" }
                        });
                    }
                }
            } catch (err) {
                console.error("Error al sincronizar con Supabase en saveImmediate:", err);
            }
        }

        this.onSaveComplete();
    }
}
