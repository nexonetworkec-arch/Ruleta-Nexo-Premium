import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserAccount, AppConfig } from './config';

// @ts-ignore
const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
// @ts-ignore
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseAnonKey) 
    : null;

/**
 * Sincroniza un usuario registrado con Supabase para permitir el inicio de sesión multidispositivo.
 */
export async function syncUserToSupabase(user: UserAccount): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('nexo_users')
            .upsert({
                email: user.email.toLowerCase(),
                pin: user.pin,
                company: user.company || '',
                created_at: user.createdAt || new Date().toISOString()
            }, { onConflict: 'email' });
        
        if (error) {
            if (error.code === '42P01') {
                console.warn('La tabla nexo_users no existe en Supabase. Use supabase_setup.sql para crearla.');
            } else {
                console.warn('Error al sincronizar usuario con Supabase:', error.message || error);
            }
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en syncUserToSupabase:', e);
        return false;
    }
}

/**
 * Obtiene todos los usuarios desde Supabase.
 */
export async function fetchUsersFromSupabase(): Promise<UserAccount[]> {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('nexo_users')
            .select('*');
        
        if (error) {
            if (error.code === '42P01') {
                console.warn('La tabla nexo_users no existe en Supabase.');
            } else {
                console.warn('Error al obtener usuarios de Supabase:', error.message || error);
            }
            return [];
        }
        return (data || []).map(row => ({
            email: row.email,
            pin: row.pin,
            company: row.company,
            createdAt: row.created_at
        }));
    } catch (e) {
        console.warn('Excepción en fetchUsersFromSupabase:', e);
        return [];
    }
}

function recordApiTelemetry(startTime: number, success: boolean) {
    const durationMs = Date.now() - startTime;
    window.dispatchEvent(new CustomEvent('nexo-api-call', { detail: { durationMs, success } }));
}

/**
 * Sincroniza el AppConfig de un usuario con Supabase para persistencia en la nube.
 */
export async function syncConfigToSupabase(email: string, config: AppConfig): Promise<boolean> {
    if (!supabase) return false;
    const startTime = Date.now();
    try {
        const { error } = await supabase
            .from('nexo_configs')
            .upsert({
                email: email.toLowerCase(),
                config: config,
                updated_at: new Date().toISOString()
            }, { onConflict: 'email' });
        
        if (error) {
            if (error.code === '42P01') {
                console.warn('La tabla nexo_configs no existe en Supabase. Use supabase_setup.sql para crearla.');
            } else {
                console.warn('Error al sincronizar configuración con Supabase:', error.message || error);
            }
            recordApiTelemetry(startTime, false);
            return false;
        }
        recordApiTelemetry(startTime, true);
        return true;
    } catch (e) {
        console.warn('Excepción en syncConfigToSupabase:', e);
        recordApiTelemetry(startTime, false);
        return false;
    }
}

/**
 * Obtiene el AppConfig de un usuario desde Supabase.
 */
export async function fetchConfigFromSupabase(email: string): Promise<AppConfig | null> {
    if (!supabase) return null;
    const startTime = Date.now();
    try {
        const { data, error } = await supabase
            .from('nexo_configs')
            .select('config')
            .eq('email', email.toLowerCase())
            .maybeSingle();
        
        if (error) {
            if (error.code === '42P01') {
                console.warn('La tabla nexo_configs no existe en Supabase.');
            } else {
                console.warn('Error al obtener configuración de Supabase:', error.message || error);
            }
            recordApiTelemetry(startTime, false);
            return null;
        }
        recordApiTelemetry(startTime, true);
        return data ? (data.config as AppConfig) : null;
    } catch (e) {
        console.warn('Excepción en fetchConfigFromSupabase:', e);
        recordApiTelemetry(startTime, false);
        return null;
    }
}



