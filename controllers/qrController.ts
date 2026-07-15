import QRCode from 'qrcode';
import { INITIAL_DEFAULT_CONFIG, THEME_PRESETS, DEFAULT_LICENSE, UserAccount, LeadData, WinnerEntry, Prize, SavedPrizeList } from '../config';
import { Security, StateManager } from '../core';
import { appWheel } from '../engine';

// QR Module State
let currentQRText = "";
let currentQRLogoBase64 = "";
let syncIntervalId: any = null;

// Callbacks required from the main system
interface QRCallbacks {
    isSupabaseConfigured: () => boolean;
    fetchConfigFromSupabase: (email: string) => Promise<any>;
    syncConfigToSupabase: (email: string, config: any) => Promise<boolean>;
    applyActiveThemeColors: () => void;
    renderLeadsList: () => void;
    applyLogoToWheel: (logo: string) => void;
    applyBackground: (bg: string) => void;
    showCustomAlert: (message: string, title?: string) => void;
    showCustomConfirm: (message: string, onConfirm: () => void) => void;
    updatePublicSessionStatusDisplay: () => void;
    updateLightningSessionStatusDisplay: () => void;
}

let callbacks: QRCallbacks | null = null;

export const setQRCallbacks = (cb: QRCallbacks) => {
    callbacks = cb;
};

const getCallbacks = (): QRCallbacks => {
    if (!callbacks) {
        throw new Error("QR callbacks must be set before invoking functions.");
    }
    return callbacks;
};

export const getActiveGameList = (): SavedPrizeList | null => {
    const id = StateManager.config.activeSavedListId || "list_juego_estandar";
    return StateManager.config.savedPrizeLists?.find((l: any) => l.id === id) || null;
};

export const generateCustomizedQR = async (text: string) => {
    currentQRText = text;
    const qrImg = document.getElementById('qrImage') as HTMLImageElement;
    if (!qrImg) return;

    try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, text, { 
            width: 400, 
            margin: 2,
            errorCorrectionLevel: 'H' 
        });

        const ctx = canvas.getContext('2d');
        if (ctx && currentQRLogoBase64) {
            const img = new Image();
            img.src = currentQRLogoBase64;
            await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
            });

            if (img.complete && img.naturalWidth > 0) {
                const logoSize = canvas.width * 0.22;
                const x = (canvas.width - logoSize) / 2;
                const y = (canvas.height - logoSize) / 2;

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x - 3, y - 3, logoSize + 6, logoSize + 6, 4);
                } else {
                    ctx.rect(x - 3, y - 3, logoSize + 6, logoSize + 6);
                }
                ctx.fill();

                ctx.strokeStyle = '#ddd';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.drawImage(img, x, y, logoSize, logoSize);
            }
        }

        const dataUrl = canvas.toDataURL('image/png');
        qrImg.src = dataUrl;

        const qrLogoOverlay = document.getElementById('qrLogoOverlay') as HTMLImageElement;
        if (qrLogoOverlay) {
            if (currentQRLogoBase64) {
                qrLogoOverlay.src = currentQRLogoBase64;
                qrLogoOverlay.style.display = 'block';
            } else {
                qrLogoOverlay.style.display = 'none';
            }
        }
    } catch (err) {
        console.error("Error generating customized QR:", err);
    }
};

export const generateQRCard = (qrSrc: string, titleText: string, messageText: string, gameConfig?: SavedPrizeList): Promise<string> => {
    return new Promise((resolve) => {
        const config = gameConfig || StateManager.config;
        const cb = getCallbacks();
        
        const bgColor = config.qrCardBgColor || StateManager.config.qrCardBgColor || '#060709';
        const borderColor = config.qrCardBorderColor || StateManager.config.qrCardBorderColor || '#D4AF37';
        const brandText = config.qrCardBrandText || StateManager.config.qrCardBrandText || "✦   R U L E T A   N E X O   P R E M I U M   ✦";
        const brandColor = config.qrCardBrandColor || StateManager.config.qrCardBrandColor || '#D4AF37';
        const titleColor = config.qrCardTitleColor || StateManager.config.qrCardTitleColor || '#FFFFFF';
        const messageColor = config.qrCardMessageColor || StateManager.config.qrCardMessageColor || '#CCCCCC';
        const footerText = config.qrCardFooterText || StateManager.config.qrCardFooterText || "SISTEMA DE RULETA & SORTEOS PREMIUM";
        const footerColor = config.qrCardFooterColor || StateManager.config.qrCardFooterColor || '#D4AF37';
        const copyrightText = config.qrCardCopyrightText || StateManager.config.qrCardCopyrightText || "© RULETA NEXO PREMIUM. TODOS LOS DERECHOS RESERVADOS.";
        const copyrightColor = config.qrCardCopyrightColor || StateManager.config.qrCardCopyrightColor || '#666666';

        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 1100;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve(qrSrc);
            return;
        }

        // Helper to convert hex to rgba
        const hexToRgba = (hex: string, alpha: number) => {
            const r = parseInt(hex.slice(1, 3), 16) || 0;
            const g = parseInt(hex.slice(3, 5), 16) || 0;
            const b = parseInt(hex.slice(5, 7), 16) || 0;
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // Draw background gradient (luxurious dark slate/obsidian based on bgColor)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, 1100);
        bgGrad.addColorStop(0, bgColor);
        bgGrad.addColorStop(1, '#000000');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 800, 1100);

        // Draw subtle background radial glow behind QR
        const glowGrad = ctx.createRadialGradient(400, 620, 50, 400, 620, 450);
        glowGrad.addColorStop(0, hexToRgba(borderColor, 0.08));
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, 0, 800, 1100);

        // Draw luxury gold borders
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, 740, 1040);

        ctx.strokeStyle = hexToRgba(borderColor, 0.35);
        ctx.lineWidth = 1.5;
        ctx.strokeRect(40, 40, 720, 1020);

        // Top decorative corner brackets
        const drawCorners = (x: number, y: number, w: number, h: number, size: number) => {
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 5;
            
            // Top-left
            ctx.beginPath();
            ctx.moveTo(x + size, y); ctx.lineTo(x, y); ctx.lineTo(x, y + size);
            ctx.stroke();

            // Top-right
            ctx.beginPath();
            ctx.moveTo(x + w - size, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + size);
            ctx.stroke();

            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(x, y + h - size); ctx.lineTo(x, y + h); ctx.lineTo(x + size, y + h);
            ctx.stroke();

            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(x + w, y + h - size); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - size, y + h);
            ctx.stroke();
        };
        drawCorners(48, 48, 704, 1004, 30);

        // Top brand header
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = brandColor;
        ctx.font = '900 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(brandText.toUpperCase(), 400, 110);

        // Subtitle line / accent line under brand
        ctx.strokeStyle = hexToRgba(borderColor, 0.2);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(250, 140);
        ctx.lineTo(550, 140);
        ctx.stroke();

        // Draw card main title
        ctx.fillStyle = titleColor;
        ctx.font = '900 36px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        
        const wrapText = (text: string, x: number, startY: number, lineMaxW: number, lineH: number, maxLines = 2) => {
            const words = text.split(' ');
            let line = '';
            const lines: string[] = [];
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > lineMaxW && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);
            
            const linesToDraw = lines.slice(0, maxLines);
            linesToDraw.forEach((l, i) => {
                ctx.fillText(l.trim(), x, startY + (i * lineH));
            });
            return linesToDraw.length * lineH;
        };

        const titleHeight = wrapText(titleText.toUpperCase(), 400, 195, 640, 46, 2);

        // Draw description text (wrapped)
        ctx.fillStyle = messageColor;
        ctx.font = '500 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        const msgStartY = 195 + titleHeight + 15;
        wrapText(messageText, 400, msgStartY, 600, 26, 3);

        // QR Code Container card in the center
        const qrCardW = 440;
        const qrCardH = 440;
        const qrCardX = 400 - qrCardW / 2;
        const qrCardY = 640 - qrCardH / 2;

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        const roundRectShadow = (rx: number, ry: number, rw: number, rh: number, radius: number) => {
            ctx.beginPath();
            ctx.moveTo(rx + radius, ry);
            ctx.lineTo(rx + rw - radius, ry);
            ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
            ctx.lineTo(rx + rw, ry + rh - radius);
            ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
            ctx.lineTo(rx + radius, ry + rh);
            ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
            ctx.lineTo(rx, ry + radius);
            ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
            ctx.closePath();
            ctx.fill();
        };

        roundRectShadow(qrCardX + 5, qrCardY + 8, qrCardW, qrCardH, 20);

        ctx.fillStyle = '#FFFFFF';
        roundRectShadow(qrCardX, qrCardY, qrCardW, qrCardH, 20);

        // Golden inner border on QR container
        ctx.strokeStyle = hexToRgba(borderColor, 0.4);
        ctx.lineWidth = 3;
        ctx.strokeRect(qrCardX + 10, qrCardY + 10, qrCardW - 20, qrCardH - 20);

        // Load and draw the QR image onto the white card
        const qrImg = new Image();
        qrImg.src = qrSrc;
        qrImg.onload = () => {
            const qrDrawSize = 390;
            const qrDrawX = 400 - qrDrawSize / 2;
            const qrDrawY = 640 - qrDrawSize / 2;
            ctx.drawImage(qrImg, qrDrawX, qrDrawY, qrDrawSize, qrDrawSize);

            // Draw instruction under QR
            ctx.fillStyle = borderColor;
            ctx.font = '900 11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText("ESCANEA CON LA CÁMARA DE TU CELULAR", 400, 895);

            // Divider line
            ctx.strokeStyle = hexToRgba(borderColor, 0.15);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(180, 935);
            ctx.lineTo(620, 935);
            ctx.stroke();

            // Footers
            ctx.fillStyle = footerColor;
            ctx.font = '900 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(footerText.toUpperCase(), 400, 965);

            ctx.fillStyle = copyrightColor;
            ctx.font = '500 11px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.fillText(copyrightText.toUpperCase(), 400, 990);

            resolve(canvas.toDataURL('image/png'));
        };
        qrImg.onerror = () => {
            resolve(qrSrc);
        };
    });
};

