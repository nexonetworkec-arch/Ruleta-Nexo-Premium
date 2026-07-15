/**
 * Ruleta Nexo Premium - Enterprise View Controller
 * Arquitectura MVC Desacoplada: Seguridad, Estado y Lógica inyectados dinámicamente.
 */

import { INITIAL_DEFAULT_CONFIG, THEME_PRESETS, DEFAULT_LICENSE, UserAccount, LeadData, WinnerEntry, Prize } from './config';
import { Security, StateManager } from './core';
import { isSupabaseConfigured, fetchUsersFromSupabase, syncUserToSupabase, syncConfigToSupabase, fetchConfigFromSupabase, testSupabaseConnection, registerWithSupabaseAuth, loginWithSupabaseAuth, logoutWithSupabaseAuth, activateLicenseOnline, checkLicenseStatusOnline, fetchLicensesFromSupabase, createLicenseInSupabase, toggleLicenseInSupabase, deleteLicenseFromSupabase, checkIfSuperAdmin, subscribeToConfigChanges, unsubscribeFromConfigChanges, subscribeToMediaChanges, unsubscribeFromMediaChanges, Sorteo, syncSorteoToSupabase, fetchSorteosFromSupabase, deleteSorteoFromSupabase, updateSorteoSpinState, subscribeToSorteoChanges, updateSorteoTimerState, fetchMediaFromSupabase, saveLeadToSupabase } from './supabase';
import { compressImage, debounce, triggerDownload } from './utils';
import { appWheel } from './engine';
import QRCode from 'qrcode';
import { NexoAuditLog, NexoStorageMonitor, NexoLeadsList, NexoLeadsPanel, NexoGameStats, NexoRafflePanel, NexoGameBoard, NexoBoardControls, NexoWinnerCard, NexoWinnerHeader, NexoWinnerStatus, NexoWinnerFieldRow, NexoWinnerFields, NexoWinnerActions, NexoCongratsCard, NexoCongratsHeader, NexoCongratsDisplay, NexoCongratsClaim, NexoCongratsActions, NexoSuperAdmin } from './ui';

// Import Fragmented Services, Controllers, and Views
import { addAuditEntry as serviceAddAuditEntry, optimizeStorage as serviceOptimizeStorage } from './services/auditService';
import { exportCSVFunction as serviceExportCSV, exportTXTFunction as serviceExportTXT, exportIMGFunction as serviceExportIMG } from './services/exportService';
import { handleLicenseActivation as serviceHandleLicenseActivation, verifyGlobalLicense as serviceVerifyGlobalLicense } from './services/licenseService';
import { togglePassword as authTogglePassword, handleLogout as authHandleLogout, setAuthCallbacks, initAuthHandlers as controllerInitAuthHandlers, authController } from './controllers/authController';
import { renderFormFieldsEditor as viewRenderFormFieldsEditor, updateFormField, removeFormField, renderDynamicRegistrationForm as viewRenderDynamicRegistrationForm } from './views/formEditorView';
import { observabilityEngine, NexoObservabilityPanel } from './observability/observabilityEngine';
import { initSuperAdminHandlers, registerSuperAdminGlobals } from './controllers/superAdminController';
import { SistemaController } from './controllers/sistemaController';
import {
    setPublicidadCallbacks,
    showAdHomeModal,
    resetInactivityTimer,
    setupInactivityEvents,
    showQrModal,
    initPublicidadHandlers,
    initSidePersistentAdHandlers,
    renderAdSidePersistentList,
    startSideAdEngine,
    renderAdBannersList,
    startBannersEngine,
    showAppMain
} from './controllers/publicidadController';
import {
    isGuestMode,
    isLiveViewMode,
    guestSessionId,
    guestMaxParticipants,
    guestSessionExpiry,
    guestRegistrationRequired,
    guestRaffleMode,
    liveAdminEmail,
    liveSessionId,
    liveViewIntervalId,
    setGuestCallbacks,
    showGuestBlockScreen,
    triggerGuestSpin,
    openGuestRegistrationModal,
    startLiveViewPolling,
    initLiveViewMode,
    initGuestParticipation,
    initEmbedMode
} from './controllers/guestController';
import {
    setQRCallbacks,
    generateCustomizedQR,
    generateQRCard,
    setupQRPersonalizationHandlers,
    initPublicJoinHandlers,
    initLightningJoinHandlers,
    initEstandarJoinHandlers,
    showEstandarQR,
    initLeadsJoinHandlers,
    showLeadsQR,
    initRaffleJoinHandlers,
    showRaffleQR,
    startSyncSpinPolling,
    stopSyncSpinPolling
} from './controllers/qrController';

import { timerController } from './controllers/timerController';
import { spinController } from './controllers/spinController';
import { menuController } from './controllers/menuController';
import { fullscreenController } from './controllers/fullscreenController';
import { leadsController } from './controllers/leadsController';
import { perfilController, setPerfilCallbacks } from './controllers/perfilController';
import { TabStateManager, setTabStateCallbacks } from './controllers/tabStateManager';

// Register Enterprise Custom Web Components (Reactive & Offline-First)
if (!customElements.get('nexo-audit-log')) customElements.define('nexo-audit-log', NexoAuditLog);
if (!customElements.get('nexo-storage-monitor')) customElements.define('nexo-storage-monitor', NexoStorageMonitor);
if (!customElements.get('nexo-leads-list')) customElements.define('nexo-leads-list', NexoLeadsList);
if (!customElements.get('nexo-winner-card')) customElements.define('nexo-winner-card', NexoWinnerCard);
if (!customElements.get('nexo-winner-header')) customElements.define('nexo-winner-header', NexoWinnerHeader);
if (!customElements.get('nexo-winner-status')) customElements.define('nexo-winner-status', NexoWinnerStatus);
if (!customElements.get('nexo-winner-field-row')) customElements.define('nexo-winner-field-row', NexoWinnerFieldRow);
if (!customElements.get('nexo-winner-fields')) customElements.define('nexo-winner-fields', NexoWinnerFields);
if (!customElements.get('nexo-winner-actions')) customElements.define('nexo-winner-actions', NexoWinnerActions);
if (!customElements.get('nexo-congrats-card')) customElements.define('nexo-congrats-card', NexoCongratsCard);
if (!customElements.get('nexo-congrats-header')) customElements.define('nexo-congrats-header', NexoCongratsHeader);
if (!customElements.get('nexo-congrats-display')) customElements.define('nexo-congrats-display', NexoCongratsDisplay);
if (!customElements.get('nexo-congrats-claim')) customElements.define('nexo-congrats-claim', NexoCongratsClaim);
if (!customElements.get('nexo-congrats-actions')) customElements.define('nexo-congrats-actions', NexoCongratsActions);
if (!customElements.get('nexo-leads-panel')) customElements.define('nexo-leads-panel', NexoLeadsPanel);
if (!customElements.get('nexo-game-stats')) customElements.define('nexo-game-stats', NexoGameStats);
if (!customElements.get('nexo-super-admin')) customElements.define('nexo-super-admin', NexoSuperAdmin);
if (!customElements.get('nexo-observability-panel')) customElements.define('nexo-observability-panel', NexoObservabilityPanel);
if (!customElements.get('nexo-raffle-panel')) customElements.define('nexo-raffle-panel', NexoRafflePanel);
if (!customElements.get('nexo-game-board')) customElements.define('nexo-game-board', NexoGameBoard);
if (!customElements.get('nexo-board-controls')) customElements.define('nexo-board-controls', NexoBoardControls);

const dispatchStateChange = () => {
    window.dispatchEvent(new CustomEvent('nexo-state-change'));
};

// UI State globals
let pendingEntryIndex: number | null = null;
let currentAuthCallback: (() => void) | null = null;
let hasRegisteredLocally = false;
let pendingLocalLead: LeadData | null = null;

// Variables de estado del Temporizador del Juego Relámpago
let lightningTimeRemaining = 180; // Default a 3 minutos en segundos
let isLightningTimerRunning = false;
let electricArcsInterval: any = null;
let lightningEffectsActive = false;

const syncTimerStateToSupabase = async () => {
    if (!isSupabaseConfigured) return;
    const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
    console.log(`[Timer Sync] Enviando estado a Supabase para ${activeId}: remaining=${lightningTimeRemaining}, running=${isLightningTimerRunning}, schedule=${lightningScheduleTime}`);
    
    const timerState = {
        time_remaining: lightningTimeRemaining,
        is_running: isLightningTimerRunning,
        timestamp: Date.now().toString(),
        schedule_time: lightningScheduleTime
    };
    
    await updateSorteoTimerState(activeId, timerState);
};

// Variables de programación del Juego Relámpago
let lightningScheduleTime: number | null = null;
let lightningScheduleInterval: any = null;

// Configuración de Suscripción de Eventos en el controlador de tiempo (Totalmente desacoplado y reactivo)
timerController.on('tick', (remaining) => {
    lightningTimeRemaining = remaining;
    updateLightningTimerDisplay();

    const el = document.getElementById('timerDisplay');
    const elAdmin = document.getElementById('timerDisplayAdmin');
    const suspenseOverlay = document.getElementById('suspenseOverlay');
    
    [el, elAdmin].forEach(item => {
        if (item) {
            if (remaining <= 5) {
                item.classList.add('timer-danger');
                item.classList.remove('timer-warning');
            } else if (remaining <= 15) {
                item.classList.add('timer-warning');
                item.classList.remove('timer-danger');
            } else {
                item.classList.remove('timer-warning', 'timer-danger');
                item.style.color = '#fff';
                item.style.textShadow = '0 0 10px var(--gold)';
            }
        }
    });

    if (remaining <= 15 && remaining > 0) {
        startLightningVisualEffects();
    } else {
        if (remaining > 15) {
            stopLightningVisualEffects();
        }
    }

    if (remaining <= 5 && remaining > 0) {
        document.body.classList.add('screen-shake-active');
        const wrapper = document.querySelector('.wheel-wrapper');
        if (wrapper) {
            wrapper.classList.add('wheel-heartbeat');
        }

        if (appWheel && appWheel.audio) {
            appWheel.audio.playSuspenseHeartbeat(true);
        }
        if (suspenseOverlay) {
            suspenseOverlay.style.display = 'block';
            suspenseOverlay.className = 'vignette-suspense';
        }
    } else if (remaining <= 15 && remaining > 0) {
        if (remaining % 2 === 0 && appWheel && appWheel.audio) {
            appWheel.audio.playSuspenseHeartbeat(false);
        }
        if (suspenseOverlay) {
            suspenseOverlay.style.display = 'none';
            suspenseOverlay.className = '';
        }
    } else {
        if (suspenseOverlay) {
            suspenseOverlay.style.display = 'none';
            suspenseOverlay.className = '';
        }
    }
});

timerController.on('start', (remaining) => {
    isLightningTimerRunning = true;
    syncTimerStateToSupabase();
    syncTimerButtonsUI();
});

timerController.on('stop', (remaining) => {
    isLightningTimerRunning = false;
    stopLightningVisualEffects();
    
    const el = document.getElementById('timerDisplay');
    const elAdmin = document.getElementById('timerDisplayAdmin');
    const suspenseOverlay = document.getElementById('suspenseOverlay');
    [el, elAdmin].forEach(item => {
        if (item) {
            item.classList.remove('timer-warning', 'timer-danger');
            item.style.color = '#fff';
            item.style.textShadow = '0 0 10px var(--gold)';
        }
    });
    if (suspenseOverlay) {
        suspenseOverlay.style.display = 'none';
        suspenseOverlay.className = '';
    }
    
    syncTimerStateToSupabase();
    syncTimerButtonsUI();
});

timerController.on('reset', (remaining) => {
    stopLightningVisualEffects();
    const el = document.getElementById('timerDisplay');
    const elAdmin = document.getElementById('timerDisplayAdmin');
    [el, elAdmin].forEach(item => {
        if (item) {
            item.style.color = '#fff';
            item.style.textShadow = '0 0 10px var(--gold)';
            item.classList.remove('timer-warning', 'timer-danger');
        }
    });
    syncTimerStateToSupabase();
    syncTimerButtonsUI();
});

timerController.on('expire', () => {
    stopLightningVisualEffects();
    
    const el = document.getElementById('timerDisplay');
    const elAdmin = document.getElementById('timerDisplayAdmin');
    const suspenseOverlay = document.getElementById('suspenseOverlay');
    [el, elAdmin].forEach(item => {
        if (item) {
            item.classList.remove('timer-warning', 'timer-danger');
            item.style.color = '#fff';
            item.style.textShadow = '0 0 10px var(--gold)';
        }
    });
    if (suspenseOverlay) {
        suspenseOverlay.style.display = 'none';
        suspenseOverlay.className = '';
    }

    const btn = document.getElementById('btnSpinCenter');
    if (btn) {
        const rect = btn.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;
        spawnLightningBolt(targetX, targetY);
        setTimeout(() => {
            spawnLightningBolt(targetX, targetY);
        }, 80);
    } else {
        if (appWheel && appWheel.audio) {
            appWheel.audio.playLightningImpact();
        }
    }
    
    triggerAdminSpin();
});

timerController.on('scheduleUpdate', (schedTime) => {
    lightningScheduleTime = schedTime;
    syncScheduledTimeHUD();
    syncTimerStateToSupabase();
});

spinController.on('stateChanged', (logoUrl) => {
    syncCenterButtonState(logoUrl);
});

const formatDateTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const formatTimeDescription = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0 && secs > 0) {
        return `${mins} min y ${secs} seg`;
    } else if (mins > 0) {
        return `${mins} minuto${mins > 1 ? 's' : ''}`;
    } else {
        return `${secs} segundo${secs !== 1 ? 's' : ''}`;
    }
};

const syncScheduledTimeHUD = () => {
    const schedContainer = document.getElementById('scheduledTimeContainer');
    const schedDisplay = document.getElementById('scheduledTimeDisplay');
    if (schedContainer && schedDisplay) {
        if (lightningScheduleTime) {
            schedContainer.style.display = 'flex';
            schedDisplay.innerText = formatDateTime(lightningScheduleTime);
        } else {
            schedContainer.style.display = 'none';
        }
    }
};

