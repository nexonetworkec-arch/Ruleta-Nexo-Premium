# Manual de Documentación Técnica & Certificación Enterprise
## Sistema Ruleta Nexo Premium - Enterprise Ready Edition

---

## 1. Arquitectura General del Sistema
El sistema **Ruleta Nexo Premium** está construido sobre una arquitectura **MVC (Modelo-Vista-Controlador)** híbrida, desacoplada y diseñada bajo los paradigmas **Offline-First** y **Reactividad de Nivel de Plataforma (Vanilla Custom Web Components)**.

```
       +-------------------------------------------------------------+
       |                         BROWSER CLIENT                      |
       |                                                             |
       |  +------------------------+      +-----------------------+  |
       |  |          VIEW          |      |      CONTROLLERS      |  |
       |  |  [index.html / CSS]    | ---> |  [authController.ts]  |  |
       |  |  [Custom Web Comp. UI] | <--- |  [guestController.ts] |  |
       |  +------------------------+      |  [qrController.ts]    |  |
       |                                  |  [rolesController]    |  |
       |                                  +-----------------------+  |
       |                                              |              |
       |  +------------------------+                  v              |
       |  |         MODEL          |      +-----------------------+  |
       |  |  [StateManager (Core)] | <--- |       SERVICES        |  |
       |  |  [Security (AES-GCM)]  |      |  [auditService.ts]    |  |
       |  +------------------------+      |  [licenseService.ts]  |  |
       |              ^                   |  [exportService.ts]   |  |
       |              |                   +-----------------------+  |
       +--------------|----------------------------------------------+
                      | Sync (HTTPS / WSS)
                      v
       +-------------------------------------------------------------+
       |                       CLOUD INTEGRATION                     |
       |                                                             |
       |               [Supabase BaaS / Postgres Database]           |
       +-------------------------------------------------------------+
```

### Componentes Clave:
1. **Modelo de Datos y Seguridad (Core):**
   - **`StateManager`:** Orquestador central de estado reactivo. Mantiene el estado en memoria (`AppConfig`) y administra de forma asíncrona (con debounce) la persistencia local y la sincronización con la nube.
   - **`Security`:** Motor criptográfico de nivel militar. Realiza encriptación y desencriptación asíncrona mediante **PBKDF2** para la derivación de llaves a partir del identificador de dispositivo y **AES-GCM de 256 bits** para blindar los datos locales guardados en `LocalStorage` contra inspección no autorizada.

2. **Controladores Modulares (Controllers):**
   - **`authController.ts`:** Mapea e intercepta llamadas de login, registro, sesiones de colaboradores y sincronización.
   - **`guestController.ts`:** Gobierna la participación remota de clientes (Sesiones Multi-dispositivo).
   - **`publicidadController.ts`:** Administra el motor dinámico de inserción de banners y clips publicitarios a pantalla completa por eventos de juego o inactividad.
   - **`qrController.ts`:** Encargado de la generación dinámica de códigos QR personalizados para unirse remotamente al sorteo.
   - **`rolesController.ts`:** Implementa un control de acceso basado en roles (RBAC) granular para administradores y colaboradores (diseñador, marketing, anunciante).
   - **`superAdminController.ts`:** Orquesta privilegios de alto nivel, auditoría profunda y control de licencias corporativas.

3. **Capa de Servicios de Negocio (Services):**
   - **`auditService.ts`:** Registrador inmutable de eventos de negocio y administración (auditoría).
   - **`licenseService.ts`:** Motor determinista y en línea para el control de activación y vigencia del software.
   - **`exportService.ts`:** Motor gráfico y tabular de generación de reportes (CSV, TXT, PNG nativo con Canvas).

4. **Vistas e Interfaz Reactiva (Views / UI):**
   - Utiliza **Custom Web Components Nativos** (`nexo-audit-log`, `nexo-storage-monitor`, `nexo-analytics`, `nexo-leads-list`, `nexo-history-list`, `nexo-game-stats`).
   - Estos componentes escuchan de forma reactiva el evento de transmisión global `'nexo-state-change'`, auto-renderizándose con cero acoplamiento y cero dependencias externas de librerías JS pesadas.

---

## 2. Diagramas de Flujos de Negocio (UML)