export const setupQRPersonalizationHandlers = () => {
    const btnToggle = document.getElementById('btnToggleQRPersonalize');
    const panel = document.getElementById('qrPersonalizePanel');
    const cb = getCallbacks();
    
    // Inputs
    const inputBrandText = document.getElementById('inputQRBrandText') as HTMLInputElement;
    const inputTitle = document.getElementById('inputQRTitle') as HTMLInputElement;
    const inputMsg = document.getElementById('inputQRMessage') as HTMLTextAreaElement;
    const inputFooterText = document.getElementById('inputQRFooterText') as HTMLInputElement;
    const inputCopyrightText = document.getElementById('inputQRCopyrightText') as HTMLInputElement;
    
    const inputBgColor = document.getElementById('inputQRBgColor') as HTMLInputElement;
    const inputBorderColor = document.getElementById('inputQRBorderColor') as HTMLInputElement;
    const inputBrandColor = document.getElementById('inputQRBrandColor') as HTMLInputElement;
    const inputTitleColor = document.getElementById('inputQRTitleColor') as HTMLInputElement;
    const inputMessageColor = document.getElementById('inputQRMessageColor') as HTMLInputElement;
    const inputFooterColor = document.getElementById('inputQRFooterColor') as HTMLInputElement;
    const inputCopyrightColor = document.getElementById('inputQRCopyrightColor') as HTMLInputElement;
    
    const fileInput = document.getElementById('inputQRLogo') as HTMLInputElement;
    const btnUpload = document.getElementById('btnUploadQRLogo');
    const btnRemove = document.getElementById('btnRemoveQRLogo');
    const btnDownload = document.getElementById('btnDownloadQR');

    const config = StateManager.config;

    const triggerCloudSync = async () => {
        StateManager.save();
        const urlParams = new URLSearchParams(window.location.search);
        const adminEmail = urlParams.get('admin') || sessionStorage.getItem('nexo_current_user_email');
        if (cb.isSupabaseConfigured() && adminEmail) {
            try {
                await cb.syncConfigToSupabase(adminEmail, StateManager.config);
            } catch (e) {
                console.error("Error al sincronizar cambio de QR en la nube:", e);
            }
        }
    };

    // Prefill helper
    const prefillInputs = () => {
        if (inputBrandText) inputBrandText.value = config.qrCardBrandText || "✦   R U L E T A   N E X O   P R E M I U M   ✦";
        if (inputTitle) inputTitle.value = config.adQrTitle || config.qrCardBrandText || "¡ESCANEA Y GANA MÁS!";
        if (inputMsg) inputMsg.value = config.adQrMessage || "Sigue nuestras redes o califica nuestro servicio para obtener beneficios exclusivos.";
        if (inputFooterText) inputFooterText.value = config.qrCardFooterText || "SISTEMA DE RULETA & SORTEOS PREMIUM";
        if (inputCopyrightText) inputCopyrightText.value = config.qrCardCopyrightText || "© RULETA NEXO PREMIUM. TODOS LOS DERECHOS RESERVADOS.";

        if (inputBgColor) inputBgColor.value = config.qrCardBgColor || "#060709";
        if (inputBorderColor) inputBorderColor.value = config.qrCardBorderColor || "#D4AF37";
        if (inputBrandColor) inputBrandColor.value = config.qrCardBrandColor || "#D4AF37";
        if (inputTitleColor) inputTitleColor.value = config.qrCardTitleColor || "#FFFFFF";
        if (inputMessageColor) inputMessageColor.value = config.qrCardMessageColor || "#CCCCCC";
        if (inputFooterColor) inputFooterColor.value = config.qrCardFooterColor || "#D4AF37";
        if (inputCopyrightColor) inputCopyrightColor.value = config.qrCardCopyrightColor || "#666666";

        updateLivePreview();
    };

    // Real-time preview helper
    const updateLivePreview = () => {
        const qrTitle = document.getElementById('qrTitle');
        const qrMsg = document.getElementById('qrMessage');
        const modalContent = document.querySelector('#modalQR .modal-content') as HTMLElement;

        if (qrTitle) {
            qrTitle.innerText = inputTitle?.value || "¡ESCANEA Y GANA MÁS!";
            if (inputTitleColor) qrTitle.style.color = inputTitleColor.value;
        }
        if (qrMsg) {
            qrMsg.innerText = inputMsg?.value || "";
            if (inputMessageColor) qrMsg.style.color = inputMessageColor.value;
        }
        if (modalContent) {
            if (inputBgColor) modalContent.style.backgroundColor = inputBgColor.value;
            if (inputBorderColor) modalContent.style.borderColor = inputBorderColor.value;
        }
    };

    if (btnToggle && panel) {
        btnToggle.onclick = () => {
            if (panel.style.display === 'none' || !panel.style.display) {
                panel.style.display = 'block';
                btnToggle.innerHTML = "🎨 OCULTAR";
                prefillInputs();
            } else {
                panel.style.display = 'none';
                btnToggle.innerHTML = "🎨 PERSONALIZAR";
            }
        };
    }

    // Input text binders
    if (inputBrandText) {
        inputBrandText.oninput = () => {
            config.qrCardBrandText = inputBrandText.value;
            triggerCloudSync();
        };
    }
    if (inputTitle) {
        inputTitle.oninput = () => {
            config.adQrTitle = inputTitle.value;
            updateLivePreview();
            triggerCloudSync();
        };
    }
    if (inputMsg) {
        inputMsg.oninput = () => {
            config.adQrMessage = inputMsg.value;
            updateLivePreview();
            triggerCloudSync();
        };
    }
    if (inputFooterText) {
        inputFooterText.oninput = () => {
            config.qrCardFooterText = inputFooterText.value;
            triggerCloudSync();
        };
    }
    if (inputCopyrightText) {
        inputCopyrightText.oninput = () => {
            config.qrCardCopyrightText = inputCopyrightText.value;
            triggerCloudSync();
        };
    }

    // Color Pickers binders
    if (inputBgColor) {
        inputBgColor.onchange = () => {
            config.qrCardBgColor = inputBgColor.value;
            updateLivePreview();
            triggerCloudSync();
        };
    }
    if (inputBorderColor) {
        inputBorderColor.onchange = () => {
            config.qrCardBorderColor = inputBorderColor.value;
            updateLivePreview();
            triggerCloudSync();
        };
    }
    if (inputBrandColor) {
        inputBrandColor.onchange = () => {
            config.qrCardBrandColor = inputBrandColor.value;
            triggerCloudSync();
        };
    }
    if (inputTitleColor) {
        inputTitleColor.onchange = () => {
            config.qrCardTitleColor = inputTitleColor.value;
            updateLivePreview();
            triggerCloudSync();
        };
    }
    if (inputMessageColor) {
        inputMessageColor.onchange = () => {
            config.qrCardMessageColor = inputMessageColor.value;
            updateLivePreview();
            triggerCloudSync();
        };
    }
    if (inputFooterColor) {
        inputFooterColor.onchange = () => {
            config.qrCardFooterColor = inputFooterColor.value;
            triggerCloudSync();
        };
    }
    if (inputCopyrightColor) {
        inputCopyrightColor.onchange = () => {
            config.qrCardCopyrightColor = inputCopyrightColor.value;
            triggerCloudSync();
        };
    }

    if (btnUpload && fileInput) {
        btnUpload.onclick = () => fileInput.click();
    }

    if (fileInput) {
        fileInput.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (evt) => {
                    currentQRLogoBase64 = evt.target?.result as string;
                    if (btnRemove) btnRemove.style.display = 'inline-block';
                    await generateCustomizedQR(currentQRText);
                };
                reader.readAsDataURL(file);
            }
        };
    }

    if (btnRemove) {
        btnRemove.onclick = async () => {
            currentQRLogoBase64 = "";
            if (fileInput) fileInput.value = "";
            btnRemove.style.display = 'none';
            await generateCustomizedQR(currentQRText);
        };
    }

    if (btnDownload) {
        btnDownload.onclick = async () => {
            const qrImg = document.getElementById('qrImage') as HTMLImageElement;
            if (qrImg && qrImg.src) {
                const originalText = btnDownload.innerHTML;
                btnDownload.innerHTML = "⏳ GENERANDO...";
                btnDownload.style.pointerEvents = 'none';
                
                try {
                    const activeList = getActiveGameList();
                    const titleText = (activeList && activeList.adQrTitle) || config.adQrTitle || "¡ESCANEA Y GANA MÁS!";
                    const messageText = (activeList && activeList.adQrMessage) || config.adQrMessage || "Escanea para participar.";
                    
                    const cardDataUrl = await generateQRCard(qrImg.src, titleText, messageText, activeList || undefined);
                    
                    const link = document.createElement('a');
                    link.download = 'nexo-tarjeta-qr.png';
                    link.href = cardDataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (err) {
                    console.error("Error al generar la tarjeta QR:", err);
                    cb.showCustomAlert("Hubo un problema al generar la tarjeta del código QR.", "ERROR");
                } finally {
                    btnDownload.innerHTML = originalText;
                    btnDownload.style.pointerEvents = 'auto';
                }
            } else {
                cb.showCustomAlert("No hay código QR disponible para descargar.", "ERROR");
            }
        };
    }

    // Run prefill on setup
    prefillInputs();
};

