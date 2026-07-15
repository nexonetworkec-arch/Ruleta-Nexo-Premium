/*
 * RULETA NEXO PREMIUM Engine - html2canvas Offline Auto-Loader
 * Elimina la necesidad de dependencias externas continuas.
 * Descarga la versión 1.4.1 minificada la primera vez y la guarda en la caché local 
 * para garantizar operatividad 100% offline permanente.
 */
(async function (global) {
    const CACHE_KEY = 'ruleta_nexo_premium_html2canvas_offline_lib';
    let libCode = localStorage.getItem(CACHE_KEY);
    
    if (!libCode) {
        console.log("RULETA NEXO PREMIUM Engine: Descargando motor html2canvas real para caché offline...");
        try {
            const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            if (response.ok) {
                libCode = await response.text();
                try {
                    localStorage.setItem(CACHE_KEY, libCode);
                    console.log("RULETA NEXO PREMIUM Engine: html2canvas v1.4.1 guardado exitosamente en caché offline.");
                } catch (e) {
                    console.warn("RULETA NEXO PREMIUM Engine: Capacidad de LocalStorage excedida, operando en memoria temporal.");
                }
            }
        } catch (e) {
            console.error("RULETA NEXO PREMIUM Engine: Error al descargar la librería en el primer inicio. Requiere internet 1 sola vez.", e);
        }
    } else {
        console.log("RULETA NEXO PREMIUM Engine: Motor de renderizado html2canvas cargado nativamente desde caché offline.");
    }
    
    if (libCode) {
        // Ejecutar el código en el scope global de forma directa
        try {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.text = libCode;
            document.head.appendChild(script);
        } catch(e) {
            console.error("RULETA NEXO PREMIUM Engine: Error al inyectar html2canvas", e);
        }
    } else {
        // Fallback de seguridad visual si el dispositivo jamás se conectó a internet
        global.html2canvas = function(element, options) {
            console.warn("RULETA NEXO PREMIUM Engine: Ejecutando renderizado de emergencia (Librería no encontrada en caché).");
            const canvas = document.createElement('canvas');
            canvas.width = 1200;
            canvas.height = 800;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#161616';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 35px Arial';
            ctx.fillText('⚠️ LIBRERÍA DE RENDERIZADO NO ENCONTRADA', 50, 100);
            ctx.fillStyle = '#ffffff';
            ctx.font = '25px Arial';
            ctx.fillText('El dispositivo debe conectarse a Internet al menos una vez', 50, 160);
            ctx.fillText('para descargar el motor gráfico de exportación.', 50, 200);
            return Promise.resolve(canvas);
        };
    }
})(typeof globalThis !== 'undefined' ? globalThis : window);