### A. Flujo de Activación e Integridad de Licencias (Offline / Online)
```
[Administrador] ---- Ingrese Llave ----> [licenseService: handleLicenseActivation]
                                                        |
                                            ¿Hay Supabase configurado?
                                             /                     \
                                           [SÍ]                    [NO]
                                           /                         \
                     [activateLicenseOnline]             [validateLicenseAlgorithm]
                     (Llamada RPC a la nube)             (Algoritmo Checksum Local)
                               |                                      |
                     ¿Es Llave Válida?                       ¿Checksum coincide?
                      /            \                            /           \
                  [SÍ]             [NO]                      [SÍ]           [NO]
                  /                  \                       /                \
        [Guarda en State]     [Muestra Error]     [Guarda en State]     [Muestra Error]
        [Desbloquea App]                          [Desbloquea App]
```

### B. Flujo de Giro de Ruleta y Captura de Leads
```
[Participante] -- Registra Formulario --> [guestController: triggerGuestSpin]
                                                     |
                                         [addAuditEntry: "Giro Iniciado"]
                                                     |
                                         ¿Modo Sincronizado en Nube?
                                          /                       \
                                        [SÍ]                      [NO]
                                        /                           \
                           [syncConfigToSupabase]             [appWheel.spin()]
                           (Notifica "spinning")                     |
                                    |                         [Giro Completado]
                            [appWheel.spin()]                        |
                                    |                      [Registra Ganador]
                            [Giro Completado]                        |
                                    |                      [Guarda State local]
                            [Registra Ganador]                       |
                                    |                     [dispatchStateChange]
                           [syncConfigToSupabase]
```

---

## 3. Manual de Despliegue en Producción

### Requisitos Técnicos Mínimos
- Node.js >= 18.x (Recomendado 20.x LTS)
- npm >= 9.x
- Navegador compatible con Web Crypto API (Chrome, Safari, Firefox, Edge)

### Despliegue en la Nube (Vite Static Hosting - Vercel / Netlify / Cloud Run)
1. **Configurar Variables de Entorno (Opcional para persistencia en nube):**
   Crear un archivo `.env` en la raíz con las credenciales de conexión segura:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-de-supabase
   ```
2. **Instalar Dependencias de Producción:**
   ```bash
   npm ci
   ```
3. **Compilar el Proyecto (Build):**
   ```bash
   npm run build
   ```
4. **Desplegar Carpeta de Distribución:**
   El comando generará la carpeta estática optimizada `dist/`. Despliega el contenido de esta carpeta en cualquier CDN o servicio web estático.

### Empaquetado APK Nativo (Android Studio + Capacitor / Cordova / WebView Wrapper)
Dado que el proyecto es 100% Offline-First y no depende de CDNs externas:
1. **Inicializar Capacitor en el Proyecto:**
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init "Ruleta Nexo Premium" "com.nexo.ruletapremium" --web-dir=dist
   ```
2. **Agregar Plataforma Android:**
   ```bash
   npm install @capacitor/android
   npx cap add android
   ```
3. **Sincronizar Compilación Vite con Android Assets:**
   ```bash
   npm run build
   npx cap sync
   ```
4. **Compilar y Firmar APK en Android Studio:**
   - Abre la carpeta `android/` en Android Studio.
   - Ejecuta `Build > Build Bundle(s) / APK(s) > Build APK(s)` para generar el APK depurable o firmado de producción.

---

## 4. Manual de Mantenimiento y Operaciones

### Optimización y Limpieza de Datos (Storage Quota Limit)
El navegador limita el almacenamiento local en `LocalStorage` a un rango estricto de **5MB**. Para garantizar una operación ininterrumpida de grado Enterprise:
1. **Monitoreo Automático:**
   El componente `<nexo-storage-monitor>` calcula de manera constante y en tiempo real el espacio consumido por los datos de la ruleta e historiales de ganadores.
2. **Acción de Optimización (Defragmentación):**
   - Cuando el almacenamiento supera los **1.5MB** o un volumen mayor de 150 ganadores, se activa la sugerencia de optimización de memoria.
   - Al ejecutar `optimizeStorage`, se realiza una poda de seguridad que preserva los últimos 100 registros de ganadores, reduce las acciones antiguas en el registro de auditoría a las últimas 5 y realiza un reempaquetado del estado.
   - Esto libera hasta un **90%** de la cuota consumida de almacenamiento del navegador de forma instantánea.