const checkLightningSchedule = () => {
    if (!lightningScheduleTime) {
        syncScheduledTimeHUD();
        return;
    }
    const now = Date.now();
    if (now >= lightningScheduleTime) {
        // Limpiar programación
        lightningScheduleTime = null;
        if (lightningScheduleInterval) {
            clearInterval(lightningScheduleInterval);
            lightningScheduleInterval = null;
        }
        
        const chkSchedule = document.getElementById('chkScheduleLightning') as HTMLInputElement;
        if (chkSchedule) chkSchedule.checked = false;
        const divConfig = document.getElementById('divScheduleLightningConfig');
        if (divConfig) divConfig.style.display = 'none';
        const txtStatus = document.getElementById('txtScheduleStatus');
        if (txtStatus) txtStatus.innerText = "Sin programar";

        // Notificar e iniciar automáticamente el juego y temporizador
        showCustomAlert("⏳ PROGRAMACIÓN ALCANZADA: Iniciando automáticamente el Juego Relámpago...", "INICIO AUTOMÁTICO");
        
        // 1. Activar el juego
        if ((window as any).loadGameById) {
            (window as any).loadGameById("list_lightning_game");
        }
        
        // 2. Asegurar que el modo público / invitado esté activo para los participantes
        let lightningGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
        if (lightningGame) {
            lightningGame.publicJoinEnabled = true;
            StateManager.config.publicJoinEnabled = true;
            if (!StateManager.config.publicSessionId) {
                StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                StateManager.config.publicSpinsCount = 0;
            }
            const timeLimit = lightningGame.publicTimeLimit || 3;
            lightningGame.publicSessionExpiry = Date.now() + timeLimit * 60 * 1000;
            StateManager.config.publicSessionExpiry = lightningGame.publicSessionExpiry;
            StateManager.save();
        }

        // 3. Desplazar vista a la ruleta e iniciar
        const canvas = document.getElementById('wheelCanvas');
        if (canvas) {
            canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        resetLightningTimer();
        startLightningTimer();
        
        // Actualizar UI
        const badge = document.getElementById('lightningActiveBadge');
        if (badge) {
            badge.innerHTML = `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`;
        }
        const chkJoin = document.getElementById('chkLightningJoinEnabled') as HTMLInputElement;
        if (chkJoin) chkJoin.checked = true;
        
        // Si el QR del juego relámpago estaba abierto, lo regeneramos
        if (document.getElementById('modalQR') && document.getElementById('modalQR')!.style.display === 'flex') {
            const btnShowQR = document.getElementById('btnShowLightningQR');
            if (btnShowQR) (btnShowQR as HTMLElement).click();
        }
        syncScheduledTimeHUD();
    } else {
        // Actualizar el texto del estado de la cuenta regresiva
        const txtStatus = document.getElementById('txtScheduleStatus');
        if (txtStatus) {
            const diffMs = lightningScheduleTime - now;
            const diffSecs = Math.floor(diffMs / 1000);
            const hrs = Math.floor(diffSecs / 3600);
            const mins = Math.floor((diffSecs % 3600) / 60);
            const secs = diffSecs % 60;
            txtStatus.innerText = `Inicia en: ${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            txtStatus.style.color = "var(--gold)";
        }
        syncScheduledTimeHUD();
    }
};

const updateLightningTimerDisplay = () => {
    const el = document.getElementById('timerDisplay');
    const elAdmin = document.getElementById('timerDisplayAdmin');
    const mins = Math.floor(lightningTimeRemaining / 60);
    const secs = lightningTimeRemaining % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (el) el.innerText = timeStr;
    if (elAdmin) elAdmin.innerText = timeStr;
};

const ensureElectricArcsSvg = (active: boolean) => {
    const wrapper = document.querySelector('.wheel-wrapper');
    if (!wrapper) return;
    
    let svg: any = document.getElementById('electricArcsSvg');
    if (active) {
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('id', 'electricArcsSvg');
            svg.setAttribute('viewBox', '0 0 500 500');
            svg.setAttribute('style', 'position: absolute; inset: -15px; width: calc(100% + 30px); height: calc(100% + 30px); pointer-events: none; z-index: 10; overflow: visible;');
            
            const createPath = (id: string, stroke: string, width: string, opacity: string, blur: string) => {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('id', id);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', stroke);
                path.setAttribute('stroke-width', width);
                path.setAttribute('opacity', opacity);
                if (blur) {
                    path.setAttribute('style', `filter: drop-shadow(0 0 ${blur} ${stroke});`);
                }
                return path;
            };
            
            svg.appendChild(createPath('electricArcCyan', '#00f3ff', '3', '0.9', '6px'));
            svg.appendChild(createPath('electricArcGold', 'var(--gold, #d4af37)', '2', '0.8', '4px'));
            svg.appendChild(createPath('electricArcWhite', '#ffffff', '1.5', '1.0', '2px'));
            
            wrapper.appendChild(svg);
        }
        
        wrapper.classList.add('electric-contour-glow');
    } else {
        if (svg) {
            svg.remove();
        }
        wrapper.classList.remove('electric-contour-glow');
    }
};

const updateElectricArcs = () => {
    const svg = document.getElementById('electricArcsSvg');
    if (!svg) return;
    
    const cx = 250;
    const cy = 250;
    const r = 244; 
    const segments = 32;
    
    const generateCircularJaggedPath = (radialOffset: number) => {
        let points = [];
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const noise = (Math.random() - 0.5) * radialOffset;
            const spike = Math.random() > 0.88 ? (Math.random() - 0.5) * (radialOffset * 2.2) : 0;
            const curR = r + noise + spike;
            const x = cx + curR * Math.cos(angle);
            const y = cy + curR * Math.sin(angle);
            points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
        }
        return points.join(' ') + ' Z';
    };
    
    const pathCyan = document.getElementById('electricArcCyan');
    const pathGold = document.getElementById('electricArcGold');
    const pathWhite = document.getElementById('electricArcWhite');
    
    if (pathCyan) pathCyan.setAttribute('d', generateCircularJaggedPath(14));
    if (pathGold) pathGold.setAttribute('d', generateCircularJaggedPath(9));
    if (pathWhite) pathWhite.setAttribute('d', generateCircularJaggedPath(5));
};

const spawnLightningBolt = (targetX?: number, targetY?: number) => {
    const overlay = document.getElementById('lightningScreenOverlay');
    if (!overlay) return;
    
    overlay.style.display = 'block';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 99999;');
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const startX = Math.random() * width;
    const startY = 0;
    
    const endX = targetX !== undefined ? targetX : Math.random() * width;
    const endY = targetY !== undefined ? targetY : height * 0.95;
    
    const segments = 12;
    let points = [[startX, startY]];
    
    for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const baseX = startX + (endX - startX) * t;
        const baseY = startY + (endY - startY) * t;
        
        const angle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
        const offsetMag = (Math.random() - 0.5) * 85 * (1 - t * 0.4);
        const pX = baseX + Math.cos(angle) * offsetMag;
        const pY = baseY + Math.sin(angle) * offsetMag;
        points.push([pX, pY]);
    }
    points.push([endX, endY]);
    
    const d = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    
    const createPath = (stroke: string, width: string, opacity: string, blur: string) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', stroke);
        path.setAttribute('stroke-width', width);
        path.setAttribute('opacity', opacity);
        if (blur) {
            path.setAttribute('style', `filter: drop-shadow(0 0 ${blur} ${stroke}) blur(${blur});`);
        }
        return path;
    };
    
    svg.appendChild(createPath('#00f3ff', '8', '0.4', '8px'));
    svg.appendChild(createPath('var(--gold, #d4af37)', '5', '0.7', '4px'));
    svg.appendChild(createPath('#ffffff', '2.5', '1.0', '1px'));
    
    overlay.appendChild(svg);
    
    if (appWheel && appWheel.audio) {
        appWheel.audio.init();
        appWheel.audio.playLightningImpact();
    }
    
    overlay.classList.remove('lightning-flash-active');
    void overlay.offsetWidth; 
    overlay.classList.add('lightning-flash-active');
    
    setTimeout(() => {
        svg.remove();
        if (overlay.children.length === 0) {
            overlay.style.display = 'none';
        }
    }, 200);
};

const triggerRandomScreenLightning = () => {
    if (!lightningEffectsActive) return;
    
    spawnLightningBolt();
    
    const minDelay = lightningTimeRemaining <= 5 ? 700 : 1500;
    const maxDelay = lightningTimeRemaining <= 5 ? 1400 : 3500;
    const nextDelay = minDelay + Math.random() * (maxDelay - minDelay);
    
    setTimeout(() => {
        triggerRandomScreenLightning();
    }, nextDelay);
};

const startLightningVisualEffects = () => {
    if (lightningEffectsActive) return;
    lightningEffectsActive = true;
    
    ensureElectricArcsSvg(true);
    
    if (!electricArcsInterval) {
        electricArcsInterval = setInterval(() => {
            updateElectricArcs();
        }, 70);
    }
    
    triggerRandomScreenLightning();
};

const stopLightningVisualEffects = () => {
    lightningEffectsActive = false;
    
    ensureElectricArcsSvg(false);
    if (electricArcsInterval) {
        clearInterval(electricArcsInterval);
        electricArcsInterval = null;
    }
    
    document.body.classList.remove('screen-shake-active');
    
    const wrapper = document.querySelector('.wheel-wrapper');
    if (wrapper) {
        wrapper.classList.remove('wheel-heartbeat');
    }
    
    const overlay = document.getElementById('lightningScreenOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
        overlay.classList.remove('lightning-flash-active');
    }
};

const startLightningTimer = () => {
    timerController.start();
};

const stopLightningTimer = () => {
    timerController.stop();
};

const resetLightningTimer = () => {
    timerController.reset();
};

const syncTimerButtonsUI = () => {
    const btnStart = document.getElementById('btnTimerStart');
    const btnPause = document.getElementById('btnTimerPause');
    if (btnStart && btnPause) {
        btnStart.style.opacity = '1';
        if (isLightningTimerRunning) {
            btnPause.style.opacity = '1';
        } else {
            btnPause.style.opacity = '0.5';
        }
    }
};

const triggerScheduledActivation = () => {
    const chkSchedule = document.getElementById('chkScheduleLightning') as HTMLInputElement;
    if (chkSchedule) chkSchedule.checked = false;
    const divConfig = document.getElementById('divScheduleLightningConfig');
    if (divConfig) divConfig.style.display = 'none';
    const txtStatus = document.getElementById('txtScheduleStatus');
    if (txtStatus) txtStatus.innerText = "Sin programar";

    // Notificar e iniciar automáticamente el juego y temporizador
    showCustomAlert("⏳ PROGRAMACIÓN ALCANZADA: Iniciando automáticamente el Juego Relámpago...", "INICIO AUTOMÁTICO");
    
    // 1. Activar el juego
    if ((window as any).loadGameById) {
        (window as any).loadGameById("list_lightning_game");
    }
    
    // 2. Asegurar que el modo público / invitado esté activo para los participantes
    let lightningGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
    if (lightningGame) {
        lightningGame.publicJoinEnabled = true;
        StateManager.config.publicJoinEnabled = true;
        if (!StateManager.config.publicSessionId) {
            StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
            StateManager.config.publicSpinsCount = 0;
        }
        const timeLimit = lightningGame.publicTimeLimit || 3;
        lightningGame.publicSessionExpiry = Date.now() + timeLimit * 60 * 1000;
        StateManager.config.publicSessionExpiry = lightningGame.publicSessionExpiry;
        StateManager.save();
    }

    // 3. Desplazar vista a la ruleta e iniciar
    const canvas = document.getElementById('wheelCanvas');
    if (canvas) {
        canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    resetLightningTimer();
    startLightningTimer();
    
    // Actualizar UI
    const badge = document.getElementById('lightningActiveBadge');
    if (badge) {
        badge.innerHTML = `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`;
    }
    const chkJoin = document.getElementById('chkLightningJoinEnabled') as HTMLInputElement;
    if (chkJoin) chkJoin.checked = true;
    
    // Si el QR del juego relámpago estaba abierto, lo regeneramos
    if (document.getElementById('modalQR') && document.getElementById('modalQR')!.style.display === 'flex') {
        const btnShowQR = document.getElementById('btnShowLightningQR');
        if (btnShowQR) (btnShowQR as HTMLElement).click();
    }
    syncScheduledTimeHUD();
};

const setupTimerInteractionListeners = () => {
    const btnMinus = document.getElementById('btnTimerMinus');
    const btnPlus = document.getElementById('btnTimerPlus');
    const btnStart = document.getElementById('btnTimerStart');
    const btnPause = document.getElementById('btnTimerPause');
    const btnReset = document.getElementById('btnTimerReset');
    const timerDisplayAdmin = document.getElementById('timerDisplayAdmin');
    
    // Controles de programación
    const chkSchedule = document.getElementById('chkScheduleLightning') as HTMLInputElement;
    const inputScheduleTime = document.getElementById('inputScheduleLightningTime') as HTMLInputElement;
    const divScheduleConfig = document.getElementById('divScheduleLightningConfig');
    const txtStatus = document.getElementById('txtScheduleStatus');
    
    if (btnMinus) {
        btnMinus.onclick = () => {
            timerController.adjustTime(-30);
        };
    }
    if (btnPlus) {
        btnPlus.onclick = () => {
            timerController.adjustTime(30);
        };
    }
    if (btnStart) {
        btnStart.onclick = () => {
            let lightningGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
            if (lightningGame) {
                const minutes = timerController.getTimeRemaining() / 60;
                lightningGame.publicTimeLimit = minutes;
                const inputTime = document.getElementById('inputLightningTimeLimit') as HTMLInputElement;
                if (inputTime) inputTime.value = minutes.toString();
                StateManager.save();
                showCustomAlert(`El tiempo del temporizador ha sido fijado en ${formatTimeDescription(timerController.getTimeRemaining())}. El temporizador comenzará cuando inicies el juego.`, "TIEMPO FIJADO");
                syncTimerStateToSupabase();
            }
        };
    }
    if (btnPause) {
        btnPause.onclick = () => stopLightningTimer();
    }
    if (btnReset) {
        btnReset.onclick = () => resetLightningTimer();
    }
    if (timerDisplayAdmin) {
        timerDisplayAdmin.onclick = () => {
            const currentMins = Math.floor(timerController.getTimeRemaining() / 60);
            const inputVal = prompt("Ingresa el tiempo en minutos para el temporizador:", currentMins.toString());
            if (inputVal !== null) {
                const parsed = parseInt(inputVal);
                if (!isNaN(parsed) && parsed >= 0) {
                    timerController.setDurationMinutes(parsed);
                    let lightningGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
                    if (lightningGame) {
                        lightningGame.publicTimeLimit = parsed;
                        const inputTime = document.getElementById('inputLightningTimeLimit') as HTMLInputElement;
                        if (inputTime) inputTime.value = parsed.toString();
                        StateManager.save();
                    }
                    syncTimerStateToSupabase();
                }
            }
        };
    }
    
    // Manejo de programación de inicio automático
    if (chkSchedule && inputScheduleTime && divScheduleConfig && txtStatus) {
        // Inicializar datetime con hora actual + 5 minutos
        const initDateTime = () => {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 5);
            // Formatear a YYYY-MM-DDTHH:MM
            const pad = (n: number) => n.toString().padStart(2, '0');
            const localIso = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
            inputScheduleTime.value = localIso;
        };
        
        initDateTime();
        
        chkSchedule.onchange = () => {
            if (chkSchedule.checked) {
                divScheduleConfig.style.display = 'flex';
                const parsedTime = Date.parse(inputScheduleTime.value);
                if (!isNaN(parsedTime)) {
                    if (parsedTime <= Date.now()) {
                        showCustomAlert("Por favor selecciona una fecha y hora en el futuro.", "FECHA INVÁLIDA");
                        chkSchedule.checked = false;
                        divScheduleConfig.style.display = 'none';
                        timerController.cancelSchedule();
                        return;
                    }
                    txtStatus.innerText = "Programado...";
                    timerController.setScheduleTime(parsedTime, triggerScheduledActivation);
                } else {
                    showCustomAlert("Por favor selecciona una fecha y hora válidas.", "FECHA INVÁLIDA");
                    chkSchedule.checked = false;
                    divScheduleConfig.style.display = 'none';
                }
            } else {
                divScheduleConfig.style.display = 'none';
                txtStatus.innerText = "Sin programar";
                timerController.cancelSchedule();
            }
        };
        
        inputScheduleTime.onchange = () => {
            if (chkSchedule.checked) {
                const parsedTime = Date.parse(inputScheduleTime.value);
                if (!isNaN(parsedTime)) {
                    if (parsedTime <= Date.now()) {
                        showCustomAlert("Por favor selecciona una fecha y hora en el futuro.", "FECHA INVÁLIDA");
                        chkSchedule.checked = false;
                        divScheduleConfig.style.display = 'none';
                        timerController.cancelSchedule();
                        return;
                    }
                    txtStatus.innerText = "Programado...";
                    timerController.setScheduleTime(parsedTime, triggerScheduledActivation);
                } else {
                    txtStatus.innerText = "Fecha inválida";
                    timerController.cancelSchedule();
                }
            }
        };
    }
    
    syncTimerButtonsUI();
};

// Exponer globalmente para que qrController y otros puedan interactuar
(window as any).resetLightningTimer = resetLightningTimer;

// Helpers Modales Personalizados
const togglePassword = (inputId: string, btn: HTMLElement) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
        if (input.type === 'password') {
            input.type = 'text';
            btn.innerText = 'Ocultar';
        } else {
            input.type = 'password';
            btn.innerText = 'Ver';
        }
    }
};

// @ts-ignore
window.togglePassword = togglePassword;

const showCustomAlert = (message: string, title: string = "MENSAJE") => {
    const modal = document.getElementById('modalCustomAlert');
    const titleEl = document.getElementById('customAlertTitle');
    const msgEl = document.getElementById('customAlertMessage');
    const btnOk = document.getElementById('btnCustomAlertOk');
    if (modal && msgEl && btnOk) {
        if (titleEl) titleEl.innerText = title;
        msgEl.innerText = message;
        modal.style.display = 'flex';
        btnOk.onclick = () => { modal.style.display = 'none'; };
    } else {
        console.warn(title + ": " + message);
    }
};

const showCustomAlertAutoDismiss = (message: string, title: string = "MENSAJE", duration: number = 1200) => {
    const modal = document.getElementById('modalCustomAlert');
    const titleEl = document.getElementById('customAlertTitle');
    const msgEl = document.getElementById('customAlertMessage');
    const btnOk = document.getElementById('btnCustomAlertOk');
    if (modal && msgEl && btnOk) {
        if (titleEl) titleEl.innerText = title;
        msgEl.innerText = message;
        modal.style.display = 'flex';
        
        btnOk.onclick = () => { modal.style.display = 'none'; };
        
        setTimeout(() => {
            if (modal.style.display === 'flex' && msgEl.innerText === message) {
                modal.style.display = 'none';
            }
        }, duration);
    } else {
        console.warn(title + ": " + message);
    }
};

const showCustomConfirm = (message: string, onConfirm: () => void) => {
    const modal = document.getElementById('modalCustomConfirm');
    const msgEl = document.getElementById('customConfirmMessage');
    const btnAccept = document.getElementById('btnCustomConfirmAccept');
    const btnCancel = document.getElementById('btnCustomConfirmCancel');
    if (modal && msgEl && btnAccept && btnCancel) {
        msgEl.innerText = message;
        modal.style.display = 'flex';
        btnAccept.onclick = () => { modal.style.display = 'none'; onConfirm(); };
        btnCancel.onclick = () => { modal.style.display = 'none'; };
    }
};

// @ts-ignore
window.showCustomAlert = showCustomAlert;
// @ts-ignore
window.showCustomConfirm = showCustomConfirm;

// --- MÓDULO ARQUITECTÓNICO DE AUDITORÍA Y OPTIMIZACIÓN DE ALMACENAMIENTO ---
const addAuditEntry = (action: string) => {
    serviceAddAuditEntry(action, dispatchStateChange);
};

const renderAuditLogs = () => {
    dispatchStateChange();
};

const updateStorageUsage = () => {
    dispatchStateChange();
};

const optimizeStorage = () => {
    serviceOptimizeStorage(showCustomConfirm, showCustomAlert, dispatchStateChange);
};
// ---------------------------------------------------------------------------

// Event Binding from Engine
StateManager.onSaveComplete = () => {
    renderAnalytics();
};

appWheel.onSpinStart = () => {
    spinController.setSpinning(true);
    if (StateManager.config.adBannersAutoHide) {
        const banner = document.getElementById('bannerContainer');
        if (banner) banner.style.opacity = '0';
    }
};

appWheel.onAdTrigger = async () => {
    const email = sessionStorage.getItem('nexo_current_user_email') || '';
    const freqVideoUrl = await fetchMediaFromSupabase(email, "ad_frequency_video");
    if (freqVideoUrl) {
        showAdHomeModal('frequency');
    } else {
        showAdHomeModal();
    }
};

appWheel.onSpinComplete = (premio: string) => {
    spinController.setSpinning(false);
    
    // Buscar si el premio es especial / tiene celebración configurada
    const winIdx = appWheel.winnerIdx;
    const prize = (winIdx !== undefined && StateManager.config.prizes[winIdx]) ? StateManager.config.prizes[winIdx] : undefined;
    
    // Configurar y renderizar la tarjeta de felicitación modular
    const congratsCard = document.getElementById('congratsCard') as NexoCongratsCard;
    if (congratsCard) {
        congratsCard.prize = prize;
        congratsCard.premioName = premio;
        congratsCard.isGuestMode = isGuestMode;
    }

    // MOSTRAR EL MODAL INMEDIATAMENTE - Con retardo seguro y reflow para dispositivos móviles
    setTimeout(() => {
        const modal = document.getElementById('modalWinner');
        if (modal) {
            modal.style.display = 'flex';
            // Forzar reflow de diseño en el navegador para garantizar el repintado en dispositivos móviles
            modal.offsetHeight;
        }
    }, 150);

    // Decrementar stock si está configurado y guardar
    if (prize && prize.isSpecial && prize.stock !== undefined) {
        if (prize.stock > 0) {
            prize.stock--;
            StateManager.save();
        }
    }

    if (isGuestMode) {
        localStorage.setItem(`nexo_guest_played_${guestSessionId}`, premio);
        
        const userEmail = sessionStorage.getItem('nexo_current_user_email');
        if (userEmail) { // Local play on admin device
            if (pendingEntryIndex !== null && StateManager.config.winnersHistory[pendingEntryIndex]) {
                StateManager.config.winnersHistory[pendingEntryIndex].nombre = premio;
                pendingEntryIndex = null;
            } else if (!StateManager.config.localRequireRegister) {
                StateManager.config.winnersHistory.push({ 
                    nombre: premio, 
                    fecha: new Date().toLocaleString(),
                    localSessionId: StateManager.config.localSessionId || undefined
                });
            }
            StateManager.config.publicSpinsCount = (StateManager.config.publicSpinsCount || 0) + 1;
            StateManager.save();
            renderLeadsList();
        }
        return;
    }

    if (pendingEntryIndex !== null && StateManager.config.winnersHistory[pendingEntryIndex]) {
        StateManager.config.winnersHistory[pendingEntryIndex].nombre = premio;
        pendingEntryIndex = null;
    } else if (!StateManager.config.localRequireRegister) {
        StateManager.config.winnersHistory.push({ 
            nombre: premio, 
            fecha: new Date().toLocaleString(),
            localSessionId: StateManager.config.localSessionId || undefined
        });
    }
    StateManager.save();
    renderLeadsList(); 
    addAuditEntry(`Ruleta girada. Premio seleccionado: "${premio}"`);

    if (StateManager.config.adBannersAutoHide) {
        const banner = document.getElementById('bannerContainer');
        if (banner) banner.style.opacity = '1';
    }

    // Cuando el juego se haya realizado o concluido, automáticamente generamos un nuevo enlace tras 4 segundos
    setTimeout(() => {
        const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
        const game = StateManager.config.savedPrizeLists?.find((l: any) => l.id === activeId);
        if (game) {
            game.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
            game.publicSpinsCount = 0;
            if (game.publicTimeLimit && game.publicTimeLimit > 0) {
                game.publicSessionExpiry = Date.now() + game.publicTimeLimit * 60 * 1000;
            } else {
                game.publicSessionExpiry = 0;
            }
            
            if (StateManager.config.activeSavedListId === activeId) {
                StateManager.config.publicSessionId = game.publicSessionId;
                StateManager.config.publicSessionExpiry = game.publicSessionExpiry;
                StateManager.config.publicSpinsCount = game.publicSpinsCount;
            }
            
            StateManager.save();
            syncGameSectionsUI();
            syncCenterButtonState();
        }
    }, 4000);
};

// Layout Handlers
const updateRaffleLayoutClasses = () => {
    const appMain = document.getElementById('appMain');
    if (!appMain) return;
    if (StateManager.config.raffleMode) {
        appMain.classList.remove('raffle-off');
        appMain.classList.add('raffle-on');
    } else {
        appMain.classList.remove('raffle-on');
        appMain.classList.add('raffle-off');
    }
};

const initTabs = () => {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        (tab as HTMLElement).onclick = () => {
            const target = tab.getAttribute('data-tab');
            if (target) {
                TabStateManager.setActiveTab(target);
            }
        };
    });
};

const initSubTabs = () => {
    perfilController.initSubTabs();
};

const initSistema = () => {
    SistemaController.init({
        executeWithAuth,
        showCustomConfirm,
        showCustomAlert,
        renderAuditLogs,
        updateStorageUsage
    });
};

const renderSubscriptionDashboard = async () => {
    await perfilController.renderSubscriptionDashboard();
    initSistema();
};

const handleLicenseActivation = async (inputId: string) => {
    await perfilController.handleLicenseActivation(inputId, verifyGlobalLicense);
};

const verifyGlobalLicense = async () => {
    await perfilController.verifyGlobalLicense(renderSubscriptionDashboard);
};

const initSubscriptionHandlers = () => {
    perfilController.initSubscriptionHandlers(verifyGlobalLicense);
    perfilController.initSessionHandlers();
};

const viewInitSuperAdminHandlers = () => {
    registerSuperAdminGlobals(showCustomAlert, showCustomConfirm);
    initSuperAdminHandlers(showCustomAlert, showCustomConfirm);
};


const renderFormFieldsEditor = () => {
    viewRenderFormFieldsEditor();
};

// @ts-ignore
window.updateFormField = (id: string, prop: 'label' | 'placeholder', val: string) => {
    updateFormField(id, prop, val);
};

// @ts-ignore
window.removeFormField = (id: string) => {
    removeFormField(id, showCustomAlert);
};

const btnAddField = document.getElementById('btnAddField');
if (btnAddField) {
    btnAddField.onclick = () => {
        const newId = "field_" + Date.now();
        StateManager.config.formFields.push({ id: newId, label: "Nuevo Campo", placeholder: "Ej: Dato..." });
        StateManager.save();
        renderFormFieldsEditor();
    };
}

const btnOpenFormEditor = document.getElementById('btnOpenFormEditor');
if (btnOpenFormEditor) {
    btnOpenFormEditor.onclick = () => {
        renderFormFieldsEditor();
        const modalEditor = document.getElementById('modalEditFormFields');
        if (modalEditor) modalEditor.style.display = 'flex';
    };
}

const btnCloseFormEditor = document.getElementById('btnCloseFormEditor');
if (btnCloseFormEditor) btnCloseFormEditor.onclick = () => {
    const modalEditor = document.getElementById('modalEditFormFields');
    if (modalEditor) modalEditor.style.display = 'none';
};

const btnCancelFormEditor = document.getElementById('btnCancelFormEditor');
if (btnCancelFormEditor) btnCancelFormEditor.onclick = () => {
    const modalEditor = document.getElementById('modalEditFormFields');
    if (modalEditor) modalEditor.style.display = 'none';
};

const btnOpenFormPreview = document.getElementById('btnOpenFormPreview');
if (btnOpenFormPreview) btnOpenFormPreview.onclick = () => {
    renderDynamicRegistrationForm();
    const modalReg = document.getElementById('modalRegistration');
    if (modalReg) {
        modalReg.style.display = 'flex';
        const modalEditor = document.getElementById('modalEditFormFields');
        if (modalEditor) {
            modalEditor.style.display = 'none';
            (modalReg as any)._restoreEditorOnClose = true;
        }
    }
};

const btnFormEditorPreview = document.getElementById('btnFormEditorPreview');
if (btnFormEditorPreview) btnFormEditorPreview.onclick = () => {
    renderDynamicRegistrationForm();
    const modalReg = document.getElementById('modalRegistration');
    if (modalReg) {
        modalReg.style.display = 'flex';
        const modalEditor = document.getElementById('modalEditFormFields');
        if (modalEditor) {
            modalEditor.style.display = 'none';
            (modalReg as any)._restoreEditorOnClose = true;
        }
    }
};

const renderDynamicRegistrationForm = () => {
    viewRenderDynamicRegistrationForm();
};

const updateRaffleButtonVisibility = () => {
    // El botón de Iniciar Sorteo ha sido removido del sistema
};

const triggerAdminSpin = async () => {
    if (appWheel.isSpinning) return;
    const prizeCount = StateManager.config.prizes.length;
    if (prizeCount === 0) return;

    // Filter prizes that are available (stock is undefined or stock > 0)
    const availablePrizesIndices: number[] = [];
    StateManager.config.prizes.forEach((p, idx) => {
        if (p.stock === undefined || p.stock > 0) {
            availablePrizesIndices.push(idx);
        }
    });

    if (availablePrizesIndices.length === 0) {
        showCustomAlert("NO SE PUEDE INICIAR EL JUEGO PORQUE TODOS LOS PREMIOS CON STOCK CONFIGURADO SE ENCUENTRAN AGOTADOS (STOCK CERO).", "STOCK AGOTADO");
        stopLightningTimer();
        return;
    }

    const randomIdx = Math.floor(Math.random() * availablePrizesIndices.length);
    const winnerIdx = availablePrizesIndices[randomIdx];

    const adminEmail = sessionStorage.getItem('nexo_current_user_email');
    
    let triggerAd = false;
    if (StateManager.config.adVideoAdsEnabled && StateManager.config.adVideoAdsFrequency) {
        const nextSpinsSinceLastAd = (StateManager.config.spinsSinceLastAd || 0) + 1;
        if (nextSpinsSinceLastAd >= StateManager.config.adVideoAdsFrequency) {
            triggerAd = true;
        }
    }

    if (triggerAd) {
        if (isSupabaseConfigured && adminEmail && (StateManager.config.publicJoinEnabled || StateManager.config.syncSpinEnabled)) {
            try {
                const latestConfig = await fetchConfigFromSupabase(adminEmail);
                if (latestConfig) {
                    latestConfig.syncSpinState = {
                        status: 'showing_ad',
                        timestamp: Date.now(),
                        winnerIdx: winnerIdx,
                        lead: {},
                        session: StateManager.config.publicSessionId || "default_session"
                    };
                    latestConfig.spinsSinceLastAd = 0;
                    await syncConfigToSupabase(adminEmail, latestConfig);
                    
                    StateManager.config.spinsSinceLastAd = 0;
                    StateManager.config.syncSpinState = latestConfig.syncSpinState;
                    StateManager.save();
                }
            } catch (e) {
                console.error("Error al sincronizar el estado showing_ad de admin en Supabase:", e);
            }
        } else {
            StateManager.config.spinsSinceLastAd = 0;
            StateManager.save();
        }

        const onAdCompleted = async () => {
            window.removeEventListener('nexo-ad-completed', onAdCompleted);
            const btnClose = document.getElementById('btnCloseAdHome');
            if (btnClose) btnClose.removeEventListener('click', onAdCompleted);

            if (isSupabaseConfigured && adminEmail && (StateManager.config.publicJoinEnabled || StateManager.config.syncSpinEnabled)) {
                try {
                    const latestConfig = await fetchConfigFromSupabase(adminEmail);
                    if (latestConfig) {
                        latestConfig.syncSpinState = {
                            status: 'spinning',
                            timestamp: Date.now(),
                            winnerIdx: winnerIdx,
                            lead: {},
                            session: StateManager.config.publicSessionId || "default_session"
                        };
                        await syncConfigToSupabase(adminEmail, latestConfig);
                    }
                } catch (e) {
                    console.error("Error al sincronizar el inicio de giro de admin tras publicidad en Supabase:", e);
                }
            }

            appWheel.spin(winnerIdx, true);
        };

        window.addEventListener('nexo-ad-completed', onAdCompleted);
        const btnClose = document.getElementById('btnCloseAdHome');
        if (btnClose) btnClose.addEventListener('click', onAdCompleted);

        const email = sessionStorage.getItem('nexo_current_user_email') || '';
        const freqVideoUrl = await fetchMediaFromSupabase(email, "ad_frequency_video");
        if (freqVideoUrl) {
            showAdHomeModal('frequency');
        } else {
            showAdHomeModal();
        }
    } else {
        if (isSupabaseConfigured && adminEmail && (StateManager.config.publicJoinEnabled || StateManager.config.syncSpinEnabled)) {
            try {
                const latestConfig = await fetchConfigFromSupabase(adminEmail);
                if (latestConfig) {
                    latestConfig.syncSpinState = {
                        status: 'spinning',
                        timestamp: Date.now(),
                        winnerIdx: winnerIdx,
                        lead: {},
                        session: StateManager.config.publicSessionId || "default_session"
                    };
                    latestConfig.spinsSinceLastAd = (latestConfig.spinsSinceLastAd || 0) + 1;
                    await syncConfigToSupabase(adminEmail, latestConfig);
                    
                    StateManager.config.spinsSinceLastAd = latestConfig.spinsSinceLastAd;
                    StateManager.save();
                }
            } catch (e) {
                console.error("Error al sincronizar el inicio de giro de admin en Supabase:", e);
            }
        } else {
            StateManager.config.spinsSinceLastAd = (StateManager.config.spinsSinceLastAd || 0) + 1;
            StateManager.save();
        }

        appWheel.spin(winnerIdx, true);
    }
};

const initRegistrationHandlers = () => {
    const btnSpinCenter = document.getElementById('btnSpinCenter');
    const modalReg = document.getElementById('modalRegistration');
    const btnConfirmReg = document.getElementById('btnConfirmRegistration');
    const btnCancelReg = document.getElementById('btnCancelRegistration');
    const chkRequireReg = document.getElementById('chkRequireRegister') as HTMLInputElement;
    const chkLocalSessionList = document.getElementById('chkLocalSessionListEnabled') as HTMLInputElement;
    const chkPublicReg = document.getElementById('chkPublicRegister') as HTMLInputElement;
    const chkPublicRemove = document.getElementById('chkPublicRemoveWinner') as HTMLInputElement;
    const chkRaffleMode = document.getElementById('chkRaffleMode') as HTMLInputElement;
    
    // Ensure local session ID exists
    if (!StateManager.config.localSessionId) {
        StateManager.config.localSessionId = "local_" + Date.now().toString();
        StateManager.save();
    }

    if (btnSpinCenter) btnSpinCenter.onclick = () => {
        appWheel.audio.init();
        spinController.requestSpin({
            isGuestMode: isGuestMode,
            guestRegistrationRequired: guestRegistrationRequired,
            isGuestRegistered: !!localStorage.getItem('nexo_guest_reg_' + guestSessionId),
            hasRegisteredLocally: hasRegisteredLocally,
            guestRaffleMode: guestRaffleMode,
            onConfirmRegistration: () => {
                if (isGuestMode && guestRegistrationRequired) {
                    const btnShowReg = document.getElementById('btnShowGuestRegistration');
                    if (btnShowReg) btnShowReg.click();
                } else {
                    renderDynamicRegistrationForm();
                    if (modalReg) modalReg.style.display = 'flex';
                }
            },
            onStartSpin: () => {
                if (StateManager.config.localRequireRegister) {
                    const fecha = new Date().toLocaleString();
                    const entry: WinnerEntry = { 
                        nombre: "GIRANDO...", 
                        fecha: fecha, 
                        lead: pendingLocalLead || {},
                        publicSessionId: StateManager.config.publicSessionId || undefined,
                        localSessionId: StateManager.config.localSessionId || undefined
                    };
                    StateManager.config.winnersHistory.push(entry);
                    pendingEntryIndex = StateManager.config.winnersHistory.length - 1;
                    StateManager.save();
                    
                    hasRegisteredLocally = false;
                    pendingLocalLead = null;
                    syncCenterButtonState();
                }
                triggerAdminSpin();
            }
        });
    };
    if (btnCancelReg) btnCancelReg.onclick = () => {
        if (modalReg) {
            modalReg.style.display = 'none';
            if ((modalReg as any)._restoreEditorOnClose) {
                (modalReg as any)._restoreEditorOnClose = false;
                const modalEditor = document.getElementById('modalEditFormFields');
                if (modalEditor) modalEditor.style.display = 'flex';
            }
        }
    };
    if (btnConfirmReg) btnConfirmReg.onclick = () => {
        const lead: LeadData = {};
        let isValid = true;
        StateManager.config.formFields.forEach(field => {
            const input = document.getElementById(`reg_${field.id}`) as HTMLInputElement;
            const val = input ? input.value.trim() : "";
            if (!val) isValid = false;
            lead[field.id] = val;
        });
        if (!isValid) return showCustomAlert("Por favor, completa todos los campos.", "REGISTRO INCOMPLETO");
        const fecha = new Date().toLocaleString();
        
        const userEmail = sessionStorage.getItem('nexo_current_user_email');
        if (isSupabaseConfigured && userEmail) {
            saveLeadToSupabase({
                admin_email: userEmail,
                session_id: StateManager.config.publicSessionId || StateManager.config.localSessionId || "default_session",
                nombre: lead.nombre || lead.name || Object.values(lead)[0] || '',
                telefono: lead.telefono || lead.phone || '',
                email: lead.email || ''
            }).then(success => {
                if (success) {
                    console.log("Lead guardado exitosamente en la tabla nexo_leads desde panel de registro.");
                }
            }).catch(err => {
                console.error("Error al guardar lead en nexo_leads en Supabase:", err);
            });
        }
        
        // Ensure localSessionId exists
        if (!StateManager.config.localSessionId) {
            StateManager.config.localSessionId = "local_" + Date.now().toString();
        }

        if (StateManager.config.raffleMode) {
            const participantName = (lead[StateManager.config.formFields[0].id] || "Participante").toUpperCase();
            const isDefaultPrize = (name: string) => {
                const n = name.toUpperCase().trim();
                return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                       n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                       n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
            };
            const hasDefaultPrizes = StateManager.config.prizes.length > 0 && StateManager.config.prizes.every(p => isDefaultPrize(p.name));
            if (hasDefaultPrizes) StateManager.config.prizes = [{ name: participantName }];
            else StateManager.config.prizes.push({ name: participantName });
            const entry: WinnerEntry = { 
                nombre: "REGISTRADO (SORTEO)", 
                fecha: fecha, 
                lead: lead,
                publicSessionId: StateManager.config.publicSessionId || undefined,
                localSessionId: StateManager.config.localSessionId || undefined
            };
            StateManager.config.winnersHistory.push(entry);
            StateManager.save();
            if (modalReg) {
                modalReg.style.display = 'none';
                if ((modalReg as any)._restoreEditorOnClose) {
                    (modalReg as any)._restoreEditorOnClose = false;
                    const modalEditor = document.getElementById('modalEditFormFields');
                    if (modalEditor) modalEditor.style.display = 'flex';
                }
            }
            appWheel.draw(); 
            renderLeadsList();
        } else {
            pendingLocalLead = lead;
            hasRegisteredLocally = true;
            if (modalReg) {
                modalReg.style.display = 'none';
                if ((modalReg as any)._restoreEditorOnClose) {
                    (modalReg as any)._restoreEditorOnClose = false;
                    const modalEditor = document.getElementById('modalEditFormFields');
                    if (modalEditor) modalEditor.style.display = 'flex';
                }
            }
            syncCenterButtonState();
        }
    };
    if (chkRequireReg) {
        chkRequireReg.checked = !!StateManager.config.localRequireRegister;
        chkRequireReg.onchange = (e) => {
            StateManager.config.localRequireRegister = (e.target as HTMLInputElement).checked;
            StateManager.save();
            syncCenterButtonState();
        };
    }
    if (chkLocalSessionList) {
        chkLocalSessionList.checked = !!StateManager.config.localSessionListEnabled;
        chkLocalSessionList.onchange = (e) => {
            StateManager.config.localSessionListEnabled = (e.target as HTMLInputElement).checked;
            StateManager.save();
            renderLeadsList();
        };
    }
    if (chkPublicReg) {
        chkPublicReg.checked = !!StateManager.config.publicRegisterEnabled;
        chkPublicReg.onchange = (e) => {
            StateManager.config.publicRegisterEnabled = (e.target as HTMLInputElement).checked;
            StateManager.save();
        };
    }
    if (chkPublicRemove) {
        chkPublicRemove.checked = !!StateManager.config.publicRemoveWinner;
        chkPublicRemove.onchange = (e) => {
            StateManager.config.publicRemoveWinner = (e.target as HTMLInputElement).checked;
            StateManager.save();
        };
    }
    if (chkRaffleMode) chkRaffleMode.onchange = (e) => {
        const active = (e.target as HTMLInputElement).checked;
        StateManager.config.raffleMode = active;
        if (active) {
            StateManager.config.localRequireRegister = true; 
            if (chkRequireReg) chkRequireReg.checked = true;
            
            const isDefaultPrize = (name: string) => {
                const n = name.toUpperCase().trim();
                return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                       n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                       n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
            };
            StateManager.config.prizes = StateManager.config.prizes.filter(p => !isDefaultPrize(p.name));
            appWheel.draw();
        } else {
            const defaultSaved = StateManager.config.savedPrizeLists?.find(l => l.name === "LISTA PREDETERMINADA");
            if (defaultSaved) {
                StateManager.config.prizes = JSON.parse(JSON.stringify(defaultSaved.prizes));
            } else {
                StateManager.config.prizes = [
                    { name: "OPCIÓN 1" }, { name: "OPCIÓN 2" },
                    { name: "OPCIÓN 3" }, { name: "OPCIÓN 4" }
                ];
            }
            appWheel.draw();
        }
        updateRaffleButtonVisibility();
        updateRaffleLayoutClasses();
        StateManager.save();
    };
};

// Extracted to controllers/publicidadController.ts

// initPublicidadHandlers imported from controllers/publicidadController.ts

// Advertising/Publicity state and handlers fully extracted to controllers/publicidadController.ts

// Extracted to controllers/publicidadController.ts

// Extracted to controllers/publicidadController.ts

// startBannersEngine extracted to controllers/publicidadController.ts

// showQrModal extracted to controllers/publicidadController.ts

const adjustTitleFontSize = () => {
    if (!StateManager.config.autoFitTitle) return;
    const mainTitle = document.getElementById('mainTitle'); if (!mainTitle) return;
    const style = window.getComputedStyle(mainTitle);
    const titleArea = mainTitle.closest('.title-area');
    const availableWidth = titleArea ? (titleArea.clientWidth * 0.95) : (window.innerWidth * 0.95);
    const tester = document.createElement('span');
    tester.style.visibility = 'hidden'; tester.style.position = 'absolute'; tester.style.whiteSpace = 'nowrap';
    tester.style.font = style.font; tester.style.fontSize = '10px'; tester.style.fontWeight = '900';
    tester.style.textTransform = 'uppercase'; tester.style.letterSpacing = style.letterSpacing;
    tester.innerText = (mainTitle as HTMLElement).innerText || StateManager.config.title;
    document.body.appendChild(tester);
    const textWidthAt10px = tester.offsetWidth; document.body.removeChild(tester);
    if (textWidthAt10px > 0) {
        let newSize = Math.floor((availableWidth / textWidthAt10px) * 10);
        newSize = Math.max(16, Math.min(250, newSize));
        (mainTitle as HTMLElement).style.fontSize = newSize + 'px';
        const inputSize = document.getElementById('inputFontSize') as HTMLInputElement;
        if (inputSize) inputSize.value = newSize.toString();
        StateManager.config.titleFontSize = newSize;
    }
};

// Expose to window for external access from publicidadController.ts
if (typeof window !== 'undefined') {
    (window as any).adjustTitleFontSize = adjustTitleFontSize;
}

const renderAnalytics = () => {
    dispatchStateChange();
};

const exportWorkspace = async () => {
    try {
        const jsonStr = JSON.stringify(StateManager.config);
        const filename = `NEXO_Backup_${StateManager.config.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.nexo`;
        const base64Data = btoa(unescape(encodeURIComponent(jsonStr)));
        const dataUri = `data:application/nexo;base64,${base64Data}`;

        triggerDownload(dataUri, filename, 'application/nexo');
        addAuditEntry(`Workspace exportado como: ${filename}`);
    } catch (e) {
        showCustomAlert("Error al exportar el Workspace.", "ERROR");
        addAuditEntry("[ERROR] Falló la exportación del Workspace");
    }
};

const importWorkspace = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const imported = JSON.parse(e.target?.result as string);
            if (imported.title && Array.isArray(imported.prizes)) {
                showCustomConfirm("¿Estás seguro? Se sobrescribirá toda la configuración actual.", async () => {
                    if (!imported.auditLog) imported.auditLog = [];
                    imported.auditLog.unshift({
                        action: `[ÉXITO] Workspace importado desde archivo: ${file.name}`,
                        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    });
                    
                    StateManager.config = { ...INITIAL_DEFAULT_CONFIG, ...imported };
                    await StateManager.saveImmediate();
                    location.reload();
                });
            } else {
                showCustomAlert("Error: El archivo no parece ser un Workspace válido.", "ERROR");
                addAuditEntry("[ERROR] Intento de importación con archivo no válido");
            }
        } catch (err) {
            showCustomAlert("Error al leer el archivo.", "ERROR");
            addAuditEntry("[ERROR] Fallo de lectura al importar Workspace");
        }
    };
    reader.readAsText(file);
};

const updateOrientationClass = () => {
    if (typeof window === 'undefined') return;
    const isLandscape = window.innerWidth > window.innerHeight;
    if (isLandscape) {
        document.body.classList.add('landscape-mode');
        document.body.classList.remove('portrait-mode');
    } else {
        document.body.classList.add('portrait-mode');
        document.body.classList.remove('landscape-mode');
    }
};

const handleResize = debounce(() => {
    updateOrientationClass();
    adjustTitleFontSize();
    if(appWheel) appWheel.draw();
}, 250);

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
    updateOrientationClass();
    handleResize();
    setTimeout(() => {
        updateOrientationClass();
        handleResize();
    }, 100);
    setTimeout(() => {
        updateOrientationClass();
        handleResize();
    }, 300);
    setTimeout(() => {
        updateOrientationClass();
        handleResize();
    }, 600);
});

// Inicializar la clase de orientación de inmediato
updateOrientationClass();

// showGuestBlockScreen extracted to controllers/guestController.ts

// triggerGuestSpin extracted to controllers/guestController.ts

// openGuestRegistrationModal extracted to controllers/guestController.ts

// startLiveViewPolling extracted to controllers/guestController.ts

// initLiveViewMode and initGuestParticipation extracted to controllers/guestController.ts

const updatePublicSessionStatusDisplay = () => {
    const el = document.getElementById('publicSessionStatus');
    if (!el) return;
    
    if (StateManager.config.publicJoinEnabled) {
        let text = `SESIÓN ACTIVA`;
        if (StateManager.config.publicSessionId) {
            text += ` | ID: ${StateManager.config.publicSessionId}`;
        }
        if (StateManager.config.publicMaxParticipants) {
            text += ` | Límite: ${StateManager.config.publicSpinsCount || 0}/${StateManager.config.publicMaxParticipants}`;
        }
        if (StateManager.config.publicSessionExpiry && StateManager.config.publicSessionExpiry > Date.now()) {
            const mins = Math.ceil((StateManager.config.publicSessionExpiry - Date.now()) / 60000);
            text += ` | Expira en: ${mins} min`;
        }
        el.innerText = text;
        el.style.color = "var(--gold)";
    } else {
        el.innerText = "SESIÓN INACTIVA";
        el.style.color = "#777";
    }
};

const updateLightningSessionStatusDisplay = () => {
    const el = document.getElementById('lightningSessionStatus');
    if (!el) return;
    
    let lightningGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
    if (lightningGame && lightningGame.publicJoinEnabled) {
        let text = `SESIÓN ACTIVA`;
        if (lightningGame.publicSessionId) {
            text += ` | ID: ${lightningGame.publicSessionId}`;
        }
        if (lightningGame.publicMaxParticipants) {
            text += ` | Límite: ${lightningGame.publicSpinsCount || 0}/${lightningGame.publicMaxParticipants}`;
        }
        if (lightningGame.publicSessionExpiry && lightningGame.publicSessionExpiry > Date.now()) {
            const mins = Math.ceil((lightningGame.publicSessionExpiry - Date.now()) / 60000);
            text += ` | Expira en: ${mins} min`;
        }
        el.innerText = text;
        el.style.color = "var(--gold)";
    } else {
        el.innerText = "SESIÓN INACTIVA";
        el.style.color = "#777";
    }
};

// generateCustomizedQR extracted to controllers/qrController.ts

// generateQRCard extracted to controllers/qrController.ts

// setupQRPersonalizationHandlers extracted to controllers/qrController.ts

// initPublicJoinHandlers extracted to controllers/qrController.ts

const applyActiveThemeColors = () => {
    const themeId = StateManager.config.themeId;
    const current = StateManager.config.themeCustomizations[themeId];
    if (current) {
        document.documentElement.style.setProperty('--gold', current.primary);
        document.documentElement.style.setProperty('--gold-secondary', current.secondary);
        
        let effectiveLogo = current.logo;
        let effectiveBg = current.bg;

        applyLogoToWheel(effectiveLogo || "");
        applyBackground(effectiveBg || "");

        if (appWheel) appWheel.draw();
    }
};

const syncCenterButtonState = (logoUrl?: string) => {
    const btn = document.getElementById('btnSpinCenter');
    if (!btn) return;
    const htmlBtn = btn as HTMLElement;
    
    // Calcular estéticas de manera modular con el SpinController
    const aesthetics = spinController.calculateAesthetics({
        isGuestMode: isGuestMode,
        guestRegistrationRequired: guestRegistrationRequired,
        isGuestRegistered: !!localStorage.getItem('nexo_guest_reg_' + guestSessionId),
        hasRegisteredLocally: hasRegisteredLocally,
        guestRaffleMode: guestRaffleMode,
        logoUrl: logoUrl
    });

    // Resetear clases previas de estado para evitar colisiones
    htmlBtn.classList.remove('btn-spin-disabled', 'btn-spin-pulse-active');

    // Aplicar las clases calculadas
    aesthetics.classesToAdd.forEach(cls => htmlBtn.classList.add(cls));
    aesthetics.classesToRemove.forEach(cls => htmlBtn.classList.remove(cls));

    // Aplicar los estilos de manera desacoplada
    htmlBtn.style.pointerEvents = aesthetics.pointerEvents;
    htmlBtn.style.backgroundImage = aesthetics.backgroundImage;
    htmlBtn.innerText = aesthetics.text;
    htmlBtn.style.color = aesthetics.color;
    htmlBtn.style.fontSize = aesthetics.fontSize;
    htmlBtn.style.lineHeight = aesthetics.lineHeight;
    htmlBtn.style.padding = aesthetics.padding;
    htmlBtn.style.fontWeight = aesthetics.fontWeight;
    htmlBtn.style.textShadow = aesthetics.textShadow;
    htmlBtn.style.border = aesthetics.border;
};

// startSyncSpinPolling and stopSyncSpinPolling extracted to controllers/qrController.ts

const syncSettingsUI = () => {
    const mainTitle = document.getElementById('mainTitle');
    const mainSubtitle = document.getElementById('mainSubtitle');
    if (mainTitle) (mainTitle as HTMLElement).innerText = StateManager.config.title;
    if (mainSubtitle) {
        (mainSubtitle as HTMLElement).innerText = StateManager.config.subtitle || "SISTEMA DE SORTEO";
        (mainSubtitle as HTMLElement).style.fontSize = (StateManager.config.subtitleFontSize || 12) + 'px';
    }
    const inputEditTitle = document.getElementById('inputEditTitle') as HTMLInputElement;
    if (inputEditTitle) inputEditTitle.value = StateManager.config.title;
    const inputEditSubtitle = document.getElementById('inputEditSubtitle') as HTMLInputElement;
    if (inputEditSubtitle) inputEditSubtitle.value = StateManager.config.subtitle || "";
    const inputFontSize = document.getElementById('inputFontSize') as HTMLInputElement;
    if (inputFontSize) inputFontSize.value = (StateManager.config.titleFontSize || 32).toString();
    const inputSubtitleFontSize = document.getElementById('inputSubtitleFontSize') as HTMLInputElement;
    if (inputSubtitleFontSize) inputSubtitleFontSize.value = (StateManager.config.subtitleFontSize || 12).toString();
    
    if (document.getElementById('chkRemoveWinner')) (document.getElementById('chkRemoveWinner') as HTMLInputElement).checked = !!StateManager.config.autoRemoveWinner;
    if (document.getElementById('chkRaffleMode')) (document.getElementById('chkRaffleMode') as HTMLInputElement).checked = !!StateManager.config.raffleMode;
    if (document.getElementById('chkAutoFit')) (document.getElementById('chkAutoFit') as HTMLInputElement).checked = !!StateManager.config.autoFitTitle;
    
    const titleFontSizeInput = document.getElementById('inputFontSize');
    if(titleFontSizeInput) {
        (titleFontSizeInput as HTMLInputElement).style.opacity = StateManager.config.autoFitTitle ? "0.3" : "1";
        (titleFontSizeInput as HTMLInputElement).style.pointerEvents = StateManager.config.autoFitTitle ? "none" : "auto";
    }
    if (StateManager.config.autoFitTitle) setTimeout(adjustTitleFontSize, 50);
    else if (mainTitle) (mainTitle as HTMLElement).style.fontSize = (StateManager.config.titleFontSize || 32) + 'px';

    // Synchronize UNIFIED game configuration panel inputs
    const selectGameMode = document.getElementById('selectGameMode') as HTMLSelectElement;
    if (selectGameMode) selectGameMode.value = StateManager.config.raffleMode ? "raffle" : "wheel";

    const chkRequireReg = document.getElementById('chkRequireRegister') as HTMLInputElement;
    if (chkRequireReg) chkRequireReg.checked = !!StateManager.config.localRequireRegister;

    const chkRemoveWinner = document.getElementById('chkRemoveWinner') as HTMLInputElement;
    if (chkRemoveWinner) chkRemoveWinner.checked = !!StateManager.config.autoRemoveWinner;

    const chkLocalSessionList = document.getElementById('chkLocalSessionListEnabled') as HTMLInputElement;
    if (chkLocalSessionList) chkLocalSessionList.checked = !!StateManager.config.localSessionListEnabled;

    const chkJoinEnabled = document.getElementById('chkJoinEnabled') as HTMLInputElement;
    if (chkJoinEnabled) chkJoinEnabled.checked = !!StateManager.config.publicJoinEnabled;

    const divQR = document.getElementById('divQRContainer');
    if (divQR) divQR.style.display = StateManager.config.publicJoinEnabled ? "block" : "none";

    const selectAfterAction = document.getElementById('selectAfterAction') as HTMLSelectElement;
    if (selectAfterAction) {
        selectAfterAction.value = StateManager.config.publicAfterAction || 'none';
        const divPromo = document.getElementById('divPromoUrl');
        if (divPromo) divPromo.style.display = selectAfterAction.value === 'promo' ? 'flex' : 'none';
    }

    const inputPromoUrl = document.getElementById('inputPromoUrl') as HTMLInputElement;
    if (inputPromoUrl) inputPromoUrl.value = StateManager.config.publicPromoUrl || '';

    const inputMaxParticipants = document.getElementById('inputMaxParticipants') as HTMLInputElement;
    if (inputMaxParticipants) inputMaxParticipants.value = (StateManager.config.publicMaxParticipants || 0).toString();

    const inputTimeLimit = document.getElementById('inputTimeLimit') as HTMLInputElement;
    if (inputTimeLimit) {
        inputTimeLimit.value = (StateManager.config.publicTimeLimit || 0).toString();
        if (!isLightningTimerRunning) {
            lightningTimeRemaining = Math.round((StateManager.config.publicTimeLimit || 3) * 60);
            updateLightningTimerDisplay();
        }
    }

    const chkLiveViewEnabled = document.getElementById('chkLiveViewEnabled') as HTMLInputElement;
    if (chkLiveViewEnabled) {
        chkLiveViewEnabled.checked = StateManager.config.publicLiveViewEnabled !== false;
        const divLive = document.getElementById('divLiveViewInlineContainer');
        if (divLive) divLive.style.display = (StateManager.config.publicLiveViewEnabled !== false) ? "block" : "none";
    }

    const chkLiveViewShowAds = document.getElementById('chkLiveViewShowAds') as HTMLInputElement;
    if (chkLiveViewShowAds) chkLiveViewShowAds.checked = StateManager.config.publicLiveViewShowAds !== false;

    const chkSyncSpinEnabled = document.getElementById('chkSyncSpinEnabled') as HTMLInputElement;
    if (chkSyncSpinEnabled) chkSyncSpinEnabled.checked = !!StateManager.config.syncSpinEnabled;

    // Timer display & configuration state
    const chkTimerEnabled = document.getElementById('chkTimerEnabled') as HTMLInputElement;
    const isTimerActive = !!StateManager.config.timerEnabled || (StateManager.config.activeSavedListId === "list_lightning_game");
    if (chkTimerEnabled) {
        chkTimerEnabled.checked = isTimerActive;
        const divTimerParams = document.getElementById('divTimerParamsContainer');
        if (divTimerParams) divTimerParams.style.display = isTimerActive ? 'block' : 'none';
    }

    const inputTimerDuration = document.getElementById('inputTimerDuration') as HTMLInputElement;
    if (inputTimerDuration) {
        inputTimerDuration.value = (StateManager.config.publicTimeLimit || 3).toString();
    }

    const chkScheduleGame = document.getElementById('chkScheduleGame') as HTMLInputElement;
    if (chkScheduleGame) {
        chkScheduleGame.checked = !!lightningScheduleTime;
        const divSchedule = document.getElementById('divScheduleTimeInput');
        if (divSchedule) divSchedule.style.display = lightningScheduleTime ? 'flex' : 'none';
        
        const inputScheduleGameTime = document.getElementById('inputScheduleGameTime') as HTMLInputElement;
        if (inputScheduleGameTime && lightningScheduleTime) {
            const d = new Date(lightningScheduleTime);
            const pad = (n: number) => n.toString().padStart(2, '0');
            const formatted = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            inputScheduleGameTime.value = formatted;
        }
    }

    syncUnifiedLiveViewUrl();
    syncEmbedSettingsUI();
    syncCenterButtonState();
    window.dispatchEvent(new CustomEvent('nexo-state-change'));
};

const syncEmbedSettingsUI = () => {
    const chkEmbedEnabled = document.getElementById('chkEmbedWidgetEnabled') as HTMLInputElement;
    const chkEmbedTitle = document.getElementById('chkEmbedShowTitle') as HTMLInputElement;
    const chkEmbedSubtitle = document.getElementById('chkEmbedShowSubtitle') as HTMLInputElement;
    const divEmbedSettings = document.getElementById('divEmbedSettingsContainer') as HTMLElement;
    const inputIframeCode = document.getElementById('inputEmbedIframeCode') as HTMLInputElement;
    const inputDirectUrl = document.getElementById('inputEmbedDirectUrl') as HTMLInputElement;
    const btnCopyIframe = document.getElementById('btnCopyEmbedIframeCode') as HTMLButtonElement;
    const btnCopyDirect = document.getElementById('btnCopyEmbedDirectUrl') as HTMLButtonElement;

    const embedEnabled = !!StateManager.config.embedWidgetEnabled;
    const showTitle = StateManager.config.embedShowTitle !== false;
    const showSubtitle = StateManager.config.embedShowSubtitle !== false;
    const isGameActive = !!StateManager.config.isGameActive;

    if (chkEmbedEnabled) {
        chkEmbedEnabled.checked = embedEnabled;
        chkEmbedEnabled.disabled = isGameActive;
        chkEmbedEnabled.style.opacity = isGameActive ? '0.4' : '1';
        chkEmbedEnabled.onchange = (e) => {
            StateManager.config.embedWidgetEnabled = (e.target as HTMLInputElement).checked;
            StateManager.save();
            syncSettingsUI();
        };
    }

    if (divEmbedSettings) {
        divEmbedSettings.style.display = embedEnabled ? 'block' : 'none';
    }

    if (chkEmbedTitle) {
        chkEmbedTitle.checked = showTitle;
        chkEmbedTitle.disabled = isGameActive;
        chkEmbedTitle.style.opacity = isGameActive ? '0.4' : '1';
        chkEmbedTitle.onchange = (e) => {
            StateManager.config.embedShowTitle = (e.target as HTMLInputElement).checked;
            StateManager.save();
            syncSettingsUI();
        };
    }

    if (chkEmbedSubtitle) {
        chkEmbedSubtitle.checked = showSubtitle;
        chkEmbedSubtitle.disabled = isGameActive;
        chkEmbedSubtitle.style.opacity = isGameActive ? '0.4' : '1';
        chkEmbedSubtitle.onchange = (e) => {
            StateManager.config.embedShowSubtitle = (e.target as HTMLInputElement).checked;
            StateManager.save();
            syncSettingsUI();
        };
    }

    const adminEmail = sessionStorage.getItem('nexo_current_user_email') || "";
    const activeListId = StateManager.config.activeSavedListId || 'list_juego_estandar';
    const urlBase = window.location.href.split('?')[0];
    const embedUrl = `${urlBase}?embed=true&admin=${encodeURIComponent(adminEmail)}&listId=${encodeURIComponent(activeListId)}`;
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="600" style="border:none; border-radius:12px; background:#000;" allow="autoplay; microphone; camera"></iframe>`;

    if (inputIframeCode) {
        inputIframeCode.value = iframeCode;
    }
    if (inputDirectUrl) {
        inputDirectUrl.value = embedUrl;
    }

    if (btnCopyIframe) {
        btnCopyIframe.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(iframeCode).then(() => {
                const originalText = btnCopyIframe.innerText;
                btnCopyIframe.innerText = "COPIADO";
                btnCopyIframe.style.background = "#00ff7f";
                btnCopyIframe.style.color = "#000";
                setTimeout(() => {
                    btnCopyIframe.innerText = originalText;
                    btnCopyIframe.style.background = "";
                    btnCopyIframe.style.color = "";
                }, 2000);
            });
        };
    }

    if (btnCopyDirect) {
        btnCopyDirect.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(embedUrl).then(() => {
                const originalText = btnCopyDirect.innerText;
                btnCopyDirect.innerText = "COPIADO";
                btnCopyDirect.style.background = "#00ff7f";
                btnCopyDirect.style.color = "#000";
                setTimeout(() => {
                    btnCopyDirect.innerText = originalText;
                    btnCopyDirect.style.background = "";
                    btnCopyDirect.style.color = "";
                }, 2000);
            });
        };
    }
};

const syncUnifiedLiveViewUrl = () => {
    const inputInline = document.getElementById('inputLiveViewInlineUrl') as HTMLInputElement;
    const btnInline = document.getElementById('btnCopyLiveViewInlineUrl') as HTMLButtonElement;
    if (!inputInline) return;

    const adminEmail = sessionStorage.getItem('nexo_current_user_email') || "";
    const urlBase = window.location.href.split('?')[0];

    if (!StateManager.config.publicSessionId) {
        StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
        StateManager.save();
    }

    const liveQuery = `live=true`
        + `&admin=${encodeURIComponent(adminEmail)}`
        + `&session=${StateManager.config.publicSessionId}`
        + `&theme=${StateManager.config.themeId}`;
    const liveViewUrl = `${urlBase}?${liveQuery}`;

    inputInline.value = liveViewUrl;

    if (btnInline) {
        btnInline.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(liveViewUrl).then(() => {
                const originalText = btnInline.innerText;
                btnInline.innerText = "COPIADO";
                btnInline.style.background = "#00ff7f";
                btnInline.style.color = "#000";
                setTimeout(() => {
                    btnInline.innerText = originalText;
                    btnInline.style.background = "";
                    btnInline.style.color = "";
                }, 2000);
            }).catch(err => {
                console.error("Failed to copy text: ", err);
            });
        };
    }
};

const syncGameSectionsUI = () => {
    if (!StateManager.config.savedPrizeLists) StateManager.config.savedPrizeLists = [];
    
    const activeId = StateManager.config.activeSavedListId || "";

    // 0. Synchronize "Juego Estándar" section
    let estandarGame = StateManager.config.savedPrizeLists.find(l => l.id === "list_juego_estandar" || l.name === "Juego Estándar");
    if (estandarGame) {
        const chkReq = document.getElementById('chkEstandarRequireRegister') as HTMLInputElement;
        const chkRem = document.getElementById('chkEstandarRemoveWinner') as HTMLInputElement;
        const chkSess = document.getElementById('chkEstandarLocalSessionListEnabled') as HTMLInputElement;
        const chkEstandarLive = document.getElementById('chkEstandarLiveViewEnabled') as HTMLInputElement;
        const chkEstandarLiveShowAds = document.getElementById('chkEstandarLiveViewShowAds') as HTMLInputElement;
        const chkEstandarJoin = document.getElementById('chkEstandarJoinEnabled') as HTMLInputElement;
        const divEstandarQR = document.getElementById('divEstandarQRContainer') as HTMLDivElement;

        if (chkReq) chkReq.checked = !!estandarGame.localRequireRegister;
        if (chkRem) chkRem.checked = !!estandarGame.autoRemoveWinner;
        if (chkSess) chkSess.checked = !!estandarGame.localSessionListEnabled;
        if (chkEstandarLive) chkEstandarLive.checked = estandarGame.publicLiveViewEnabled !== false;
        if (chkEstandarLiveShowAds) chkEstandarLiveShowAds.checked = estandarGame.publicLiveViewShowAds !== false;
        if (chkEstandarJoin) chkEstandarJoin.checked = !!estandarGame.publicJoinEnabled;
        if (divEstandarQR) divEstandarQR.style.display = estandarGame.publicJoinEnabled ? "block" : "none";
        
        // Active status badge
        const badge = document.getElementById('estandarActiveBadge');
        const btnAct = document.getElementById('btnActivateEstandar') as HTMLButtonElement;
        const isActive = activeId === estandarGame.id;
        if (badge) {
            badge.innerHTML = isActive 
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 99, 71, 0.15); color: #ff6347; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🔴 INACTIVO</span>`;
        }
        if (btnAct) {
            btnAct.style.display = isActive ? 'none' : 'block';
        }
    }
    
    // Find or seed the two main games
    let leadsGame = StateManager.config.savedPrizeLists.find(l => l.id === "list_leads_default" || l.name === "Captura de Leads");
    let raffleGame = StateManager.config.savedPrizeLists.find(l => l.id === "list_raffle_default" || l.name === "Modo Sorteo (Ruleta de Participantes)");
    
    // 1. Synchronize "Captura de Leads" section
    if (leadsGame) {
        const chkReq = document.getElementById('chkLeadsRequireRegister') as HTMLInputElement;
        const chkRem = document.getElementById('chkLeadsRemoveWinner') as HTMLInputElement;
        const chkSess = document.getElementById('chkLeadsLocalSessionListEnabled') as HTMLInputElement;
        const chkLeadsLive = document.getElementById('chkLeadsLiveViewEnabled') as HTMLInputElement;
        const chkLeadsLiveShowAds = document.getElementById('chkLeadsLiveViewShowAds') as HTMLInputElement;
        const chkLeadsJoin = document.getElementById('chkLeadsJoinEnabled') as HTMLInputElement;
        const divLeadsQR = document.getElementById('divLeadsQRContainer') as HTMLDivElement;

        if (chkReq) chkReq.checked = !!leadsGame.localRequireRegister;
        if (chkRem) chkRem.checked = !!leadsGame.autoRemoveWinner;
        if (chkSess) chkSess.checked = !!leadsGame.localSessionListEnabled;
        if (chkLeadsLive) chkLeadsLive.checked = leadsGame.publicLiveViewEnabled !== false;
        if (chkLeadsLiveShowAds) chkLeadsLiveShowAds.checked = leadsGame.publicLiveViewShowAds !== false;
        if (chkLeadsJoin) chkLeadsJoin.checked = !!leadsGame.publicJoinEnabled;
        if (divLeadsQR) divLeadsQR.style.display = leadsGame.publicJoinEnabled ? "block" : "none";
        
        // Active status badge
        const badge = document.getElementById('leadsActiveBadge');
        const btnAct = document.getElementById('btnActivateLeads') as HTMLButtonElement;
        const isActive = activeId === leadsGame.id || (!activeId && !StateManager.config.raffleMode);
        if (badge) {
            badge.innerHTML = isActive 
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 99, 71, 0.15); color: #ff6347; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🔴 INACTIVO</span>`;
        }
        if (btnAct) {
            btnAct.style.display = isActive ? 'none' : 'block';
        }
    }
    
    // 2. Synchronize "Modo Sorteo (Ruleta de Participantes)" section
    if (raffleGame) {
        const chkReq = document.getElementById('chkRaffleRequireRegister') as HTMLInputElement;
        const chkRem = document.getElementById('chkRaffleRemoveWinner') as HTMLInputElement;
        const chkSess = document.getElementById('chkRaffleLocalSessionListEnabled') as HTMLInputElement;
        const chkRaffleLive = document.getElementById('chkRaffleLiveViewEnabled') as HTMLInputElement;
        const chkRaffleLiveShowAds = document.getElementById('chkRaffleLiveViewShowAds') as HTMLInputElement;
        const chkRaffleJoin = document.getElementById('chkRaffleJoinEnabled') as HTMLInputElement;
        const divRaffleQR = document.getElementById('divRaffleQRContainer') as HTMLDivElement;

        if (chkReq) chkReq.checked = !!raffleGame.localRequireRegister;
        if (chkRem) chkRem.checked = !!raffleGame.autoRemoveWinner;
        if (chkSess) chkSess.checked = !!raffleGame.localSessionListEnabled;
        if (chkRaffleLive) chkRaffleLive.checked = raffleGame.publicLiveViewEnabled !== false;
        if (chkRaffleLiveShowAds) chkRaffleLiveShowAds.checked = raffleGame.publicLiveViewShowAds !== false;
        if (chkRaffleJoin) chkRaffleJoin.checked = !!raffleGame.publicJoinEnabled;
        if (divRaffleQR) divRaffleQR.style.display = raffleGame.publicJoinEnabled ? "block" : "none";
        
        // Active status badge
        const badge = document.getElementById('raffleActiveBadge');
        const btnAct = document.getElementById('btnActivateRaffle') as HTMLButtonElement;
        const btnEdit = document.getElementById('btnRaffleEditPrizes') as HTMLButtonElement;
        const isActive = activeId === raffleGame.id || (activeId === "" && !!StateManager.config.raffleMode);
        if (badge) {
            badge.innerHTML = isActive 
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 99, 71, 0.15); color: #ff6347; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🔴 INACTIVO</span>`;
        }
        if (btnAct) {
            btnAct.style.display = isActive ? 'none' : 'block';
        }
        if (btnEdit) {
            btnEdit.innerText = "CONFIGURAR PREMIOS";
        }
    }
    
    // 3. Synchronize "Participación Pública (Modo QR)" section
    let publicGame = StateManager.config.savedPrizeLists.find(l => l.id === activeId);
    if (!publicGame) {
        publicGame = StateManager.config.savedPrizeLists.find(l => l.id === "list_juego_estandar");
    }
    if (publicGame) {
        const publicHeading = document.querySelector('#sectionPublicJoin h4') as HTMLElement;
        if (publicHeading) {
            publicHeading.innerText = `Participación Pública & QR: ${publicGame.name}`;
        }

        const chkReg = document.getElementById('chkPublicRegister') as HTMLInputElement;
        const chkRem = document.getElementById('chkPublicRemoveWinner') as HTMLInputElement;
        const chkSess = document.getElementById('chkPublicSessionListEnabled') as HTMLInputElement;
        const chkJoin = document.getElementById('chkPublicJoinEnabled') as HTMLInputElement;
        const chkLive = document.getElementById('chkPublicLiveViewEnabled') as HTMLInputElement;
        const chkPublicLiveViewShowAds = document.getElementById('chkPublicLiveViewShowAds') as HTMLInputElement;
        const selectAction = document.getElementById('selectPublicAfterAction') as HTMLSelectElement;
        const inputPromo = document.getElementById('inputPublicPromoUrl') as HTMLInputElement;
        const divPromo = document.getElementById('divPublicPromoUrl') as HTMLDivElement;
        const inputMax = document.getElementById('inputPublicMaxParticipants') as HTMLInputElement;
        const inputTime = document.getElementById('inputPublicTimeLimit') as HTMLInputElement;
        const chkSync = document.getElementById('chkSyncSpinEnabled') as HTMLInputElement;
        const chkPublicRaffle = document.getElementById('chkPublicRaffleMode') as HTMLInputElement;

        if (chkJoin) chkJoin.checked = !!publicGame.publicJoinEnabled;
        if (chkReg) chkReg.checked = publicGame.publicRegisterEnabled !== false;
        if (chkRem) chkRem.checked = !!publicGame.publicRemoveWinner;
        if (chkSess) chkSess.checked = !!publicGame.publicSessionListEnabled;
        if (chkLive) chkLive.checked = publicGame.publicLiveViewEnabled !== false;
        if (chkPublicLiveViewShowAds) chkPublicLiveViewShowAds.checked = publicGame.publicLiveViewShowAds !== false;
        if (chkSync) chkSync.checked = !!publicGame.syncSpinEnabled;
        if (chkPublicRaffle) chkPublicRaffle.checked = !!publicGame.raffleMode;

        if (selectAction) {
            selectAction.value = publicGame.publicAfterAction || 'none';
            if (divPromo) {
                divPromo.style.display = selectAction.value === 'promo' ? 'flex' : 'none';
            }
        }
        if (inputPromo) inputPromo.value = publicGame.publicPromoUrl || '';
        if (inputMax) inputMax.value = (publicGame.publicMaxParticipants || 0).toString();
        if (inputTime) inputTime.value = (publicGame.publicTimeLimit || 0).toString();

        // Active status badge
        const badge = document.getElementById('publicActiveBadge');
        const btnAct = document.getElementById('btnActivatePublic') as HTMLButtonElement;
        const isActive = !!publicGame.publicJoinEnabled;
        if (badge) {
            badge.innerHTML = isActive 
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 99, 71, 0.15); color: #ff6347; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🔴 INACTIVO</span>`;
        }
        if (btnAct) {
            btnAct.style.display = 'none'; // No longer need separate activate button for universal section
        }
    }

    // 4. Synchronize "Juego Relámpago" section
    let lightningGame = StateManager.config.savedPrizeLists.find(l => l.id === "list_lightning_game" || l.name === "Juego Relámpago");
    if (lightningGame) {
        const chkReg = document.getElementById('chkLightningRegister') as HTMLInputElement;
        const chkRem = document.getElementById('chkLightningRemoveWinner') as HTMLInputElement;
        const chkSess = document.getElementById('chkLightningSessionListEnabled') as HTMLInputElement;
        const chkJoin = document.getElementById('chkLightningJoinEnabled') as HTMLInputElement;
        const chkLive = document.getElementById('chkLightningLiveViewEnabled') as HTMLInputElement;
        const chkLightningLiveViewShowAds = document.getElementById('chkLightningLiveViewShowAds') as HTMLInputElement;
        const selectAction = document.getElementById('selectLightningAfterAction') as HTMLSelectElement;
        const inputPromo = document.getElementById('inputLightningPromoUrl') as HTMLInputElement;
        const divPromo = document.getElementById('divLightningPromoUrl') as HTMLDivElement;
        const inputMax = document.getElementById('inputLightningMaxParticipants') as HTMLInputElement;
        const inputTime = document.getElementById('inputLightningTimeLimit') as HTMLInputElement;
        const chkSync = document.getElementById('chkLightningSyncSpinEnabled') as HTMLInputElement;
        const chkLightningRaffle = document.getElementById('chkLightningRaffleMode') as HTMLInputElement;

        if (chkJoin) chkJoin.checked = !!lightningGame.publicJoinEnabled;
        if (chkReg) chkReg.checked = lightningGame.publicRegisterEnabled !== false;
        if (chkRem) chkRem.checked = !!lightningGame.publicRemoveWinner;
        if (chkSess) chkSess.checked = !!lightningGame.publicSessionListEnabled;
        if (chkLive) chkLive.checked = lightningGame.publicLiveViewEnabled !== false;
        if (chkLightningLiveViewShowAds) chkLightningLiveViewShowAds.checked = lightningGame.publicLiveViewShowAds !== false;
        if (chkSync) chkSync.checked = !!lightningGame.syncSpinEnabled;
        if (chkLightningRaffle) chkLightningRaffle.checked = !!lightningGame.raffleMode;

        if (selectAction) {
            selectAction.value = lightningGame.publicAfterAction || 'none';
            if (divPromo) {
                divPromo.style.display = selectAction.value === 'promo' ? 'flex' : 'none';
            }
        }
        if (inputPromo) inputPromo.value = lightningGame.publicPromoUrl || '';
        if (inputMax) inputMax.value = (lightningGame.publicMaxParticipants || 0).toString();
        if (inputTime) inputTime.value = (lightningGame.publicTimeLimit || 0).toString();

        // Active status badge
        const badge = document.getElementById('lightningActiveBadge');
        const btnAct = document.getElementById('btnActivateLightning') as HTMLButtonElement;
        const isActive = activeId === lightningGame.id;
        if (badge) {
            badge.innerHTML = isActive 
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 99, 71, 0.15); color: #ff6347; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🔴 INACTIVO</span>`;
        }
        if (btnAct) {
            btnAct.style.display = isActive ? 'none' : 'block';
        }
    }

    // Toggle on-screen countdown timer container based on whether "Juego Relámpago" is active or timer is enabled globally
    const timerContainer = document.getElementById('lightningTimerContainer');
    const appMainElement = document.getElementById('appMain');
    const isTimerActiveGlobally = !!StateManager.config.timerEnabled || (activeId === "list_lightning_game");
    if (timerContainer) {
        timerContainer.style.display = isTimerActiveGlobally ? 'flex' : 'none';
    }
    if (appMainElement) {
        if (isTimerActiveGlobally) {
            appMainElement.classList.add('has-lightning-timer');
        } else {
            appMainElement.classList.remove('has-lightning-timer');
        }
    }

    // Real-Time Stats HUD Synchronization
    // 0. Juego Estándar Stats
    if (estandarGame) {
        const spanCount = document.getElementById('estandarPrizesCount');
        const divStatus = document.getElementById('estandarStatusIndicator');
        const count = estandarGame.prizes ? estandarGame.prizes.length : 0;
        if (spanCount) {
            spanCount.innerText = `${count} ${count === 1 ? 'opción' : 'opciones'}`;
        }
        if (divStatus) {
            const isActive = activeId === estandarGame.id;
            if (isActive) {
                divStatus.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00ff7f; animation: pulse 1s infinite;"></span>
                    <span style="font-size: 0.55rem; color: #00ff7f; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">¡Listo para girar!</span>
                `;
            } else {
                divStatus.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #666;"></span>
                    <span style="font-size: 0.55rem; color: #666; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Inactivo</span>
                `;
            }
        }
    }

    // 1. Captura de Leads Stats
    if (leadsGame) {
        const spanCount = document.getElementById('leadsCapturedCount');
        const divStatus = document.getElementById('leadsStatusIndicator');
        
        let leadsCount = 0;
        if (StateManager.config.winnersHistory) {
            leadsCount = StateManager.config.winnersHistory.filter(h => h.lead && (!leadsGame.publicSessionId || h.publicSessionId === leadsGame.publicSessionId)).length;
        }
        
        if (spanCount) {
            spanCount.innerText = `${leadsCount} ${leadsCount === 1 ? 'registro' : 'registrados'}`;
        }
        if (divStatus) {
            const isActive = activeId === leadsGame.id || (!activeId && !StateManager.config.raffleMode);
            if (!isActive) {
                divStatus.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #666;"></span>
                    <span style="font-size: 0.55rem; color: #666; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Inactivo</span>
                `;
            } else if (leadsCount === 0) {
                divStatus.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ff6347; animation: pulse 1.5s infinite;"></span>
                    <span style="font-size: 0.55rem; color: #ff6347; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Esperando registros</span>
                `;
            } else {
                divStatus.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00ff7f; animation: pulse 1s infinite;"></span>
                    <span style="font-size: 0.55rem; color: #00ff7f; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Registros activos</span>
                `;
            }
        }
    }

    // 2. Modo Sorteo Stats
    if (raffleGame) {
        const spanCount = document.getElementById('raffleParticipantsCount');
        const divStatus = document.getElementById('raffleStatusIndicator');
        
        const isDefaultPrize = (name: string) => {
            const n = name.toUpperCase().trim();
            return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                   n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                   n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
        };
        const actualParticipants = raffleGame.prizes ? raffleGame.prizes.filter((p: any) => !isDefaultPrize(p.name)) : [];
        const count = actualParticipants.length;
        
        if (spanCount) {
            spanCount.innerText = `${count} ${count === 1 ? 'registrado' : 'registrados'}`;
        }
        if (divStatus) {
            const isActive = activeId === raffleGame.id || (activeId === "" && !!StateManager.config.raffleMode);
            if (!isActive) {
                divStatus.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #666;"></span>
                    <span style="font-size: 0.55rem; color: #666; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Inactivo</span>
                `;
            } else if (count === 0) {
                divStatus.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ff6347; animation: pulse 1.5s infinite;"></span>
                    <span style="font-size: 0.55rem; color: #ff6347; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Esperando registros</span>
                `;
            } else {
                divStatus.innerHTML = `
                    <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00ff7f; animation: pulse 1s infinite;"></span>
                    <span style="font-size: 0.55rem; color: #00ff7f; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">¡Listo para girar!</span>
                `;
            }
        }
    }

    syncScheduledTimeHUD();
    syncUnifiedLiveViewUrl();

    // Sync Report Mode: Dimming, disabling options and setting toggle checked states
    const activeReportGameId = StateManager.config.activeReportGameId || null;
    const gameConfigs = [
        { id: "list_juego_estandar", toggleId: "estandarReportToggle", containerId: "containerEstandar" },
        { id: "list_leads_default", toggleId: "leadsReportToggle", containerId: "containerLeads" },
        { id: "list_raffle_default", toggleId: "raffleReportToggle", containerId: "containerRaffle" },
        { id: "list_public_qr_default", toggleId: "publicReportToggle", containerId: "sectionPublicJoin" },
        { id: "list_lightning_game", toggleId: "lightningReportToggle", containerId: "sectionLightningJoin" }
    ];

    gameConfigs.forEach(gc => {
        const toggle = document.getElementById(gc.toggleId) as HTMLInputElement;
        const container = document.getElementById(gc.containerId);
        
        if (toggle) {
            toggle.checked = (activeReportGameId === gc.id);
        }
        
        if (container) {
            container.classList.remove('config-section-dimmed');
            container.classList.remove('config-options-disabled');
            
            if (activeReportGameId) {
                if (activeReportGameId === gc.id) {
                    container.classList.add('config-options-disabled');
                } else {
                    container.classList.add('config-section-dimmed');
                }
            }
        }
    });
};

const setupGameSectionListeners = () => {
    // 0. Juego Estándar checkbox listeners
    const chkEstandarReq = document.getElementById('chkEstandarRequireRegister') as HTMLInputElement;
    const chkEstandarRem = document.getElementById('chkEstandarRemoveWinner') as HTMLInputElement;
    const chkEstandarSess = document.getElementById('chkEstandarLocalSessionListEnabled') as HTMLInputElement;
    const chkEstandarLive = document.getElementById('chkEstandarLiveViewEnabled') as HTMLInputElement;
    const chkEstandarLiveShowAds = document.getElementById('chkEstandarLiveViewShowAds') as HTMLInputElement;
    const chkEstandarJoin = document.getElementById('chkEstandarJoinEnabled') as HTMLInputElement;
    
    const updateEstandarConfig = () => {
        let estandarGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_juego_estandar" || l.name === "Juego Estándar");
        if (estandarGame) {
            if (chkEstandarReq) {
                estandarGame.localRequireRegister = chkEstandarReq.checked;
                estandarGame.publicRegisterEnabled = chkEstandarReq.checked;
            }
            if (chkEstandarRem) estandarGame.autoRemoveWinner = chkEstandarRem.checked;
            if (chkEstandarSess) estandarGame.localSessionListEnabled = chkEstandarSess.checked;
            if (chkEstandarLive) estandarGame.publicLiveViewEnabled = chkEstandarLive.checked;
            if (chkEstandarLiveShowAds) estandarGame.publicLiveViewShowAds = chkEstandarLiveShowAds.checked;
            if (chkEstandarJoin) estandarGame.publicJoinEnabled = chkEstandarJoin.checked;
            
            // If active, sync to active config
            const isActive = StateManager.config.activeSavedListId === estandarGame.id;
            if (isActive) {
                StateManager.config.localRequireRegister = estandarGame.localRequireRegister;
                StateManager.config.publicRegisterEnabled = estandarGame.localRequireRegister;
                StateManager.config.autoRemoveWinner = estandarGame.autoRemoveWinner;
                StateManager.config.localSessionListEnabled = estandarGame.localSessionListEnabled;
                StateManager.config.publicLiveViewEnabled = estandarGame.publicLiveViewEnabled;
                StateManager.config.publicLiveViewShowAds = estandarGame.publicLiveViewShowAds;
                StateManager.config.publicJoinEnabled = estandarGame.publicJoinEnabled;
            }
            StateManager.save();
            syncSettingsUI();
            syncGameSectionsUI();
        }
    };
    
    if (chkEstandarReq) chkEstandarReq.onchange = updateEstandarConfig;
    if (chkEstandarRem) chkEstandarRem.onchange = updateEstandarConfig;
    if (chkEstandarSess) chkEstandarSess.onchange = updateEstandarConfig;
    if (chkEstandarLive) chkEstandarLive.onchange = updateEstandarConfig;
    if (chkEstandarLiveShowAds) chkEstandarLiveShowAds.onchange = updateEstandarConfig;
    if (chkEstandarJoin) chkEstandarJoin.onchange = updateEstandarConfig;

    // 1. Captura de Leads checkbox listeners
    const chkLeadsReq = document.getElementById('chkLeadsRequireRegister') as HTMLInputElement;
    const chkLeadsRem = document.getElementById('chkLeadsRemoveWinner') as HTMLInputElement;
    const chkLeadsSess = document.getElementById('chkLeadsLocalSessionListEnabled') as HTMLInputElement;
    const chkLeadsLive = document.getElementById('chkLeadsLiveViewEnabled') as HTMLInputElement;
    const chkLeadsLiveShowAds = document.getElementById('chkLeadsLiveViewShowAds') as HTMLInputElement;
    const chkLeadsJoin = document.getElementById('chkLeadsJoinEnabled') as HTMLInputElement;
    
    const updateLeadsConfig = () => {
        let leadsGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_leads_default" || l.name === "Captura de Leads");
        if (leadsGame) {
            if (chkLeadsReq) leadsGame.localRequireRegister = chkLeadsReq.checked;
            if (chkLeadsRem) leadsGame.autoRemoveWinner = chkLeadsRem.checked;
            if (chkLeadsSess) leadsGame.localSessionListEnabled = chkLeadsSess.checked;
            if (chkLeadsLive) leadsGame.publicLiveViewEnabled = chkLeadsLive.checked;
            if (chkLeadsLiveShowAds) leadsGame.publicLiveViewShowAds = chkLeadsLiveShowAds.checked;
            if (chkLeadsJoin) leadsGame.publicJoinEnabled = chkLeadsJoin.checked;
            
            // If active, sync to active config
            const isActive = StateManager.config.activeSavedListId === leadsGame.id || (!StateManager.config.activeSavedListId && !StateManager.config.raffleMode);
            if (isActive) {
                StateManager.config.localRequireRegister = leadsGame.localRequireRegister;
                StateManager.config.autoRemoveWinner = leadsGame.autoRemoveWinner;
                StateManager.config.localSessionListEnabled = leadsGame.localSessionListEnabled;
                StateManager.config.publicLiveViewEnabled = leadsGame.publicLiveViewEnabled;
                StateManager.config.publicLiveViewShowAds = leadsGame.publicLiveViewShowAds;
                StateManager.config.publicJoinEnabled = leadsGame.publicJoinEnabled;
            }
            StateManager.save();
            syncSettingsUI();
            syncGameSectionsUI();
        }
    };
    
    if (chkLeadsReq) chkLeadsReq.onchange = updateLeadsConfig;
    if (chkLeadsRem) chkLeadsRem.onchange = updateLeadsConfig;
    if (chkLeadsSess) chkLeadsSess.onchange = updateLeadsConfig;
    if (chkLeadsLive) chkLeadsLive.onchange = updateLeadsConfig;
    if (chkLeadsLiveShowAds) chkLeadsLiveShowAds.onchange = updateLeadsConfig;
    if (chkLeadsJoin) chkLeadsJoin.onchange = updateLeadsConfig;
    
    // 2. Modo Sorteo checkbox listeners
    const chkRaffleReq = document.getElementById('chkRaffleRequireRegister') as HTMLInputElement;
    const chkRaffleRem = document.getElementById('chkRaffleRemoveWinner') as HTMLInputElement;
    const chkRaffleSess = document.getElementById('chkRaffleLocalSessionListEnabled') as HTMLInputElement;
    const chkRaffleLive = document.getElementById('chkRaffleLiveViewEnabled') as HTMLInputElement;
    const chkRaffleLiveShowAds = document.getElementById('chkRaffleLiveViewShowAds') as HTMLInputElement;
    const chkRaffleJoin = document.getElementById('chkRaffleJoinEnabled') as HTMLInputElement;
    
    const updateRaffleConfig = () => {
        let raffleGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_raffle_default" || l.name === "Modo Sorteo (Ruleta de Participantes)");
        if (raffleGame) {
            if (chkRaffleReq) raffleGame.localRequireRegister = chkRaffleReq.checked;
            if (chkRaffleRem) raffleGame.autoRemoveWinner = chkRaffleRem.checked;
            if (chkRaffleSess) raffleGame.localSessionListEnabled = chkRaffleSess.checked;
            if (chkRaffleLive) raffleGame.publicLiveViewEnabled = chkRaffleLive.checked;
            if (chkRaffleLiveShowAds) raffleGame.publicLiveViewShowAds = chkRaffleLiveShowAds.checked;
            if (chkRaffleJoin) raffleGame.publicJoinEnabled = chkRaffleJoin.checked;
            
            // If active, sync to active config
            const isActive = StateManager.config.activeSavedListId === raffleGame.id || (StateManager.config.activeSavedListId === "" && StateManager.config.raffleMode);
            if (isActive) {
                StateManager.config.localRequireRegister = raffleGame.localRequireRegister;
                StateManager.config.autoRemoveWinner = raffleGame.autoRemoveWinner;
                StateManager.config.localSessionListEnabled = raffleGame.localSessionListEnabled;
                StateManager.config.publicLiveViewEnabled = raffleGame.publicLiveViewEnabled;
                StateManager.config.publicLiveViewShowAds = raffleGame.publicLiveViewShowAds;
                StateManager.config.publicJoinEnabled = raffleGame.publicJoinEnabled;
            }
            StateManager.save();
            syncSettingsUI();
            syncGameSectionsUI();
        }
    };
    
    if (chkRaffleReq) chkRaffleReq.onchange = updateRaffleConfig;
    if (chkRaffleRem) chkRaffleRem.onchange = updateRaffleConfig;
    if (chkRaffleSess) chkRaffleSess.onchange = updateRaffleConfig;
    if (chkRaffleLive) chkRaffleLive.onchange = updateRaffleConfig;
    if (chkRaffleLiveShowAds) chkRaffleLiveShowAds.onchange = updateRaffleConfig;
    if (chkRaffleJoin) chkRaffleJoin.onchange = updateRaffleConfig;

    // 3. Participación Pública (Modo QR) listeners
    const chkPublicReg = document.getElementById('chkPublicRegister') as HTMLInputElement;
    const chkPublicRem = document.getElementById('chkPublicRemoveWinner') as HTMLInputElement;
    const chkPublicSess = document.getElementById('chkPublicSessionListEnabled') as HTMLInputElement;
    const chkPublicJoin = document.getElementById('chkPublicJoinEnabled') as HTMLInputElement;
    const chkPublicLive = document.getElementById('chkPublicLiveViewEnabled') as HTMLInputElement;
    const chkPublicLiveShowAds = document.getElementById('chkPublicLiveViewShowAds') as HTMLInputElement;
    const selectPublicAction = document.getElementById('selectPublicAfterAction') as HTMLSelectElement;
    const inputPublicPromo = document.getElementById('inputPublicPromoUrl') as HTMLInputElement;
    const inputPublicMax = document.getElementById('inputPublicMaxParticipants') as HTMLInputElement;
    const inputPublicTime = document.getElementById('inputPublicTimeLimit') as HTMLInputElement;
    const chkSyncSpin = document.getElementById('chkSyncSpinEnabled') as HTMLInputElement;
    const chkPublicRaffle = document.getElementById('chkPublicRaffleMode') as HTMLInputElement;

    const updatePublicConfig = () => {
        const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
        let publicGame = StateManager.config.savedPrizeLists?.find(l => l.id === activeId);
        if (publicGame) {
            if (chkPublicReg) publicGame.publicRegisterEnabled = chkPublicReg.checked;
            if (chkPublicRem) publicGame.publicRemoveWinner = chkPublicRem.checked;
            if (chkPublicSess) publicGame.publicSessionListEnabled = chkPublicSess.checked;
            if (chkPublicJoin) publicGame.publicJoinEnabled = chkPublicJoin.checked;
            if (chkPublicLive) publicGame.publicLiveViewEnabled = chkPublicLive.checked;
            if (chkPublicLiveShowAds) publicGame.publicLiveViewShowAds = chkPublicLiveShowAds.checked;
            if (selectPublicAction) publicGame.publicAfterAction = selectPublicAction.value as any;
            if (inputPublicPromo) publicGame.publicPromoUrl = inputPublicPromo.value.trim();
            if (inputPublicMax) publicGame.publicMaxParticipants = parseInt(inputPublicMax.value) || 0;
            if (inputPublicTime) publicGame.publicTimeLimit = parseInt(inputPublicTime.value) || 0;
            if (chkSyncSpin) publicGame.syncSpinEnabled = chkSyncSpin.checked;
            if (chkPublicRaffle) publicGame.raffleMode = chkPublicRaffle.checked;

            // Sync aliases
            publicGame.localRequireRegister = publicGame.publicRegisterEnabled;
            publicGame.autoRemoveWinner = publicGame.publicRemoveWinner;
            publicGame.localSessionListEnabled = publicGame.publicSessionListEnabled;

            // If active, sync to active config
            const isActive = activeId === publicGame.id;
            if (isActive) {
                StateManager.config.publicJoinEnabled = publicGame.publicJoinEnabled;
                StateManager.config.publicRegisterEnabled = publicGame.publicRegisterEnabled;
                StateManager.config.publicRemoveWinner = publicGame.publicRemoveWinner;
                StateManager.config.publicSessionListEnabled = publicGame.publicSessionListEnabled;
                StateManager.config.publicLiveViewEnabled = publicGame.publicLiveViewEnabled;
                StateManager.config.publicLiveViewShowAds = publicGame.publicLiveViewShowAds;
                StateManager.config.publicAfterAction = publicGame.publicAfterAction;
                StateManager.config.publicPromoUrl = publicGame.publicPromoUrl;
                StateManager.config.publicMaxParticipants = publicGame.publicMaxParticipants;
                StateManager.config.publicTimeLimit = publicGame.publicTimeLimit;
                StateManager.config.syncSpinEnabled = publicGame.syncSpinEnabled;
                StateManager.config.raffleMode = publicGame.raffleMode;

                // Also update active root parameters so other parts of the app behave correctly
                StateManager.config.localRequireRegister = publicGame.publicRegisterEnabled;
                StateManager.config.autoRemoveWinner = publicGame.publicRemoveWinner;
                StateManager.config.localSessionListEnabled = publicGame.publicSessionListEnabled;

                // Sync active prizes list based on raffleMode
                if (StateManager.config.raffleMode) {
                    const isDefaultPrize = (name: string) => {
                        const n = name.toUpperCase().trim();
                        return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                               n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                               n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
                    };
                    StateManager.config.prizes = StateManager.config.prizes.filter(p => !isDefaultPrize(p.name));
                } else {
                    if (StateManager.config.prizes.length === 0) {
                        const validPrizes = publicGame.prizes.filter(p => p.name && p.name.trim() !== "");
                        if (validPrizes.length > 0) {
                            StateManager.config.prizes = JSON.parse(JSON.stringify(validPrizes));
                        } else {
                            StateManager.config.prizes = [
                                { name: "PREMIO 1" },
                                { name: "PREMIO 2" },
                                { name: "PREMIO 3" },
                                { name: "PREMIO 4" }
                            ];
                        }
                    }
                }
                
                // Keep session ids or other parameters updated
                if (publicGame.publicJoinEnabled && !StateManager.config.publicSessionId) {
                    StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                    StateManager.config.publicSpinsCount = 0;
                    if (publicGame.publicTimeLimit && publicGame.publicTimeLimit > 0) {
                        StateManager.config.publicSessionExpiry = Date.now() + publicGame.publicTimeLimit * 60 * 1000;
                    } else {
                        StateManager.config.publicSessionExpiry = 0;
                    }
                } else if (!publicGame.publicJoinEnabled) {
                    StateManager.config.publicSessionId = "";
                    StateManager.config.publicSessionExpiry = 0;
                    StateManager.config.publicSpinsCount = 0;
                }
                
                // Write back to publicGame to isolate session ID per game
                publicGame.publicSessionId = StateManager.config.publicSessionId || "";
                publicGame.publicSessionExpiry = StateManager.config.publicSessionExpiry || 0;
                publicGame.publicSpinsCount = StateManager.config.publicSpinsCount || 0;
            }
            StateManager.save();
            syncSettingsUI();
            syncGameSectionsUI();
            updateRaffleButtonVisibility();
            updateRaffleLayoutClasses();
            updatePublicSessionStatusDisplay();
            if (typeof appWheel !== 'undefined' && appWheel && typeof appWheel.draw === 'function') {
                appWheel.draw();
            }
        }
    };

    if (chkPublicReg) chkPublicReg.onchange = updatePublicConfig;
    if (chkPublicRem) chkPublicRem.onchange = updatePublicConfig;
    if (chkPublicSess) chkPublicSess.onchange = updatePublicConfig;
    if (chkPublicJoin) chkPublicJoin.onchange = updatePublicConfig;
    if (chkPublicLive) chkPublicLive.onchange = updatePublicConfig;
    if (selectPublicAction) selectPublicAction.onchange = updatePublicConfig;
    if (inputPublicPromo) inputPublicPromo.oninput = updatePublicConfig;
    if (inputPublicMax) inputPublicMax.oninput = updatePublicConfig;
    if (inputPublicTime) inputPublicTime.oninput = updatePublicConfig;
    if (chkSyncSpin) chkSyncSpin.onchange = updatePublicConfig;
    if (chkPublicRaffle) chkPublicRaffle.onchange = updatePublicConfig;

    // 4. Juego Relámpago Config and Listeners
    const chkLightningReg = document.getElementById('chkLightningRegister') as HTMLInputElement;
    const chkLightningRem = document.getElementById('chkLightningRemoveWinner') as HTMLInputElement;
    const chkLightningSess = document.getElementById('chkLightningSessionListEnabled') as HTMLInputElement;
    const chkLightningJoin = document.getElementById('chkLightningJoinEnabled') as HTMLInputElement;
    const chkLightningLive = document.getElementById('chkLightningLiveViewEnabled') as HTMLInputElement;
    const chkLightningLiveShowAds = document.getElementById('chkLightningLiveViewShowAds') as HTMLInputElement;
    const selectLightningAction = document.getElementById('selectLightningAfterAction') as HTMLSelectElement;
    const inputLightningPromo = document.getElementById('inputLightningPromoUrl') as HTMLInputElement;
    const divLightningPromo = document.getElementById('divLightningPromoUrl') as HTMLDivElement;
    const inputLightningMax = document.getElementById('inputLightningMaxParticipants') as HTMLInputElement;
    const inputLightningTime = document.getElementById('inputLightningTimeLimit') as HTMLInputElement;
    const chkLightningSync = document.getElementById('chkLightningSyncSpinEnabled') as HTMLInputElement;
    const chkLightningRaffle = document.getElementById('chkLightningRaffleMode') as HTMLInputElement;

    const updateLightningConfig = () => {
        let lightningGame = StateManager.config.savedPrizeLists?.find(l => l.id === "list_lightning_game");
        if (lightningGame) {
            if (chkLightningReg) lightningGame.publicRegisterEnabled = chkLightningReg.checked;
            if (chkLightningRem) lightningGame.publicRemoveWinner = chkLightningRem.checked;
            if (chkLightningSess) lightningGame.publicSessionListEnabled = chkLightningSess.checked;
            if (chkLightningJoin) lightningGame.publicJoinEnabled = chkLightningJoin.checked;
            if (chkLightningLive) lightningGame.publicLiveViewEnabled = chkLightningLive.checked;
            if (chkLightningLiveShowAds) lightningGame.publicLiveViewShowAds = chkLightningLiveShowAds.checked;
            if (selectLightningAction) {
                lightningGame.publicAfterAction = selectLightningAction.value as any;
                if (divLightningPromo) {
                    divLightningPromo.style.display = selectLightningAction.value === 'promo' ? 'flex' : 'none';
                }
            }
            if (inputLightningPromo) lightningGame.publicPromoUrl = inputLightningPromo.value.trim();
            if (inputLightningMax) lightningGame.publicMaxParticipants = parseInt(inputLightningMax.value) || 0;
            if (inputLightningTime) {
                const parsed = parseFloat(inputLightningTime.value) || 0;
                lightningGame.publicTimeLimit = parsed;
                // Sincronizar el temporizador en pantalla
                lightningTimeRemaining = Math.round(parsed * 60);
                updateLightningTimerDisplay();
            }
            if (chkLightningSync) lightningGame.syncSpinEnabled = chkLightningSync.checked;
            if (chkLightningRaffle) lightningGame.raffleMode = chkLightningRaffle.checked;

            // Sync aliases to avoid any cross contamination and keep local/public config uniform
            lightningGame.localRequireRegister = lightningGame.publicRegisterEnabled;
            lightningGame.autoRemoveWinner = lightningGame.publicRemoveWinner;
            lightningGame.localSessionListEnabled = lightningGame.publicSessionListEnabled;

            // If active, sync to active config
            const isActive = StateManager.config.activeSavedListId === "list_lightning_game";
            if (isActive) {
                StateManager.config.publicJoinEnabled = lightningGame.publicJoinEnabled;
                StateManager.config.publicRegisterEnabled = lightningGame.publicRegisterEnabled;
                StateManager.config.publicRemoveWinner = lightningGame.publicRemoveWinner;
                StateManager.config.publicSessionListEnabled = lightningGame.publicSessionListEnabled;
                StateManager.config.publicLiveViewEnabled = lightningGame.publicLiveViewEnabled;
                StateManager.config.publicLiveViewShowAds = lightningGame.publicLiveViewShowAds;
                StateManager.config.publicAfterAction = lightningGame.publicAfterAction;
                StateManager.config.publicPromoUrl = lightningGame.publicPromoUrl;
                StateManager.config.publicMaxParticipants = lightningGame.publicMaxParticipants;
                StateManager.config.publicTimeLimit = lightningGame.publicTimeLimit;
                StateManager.config.syncSpinEnabled = lightningGame.syncSpinEnabled;
                StateManager.config.raffleMode = lightningGame.raffleMode;

                // Root parameters
                StateManager.config.localRequireRegister = lightningGame.publicRegisterEnabled;
                StateManager.config.autoRemoveWinner = lightningGame.publicRemoveWinner;
                StateManager.config.localSessionListEnabled = lightningGame.publicSessionListEnabled;

                // Sync active prizes list based on raffleMode
                if (StateManager.config.raffleMode) {
                    const isDefaultPrize = (name: string) => {
                        const n = name.toUpperCase().trim();
                        return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                               n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                               n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
                    };
                    StateManager.config.prizes = StateManager.config.prizes.filter(p => !isDefaultPrize(p.name));
                } else {
                    if (StateManager.config.prizes.length === 0) {
                        const validPrizes = lightningGame.prizes.filter(p => p.name && p.name.trim() !== "");
                        if (validPrizes.length > 0) {
                            StateManager.config.prizes = JSON.parse(JSON.stringify(validPrizes));
                        } else {
                            StateManager.config.prizes = [
                                { name: "PREMIO 1" },
                                { name: "PREMIO 2" },
                                { name: "PREMIO 3" },
                                { name: "PREMIO 4" }
                            ];
                        }
                    }
                }

                // Manage sessions
                if (lightningGame.publicJoinEnabled && !StateManager.config.publicSessionId) {
                    StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
                    StateManager.config.publicSpinsCount = 0;
                    if (lightningGame.publicTimeLimit && lightningGame.publicTimeLimit > 0) {
                        StateManager.config.publicSessionExpiry = Date.now() + lightningGame.publicTimeLimit * 60 * 1000;
                    } else {
                        StateManager.config.publicSessionExpiry = 0;
                    }
                } else if (!lightningGame.publicJoinEnabled) {
                    StateManager.config.publicSessionId = "";
                    StateManager.config.publicSessionExpiry = 0;
                    StateManager.config.publicSpinsCount = 0;
                }

                lightningGame.publicSessionId = StateManager.config.publicSessionId || "";
                lightningGame.publicSessionExpiry = StateManager.config.publicSessionExpiry || 0;
                lightningGame.publicSpinsCount = StateManager.config.publicSpinsCount || 0;
            }

            StateManager.save();
            syncSettingsUI();
            syncGameSectionsUI();
            updateRaffleButtonVisibility();
            updateRaffleLayoutClasses();
            updateLightningSessionStatusDisplay();
            if (typeof appWheel !== 'undefined' && appWheel && typeof appWheel.draw === 'function') {
                appWheel.draw();
            }
        }
    };

    if (chkLightningReg) chkLightningReg.onchange = updateLightningConfig;
    if (chkLightningRem) chkLightningRem.onchange = updateLightningConfig;
    if (chkLightningSess) chkLightningSess.onchange = updateLightningConfig;
    if (chkLightningJoin) chkLightningJoin.onchange = updateLightningConfig;
    if (chkLightningLive) chkLightningLive.onchange = updateLightningConfig;
    if (selectLightningAction) selectLightningAction.onchange = updateLightningConfig;
    if (inputLightningPromo) inputLightningPromo.oninput = updateLightningConfig;
    if (inputLightningMax) inputLightningMax.oninput = updateLightningConfig;
    if (inputLightningTime) inputLightningTime.oninput = updateLightningConfig;
    if (chkLightningSync) chkLightningSync.onchange = updateLightningConfig;
    if (chkLightningRaffle) chkLightningRaffle.onchange = updateLightningConfig;

    // 5. Game Report Toggles Click Listeners with Password Authentication
    const reportGameConfigs = [
        { id: "list_juego_estandar", toggleId: "estandarReportToggle", name: "Juego Estándar" },
        { id: "list_leads_default", toggleId: "leadsReportToggle", name: "Captura de Leads" },
        { id: "list_raffle_default", toggleId: "raffleReportToggle", name: "Modo Sorteo" },
        { id: "list_public_qr_default", toggleId: "publicReportToggle", name: "Participación Pública (Modo QR)" },
        { id: "list_lightning_game", toggleId: "lightningReportToggle", name: "Juego Relámpago" }
    ];

    reportGameConfigs.forEach(gc => {
        const toggle = document.getElementById(gc.toggleId) as HTMLInputElement;
        if (toggle) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault(); // Pause to authenticate
                
                const activeId = StateManager.config.activeReportGameId || null;
                const isActivating = (activeId !== gc.id);
                
                if (activeId && activeId !== gc.id) {
                    showCustomAlert("Hay otra sesión de reporte activa. Por favor, desactiva la otra sesión primero.", "OPERACIÓN RECHAZADA");
                    return;
                }
                
                executeWithAuth(() => {
                    if (isActivating) {
                        const list = StateManager.config.savedPrizeLists?.find(l => l.id === gc.id);
                        if (list) {
                            const newSessionId = "session_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                            list.localSessionId = newSessionId;
                            StateManager.config.localSessionId = newSessionId;
                        }
                        StateManager.config.activeReportGameId = gc.id;
                        StateManager.config.activeSavedListId = gc.id;
                        
                        // Sync raffle mode flag
                        if (gc.id === "list_raffle_default") {
                            StateManager.config.raffleMode = true;
                        } else {
                            StateManager.config.raffleMode = false;
                        }
                        
                        StateManager.save();
                        loadGameById(gc.id, true, true); // Silent auto-start loading
                        
                        showCustomAlert(`La sesión de reporte para "${gc.name}" se ha iniciado correctamente. Las opciones se han bloqueado y otros juegos están deshabilitados.`, "SESIÓN INICIADA");
                    } else {
                        StateManager.config.activeReportGameId = null;
                        StateManager.save();
                        syncGameSectionsUI();
                        
                        showCustomAlert(`La sesión de reporte para "${gc.name}" ha finalizado con éxito. El informe inmutable ya está disponible en la pestaña de Estadísticas.`, "SESIÓN FINALIZADA");
                    }
                });
            });
        }
    });
};

let activeConfigPollingIntervalId: any = null;

const applyIncomingConfig = async (newConfig: any, userEmail: string) => {
    // Evitar colisión si guardamos localmente hace poco (evita que el sondeo/tiempo real sobreescriba cambios rápidos del cliente)
    if (StateManager.lastSaveTime && (Date.now() - StateManager.lastSaveTime < 2500)) {
        console.log("[Sync] Ignorando actualización entrante de la nube para evitar colisiones con cambios locales recientes.");
        return;
    }

    // Actualizar la configuración en memoria
    StateManager.config = newConfig;

    // Sincronizar el giro si está activo en tiempo real
    const activeId = newConfig.activeSavedListId || "list_juego_estandar";
    const activeGame = newConfig.savedPrizeLists?.find((l: any) => l.id === activeId);
    const isSyncSpinEnabled = activeGame ? !!activeGame.syncSpinEnabled : !!newConfig.syncSpinEnabled;

    if (isSyncSpinEnabled && newConfig.syncSpinState) {
        const state = newConfig.syncSpinState;
        const lastProcessedTimestamp = parseInt(localStorage.getItem('nexo_last_processed_sync_spin') || '0');
        
        if (state.status === 'spinning' && state.timestamp > lastProcessedTimestamp) {
            localStorage.setItem('nexo_last_processed_sync_spin', String(state.timestamp));
            
            if (appWheel && !appWheel.isSpinning) {
                appWheel.spin(state.winnerIdx, true);
            }
        }
    }

    // Cachear localmente de forma encriptada
    try {
        const workspaceKey = "nexo_pro_workspace_" + btoa(userEmail.toLowerCase()).substring(0, 16);
        const encrypted = await Security.encrypt(newConfig);
        localStorage.setItem(workspaceKey, encrypted);
    } catch (e) {
        console.error("Error al guardar caché local tras actualización en tiempo real:", e);
    }

    // Sincronizar toda la UI para reflejar los cambios de inmediato sin recargar
    applyActiveThemeColors(); 
    updateRaffleButtonVisibility(); 
    updateRaffleLayoutClasses();
    
    syncSettingsUI();
    syncGameSectionsUI();
    renderSavedLists();
    renderFormFieldsEditor();
    renderDynamicRegistrationForm();
    
    // Si la función generatePrizeInputs está disponible, refrescar los inputs del editor de premios
    if (typeof generatePrizeInputs === 'function') {
        generatePrizeInputs(StateManager.config.prizes);
    }

    // Si está en la pestaña de ajustes de colores, actualizar los valores de los selectores de color
    const current = StateManager.config.themeCustomizations[StateManager.config.themeId];
    if (current) {
        const inputThemePrimary = document.getElementById('themePrimaryColor') as HTMLInputElement;
        const inputThemeSecondary = document.getElementById('themeSecondaryColor') as HTMLInputElement;
        if (inputThemePrimary) inputThemePrimary.value = current.primary;
        if (inputThemeSecondary) inputThemeSecondary.value = current.secondary;
    }

    // Forzar redibujado de la ruleta si no se encuentra en medio de un giro activo
    if (appWheel && !appWheel.isSpinning) {
        appWheel.draw();
    }

    // Sincronizar la suscripción de giros en tiempo real para el sorteo activo
    syncSorteoSpinSubscription();

    // Despachar evento global para actualización en tiempo real de publicidad, fondos, etc.
    window.dispatchEvent(new CustomEvent('nexo-config-realtime'));
};

const startConfigPolling = (userEmail: string) => {
    if (activeConfigPollingIntervalId) {
        clearInterval(activeConfigPollingIntervalId);
    }

    activeConfigPollingIntervalId = setInterval(async () => {
        try {
            const latestConfig = await fetchConfigFromSupabase(userEmail);
            if (latestConfig) {
                const currentConfigStr = JSON.stringify(StateManager.config);
                const latestConfigStr = JSON.stringify(latestConfig);
                
                if (currentConfigStr !== latestConfigStr) {
                    console.log("[Polling Sync Fallback] Sincronización robusta: Cambios detectados en la nube. Actualizando...");
                    await applyIncomingConfig(latestConfig, userEmail);
                }
            }
        } catch (err) {
            console.error("[Polling Sync Fallback] Error en consulta de respaldo:", err);
        }
    }, 1200); // Consulta cada 1.2 segundos para mantener una latencia extremadamente baja de respaldo
};

let activeSorteoSubscription: any = null;

function syncSorteoSpinSubscription() {
    if (!isSupabaseConfigured) return;
    
    if (activeSorteoSubscription) {
        activeSorteoSubscription.unsubscribe();
        activeSorteoSubscription = null;
    }
    
    const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
    console.log(`[Sorteo Sync] Suscribiendo a cambios remotos de giros para el juego: ${activeId}`);
    
    activeSorteoSubscription = subscribeToSorteoChanges(activeId, async (updatedSorteo) => {
        console.log(`[Sorteo Sync] Cambio detectado para el sorteo activo ${activeId}:`, updatedSorteo);
        
        let localIndex = StateManager.config.savedPrizeLists?.findIndex((l: any) => l.id === activeId);
        let hasChanges = false;
        
        if (localIndex === -1 || localIndex === undefined) {
            hasChanges = true;
        } else {
            const list = StateManager.config.savedPrizeLists[localIndex];
            hasChanges = 
                list.name !== updatedSorteo.name ||
                JSON.stringify(list.prizes) !== JSON.stringify(updatedSorteo.prizes) ||
                JSON.stringify(list.formFields) !== JSON.stringify(updatedSorteo.form_fields) ||
                !!list.localRequireRegister !== !!updatedSorteo.local_require_register ||
                !!list.autoRemoveWinner !== !!updatedSorteo.auto_remove_winner ||
                !!list.localSessionListEnabled !== !!updatedSorteo.local_session_list_enabled ||
                (list.localSessionId || '') !== (updatedSorteo.local_session_id || '') ||
                !!list.raffleMode !== !!updatedSorteo.raffle_mode;
        }
        
        if (!hasChanges) {
            console.log(`[Sorteo Sync] No hay cambios reales detectados para el sorteo ${activeId}. Omitiendo guardado.`);
        } else {
            console.log(`[Sorteo Sync] Cambios confirmados para el sorteo ${activeId}. Actualizando estado local...`);
            if (localIndex === -1 || localIndex === undefined) {
                if (!StateManager.config.savedPrizeLists) StateManager.config.savedPrizeLists = [];
                StateManager.config.savedPrizeLists.push({
                    id: updatedSorteo.id,
                    name: updatedSorteo.name,
                    prizes: updatedSorteo.prizes,
                    formFields: updatedSorteo.form_fields,
                    localRequireRegister: updatedSorteo.local_require_register,
                    autoRemoveWinner: updatedSorteo.auto_remove_winner,
                    localSessionListEnabled: updatedSorteo.local_session_list_enabled,
                    localSessionId: updatedSorteo.local_session_id || '',
                    raffleMode: updatedSorteo.raffle_mode
                });
                localIndex = StateManager.config.savedPrizeLists.length - 1;
            } else {
                const list = StateManager.config.savedPrizeLists[localIndex];
                list.name = updatedSorteo.name;
                list.prizes = updatedSorteo.prizes;
                list.formFields = updatedSorteo.form_fields;
                list.localRequireRegister = updatedSorteo.local_require_register;
                list.autoRemoveWinner = updatedSorteo.auto_remove_winner;
                list.localSessionListEnabled = updatedSorteo.local_session_list_enabled;
                list.localSessionId = updatedSorteo.local_session_id || '';
                list.raffleMode = updatedSorteo.raffle_mode;
            }
            
            if (StateManager.config.activeSavedListId === activeId) {
                StateManager.config.prizes = JSON.parse(JSON.stringify(updatedSorteo.prizes));
                StateManager.config.formFields = JSON.parse(JSON.stringify(updatedSorteo.form_fields));
                StateManager.config.localRequireRegister = updatedSorteo.local_require_register;
                StateManager.config.autoRemoveWinner = updatedSorteo.auto_remove_winner;
                StateManager.config.localSessionListEnabled = updatedSorteo.local_session_list_enabled;
                StateManager.config.localSessionId = updatedSorteo.local_session_id || '';
                StateManager.config.raffleMode = updatedSorteo.raffle_mode;
                
                StateManager.save();
                appWheel.draw();
                syncGameSectionsUI();
            }
        }
        
        if (updatedSorteo.spin_state && updatedSorteo.spin_state.trigger_spin) {
            console.log(`[Sorteo Sync] ¡GIRO REMOTO DETECTADO para ${activeId}! Ejecutando...`);
            
            const resetSpinState = { is_spinning: true, trigger_spin: false, timestamp: Date.now().toString() };
            await updateSorteoSpinState(activeId, resetSpinState);
            
            if (!appWheel.isSpinning) {
                triggerAdminSpin();
            }
        }

        if (updatedSorteo.timer_state) {
            const remoteTimer = updatedSorteo.timer_state;
            
            // Sincronizar programación de fecha y hora
            if (remoteTimer.hasOwnProperty('schedule_time')) {
                const remoteSchedule = remoteTimer.schedule_time;
                if (remoteSchedule !== lightningScheduleTime) {
                    lightningScheduleTime = remoteSchedule;
                    syncScheduledTimeHUD();
                    
                    // Asegurar que el temporizador programado esté corriendo o parado
                    if (lightningScheduleTime) {
                        const chkSchedule = document.getElementById('chkScheduleLightning') as HTMLInputElement;
                        if (chkSchedule) chkSchedule.checked = true;
                        const divScheduleConfig = document.getElementById('divScheduleLightningConfig');
                        if (divScheduleConfig) divScheduleConfig.style.display = 'block';
                        const txtStatus = document.getElementById('txtScheduleStatus');
                        if (txtStatus) txtStatus.innerText = "Programado...";
                        
                        timerController.setScheduleTime(lightningScheduleTime, triggerScheduledActivation);
                    } else {
                        const chkSchedule = document.getElementById('chkScheduleLightning') as HTMLInputElement;
                        if (chkSchedule) chkSchedule.checked = false;
                        const divScheduleConfig = document.getElementById('divScheduleLightningConfig');
                        if (divScheduleConfig) divScheduleConfig.style.display = 'none';
                        const txtStatus = document.getElementById('txtScheduleStatus');
                        if (txtStatus) txtStatus.innerText = "Sin programar";
                        
                        timerController.cancelSchedule();
                    }
                }
            }

            // Sincronizar temporizador de cuenta regresiva
            const isLocalAdmin = sessionStorage.getItem('nexo_current_user_role') === 'superadmin' || sessionStorage.getItem('nexo_current_user_role') === 'admin';
            
            // Solo actualizamos de forma reactiva si NO somos el Admin que activó la acción (para evitar bucles de red de rebote)
            if (!isLocalAdmin) {
                const now = Date.now();
                const remoteIsRunning = !!remoteTimer.is_running;
                const remoteTimeRemaining = parseInt(remoteTimer.time_remaining as any) || 0;
                const remoteTimestamp = parseInt(remoteTimer.timestamp as any) || 0;
                
                let calculatedRemaining = remoteTimeRemaining;
                if (remoteIsRunning && remoteTimestamp > 0) {
                    // Si está corriendo, restamos el desfase de tiempo transcurrido desde el último update
                    const elapsedSecs = Math.floor((now - remoteTimestamp) / 1000);
                    calculatedRemaining = Math.max(0, remoteTimeRemaining - elapsedSecs);
                }
                
                timerController.setTimeRemaining(calculatedRemaining);
                
                if (remoteIsRunning) {
                    timerController.start();
                } else {
                    timerController.stop();
                }
            }
        }
    });
};

(window as any).syncSorteoSpinSubscription = syncSorteoSpinSubscription;

const initApp = async () => {
    await StateManager.load(); 

    if (isSupabaseConfigured) {
        const userEmail = sessionStorage.getItem('nexo_current_user_email');
        if (userEmail) {
            // Check if Super Admin and cache it in sessionStorage
            checkIfSuperAdmin(userEmail).then(isSuper => {
                sessionStorage.setItem('nexo_current_user_role', isSuper ? 'superadmin' : 'admin');
                sessionStorage.setItem('nexo_is_super_admin', isSuper ? 'true' : 'false');
            }).catch(err => {
                console.warn("Error verifying super admin on startup:", err);
            });

            // Suscribirse vía Supabase Realtime
            subscribeToConfigChanges(userEmail, async (newConfig) => {
                console.log("Cambio de configuración en tiempo real detectado. Aplicando actualizados...");
                await applyIncomingConfig(newConfig, userEmail);
            });

            // Suscribirse a giros remotos del sorteo activo
            syncSorteoSpinSubscription();

            // Y además iniciar el bucle de respaldo robusto de sondeo rápido de Supabase (Sincronización robusta)
            startConfigPolling(userEmail);

            // Suscribirse a cambios multimedia en tiempo real (imágenes y videos)
            subscribeToMediaChanges(userEmail, async (mediaKey, dataUrl) => {
                console.log(`[Media Realtime] Sincronizando asset: ${mediaKey}`);
                try {
                    if (!dataUrl) {
                        if (mediaKey.startsWith('theme_logo_')) {
                            const themeId = mediaKey.substring('theme_logo_'.length);
                            if (StateManager.config.themeCustomizations[themeId]) {
                                StateManager.config.themeCustomizations[themeId].logo = undefined;
                            }
                        } else if (mediaKey.startsWith('theme_bg_')) {
                            const themeId = mediaKey.substring('theme_bg_'.length);
                            if (StateManager.config.themeCustomizations[themeId]) {
                                StateManager.config.themeCustomizations[themeId].bg = undefined;
                            }
                        }
                        applyActiveThemeColors();
                        window.dispatchEvent(new CustomEvent('nexo-media-realtime', { detail: { mediaKey, dataUrl: '' } }));
                        return;
                    }

                    if (mediaKey.startsWith('theme_logo_')) {
                        const themeId = mediaKey.substring('theme_logo_'.length);
                        if (StateManager.config.themeCustomizations[themeId]) {
                            StateManager.config.themeCustomizations[themeId].logo = dataUrl;
                        }
                    } else if (mediaKey.startsWith('theme_bg_')) {
                        const themeId = mediaKey.substring('theme_bg_'.length);
                        if (StateManager.config.themeCustomizations[themeId]) {
                            StateManager.config.themeCustomizations[themeId].bg = dataUrl;
                        }
                    }

                    applyActiveThemeColors();
                    window.dispatchEvent(new CustomEvent('nexo-media-realtime', { detail: { mediaKey, dataUrl } }));
                } catch (err) {
                    console.warn(`[Media Realtime] Error al aplicar cambio de media en tiempo real para ${mediaKey}:`, err);
                }
            });
        }
    }

    startSyncSpinPolling();
    applyActiveThemeColors(); 
    updateRaffleButtonVisibility(); 
    updateRaffleLayoutClasses();
    
    syncSettingsUI();
    syncGameSectionsUI();
    setupGameSectionListeners();
    
    perfilController.initMenuSecurityHandler();
    
    initTabs(); 
    initSubTabs(); 
    initTitleHandlers();  
    initThemeHandlers(); 
    initRegistrationHandlers(); 
    initPublicidadHandlers(); 
    controllerInitAuthHandlers(); 
    initSecurityVerification(); 
    setupInactivityEvents();
    verifyGlobalLicense(); 
    initSubscriptionHandlers();
    viewInitSuperAdminHandlers();
    initPublicJoinHandlers();
    initLightningJoinHandlers();
    initEstandarJoinHandlers();
    initLeadsJoinHandlers();
    initRaffleJoinHandlers();
    setupTimerInteractionListeners();

    const btnExportWS = document.getElementById('btnExportWorkspace');
    if (btnExportWS) btnExportWS.onclick = exportWorkspace;

    const btnImportTrigger = document.getElementById('btnImportWorkspaceTrigger');
    const inputImportWS = document.getElementById('inputImportWorkspace') as HTMLInputElement;
    if (btnImportTrigger && inputImportWS) {
        btnImportTrigger.onclick = () => inputImportWS.click();
        inputImportWS.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) importWorkspace(file);
        };
    }

    const btnPurge = document.getElementById('btnPurgeHistory');
    if (btnPurge) btnPurge.onclick = () => {
        executeWithAuth(() => {
            showCustomConfirm("¡ATENCIÓN! Se borrará todo el historial para este dispositivo.", () => {
                leadsController.purgeLeadsHistory(() => {
                    renderLeadsList();
                    renderAnalytics();
                    showCustomAlert("Historial purgado con éxito.", "SISTEMA LIMPIO");
                });
            });
        });
    };

    if (document.getElementById('btnExportCSV')) {
        document.getElementById('btnExportCSV')!.onclick = () => {
            leadsController.exportLeads('csv', exportCSVFunction);
        };
    }

    // Inicializar sistema de almacenamiento y auditoría
    renderAuditLogs();
    updateStorageUsage();
    
    window.addEventListener('nexo-optimize-storage', () => {
        executeWithAuth(optimizeStorage);
    });
    
    const btnOptimize = document.getElementById('btnOptimizeStorage');
    if (btnOptimize) btnOptimize.onclick = () => executeWithAuth(optimizeStorage);
    
    const btnClearLogs = document.getElementById('btnClearAuditLog');
    if (btnClearLogs) {
        btnClearLogs.onclick = () => {
            executeWithAuth(() => {
                showCustomConfirm("¿Seguro que deseas limpiar el registro de acciones de auditoría?", () => {
                    StateManager.config.auditLog = [];
                    StateManager.save();
                    renderAuditLogs();
                    updateStorageUsage();
                    showCustomAlert("Log de auditoría limpiado.", "LIMPIEZA COMPLETADA");
                });
            });
        };
    }

    renderAnalytics();
    initSistema();
};

const initSecurityVerification = () => {
    const btnConfirmVerify = document.getElementById('btnConfirmVerify');
    const btnCancelVerify = document.getElementById('btnCancelVerify');
    const inputVerifyPin = document.getElementById('verifyPin') as HTMLInputElement;
    const modalVerify = document.getElementById('modalVerify');
    if (btnConfirmVerify) btnConfirmVerify.onclick = () => {
        const sessionPin = sessionStorage.getItem('nexo_current_session_pin');
        if (sessionPin && inputVerifyPin.value === sessionPin) {
            if (modalVerify) modalVerify.style.display = 'none';
            inputVerifyPin.value = "";
            if (currentAuthCallback) { currentAuthCallback(); currentAuthCallback = null; }
        } else { showCustomAlert("CONTRASEÑA INCORRECTA", "SEGURIDAD"); inputVerifyPin.value = ""; }
    };
    if (btnCancelVerify) btnCancelVerify.onclick = () => {
        if (modalVerify) modalVerify.style.display = 'none'; inputVerifyPin.value = ""; currentAuthCallback = null;
    };
    inputVerifyPin.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnConfirmVerify?.click(); });
};

const executeWithAuth = (callback: () => void) => {
    currentAuthCallback = callback;
    const modalVerify = document.getElementById('modalVerify');
    const inputVerifyPin = document.getElementById('verifyPin') as HTMLInputElement;
    if (modalVerify) modalVerify.style.display = 'flex'; if (inputVerifyPin) inputVerifyPin.focus();
};

const initThemeHandlers = () => {
    perfilController.initThemeHandlers();
};

const initTitleHandlers = () => {
    const chkAutoFit = document.getElementById('chkAutoFit') as HTMLInputElement;
    if (chkAutoFit) chkAutoFit.onchange = (e) => {
        const isChecked = (e.target as HTMLInputElement).checked;
        const titleSizeInput = document.getElementById('inputFontSize');
        if(titleSizeInput) {
            (titleSizeInput as HTMLInputElement).style.opacity = isChecked ? "0.3" : "1";
            (titleSizeInput as HTMLInputElement).style.pointerEvents = isChecked ? "none" : "auto";
        }
    };
};

const applyBackground = (url: string) => {
    if (url && url.trim() !== "") {
        document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${url})`; 
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
    } else {
        document.body.style.backgroundImage = "radial-gradient(circle, #1a1a1a 1px, transparent 1px), radial-gradient(circle, #1a1a1a 1px, transparent 1px)";
        document.body.style.backgroundSize = "40px 40px";
        document.body.style.backgroundAttachment = "initial";
    }
};

const applyLogoToWheel = (url: string) => {
    syncCenterButtonState();
};

const btnOpenMenuEl = document.getElementById('btnOpenMenu');
if (btnOpenMenuEl) {
    const handleMenuClick = (e: Event) => {
        e.stopPropagation();
        menuController.handleOpenMenu({
            menuSecurityEnabled: !!StateManager.config.menuSecurityEnabled,
            onOpen: () => {
                if (document.getElementById('modalConfig')) {
                    document.getElementById('modalConfig')!.style.display = 'flex';
                    sessionStorage.setItem('nexo_menu_open', 'true');
                }
            },
            onAuthRequired: (callback) => {
                executeWithAuth(callback);
            }
        });
    };
    btnOpenMenuEl.addEventListener('click', handleMenuClick);
    btnOpenMenuEl.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    btnOpenMenuEl.addEventListener('pointerdown', (e) => e.stopPropagation(), { passive: true });
}

// Configurar gestos modulares de doble clic/toque en áreas vacías para alternar pantalla completa
fullscreenController.setupDoubleTapGesture();

// Intentar pantalla completa automática con el primer gesto del usuario
const attemptAutomaticFullscreen = (e?: Event) => {
    if (e && e.target) {
        const target = e.target as HTMLElement;
        // Evitar activar pantalla completa si la interacción ocurre dentro del menú, login, configuración, modales o controles de formulario
        if (
            target.id === 'btnOpenMenu' || target.closest('#btnOpenMenu') ||
            target.id === 'loginScreen' || target.closest('#loginScreen') ||
            target.id === 'modalConfig' || target.closest('#modalConfig') ||
            target.id === 'modalWinner' || target.closest('#modalWinner') ||
            ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'LABEL'].includes(target.tagName)
        ) {
            return;
        }
    }
    if (!fullscreenController.isFullscreen()) {
        fullscreenController.enter().catch(err => {
            console.warn("Auto-fullscreen bloqueado o no soportado:", err);
        });
    }
    document.removeEventListener('click', attemptAutomaticFullscreen);
    document.removeEventListener('touchstart', attemptAutomaticFullscreen);
    document.removeEventListener('pointerdown', attemptAutomaticFullscreen);
};
document.addEventListener('click', attemptAutomaticFullscreen);
document.addEventListener('touchstart', attemptAutomaticFullscreen);
document.addEventListener('pointerdown', attemptAutomaticFullscreen);