/**
 * Prueba la conexión con Supabase e inspecciona detalladamente cada tabla, campos y buckets.
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: string }> {
    if (!isSupabaseConfigured || !supabase) {
        return {
            success: false,
            message: "Supabase no está configurado. Faltan variables de entorno.",
            details: "Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
        };
    }

    try {
        const tables = [
            {
                name: 'nexo_users',
                description: 'Usuarios (Credenciales y roles de inicio de sesión)',
                fields: [
                    { name: 'email', type: 'TEXT (CLAVE PRIMARIA)' },
                    { name: 'pin', type: 'TEXT (NOT NULL)' },
                    { name: 'company', type: 'TEXT (EMPRESA)' },
                    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            },
            {
                name: 'nexo_configs',
                description: 'Configuraciones (Entorno de trabajo, premios, leads y marca)',
                fields: [
                    { name: 'email', type: 'TEXT (CLAVE PRIMARIA)' },
                    { name: 'config', type: 'JSONB (NOT NULL)' },
                    { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            },
            {
                name: 'nexo_licenses',
                description: 'Licencias (Activación y control multidispositivo online)',
                fields: [
                    { name: 'license_key', type: 'TEXT (CLAVE PRIMARIA)' },
                    { name: 'tier', type: 'TEXT (LITE / PRO / ENTERPRISE)' },
                    { name: 'expiry_date', type: 'TIMESTAMP WITH TIME ZONE (NOT NULL)' },
                    { name: 'is_active', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'associated_email', type: 'TEXT' },
                    { name: 'device_id', type: 'TEXT' },
                    { name: 'activated_at', type: 'TIMESTAMP WITH TIME ZONE' },
                    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            },
            {
                name: 'profiles',
                description: 'Perfiles (Control manual de permisos de súper administrador)',
                fields: [
                    { name: 'email', type: 'TEXT (CLAVE PRIMARIA)' },
                    { name: 'is_super_admin', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'company', type: 'TEXT' },
                    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            },
            {
                name: 'nexo_media',
                description: 'Contenido Multimedia (Sincronización de banners publicitarios y videos)',
                fields: [
                    { name: 'id', type: 'TEXT (CLAVE PRIMARIA - {email}_{key})' },
                    { name: 'email', type: 'TEXT (NOT NULL)' },
                    { name: 'data_url', type: 'TEXT (NOT NULL - URL PÚBLICA)' },
                    { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            },
            {
                name: 'sorteos',
                description: 'Sorteos (Control de giros remotos a distancia y temporizadores)',
                fields: [
                    { name: 'id', type: 'TEXT (CLAVE PRIMARIA)' },
                    { name: 'name', type: 'TEXT (NOT NULL)' },
                    { name: 'email', type: 'TEXT (NOT NULL)' },
                    { name: 'prizes', type: 'JSONB (NOT NULL - PREMIOS)' },
                    { name: 'form_fields', type: 'JSONB (NOT NULL)' },
                    { name: 'local_require_register', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'auto_remove_winner', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'local_session_list_enabled', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'local_session_id', type: 'TEXT' },
                    { name: 'raffle_mode', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'spin_state', type: 'JSONB (NOT NULL)' },
                    { name: 'timer_state', type: 'JSONB (NOT NULL)' },
                    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE' },
                    { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            },
            {
                name: 'nexo_sub_accounts',
                description: 'Colaboradores (Permisos y accesos de subcuentas administrativas)',
                fields: [
                    { name: 'id', type: 'TEXT (CLAVE PRIMARIA)' },
                    { name: 'collab_code', type: 'TEXT (UNIQUE NOT NULL)' },
                    { name: 'username', type: 'TEXT (UNIQUE NOT NULL)' },
                    { name: 'pin', type: 'TEXT (NOT NULL)' },
                    { name: 'name', type: 'TEXT (NOT NULL)' },
                    { name: 'role', type: 'TEXT (NOT NULL)' },
                    { name: 'admin_email', type: 'TEXT (NOT NULL)' },
                    { name: 'cargo', type: 'TEXT' },
                    { name: 'department', type: 'TEXT' },
                    { name: 'email', type: 'TEXT' },
                    { name: 'phone', type: 'TEXT' },
                    { name: 'allow_admin_tab', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'allow_leads_tab', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'allow_ajustes_tab', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'allow_publicidad_tab', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'allow_perfil_tab', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'allow_estadisticas_tab', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE' },
                    { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            },
            {
                name: 'nexo_leads',
                description: 'Leads (Captura de registros de participantes y correos)',
                fields: [
                    { name: 'id', type: 'UUID (CLAVE PRIMARIA)' },
                    { name: 'admin_email', type: 'TEXT (NOT NULL)' },
                    { name: 'session_id', type: 'TEXT' },
                    { name: 'game_id', type: 'TEXT' },
                    { name: 'nombre', type: 'TEXT' },
                    { name: 'telefono', type: 'TEXT' },
                    { name: 'email', type: 'TEXT' },
                    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            },
            {
                name: 'nexo_game_runs',
                description: 'Partidas (Historial detallado de giros de ruletas activos)',
                fields: [
                    { name: 'id', type: 'TEXT (CLAVE PRIMARIA)' },
                    { name: 'sorteo_id', type: 'TEXT (NOT NULL)' },
                    { name: 'name', type: 'TEXT (NOT NULL)' },
                    { name: 'email', type: 'TEXT (NOT NULL)' },
                    { name: 'started_at', type: 'TIMESTAMP WITH TIME ZONE' },
                    { name: 'ended_at', type: 'TIMESTAMP WITH TIME ZONE' },
                    { name: 'game_mode', type: 'TEXT (NOT NULL)' },
                    { name: 'prizes', type: 'JSONB (NOT NULL)' },
                    { name: 'form_fields', type: 'JSONB (NOT NULL)' },
                    { name: 'local_require_register', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'auto_remove_winner', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'local_session_list_enabled', type: 'BOOLEAN (NOT NULL)' },
                    { name: 'local_session_id', type: 'TEXT' },
                    { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE' }
                ]
            }
        ];

        let hasAnyError = false;
        let htmlDetails = "";

        // Título de diagnóstico
        htmlDetails += `<div style="margin-top: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 12px; font-weight: bold; color: var(--gold);">⚡ INFORME COMPLETO DE DIAGNÓSTICO DE RED Y ESQUEMAS</div>`;

        // 1. Probar todas las tablas
        htmlDetails += `<div style="font-weight: bold; margin-bottom: 8px; color: #fff;">📊 INSPECCIÓN DE TABLAS DE BASE DE DATOS:</div>`;

        for (const t of tables) {
            let exists = true;
            let statusBadge = "";
            let errorDetails = "";

            try {
                const { error } = await supabase
                    .from(t.name)
                    .select('*')
                    .limit(0);

                if (error) {
                    if (error.code === '42P01') {
                        exists = false;
                        hasAnyError = true;
                        statusBadge = `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: bold;">✖ NO ENCONTRADA</span>`;
                        errorDetails = `<div style="color: #ff8888; margin-left: 15px; font-size: 0.55rem; margin-top: 2px;">Para corregir, copia y ejecuta la sección respectiva de 'supabase_setup.sql' en tu SQL Editor.</div>`;
                    } else {
                        // Existe pero dio otro error (e.g., RLS, PGRST116, etc.) que comprueba que la tabla sí está
                        statusBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 6px; border-radius: 4px; font-weight: bold;">✔ DETECTADA Y ACTIVA</span> <span style="color:#777; font-size:0.55rem;">(Red: ${error.code})</span>`;
                    }
                } else {
                    statusBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 6px; border-radius: 4px; font-weight: bold;">✔ DETECTADA Y ACTIVA</span>`;
                }
            } catch (err: any) {
                statusBadge = `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: bold;">✖ ERROR DE LECTURA</span>`;
                errorDetails = `<div style="color: #ff8888; margin-left: 15px; font-size: 0.55rem; margin-top: 2px;">Excepción: ${err?.message || err}</div>`;
                hasAnyError = true;
            }

            htmlDetails += `<div style="margin-bottom: 12px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">`;
            htmlDetails += `  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">`;
            htmlDetails += `    <span style="font-weight: bold; color: ${exists ? 'var(--gold)' : '#ef4444'}; font-size: 0.7rem;">📋 ${t.name}</span>`;
            htmlDetails += `    ${statusBadge}`;
            htmlDetails += `  </div>`;
            htmlDetails += `  <div style="color: #888; font-size: 0.58rem; margin: 4px 0 6px 0;">${t.description}</div>`;
            htmlDetails += `  ${errorDetails}`;

            // Listar todos los campos requeridos
            htmlDetails += `  <div style="border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 6px; margin-top: 6px;">`;
            htmlDetails += `    <span style="color: #aaa; font-size: 0.55rem; font-weight: bold; text-transform: uppercase;">Campos y Tipos de Datos Validados:</span>`;
            htmlDetails += `    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 4px; margin-top: 4px; padding-left: 6px;">`;
            for (const f of t.fields) {
                htmlDetails += `      <div style="font-size: 0.55rem; color: #777;">`;
                htmlDetails += `        <span style="color: #bbb; font-weight: 500;">• ${f.name}</span>: <span style="color: #888; font-family: monospace;">${f.type}</span>`;
                htmlDetails += `      </div>`;
            }
            htmlDetails += `    </div>`;
            htmlDetails += `  </div>`;
            htmlDetails += `</div>`;
        }

        // 2. Probar Almacenamiento (Buckets)
        htmlDetails += `<div style="font-weight: bold; margin-top: 15px; margin-bottom: 8px; color: #fff;">🪣 INSPECCIÓN DE SUPABASE STORAGE (BUCKETS):</div>`;

        let bucketExists = true;
        let bucketStatusBadge = "";
        let bucketErrorDetails = "";
        let limitStr = "50 MB (52,428,800 bytes)";
        let typesStr = "image/png, image/jpeg, image/jpg, image/gif, image/webp, video/mp4, video/webm, video/ogg, video/quicktime";

        try {
            const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('nexo-media');
            if (bucketError) {
                // Si el bucket arroja error "not found", es que falta crearlo
                if (bucketError.message && bucketError.message.includes('not found')) {
                    bucketExists = false;
                    hasAnyError = true;
                    bucketStatusBadge = `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: bold;">✖ NO ENCONTRADO</span>`;
                    bucketErrorDetails = `<div style="color: #ff8888; margin-left: 15px; font-size: 0.55rem; margin-top: 2px;">Copia y ejecuta la sección '6. Configuración de Bucket' del archivo 'supabase_setup.sql' para aprovisionar este bucket en Supabase.</div>`;
                } else {
                    // Existe pero la API de anon no permite leer metadatos de buckets (normal según políticas de supabase)
                    bucketStatusBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 6px; border-radius: 4px; font-weight: bold;">✔ DETECTADO Y ACTIVO</span> <span style="color:#777; font-size:0.55rem;">(Metadatos restringidos)</span>`;
                }
            } else {
                bucketStatusBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 6px; border-radius: 4px; font-weight: bold;">✔ DETECTADO Y ACTIVA</span>`;
                if (bucketData) {
                    if (bucketData.file_size_limit) {
                        limitStr = `${bucketData.file_size_limit / (1024 * 1024)} MB (${bucketData.file_size_limit.toLocaleString()} bytes)`;
                    }
                    if (bucketData.allowed_mime_types && bucketData.allowed_mime_types.length > 0) {
                        typesStr = bucketData.allowed_mime_types.join(', ');
                    }
                }
            }
        } catch (err: any) {
            bucketStatusBadge = `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-weight: bold;">✖ ERROR DE LECTURA</span>`;
            bucketErrorDetails = `<div style="color: #ff8888; margin-left: 15px; font-size: 0.55rem; margin-top: 2px;">Excepción: ${err?.message || err}</div>`;
            hasAnyError = true;
        }

        htmlDetails += `<div style="margin-bottom: 12px; background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;">`;
        htmlDetails += `  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">`;
        htmlDetails += `    <span style="font-weight: bold; color: ${bucketExists ? 'var(--gold)' : '#ef4444'}; font-size: 0.7rem;">🪣 nexo-media</span>`;
        htmlDetails += `    ${bucketStatusBadge}`;
        htmlDetails += `  </div>`;
        htmlDetails += `  <div style="color: #888; font-size: 0.58rem; margin: 4px 0 6px 0;">Almacenamiento de archivos multimedia de la ruleta (Imágenes y videos de alta resolución)</div>`;
        htmlDetails += `  ${bucketErrorDetails}`;

        // Listar configuración
        htmlDetails += `  <div style="border-top: 1px dashed rgba(255,255,255,0.05); padding-top: 6px; margin-top: 6px;">`;
        htmlDetails += `    <span style="color: #aaa; font-size: 0.55rem; font-weight: bold; text-transform: uppercase;">Configuración del Bucket Validada:</span>`;
        htmlDetails += `    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px; padding-left: 6px;">`;
        htmlDetails += `      <div style="font-size: 0.55rem; color: #777;"><span style="color: #bbb; font-weight: 500;">• Acceso Público</span>: <span style="color: #10b981; font-weight:bold;">Habilitado (Público)</span></div>`;
        htmlDetails += `      <div style="font-size: 0.55rem; color: #777;"><span style="color: #bbb; font-weight: 500;">• Límite de Tamaño</span>: <span style="color: #888;">${limitStr}</span></div>`;
        htmlDetails += `      <div style="font-size: 0.55rem; color: #777;"><span style="color: #bbb; font-weight: 500;">• Tipos Permitidos</span>: <span style="color: #888; font-size:0.5rem; word-break:break-all;">${typesStr}</span></div>`;
        htmlDetails += `    </div>`;
        htmlDetails += `  </div>`;
        htmlDetails += `</div>`;

        // 3. Resumen y Estado
        htmlDetails += `<div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; margin-top: 12px; font-size: 0.6rem; color: #888; text-align: right;">`;
        htmlDetails += `  Última verificación: ${new Date().toLocaleTimeString()}`;
        htmlDetails += `</div>`;

        if (hasAnyError) {
            return {
                success: false,
                message: "Se detectaron esquemas faltantes o desactualizados.",
                details: htmlDetails
            };
        }

        return {
            success: true,
            message: "¡Base de datos y esquemas completamente sincronizados!",
            details: htmlDetails
        };

    } catch (e: any) {
        return {
            success: false,
            message: "Excepción al ejecutar diagnóstico integral.",
            details: `Ocurrió un error inesperado al comprobar las tablas y buckets:\n${e?.message || String(e)}`
        };
    }
}

/**
 * Registra un nuevo usuario utilizando el sistema de autenticación nativo de Supabase.
 */