const saveAndSyncToActiveGame = () => {
    const activeList = getActiveGameList();
    if (activeList) {
        activeList.publicJoinEnabled = StateManager.config.publicJoinEnabled;
        activeList.publicRegisterEnabled = StateManager.config.publicRegisterEnabled;
        activeList.publicRemoveWinner = StateManager.config.publicRemoveWinner;
        activeList.publicSessionListEnabled = StateManager.config.publicSessionListEnabled;
        activeList.publicLiveViewEnabled = StateManager.config.publicLiveViewEnabled;
        activeList.publicAfterAction = StateManager.config.publicAfterAction;
        activeList.publicPromoUrl = StateManager.config.publicPromoUrl;
        activeList.publicMaxParticipants = StateManager.config.publicMaxParticipants;
        activeList.publicTimeLimit = StateManager.config.publicTimeLimit;
        activeList.syncSpinEnabled = StateManager.config.syncSpinEnabled;
        
        // Sincronizar alias para reporte local
        activeList.localRequireRegister = activeList.publicRegisterEnabled;
        activeList.autoRemoveWinner = activeList.publicRemoveWinner;
        activeList.localSessionListEnabled = activeList.publicSessionListEnabled;
        
        activeList.publicSessionId = StateManager.config.publicSessionId || "";
        activeList.publicSessionExpiry = StateManager.config.publicSessionExpiry || 0;
        activeList.publicSpinsCount = StateManager.config.publicSpinsCount || 0;
    }
    StateManager.save();
};