// Ocultamiento por inactividad de botones interactivos (Menú)
let appInactivityTimeoutId: any = undefined;

const showAppInteractiveButtons = () => {
    const btnMenu = document.getElementById('btnOpenMenu');
    if (btnMenu) {
        btnMenu.style.opacity = '1';
        btnMenu.style.pointerEvents = 'auto';
    }
};

const hideAppInteractiveButtons = () => {
    const btnMenu = document.getElementById('btnOpenMenu');
    
    // Solo ocultar si no se está visualizando un modal abierto o configuración
    const modalConfig = document.getElementById('modalConfig');
    if (modalConfig && modalConfig.style.display === 'flex') {
        return; // No ocultar si la configuración está abierta
    }
    
    if (btnMenu) {
        btnMenu.style.opacity = '0';
        btnMenu.style.pointerEvents = 'none';
    }
};

const resetAppInactivityTimer = () => {
    showAppInteractiveButtons();
    if (appInactivityTimeoutId) {
        clearTimeout(appInactivityTimeoutId);
    }
    appInactivityTimeoutId = setTimeout(() => {
        hideAppInteractiveButtons();
    }, 3500); // 3.5 segundos de inactividad
};

// Escuchar eventos de interacción para reiniciar temporizador
const appActivityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'pointerdown', 'scroll'];
appActivityEvents.forEach(evt => {
    window.addEventListener(evt, resetAppInactivityTimer, { passive: true });
});

