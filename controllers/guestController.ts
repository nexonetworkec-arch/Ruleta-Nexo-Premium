import { INITIAL_DEFAULT_CONFIG, THEME_PRESETS, DEFAULT_LICENSE, UserAccount, LeadData, WinnerEntry, Prize } from '../config';
import { Security, StateManager } from '../core';
import { appWheel } from '../engine';
import { subscribeToConfigChanges, subscribeToMediaChanges, fetchMediaFromSupabase, saveLeadToSupabase, saveParticipationToSupabase, checkDeviceParticipationInLast24Hours } from '../supabase';
import { startBannersEngine, startSideAdEngine, startStreamingEngine, showAdHomeModal, showAppMain } from './publicidadController';
import { leadsController } from './leadsController';

export function getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('nexo_device_uuid');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
        localStorage.setItem('nexo_device_uuid', deviceId);
    }
    return deviceId;
}

// Guest / Public Mode State
export let isGuestMode = false;
export let isLiveViewMode = false;
export let isEmbedMode = false;
export let guestSessionId = "";
export let guestMaxParticipants = 0;
export let guestSessionExpiry = 0;
export let guestRegistrationRequired = false;
export let guestRaffleMode = false;
export let liveAdminEmail = "";
export let liveSessionId = "";
export let liveViewIntervalId: any = null;

// Callbacks required from the main system
interface GuestCallbacks {
    isSupabaseConfigured: () => boolean;
    fetchConfigFromSupabase: (email: string) => Promise<any>;
    syncConfigToSupabase: (email: string, config: any) => Promise<boolean>;
    applyActiveThemeColors: () => void;
    renderDynamicRegistrationForm: () => void;
    renderLeadsList: () => void;
    showCustomAlert: (message: string, title?: string) => void;
    getPendingEntryIndex: () => number | null;
    setPendingEntryIndex: (index: number | null) => void;
    syncCenterButtonState: () => void;
    setHasRegisteredLocally: (val: boolean) => void;
}

let callbacks: GuestCallbacks | null = null;

export const setGuestCallbacks = (cb: GuestCallbacks) => {
    callbacks = cb;
};

const getCallbacks = (): GuestCallbacks => {
    if (!callbacks) {
        throw new Error("Guest callbacks must be set before invoking guest controller functions.");
    }
    return callbacks;
};

export const findActiveGameAndSettings = (latestConfig: any): {
    publicJoinEnabled: boolean;
    publicMaxParticipants: number;
    publicSessionExpiry: number;
    publicRegisterEnabled: boolean;
    raffleMode: boolean;
    prizes: any[];
    formFields: any[];
    syncSpinEnabled: boolean;
    syncSpinState?: any;
    publicSessionId: string;
    publicLiveViewEnabled: boolean;
    publicLiveViewShowAds?: boolean;
} => {
    // If we are in live view mode, prioritize the currently active game/list in the admin's workspace
    if (isLiveViewMode) {
        const activeListId = latestConfig.activeSavedListId;
        const activeGame = latestConfig.savedPrizeLists?.find((l: any) => l.id === activeListId);
        if (activeGame) {
            return {
                publicJoinEnabled: !!activeGame.publicJoinEnabled,
                publicMaxParticipants: activeGame.publicMaxParticipants || 0,
                publicSessionExpiry: activeGame.publicSessionExpiry || 0,
                publicRegisterEnabled: activeGame.publicRegisterEnabled !== false,
                raffleMode: !!activeGame.raffleMode,
                prizes: activeGame.prizes || [],
                formFields: activeGame.formFields || latestConfig.formFields || [],
                syncSpinEnabled: !!activeGame.syncSpinEnabled,
                syncSpinState: latestConfig.syncSpinState,
                publicSessionId: activeGame.publicSessionId || latestConfig.publicSessionId || "",
                publicLiveViewEnabled: true, // Always allowed in direct live view link mode
                publicLiveViewShowAds: activeGame.publicLiveViewShowAds !== false
            };
        } else {
            // Fallback to top-level settings if no active list is matched
            return {
                publicJoinEnabled: !!latestConfig.publicJoinEnabled,
                publicMaxParticipants: latestConfig.publicMaxParticipants || 0,
                publicSessionExpiry: latestConfig.publicSessionExpiry || 0,
                publicRegisterEnabled: latestConfig.publicRegisterEnabled !== false,
                raffleMode: !!latestConfig.raffleMode,
                prizes: latestConfig.prizes || [],
                formFields: latestConfig.formFields || [],
                syncSpinEnabled: !!latestConfig.syncSpinEnabled,
                syncSpinState: latestConfig.syncSpinState,
                publicSessionId: latestConfig.publicSessionId || "",
                publicLiveViewEnabled: true, // Always allowed in direct live view link mode
                publicLiveViewShowAds: latestConfig.publicLiveViewShowAds !== false
            };
        }
    }

    const activeSessionId = guestSessionId;

    // 1. First, search in savedPrizeLists for a game whose publicSessionId matches activeSessionId
    const targetGame = latestConfig.savedPrizeLists?.find((l: any) => l.publicSessionId === activeSessionId);
    if (targetGame) {
        return {
            publicJoinEnabled: !!targetGame.publicJoinEnabled,
            publicMaxParticipants: targetGame.publicMaxParticipants || 0,
            publicSessionExpiry: targetGame.publicSessionExpiry || 0,
            publicRegisterEnabled: targetGame.publicRegisterEnabled !== false,
            raffleMode: !!targetGame.raffleMode,
            prizes: targetGame.prizes || [],
            formFields: targetGame.formFields || latestConfig.formFields || [],
            syncSpinEnabled: !!targetGame.syncSpinEnabled,
            syncSpinState: latestConfig.activeSavedListId === targetGame.id ? latestConfig.syncSpinState : undefined,
            publicSessionId: targetGame.publicSessionId || activeSessionId,
            publicLiveViewEnabled: targetGame.publicLiveViewEnabled !== false,
            publicLiveViewShowAds: targetGame.publicLiveViewShowAds !== false
        };
    }

    // 2. Fallback to top-level if session IDs match
    if (latestConfig.publicSessionId === activeSessionId) {
        return {
            publicJoinEnabled: !!latestConfig.publicJoinEnabled,
            publicMaxParticipants: latestConfig.publicMaxParticipants || 0,
            publicSessionExpiry: latestConfig.publicSessionExpiry || 0,
            publicRegisterEnabled: latestConfig.publicRegisterEnabled !== false,
            raffleMode: !!latestConfig.raffleMode,
            prizes: latestConfig.prizes || [],
            formFields: latestConfig.formFields || [],
            syncSpinEnabled: !!latestConfig.syncSpinEnabled,
            syncSpinState: latestConfig.syncSpinState,
            publicSessionId: latestConfig.publicSessionId,
            publicLiveViewEnabled: latestConfig.publicLiveViewEnabled !== false,
            publicLiveViewShowAds: latestConfig.publicLiveViewShowAds !== false
        };
    }

    // 3. Fallback to default
    return {
        publicJoinEnabled: false,
        publicMaxParticipants: 0,
        publicSessionExpiry: 0,
        publicRegisterEnabled: false,
        raffleMode: false,
        prizes: [],
        formFields: [],
        syncSpinEnabled: false,
        publicSessionId: "",
        publicLiveViewEnabled: false,
        publicLiveViewShowAds: false
    };
};