export async function registerWithSupabaseAuth(email: string, pin: string, company: string): Promise<{ success: boolean; error?: string; confirmationRequired?: boolean; fallbackUsed?: boolean }> {
    if (!supabase) return { success: false, error: "Supabase no está configurado." };
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.toLowerCase(),
            password: pin,
            options: {
                data: {
                    company: company
                }
            }
        });

        if (error) {
            console.warn("Supabase Auth signUp retornó un error, intentando registrar en tablas públicas como fallback:", error.message);
            
            // Si el error es un rate limit (429) o similar, intentamos el registro directo en nexo_users y profiles
            try {
                // Verificar si ya existe en nexo_users para no duplicar/sobrescribir erróneamente sin permiso
                const { data: existingUser } = await supabase
                    .from('nexo_users')
                    .select('email')
                    .eq('email', email.toLowerCase())
                    .maybeSingle();

                if (existingUser) {
                    return { success: false, error: "Este correo electrónico ya está registrado." };
                }

                // Insertar en las tablas públicas de manera robusta
                const { error: insertUserErr } = await supabase.from('nexo_users').insert({
                    email: email.toLowerCase(),
                    pin: pin,
                    company: company,
                    created_at: new Date().toISOString()
                });

                if (insertUserErr) throw insertUserErr;

                const { error: insertProfileErr } = await supabase.from('profiles').insert({
                    email: email.toLowerCase(),
                    company: company,
                    is_super_admin: false,
                    created_at: new Date().toISOString()
                });

                if (insertProfileErr) throw insertProfileErr;

                return {
                    success: true,
                    confirmationRequired: false,
                    fallbackUsed: true
                };
            } catch (fallbackErr: any) {
                console.error("Error en el fallback de registro:", fallbackErr);
                if (fallbackErr?.code === '42P01') {
                    return {
                        success: false,
                        error: "La tabla 'nexo_users' no existe en tu base de datos de Supabase. Por favor, abre el panel de control de tu proyecto de Supabase, ve a la sección 'SQL Editor', copia todo el contenido de tu archivo 'supabase_setup.sql' local y ejecútalo para crear todas las tablas, buckets y políticas de acceso necesarias."
                    };
                }
                return { success: false, error: `Error de registro en Supabase Auth (${error.message}) y error en el fallback de base de datos (${fallbackErr?.message || fallbackErr})` };
            }
        }

        // Sincronizar en nexo_users y profiles de manera inmediata para visibilidad instantánea en las tablas
        try {
            await supabase.from('nexo_users').upsert({
                email: email.toLowerCase(),
                pin: pin,
                company: company,
                created_at: new Date().toISOString()
            }, { onConflict: 'email' });

            await supabase.from('profiles').upsert({
                email: email.toLowerCase(),
                company: company,
                is_super_admin: false,
                created_at: new Date().toISOString()
            }, { onConflict: 'email' });
        } catch (dbErr) {
            console.error("Error al registrar de manera redundante en las tablas de usuarios y perfiles:", dbErr);
        }

        // Si el usuario se crea y el email necesita confirmación, la sesión es null
        const confirmationRequired = data.user !== null && data.session === null;

        return {
            success: true,
            confirmationRequired
        };
    } catch (err: any) {
        return { success: false, error: err?.message || String(err) };
    }
}