// Inicializar el temporizador al cargar
resetAppInactivityTimer();
if (document.getElementById('btnCloseConfig')) document.getElementById('btnCloseConfig')!.onclick = () => {
    if (document.getElementById('modalConfig')) {
        document.getElementById('modalConfig')!.style.display = 'none';
        sessionStorage.setItem('nexo_menu_open', 'false');
    }
};
if (document.getElementById('chkRemoveWinner')) (document.getElementById('chkRemoveWinner') as HTMLInputElement).onchange = (e) => {
    StateManager.config.autoRemoveWinner = (e.target as HTMLInputElement).checked; StateManager.save();
};
const congratsCardEl = document.getElementById('congratsCard');
if (congratsCardEl) {
    congratsCardEl.addEventListener('nexo-congrats-card-close', () => {
        if (isGuestMode) {
            if (document.getElementById('modalWinner')) document.getElementById('modalWinner')!.style.display = 'none';
            
            showGuestBlockScreen("GRACIAS POR PARTICIPAR", `Tu premio es: <b style="font-size: 1.5rem; color: var(--gold);">${localStorage.getItem(`nexo_guest_played_${guestSessionId}`)}</b><br><br>Muestra esta pantalla al personal para reclamar tu premio.<br><br><span style="font-size: 0.75rem; color: #666;">Sesión: ${guestSessionId}</span>`);
            
            const userEmail = sessionStorage.getItem('nexo_current_user_email');
            if (userEmail && guestMaxParticipants > 0 && (StateManager.config.publicSpinsCount || 0) >= guestMaxParticipants) {
                showGuestBlockScreen("LÍMITE DE PARTICIPANTES ALCANZADO", "Se ha alcanzado el límite de participantes configurado para esta sesión.");
            }
            return;
        }
        if(StateManager.config.autoRemoveWinner && appWheel.winnerIdx !== undefined) {
            StateManager.config.prizes.splice(appWheel.winnerIdx, 1); if(StateManager.config.prizes.length === 0) StateManager.config.prizes = [{ name: "FIN" }];
            syncActiveGamePrizesToSavedLists();
            StateManager.save(); appWheel.draw();
        }
        if (document.getElementById('modalWinner')) document.getElementById('modalWinner')!.style.display = 'none';
        if(StateManager.config.adQrEnabled) showQrModal();
    });
}