export const initPublicJoinHandlers = () => {
    const chkPublicJoin = document.getElementById('chkJoinEnabled') as HTMLInputElement;
    const inputMax = document.getElementById('inputMaxParticipants') as HTMLInputElement;
    const inputTime = document.getElementById('inputTimeLimit') as HTMLInputElement;
    const btnReset = document.getElementById('btnResetGame');
    const btnShowQR = document.getElementById('btnShowQR');
    const cb = getCallbacks();

    // Nuevos controles de transmisión en vivo y redirección
    const chkLiveView = document.getElementById('chkLiveViewEnabled') as HTMLInputElement;
    const selectAfterAction = document.getElementById('selectAfterAction') as HTMLSelectElement;
    const inputPromoUrl = document.getElementById('inputPromoUrl') as HTMLInputElement;
    const divPromoUrl = document.getElementById('divPromoUrl') as HTMLDivElement;

    if (chkPublicJoin) {
        chkPublicJoin.checked = !!StateManager.config.publicJoinEnabled;
        chkPublicJoin.onchange = (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            StateManager.config.publicJoinEnabled = enabled;
            
            if (enabled && !StateManager.config.publicSessionId) {
                StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                StateManager.config.publicSpinsCount = 0;
                
                const timeLimit = parseInt(inputTime?.value || "0") || 0;
                StateManager.config.publicTimeLimit = timeLimit;
                if (timeLimit > 0) {
                    StateManager.config.publicSessionExpiry = Date.now() + timeLimit * 60 * 1000;
                } else {
                    StateManager.config.publicSessionExpiry = 0;
                }
            } else if (!enabled) {
                StateManager.config.publicSessionId = "";
                StateManager.config.publicSessionExpiry = 0;
                StateManager.config.publicSpinsCount = 0;
            }
            
            saveAndSyncToActiveGame();
            cb.updatePublicSessionStatusDisplay();
            
            if (enabled) {
                startSyncSpinPolling();
            } else {
                if (!StateManager.config.syncSpinEnabled) {
                    stopSyncSpinPolling();
                }
            }
        };
    }

    if (chkLiveView) {
        chkLiveView.checked = StateManager.config.publicLiveViewEnabled !== false;
        chkLiveView.onchange = (e) => {
            StateManager.config.publicLiveViewEnabled = (e.target as HTMLInputElement).checked;
            saveAndSyncToActiveGame();
        };
    }

    if (selectAfterAction) {
        selectAfterAction.value = StateManager.config.publicAfterAction || 'none';
        if (divPromoUrl) {
            divPromoUrl.style.display = selectAfterAction.value === 'promo' ? 'flex' : 'none';
        }
        selectAfterAction.onchange = (e) => {
            const val = (e.target as HTMLSelectElement).value as any;
            StateManager.config.publicAfterAction = val;
            saveAndSyncToActiveGame();
            if (divPromoUrl) {
                divPromoUrl.style.display = val === 'promo' ? 'flex' : 'none';
            }
        };
    }

    if (inputPromoUrl) {
        inputPromoUrl.value = StateManager.config.publicPromoUrl || '';
        inputPromoUrl.oninput = (e) => {
            StateManager.config.publicPromoUrl = (e.target as HTMLInputElement).value.trim();
            saveAndSyncToActiveGame();
        };
    }

    if (inputMax) {
        inputMax.value = (StateManager.config.publicMaxParticipants || 0).toString();
        inputMax.oninput = (e) => {
            StateManager.config.publicMaxParticipants = parseInt((e.target as HTMLInputElement).value) || 0;
            saveAndSyncToActiveGame();
            cb.updatePublicSessionStatusDisplay();
        };
    }

    if (inputTime) {
        inputTime.value = (StateManager.config.publicTimeLimit || 0).toString();
        inputTime.oninput = (e) => {
            const val = parseInt((e.target as HTMLInputElement).value) || 0;
            StateManager.config.publicTimeLimit = val;
            
            if (StateManager.config.publicJoinEnabled && StateManager.config.publicSessionId) {
                if (val > 0) {
                    StateManager.config.publicSessionExpiry = Date.now() + val * 60 * 1000;
                } else {
                    StateManager.config.publicSessionExpiry = 0;
                }
            }
            
            saveAndSyncToActiveGame();
            cb.updatePublicSessionStatusDisplay();
        };
    }

    const chkSyncSpin = document.getElementById('chkSyncSpinEnabled') as HTMLInputElement;
    if (chkSyncSpin) {
        chkSyncSpin.checked = !!StateManager.config.syncSpinEnabled;
        chkSyncSpin.onchange = (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            StateManager.config.syncSpinEnabled = enabled;
            saveAndSyncToActiveGame();
            
            if (enabled) {
                startSyncSpinPolling();
            } else {
                stopSyncSpinPolling();
            }
        };
    }

    const chkPublicSessionList = document.getElementById('chkLocalSessionListEnabled') as HTMLInputElement;
    if (chkPublicSessionList) {
        chkPublicSessionList.checked = !!StateManager.config.publicSessionListEnabled;
        chkPublicSessionList.onchange = (e) => {
            StateManager.config.publicSessionListEnabled = (e.target as HTMLInputElement).checked;
            saveAndSyncToActiveGame();
        };
    }

    const showPublicQR = () => {
        if (!StateManager.config.publicJoinEnabled) {
            return cb.showCustomAlert("POR FAVOR, ACTIVA EL MODO PÚBLICO / INVITADO ANTES DE GENERAR EL CÓDIGO QR.", "ATENCIÓN");
        }

        if (!StateManager.config.publicSessionId) {
            StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
            StateManager.config.publicSpinsCount = 0;
            saveAndSyncToActiveGame();
        }

        if (StateManager.config.publicTimeLimit && StateManager.config.publicTimeLimit > 0 && (!StateManager.config.publicSessionExpiry || StateManager.config.publicSessionExpiry <= Date.now())) {
            StateManager.config.publicSessionExpiry = Date.now() + StateManager.config.publicTimeLimit * 60 * 1000;
            saveAndSyncToActiveGame();
        }

        const adminEmail = sessionStorage.getItem('nexo_current_user_email') || "";
        const urlBase = window.location.href.split('?')[0];
        const prizesJSON = JSON.stringify(StateManager.config.prizes.map(p => p.name));
        const base64Prizes = btoa(unescape(encodeURIComponent(prizesJSON)));
        
        let query = `join=true`
            + `&admin=${encodeURIComponent(adminEmail)}`
            + `&session=${StateManager.config.publicSessionId}`
            + `&max=${StateManager.config.publicMaxParticipants || 0}`
            + `&expires=${StateManager.config.publicSessionExpiry || 0}`
            + `&reg=${StateManager.config.publicRegisterEnabled ? 'true' : 'false'}`
            + `&raffle=${StateManager.config.raffleMode ? 'true' : 'false'}`
            + `&theme=${StateManager.config.themeId}`;

        const themeData = StateManager.config.themeCustomizations?.[StateManager.config.themeId];
        if (themeData) {
            query += `&c1=${encodeURIComponent(themeData.primary)}`
                + `&c2=${encodeURIComponent(themeData.secondary)}`;
        }

        query += `&prizes=${base64Prizes}`;

        const joinUrl = `${urlBase}?${query}`;
        
        const qrTitle = document.getElementById('qrTitle');
        const qrMsg = document.getElementById('qrMessage');
        const modal = document.getElementById('modalQR');

        if (qrTitle) qrTitle.innerText = "ESCANEA Y JUEGA";
        if (qrMsg) qrMsg.innerText = "Escanea este código con tu teléfono móvil para registrarte y girar la ruleta en tu dispositivo.";
        
        const divLiveContainer = document.getElementById('divLiveViewLinkContainer');
        const inputLiveUrl = document.getElementById('inputLiveViewUrl') as HTMLInputElement;
        const btnCopyLive = document.getElementById('btnCopyLiveViewUrl');

        if (divLiveContainer) divLiveContainer.style.display = 'block';
        if (inputLiveUrl) inputLiveUrl.value = joinUrl;

        if (btnCopyLive) {
            btnCopyLive.onclick = () => {
                navigator.clipboard.writeText(joinUrl).then(() => {
                    const origText = btnCopyLive.innerHTML;
                    btnCopyLive.innerHTML = "¡COPIADO!";
                    setTimeout(() => { btnCopyLive.innerHTML = origText; }, 2000);
                });
            };
        }

        generateCustomizedQR(joinUrl).then(() => {
            if (modal) modal.style.display = 'flex';
        });
    };

    if (btnReset) {
        btnReset.onclick = () => {
            cb.showCustomConfirm("¿ESTÁS SEGURO DE REINICIAR EL JUEGO PÚBLICO? Esto invalidará la sesión anterior para todos los participantes.", () => {
                StateManager.config.publicSessionId = "sess_" + Date.now().toString();
                StateManager.config.publicSpinsCount = 0;
                
                const timeLimit = StateManager.config.publicTimeLimit || 0;
                if (timeLimit > 0) {
                    StateManager.config.publicSessionExpiry = Date.now() + timeLimit * 60 * 1000;
                } else {
                    StateManager.config.publicSessionExpiry = 0;
                }
                
                StateManager.save();
                cb.updatePublicSessionStatusDisplay();
                
                if (StateManager.config.publicJoinEnabled) {
                    showPublicQR();
                    cb.showCustomAlert("El juego público se ha reiniciado con éxito. Nueva sesión creada y código QR actualizado.", "JUEGO REINICIADO");
                } else {
                    cb.showCustomAlert("El juego público se ha reiniciado con éxito. Nueva sesión creada.", "JUEGO REINICIADO");
                }
            });
        };
    }

    if (btnShowQR) {
        btnShowQR.onclick = () => {
            showPublicQR();
        };
    }

    setupQRPersonalizationHandlers();
    cb.updatePublicSessionStatusDisplay();
};

