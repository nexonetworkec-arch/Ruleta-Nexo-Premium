import { StateManager } from '../core';
import { triggerDownload } from '../utils';

export const exportCSVFunction = (
    showCustomAlert: (message: string, title?: string) => void
) => {
    let history = StateManager.config.winnersHistory;
    if (StateManager.config.publicSessionListEnabled && StateManager.config.publicSessionId) {
        history = history.filter(h => h.publicSessionId === StateManager.config.publicSessionId);
    }
    if (StateManager.config.localSessionListEnabled && StateManager.config.localSessionId) {
        history = history.filter(h => h.localSessionId === StateManager.config.localSessionId);
    }
    if (!history.length) return showCustomAlert("No hay datos en la lista actual para exportar.", "ATENCIÓN");
    const btnExportLeads = document.getElementById('btnExportCSVLeads');
    const btnExport = document.getElementById('btnExportCSV');
    if (btnExportLeads) btnExportLeads.innerText = "PROCESANDO...";
    if (btnExport) btnExport.innerText = "PROCESANDO...";

    setTimeout(() => {
        try {
            const fieldHeaders = StateManager.config.formFields.map(f => f.label.toUpperCase());
            let csv = "\uFEFF"; 
            csv += ["NRO", "GANADOR", "FECHA", ...fieldHeaders].join(",") + "\n";
            history.forEach((h, i) => {
                const leadValues = StateManager.config.formFields.map(f => '"' + ((h.lead && h.lead[f.id]) || "").toString().replace(/"/g, '""') + '"');
                csv += [i + 1, '"' + h.nombre.replace(/"/g, '""') + '"', '"' + h.fecha + '"', ...leadValues].join(",") + "\n";
            });

            const filename = `Base_Participantes_${StateManager.config.title.replace(/\s+/g, '_')}.csv`;
            const base64CSV = btoa(unescape(encodeURIComponent(csv)));
            const dataUri = `data:text/csv;charset=utf-8;base64,${base64CSV}`;

            triggerDownload(dataUri, filename, 'text/csv');
        } catch (e) {
            showCustomAlert("Error al exportar CSV.", "ERROR");
        } finally {
            if (btnExportLeads) btnExportLeads.innerText = "DESCARGAR BASE DE DATOS (.CSV)";
            if (btnExport) btnExport.innerText = "EXPORTAR CSV";
        }
    }, 50);
};

export const exportTXTFunction = (
    showCustomAlert: (message: string, title?: string) => void
) => {
    let leads = StateManager.config.winnersHistory.filter(h => h.lead);
    if (StateManager.config.publicSessionListEnabled && StateManager.config.publicSessionId) {
        leads = leads.filter(h => h.publicSessionId === StateManager.config.publicSessionId);
    }
    if (StateManager.config.localSessionListEnabled && StateManager.config.localSessionId) {
        leads = leads.filter(h => h.localSessionId === StateManager.config.localSessionId);
    }
    if (!leads.length) return showCustomAlert("No hay participantes registrados en esta sesión para exportar.", "ATENCIÓN");
    
    const btnTXT = document.getElementById('btnExportTXTLeads');
    if (btnTXT) btnTXT.innerText = "PROCESANDO...";
    
    setTimeout(() => {
        try {
            let txt = "==================================================\n";
            txt += "        NEXO PREMIUM - REPORTE DE PARTICIPANTES\n";
            txt += "==================================================\n";
            txt += `Evento: ${StateManager.config.title}\n`;
            txt += `Fecha del Reporte: ${new Date().toLocaleString()}\n`;
            txt += `Total Registrados: ${leads.length}\n\n`;
            txt += "--------------------------------------------------\n";
            txt += "PARTICIPANTES REGISTRADOS:\n";
            txt += "--------------------------------------------------\n";
            
            leads.forEach((l, i) => {
                txt += `NRO: ${i + 1}\n`;
                txt += `FECHA: ${l.fecha}\n`;
                txt += `PREMIO / ESTADO: ${l.nombre === "REGISTRADO (SORTEO)" ? "Registrado para Sorteo" : l.nombre}\n`;
                txt += "DATOS DE REGISTRO:\n";
                StateManager.config.formFields.forEach(f => {
                    txt += `  • ${f.label}: ${l.lead?.[f.id] || '---'}\n`;
                });
                txt += "--------------------------------------------------\n";
            });
            
            txt += "==================================================\n";
            txt += "Generado automáticamente por Ruleta Nexo Premium.\n";
            txt += "==================================================\n";

            const filename = `Reporte_Participantes_${StateManager.config.title.replace(/\s+/g, '_')}.txt`;
            const base64TXT = btoa(unescape(encodeURIComponent(txt)));
            const dataUri = `data:text/plain;charset=utf-8;base64,${base64TXT}`;

            triggerDownload(dataUri, filename, 'text/plain');
        } catch (e) {
            showCustomAlert("Error al exportar TXT.", "ERROR");
        } finally {
            if (btnTXT) btnTXT.innerText = "REPORTE (.TXT)";
        }
    }, 50);
};

export const exportIMGFunction = (
    showCustomAlert: (message: string, title?: string) => void
) => {
    let leads = StateManager.config.winnersHistory.filter(h => h.lead);
    if (StateManager.config.publicSessionListEnabled && StateManager.config.publicSessionId) {
        leads = leads.filter(h => h.publicSessionId === StateManager.config.publicSessionId);
    }
    if (StateManager.config.localSessionListEnabled && StateManager.config.localSessionId) {
        leads = leads.filter(h => h.localSessionId === StateManager.config.localSessionId);
    }
    if (!leads.length) return showCustomAlert("No hay participantes registrados en esta sesión para exportar.", "ATENCIÓN");

    const btnIMG = document.getElementById('btnExportIMGLeads');
    if (btnIMG) btnIMG.innerText = "PROCESANDO...";

    setTimeout(() => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("No se pudo inicializar el contexto de Canvas.");

            const maxEntries = 50;
            const drawLeads = leads.slice(-maxEntries).reverse();

            const headerHeight = 220;
            const rowHeight = 75;
            const footerHeight = 120;
            const contentHeight = drawLeads.length * rowHeight;
            const totalHeight = headerHeight + contentHeight + footerHeight;

            canvas.width = 1200;
            canvas.height = Math.min(4500, totalHeight);

            // Dark premium gradient
            const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            bgGrad.addColorStop(0, '#040507');
            bgGrad.addColorStop(0.5, '#060709');
            bgGrad.addColorStop(1, '#020304');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Gold framing double border
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 4;
            ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
            
            ctx.strokeStyle = '#1d1502';
            ctx.lineWidth = 1;
            ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

            // Title Banner Header
            ctx.fillStyle = '#0c0d11';
            ctx.fillRect(30, 30, canvas.width - 60, headerHeight - 40);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.strokeRect(30, 30, canvas.width - 60, headerHeight - 40);

            ctx.fillStyle = '#D4AF37';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('NEXO PREMIUM - LISTA DE PARTICIPANTES', canvas.width / 2, 85);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px sans-serif';
            ctx.fillText(`EVENTO: ${StateManager.config.title.toUpperCase()}`, canvas.width / 2, 125);

            ctx.fillStyle = '#888888';
            ctx.font = '16px monospace';
            const dateStr = `Exportado: ${new Date().toLocaleString()}`;
            const countStr = `Participantes listados: ${drawLeads.length} de ${leads.length}`;
            ctx.fillText(`${dateStr}   |   ${countStr}`, canvas.width / 2, 165);

            // Column Headers setup
            const colHeaders = ["NRO", "FECHA", "DATOS DE REGISTRO", "PREMIO / ESTADO"];
            const colX = [30, 110, 290, 890];

            ctx.fillStyle = '#16181f';
            ctx.fillRect(30, headerHeight - 30, canvas.width - 60, 45);
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 1;
            ctx.strokeRect(30, headerHeight - 30, canvas.width - 60, 45);

            ctx.fillStyle = '#D4AF37';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'left';
            for (let c = 0; c < colHeaders.length; c++) {
                ctx.fillText(colHeaders[c], colX[c] + 15, headerHeight - 3);
            }

            let currentY = headerHeight + 15;
            drawLeads.forEach((l, index) => {
                if (currentY + rowHeight > canvas.height - footerHeight) return;

                ctx.fillStyle = (index % 2 === 0) ? '#090a0f' : '#0e1017';
                ctx.fillRect(30, currentY, canvas.width - 60, rowHeight - 5);
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
                ctx.strokeRect(30, currentY, canvas.width - 60, rowHeight - 5);

                ctx.fillStyle = '#D4AF37';
                ctx.font = 'bold 20px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${leads.length - index}`, colX[0] + 40, currentY + 38);

                ctx.fillStyle = '#888';
                ctx.font = '14px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(l.fecha || '---', colX[1] + 15, currentY + 38);

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 15px sans-serif';
                const firstField = StateManager.config.formFields[0]?.id;
                const leadName = l.lead?.[firstField] || 'PARTICIPANTE';
                ctx.fillText(leadName, colX[2] + 15, currentY + 30);

                ctx.fillStyle = '#aaa';
                ctx.font = '13px sans-serif';
                const detailsArr: string[] = [];
                StateManager.config.formFields.slice(1).forEach(f => {
                    if (l.lead?.[f.id]) {
                        detailsArr.push(`${f.label}: ${l.lead[f.id]}`);
                    }
                });
                const detailsText = detailsArr.slice(0, 3).join("  |  ");
                ctx.fillText(detailsText || '(Sin detalles adicionales)', colX[2] + 15, currentY + 52);

                if (l.nombre === "REGISTRADO (SORTEO)") {
                    ctx.fillStyle = '#777';
                    ctx.font = 'italic 15px sans-serif';
                    ctx.fillText('Registrado en ruleta', colX[3] + 15, currentY + 38);
                } else if (l.nombre === "GIRANDO...") {
                    ctx.fillStyle = '#e5a93b';
                    ctx.font = 'bold italic 15px sans-serif';
                    ctx.fillText('Sorteo en curso...', colX[3] + 15, currentY + 38);
                } else {
                    ctx.fillStyle = '#D4AF37';
                    ctx.font = 'bold 15px sans-serif';
                    ctx.fillText(l.nombre, colX[3] + 15, currentY + 38);
                }

                currentY += rowHeight;
            });

            const footerY = canvas.height - footerHeight + 20;
            ctx.fillStyle = 'rgba(212,175,55,0.05)';
            ctx.fillRect(30, canvas.height - footerHeight + 10, canvas.width - 60, footerHeight - 40);
            ctx.strokeStyle = '#222';
            ctx.strokeRect(30, canvas.height - footerHeight + 10, canvas.width - 60, footerHeight - 40);

            ctx.fillStyle = '#555';
            ctx.font = '13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('SISTEMA DE VERIFICACIÓN DE SORTEOS NEXO PREMIUM', canvas.width / 2, footerY + 20);
            ctx.fillText('Todos los registros están respaldados por seguridad criptográfica e inicio de sesión seguro.', canvas.width / 2, footerY + 42);
            ctx.fillStyle = '#D4AF37';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(window.location.origin, canvas.width / 2, footerY + 62);

            const filename = `Verificacion_Participantes_${StateManager.config.title.replace(/\s+/g, '_')}.png`;
            const dataUri = canvas.toDataURL('image/png');
            triggerDownload(dataUri, filename, 'image/png');

        } catch (e: any) {
            showCustomAlert(`Error al exportar imagen: ${e?.message || e}`, "ERROR");
        } finally {
            if (btnIMG) btnIMG.innerText = "IMAGEN (.PNG)";
        }
    }, 50);
};