if (document.getElementById('btnCloseQR')) document.getElementById('btnCloseQR')!.onclick = () => {
    const modal = document.getElementById('modalQR');
    if (modal) modal.style.display = 'none';
};

const renderLeadsList = () => {
    dispatchStateChange();
};

const exportCSVFunction = () => {
    serviceExportCSV(showCustomAlert);
};

const exportTXTFunction = () => {
    serviceExportTXT(showCustomAlert);
};

const exportIMGFunction = () => {
    serviceExportIMG(showCustomAlert);
};

// Removed old general editor button handler since each game has its own specific editor

const renderSavedLists = () => {
    const select = document.getElementById('selectSavedLists') as HTMLSelectElement;
    if (!select) return;
    
    if (!StateManager.config.savedPrizeLists) StateManager.config.savedPrizeLists = [];
    
    if (StateManager.config.savedPrizeLists.length === 0) {
        select.innerHTML = `<option value="">SIN LISTAS GUARDADAS</option>`;
        return;
    }

    const sortedLists = [...StateManager.config.savedPrizeLists].sort((a, b) => {
        if (a.id === "list_juego_estandar") return -1;
        if (b.id === "list_juego_estandar") return 1;
        return 0;
    });

    select.innerHTML = sortedLists.map(list => {
        const suffix = list.raffleMode ? "REGISTRADOS" : "PREMIOS";
        return `<option value="${list.id}">${list.name} (${list.prizes.length} ${suffix})</option>`;
    }).join("");
};