export const startSyncSpinPolling = () => {
    if (syncIntervalId) clearInterval(syncIntervalId);
    
    if (!StateManager.config.syncSpinEnabled && !StateManager.config.publicJoinEnabled) return;

    const cb = getCallbacks();

    syncIntervalId = setInterval(async () => {
        const userEmail = sessionStorage.getItem('nexo_current_user_email');
        if (!userEmail) return; 

        try {
            const latestConfig = await cb.fetchConfigFromSupabase(userEmail);
            if (!latestConfig) return;

            let configChanged = false;

            if (JSON.stringify(latestConfig.winnersHistory) !== JSON.stringify(StateManager.config.winnersHistory)) {
                StateManager.config.winnersHistory = latestConfig.winnersHistory || [];
                configChanged = true;
            }

            if (JSON.stringify(StateManager.config.prizes) !== JSON.stringify(latestConfig.prizes)) {
                StateManager.config.prizes = latestConfig.prizes || [];
                configChanged = true;
            }

            if (latestConfig.publicSpinsCount !== undefined && latestConfig.publicSpinsCount !== StateManager.config.publicSpinsCount) {
                StateManager.config.publicSpinsCount = latestConfig.publicSpinsCount;
                configChanged = true;
            }

            if (configChanged) {
                StateManager.save();
                cb.renderLeadsList();
                if (!appWheel.isSpinning) {
                    appWheel.draw();
                }
            }

            if (StateManager.config.syncSpinEnabled && latestConfig.syncSpinState) {
                const state = latestConfig.syncSpinState;
                const lastProcessedTimestamp = parseInt(localStorage.getItem('nexo_last_processed_sync_spin') || '0');
                
                if (state.status === 'spinning' && state.timestamp > lastProcessedTimestamp) {
                    localStorage.setItem('nexo_last_processed_sync_spin', String(state.timestamp));
                    
                    if (!appWheel.isSpinning) {
                        appWheel.spin(state.winnerIdx, true);
                    }
                }
            }
        } catch (e) {
            console.error("Error en startSyncSpinPolling:", e);
        }
    }, 2000);
};

export const stopSyncSpinPolling = () => {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
};

