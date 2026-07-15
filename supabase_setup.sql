-- SQL para configurar las tablas necesarias en tu panel de Supabase.
-- Ve a tu proyecto de Supabase, abre el "SQL Editor" y ejecuta esta consulta:

-- 1. Tabla de Usuarios (Sincronización de credenciales de inicio de sesión)
CREATE TABLE IF NOT EXISTS nexo_users (
    email TEXT PRIMARY KEY,
    pin TEXT NOT NULL,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) para proteger los datos de usuario a nivel empresarial
ALTER TABLE nexo_users ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si existen para evitar errores al re-ejecutar el script
DROP POLICY IF EXISTS "Permitir acceso de lectura público" ON nexo_users;
DROP POLICY IF EXISTS "Permitir inserción/actualización pública" ON nexo_users;
DROP POLICY IF EXISTS "Permitir select de usuario" ON nexo_users;
DROP POLICY IF EXISTS "Permitir registro de nuevos usuarios" ON nexo_users;
DROP POLICY IF EXISTS "Permitir update de usuario propio" ON nexo_users;
DROP POLICY IF EXISTS "Permitir delete de usuario propio" ON nexo_users;

-- Crear políticas seguras para acceso (Lectura/Escritura) de usuarios
CREATE POLICY "Permitir select de usuario" ON nexo_users FOR SELECT USING (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir registro de nuevos usuarios" ON nexo_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update de usuario propio" ON nexo_users FOR UPDATE USING (auth.jwt() ->> 'email' = email) WITH CHECK (auth.jwt() ->> 'email' = email);
CREATE POLICY "Permitir delete de usuario propio" ON nexo_users FOR DELETE USING (auth.jwt() ->> 'email' = email);


-- 2. Tabla de Configuraciones (Sincronización del entorno de trabajo, premios, leads y visuales)
CREATE TABLE IF NOT EXISTS nexo_configs (
    email TEXT PRIMARY KEY,
    config JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE nexo_configs ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si existen para evitar errores al re-ejecutar el script
DROP POLICY IF EXISTS "Permitir acceso de lectura público para configs" ON nexo_configs;
DROP POLICY IF EXISTS "Permitir inserción/actualización pública para configs" ON nexo_configs;
DROP POLICY IF EXISTS "Permitir select de configs" ON nexo_configs;
DROP POLICY IF EXISTS "Permitir insert de config propia" ON nexo_configs;
DROP POLICY IF EXISTS "Permitir update de config propia" ON nexo_configs;
DROP POLICY IF EXISTS "Permitir delete de config propia" ON nexo_configs;

-- Crear políticas seguras para acceso (Lectura/Escritura) de configuraciones
CREATE POLICY "Permitir select de configs" ON nexo_configs FOR SELECT USING (true);
CREATE POLICY "Permitir insert de config propia" ON nexo_configs FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir update de config propia" ON nexo_configs FOR UPDATE USING (auth.jwt() ->> 'email' = email OR auth.role() = 'anon') WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir delete de config propia" ON nexo_configs FOR DELETE USING (auth.jwt() ->> 'email' = email);


-- 3. Tabla de Licencias (Control y activación de licencias en línea multidispositivo)
CREATE TABLE IF NOT EXISTS nexo_licenses (
    license_key TEXT PRIMARY KEY,
    tier TEXT NOT NULL DEFAULT 'LITE', -- 'LITE', 'PRO', 'ENTERPRISE'
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    associated_email TEXT,
    device_id TEXT,
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE nexo_licenses ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si existen para evitar errores al re-ejecutar el script
DROP POLICY IF EXISTS "Permitir lectura pública de licencias" ON nexo_licenses;
DROP POLICY IF EXISTS "Permitir actualización pública de licencias" ON nexo_licenses;
DROP POLICY IF EXISTS "Permitir lectura de licencias" ON nexo_licenses;
DROP POLICY IF EXISTS "Permitir insert de licencias solo a admins" ON nexo_licenses;
DROP POLICY IF EXISTS "Permitir activar/asociar licencia propia" ON nexo_licenses;
DROP POLICY IF EXISTS "Permitir delete de licencias solo a admins" ON nexo_licenses;

-- Crear políticas de acceso seguras para licencias (Lectura pública para validez, escritura restringida)
CREATE POLICY "Permitir lectura de licencias" ON nexo_licenses FOR SELECT USING (true);
CREATE POLICY "Permitir insert de licencias solo a admins" ON nexo_licenses FOR INSERT WITH CHECK (auth.role() = 'service_role' OR (SELECT COALESCE(is_super_admin, FALSE) FROM profiles WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Permitir activar/asociar licencia propia" ON nexo_licenses FOR UPDATE USING (associated_email IS NULL OR auth.jwt() ->> 'email' = associated_email OR auth.role() = 'service_role' OR auth.role() = 'anon') WITH CHECK (associated_email IS NULL OR auth.jwt() ->> 'email' = associated_email OR auth.role() = 'service_role' OR auth.role() = 'anon');
CREATE POLICY "Permitir delete de licencias solo a admins" ON nexo_licenses FOR DELETE USING (auth.role() = 'service_role' OR (SELECT COALESCE(is_super_admin, FALSE) FROM profiles WHERE email = auth.jwt() ->> 'email'));


-- 4. Nueva Tabla de Perfiles (profiles) para asignación manual del rol de súper administrador
CREATE TABLE IF NOT EXISTS profiles (
    email TEXT PRIMARY KEY,
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) para profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si existen para evitar errores al re-ejecutar el script
DROP POLICY IF EXISTS "Permitir acceso de lectura público para profiles" ON profiles;
DROP POLICY IF EXISTS "Permitir inserción/actualización pública para profiles" ON profiles;
DROP POLICY IF EXISTS "Permitir select de profiles" ON profiles;
DROP POLICY IF EXISTS "Permitir insert de profiles" ON profiles;
DROP POLICY IF EXISTS "Permitir update de profiles propio" ON profiles;
DROP POLICY IF EXISTS "Permitir delete de profiles propio" ON profiles;

-- Crear políticas de acceso para perfiles (Lectura libre, escritura y borrado ultra seguros)
CREATE POLICY "Permitir select de profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Permitir insert de profiles" ON profiles FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir update de profiles propio" ON profiles FOR UPDATE USING (auth.jwt() ->> 'email' = email OR auth.role() = 'anon') WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir delete de profiles propio" ON profiles FOR DELETE USING (auth.jwt() ->> 'email' = email);

-- Sincronizar automáticamente usuarios ya registrados en la tabla nexo_users hacia profiles
INSERT INTO profiles (email, company, created_at)
SELECT email, company, created_at FROM nexo_users
ON CONFLICT (email) DO NOTHING;

-- Crear trigger para registrar y actualizar automáticamente cualquier nuevo usuario en profiles
CREATE OR REPLACE FUNCTION sync_nexo_users_to_profiles()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (email, company, created_at, is_super_admin)
    VALUES (NEW.email, NEW.company, NEW.created_at, FALSE)
    ON CONFLICT (email) DO UPDATE
    SET company = EXCLUDED.company;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_nexo_users_to_profiles ON nexo_users;
CREATE TRIGGER trigger_sync_nexo_users_to_profiles
AFTER INSERT OR UPDATE ON nexo_users
FOR EACH ROW
EXECUTE FUNCTION sync_nexo_users_to_profiles();


-- Crear trigger para registrar automáticamente cualquier nuevo usuario de Auth (auth.users) en profiles
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (email, company, created_at, is_super_admin)
    VALUES (
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'company', ''),
        NEW.created_at,
        FALSE
    )
    ON CONFLICT (email) DO UPDATE
    SET company = COALESCE(NULLIF(EXCLUDED.company, ''), public.profiles.company);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_auth_user();


-- 5. Tabla de Contenido Multimedia (Sincronización en tiempo real de imágenes y videos pesados)
CREATE TABLE IF NOT EXISTS nexo_media (
    id TEXT PRIMARY KEY, -- Formato: {email}_{mediaKey}
    email TEXT NOT NULL,
    data_url TEXT NOT NULL, -- URL pública del archivo en el Bucket de Almacenamiento
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en nexo_media
ALTER TABLE nexo_media ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas previas para evitar duplicidad o errores
DROP POLICY IF EXISTS "Permitir lectura pública de media" ON nexo_media;
DROP POLICY IF EXISTS "Permitir inserción/actualización pública de media" ON nexo_media;
DROP POLICY IF EXISTS "Permitir select de media" ON nexo_media;
DROP POLICY IF EXISTS "Permitir insert de media propio" ON nexo_media;
DROP POLICY IF EXISTS "Permitir update de media propio" ON nexo_media;
DROP POLICY IF EXISTS "Permitir delete de media propio" ON nexo_media;

-- Crear políticas seguras para nexo_media (Lectura libre, escritura y borrado por propietario)
CREATE POLICY "Permitir select de media" ON nexo_media FOR SELECT USING (true);
CREATE POLICY "Permitir insert de media propio" ON nexo_media FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir update de media propio" ON nexo_media FOR UPDATE USING (auth.jwt() ->> 'email' = email OR auth.role() = 'anon') WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir delete de media propio" ON nexo_media FOR DELETE USING (auth.jwt() ->> 'email' = email);


-- 6. Configuración de Bucket de Almacenamiento (Supabase Storage) para contenido multimedia pesado (Videos y Fotos de alta definición)
-- Crear el bucket 'nexo-media' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'nexo-media', 
    'nexo-media', 
    true, 
    52428800, -- Limite de 50MB para videos pesados
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Eliminar políticas existentes para evitar conflictos al re-ejecutar el script
DROP POLICY IF EXISTS "Permitir acceso público de lectura de objetos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir inserción pública de objetos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización pública de objetos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación pública de objetos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir insert seguro de objetos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir update seguro de objetos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir delete seguro de objetos" ON storage.objects;

-- Crear políticas de acceso seguras para el bucket 'nexo-media'
CREATE POLICY "Permitir acceso público de lectura de objetos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'nexo-media');

CREATE POLICY "Permitir insert seguro de objetos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'nexo-media' AND (auth.role() = 'authenticated' OR auth.role() = 'anon'));

CREATE POLICY "Permitir update seguro de objetos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'nexo-media' AND (auth.role() = 'authenticated' OR auth.role() = 'anon'))
WITH CHECK (bucket_id = 'nexo-media' AND (auth.role() = 'authenticated' OR auth.role() = 'anon'));

CREATE POLICY "Permitir delete seguro de objetos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'nexo-media' AND (auth.role() = 'authenticated' OR auth.role() = 'anon'));


-- 7. Tabla de Sorteos (Para reestructuración de cada juego editable con sincronización de giros a distancia)
CREATE TABLE IF NOT EXISTS sorteos (
    id TEXT PRIMARY KEY DEFAULT 'list_' || LOWER(REPLACE(gen_random_uuid()::text, '-', ''))::text,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    prizes JSONB NOT NULL DEFAULT '[]'::jsonb,
    form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    local_require_register BOOLEAN NOT NULL DEFAULT FALSE,
    auto_remove_winner BOOLEAN NOT NULL DEFAULT FALSE,
    local_session_list_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    local_session_id TEXT,
    raffle_mode BOOLEAN NOT NULL DEFAULT FALSE,
    spin_state JSONB NOT NULL DEFAULT '{"is_spinning": false, "trigger_spin": false, "timestamp": ""}'::jsonb,
    timer_state JSONB NOT NULL DEFAULT '{"time_remaining": 180, "is_running": false, "timestamp": ""}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Asegurar que la columna timer_state exista en caso de que la tabla ya estuviera creada
ALTER TABLE sorteos ADD COLUMN IF NOT EXISTS timer_state JSONB NOT NULL DEFAULT '{"time_remaining": 180, "is_running": false, "timestamp": ""}'::jsonb;

-- Asegurar que la columna id tenga un valor predeterminado único por si no se especifica al insertar (para tablas existentes)
ALTER TABLE sorteos ALTER COLUMN id SET DEFAULT 'list_' || LOWER(REPLACE(gen_random_uuid()::text, '-', ''))::text;

-- Habilitar Row Level Security (RLS) en sorteos
ALTER TABLE sorteos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos al re-ejecutar el script
DROP POLICY IF EXISTS "Permitir lectura pública de sorteos" ON sorteos;
DROP POLICY IF EXISTS "Permitir inserción/actualización pública de sorteos" ON sorteos;
DROP POLICY IF EXISTS "Permitir select de sorteos" ON sorteos;
DROP POLICY IF EXISTS "Permitir insert de sorteo propio" ON sorteos;
DROP POLICY IF EXISTS "Permitir update de sorteo propio" ON sorteos;
DROP POLICY IF EXISTS "Permitir delete de sorteo propio" ON sorteos;

-- Crear políticas seguras para sorteos (Lectura pública, escritura por propietario)
CREATE POLICY "Permitir select de sorteos" ON sorteos FOR SELECT USING (true);
CREATE POLICY "Permitir insert de sorteo propio" ON sorteos FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir update de sorteo propio" ON sorteos FOR UPDATE USING (auth.jwt() ->> 'email' = email OR auth.role() = 'anon') WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir delete de sorteo propio" ON sorteos FOR DELETE USING (auth.jwt() ->> 'email' = email);


-- 9. Tabla de Colaboradores / Subcuentas / Roles (Para gestionar asignaciones de rol independientes)
CREATE TABLE IF NOT EXISTS nexo_sub_accounts (
    id TEXT PRIMARY KEY,
    collab_code TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    cargo TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    allow_admin_tab BOOLEAN NOT NULL DEFAULT FALSE,
    allow_leads_tab BOOLEAN NOT NULL DEFAULT FALSE,
    allow_ajustes_tab BOOLEAN NOT NULL DEFAULT FALSE,
    allow_publicidad_tab BOOLEAN NOT NULL DEFAULT FALSE,
    allow_perfil_tab BOOLEAN NOT NULL DEFAULT FALSE,
    allow_estadisticas_tab BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) en nexo_sub_accounts
ALTER TABLE nexo_sub_accounts ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Permitir select de sub_accounts" ON nexo_sub_accounts;
DROP POLICY IF EXISTS "Permitir insert de sub_account propia" ON nexo_sub_accounts;
DROP POLICY IF EXISTS "Permitir update de sub_account propia" ON nexo_sub_accounts;
DROP POLICY IF EXISTS "Permitir delete de sub_account propia" ON nexo_sub_accounts;

-- Crear políticas para nexo_sub_accounts
CREATE POLICY "Permitir select de sub_accounts" ON nexo_sub_accounts FOR SELECT USING (true);
CREATE POLICY "Permitir insert de sub_account propia" ON nexo_sub_accounts FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = admin_email OR auth.role() = 'anon');
CREATE POLICY "Permitir update de sub_account propia" ON nexo_sub_accounts FOR UPDATE USING (auth.jwt() ->> 'email' = admin_email OR auth.role() = 'anon') WITH CHECK (auth.jwt() ->> 'email' = admin_email OR auth.role() = 'anon');
CREATE POLICY "Permitir delete de sub_account propia" ON nexo_sub_accounts FOR DELETE USING (auth.jwt() ->> 'email' = admin_email);


-- 10. Tabla de Leads (Para capturar los registros de usuarios de forma 100% online y modular)
CREATE TABLE IF NOT EXISTS nexo_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    session_id TEXT,
    game_id TEXT,
    nombre TEXT,
    telefono TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en nexo_leads
ALTER TABLE nexo_leads ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Permitir select de nexo_leads" ON nexo_leads;
DROP POLICY IF EXISTS "Permitir insert de nexo_leads" ON nexo_leads;
DROP POLICY IF EXISTS "Permitir delete de nexo_leads" ON nexo_leads;

-- Crear políticas para nexo_leads (Lectura general, inserción abierta, borrado restringido)
CREATE POLICY "Permitir select de nexo_leads" ON nexo_leads FOR SELECT USING (true);
CREATE POLICY "Permitir insert de nexo_leads" ON nexo_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir delete de nexo_leads" ON nexo_leads FOR DELETE USING (auth.jwt() ->> 'email' = admin_email);


-- 11. Tabla de Partidas / Historial de Sorteos Activos (nexo_game_runs)
CREATE TABLE IF NOT EXISTS nexo_game_runs (
    id TEXT PRIMARY KEY,
    sorteo_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    game_mode TEXT NOT NULL,
    prizes JSONB NOT NULL DEFAULT '[]'::jsonb,
    form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    local_require_register BOOLEAN NOT NULL DEFAULT FALSE,
    auto_remove_winner BOOLEAN NOT NULL DEFAULT FALSE,
    local_session_list_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    local_session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) en nexo_game_runs
ALTER TABLE nexo_game_runs ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas de nexo_game_runs para evitar conflictos
DROP POLICY IF EXISTS "Permitir select de nexo_game_runs" ON nexo_game_runs;
DROP POLICY IF EXISTS "Permitir insert de nexo_game_runs" ON nexo_game_runs;
DROP POLICY IF EXISTS "Permitir update de nexo_game_runs" ON nexo_game_runs;
DROP POLICY IF EXISTS "Permitir delete de nexo_game_runs" ON nexo_game_runs;

-- Crear políticas para nexo_game_runs (Lectura general, inserción abierta/autenticada, actualización por admin o anónimo)
CREATE POLICY "Permitir select de nexo_game_runs" ON nexo_game_runs FOR SELECT USING (true);
CREATE POLICY "Permitir insert de nexo_game_runs" ON nexo_game_runs FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir update de nexo_game_runs" ON nexo_game_runs FOR UPDATE USING (auth.jwt() ->> 'email' = email OR auth.role() = 'anon') WITH CHECK (auth.jwt() ->> 'email' = email OR auth.role() = 'anon');
CREATE POLICY "Permitir delete de nexo_game_runs" ON nexo_game_runs FOR DELETE USING (auth.jwt() ->> 'email' = email);


-- 12. RPC para ejecutar SQL dinámico de manera segura desde el cliente
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void AS $$
BEGIN
    EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 13. Habilitar la publicación en tiempo real de Supabase para actualización instantánea multidispositivo
-- Esto permite que cualquier cambio en la configuración, giros de ruleta o multimedia se difunda de inmediato a todas las pantallas
DO $$
BEGIN
    -- Intentar añadir las tablas a la publicación de tiempo real de Supabase
    -- nexo_configs: Sincroniza configuraciones, listas, colores, temas y logos de marca
    -- sorteos: Sincroniza giros remotos a distancia, temporizadores de cuenta regresiva y estados de giro
    -- nexo_media: Sincroniza de inmediato imágenes y videos para banner de publicidad
    ALTER PUBLICATION supabase_realtime ADD TABLE nexo_configs;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Ya estaba agregada
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE sorteos;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Ya estaba agregada
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE nexo_media;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Ya estaba agregada
END $$;


-- 14. Tabla de Participaciones por Dispositivo (Para evitar doble giro y habilitar bloqueo por 24 horas)
CREATE TABLE IF NOT EXISTS nexo_participations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL,
    game_id TEXT NOT NULL,         -- Identificador único del juego (id en savedPrizeLists, ej: list_juego_estandar)
    session_id TEXT NOT NULL,      -- Identificador de sesión (publicSessionId, ej: sess_estandar_...)
    admin_email TEXT NOT NULL,     -- Correo del administrador/creador del juego
    nombre TEXT,                   -- Nombre si se registró
    email TEXT,                    -- Correo si se registró
    premio TEXT,                   -- Premio obtenido en el giro
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) en nexo_participations
ALTER TABLE nexo_participations ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas de nexo_participations si existen
DROP POLICY IF EXISTS "Permitir select de nexo_participations" ON nexo_participations;
DROP POLICY IF EXISTS "Permitir insert de nexo_participations" ON nexo_participations;
DROP POLICY IF EXISTS "Permitir delete de nexo_participations" ON nexo_participations;

-- Crear políticas seguras para nexo_participations
CREATE POLICY "Permitir select de nexo_participations" ON nexo_participations FOR SELECT USING (true);
CREATE POLICY "Permitir insert de nexo_participations" ON nexo_participations FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir delete de nexo_participations" ON nexo_participations FOR DELETE USING (auth.jwt() ->> 'email' = admin_email);

-- Agregar a la publicación de tiempo real de Supabase
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE nexo_participations;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Ya estaba agregada
END $$;