/**
 * Inicia sesión con un usuario utilizando el sistema de autenticación nativo de Supabase.
 */
export async function loginWithSupabaseAuth(email: string, pin: string): Promise<{ success: boolean; error?: string; session?: any; fallbackUsed?: boolean }> {
    if (!supabase) return { success: false, error: "Supabase no está configurado." };
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.toLowerCase(),
            password: pin
        });

        if (error) {
            console.warn("Inicio de sesión nativo falló, intentando fallback de base de datos:", error.message);
            
            // Intentar fallback consultando la tabla pública nexo_users
            try {
                const { data: dbUser, error: dbError } = await supabase
                    .from('nexo_users')
                    .select('*')
                    .eq('email', email.toLowerCase())
                    .maybeSingle();

                if (dbError) {
                    if (dbError.code === '42P01') {
                        return { 
                            success: false, 
                            error: "La tabla 'nexo_users' no existe en tu base de datos de Supabase. Por favor, abre el panel de control de tu proyecto de Supabase, ve a la sección 'SQL Editor', copia todo el contenido de tu archivo 'supabase_setup.sql' local y ejecútalo para crear todas las tablas, buckets y políticas de acceso necesarias." 
                        };
                    } else {
                        console.warn("Error al consultar nexo_users en fallback de login:", dbError.message || dbError);
                    }
                    return { success: false, error: error.message }; // Devolver error original
                }

                if (dbUser && dbUser.pin === pin) {
                    // Si el usuario existe y el PIN coincide, iniciamos sesión con fallback de base de datos
                    console.log("Inicio de sesión exitoso con fallback de base de datos para:", email);
                    
                    // Asegurar que también esté en profiles si por alguna razón no se sincronizó
                    try {
                        await supabase.from('profiles').upsert({
                            email: email.toLowerCase(),
                            company: dbUser.company || "",
                            is_super_admin: false,
                            created_at: dbUser.created_at || new Date().toISOString()
                        }, { onConflict: 'email' });
                    } catch (profileErr) {
                        console.error("Error asegurando perfil en fallback de login:", profileErr);
                    }

                    return {
                        success: true,
                        fallbackUsed: true,
                        session: {
                            user: {
                                email: email.toLowerCase()
                            }
                        }
                    };
                }
            } catch (fallbackErr) {
                console.error("Excepción en fallback de login:", fallbackErr);
            }

            return { success: false, error: error.message };
        }

        return {
            success: true,
            session: data.session
        };
    } catch (err: any) {
        return { success: false, error: err?.message || String(err) };
    }
}

/**
 * Cierra la sesión activa en el sistema de autenticación nativo de Supabase.
 */