export const initLightningJoinHandlers = () => {
    const chkJoin = document.getElementById('chkLightningJoinEnabled') as HTMLInputElement;
    const inputMax = document.getElementById('inputLightningMaxParticipants') as HTMLInputElement;
    const inputTime = document.getElementById('inputLightningTimeLimit') as HTMLInputElement;
    const btnReset = document.getElementById('btnResetLightningGame');
    const btnShowQR = document.getElementById('btnShowLightningQR');
    const cb = getCallbacks();

    const chkLiveView = document.getElementById('chkLightningLiveViewEnabled') as HTMLInputElement;
    const selectAfterAction = document.getElementById('selectLightningAfterAction') as HTMLSelectElement;
    const inputPromoUrl = document.getElementById('inputLightningPromoUrl') as HTMLInputElement;
    const divPromoUrl = document.getElementById('divLightningPromoUrl') as HTMLDivElement;

    const saveAndSyncToActiveGame = () => {
        let activeList = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
        if (activeList) {
            activeList.publicJoinEnabled = StateManager.config.publicJoinEnabled;
            activeList.publicRegisterEnabled = StateManager.config.publicRegisterEnabled;
            activeList.publicRemoveWinner = StateManager.config.publicRemoveWinner;
            activeList.publicSessionListEnabled = StateManager.config.publicSessionListEnabled;
            activeList.publicLiveViewEnabled = StateManager.config.publicLiveViewEnabled;
            activeList.publicAfterAction = StateManager.config.publicAfterAction;
            activeList.publicPromoUrl = StateManager.config.publicPromoUrl;
            activeList.publicMaxParticipants = StateManager.config.publicMaxParticipants;
            activeList.publicTimeLimit = StateManager.config.publicTimeLimit;
            activeList.syncSpinEnabled = StateManager.config.syncSpinEnabled;
            
            // Sincronizar alias para reporte local
            activeList.localRequireRegister = activeList.publicRegisterEnabled;
            activeList.autoRemoveWinner = activeList.publicRemoveWinner;
            activeList.localSessionListEnabled = activeList.publicSessionListEnabled;
            
            activeList.publicSessionId = StateManager.config.publicSessionId || "";
            activeList.publicSessionExpiry = StateManager.config.publicSessionExpiry || 0;
            activeList.publicSpinsCount = StateManager.config.publicSpinsCount || 0;
        }
        StateManager.save();
    };

    if (chkJoin) {
        chkJoin.checked = !!StateManager.config.publicJoinEnabled;
        chkJoin.onchange = (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            StateManager.config.publicJoinEnabled = enabled;
            
            if (enabled && !StateManager.config.publicSessionId) {
                StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                StateManager.config.publicSpinsCount = 0;
                
                const timeLimit = parseInt(inputTime?.value || "3") || 3;
                StateManager.config.publicTimeLimit = timeLimit;
                if (timeLimit > 0) {
                    StateManager.config.publicSessionExpiry = Date.now() + timeLimit * 60 * 1000;
                } else {
                    StateManager.config.publicSessionExpiry = 0;
                }
            } else if (!enabled) {
                StateManager.config.publicSessionId = "";
                StateManager.config.publicSessionExpiry = 0;
                StateManager.config.publicSpinsCount = 0;
            }
            
            saveAndSyncToActiveGame();
            cb.updateLightningSessionStatusDisplay();
            
            if (enabled) {
                startSyncSpinPolling();
            } else {
                if (!StateManager.config.syncSpinEnabled) {
                    stopSyncSpinPolling();
                }
            }
        };
    }

    if (chkLiveView) {
        chkLiveView.checked = StateManager.config.publicLiveViewEnabled !== false;
        chkLiveView.onchange = (e) => {
            StateManager.config.publicLiveViewEnabled = (e.target as HTMLInputElement).checked;
            saveAndSyncToActiveGame();
        };
    }

    if (selectAfterAction) {
        selectAfterAction.value = StateManager.config.publicAfterAction || 'none';
        if (divPromoUrl) {
            divPromoUrl.style.display = selectAfterAction.value === 'promo' ? 'flex' : 'none';
        }
        selectAfterAction.onchange = (e) => {
            const val = (e.target as HTMLSelectElement).value as any;
            StateManager.config.publicAfterAction = val;
            saveAndSyncToActiveGame();
            if (divPromoUrl) {
                divPromoUrl.style.display = val === 'promo' ? 'flex' : 'none';
            }
        };
    }

    if (inputPromoUrl) {
        inputPromoUrl.value = StateManager.config.publicPromoUrl || '';
        inputPromoUrl.oninput = (e) => {
            StateManager.config.publicPromoUrl = (e.target as HTMLInputElement).value.trim();
            saveAndSyncToActiveGame();
        };
    }

    if (inputMax) {
        inputMax.value = (StateManager.config.publicMaxParticipants || 0).toString();
        inputMax.oninput = (e) => {
            StateManager.config.publicMaxParticipants = parseInt((e.target as HTMLInputElement).value) || 0;
            saveAndSyncToActiveGame();
            cb.updateLightningSessionStatusDisplay();
        };
    }

    if (inputTime) {
        inputTime.value = (StateManager.config.publicTimeLimit || 3).toString();
        inputTime.oninput = (e) => {
            const val = parseInt((e.target as HTMLInputElement).value) || 0;
            StateManager.config.publicTimeLimit = val;
            
            if (StateManager.config.publicJoinEnabled && StateManager.config.publicSessionId) {
                if (val > 0) {
                    StateManager.config.publicSessionExpiry = Date.now() + val * 60 * 1000;
                } else {
                    StateManager.config.publicSessionExpiry = 0;
                }
            }
            
            saveAndSyncToActiveGame();
            cb.updateLightningSessionStatusDisplay();
            
            // Sync on-screen countdown timer display if active
            if ((window as any).resetLightningTimer) {
                (window as any).resetLightningTimer();
            }
        };
    }

    const chkSyncSpin = document.getElementById('chkLightningSyncSpinEnabled') as HTMLInputElement;
    if (chkSyncSpin) {
        chkSyncSpin.checked = !!StateManager.config.syncSpinEnabled;
        chkSyncSpin.onchange = (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            StateManager.config.syncSpinEnabled = enabled;
            saveAndSyncToActiveGame();
            
            if (enabled) {
                startSyncSpinPolling();
            } else {
                stopSyncSpinPolling();
            }
        };
    }

    const chkPublicSessionList = document.getElementById('chkLightningSessionListEnabled') as HTMLInputElement;
    if (chkPublicSessionList) {
        chkPublicSessionList.checked = !!StateManager.config.publicSessionListEnabled;
        chkPublicSessionList.onchange = (e) => {
            StateManager.config.publicSessionListEnabled = (e.target as HTMLInputElement).checked;
            saveAndSyncToActiveGame();
        };
    }

    const showPublicQR = () => {
        if (!StateManager.config.publicJoinEnabled) {
            return cb.showCustomAlert("POR FAVOR, ACTIVA EL MODO PÚBLICO / INVITADO ANTES DE GENERAR EL CÓDIGO QR.", "ATENCIÓN");
        }

        if (!StateManager.config.publicSessionId) {
            StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
            StateManager.config.publicSpinsCount = 0;
            saveAndSyncToActiveGame();
        }

        if (StateManager.config.publicTimeLimit && StateManager.config.publicTimeLimit > 0 && (!StateManager.config.publicSessionExpiry || StateManager.config.publicSessionExpiry <= Date.now())) {
            StateManager.config.publicSessionExpiry = Date.now() + StateManager.config.publicTimeLimit * 60 * 1000;
            saveAndSyncToActiveGame();
        }

        const adminEmail = sessionStorage.getItem('nexo_current_user_email') || "";
        const urlBase = window.location.href.split('?')[0];
        const prizesJSON = JSON.stringify(StateManager.config.prizes.map(p => p.name));
        const base64Prizes = btoa(unescape(encodeURIComponent(prizesJSON)));
        
        let query = `join=true`
            + `&admin=${encodeURIComponent(adminEmail)}`
            + `&session=${StateManager.config.publicSessionId}`
            + `&max=${StateManager.config.publicMaxParticipants || 0}`
            + `&expires=${StateManager.config.publicSessionExpiry || 0}`
            + `&reg=${StateManager.config.publicRegisterEnabled ? 'true' : 'false'}`
            + `&raffle=${StateManager.config.raffleMode ? 'true' : 'false'}`
            + `&theme=${StateManager.config.themeId}`;

        const themeData = StateManager.config.themeCustomizations?.[StateManager.config.themeId];
        if (themeData) {
            query += `&c1=${encodeURIComponent(themeData.primary)}`
                + `&c2=${encodeURIComponent(themeData.secondary)}`;
        }

        query += `&prizes=${base64Prizes}`;

        const joinUrl = `${urlBase}?${query}`;
        
        const qrTitle = document.getElementById('qrTitle');
        const qrMsg = document.getElementById('qrMessage');
        const modal = document.getElementById('modalQR');

        if (qrTitle) qrTitle.innerText = "⚡ JUEGO RELÁMPAGO QR ⚡";
        if (qrMsg) qrMsg.innerText = "Escanea este código con tu teléfono móvil para registrarte y girar la ruleta en tu dispositivo durante este Juego Relámpago.";
        
        const divLiveContainer = document.getElementById('divLiveViewLinkContainer');
        const inputLiveUrl = document.getElementById('inputLiveViewUrl') as HTMLInputElement;
        const btnCopyLive = document.getElementById('btnCopyLiveViewUrl');

        if (divLiveContainer) divLiveContainer.style.display = 'block';
        if (inputLiveUrl) inputLiveUrl.value = joinUrl;

        if (btnCopyLive) {
            btnCopyLive.onclick = () => {
                navigator.clipboard.writeText(joinUrl).then(() => {
                    const origText = btnCopyLive.innerHTML;
                    btnCopyLive.innerHTML = "¡COPIADO!";
                    setTimeout(() => { btnCopyLive.innerHTML = origText; }, 2000);
                });
            };
        }

        generateCustomizedQR(joinUrl).then(() => {
            if (modal) modal.style.display = 'flex';
        });
    };

    if (btnReset) {
        btnReset.onclick = () => {
            cb.showCustomConfirm("¿ESTÁS SEGURO DE REINICIAR EL JUEGO RELÁMPAGO? Esto invalidará la sesión anterior para todos los participantes.", () => {
                StateManager.config.publicSessionId = "sess_" + Date.now().toString();
                StateManager.config.publicSpinsCount = 0;
                
                const timeLimit = StateManager.config.publicTimeLimit || 3;
                if (timeLimit > 0) {
                    StateManager.config.publicSessionExpiry = Date.now() + timeLimit * 60 * 1000;
                } else {
                    StateManager.config.publicSessionExpiry = 0;
                }
                
                StateManager.save();
                cb.updateLightningSessionStatusDisplay();
                
                if (StateManager.config.publicJoinEnabled) {
                    showPublicQR();
                    cb.showCustomAlert("El juego relámpago se ha reiniciado con éxito. Nueva sesión creada y código QR actualizado.", "JUEGO REINICIADO");
                } else {
                    cb.showCustomAlert("El juego relámpago se ha reiniciado con éxito. Nueva sesión creada.", "JUEGO REINICIADO");
                }
            });
        };
    }

    if (btnShowQR) {
        btnShowQR.onclick = () => {
            showPublicQR();
        };
    }

    cb.updateLightningSessionStatusDisplay();
};