export const showGuestBlockScreen = (title: string, message: string) => {
    const appMain = document.getElementById('appMain');
    if (!appMain) return;
    
    let overlay = document.getElementById('guestBlockOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'guestBlockOverlay';
        overlay.style.position = 'absolute';
        overlay.style.inset = '0';
        overlay.style.background = '#0a0a0a';
        overlay.style.zIndex = '5000';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.padding = '30px';
        overlay.style.textAlign = 'center';
        appMain.style.position = 'relative';
        appMain.appendChild(overlay);
    }

    let actionButtonHtml = "";
    const action = StateManager.config.publicAfterAction || 'none';
    const promoUrl = StateManager.config.publicPromoUrl || '';
    
    if (action === 'live') {
        const urlParams = new URLSearchParams(window.location.search);
        const adminEmail = urlParams.get('admin') || "";
        const session = urlParams.get('session') || guestSessionId || "default_session";
        const urlBase = window.location.href.split('?')[0];
        const liveQuery = `live=true`
            + `&admin=${encodeURIComponent(adminEmail)}`
            + `&session=${session}`
            + `&title=${encodeURIComponent(StateManager.config.title)}`
            + `&subtitle=${encodeURIComponent(StateManager.config.subtitle || "")}`
            + `&theme=${StateManager.config.themeId}`;
        const liveViewUrl = `${urlBase}?${liveQuery}`;
        
        actionButtonHtml = `
            <div style="margin-top: 15px; margin-bottom: 25px;">
                <a href="${liveViewUrl}" style="display: inline-block; background: var(--gold); color: #000; font-weight: 800; text-transform: uppercase; padding: 12px 25px; border-radius: 50px; text-decoration: none; font-size: 0.8rem; letter-spacing: 1.5px; box-shadow: 0 10px 20px rgba(212,175,55,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🔴 VER SORTEO EN VIVO
                </a>
            </div>
        `;
    } else if (action === 'promo' && promoUrl) {
        actionButtonHtml = `
            <div style="margin-top: 15px; margin-bottom: 25px;">
                <a href="${promoUrl}" target="_blank" style="display: inline-block; background: var(--gold); color: #000; font-weight: 800; text-transform: uppercase; padding: 12px 25px; border-radius: 50px; text-decoration: none; font-size: 0.8rem; letter-spacing: 1.5px; box-shadow: 0 10px 20px rgba(212,175,55,0.3); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    🎁 IR A LA PROMOCIÓN
                </a>
            </div>
        `;
    }

    overlay.innerHTML = `
        <div style="border: 2px solid var(--gold); background: #000; padding: 40px; border-radius: 30px; max-width: 450px; width: 100%; box-shadow: 0 20px 50px rgba(0,0,0,0.8); animation: fadeIn 0.5s ease-out;">
            <div style="font-size: 3rem; margin-bottom: 20px;">🎉</div>
            <h2 style="color: var(--gold); font-size: 1.8rem; font-weight: 900; text-transform: uppercase; margin-top: 0; margin-bottom: 15px; letter-spacing: 2px;">${title}</h2>
            <p style="color: #ccc; font-size: 0.95rem; line-height: 1.6; margin-bottom: 25px;">${message}</p>
            ${actionButtonHtml}
            <div style="font-size: 0.55rem; color: #444; letter-spacing: 3px; font-weight: 900; text-transform: uppercase; border-top: 1px solid #111; padding-top: 20px;">RULETA NEXO PREMIUM PARTICIPACIÓN</div>
        </div>
    `;
};