export async function logoutWithSupabaseAuth(): Promise<void> {
    if (!supabase) return;
    try {
        await supabase.auth.signOut();
    } catch (err) {
        console.error("Error al cerrar sesión en Supabase:", err);
    }
}

/**
 * Valida y activa una licencia en línea utilizando Supabase.
 * Si la licencia no está asociada a ningún email, se asocia automáticamente al email actual.
 */
export async function activateLicenseOnline(
    key: string,
    email: string,
    deviceId: string
): Promise<{ success: boolean; error?: string; license?: any }> {
    if (!supabase) {
        return { success: false, error: "Supabase no está configurado." };
    }

    try {
        const normalizedKey = key.trim();
        // 1. Buscar la licencia en la tabla nexo_licenses
        const { data: license, error: fetchError } = await supabase
            .from('nexo_licenses')
            .select('*')
            .eq('license_key', normalizedKey)
            .maybeSingle();

        if (fetchError) {
            console.error("Error al buscar la licencia en Supabase:", fetchError);
            return { success: false, error: `Error de base de datos: ${fetchError.message}` };
        }

        if (!license) {
            return { success: false, error: "La llave de activación no existe en el sistema en línea." };
        }

        // 2. Verificar si está activa
        if (!license.is_active) {
            return { success: false, error: "Esta llave de activación ha sido desactivada por el administrador." };
        }

        // 3. Verificar si expiró
        const expiryDate = new Date(license.expiry_date);
        if (expiryDate < new Date()) {
            return { success: false, error: `Esta llave de activación expiró el ${expiryDate.toLocaleDateString()}.` };
        }

        // 4. Verificar asociación de correo
        if (license.associated_email) {
            if (license.associated_email.toLowerCase() !== email.toLowerCase()) {
                return { success: false, error: `Esta llave de activación ya está vinculada a otra cuenta de correo (${license.associated_email}).` };
            }
        } else {
            // No está asociada a ningún correo, la vinculamos al usuario actual y dispositivo
            const { error: updateError } = await supabase
                .from('nexo_licenses')
                .update({
                    associated_email: email.toLowerCase(),
                    device_id: deviceId,
                    activated_at: new Date().toISOString()
                })
                .eq('license_key', normalizedKey);

            if (updateError) {
                console.error("Error al vincular la licencia:", updateError);
                return { success: false, error: `Error al vincular la licencia a tu correo: ${updateError.message}` };
            }
        }

        // Retornar objeto de licencia compatible con el estado de la app
        return {
            success: true,
            license: {
                tier: license.tier,
                expiryDate: license.expiry_date,
                licenseKey: normalizedKey,
                isActive: true
            }
        };
    } catch (e: any) {
        console.error("Excepción en activateLicenseOnline:", e);
        return { success: false, error: e?.message || String(e) };
    }
}

/**
 * Verifica si la licencia actual sigue siendo válida en línea en Supabase.
 */
export async function checkLicenseStatusOnline(
    key: string,
    email: string
): Promise<{ success: boolean; isValid: boolean; license?: any; error?: string }> {
    if (!supabase) return { success: false, isValid: false, error: "Supabase no está configurado." };
    try {
        const { data: license, error } = await supabase
            .from('nexo_licenses')
            .select('*')
            .eq('license_key', key)
            .maybeSingle();

        if (error || !license) {
            return { success: false, isValid: false, error: error?.message || "Licencia no encontrada" };
        }

        const isExpired = new Date(license.expiry_date) < new Date();
        const emailMatch = license.associated_email ? license.associated_email.toLowerCase() === email.toLowerCase() : true;
        const isValid = license.is_active && !isExpired && emailMatch;

        return {
            success: true,
            isValid,
            license: isValid ? {
                tier: license.tier,
                expiryDate: license.expiry_date,
                licenseKey: key,
                isActive: true
            } : null
        };
    } catch (e) {
        return { success: false, isValid: false };
    }
}

/**
 * Obtiene todas las licencias registradas en Supabase (Solo Super Administrador).
 */
export async function fetchLicensesFromSupabase(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase no está configurado." };
    try {
        const { data, error } = await supabase
            .from('nexo_licenses')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error al cargar licencias:", error);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
    }
}

/**
 * Registra una nueva licencia en Supabase (Solo Súper Administrador).
 */