export const initEstandarJoinHandlers = () => {
    const chkJoin = document.getElementById('chkEstandarJoinEnabled') as HTMLInputElement;
    const btnShowQR = document.getElementById('btnShowEstandarQR');
    const cb = getCallbacks();

    if (chkJoin) {
        let estandarGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_juego_estandar");
        if (estandarGame) {
            chkJoin.checked = !!estandarGame.publicJoinEnabled;
            const divEstandarQR = document.getElementById('divEstandarQRContainer') as HTMLDivElement;
            if (divEstandarQR) {
                divEstandarQR.style.display = estandarGame.publicJoinEnabled ? "block" : "none";
            }
        }
        
        chkJoin.onchange = (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            
            let estandarGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_juego_estandar");
            if (estandarGame) {
                estandarGame.publicJoinEnabled = enabled;
                
                if (enabled && !estandarGame.publicSessionId) {
                    estandarGame.publicSessionId = "sess_estandar_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                    estandarGame.publicSpinsCount = 0;
                }
                
                const isActive = StateManager.config.activeSavedListId === estandarGame.id;
                if (isActive) {
                    StateManager.config.publicJoinEnabled = enabled;
                    StateManager.config.publicSessionId = estandarGame.publicSessionId || "";
                    StateManager.config.publicSpinsCount = estandarGame.publicSpinsCount || 0;
                }
            }
            
            const divEstandarQR = document.getElementById('divEstandarQRContainer') as HTMLDivElement;
            if (divEstandarQR) {
                divEstandarQR.style.display = enabled ? "block" : "none";
            }
            
            StateManager.save();
        };
    }

    if (btnShowQR) {
        btnShowQR.onclick = () => {
            showEstandarQR();
        };
    }
};

export const showEstandarQR = () => {
    let estandarGame = StateManager.config.savedPrizeLists?.find((l: any) => l.id === "list_juego_estandar");
    if (!estandarGame) {
        return;
    }

    const cb = getCallbacks();

    if (!estandarGame.publicJoinEnabled) {
        return cb.showCustomAlert("POR FAVOR, ACTIVA LA PARTICIPACIÓN REMOTA QR ANTES DE GENERAR EL CÓDIGO QR.", "ATENCIÓN");
    }

    if (!estandarGame.publicSessionId) {
        estandarGame.publicSessionId = "sess_estandar_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
        StateManager.save();
    }

    const adminEmail = sessionStorage.getItem('nexo_current_user_email') || "";
    const urlBase = window.location.href.split('?')[0];
    const prizesJSON = JSON.stringify((estandarGame.prizes || []).map((p: any) => p.name));
    const base64Prizes = btoa(unescape(encodeURIComponent(prizesJSON)));
    
    let query = `join=true`
        + `&admin=${encodeURIComponent(adminEmail)}`
        + `&session=${estandarGame.publicSessionId}`
        + `&max=0`
        + `&expires=0`
        + `&reg=${estandarGame.localRequireRegister ? 'true' : 'false'}`
        + `&raffle=false`
        + `&theme=${StateManager.config.themeId}`;

    const themeData = StateManager.config.themeCustomizations?.[StateManager.config.themeId];
    if (themeData) {
        query += `&c1=${encodeURIComponent(themeData.primary)}`
            + `&c2=${encodeURIComponent(themeData.secondary)}`;
    }

    query += `&prizes=${base64Prizes}`;

    const joinUrl = `${urlBase}?${query}`;
    
    const qrTitle = document.getElementById('qrTitle');
    const qrMsg = document.getElementById('qrMessage');
    const modal = document.getElementById('modalQR');

    if (qrTitle) qrTitle.innerText = "ESCANEA Y JUEGA";
    if (qrMsg) qrMsg.innerText = "Escanea este código con tu teléfono móvil para registrarte y girar la ruleta en tu dispositivo.";
    
    const divLiveContainer = document.getElementById('divLiveViewLinkContainer');
    const inputLiveUrl = document.getElementById('inputLiveViewUrl') as HTMLInputElement;
    const btnCopyLive = document.getElementById('btnCopyLiveViewUrl');

    if (divLiveContainer) divLiveContainer.style.display = 'block';
    if (inputLiveUrl) inputLiveUrl.value = joinUrl;

    if (btnCopyLive) {
        btnCopyLive.onclick = () => {
            navigator.clipboard.writeText(joinUrl).then(() => {
                const origText = btnCopyLive.innerHTML;
                btnCopyLive.innerHTML = "¡COPIADO!";
                setTimeout(() => { btnCopyLive.innerHTML = origText; }, 2000);
            });
        };
    }

    generateCustomizedQR(joinUrl).then(() => {
        if (modal) modal.style.display = 'flex';
    });
};

export const initLeadsJoinHandlers = () => {
    const chkJoin = document.getElementById('chkLeadsJoinEnabled') as HTMLInputElement;
    const btnShowQR = document.getElementById('btnShowLeadsQR');
    const cb = getCallbacks();

    if (chkJoin) {
        let leadsGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_leads_default");
        if (leadsGame) {
            chkJoin.checked = !!leadsGame.publicJoinEnabled;
            const divLeadsQR = document.getElementById('divLeadsQRContainer') as HTMLDivElement;
            if (divLeadsQR) {
                divLeadsQR.style.display = leadsGame.publicJoinEnabled ? "block" : "none";
            }
        }
        
        chkJoin.onchange = (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            
            let leadsGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_leads_default");
            if (leadsGame) {
                leadsGame.publicJoinEnabled = enabled;
                
                if (enabled && !leadsGame.publicSessionId) {
                    leadsGame.publicSessionId = "sess_leads_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                    leadsGame.publicSpinsCount = 0;
                }
                
                const isActive = StateManager.config.activeSavedListId === leadsGame.id;
                if (isActive) {
                    StateManager.config.publicJoinEnabled = enabled;
                    StateManager.config.publicSessionId = leadsGame.publicSessionId || "";
                    StateManager.config.publicSpinsCount = leadsGame.publicSpinsCount || 0;
                }
            }
            
            const divLeadsQR = document.getElementById('divLeadsQRContainer') as HTMLDivElement;
            if (divLeadsQR) {
                divLeadsQR.style.display = enabled ? "block" : "none";
            }
            
            StateManager.save();
        };
    }

    if (btnShowQR) {
        btnShowQR.onclick = () => {
            showLeadsQR();
        };
    }
};

