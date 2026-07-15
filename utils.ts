
export const mixColors = (hex1: string, hex2: string, weight = 0.5): string => {
    const r1 = parseInt(hex1.slice(1, 3), 16);
    const g1 = parseInt(hex1.slice(3, 5), 16);
    const b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16);
    const g2 = parseInt(hex2.slice(3, 5), 16);
    const b2 = parseInt(hex2.slice(5, 7), 16);
    
    // El peso indica la proporción del primer color (hex1)
    const w1 = weight;
    const w2 = 1 - weight;
    
    const r = Math.min(255, Math.max(0, Math.round(r1 * w1 + r2 * w2))).toString(16).padStart(2, '0');
    const g = Math.min(255, Math.max(0, Math.round(g1 * w1 + g2 * w2))).toString(16).padStart(2, '0');
    const b = Math.min(255, Math.max(0, Math.round(b1 * w1 + b2 * w2))).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
};

export const compressImage = (dataUrl: string, maxWidth = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
    });
};

export const debounce = (func: Function, wait: number) => {
    let timeout: number;
    return (...args: any[]) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(null, args), wait);
    };
};

/**
 * Bridge de descarga universal (Web + APK)
 * Resuelve el bloqueo de descargas en Android WebViews.
 */
export const triggerDownload = (dataUri: string, filename: string, mimeType: string) => {
    // @ts-ignore - Interfaz inyectada nativamente en el APK
    if (window.AndroidDownloader && typeof window.AndroidDownloader.saveBase64 === 'function') {
        try {
            // @ts-ignore
            window.AndroidDownloader.saveBase64(dataUri, mimeType, filename);
            console.log("RULETA NEXO PREMIUM APK: Descarga canalizada vía Bridge Nativo.");
            return;
        } catch (e) {
            console.error("RULETA NEXO PREMIUM APK: Error en Bridge Nativo, intentando fallback Web.", e);
        }
    }

    // Fallback estándar para Navegadores
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