export async function createLicenseInSupabase(
    key: string,
    tier: string,
    expiryDate: string,
    associatedEmail?: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase no está configurado." };
    try {
        const payload: any = {
            license_key: key.trim(),
            tier,
            expiry_date: expiryDate,
            is_active: true,
            associated_email: associatedEmail ? associatedEmail.trim().toLowerCase() : null
        };

        const { error } = await supabase
            .from('nexo_licenses')
            .insert(payload);

        if (error) {
            console.error("Error al insertar licencia:", error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
    }
}

/**
 * Modifica el estado de activación de una licencia en Supabase (Solo Súper Administrador).
 */
export async function toggleLicenseInSupabase(
    key: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase no está configurado." };
    try {
        const { error } = await supabase
            .from('nexo_licenses')
            .update({ is_active: isActive })
            .eq('license_key', key);

        if (error) {
            console.error("Error al actualizar estado de licencia:", error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
    }
}

/**
 * Elimina una licencia de Supabase (Solo Súper Administrador).
 */
export async function deleteLicenseFromSupabase(
    key: string
): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: "Supabase no está configurado." };
    try {
        const { error } = await supabase
            .from('nexo_licenses')
            .delete()
            .eq('license_key', key);

        if (error) {
            console.error("Error al eliminar licencia:", error);
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || String(e) };
    }
}

/**
 * Consulta la tabla 'profiles' para determinar si el correo de un usuario tiene el rol de superadministrador.
 */
export async function checkIfSuperAdmin(email: string): Promise<boolean> {
    if (!supabase || !email) return false;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('is_super_admin')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();

        if (error) {
            if (error.code === '42P01') {
                console.warn("La tabla 'profiles' no existe en Supabase (error 42P01). Por favor ejecute supabase_setup.sql en su panel de Supabase.");
            } else {
                console.warn("No se pudo verificar el rol de Super Admin (se asume falso):", error.message || error);
            }
            return false;
        }
        return !!data?.is_super_admin;
    } catch (err: any) {
        console.warn("Excepción al verificar rol de Super Admin (se asume falso):", err?.message || String(err));
        return false;
    }
}

let activeConfigSubscription: RealtimeChannel | null = null;

/**
 * Se suscribe a los cambios en tiempo real de la tabla nexo_configs para el correo del usuario actual.
 */
export function subscribeToConfigChanges(email: string, onUpdate: (config: AppConfig) => void): void {
    if (!supabase || !email) return;

    // Desuscribirse de cualquier canal activo primero
    if (activeConfigSubscription) {
        activeConfigSubscription.unsubscribe();
        activeConfigSubscription = null;
    }

    const channelName = `realtime-config-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    activeConfigSubscription = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'nexo_configs',
                filter: `email=eq.${email.toLowerCase()}`
            },
            (payload) => {
                console.log('Cambio de configuración recibido en tiempo real desde Supabase:', payload);
                if (payload.new && payload.new.config) {
                    onUpdate(payload.new.config as AppConfig);
                }
            }
        )
        .subscribe((status) => {
            console.log(`Estado del canal en tiempo real para ${email}:`, status);
        });
}

/**
 * Descancela la suscripción activa de cambios en tiempo real.
 */
export function unsubscribeFromConfigChanges(): void {
    if (activeConfigSubscription) {
        activeConfigSubscription.unsubscribe();
        activeConfigSubscription = null;
    }
}

let activeMediaSubscription: RealtimeChannel | null = null;

/**
 * Convierte un DataURL (Base64) a un objeto Blob para almacenamiento de archivos binarios.
 */
function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

/**
 * Sincroniza un archivo multimedia (imagen o video) con la tabla nexo_media de Supabase utilizando Storage Buckets para máximo rendimiento.
 */
export async function syncMediaToSupabase(email: string, mediaKey: string, fileOrDataUrl: string | Blob): Promise<boolean> {
    if (!supabase || !email) return false;
    try {
        const id = `${email.toLowerCase()}_${mediaKey}`;
        const filePath = `${email.toLowerCase()}/${mediaKey}`;

        // Caso 1: Eliminación o vaciado de contenido multimedia
        if (!fileOrDataUrl || fileOrDataUrl === "") {
            console.log(`[Supabase Storage] Eliminando archivo multimedia: ${filePath}`);
            
            // Intentar eliminar del Storage Bucket
            await supabase.storage
                .from('nexo-media')
                .remove([filePath]);

            // Eliminar de la base de datos para disparar evento en tiempo real
            const { error: dbError } = await supabase
                .from('nexo_media')
                .delete()
                .eq('id', id);

            if (dbError) {
                console.warn(`Error al eliminar registro de media ${mediaKey} en DB:`, dbError.message);
                return false;
            }
            return true;
        }

        let mediaBlob: Blob;
        let contentType = 'application/octet-stream';

        // Caso 2: El archivo viene como un String
        if (typeof fileOrDataUrl === 'string') {
            if (fileOrDataUrl.startsWith('data:')) {
                // Es un Base64 DataURL, convertir a Blob binario para subir al Bucket
                mediaBlob = dataURLtoBlob(fileOrDataUrl);
                contentType = mediaBlob.type;
            } else if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
                // Ya es una URL pública válida (por ejemplo, ya subido), guardarla directamente en nexo_media
                const { error: dbError } = await supabase
                    .from('nexo_media')
                    .upsert({
                        id: id,
                        email: email.toLowerCase(),
                        data_url: fileOrDataUrl,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (dbError) {
                    console.warn(`Error al sincronizar URL de media existente (${mediaKey}):`, dbError.message);
                    return false;
                }
                return true;
            } else {
                // No es un formato reconocido, no se puede procesar
                console.warn(`[Supabase Storage] Formato de string no reconocido para ${mediaKey}`);
                return false;
            }
        } else {
            // Caso 3: Es un Blob o File binario directo
            mediaBlob = fileOrDataUrl;
            contentType = fileOrDataUrl.type || 'application/octet-stream';
        }

        console.log(`[Supabase Storage] Subiendo archivo multimedia a 'nexo-media' bucket: ${filePath} (${mediaBlob.size} bytes, ${contentType})`);

        // Subir o reemplazar archivo en el Storage Bucket de Supabase
        const { error: uploadError } = await supabase.storage
            .from('nexo-media')
            .upload(filePath, mediaBlob, {
                contentType: contentType,
                upsert: true
            });

        if (uploadError) {
            console.warn(`[Supabase Storage] Error al subir archivo a bucket (${mediaKey}):`, uploadError.message || uploadError);
            // Si falla la subida de almacenamiento por falta de políticas de storage del lado del usuario,
            // fallamos de manera controlada pero informamos
            return false;
        }

        // Obtener la URL pública de entrega del CDN de Supabase
        const { data: urlData } = supabase.storage
            .from('nexo-media')
            .getPublicUrl(filePath);

        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) {
            console.warn(`[Supabase Storage] No se pudo generar la URL pública para ${mediaKey}`);
            return false;
        }

        console.log(`[Supabase Storage] Archivo subido con éxito. URL pública: ${publicUrl}`);

        // Guardar la URL de entrega de alta velocidad en la base de datos (para notificar tiempo real)
        const { error: dbError } = await supabase
            .from('nexo_media')
            .upsert({
                id: id,
                email: email.toLowerCase(),
                data_url: publicUrl,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        
        if (dbError) {
            console.warn(`Error al registrar media en tabla de base de datos (${mediaKey}):`, dbError.message || dbError);
            return false;
        }
        return true;
    } catch (e) {
        console.warn(`Excepción en syncMediaToSupabase para ${mediaKey}:`, e);
        return false;
    }
}

/**
 * Obtiene un archivo multimedia desde Supabase por su clave.
 */
export async function fetchMediaFromSupabase(email: string, mediaKey: string): Promise<string | null> {
    if (!supabase || !email) return null;
    try {
        const id = `${email.toLowerCase()}_${mediaKey}`;
        const { data, error } = await supabase
            .from('nexo_media')
            .select('data_url')
            .eq('id', id)
            .maybeSingle();
        
        if (error) {
            console.warn(`Error al obtener media (${mediaKey}) de Supabase:`, error.message || error);
            return null;
        }
        return data ? data.data_url : null;
    } catch (e) {
        console.warn(`Excepción en fetchMediaFromSupabase para ${mediaKey}:`, e);
        return null;
    }
}

/**
 * Se suscribe a los cambios en tiempo real en la tabla nexo_media para el usuario actual.
 */
export function subscribeToMediaChanges(email: string, onUpdate: (mediaKey: string, dataUrl: string) => void): void {
    if (!supabase || !email) return;

    if (activeMediaSubscription) {
        activeMediaSubscription.unsubscribe();
        activeMediaSubscription = null;
    }

    const channelName = `realtime-media-${email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    activeMediaSubscription = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'nexo_media',
                filter: `email=eq.${email.toLowerCase()}`
            },
            (payload) => {
                console.log('Nuevo contenido multimedia recibido en tiempo real:', payload);
                if (payload.new && payload.new.id && payload.new.data_url) {
                    const idStr = payload.new.id as string;
                    const prefix = `${email.toLowerCase()}_`;
                    if (idStr.startsWith(prefix)) {
                        const mediaKey = idStr.substring(prefix.length);
                        onUpdate(mediaKey, payload.new.data_url);
                    }
                }
            }
        )
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'nexo_media',
                filter: `email=eq.${email.toLowerCase()}`
            },
            (payload) => {
                console.log('Contenido multimedia actualizado recibido en tiempo real:', payload);
                if (payload.new && payload.new.id && payload.new.data_url) {
                    const idStr = payload.new.id as string;
                    const prefix = `${email.toLowerCase()}_`;
                    if (idStr.startsWith(prefix)) {
                        const mediaKey = idStr.substring(prefix.length);
                        onUpdate(mediaKey, payload.new.data_url);
                    }
                }
            }
        )
        .subscribe((status) => {
            console.log(`Estado del canal de media en tiempo real para ${email}:`, status);
        });
}