### Rotación de Auditoría e Historiales
- El log de auditoría (`auditLog`) se autolimita dinámicamente a **60 elementos** en inserciones continuas para evitar fatiga de carga sobre el DOM y el motor criptográfico local.
- Se recomienda descargar un respaldo en formato CSV de la base de participantes de forma mensual antes de purgar los datos.

---

## 5. Architectural Decision Records (ADRs)

### ADR 001: Arquitectura Desacoplada y Web Components Nativos
- **Estado:** *ACEPTADO*
- **Contexto:** Mantener un rendimiento de 60 FPS en dispositivos móviles de gama baja y asegurar la portabilidad total a APK requería evitar librerías pesadas de gestión de DOM (como React o Angular que introducen un bundle considerable y overhead en WebView).
- **Decisión:** Implementar componentes personalizados nativos (`Web Components`) en `ui.ts` acoplados al evento global `nexo-state-change`.
- **Consecuencias:** El bundle final pesa menos de **150KB**, carga instantáneamente en Android WebView y ofrece un renderizado eficiente de 60 FPS estables.

### ADR 002: Criptografía AES-GCM 256-bits Local
- **Estado:** *ACEPTADO*
- **Contexto:** Dado que el sistema almacena leads privados y datos confidenciales en entornos Offline/Locales (en el navegador), los datos en texto plano en `LocalStorage` representaban un riesgo crítico de seguridad y cumplimiento normativo (GDPR/LOPD).
- **Decisión:** Encriptar todo el estado persistido localmente con algoritmos criptográficos asíncronos nativos (`SubtleCrypto`), derivando una clave AES de 256 bits única por dispositivo a partir de un identificador de hardware UUID estable y un secreto de sistema.
- **Consecuencias:** Los datos guardados localmente son completamente ilegibles e indescifrables para cualquier otra aplicación o usuario que inspeccione la memoria física del dispositivo.

### ADR 003: Algoritmo Híbrido de Licencias (Offline Checksum + Online RPC)
- **Estado:** *ACEPTADO*
- **Contexto:** La ruleta opera tanto en la nube (con internet) como en sótanos de convenciones, ferias o zonas remotas sin conectividad alguna (completamente Offline).
- **Decisión:** Diseñar una estructura de licencia de dos fases. Fase 1: Consulta en línea a API Supabase. Fase 2 (Fallback): Validación matemática y determinista de checksum basada en el ID de dispositivo y fechas de expiración.
- **Consecuencias:** El cliente nunca se queda bloqueado por falta de conectividad siempre que tenga una licencia con checksum válido para su dispositivo, pero el sistema mantiene el control central en línea cuando hay red disponible.

---

## 6. Plan de Recuperación ante Desastres (Disaster Recovery Plan)

### Escenario A: Corrupción del Almacenamiento Local (Caché del Navegador Borrada)
- **Impacto:** Alto (Pérdida de base de leads y configuraciones personalizadas si opera solo en local).
- **Mitigación / Recuperación:**
  1. Si la ruleta está configurada con **Supabase**, basta con que el usuario inicie sesión nuevamente con su correo y contraseña. El `StateManager` detectará la cuenta en la nube, descargará la última configuración, re-encriptará localmente y restaurará la operación en menos de 5 segundos.
  2. Si opera en **Modo Local**, la aplicación fomenta de manera preventiva la exportación manual de copias de seguridad (`.nexo`). Un archivo `.nexo` contiene un volcado de base64 encriptado. Importando este archivo desde el panel de configuración, el sistema se reconstruye al instante.

### Escenario B: Caída de Conectividad o Bloqueo del Servidor de Base de Datos (Cloud Sync Failover)
- **Impacto:** Medio (Imposibilidad de sincronizar leads en tiempo real con la nube).
- **Mitigación / Recuperación:**
  1. El sistema opera de manera **asíncrona tolerante a fallos**. Si una petición a Supabase falla, el `StateManager` captura la excepción, escribe un aviso en la consola e implementa reintentos locales transparentes.
  2. Toda la información se guarda primero localmente bajo encriptación segura. Una vez que la conectividad a la red se reestablece, el sistema sincroniza automáticamente el estado más reciente en la base de datos de la nube sin pérdida alguna de información de participantes o ganadores.