const loadGameById = (id: string, isAutoStart: boolean = false, isSilent: boolean = false) => {
    if (!StateManager.config.savedPrizeLists) StateManager.config.savedPrizeLists = [];
    const list = StateManager.config.savedPrizeLists.find(l => l.id === id);
    if (!list) return;
    
    let loadedPrizes = JSON.parse(JSON.stringify(list.prizes));
    if (list.raffleMode) {
        const isDefaultPrize = (name: string) => {
            const n = name.toUpperCase().trim();
            return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                   n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                   n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
        };
        loadedPrizes = loadedPrizes.filter((p: any) => !isDefaultPrize(p.name));
    }
    
    // 1. Generate prize inputs in the editor modal
    generatePrizeInputs(loadedPrizes);
    
    // 2. Load settings of the game into active StateManager.config
    StateManager.config.prizes = loadedPrizes;
    
    if (list.formFields) {
        StateManager.config.formFields = JSON.parse(JSON.stringify(list.formFields));
    } else {
        // Default fields if list doesn't have custom ones yet
        StateManager.config.formFields = JSON.parse(JSON.stringify(INITIAL_DEFAULT_CONFIG.formFields));
    }
    
    StateManager.config.localRequireRegister = list.localRequireRegister !== undefined ? list.localRequireRegister : false;
    StateManager.config.autoRemoveWinner = list.autoRemoveWinner !== undefined ? list.autoRemoveWinner : false;
    StateManager.config.localSessionListEnabled = list.localSessionListEnabled !== undefined ? list.localSessionListEnabled : false;
    StateManager.config.raffleMode = list.raffleMode !== undefined ? list.raffleMode : false;

    // Load public settings
    StateManager.config.publicJoinEnabled = list.publicJoinEnabled !== undefined ? list.publicJoinEnabled : false;
    StateManager.config.publicRegisterEnabled = list.publicRegisterEnabled !== undefined ? list.publicRegisterEnabled : false;
    StateManager.config.publicRemoveWinner = list.publicRemoveWinner !== undefined ? list.publicRemoveWinner : false;
    StateManager.config.publicSessionListEnabled = list.publicSessionListEnabled !== undefined ? list.publicSessionListEnabled : false;
    StateManager.config.publicLiveViewEnabled = list.publicLiveViewEnabled !== undefined ? list.publicLiveViewEnabled : false;
    StateManager.config.publicAfterAction = list.publicAfterAction !== undefined ? list.publicAfterAction : 'none';
    StateManager.config.publicPromoUrl = list.publicPromoUrl !== undefined ? list.publicPromoUrl : '';
    StateManager.config.publicMaxParticipants = list.publicMaxParticipants !== undefined ? list.publicMaxParticipants : 0;
    StateManager.config.publicTimeLimit = list.publicTimeLimit !== undefined ? list.publicTimeLimit : 0;
    StateManager.config.syncSpinEnabled = list.syncSpinEnabled !== undefined ? list.syncSpinEnabled : false;
    
    // Load existing session properties from game list if any
    StateManager.config.publicSessionId = list.publicSessionId || "";
    StateManager.config.publicSessionExpiry = list.publicSessionExpiry || 0;
    StateManager.config.publicSpinsCount = list.publicSpinsCount || 0;

    // Manage public session id
    if (StateManager.config.publicJoinEnabled) {
        if (!StateManager.config.publicSessionId) {
            StateManager.config.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
            StateManager.config.publicSpinsCount = 0;
            if (StateManager.config.publicTimeLimit && StateManager.config.publicTimeLimit > 0) {
                StateManager.config.publicSessionExpiry = Date.now() + StateManager.config.publicTimeLimit * 60 * 1000;
            } else {
                StateManager.config.publicSessionExpiry = 0;
            }
        }
        // Save back to list
        list.publicSessionId = StateManager.config.publicSessionId;
        list.publicSessionExpiry = StateManager.config.publicSessionExpiry;
        list.publicSpinsCount = StateManager.config.publicSpinsCount;
        startSyncSpinPolling();
    } else {
        if (!StateManager.config.syncSpinEnabled) {
            stopSyncSpinPolling();
        }
    }
    
    // Ensure a localSessionId exists for this game session to separate reports
    StateManager.config.localSessionId = list.localSessionId || "local_" + Date.now().toString();
    // Save the list back with its generated localSessionId if it didn't have one
    if (!list.localSessionId) {
        list.localSessionId = StateManager.config.localSessionId;
    }
    
    StateManager.config.activeSavedListId = list.id;

    StateManager.save();
    if (typeof appWheel !== 'undefined' && appWheel && typeof appWheel.draw === 'function') {
        appWheel.draw();
    }
    
    // Reset local registration state when loading a game
    hasRegisteredLocally = false;
    pendingLocalLead = null;
    syncCenterButtonState();
    
    // Sync UI toggles and titles
    syncSettingsUI();
    syncGameSectionsUI();
    updateRaffleButtonVisibility();
    updateRaffleLayoutClasses();
    renderLeadsList();
    
    if (list.id === "list_lightning_game") {
        resetLightningTimer();
    } else {
        stopLightningTimer();
    }
    updateLightningSessionStatusDisplay();
    
    if (!isSilent) {
        if (isAutoStart) {
            showCustomAlertAutoDismiss("Juego Cargado con Exito", "ÉXITO", 1200);
        } else {
            showCustomAlert(`JUEGO "${list.name}" CARGADO COMPLETAMENTE CON SU CONFIGURACIÓN PROPIA`, "ÉXITO");
        }
    }
};