export const triggerGuestSpin = async (lead?: LeadData) => {
    if (appWheel.isSpinning) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const adminEmail = urlParams.get('admin');
    const cb = getCallbacks();

    if (guestRaffleMode) {
        if (cb.isSupabaseConfigured() && adminEmail) {
            try {
                const latestConfig = await cb.fetchConfigFromSupabase(adminEmail);
                if (latestConfig) {
                    const participantName = (lead?.[StateManager.config.formFields[0].id] || "Participante").toUpperCase();
                    
                    const isDefaultPrize = (name: string) => {
                        const n = name.toUpperCase().trim();
                        return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                               n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                               n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
                    };

                    // Add participant to the specific savedPrizeList!
                    const targetGame = latestConfig.savedPrizeLists?.find((l: any) => l.publicSessionId === guestSessionId);
                    if (targetGame) {
                        if (!targetGame.prizes) targetGame.prizes = [];
                        const hasDefaultPrizes = targetGame.prizes.length > 0 && targetGame.prizes.every((p: any) => isDefaultPrize(p.name));
                        if (hasDefaultPrizes) targetGame.prizes = [{ name: participantName }];
                        else targetGame.prizes.push({ name: participantName });
                    }

                    // Also add to active prizes if this game is currently active
                    if (latestConfig.publicSessionId === guestSessionId || latestConfig.activeSavedListId === targetGame?.id) {
                        const hasDefaultPrizes = latestConfig.prizes.length > 0 && latestConfig.prizes.every((p: any) => isDefaultPrize(p.name));
                        if (hasDefaultPrizes) latestConfig.prizes = [{ name: participantName }];
                        else latestConfig.prizes.push({ name: participantName });
                    }
                    
                    const fecha = new Date().toLocaleString();
                    const entry: WinnerEntry = {
                        nombre: "REGISTRADO (SORTEO)",
                        fecha: fecha,
                        lead: lead || {},
                        publicSessionId: guestSessionId
                    };
                    
                    if (!latestConfig.winnersHistory) latestConfig.winnersHistory = [];
                    latestConfig.winnersHistory.push(entry);
                    
                    const success = await cb.syncConfigToSupabase(adminEmail, latestConfig);
                    if (success) {
                        const deviceId = getOrCreateDeviceId();
                        const activeGame = latestConfig.savedPrizeLists?.find((l: any) => l.publicSessionId === guestSessionId) ||
                                           latestConfig.savedPrizeLists?.find((l: any) => l.id === latestConfig.activeSavedListId) ||
                                           { id: 'list_juego_estandar' };
                        const gameId = activeGame.id;

                        saveParticipationToSupabase({
                            device_id: deviceId,
                            game_id: gameId,
                            session_id: guestSessionId,
                            admin_email: adminEmail,
                            nombre: participantName,
                            email: lead?.email || '',
                            premio: "REGISTRADO (SORTEO)"
                        }).catch(err => {
                            console.error("Error al registrar participación de sorteo:", err);
                        });

                        localStorage.setItem(`nexo_guest_played_${guestSessionId}`, "REGISTRADO (SORTEO)");
                        showGuestBlockScreen(
                            "¡REGISTRO EXITOSO!", 
                            `Hola <b>${participantName}</b>, ya estás registrado para el sorteo.<br><br>Tu nombre se ha añadido a la ruleta. Espera a que el organizador inicie el sorteo en la pantalla principal.`
                        );
                        return;
                    }
                }
            } catch (e) {
                console.error("Error al sincronizar el participante del sorteo en Supabase:", e);
            }
        }
        
        // Fallback offline / local
        const participantName = (lead?.[StateManager.config.formFields[0].id] || "Participante").toUpperCase();
        const isDefaultPrize = (name: string) => {
            const n = name.toUpperCase().trim();
            return n.startsWith("PREMIO ") || n.startsWith("OPCIÓN ") || n.startsWith("DESCUENTO ") || 
                   n === "PREMIO SORPRESA" || n === "INTÉNTALO OTRA VEZ" || n === "ENVÍO GRATIS" || 
                   n === "REGALO ESPECIAL" || n.startsWith("CUPÓN ");
        };
        const hasDefaultPrizes = StateManager.config.prizes.length > 0 && StateManager.config.prizes.every(p => isDefaultPrize(p.name));
        if (hasDefaultPrizes) StateManager.config.prizes = [{ name: participantName }];
        else StateManager.config.prizes.push({ name: participantName });
        
        const fecha = new Date().toLocaleString();
        StateManager.config.winnersHistory.push({
            nombre: "REGISTRADO (SORTEO)",
            fecha: fecha,
            lead: lead || {},
            publicSessionId: StateManager.config.publicSessionId || guestSessionId
        });
        StateManager.save();
        appWheel.draw();
        localStorage.setItem(`nexo_guest_played_${guestSessionId}`, "REGISTRADO (SORTEO)");
        showGuestBlockScreen(
            "¡REGISTRO EXITOSO!", 
            `Hola <b>${participantName}</b>, ya estás registrado para el sorteo.<br><br>Tu nombre se ha añadido a la ruleta. Espera a que el organizador inicie el sorteo en la pantalla principal.`
        );
        return;
    }

    if (cb.isSupabaseConfigured() && adminEmail) {
        try {
            const latestConfig = await cb.fetchConfigFromSupabase(adminEmail);
            if (latestConfig) {
                const gameSettings = findActiveGameAndSettings(latestConfig);
                if (gameSettings.publicJoinEnabled && gameSettings.syncSpinEnabled) {
                    const prizeCount = gameSettings.prizes.length;
                    if (prizeCount > 0) {
                        const availablePrizesIndices: number[] = [];
                        gameSettings.prizes.forEach((p: any, idx: number) => {
                            if (p.stock === undefined || p.stock > 0) {
                                availablePrizesIndices.push(idx);
                            }
                        });

                        if (availablePrizesIndices.length === 0) {
                            cb.showCustomAlert("NO SE PUEDE INICIAR EL JUEGO PORQUE TODOS LOS PREMIOS CON STOCK CONFIGURADO SE ENCUENTRAN AGOTADOS (STOCK CERO).", "STOCK AGOTADO");
                            return;
                        }

                        const randomIdx = Math.floor(Math.random() * availablePrizesIndices.length);
                        const winnerIdx = availablePrizesIndices[randomIdx];
                        
                        const fecha = new Date().toLocaleString();
                        const entry: WinnerEntry = {
                            nombre: "GIRANDO...",
                            fecha: fecha,
                            lead: lead || {},
                            publicSessionId: guestSessionId
                        };
                        
                        if (!latestConfig.winnersHistory) latestConfig.winnersHistory = [];
                        latestConfig.winnersHistory.push(entry);
                        
                        // Increment spins count on both target game and top level if applicable
                        const targetGame = latestConfig.savedPrizeLists?.find((l: any) => l.publicSessionId === guestSessionId);
                        if (targetGame) {
                            targetGame.publicSpinsCount = (targetGame.publicSpinsCount || 0) + 1;
                        }
                        if (latestConfig.publicSessionId === guestSessionId) {
                            latestConfig.publicSpinsCount = (latestConfig.publicSpinsCount || 0) + 1;
                        }
                        
                        let triggerAd = false;
                        if (latestConfig.adVideoAdsEnabled && latestConfig.adVideoAdsFrequency) {
                            const nextSpinsSinceLastAd = (latestConfig.spinsSinceLastAd || 0) + 1;
                            if (nextSpinsSinceLastAd >= latestConfig.adVideoAdsFrequency) {
                                triggerAd = true;
                            }
                        }

                        if (triggerAd) {
                            latestConfig.syncSpinState = {
                                status: 'showing_ad',
                                timestamp: Date.now(),
                                winnerIdx: winnerIdx,
                                lead: lead || {},
                                session: guestSessionId
                            };
                            latestConfig.spinsSinceLastAd = 0;
                            
                            const success = await cb.syncConfigToSupabase(adminEmail, latestConfig);
                            if (success) {
                                const winnerPrizeName = gameSettings.prizes[winnerIdx].name;
                                const deviceId = getOrCreateDeviceId();
                                const activeGame = latestConfig.savedPrizeLists?.find((l: any) => l.publicSessionId === guestSessionId) ||
                                                   latestConfig.savedPrizeLists?.find((l: any) => l.id === latestConfig.activeSavedListId) ||
                                                   { id: 'list_juego_estandar' };
                                const gameId = activeGame.id;

                                // Extraer campos del lead si está disponible
                                const leadName = lead ? (lead.nombre || lead.name || Object.values(lead)[0] || 'Anónimo') : 'Anónimo';
                                const leadEmail = lead ? (lead.email || '') : '';

                                saveParticipationToSupabase({
                                    device_id: deviceId,
                                    game_id: gameId,
                                    session_id: guestSessionId,
                                    admin_email: adminEmail || '',
                                    nombre: String(leadName),
                                    email: String(leadEmail),
                                    premio: winnerPrizeName
                                }).catch(err => {
                                    console.error("Error al registrar participación por dispositivo:", err);
                                });

                                localStorage.setItem(`nexo_guest_played_${guestSessionId}`, winnerPrizeName);
                                
                                StateManager.config.spinsSinceLastAd = 0;
                                StateManager.save();
                                
                                const onAdCompleted = async () => {
                                    window.removeEventListener('nexo-ad-completed', onAdCompleted);
                                    const btnClose = document.getElementById('btnCloseAdHome');
                                    if (btnClose) btnClose.removeEventListener('click', onAdCompleted);
                                    
                                    try {
                                        const refreshConfig = await cb.fetchConfigFromSupabase(adminEmail);
                                        if (refreshConfig) {
                                            refreshConfig.syncSpinState = {
                                                status: 'spinning',
                                                timestamp: Date.now(),
                                                winnerIdx: winnerIdx,
                                                lead: lead || {},
                                                session: guestSessionId
                                            };
                                            await cb.syncConfigToSupabase(adminEmail, refreshConfig);
                                        }
                                    } catch (err) {
                                        console.error("Guest error setting spinning state:", err);
                                    }
                                    
                                    StateManager.config.prizes = gameSettings.prizes;
                                    appWheel.draw();
                                    appWheel.spin(winnerIdx, true);
                                };
                                
                                window.addEventListener('nexo-ad-completed', onAdCompleted);
                                const btnClose = document.getElementById('btnCloseAdHome');
                                if (btnClose) btnClose.addEventListener('click', onAdCompleted);
                                
                                const freqVideoUrl = await fetchMediaFromSupabase(adminEmail || '', "ad_frequency_video");
                                if (freqVideoUrl) {
                                    showAdHomeModal('frequency');
                                } else {
                                    showAdHomeModal();
                                }
                                return;
                            }
                        } else {
                            latestConfig.syncSpinState = {
                                status: 'spinning',
                                timestamp: Date.now(),
                                winnerIdx: winnerIdx,
                                lead: lead || {},
                                session: guestSessionId
                            };
                            latestConfig.spinsSinceLastAd = (latestConfig.spinsSinceLastAd || 0) + 1;
                            
                            const success = await cb.syncConfigToSupabase(adminEmail, latestConfig);
                            if (success) {
                                const winnerPrizeName = gameSettings.prizes[winnerIdx].name;
                                const deviceId = getOrCreateDeviceId();
                                const activeGame = latestConfig.savedPrizeLists?.find((l: any) => l.publicSessionId === guestSessionId) ||
                                                   latestConfig.savedPrizeLists?.find((l: any) => l.id === latestConfig.activeSavedListId) ||
                                                   { id: 'list_juego_estandar' };
                                const gameId = activeGame.id;

                                // Extraer campos del lead si está disponible
                                const leadName = lead ? (lead.nombre || lead.name || Object.values(lead)[0] || 'Anónimo') : 'Anónimo';
                                const leadEmail = lead ? (lead.email || '') : '';

                                saveParticipationToSupabase({
                                    device_id: deviceId,
                                    game_id: gameId,
                                    session_id: guestSessionId,
                                    admin_email: adminEmail || '',
                                    nombre: String(leadName),
                                    email: String(leadEmail),
                                    premio: winnerPrizeName
                                }).catch(err => {
                                    console.error("Error al registrar participación por dispositivo:", err);
                                });

                                localStorage.setItem(`nexo_guest_played_${guestSessionId}`, winnerPrizeName);
                                
                                StateManager.config.spinsSinceLastAd = latestConfig.spinsSinceLastAd;
                                StateManager.config.prizes = gameSettings.prizes;
                                StateManager.save();
                                appWheel.draw();
                                appWheel.spin(winnerIdx, true);
                                return;
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error al sincronizar el giro con la base de datos de la nube:", e);
        }
    }
    
    appWheel.spin();
};

export const openGuestRegistrationModal = () => {
    const cb = getCallbacks();
    cb.renderDynamicRegistrationForm();
    const modalReg = document.getElementById('modalRegistration');
    if (modalReg) modalReg.style.display = 'flex';
    
    const btnConfirmReg = document.getElementById('btnConfirmRegistration');
    if (btnConfirmReg) {
        btnConfirmReg.onclick = () => {
            const lead: LeadData = {};
            let isAllFilled = true;
            StateManager.config.formFields.forEach(field => {
                const input = document.getElementById(`reg_${field.id}`) as HTMLInputElement;
                const val = input ? input.value.trim() : "";
                if (!val) isAllFilled = false;
                lead[field.id] = val;
            });
            if (!isAllFilled) return cb.showCustomAlert("Por favor, completa todos los campos.", "REGISTRO INCOMPLETO");
            
            // Procesar y validar a través del LeadsController modular
            const captureResult = leadsController.captureLead(lead);
            if (!captureResult.success) {
                return cb.showCustomAlert(captureResult.message || "Por favor, verifica los campos.", "REGISTRO INCORRECTO");
            }
            
            const fecha = new Date().toLocaleString();
            
            const userEmail = sessionStorage.getItem('nexo_current_user_email');

            // Guardar de forma persistente y concurrente en la base de datos de Supabase (100% Online)
            if (cb.isSupabaseConfigured() && userEmail) {
                saveLeadToSupabase({
                    admin_email: userEmail,
                    session_id: guestSessionId || "default_session",
                    nombre: lead.nombre || lead.name || Object.values(lead)[0] || '',
                    telefono: lead.telefono || lead.phone || '',
                    email: lead.email || ''
                }).then(success => {
                    if (success) {
                        console.log("Lead guardado exitosamente en la tabla nexo_leads en Supabase.");
                    }
                }).catch(err => {
                    console.error("Error al guardar lead en nexo_leads en Supabase:", err);
                });
            }

            if (userEmail) { // Admin's device
                const entry: WinnerEntry = { 
                    nombre: "GIRANDO...", 
                    fecha: fecha, 
                    lead: lead,
                    publicSessionId: StateManager.config.publicSessionId || undefined
                };
                StateManager.config.winnersHistory.push(entry);
                cb.setPendingEntryIndex(StateManager.config.winnersHistory.length - 1);
                StateManager.save();
                cb.renderLeadsList();
            } else {
                localStorage.setItem(`nexo_guest_reg_${guestSessionId}`, JSON.stringify(lead));
            }
            
            if (modalReg) modalReg.style.display = 'none';
            
            if (guestRaffleMode) {
                triggerGuestSpin(lead);
            } else {
                if (userEmail) {
                    cb.setHasRegisteredLocally(true);
                    cb.syncCenterButtonState();
                    // Auto-trigger spin for the local admin device
                    const btnSpin = document.getElementById('btnSpinCenter');
                    if (btnSpin) {
                        btnSpin.click();
                    }
                } else {
                    cb.syncCenterButtonState();
                    // Auto-trigger spin for guest on their phone
                    triggerGuestSpin(lead);
                }
            }
        };
    }
};

export const startLiveViewPolling = () => {
    const cb = getCallbacks();
    if (liveViewIntervalId) clearInterval(liveViewIntervalId);

    liveViewIntervalId = setInterval(async () => {
        if (!isLiveViewMode || !liveAdminEmail) return;

        try {
            const latestConfig = await cb.fetchConfigFromSupabase(liveAdminEmail);
            if (!latestConfig) {
                return;
            }

            const gameSettings = findActiveGameAndSettings(latestConfig);

            // En modo espejo de transmisión, removemos cualquier overlay de bloqueo previo para flujo continuo
            const overlay = document.getElementById('guestBlockOverlay');
            if (overlay && (overlay.querySelector('h2')?.innerText === "VISUALIZACIÓN DESACTIVADA" || overlay.querySelector('h2')?.innerText === "SORTEO FINALIZADO" || overlay.querySelector('h2')?.innerText === "SORTEO NO ENCONTRADO")) {
                overlay.remove();
            }

            // En modo de transmisión en vivo, adaptamos dinámicamente el ID de la sesión al activo para un flujo continuo
            if (gameSettings.publicSessionId && gameSettings.publicSessionId !== liveSessionId) {
                console.log(`Live View Polling: Adaptando sesión de transmisión de ${liveSessionId} a la activa ${gameSettings.publicSessionId}`);
                liveSessionId = gameSettings.publicSessionId;
            }

            // Sincronizar participantes y opciones de la ruleta en tiempo real
            let configChanged = false;
            if (JSON.stringify(StateManager.config.prizes) !== JSON.stringify(gameSettings.prizes)) {
                configChanged = true;
            }

            if (StateManager.config.publicLiveViewShowAds !== gameSettings.publicLiveViewShowAds) {
                configChanged = true;
            }

            if (StateManager.config.adBannersEnabled !== latestConfig.adBannersEnabled ||
                StateManager.config.adSidePersistentEnabled !== latestConfig.adSidePersistentEnabled ||
                StateManager.config.adStreamingEnabled !== latestConfig.adStreamingEnabled) {
                configChanged = true;
            }

            // Sincronizar el config completo en memoria para que los motores tengan acceso a la configuración de ads actualizada
            StateManager.config = latestConfig;
            StateManager.config.prizes = gameSettings.prizes;
            StateManager.config.publicLiveViewShowAds = gameSettings.publicLiveViewShowAds;

            if (configChanged) {
                StateManager.save();
                if (!appWheel.isSpinning) {
                    appWheel.draw();
                }
                // Disparar evento para que los motores de publicidad se actualicen
                window.dispatchEvent(new CustomEvent('nexo-config-realtime'));
            }

            // Sincronizar el giro si está activo en tiempo real
            if (latestConfig.syncSpinState) {
                const state = latestConfig.syncSpinState;
                const lastProcessedTimestamp = parseInt(localStorage.getItem('nexo_last_processed_live_spin') || '0');
                const lastProcessedAdTimestamp = parseInt(localStorage.getItem('nexo_last_processed_live_ad') || '0');

                if (state.status === 'showing_ad' && state.timestamp > lastProcessedAdTimestamp) {
                    localStorage.setItem('nexo_last_processed_live_ad', String(state.timestamp));
                    
                    const freqVideoUrl = await fetchMediaFromSupabase(liveSessionId || liveAdminEmail || '', "ad_frequency_video");
                    if (freqVideoUrl) {
                        showAdHomeModal('frequency');
                    } else {
                        showAdHomeModal();
                    }
                } else if (state.status === 'spinning' && state.timestamp > lastProcessedTimestamp) {
                    localStorage.setItem('nexo_last_processed_live_spin', String(state.timestamp));

                    const modal = document.getElementById('modalAdHome');
                    if (modal) modal.style.display = 'none';
                    const v = document.querySelector('#adHomeContainer video') as HTMLVideoElement;
                    if (v) (v as HTMLVideoElement).pause();

                    if (!appWheel.isSpinning) {
                        appWheel.spin(state.winnerIdx, true);
                    }
                }
            }
        } catch (e) {
            console.error("Error en startLiveViewPolling:", e);
        }
    }, 2000);
};

export const initLiveViewMode = async (): Promise<boolean> => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('live')) return false;

    const cb = getCallbacks();
    isLiveViewMode = true;
    document.body.classList.add('is-live-view');

    // Ocultar botones administrativos y panel de configuración
    const btnOpenMenu = document.getElementById('btnOpenMenu');
    if (btnOpenMenu) btnOpenMenu.style.display = 'none';



    liveAdminEmail = urlParams.get('admin') || "";
    liveSessionId = urlParams.get('session') || "";

    if (liveAdminEmail) {
        sessionStorage.setItem('nexo_current_user_email', liveAdminEmail);
    }

    const paramTitle = urlParams.get('title');
    const paramSubtitle = urlParams.get('subtitle');
    const paramTheme = urlParams.get('theme');

    StateManager.config.title = paramTitle || StateManager.config.title || "RULETA";
    StateManager.config.subtitle = paramSubtitle || StateManager.config.subtitle || "";

    if (paramTheme) {
        StateManager.config.themeId = paramTheme;
    }

    const mainTitle = document.getElementById('mainTitle');
    const mainSubtitle = document.getElementById('mainSubtitle');

    // Cargar la configuración inicial desde Supabase de forma síncrona/esperada para evitar retrasos en publicidad
    if (cb.isSupabaseConfigured() && liveAdminEmail) {
        try {
            const initialConfig = await cb.fetchConfigFromSupabase(liveAdminEmail);
            if (initialConfig) {
                console.log("Live View: Configuración inicial cargada de Supabase.");
                StateManager.config = initialConfig;
                const gameSettings = findActiveGameAndSettings(initialConfig);
                StateManager.config.prizes = gameSettings.prizes;
                StateManager.config.publicLiveViewShowAds = gameSettings.publicLiveViewShowAds;
                
                if (!paramTitle && initialConfig.title) {
                    StateManager.config.title = initialConfig.title;
                }
                if (!paramSubtitle && initialConfig.subtitle) {
                    StateManager.config.subtitle = initialConfig.subtitle;
                }
            }
        } catch (err) {
            console.error("Live View: Error cargando configuración inicial de Supabase:", err);
        }
    }

    cb.applyActiveThemeColors();
    if (mainTitle) {
        mainTitle.innerText = StateManager.config.title;
        mainTitle.setAttribute('contenteditable', 'false');
    }
    if (mainSubtitle) {
        mainSubtitle.innerText = StateManager.config.subtitle;
        mainSubtitle.style.fontSize = '12px';
        mainSubtitle.setAttribute('contenteditable', 'false');
    }

    if (document.getElementById('loginScreen')) document.getElementById('loginScreen')!.style.display = 'none';
    showAppMain();

    // Deshabilitar o cambiar texto del botón central a "EN VIVO"
    const btnSpinCenter = document.getElementById('btnSpinCenter');
    if (btnSpinCenter) {
        btnSpinCenter.innerText = "EN VIVO";
        btnSpinCenter.style.fontSize = "0.6rem";
        btnSpinCenter.style.cursor = "default";
        btnSpinCenter.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
        };
    }

    // Dibujar la ruleta inicial
    appWheel.draw();

    // Iniciar el polling de visualización en vivo como fallback
    startLiveViewPolling();

    // Suscribirse a cambios en tiempo real
    if (cb.isSupabaseConfigured() && liveAdminEmail) {
        subscribeToConfigChanges(liveAdminEmail, async (latestConfig) => {
            console.log("Live View: Cambio de configuración detectado en tiempo real.");
            
            const gameSettings = findActiveGameAndSettings(latestConfig);
            
            // En modo espejo de transmisión, removemos cualquier overlay de bloqueo previo para flujo continuo
            const overlay = document.getElementById('guestBlockOverlay');
            if (overlay && (overlay.querySelector('h2')?.innerText === "VISUALIZACIÓN DESACTIVADA" || overlay.querySelector('h2')?.innerText === "SORTEO FINALIZADO" || overlay.querySelector('h2')?.innerText === "SORTEO NO ENCONTRADO")) {
                overlay.remove();
            }

            // En modo de transmisión en vivo, adaptamos dinámicamente el ID de la sesión al activo para un flujo continuo
            if (gameSettings.publicSessionId && gameSettings.publicSessionId !== liveSessionId) {
                console.log(`Live View Realtime: Adaptando sesión de transmisión de ${liveSessionId} a la activa ${gameSettings.publicSessionId}`);
                liveSessionId = gameSettings.publicSessionId;
            }

            // Sincronizar configuración en memoria
            StateManager.config = latestConfig;
            
            // Override active game specific properties in memory for drawing/functioning correctly
            StateManager.config.prizes = gameSettings.prizes;
            StateManager.config.publicLiveViewShowAds = gameSettings.publicLiveViewShowAds;

            // Sincronizar título y subtítulo
            if (mainTitle) mainTitle.innerText = latestConfig.title;
            if (mainSubtitle) {
                mainSubtitle.innerText = latestConfig.subtitle || "SISTEMA DE SORTEO";
                mainSubtitle.style.fontSize = (latestConfig.subtitleFontSize || 12) + 'px';
            }

            // Aplicar colores de tema, logos y fondos
            cb.applyActiveThemeColors();

            // Dibujar la ruleta
            if (!appWheel.isSpinning) {
                appWheel.draw();
            }

            // Sincronizar el giro si está activo en tiempo real
            if (latestConfig.syncSpinState) {
                const state = latestConfig.syncSpinState;
                const lastProcessedTimestamp = parseInt(localStorage.getItem('nexo_last_processed_live_spin') || '0');
                const lastProcessedAdTimestamp = parseInt(localStorage.getItem('nexo_last_processed_live_ad') || '0');

                if (state.status === 'showing_ad' && state.timestamp > lastProcessedAdTimestamp) {
                    localStorage.setItem('nexo_last_processed_live_ad', String(state.timestamp));
                    
                    const freqVideoUrl = await fetchMediaFromSupabase(liveSessionId || liveAdminEmail || '', "ad_frequency_video");
                    if (freqVideoUrl) {
                        showAdHomeModal('frequency');
                    } else {
                        showAdHomeModal();
                    }
                } else if (state.status === 'spinning' && state.timestamp > lastProcessedTimestamp) {
                    localStorage.setItem('nexo_last_processed_live_spin', String(state.timestamp));

                    const modal = document.getElementById('modalAdHome');
                    if (modal) modal.style.display = 'none';
                    const v = document.querySelector('#adHomeContainer video') as HTMLVideoElement;
                    if (v) (v as HTMLVideoElement).pause();

                    if (!appWheel.isSpinning) {
                        appWheel.spin(state.winnerIdx, true);
                    }
                }
            }

            // Dispatch global event for advertising/etc.
            window.dispatchEvent(new CustomEvent('nexo-config-realtime'));
        });

        subscribeToMediaChanges(liveAdminEmail, async (mediaKey, dataUrl) => {
            console.log(`[Live View Media Realtime] Sincronizando asset: ${mediaKey}`);
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
                    cb.applyActiveThemeColors();
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

                cb.applyActiveThemeColors();
                window.dispatchEvent(new CustomEvent('nexo-media-realtime', { detail: { mediaKey, dataUrl } }));
            } catch (err) {
                console.warn(`[Live View Media Realtime] Error al aplicar cambio de media:`, err);
            }
        });
    }

    // Registrar receptores de eventos en tiempo real para publicidad y banners
    window.addEventListener('nexo-config-realtime', () => {
        startBannersEngine();
        startSideAdEngine();
        startStreamingEngine();
    });

    window.addEventListener('nexo-media-realtime', () => {
        startBannersEngine();
        startSideAdEngine();
        startStreamingEngine();
    });

    // Iniciar motores de publicidad en la carga inicial
    startBannersEngine();
    startSideAdEngine();
    startStreamingEngine();

    return true;
};

export const initGuestParticipation = async (): Promise<boolean> => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('join')) return false;

    const cb = getCallbacks();
    isGuestMode = true;
    document.body.classList.add('is-guest-mode');
    
    // Hide administrative buttons
    const btnOpenMenu = document.getElementById('btnOpenMenu');
    if (btnOpenMenu) btnOpenMenu.style.display = 'none';

    // Parse URL params
    guestSessionId = urlParams.get('session') || "default_session";
    guestMaxParticipants = parseInt(urlParams.get('max') || "0") || 0;
    guestSessionExpiry = parseInt(urlParams.get('expires') || "0") || 0;
    guestRegistrationRequired = urlParams.get('reg') === 'true' || urlParams.get('raffle') === 'true';
    guestRaffleMode = urlParams.get('raffle') === 'true';
    const paramAction = urlParams.get('action') || 'none';
    const paramPromo = urlParams.get('promo') || '';

    const adminEmail = urlParams.get('admin') || "";
    if (adminEmail) {
        sessionStorage.setItem('nexo_current_user_email', adminEmail);
    }

    const paramTitle = urlParams.get('title');
    const paramSubtitle = urlParams.get('subtitle');
    const paramTheme = urlParams.get('theme');
    const paramPrizes = urlParams.get('prizes');
    const paramC1 = urlParams.get('c1');
    const paramC2 = urlParams.get('c2');

    // Dynamically override StateManager config for this guest session in memory
    StateManager.config.title = paramTitle || StateManager.config.title || "RULETA";
    StateManager.config.subtitle = paramSubtitle || StateManager.config.subtitle || "";
    StateManager.config.enableRegistration = guestRegistrationRequired;
    StateManager.config.raffleMode = guestRaffleMode;
    StateManager.config.publicAfterAction = paramAction as any;
    StateManager.config.publicPromoUrl = paramPromo;

    if (paramPrizes) {
        try {
            const decodedPrizes = JSON.parse(decodeURIComponent(escape(atob(paramPrizes)))) as string[];
            StateManager.config.prizes = decodedPrizes.map(name => ({ name }));
        } catch (e) {
            console.error("Error decoding prizes from URL", e);
        }
    }

    if (paramC1 && paramC2 && paramTheme) {
        if (!StateManager.config.themeCustomizations) StateManager.config.themeCustomizations = {};
        StateManager.config.themeId = paramTheme;
        StateManager.config.themeCustomizations[paramTheme] = {
            primary: paramC1,
            secondary: paramC2,
            logo: "",
            bg: ""
        };
    }

    // Cargar la configuración inicial desde Supabase de forma síncrona/esperada para evitar retrasos o datos obsoletos
    if (cb.isSupabaseConfigured() && adminEmail) {
        try {
            const initialConfig = await cb.fetchConfigFromSupabase(adminEmail);
            if (initialConfig) {
                console.log("Guest: Configuración inicial cargada de Supabase.");
                StateManager.config = initialConfig;
                const gameSettings = findActiveGameAndSettings(initialConfig);
                
                // Sobrescribir opciones específicas del juego activo en memoria
                StateManager.config.prizes = gameSettings.prizes;
                if (gameSettings.formFields && gameSettings.formFields.length > 0) {
                    StateManager.config.formFields = gameSettings.formFields;
                }
                
                // Actualizar variables locales del guest mode basadas en la configuración de la nube
                guestMaxParticipants = gameSettings.publicMaxParticipants || 0;
                guestSessionExpiry = gameSettings.publicSessionExpiry || 0;
                guestRegistrationRequired = gameSettings.publicRegisterEnabled === true || gameSettings.raffleMode === true;
                guestRaffleMode = gameSettings.raffleMode === true;

                if (initialConfig.title) {
                    StateManager.config.title = initialConfig.title;
                }
                if (initialConfig.subtitle) {
                    StateManager.config.subtitle = initialConfig.subtitle;
                }
            }
        } catch (err) {
            console.error("Guest: Error cargando configuración inicial de Supabase:", err);
        }
    }

    cb.applyActiveThemeColors();
    const mainTitle = document.getElementById('mainTitle');
    const mainSubtitle = document.getElementById('mainSubtitle');
    if (mainTitle) {
        mainTitle.innerText = StateManager.config.title;
        mainTitle.setAttribute('contenteditable', 'false');
    }
    if (mainSubtitle) {
        mainSubtitle.innerText = StateManager.config.subtitle;
        mainSubtitle.style.fontSize = '12px';
        mainSubtitle.setAttribute('contenteditable', 'false');
    }

    if (document.getElementById('loginScreen')) document.getElementById('loginScreen')!.style.display = 'none';
    showAppMain();

    if (guestSessionExpiry > 0 && Date.now() > guestSessionExpiry) {
        showGuestBlockScreen("TIEMPO AGOTADO", "El tiempo para participar en esta actividad ha finalizado.");
        return true;
    }

    const previouslyWon = localStorage.getItem(`nexo_guest_played_${guestSessionId}`);
    if (previouslyWon) {
        if (previouslyWon === "REGISTRADO (SORTEO)") {
            showGuestBlockScreen("YA ESTÁS PARTICIPANDO", `¡Gracias por registrarte!<br><br>Ya estás participando en el sorteo. Espera a que el organizador inicie el sorteo en la pantalla principal.<br><br><span style="font-size: 0.75rem; color: #666;">Sesión: ${guestSessionId}</span>`);
        } else {
            showGuestBlockScreen("YA HAS PARTICIPADO", `¡Gracias por participar! Tu premio es: <b>${previouslyWon}</b><br><br>Muestra esta pantalla al personal para reclamar tu premio.<br><br><span style="font-size: 0.75rem; color: #666;">Sesión: ${guestSessionId}</span>`);
        }
        return true;
    }

    // Consultar participación por dispositivo en Supabase en las últimas 24 horas para este juego
    if (cb.isSupabaseConfigured() && adminEmail) {
        const deviceId = getOrCreateDeviceId();
        const activeGame = StateManager.config.savedPrizeLists?.find((l: any) => l.publicSessionId === guestSessionId) ||
                           StateManager.config.savedPrizeLists?.find((l: any) => l.id === StateManager.config.activeSavedListId) ||
                           { id: 'list_juego_estandar' };
        const gameId = activeGame.id;

        try {
            const check = await checkDeviceParticipationInLast24Hours(deviceId, gameId);
            if (check.played) {
                const lastPremio = check.lastPremio || "GIRADO...";
                localStorage.setItem(`nexo_guest_played_${guestSessionId}`, lastPremio);
                
                const lastDate = check.lastPlayedDate ? new Date(check.lastPlayedDate) : new Date();
                const nextPlayDate = new Date(lastDate.getTime() + 24 * 60 * 60 * 1000);
                const timeStr = nextPlayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const dateStr = nextPlayDate.toLocaleDateString();

                if (lastPremio === "REGISTRADO (SORTEO)") {
                    showGuestBlockScreen(
                        "YA ESTÁS PARTICIPANDO", 
                        `¡Gracias por registrarte!<br><br>Ya estás participando en el sorteo. Espera a que el organizador inicie el sorteo.<br><br><span style="font-size: 0.75rem; color: #666;">Podrás registrarte nuevamente a partir de:<br><b>${dateStr} a las ${timeStr}</b></span>`
                    );
                } else {
                    showGuestBlockScreen(
                        "YA HAS PARTICIPADO", 
                        `¡Gracias por participar! Tu premio es: <b>${lastPremio}</b><br><br>Muestra esta pantalla al personal para reclamar tu premio.<br><br><span style="font-size: 0.75rem; color: #666;">Podrás volver a girar a partir de:<br><b>${dateStr} a las ${timeStr}</b></span>`
                    );
                }
                return true;
            }
        } catch (err) {
            console.warn("Error al validar participación por dispositivo en Supabase:", err);
        }
    }

    // Check spin count limits on admin device
    const userEmail = sessionStorage.getItem('nexo_current_user_email');
    if (userEmail) {
        if (guestMaxParticipants > 0 && (StateManager.config.publicSpinsCount || 0) >= guestMaxParticipants) {
            showGuestBlockScreen("LÍMITE DE PARTICIPANTES ALCANZADO", "Se ha alcanzado el límite de participantes configurado para esta sesión.");
            return true;
        }
    }

    appWheel.draw();
    
    // Auto-open registration form directly if required and not registered yet
    if (guestRegistrationRequired) {
        const previouslyWon = localStorage.getItem(`nexo_guest_played_${guestSessionId}`);
        if (!previouslyWon) {
            const registeredLead = userEmail ? null : localStorage.getItem(`nexo_guest_reg_${guestSessionId}`);
            if (!registeredLead) {
                setTimeout(() => {
                    openGuestRegistrationModal();
                }, 400);
            }
        }
    }
    
    const btnSpinCenter = document.getElementById('btnSpinCenter');
    if (btnSpinCenter) {
        if (guestRaffleMode) {
            btnSpinCenter.innerText = "UNIRSE";
            btnSpinCenter.style.fontSize = "0.6rem";
        }
        btnSpinCenter.onclick = () => {
            appWheel.audio.init();
            if (appWheel.isSpinning) return;

            if (guestSessionExpiry > 0 && Date.now() > guestSessionExpiry) {
                showGuestBlockScreen("TIEMPO AGOTADO", "El tiempo para participar en esta actividad ha finalizado.");
                return;
            }

            if (userEmail && guestMaxParticipants > 0 && (StateManager.config.publicSpinsCount || 0) >= guestMaxParticipants) {
                showGuestBlockScreen("LÍMITE DE PARTICIPANTES ALCANZADO", "Se ha alcanzado el límite de participantes configurado para esta sesión.");
                return;
            }

            if (guestRegistrationRequired) {
                const registeredLead = localStorage.getItem(`nexo_guest_reg_${guestSessionId}`);
                if (registeredLead && !userEmail) {
                    let parsedLead: LeadData = {};
                    try {
                        parsedLead = JSON.parse(registeredLead);
                    } catch (e) {}
                    triggerGuestSpin(parsedLead);
                } else {
                    openGuestRegistrationModal();
                }
            } else {
                triggerGuestSpin();
            }
        };
        cb.syncCenterButtonState();
    }

    // Suscribirse a cambios en tiempo real
    if (cb.isSupabaseConfigured() && adminEmail) {
        subscribeToConfigChanges(adminEmail, (latestConfig) => {
            console.log("Guest: Cambio de configuración detectado en tiempo real.");

            const gameSettings = findActiveGameAndSettings(latestConfig);

            // Verificar si el modo público está desactivado o la sesión ha cambiado
            if (!gameSettings.publicJoinEnabled) {
                showGuestBlockScreen("SESIÓN FINALIZADA", "Esta sesión de participación ha finalizado o ha sido desactivada por el organizador.");
                return;
            }

            // Sincronizar configuración en memoria
            StateManager.config = latestConfig;
            
            // Override active game specific properties in memory for drawing/functioning correctly
            StateManager.config.prizes = gameSettings.prizes;

            // Actualizar variables locales del guest mode basadas en la configuración de la nube
            guestMaxParticipants = gameSettings.publicMaxParticipants || 0;
            guestSessionExpiry = gameSettings.publicSessionExpiry || 0;
            guestRegistrationRequired = gameSettings.publicRegisterEnabled === true || gameSettings.raffleMode === true;
            guestRaffleMode = gameSettings.raffleMode === true;

            // Sincronizar título y subtítulo
            if (mainTitle) mainTitle.innerText = latestConfig.title;
            if (mainSubtitle) {
                mainSubtitle.innerText = latestConfig.subtitle || "SISTEMA DE SORTEO";
                mainSubtitle.style.fontSize = (latestConfig.subtitleFontSize || 12) + 'px';
            }

            // Aplicar colores de tema, logos y fondos
            cb.applyActiveThemeColors();

            // Dibujar la ruleta
            if (!appWheel.isSpinning) {
                appWheel.draw();
            }

            // Sincronizar el botón de giro central
            cb.syncCenterButtonState();

            // Dispatch global event for advertising/etc.
            window.dispatchEvent(new CustomEvent('nexo-config-realtime'));
        });

        subscribeToMediaChanges(adminEmail, async (mediaKey, dataUrl) => {
            console.log(`[Guest Media Realtime] Sincronizando asset: ${mediaKey}`);
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
                    cb.applyActiveThemeColors();
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

                cb.applyActiveThemeColors();
                window.dispatchEvent(new CustomEvent('nexo-media-realtime', { detail: { mediaKey, dataUrl } }));
            } catch (err) {
                console.warn(`[Guest Media Realtime] Error al aplicar cambio de media:`, err);
            }
        });
    }

    // Registrar receptores de eventos en tiempo real para publicidad y banners
    window.addEventListener('nexo-config-realtime', () => {
        startBannersEngine();
        startSideAdEngine();
        startStreamingEngine();
    });

    window.addEventListener('nexo-media-realtime', () => {
        startBannersEngine();
        startSideAdEngine();
        startStreamingEngine();
    });

    // Iniciar motores de publicidad en la carga inicial
    startBannersEngine();
    startSideAdEngine();
    startStreamingEngine();

    return true;
};