export const showLeadsQR = () => {
    let leadsGame = StateManager.config.savedPrizeLists?.find((l: any) => l.id === "list_leads_default");
    if (!leadsGame) {
        return;
    }

    const cb = getCallbacks();

    if (!leadsGame.publicJoinEnabled) {
        return cb.showCustomAlert("POR FAVOR, ACTIVA LA PARTICIPACIÓN REMOTA QR ANTES DE GENERAR EL CÓDIGO QR.", "ATENCIÓN");
    }

    if (!leadsGame.publicSessionId) {
        leadsGame.publicSessionId = "sess_leads_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
        StateManager.save();
    }

    const adminEmail = sessionStorage.getItem('nexo_current_user_email') || "";
    const urlBase = window.location.href.split('?')[0];
    const prizesJSON = JSON.stringify((leadsGame.prizes || []).map((p: any) => p.name));
    const base64Prizes = btoa(unescape(encodeURIComponent(prizesJSON)));
    
    let query = `join=true`
        + `&admin=${encodeURIComponent(adminEmail)}`
        + `&session=${leadsGame.publicSessionId}`
        + `&max=0`
        + `&expires=0`
        + `&reg=${leadsGame.localRequireRegister ? 'true' : 'false'}`
        + `&raffle=false`
        + `&theme=${StateManager.config.themeId}`;

    const themeData = StateManager.config.themeCustomizations?.[StateManager.config.themeId];
    if (themeData) {
        query += `&c1=${encodeURIComponent(themeData.primary)}`
            + `&c2=${encodeURIComponent(themeData.secondary)}`;
    }

    query += `&prizes=${base64Prizes}`;

    const joinUrl = `${urlBase}?${query}`;
    
    const qrTitle = document.getElementById('qrTitle');
    const qrMsg = document.getElementById('qrMessage');
    const modal = document.getElementById('modalQR');

    if (qrTitle) qrTitle.innerText = "ESCANEA Y JUEGA";
    if (qrMsg) qrMsg.innerText = "Escanea este código con tu teléfono móvil para registrarte y girar la ruleta en tu dispositivo.";
    
    // Configurar y mostrar enlace en vivo
    const liveQuery = `live=true`
        + `&admin=${encodeURIComponent(adminEmail)}`
        + `&session=${leadsGame.publicSessionId}`
        + `&theme=${StateManager.config.themeId}`;
    const liveViewUrl = `${urlBase}?${liveQuery}`;

    const divLiveContainer = document.getElementById('divLiveViewLinkContainer');
    const inputLiveUrl = document.getElementById('inputLiveViewUrl') as HTMLInputElement;
    const btnCopyLive = document.getElementById('btnCopyLiveViewUrl');

    if (divLiveContainer) divLiveContainer.style.display = 'block';
    if (inputLiveUrl) inputLiveUrl.value = liveViewUrl;

    if (btnCopyLive) {
        btnCopyLive.onclick = () => {
            navigator.clipboard.writeText(liveViewUrl).then(() => {
                const origText = btnCopyLive.innerHTML;
                btnCopyLive.innerHTML = "¡COPIADO!";
                setTimeout(() => { btnCopyLive.innerHTML = origText; }, 2000);
            });
        };
    }

    generateCustomizedQR(joinUrl).then(() => {
        if (modal) modal.style.display = 'flex';
    });
};

export const initRaffleJoinHandlers = () => {
    const chkJoin = document.getElementById('chkRaffleJoinEnabled') as HTMLInputElement;
    const btnShowQR = document.getElementById('btnShowRaffleQR');
    const cb = getCallbacks();

    if (chkJoin) {
        let raffleGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_raffle_default");
        if (raffleGame) {
            chkJoin.checked = !!raffleGame.publicJoinEnabled;
            const divRaffleQR = document.getElementById('divRaffleQRContainer') as HTMLDivElement;
            if (divRaffleQR) {
                divRaffleQR.style.display = raffleGame.publicJoinEnabled ? "block" : "none";
            }
        }
        
        chkJoin.onchange = (e) => {
            const enabled = (e.target as HTMLInputElement).checked;
            
            let raffleGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_raffle_default");
            if (raffleGame) {
                raffleGame.publicJoinEnabled = enabled;
                
                if (enabled && !raffleGame.publicSessionId) {
                    raffleGame.publicSessionId = "sess_raffle_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                    raffleGame.publicSpinsCount = 0;
                }
                
                const isActive = StateManager.config.activeSavedListId === raffleGame.id;
                if (isActive) {
                    StateManager.config.publicJoinEnabled = enabled;
                    StateManager.config.publicSessionId = raffleGame.publicSessionId || "";
                    StateManager.config.publicSpinsCount = raffleGame.publicSpinsCount || 0;
                }
            }
            
            const divRaffleQR = document.getElementById('divRaffleQRContainer') as HTMLDivElement;
            if (divRaffleQR) {
                divRaffleQR.style.display = enabled ? "block" : "none";
            }
            
            StateManager.save();
        };
    }

    if (btnShowQR) {
        btnShowQR.onclick = () => {
            showRaffleQR();
        };
    }
};

export const showRaffleQR = () => {
    let raffleGame = StateManager.config.savedPrizeLists?.find((l: any) => l.id === "list_raffle_default");
    if (!raffleGame) {
        return;
    }

    const cb = getCallbacks();

    if (!raffleGame.publicJoinEnabled) {
        return cb.showCustomAlert("POR FAVOR, ACTIVA LA PARTICIPACIÓN REMOTA QR ANTES DE GENERAR EL CÓDIGO QR.", "ATENCIÓN");
    }

    if (!raffleGame.publicSessionId) {
        raffleGame.publicSessionId = "sess_raffle_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
        StateManager.save();
    }

    const adminEmail = sessionStorage.getItem('nexo_current_user_email') || "";
    const urlBase = window.location.href.split('?')[0];
    const prizesJSON = JSON.stringify((raffleGame.prizes || []).map((p: any) => p.name));
    const base64Prizes = btoa(unescape(encodeURIComponent(prizesJSON)));
    
    let query = `join=true`
        + `&admin=${encodeURIComponent(adminEmail)}`
        + `&session=${raffleGame.publicSessionId}`
        + `&max=0`
        + `&expires=0`
        + `&reg=true`
        + `&raffle=true`
        + `&theme=${StateManager.config.themeId}`;

    const themeData = StateManager.config.themeCustomizations?.[StateManager.config.themeId];
    if (themeData) {
        query += `&c1=${encodeURIComponent(themeData.primary)}`
            + `&c2=${encodeURIComponent(themeData.secondary)}`;
    }

    query += `&prizes=${base64Prizes}`;

    const joinUrl = `${urlBase}?${query}`;
    
    const qrTitle = document.getElementById('qrTitle');
    const qrMsg = document.getElementById('qrMessage');
    const modal = document.getElementById('modalQR');

    if (qrTitle) qrTitle.innerText = "REGÍSTRATE Y PARTICIPAR";
    if (qrMsg) qrMsg.innerText = "Escanea este código con tu teléfono móvil para registrarte en el sorteo. ¡Tu nombre aparecerá en la ruleta!";
    
    // Configurar y mostrar enlace en vivo
    const liveQuery = `live=true`
        + `&admin=${encodeURIComponent(adminEmail)}`
        + `&session=${raffleGame.publicSessionId}`
        + `&theme=${StateManager.config.themeId}`;
    const liveViewUrl = `${urlBase}?${liveQuery}`;

    const divLiveContainer = document.getElementById('divLiveViewLinkContainer');
    const inputLiveUrl = document.getElementById('inputLiveViewUrl') as HTMLInputElement;
    const btnCopyLive = document.getElementById('btnCopyLiveViewUrl');

    if (divLiveContainer) divLiveContainer.style.display = 'block';
    if (inputLiveUrl) inputLiveUrl.value = liveViewUrl;

    if (btnCopyLive) {
        btnCopyLive.onclick = () => {
            navigator.clipboard.writeText(liveViewUrl).then(() => {
                const origText = btnCopyLive.innerHTML;
                btnCopyLive.innerHTML = "¡COPIADO!";
                setTimeout(() => { btnCopyLive.innerHTML = origText; }, 2000);
            });
        };
    }

    generateCustomizedQR(joinUrl).then(() => {
        if (modal) modal.style.display = 'flex';
    });
};