// @ts-ignore
window.loadGameById = loadGameById;

if (document.getElementById('btnLoadSelectedList')) document.getElementById('btnLoadSelectedList')!.onclick = () => {
    const select = document.getElementById('selectSavedLists') as HTMLSelectElement;
    const id = select.value;
    if (id) loadGameById(id);
};

// FACTORY DEFAULTS FOR RESET GAME ACTION
const FACTORY_DEFAULTS = {
    list_juego_estandar: {
        id: "list_juego_estandar",
        name: "Juego Estándar",
        prizes: [
            { name: "DESCUENTO 10%" },
            { name: "PREMIO SORPRESA" },
            { name: "INTÉNTALO OTRA VEZ" },
            { name: "ENVÍO GRATIS" },
            { name: "REGALO ESPECIAL" },
            { name: "CUPÓN DE $5" }
        ],
        formFields: [
            { id: "nombre", label: "Nombre Completo", placeholder: "Ej: Juan Pérez" },
            { id: "telefono", label: "Teléfono / WhatsApp", placeholder: "Ej: 0998877665" },
            { id: "email", label: "Correo Electrónico", placeholder: "Ej: juan@mail.com" }
        ],
        localRequireRegister: false,
        autoRemoveWinner: false,
        localSessionListEnabled: false,
        raffleMode: false,
        publicJoinEnabled: false,
        publicRegisterEnabled: false,
        publicRemoveWinner: false,
        publicSessionListEnabled: false,
        publicLiveViewEnabled: false,
        publicAfterAction: 'none' as const,
        publicPromoUrl: '',
        publicMaxParticipants: 0,
        publicTimeLimit: 0,
        syncSpinEnabled: false
    },
    list_leads_default: {
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
        raffleMode: false,
        publicJoinEnabled: false,
        publicRegisterEnabled: false,
        publicRemoveWinner: false,
        publicSessionListEnabled: false,
        publicLiveViewEnabled: false,
        publicAfterAction: 'none' as const,
        publicPromoUrl: '',
        publicMaxParticipants: 0,
        publicTimeLimit: 0,
        syncSpinEnabled: false
    },
    list_raffle_default: {
        id: "list_raffle_default",
        name: "Modo Sorteo (Ruleta de Participantes)",
        prizes: [],
        formFields: [
            { id: "nombre", label: "Nombre Completo", placeholder: "Ej: Juan Pérez" },
            { id: "telefono", label: "Teléfono / WhatsApp", placeholder: "Ej: 0998877665" },
            { id: "email", label: "Correo Electrónico", placeholder: "Ej: juan@mail.com" }
        ],
        localRequireRegister: true,
        autoRemoveWinner: false,
        localSessionListEnabled: false,
        raffleMode: true,
        publicJoinEnabled: false,
        publicRegisterEnabled: false,
        publicRemoveWinner: false,
        publicSessionListEnabled: false,
        publicLiveViewEnabled: false,
        publicAfterAction: 'none' as const,
        publicPromoUrl: '',
        publicMaxParticipants: 0,
        publicTimeLimit: 0,
        syncSpinEnabled: false
    },
    list_public_qr_default: {
        id: "list_public_qr_default",
        name: "Participación Pública (Modo QR)",
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
    },
    list_lightning_game: {
        id: "list_lightning_game",
        name: "Juego Relámpago",
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
    }
};

const resetGameById = (id: string, name: string) => {
    const defaults = FACTORY_DEFAULTS[id as keyof typeof FACTORY_DEFAULTS];
    if (!defaults) return;
    
    showCustomConfirm(`¿Estás seguro de que deseas reiniciar "${name}" a las configuraciones de fábrica? Se restablecerán todos los premios y campos personalizados.`, () => {
        const index = StateManager.config.savedPrizeLists.findIndex(l => l.id === id);
        const resetData = JSON.parse(JSON.stringify(defaults));
        // Generar un nuevo ID de sesión de inmediato para asegurar un enlace fresco al reiniciar
        resetData.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
        resetData.publicSpinsCount = 0;
        
        if (index >= 0) {
            StateManager.config.savedPrizeLists[index] = resetData;
        } else {
            StateManager.config.savedPrizeLists.push(resetData);
        }
        
        StateManager.save();
        loadGameById(id);
        
        if (document.getElementById('modalAdd') && document.getElementById('modalAdd')!.style.display === 'flex') {
            generatePrizeInputs();
        }
        
        showCustomAlert(`EL JUEGO "${name.toUpperCase()}" HA SIDO REINICIADO A LAS CONFIGURACIONES DE FÁBRICA`, "ÉXITO");
    });
};