export const initEmbedMode = async (): Promise<boolean> => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('embed')) return false;

    const cb = getCallbacks();
    isEmbedMode = true;
    document.body.classList.add('is-embed-mode');

    // Add specific styles for Embed/Widget mode
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        body.is-embed-mode {
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
        }
        body.is-embed-mode #btnOpenMenu,
        body.is-embed-mode #sideAdContainer,
        body.is-embed-mode #sideStreamingContainer,
        body.is-embed-mode #bottomBannerContainer {
            display: none !important;
        }
        body.is-embed-mode .app-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        body.is-embed-mode nexo-game-board {
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 10px !important;
            height: 100% !important;
            background: transparent !important;
        }
    `;
    document.head.appendChild(styleEl);

    // Hide administrative buttons
    const btnOpenMenu = document.getElementById('btnOpenMenu');
    if (btnOpenMenu) btnOpenMenu.style.display = 'none';

    const embedAdminEmail = urlParams.get('admin') || "";
    const listId = urlParams.get('listId') || "";

    if (embedAdminEmail) {
        sessionStorage.setItem('nexo_current_user_email', embedAdminEmail);
    }

    const mainTitle = document.getElementById('mainTitle');
    const mainSubtitle = document.getElementById('mainSubtitle');

    // Load active settings from Supabase synchronously to obey full app configurations
    if (cb.isSupabaseConfigured() && embedAdminEmail) {
        try {
            const initialConfig = await cb.fetchConfigFromSupabase(embedAdminEmail);
            if (initialConfig) {
                console.log("Embed Mode: Configuración inicial cargada de Supabase.");
                StateManager.config = initialConfig;
                
                // If listId is specified, let's load that specific list if it exists in savedPrizeLists
                if (listId && initialConfig.savedPrizeLists) {
                    const list = initialConfig.savedPrizeLists.find(l => l.id === listId);
                    if (list) {
                        StateManager.config.prizes = list.prizes || [];
                        StateManager.config.raffleMode = !!list.raffleMode;
                        StateManager.config.localRequireRegister = !!list.localRequireRegister;
                        StateManager.config.autoRemoveWinner = !!list.autoRemoveWinner;
                        StateManager.config.localSessionListEnabled = !!list.localSessionListEnabled;
                        StateManager.config.localSessionId = list.localSessionId || "";
                    }
                }
            }
        } catch (err) {
            console.error("Embed Mode: Error cargando configuración inicial de Supabase:", err);
        }
    }

    // Comply with title/subtitle visibility options from embed options
    if (mainTitle) {
        if (StateManager.config.embedShowTitle === false) {
            mainTitle.style.display = 'none';
        } else {
            mainTitle.innerText = StateManager.config.title || "RULETA";
        }
        mainTitle.setAttribute('contenteditable', 'false');
    }
    if (mainSubtitle) {
        if (StateManager.config.embedShowSubtitle === false) {
            mainSubtitle.style.display = 'none';
        } else {
            mainSubtitle.innerText = StateManager.config.subtitle || "";
        }
        mainSubtitle.setAttribute('contenteditable', 'false');
    }

    // Apply active theme colors
    cb.applyActiveThemeColors();

    if (document.getElementById('loginScreen')) document.getElementById('loginScreen')!.style.display = 'none';
    showAppMain();

    // Redraw wheel
    appWheel.draw();

    // Setup real-time listener if available, to update live state
    if (cb.isSupabaseConfigured() && embedAdminEmail) {
        subscribeToConfigChanges(embedAdminEmail, async (latestConfig) => {
            console.log("Embed Mode: Cambio de configuración detectado en tiempo real.");
            StateManager.config = latestConfig;
            
            if (listId && latestConfig.savedPrizeLists) {
                const list = latestConfig.savedPrizeLists.find(l => l.id === listId);
                if (list) {
                    StateManager.config.prizes = list.prizes || [];
                    StateManager.config.raffleMode = !!list.raffleMode;
                    StateManager.config.localRequireRegister = !!list.localRequireRegister;
                    StateManager.config.autoRemoveWinner = !!list.autoRemoveWinner;
                    StateManager.config.localSessionListEnabled = !!list.localSessionListEnabled;
                    StateManager.config.localSessionId = list.localSessionId || "";
                }
            }

            // Sync titles/subtitles visibility again
            if (mainTitle) {
                if (latestConfig.embedShowTitle === false) {
                    mainTitle.style.display = 'none';
                } else {
                    mainTitle.style.display = 'block';
                    mainTitle.innerText = latestConfig.title || "RULETA";
                }
            }
            if (mainSubtitle) {
                if (latestConfig.embedShowSubtitle === false) {
                    mainSubtitle.style.display = 'none';
                } else {
                    mainSubtitle.style.display = 'block';
                    mainSubtitle.innerText = latestConfig.subtitle || "";
                }
            }

            cb.applyActiveThemeColors();
            if (!appWheel.isSpinning) {
                appWheel.draw();
            }
        });
    }

    return true;
};