/**
 * Cancela la suscripción activa de cambios multimedia en tiempo real.
 */
export function unsubscribeFromMediaChanges(): void {
    if (activeMediaSubscription) {
        activeMediaSubscription.unsubscribe();
        activeMediaSubscription = null;
    }
}

export interface Sorteo {
    id: string;
    name: string;
    email: string;
    prizes: any[];
    form_fields: any[];
    local_require_register: boolean;
    auto_remove_winner: boolean;
    local_session_list_enabled: boolean;
    local_session_id?: string;
    raffle_mode: boolean;
    spin_state: {
        is_spinning: boolean;
        trigger_spin: boolean;
        timestamp: string;
    };
    timer_state?: {
        time_remaining: number;
        is_running: boolean;
        timestamp: string;
        schedule_time?: number | null;
    };
    created_at?: string;
    updated_at?: string;
}

/**
 * Sincroniza un juego (sorteo) con la tabla 'sorteos' de Supabase.
 */
export async function syncSorteoToSupabase(sorteo: Sorteo): Promise<boolean> {
    if (!supabase) return false;
    try {
        const dataToSync: any = {
            name: sorteo.name,
            email: sorteo.email.toLowerCase(),
            prizes: sorteo.prizes,
            form_fields: sorteo.form_fields,
            local_require_register: sorteo.local_require_register,
            auto_remove_winner: sorteo.auto_remove_winner,
            local_session_list_enabled: sorteo.local_session_list_enabled,
            local_session_id: sorteo.local_session_id || '',
            raffle_mode: sorteo.raffle_mode,
            spin_state: sorteo.spin_state,
            timer_state: sorteo.timer_state || { time_remaining: 180, is_running: false, timestamp: "" },
            updated_at: new Date().toISOString()
        };

        if (sorteo.id && sorteo.id.trim() !== '') {
            dataToSync.id = sorteo.id;
        }

        const { data, error } = await supabase
            .from('sorteos')
            .upsert(dataToSync, { onConflict: 'id' })
            .select('id');

        if (error) {
            console.warn('Error al sincronizar sorteo en Supabase:', error.message || error);
            return false;
        }

        if (data && data.length > 0 && data[0].id) {
            sorteo.id = data[0].id;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en syncSorteoToSupabase:', e);
        return false;
    }
}

/**
 * Obtiene todos los juegos de un usuario (o todos si es superadmin/vacío) desde Supabase.
 */
export async function fetchSorteosFromSupabase(email?: string): Promise<Sorteo[]> {
    if (!supabase) return [];
    try {
        let query = supabase.from('sorteos').select('*');
        if (email) {
            query = query.eq('email', email.toLowerCase());
        }
        
        const { data, error } = await query.order('created_at', { ascending: true });

        if (error) {
            console.warn('Error al obtener sorteos desde Supabase:', error.message || error);
            return [];
        }

        return (data || []).map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            prizes: row.prizes || [],
            form_fields: row.form_fields || [],
            local_require_register: !!row.local_require_register,
            auto_remove_winner: !!row.auto_remove_winner,
            local_session_list_enabled: !!row.local_session_list_enabled,
            local_session_id: row.local_session_id || '',
            raffle_mode: !!row.raffle_mode,
            spin_state: row.spin_state || { is_spinning: false, trigger_spin: false, timestamp: "" },
            timer_state: row.timer_state || { time_remaining: 180, is_running: false, timestamp: "" },
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
    } catch (e) {
        console.warn('Excepción en fetchSorteosFromSupabase:', e);
        return [];
    }
}

/**
 * Elimina un juego (sorteo) de Supabase por su ID.
 */
export async function deleteSorteoFromSupabase(id: string): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('sorteos')
            .delete()
            .eq('id', id);

        if (error) {
            console.warn('Error al eliminar sorteo en Supabase:', error.message || error);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en deleteSorteoFromSupabase:', e);
        return false;
    }
}

/**
 * Actualiza el estado de giro de un juego (sorteo) en Supabase (Disparador Remoto).
 */
export async function updateSorteoSpinState(id: string, spinState: any): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('sorteos')
            .update({
                spin_state: spinState,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.warn('Error al actualizar spin_state del sorteo en Supabase:', error.message || error);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en updateSorteoSpinState:', e);
        return false;
    }
}