const handleStartGame = (id: string) => {
    if (!StateManager.config.savedPrizeLists) StateManager.config.savedPrizeLists = [];
    const list = StateManager.config.savedPrizeLists.find(l => l.id === id);
    if (list) {
        // Generar un nuevo ID de sesión al iniciar un nuevo juego
        list.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
        list.publicSpinsCount = 0;
        if (list.publicTimeLimit && list.publicTimeLimit > 0) {
            list.publicSessionExpiry = Date.now() + list.publicTimeLimit * 60 * 1000;
        } else {
            list.publicSessionExpiry = 0;
        }
        StateManager.save();
    }
    loadGameById(id, true);
    if (document.getElementById('modalConfig')) {
        document.getElementById('modalConfig')!.style.display = 'none';
        sessionStorage.setItem('nexo_menu_open', 'false');
    }
    const canvas = document.getElementById('wheelCanvas');
    if (canvas) {
        canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (id === "list_lightning_game") {
        if (!lightningScheduleTime) {
            resetLightningTimer();
            startLightningTimer();
        } else {
            showCustomAlert("El Juego Relámpago está programado para iniciarse automáticamente a la fecha y hora configuradas. El temporizador se iniciará cuando se alcance el tiempo programado.", "JUEGO PROGRAMADO");
        }
    } else if (StateManager.config.timerEnabled) {
        resetLightningTimer();
        startLightningTimer();
    }
};

// Bindings for Section Actions (Iniciar y Reiniciar)
const showQRForGame = (gameId: string) => {
    if (!StateManager.config.savedPrizeLists) StateManager.config.savedPrizeLists = [];
    let list = StateManager.config.savedPrizeLists.find(l => l.id === gameId);
    if (!list) return;

    list.publicJoinEnabled = true;
    if (!list.publicSessionId) {
        list.publicSessionId = "sess_" + Date.now().toString() + "_" + Math.floor(Math.random() * 1000);
    }
    StateManager.save();

    loadGameById(gameId);

    const btnShowQR = document.getElementById('btnShowPublicQR');
    if (btnShowQR) {
        btnShowQR.click();
    }
};

if (document.getElementById('btnPublicShowQR')) {
    document.getElementById('btnPublicShowQR')!.onclick = () => {
        const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
        showQRForGame(activeId);
    };
}

// Unified Game Configuration Card buttons & select
if (document.getElementById('btnStartGame')) {
    document.getElementById('btnStartGame')!.onclick = () => {
        const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
        handleStartGame(activeId);
    };
}

if (document.getElementById('btnResetGame')) {
    document.getElementById('btnResetGame')!.onclick = () => {
        const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
        const list = StateManager.config.savedPrizeLists?.find(l => l.id === activeId);
        const name = list ? list.name : "Juego";
        resetGameById(activeId, name);
    };
}

if (document.getElementById('btnEditPrizes')) {
    document.getElementById('btnEditPrizes')!.onclick = () => {
        const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
        loadGameById(activeId, false, true);
        if (document.getElementById('prizeQuantity')) (document.getElementById('prizeQuantity') as HTMLInputElement).value = StateManager.config.prizes.length.toString();
        renderSavedLists();
        generatePrizeInputs(); 
        if (document.getElementById('modalAdd')) document.getElementById('modalAdd')!.style.display = 'flex';
    };
}

if (document.getElementById('btnEditForm')) {
    document.getElementById('btnEditForm')!.onclick = () => {
        const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
        loadGameById(activeId, false, true);
        renderFormFieldsEditor();
        const modalEditor = document.getElementById('modalEditFormFields');
        if (modalEditor) modalEditor.style.display = 'flex';
    };
}

if (document.getElementById('selectGameMode')) {
    (document.getElementById('selectGameMode') as HTMLSelectElement).onchange = (e) => {
        const value = (e.target as HTMLSelectElement).value;
        const isRaffle = value === 'raffle';
        StateManager.config.raffleMode = isRaffle;
        
        // Sincronizar con el resto de la app
        if (isRaffle) {
            StateManager.config.localRequireRegister = true;
            const chkRequireReg = document.getElementById('chkRequireRegister') as HTMLInputElement;
            if (chkRequireReg) chkRequireReg.checked = true;
            
            const isDefaultPrize = (name: string) => {
                const n = name.toUpperCase().trim();
                return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                       n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                       n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
            };
            StateManager.config.prizes = StateManager.config.prizes.filter(p => !isDefaultPrize(p.name));
        } else {
            const defaultSaved = StateManager.config.savedPrizeLists?.find(l => l.name === "LISTA PREDETERMINADA");
            if (defaultSaved) {
                StateManager.config.prizes = JSON.parse(JSON.stringify(defaultSaved.prizes));
            } else {
                StateManager.config.prizes = [
                    { name: "OPCIÓN 1" }, { name: "OPCIÓN 2" },
                    { name: "OPCIÓN 3" }, { name: "OPCIÓN 4" }
                ];
            }
        }
        
        updateRaffleButtonVisibility();
        updateRaffleLayoutClasses();
        StateManager.save();
        if (typeof appWheel !== 'undefined' && appWheel) appWheel.draw();
        
        // También sincronizar el listado de juegos/sorteos locales
        const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
        const list = StateManager.config.savedPrizeLists?.find(l => l.id === activeId);
        if (list) {
            list.raffleMode = isRaffle;
            list.localRequireRegister = StateManager.config.localRequireRegister;
            list.prizes = JSON.parse(JSON.stringify(StateManager.config.prizes));
            StateManager.save();
        }
        syncSettingsUI();
        syncGameSectionsUI();
    };
}

// Global Timer & Countdown Controls
const chkTimerEnabledElement = document.getElementById('chkTimerEnabled') as HTMLInputElement;
if (chkTimerEnabledElement) {
    chkTimerEnabledElement.onchange = (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        StateManager.config.timerEnabled = checked;
        StateManager.save();
        
        // Toggle parameters container style display
        const divTimerParams = document.getElementById('divTimerParamsContainer');
        if (divTimerParams) {
            divTimerParams.style.display = checked ? 'block' : 'none';
        }
        
        // Toggle actual screen/public floating countdown display
        const timerContainer = document.getElementById('lightningTimerContainer');
        const appMainElement = document.getElementById('appMain');
        const isTimerActiveGlobally = checked || (StateManager.config.activeSavedListId === "list_lightning_game");
        if (timerContainer) {
            timerContainer.style.display = isTimerActiveGlobally ? 'flex' : 'none';
        }
        if (appMainElement) {
            if (isTimerActiveGlobally) {
                appMainElement.classList.add('has-lightning-timer');
            } else {
                appMainElement.classList.remove('has-lightning-timer');
            }
        }
        
        if (!checked) {
            timerController.stop();
        } else {
            const minutes = StateManager.config.publicTimeLimit || 3;
            timerController.setDurationMinutes(minutes);
        }
        
        syncSettingsUI();
        syncGameSectionsUI();
    };
}

const inputTimerDurationElement = document.getElementById('inputTimerDuration') as HTMLInputElement;
if (inputTimerDurationElement) {
    inputTimerDurationElement.onchange = (e) => {
        const value = Math.max(1, parseInt((e.target as HTMLInputElement).value) || 3);
        StateManager.config.publicTimeLimit = value;
        
        if (StateManager.config.savedPrizeLists) {
            const lightningGame = StateManager.config.savedPrizeLists.find(l => l.id === "list_lightning_game");
            if (lightningGame) {
                lightningGame.publicTimeLimit = value;
            }
        }
        
        StateManager.save();
        timerController.setDurationMinutes(value);
        syncSettingsUI();
    };
}

if (document.getElementById('btnStartTimer')) {
    document.getElementById('btnStartTimer')!.onclick = () => {
        timerController.start();
    };
}

if (document.getElementById('btnPauseTimer')) {
    document.getElementById('btnPauseTimer')!.onclick = () => {
        timerController.stop();
    };
}

if (document.getElementById('btnResetTimer')) {
    document.getElementById('btnResetTimer')!.onclick = () => {
        timerController.reset();
    };
}

const chkScheduleGameElement = document.getElementById('chkScheduleGame') as HTMLInputElement;
if (chkScheduleGameElement) {
    chkScheduleGameElement.onchange = (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        const divSchedule = document.getElementById('divScheduleTimeInput');
        if (divSchedule) {
            divSchedule.style.display = checked ? 'flex' : 'none';
        }
        if (!checked) {
            lightningScheduleTime = null;
            timerController.cancelSchedule();
            StateManager.save();
        }
    };
}

const inputScheduleGameTimeElement = document.getElementById('inputScheduleGameTime') as HTMLInputElement;
if (inputScheduleGameTimeElement) {
    inputScheduleGameTimeElement.onchange = (e) => {
        const val = (e.target as HTMLInputElement).value;
        if (val) {
            const parsedTime = new Date(val).getTime();
            if (!isNaN(parsedTime)) {
                lightningScheduleTime = parsedTime;
                timerController.setScheduleTime(parsedTime, () => {
                    const activeId = StateManager.config.activeSavedListId || "list_juego_estandar";
                    handleStartGame(activeId);
                });
                StateManager.save();
            }
        }
    };
}

if (document.getElementById('btnActivateEstandar')) document.getElementById('btnActivateEstandar')!.onclick = () => loadGameById("list_juego_estandar");
if (document.getElementById('btnStartEstandar')) document.getElementById('btnStartEstandar')!.onclick = () => handleStartGame("list_juego_estandar");
if (document.getElementById('btnResetEstandar')) document.getElementById('btnResetEstandar')!.onclick = () => resetGameById("list_juego_estandar", "Juego Estándar");

if (document.getElementById('btnActivateLeads')) document.getElementById('btnActivateLeads')!.onclick = () => loadGameById("list_leads_default");
if (document.getElementById('btnStartLeads')) document.getElementById('btnStartLeads')!.onclick = () => handleStartGame("list_leads_default");
if (document.getElementById('btnResetLeads')) document.getElementById('btnResetLeads')!.onclick = () => resetGameById("list_leads_default", "Captura de Leads");

if (document.getElementById('btnActivateRaffle')) document.getElementById('btnActivateRaffle')!.onclick = () => loadGameById("list_raffle_default");
if (document.getElementById('btnStartRafflePreset')) document.getElementById('btnStartRafflePreset')!.onclick = () => handleStartGame("list_raffle_default");
if (document.getElementById('btnResetRaffle')) document.getElementById('btnResetRaffle')!.onclick = () => resetGameById("list_raffle_default", "Modo Sorteo");

if (document.getElementById('btnActivatePublic')) document.getElementById('btnActivatePublic')!.onclick = () => loadGameById("list_public_qr_default");
if (document.getElementById('btnStartPublic')) document.getElementById('btnStartPublic')!.onclick = () => handleStartGame("list_public_qr_default");
if (document.getElementById('btnResetPublic')) document.getElementById('btnResetPublic')!.onclick = () => resetGameById("list_public_qr_default", "Participación Pública (Modo QR)");

// Juego Estándar game buttons
if (document.getElementById('btnEstandarEditPrizes')) document.getElementById('btnEstandarEditPrizes')!.onclick = () => {
    loadGameById("list_juego_estandar", false, true);
    if (document.getElementById('prizeQuantity')) (document.getElementById('prizeQuantity') as HTMLInputElement).value = StateManager.config.prizes.length.toString();
    renderSavedLists();
    generatePrizeInputs(); 
    if (document.getElementById('modalAdd')) document.getElementById('modalAdd')!.style.display = 'flex';
};
if (document.getElementById('btnEstandarEditForm')) document.getElementById('btnEstandarEditForm')!.onclick = () => {
    loadGameById("list_juego_estandar", false, true);
    renderFormFieldsEditor();
    const modalEditor = document.getElementById('modalEditFormFields');
    if (modalEditor) modalEditor.style.display = 'flex';
};

// Leads game buttons
if (document.getElementById('btnLeadsEditPrizes')) document.getElementById('btnLeadsEditPrizes')!.onclick = () => {
    loadGameById("list_leads_default", false, true);
    if (document.getElementById('prizeQuantity')) (document.getElementById('prizeQuantity') as HTMLInputElement).value = StateManager.config.prizes.length.toString();
    renderSavedLists();
    generatePrizeInputs(); 
    if (document.getElementById('modalAdd')) document.getElementById('modalAdd')!.style.display = 'flex';
};
if (document.getElementById('btnLeadsEditForm')) document.getElementById('btnLeadsEditForm')!.onclick = () => {
    loadGameById("list_leads_default", false, true);
    renderFormFieldsEditor();
    const modalEditor = document.getElementById('modalEditFormFields');
    if (modalEditor) modalEditor.style.display = 'flex';
};

// Raffle game buttons
if (document.getElementById('btnRaffleEditPrizes')) document.getElementById('btnRaffleEditPrizes')!.onclick = () => {
    loadGameById("list_raffle_default", false, true);
    if (document.getElementById('prizeQuantity')) (document.getElementById('prizeQuantity') as HTMLInputElement).value = StateManager.config.prizes.length.toString();
    renderSavedLists();
    generatePrizeInputs(); 
    if (document.getElementById('modalAdd')) document.getElementById('modalAdd')!.style.display = 'flex';
};
if (document.getElementById('btnRaffleEditForm')) document.getElementById('btnRaffleEditForm')!.onclick = () => {
    loadGameById("list_raffle_default", false, true);
    renderFormFieldsEditor();
    const modalEditor = document.getElementById('modalEditFormFields');
    if (modalEditor) modalEditor.style.display = 'flex';
};

// Public QR game buttons
if (document.getElementById('btnPublicEditPrizes')) document.getElementById('btnPublicEditPrizes')!.onclick = () => {
    loadGameById("list_public_qr_default", false, true);
    if (document.getElementById('prizeQuantity')) (document.getElementById('prizeQuantity') as HTMLInputElement).value = StateManager.config.prizes.length.toString();
    renderSavedLists();
    generatePrizeInputs(); 
    if (document.getElementById('modalAdd')) document.getElementById('modalAdd')!.style.display = 'flex';
};
if (document.getElementById('btnPublicEditForm')) document.getElementById('btnPublicEditForm')!.onclick = () => {
    loadGameById("list_public_qr_default", false, true);
    renderFormFieldsEditor();
    const modalEditor = document.getElementById('modalEditFormFields');
    if (modalEditor) modalEditor.style.display = 'flex';
};

// Juego Relámpago game buttons
if (document.getElementById('btnActivateLightning')) document.getElementById('btnActivateLightning')!.onclick = () => loadGameById("list_lightning_game");
if (document.getElementById('btnStartLightning')) document.getElementById('btnStartLightning')!.onclick = () => handleStartGame("list_lightning_game");
if (document.getElementById('btnResetLightning')) document.getElementById('btnResetLightning')!.onclick = () => resetGameById("list_lightning_game", "Juego Relámpago");

if (document.getElementById('btnLightningEditPrizes')) document.getElementById('btnLightningEditPrizes')!.onclick = () => {
    loadGameById("list_lightning_game", false, true);
    if (document.getElementById('prizeQuantity')) (document.getElementById('prizeQuantity') as HTMLInputElement).value = StateManager.config.prizes.length.toString();
    renderSavedLists();
    generatePrizeInputs(); 
    if (document.getElementById('modalAdd')) document.getElementById('modalAdd')!.style.display = 'flex';
};
if (document.getElementById('btnLightningEditForm')) document.getElementById('btnLightningEditForm')!.onclick = () => {
    loadGameById("list_lightning_game", false, true);
    renderFormFieldsEditor();
    const modalEditor = document.getElementById('modalEditFormFields');
    if (modalEditor) modalEditor.style.display = 'flex';
};

if (document.getElementById('btnDeleteSelectedList')) document.getElementById('btnDeleteSelectedList')!.onclick = () => {
    const select = document.getElementById('selectSavedLists') as HTMLSelectElement;
    const id = select.value;
    if (!id) return;

    const list = StateManager.config.savedPrizeLists?.find(l => l.id === id);
    if (!list) return;

    showCustomConfirm(`¿ESTÁS SEGURO DE ELIMINAR LA LISTA "${list.name}"?`, () => {
        StateManager.config.savedPrizeLists = StateManager.config.savedPrizeLists?.filter(l => l.id !== id);
        if (StateManager.config.activeSavedListId === id) {
            StateManager.config.activeSavedListId = "";
        }
        StateManager.save();
        renderSavedLists();
    });
};

if (document.getElementById('btnSaveCurrentList')) document.getElementById('btnSaveCurrentList')!.onclick = () => {
    const nameInput = document.getElementById('inputSaveListName') as HTMLInputElement;
    const name = nameInput.value.trim().toUpperCase();
    
    if (!name) return showCustomAlert("INGRESA UN NOMBRE PARA LA LISTA", "ATENCIÓN");
    
    // Obtener premios actuales de los inputs si están visibles, o de la config
    const names = document.querySelectorAll('.prize-name') as NodeListOf<HTMLInputElement>;
    let prizesToSave: Prize[] = [];
    
    if (names.length > 0) {
        names.forEach(input => {
            const val = input.value.trim().toUpperCase();
            if (val) prizesToSave.push({ name: val });
        });
    } else {
        prizesToSave = JSON.parse(JSON.stringify(StateManager.config.prizes));
    }

    if (prizesToSave.length === 0 && !StateManager.config.raffleMode) {
        return showCustomAlert("LA LISTA ESTÁ VACÍA", "ATENCIÓN");
    }

    if (!StateManager.config.savedPrizeLists) StateManager.config.savedPrizeLists = [];
    
    // Buscar si existe por ID activo para actualizar o renombrar, o por nombre para sobrescribir
    const activeId = StateManager.config.activeSavedListId;
    let existingIndex = -1;
    if (activeId && StateManager.config.savedPrizeLists) {
        existingIndex = StateManager.config.savedPrizeLists.findIndex(l => l.id === activeId);
    }
    if (existingIndex === -1) {
        existingIndex = StateManager.config.savedPrizeLists.findIndex(l => l.name === name);
    }
    
    const gameId = existingIndex >= 0 ? StateManager.config.savedPrizeLists[existingIndex].id : "list_" + Date.now();
    
    const gameData = {
        id: gameId,
        name: name,
        prizes: prizesToSave,
        formFields: JSON.parse(JSON.stringify(StateManager.config.formFields)),
        localRequireRegister: !!StateManager.config.localRequireRegister,
        autoRemoveWinner: !!StateManager.config.autoRemoveWinner,
        localSessionListEnabled: !!StateManager.config.localSessionListEnabled,
        localSessionId: StateManager.config.localSessionId || "local_" + Date.now().toString(),
        raffleMode: !!StateManager.config.raffleMode
    };

    if (existingIndex >= 0) {
        StateManager.config.savedPrizeLists[existingIndex] = gameData;
        StateManager.config.activeSavedListId = gameData.id;
        showCustomAlert(`JUEGO "${name}" ACTUALIZADO CON ÉXITO`, "ÉXITO");
    } else {
        StateManager.config.savedPrizeLists.push(gameData);
        StateManager.config.activeSavedListId = gameData.id;
        showCustomAlert(`JUEGO "${name}" GUARDADO CORRECTAMENTE`, "ÉXITO");
    }
    
    StateManager.save();
    nameInput.value = "";
    renderSavedLists();
};
if (document.getElementById('btnGenerateInputs')) {
    document.getElementById('btnGenerateInputs')!.onclick = () => {
        const currentPrizes = (window as any).getCurrentEditorPrizes();
        const qtyInput = document.getElementById('prizeQuantity') as HTMLInputElement;
        const targetQty = qtyInput ? (parseInt(qtyInput.value, 10) || 0) : 0;
        
        while (currentPrizes.length < targetQty) {
            currentPrizes.push({ name: "" });
        }
        if (currentPrizes.length > targetQty) {
            currentPrizes.splice(targetQty);
        }
        generatePrizeInputs(currentPrizes);
    };
}
if (document.getElementById('btnAddOption')) {
    document.getElementById('btnAddOption')!.onclick = () => {
        const currentPrizes = (window as any).getCurrentEditorPrizes();
        currentPrizes.push({ name: "" });
        const qtyInput = document.getElementById('prizeQuantity') as HTMLInputElement;
        if (qtyInput) {
            qtyInput.value = currentPrizes.length.toString();
        }
        generatePrizeInputs(currentPrizes);
    };
}
if (document.getElementById('btnCloseAdd')) document.getElementById('btnCloseAdd')!.onclick = () => { if (document.getElementById('modalAdd')) document.getElementById('modalAdd')!.style.display = 'none'; };

const syncActiveGamePrizesToSavedLists = () => {
    const activeId = StateManager.config.activeSavedListId;
    if (activeId && StateManager.config.savedPrizeLists) {
        const activeGameIndex = StateManager.config.savedPrizeLists.findIndex(l => l.id === activeId);
        if (activeGameIndex >= 0) {
            StateManager.config.savedPrizeLists[activeGameIndex].prizes = JSON.parse(JSON.stringify(StateManager.config.prizes));
        }
    }
    syncGameSectionsUI();
};

const generatePrizeInputs = (prizesToUse?: Prize[]) => {
    const container = document.getElementById('inputsContainer'); if (!container) return;
    const qtyInput = document.getElementById('prizeQuantity') as HTMLInputElement;
    
    if (qtyInput) {
        qtyInput.min = StateManager.config.raffleMode ? "0" : "1";
    }

    const headerEl = document.getElementById('prizeLibraryHeader');
    if (headerEl) {
        headerEl.innerText = StateManager.config.raffleMode ? "PARTICIPANTES REGISTRADOS" : "BIBLIOTECA DE PREMIOS";
    }

    // Actualizar la etiqueta del juego actual en el modal
    const gameNameEl = document.getElementById('prizeEditorGameName');
    if (gameNameEl) {
        const activeId = StateManager.config.activeSavedListId;
        const activeGame = StateManager.config.savedPrizeLists?.find(l => l.id === activeId);
        const prefixText = StateManager.config.raffleMode ? "EDITANDO REGISTRADOS" : "EDITANDO OPCIONES";
        if (activeGame) {
            gameNameEl.innerHTML = `${prefixText} PARA: <span style="color: var(--gold); font-weight: 900;">${activeGame.name.toUpperCase()}</span>`;
        } else {
            gameNameEl.innerHTML = `${prefixText}: <span style="color: var(--gold); font-weight: 900;">LISTA GENERAL / LIBRE</span>`;
        }
    }
    
    let prizes = prizesToUse || StateManager.config.prizes;
    
    // Si no se pasa una lista específica y la actual es la de fábrica, buscar "LISTA PREDETERMINADA"
    if (!prizesToUse && JSON.stringify(prizes) === JSON.stringify(INITIAL_DEFAULT_CONFIG.prizes)) {
        const defaultSaved = StateManager.config.savedPrizeLists?.find(l => l.name === "LISTA PREDETERMINADA");
        if (defaultSaved) prizes = defaultSaved.prizes;
    }

    if (qtyInput && prizesToUse) qtyInput.value = prizes.length.toString();

    const defaultQty = StateManager.config.raffleMode ? 0 : 1;
    const qty = qtyInput ? (qtyInput.value === "0" ? 0 : (parseInt(qtyInput.value) || defaultQty)) : defaultQty;
    container.innerHTML = "";
    
    const badgeLabel = StateManager.config.raffleMode ? "U" : "P";
    const placeholderText = StateManager.config.raffleMode ? "NOMBRE DEL PARTICIPANTE" : "NOMBRE DEL PREMIO";

    for(let i=0; i < qty; i++) {
        const p = prizes[i] || { name: "" };
        container.innerHTML += `
        <div class="prize-row-wrapper" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px; background: rgba(255,255,255,0.01); padding: 12px; border-radius: 15px; border: 1px solid rgba(255,255,255,0.03);">
            <div style="display:flex; align-items:center; gap:10px;">
                <div style="background: var(--gold); color: #000; width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 900; flex-shrink: 0;">${badgeLabel}${i + 1}</div>
                <input type="text" class="prize-name input-standard" value="${p.name.toUpperCase()}" style="flex:1; font-weight: 700; height: 40px;" placeholder="${placeholderText}" oninput="this.value = this.value.toUpperCase()">
                
                <button type="button" class="btn-toggle-celebrate" data-index="${i}" style="background: ${p.isSpecial ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${p.isSpecial ? 'var(--gold)' : '#222'}; color: ${p.isSpecial ? 'var(--gold)' : '#888'}; padding: 6px 12px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.2s; height: 40px;" onclick="toggleCelebrateConfig(this)">
                    <span>${p.isSpecial ? '🎉 CELEBRACIÓN' : '🎉 CONFIG'}</span>
                </button>
 
                <button type="button" class="btn-delete-row" style="background: rgba(255, 99, 71, 0.05); border: 1px solid rgba(255, 99, 71, 0.3); color: #ff6347; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 900; cursor: pointer; height: 40px; display: flex; align-items: center; justify-content: center; width: 40px; transition: all 0.2s;" title="Eliminar" onclick="deletePrizeRow(${i})">
                    ✕
                </button>
            </div>
            
            <div class="celebrate-config-panel" style="display: ${p.isSpecial ? 'block' : 'none'}; background: rgba(0,0,0,0.2); border-radius: 8px; padding: 10px; margin-top: 4px; border: 1px dashed rgba(212,175,55,0.2);">
                <input type="hidden" class="prize-is-special" value="${p.isSpecial ? 'true' : 'false'}">
                <div style="margin-bottom: 8px;">
                    <label style="display:block; font-size: 0.55rem; color: #888; margin-bottom: 3px; font-weight: 700;">MENSAJE DE CELEBRACIÓN (EDITABLE):</label>
                    <input type="text" class="prize-celebration-text input-standard" value="${p.celebrationText || ''}" style="width:100%; font-size:0.7rem; height: 32px; padding: 4px 8px;" placeholder="¡FELICIDADES! HAS GANADO EL PREMIO ESTRELLA">
                </div>
                <div style="display:flex; gap:8px;">
                    <div style="flex:1;">
                        <label style="display:block; font-size: 0.55rem; color: #888; margin-bottom: 3px; font-weight: 700;">TEXTO BOTÓN DE RECLAMO:</label>
                        <input type="text" class="prize-claim-btn-text input-standard" value="${p.claimBtnText || ''}" style="width:100%; font-size:0.7rem; height: 32px; padding: 4px 8px;" placeholder="RECLAMAR PREMIO">
                    </div>
                    <div style="flex:1;">
                        <label style="display:block; font-size: 0.55rem; color: #888; margin-bottom: 3px; font-weight: 700;">URL / INSTRUCCIONES DE RECLAMO:</label>
                        <input type="text" class="prize-claim-url input-standard" value="${p.claimUrl || ''}" style="width:100%; font-size:0.7rem; height: 32px; padding: 4px 8px;" placeholder="https://miweb.com o Dirígete al stand">
                    </div>
                    <div style="width:80px; flex-shrink:0;">
                        <label style="display:block; font-size: 0.55rem; color: #888; margin-bottom: 3px; font-weight: 700;">STOCK:</label>
                        <input type="number" class="prize-stock input-standard" value="${p.stock !== undefined ? p.stock : ''}" style="width:100%; font-size:0.7rem; height: 32px; padding: 4px 8px; text-align: center; background: #000;" placeholder="ILIMITADO" min="0">
                    </div>
                </div>
            </div>
        </div>`;
    }
};

(window as any).getCurrentEditorPrizes = (): Prize[] => {
    const rows = document.querySelectorAll('.prize-row-wrapper');
    const list: Prize[] = [];
    rows.forEach((row) => {
        const nameInput = row.querySelector('.prize-name') as HTMLInputElement | null;
        if (!nameInput) return;
        const name = nameInput.value.trim().toUpperCase();
        
        const isSpecialInput = row.querySelector('.prize-is-special') as HTMLInputElement | null;
        const celebTextInput = row.querySelector('.prize-celebration-text') as HTMLInputElement | null;
        const claimBtnTextInput = row.querySelector('.prize-claim-btn-text') as HTMLInputElement | null;
        const claimUrlInput = row.querySelector('.prize-claim-url') as HTMLInputElement | null;
        const stockInput = row.querySelector('.prize-stock') as HTMLInputElement | null;
        
        const isSpecial = isSpecialInput ? (isSpecialInput.value === 'true') : false;
        const celebrationText = celebTextInput ? celebTextInput.value.trim() : "";
        const claimBtnText = claimBtnTextInput ? claimBtnTextInput.value.trim() : "";
        const claimUrl = claimUrlInput ? claimUrlInput.value.trim() : "";
        const stock = (stockInput && stockInput.value.trim() !== "" && isSpecial) ? parseInt(stockInput.value, 10) : undefined;
        
        list.push({
            name,
            isSpecial,
            celebrationText,
            claimBtnText,
            claimUrl,
            stock: (stock !== undefined && !isNaN(stock)) ? stock : undefined
        });
    });
    return list;
};

(window as any).deletePrizeRow = (index: number) => {
    const currentPrizes = (window as any).getCurrentEditorPrizes();
    currentPrizes.splice(index, 1);
    
    const qtyInput = document.getElementById('prizeQuantity') as HTMLInputElement;
    if (qtyInput) {
        qtyInput.value = currentPrizes.length.toString();
    }
    
    generatePrizeInputs(currentPrizes);
};

(window as any).toggleCelebrateConfig = (btn: HTMLButtonElement) => {
    const row = btn.closest('.prize-row-wrapper');
    if (!row) return;
    const panel = row.querySelector('.celebrate-config-panel') as HTMLDivElement | null;
    const isSpecialInput = row.querySelector('.prize-is-special') as HTMLInputElement | null;
    if (!panel || !isSpecialInput) return;
    
    const currentlySpecial = isSpecialInput.value === 'true';
    const newSpecialState = !currentlySpecial;
    
    isSpecialInput.value = newSpecialState ? 'true' : 'false';
    panel.style.display = newSpecialState ? 'block' : 'none';
    
    btn.style.background = newSpecialState ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)';
    btn.style.borderColor = newSpecialState ? 'var(--gold)' : '#222';
    btn.style.color = newSpecialState ? 'var(--gold)' : '#888';
    btn.innerHTML = `<span>${newSpecialState ? '🎉 CELEBRACIÓN' : '🎉 CONFIG'}</span>`;
};

if (document.getElementById('btnSaveList')) document.getElementById('btnSaveList')!.onclick = () => { 
    const rows = document.querySelectorAll('.prize-row-wrapper');
    const newPrizes: Prize[] = [];
    rows.forEach((row) => {
        const nameInput = row.querySelector('.prize-name') as HTMLInputElement | null;
        if (!nameInput) return;
        const name = nameInput.value.trim().toUpperCase();
        if (!name) return;
        
        const isSpecialInput = row.querySelector('.prize-is-special') as HTMLInputElement | null;
        const celebTextInput = row.querySelector('.prize-celebration-text') as HTMLInputElement | null;
        const claimBtnTextInput = row.querySelector('.prize-claim-btn-text') as HTMLInputElement | null;
        const claimUrlInput = row.querySelector('.prize-claim-url') as HTMLInputElement | null;
        const stockInput = row.querySelector('.prize-stock') as HTMLInputElement | null;
        
        const isSpecial = isSpecialInput ? (isSpecialInput.value === 'true') : false;
        const celebrationText = celebTextInput ? celebTextInput.value.trim() : "";
        const claimBtnText = claimBtnTextInput ? claimBtnTextInput.value.trim() : "";
        const claimUrl = claimUrlInput ? claimUrlInput.value.trim() : "";
        const stock = (stockInput && stockInput.value.trim() !== "" && isSpecial) ? parseInt(stockInput.value, 10) : undefined;
        
        newPrizes.push({
            name,
            isSpecial,
            celebrationText,
            claimBtnText,
            claimUrl,
            stock: (stock !== undefined && !isNaN(stock)) ? stock : undefined
        });
    });
    
    const isRaffle = !!StateManager.config.raffleMode;
    if (newPrizes.length < 1 && !isRaffle) {
        return showCustomAlert("MÍNIMO 1 OPCIÓN", "ATENCIÓN");
    }
    
    // Actualizar premios activos
    StateManager.config.prizes = newPrizes;
    
    // Sincronizar automáticamente con el juego guardado correspondiente
    syncActiveGamePrizesToSavedLists();
    
    StateManager.save();
    appWheel.draw();
    renderSavedLists();
    
    showCustomAlert("CAMBIOS APLICADOS Y GUARDADOS EN LA CONFIGURACIÓN DEL JUEGO", "ÉXITO");
    if (document.getElementById('modalAdd')) document.getElementById('modalAdd')!.style.display = 'none';
};

const handleLogout = async () => {
    await authHandleLogout(stopSyncSpinPolling, INITIAL_DEFAULT_CONFIG);
};
(window as any).handleLogout = handleLogout;

// Initial Bootstrapper
(async () => {
    // Registrar todos los callbacks de los controladores (Fase 9/10 MVC Decoupling)
    setPublicidadCallbacks({
        applyActiveThemeColors,
        generateCustomizedQR,
        showCustomAlert,
        showCustomConfirm
    });

    setPerfilCallbacks({
        showCustomAlert,
        showCustomConfirm,
        applyActiveThemeColors,
        adjustTitleFontSize,
        executeWithAuth
    });

    setGuestCallbacks({
        isSupabaseConfigured: () => isSupabaseConfigured,
        fetchConfigFromSupabase,
        syncConfigToSupabase,
        applyActiveThemeColors,
        renderDynamicRegistrationForm: viewRenderDynamicRegistrationForm,
        renderLeadsList,
        showCustomAlert,
        getPendingEntryIndex: () => pendingEntryIndex,
        setPendingEntryIndex: (idx) => { pendingEntryIndex = idx; },
        syncCenterButtonState: () => { syncCenterButtonState(); },
        setHasRegisteredLocally: (val) => { hasRegisteredLocally = val; }
    });

    setQRCallbacks({
        isSupabaseConfigured: () => isSupabaseConfigured,
        fetchConfigFromSupabase,
        syncConfigToSupabase,
        applyActiveThemeColors,
        renderLeadsList,
        applyLogoToWheel,
        applyBackground,
        showCustomAlert,
        showCustomConfirm,
        updatePublicSessionStatusDisplay,
        updateLightningSessionStatusDisplay
    });

    setTabStateCallbacks({
        renderLeadsList,
        renderSubscriptionDashboard,
        initSistema,
        renderAnalytics,
        showCustomAlert
    });

    setAuthCallbacks({
        showCustomAlert,
        addAuditEntry,
        initApp
    });

    const isEmbed = await initEmbedMode();
    if (isEmbed) return;

    const isLive = await initLiveViewMode();
    if (isLive) return;

    const isGuest = await initGuestParticipation();
    if (isGuest) return;

    if (sessionStorage.getItem('nexo_auth_active') === 'true' && sessionStorage.getItem('nexo_current_user_email')) {
        await initApp();
        if (document.getElementById('loginScreen')) document.getElementById('loginScreen')!.style.display = 'none';
        showAppMain();

        // Restaurar estado del menú y de la pestaña activa si existía previamente
        const isMenuOpen = sessionStorage.getItem('nexo_menu_open') === 'true';
        if (isMenuOpen) {
            const modalConfig = document.getElementById('modalConfig');
            if (modalConfig) {
                modalConfig.style.display = 'flex';
                menuController.setMenuOpenState(true);
            }
            const activeTab = sessionStorage.getItem('nexo_active_tab');
            if (activeTab) {
                const tabButton = document.querySelector(`.tab-btn[data-tab="${activeTab}"]`);
                if (tabButton) {
                    (tabButton as HTMLElement).click();
                }
            }
        }
    } else {
        controllerInitAuthHandlers();
    }
})();

(window as any).drawWheel = () => appWheel.draw();
(window as any).syncGameSectionsUI = syncGameSectionsUI;
(window as any).syncCenterButtonState = syncCenterButtonState;
(window as any).spinController = spinController;
(window as any).menuController = menuController;
(window as any).authController = authController;
(window as any).fullscreenController = fullscreenController;
(window as any).leadsController = leadsController;
(window as any).StateManager = StateManager;
(window as any).generatePrizeInputs = generatePrizeInputs;
(window as any).exportCSVFunction = exportCSVFunction;
(window as any).exportTXTFunction = exportTXTFunction;
(window as any).exportIMGFunction = exportIMGFunction;

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modalReg = document.getElementById('modalRegistration');
        const restoreEditor = modalReg && (modalReg as any)._restoreEditorOnClose;
        document.querySelectorAll('.modal').forEach((m: any) => (m as HTMLElement).style.display = 'none');
        if (restoreEditor) {
            (modalReg as any)._restoreEditorOnClose = false;
            const modalEditor = document.getElementById('modalEditFormFields');
            if (modalEditor) modalEditor.style.display = 'flex';
        }
    }
});