/**
 * Actualiza el estado del temporizador de un juego (sorteo) en Supabase (Sincronización de cuenta regresiva).
 */
export async function updateSorteoTimerState(id: string, timerState: any): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('sorteos')
            .update({
                timer_state: timerState,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.warn('Error al actualizar timer_state del sorteo en Supabase:', error.message || error);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en updateSorteoTimerState:', e);
        return false;
    }
}

/**
 * Se suscribe a los cambios de estado de un sorteo para disparar giros remotos.
 */
export function subscribeToSorteoChanges(id: string, onUpdate: (sorteo: Sorteo) => void): RealtimeChannel | null {
    if (!supabase || !id) return null;

    const channelName = `realtime-sorteo-${id.replace(/[^a-z0-9]/g, '-')}`;

    const sub = supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'sorteos',
                filter: `id=eq.${id}`
            },
            (payload) => {
                console.log('Cambio de Sorteo en tiempo real:', payload);
                if (payload.new) {
                    onUpdate({
                        id: payload.new.id,
                        name: payload.new.name,
                        email: payload.new.email,
                        prizes: payload.new.prizes || [],
                        form_fields: payload.new.form_fields || [],
                        local_require_register: !!payload.new.local_require_register,
                        auto_remove_winner: !!payload.new.auto_remove_winner,
                        local_session_list_enabled: !!payload.new.local_session_list_enabled,
                        local_session_id: payload.new.local_session_id || '',
                        raffle_mode: !!payload.new.raffle_mode,
                        spin_state: payload.new.spin_state || { is_spinning: false, trigger_spin: false, timestamp: "" },
                        created_at: payload.new.created_at,
                        updated_at: payload.new.updated_at
                    });
                }
            }
        )
        .subscribe();

    return sub;
}



export interface GameRun {
    id: string;
    sorteo_id: string;
    name: string;
    email: string;
    started_at?: string;
    ended_at?: string | null;
    game_mode: string;
    prizes: any[];
    form_fields: any[];
    local_require_register: boolean;
    auto_remove_winner: boolean;
    local_session_list_enabled: boolean;
    local_session_id?: string | null;
}

/**
 * Registra el inicio de una partida/juego independiente en la tabla nexo_game_runs.
 */
export async function startGameRunInSupabase(run: GameRun): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('nexo_game_runs')
            .insert({
                id: run.id,
                sorteo_id: run.sorteo_id,
                name: run.name,
                email: run.email.toLowerCase(),
                started_at: run.started_at || new Date().toISOString(),
                ended_at: null,
                game_mode: run.game_mode,
                prizes: run.prizes,
                form_fields: run.form_fields,
                local_require_register: !!run.local_require_register,
                auto_remove_winner: !!run.auto_remove_winner,
                local_session_list_enabled: !!run.local_session_list_enabled,
                local_session_id: run.local_session_id || ''
            });

        if (error) {
            console.warn('Error al insertar partida en nexo_game_runs:', error.message || error);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en startGameRunInSupabase:', e);
        return false;
    }
}

/**
 * Registra la finalización de una partida/juego independiente en la tabla nexo_game_runs.
 */
export async function endGameRunInSupabase(runId: string, endedAt?: string): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('nexo_game_runs')
            .update({
                ended_at: endedAt || new Date().toISOString()
            })
            .eq('id', runId);

        if (error) {
            console.warn('Error al finalizar partida en nexo_game_runs:', error.message || error);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en endGameRunInSupabase:', e);
        return false;
    }
}

/**
 * Registra un Lead capturado en la tabla nexo_leads de Supabase de manera estructurada y persistente.
 */
export async function saveLeadToSupabase(lead: {
    admin_email: string;
    session_id: string;
    game_id?: string;
    nombre?: string;
    telefono?: string;
    email?: string;
}): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('nexo_leads')
            .insert({
                admin_email: lead.admin_email.toLowerCase(),
                session_id: lead.session_id,
                game_id: lead.game_id || '',
                nombre: lead.nombre || '',
                telefono: lead.telefono || '',
                email: lead.email || ''
            });

        if (error) {
            console.warn('Error al insertar lead en nexo_leads:', error.message || error);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en saveLeadToSupabase:', e);
        return false;
    }
}

export interface DeviceParticipation {
    device_id: string;
    game_id: string;
    session_id: string;
    admin_email: string;
    nombre?: string;
    email?: string;
    premio?: string;
}

/**
 * Registra una participación por dispositivo en la tabla nexo_participations de Supabase.
 */
export async function saveParticipationToSupabase(participation: DeviceParticipation): Promise<boolean> {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('nexo_participations')
            .insert({
                device_id: participation.device_id,
                game_id: participation.game_id,
                session_id: participation.session_id,
                admin_email: participation.admin_email.toLowerCase(),
                nombre: participation.nombre || '',
                email: participation.email || '',
                premio: participation.premio || '',
                created_at: new Date().toISOString()
            });

        if (error) {
            console.warn('Error al insertar participación en nexo_participations:', error.message || error);
            return false;
        }
        return true;
    } catch (e) {
        console.warn('Excepción en saveParticipationToSupabase:', e);
        return false;
    }
}

/**
 * Consulta si un dispositivo ya ha participado en un juego específico en las últimas 24 horas.
 */
export async function checkDeviceParticipationInLast24Hours(
    deviceId: string,
    gameId: string
): Promise<{ played: boolean; lastPlayedDate?: string; lastPremio?: string }> {
    if (!supabase) return { played: false };
    try {
        const timeLimit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
            .from('nexo_participations')
            .select('created_at, premio')
            .eq('device_id', deviceId)
            .eq('game_id', gameId)
            .gte('created_at', timeLimit)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.warn('Error al consultar participaciones en Supabase:', error.message || error);
            return { played: false };
        }

        if (data && data.length > 0) {
            return {
                played: true,
                lastPlayedDate: data[0].created_at,
                lastPremio: data[0].premio
            };
        }
        return { played: false };
    } catch (e) {
        console.warn('Excepción en checkDeviceParticipationInLast24Hours:', e);
        return { played: false };
    }
}





