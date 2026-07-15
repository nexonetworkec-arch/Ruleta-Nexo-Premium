import { INITIAL_DEFAULT_CONFIG, THEME_PRESETS, DEFAULT_LICENSE, UserAccount, LeadData, WinnerEntry, Prize } from '../config';
import { Security, StateManager } from '../core';
import { syncMediaToSupabase, fetchMediaFromSupabase } from '../supabase';
import { appWheel } from '../engine';
import { compressImage, debounce, triggerDownload } from '../utils';

/**
 * ============================================================================
 * INTERFACES & ARCHITECTURE FOR 100% MODULAR & SCALABLE ADVERTISING SYSTEM
 * ============================================================================
 * 
 * This design utilizes a highly decoupled, object-oriented component architecture.
 * To integrate a future third-party Ad Provider (such as Google AdSense, custom ad server, 
 * or programmatic header bidding):
 * 
 * 1. Create a class that implements `IAdComponent`.
 * 2. Implement the lifecycles (`init`, `start`, `stop`, `update`).
 * 3. Register it in the `PublicidadManager` via `publicidadManager.registerComponent(yourComponent)`.
 */

export interface IAdComponent {
    id: string;
    init(): void;
    start?(): void | Promise<void>;
    stop?(): void;
    update?(): void | Promise<void>;
}

export interface AdMediaItem {
    type: 'image' | 'video';
    data: string;
    key?: string;
}

// Callbacks required from main system to keep dependencies inverted and clean
export interface PublicidadCallbacks {
    applyActiveThemeColors: () => void;
    generateCustomizedQR: (text: string) => Promise<any>;
    showCustomAlert: (message: string, title?: string) => void;
    showCustomConfirm: (message: string, onConfirm: () => void) => void;
}

let callbacks: PublicidadCallbacks | null = null;

export const setPublicidadCallbacks = (cb: PublicidadCallbacks) => {
    callbacks = cb;
};

const getCallbacks = (): PublicidadCallbacks => {
    if (!callbacks) {
        throw new Error("Publicidad callbacks must be set before invoking functions.");
    }
    return callbacks;
};


/**
 * ============================================================================
 * PROVIDER INTERFACES FOR INDIVIDUAL COMPONENTS (100% MODULAR & SWAPPABLE)
 * ============================================================================
 * Each advertising component delegates its data fetching and rendering settings
 * to a swappable provider interface. This allows developers to integrate programmatic 
 * ad networks, custom API streams, or dynamic schedulers by simply registering a
 * custom provider implementation on any component.
 */

export interface IAdHomeProvider {
    getAdHomeType(): 'text' | 'image' | 'video' | 'text-image' | 'text-video';
    getAdHomeTitle(): string;
    getAdHomeBody(): string;
    getAdHomeImages(): string[];
    getAdVideoUrl(email: string): Promise<string | null>;
    getFrequencyVideoUrl(email: string): Promise<string | null>;
    isVideoLoop(): boolean;
    isVideoMute(): boolean;
    useCarousel(): boolean;
    getTransitionSeconds(): number;
}

export interface IInactivityProvider {
    isEnabled(): boolean;
    getInactivitySeconds(): number;
}

export interface IBannerProvider {
    isEnabled(): boolean;
    getBannersMedia(): AdMediaItem[];
    getIntervalSeconds(): number;
    getPosition(): 'top' | 'bottom';
    getSize(): 'compact' | 'standard' | 'large';
    isVideoMute(): boolean;
    isVideoLoop(): boolean;
    isAutoHideEnabled(): boolean;
}

export interface ISidePersistentProvider {
    isEnabled(): boolean;
    getSideMedia(): AdMediaItem[];
    getIntervalSeconds(): number;
    getPosition(): 'left' | 'right';
    isVideoMute(): boolean;
    isVideoLoop(): boolean;
}

export interface IStreamingProvider {
    isEnabled(): boolean;
    getStreamingUrl(): string;
    getPosition(): 'left' | 'right';
    isVideoMute(): boolean;
    isVideoLoop(): boolean;
}

export interface IQrProvider {
    isEnabled(): boolean;
    getQrUrl(): string;
    getQrTitle(): string;
    getQrMessage(): string;
}


/**
 * ============================================================================
 * DEFAULT SYSTEM PROVIDERS (Reads from Nexo Config & Local State)
 * ============================================================================
 */

export class DefaultAdHomeProvider implements IAdHomeProvider {
    getAdHomeType() {
        return StateManager.config.adHomeType || 'text';
    }
    getAdHomeTitle() {
        return StateManager.config.adHomeTitle || "";
    }
    getAdHomeBody() {
        return StateManager.config.adHomeBody || "";
    }
    getAdHomeImages() {
        return StateManager.config.adHomeImages || [];
    }
    async getAdVideoUrl(email: string) {
        return await fetchMediaFromSupabase(email, "ad_home_video");
    }
    async getFrequencyVideoUrl(email: string) {
        return await fetchMediaFromSupabase(email, "ad_frequency_video");
    }
    isVideoLoop() {
        return !!StateManager.config.adHomeVideoLoop;
    }
    isVideoMute() {
        return StateManager.config.adHomeVideoMute !== false;
    }
    useCarousel() {
        return !!StateManager.config.adHomeUseCarousel;
    }
    getTransitionSeconds() {
        return StateManager.config.adHomeTransitionSeconds || 3;
    }
}

export class DefaultInactivityProvider implements IInactivityProvider {
    isEnabled() {
        return !!StateManager.config.adInactivityEnabled;
    }
    getInactivitySeconds() {
        return StateManager.config.adInactivitySeconds || 60;
    }
}

export class DefaultBannerProvider implements IBannerProvider {
    isEnabled() {
        return !!StateManager.config.adBannersEnabled;
    }
    getBannersMedia() {
        return StateManager.config.adBannersMedia || [];
    }
    getIntervalSeconds() {
        return StateManager.config.adBannersInterval || 10;
    }
    getPosition() {
        return StateManager.config.adBannersPosition || 'bottom';
    }
    getSize() {
        return StateManager.config.adBannersSize || 'standard';
    }
    isVideoMute() {
        return StateManager.config.adBannersVideoMute !== false;
    }
    isVideoLoop() {
        return StateManager.config.adBannersVideoLoop !== false;
    }
    isAutoHideEnabled() {
        return !!StateManager.config.adBannersAutoHide;
    }
}

export class DefaultSidePersistentProvider implements ISidePersistentProvider {
    isEnabled() {
        return !!StateManager.config.adSidePersistentEnabled;
    }
    getSideMedia() {
        return StateManager.config.adSidePersistentMedia || [];
    }
    getIntervalSeconds() {
        return StateManager.config.adSidePersistentInterval || 10;
    }
    getPosition() {
        return StateManager.config.adSidePersistentPosition || 'left';
    }
    isVideoMute() {
        return !!StateManager.config.adSidePersistentVideoMute;
    }
    isVideoLoop() {
        return !!StateManager.config.adSidePersistentVideoLoop;
    }
}

export class DefaultStreamingProvider implements IStreamingProvider {
    isEnabled() {
        return !!StateManager.config.adStreamingEnabled;
    }
    getStreamingUrl() {
        return StateManager.config.adStreamingUrl || "";
    }
    getPosition() {
        return StateManager.config.adStreamingPosition || 'left';
    }
    isVideoMute() {
        return StateManager.config.adStreamingVideoMute !== false;
    }
    isVideoLoop() {
        return StateManager.config.adStreamingVideoLoop !== false;
    }
}

export class DefaultQrProvider implements IQrProvider {
    isEnabled() {
        return !!StateManager.config.adQrEnabled;
    }
    getQrUrl() {
        return StateManager.config.adQrUrl || "";
    }
    getQrTitle() {
        return StateManager.config.adQrTitle || "¡SÍGUENOS Y GANA MÁS!";
    }
    getQrMessage() {
        return StateManager.config.adQrMessage || "Escanea este código para obtener beneficios adicionales.";
    }
}


/**
 * ============================================================================
 * 1. AD HOME COMPONENT (Welcome & Frequency interstitial Ads)
 * ============================================================================
 */
export class AdHomeComponent implements IAdComponent {
    id = 'ad-home';
    adCarouselInterval: number | undefined;
    adVideoUrl: string | null = null;
    frequencyVideoUrl: string | null = null;
    private provider: IAdHomeProvider = new DefaultAdHomeProvider();

    setProvider(provider: IAdHomeProvider) {
        this.provider = provider;
        this.adVideoUrl = null;
        this.frequencyVideoUrl = null;
    }

    getProvider(): IAdHomeProvider {
        return this.provider;
    }

    init() {
        // Initialize default assets if necessary
    }

    async showModal(mode: 'welcome' | 'frequency' = 'welcome') {
        const container = document.getElementById('adHomeContainer');
        if (!container) return;
        
        if (this.adCarouselInterval) {
            window.clearInterval(this.adCarouselInterval);
            this.adCarouselInterval = undefined;
        }
        
        let contentHtml = "";
        let isVideoAd = false;
        const email = sessionStorage.getItem('nexo_current_user_email') || '';

        if (mode === 'frequency') {
            const freqVideoUrl = await this.provider.getFrequencyVideoUrl(email);
            if (freqVideoUrl) {
                this.frequencyVideoUrl = freqVideoUrl;
                const loopStr = this.provider.isVideoLoop() ? 'loop' : '';
                contentHtml = `<video id="adHomeVideoElement" src="${this.frequencyVideoUrl}" autoplay muted ${loopStr} playsinline style="width:100%; max-height:75vh; border-radius:20px; border:1px solid #333; box-shadow:0 10px 30px rgba(0,0,0,0.8); display:block; margin:0 auto;"></video>`;
                isVideoAd = true;
            } else {
                mode = 'welcome';
            }
        }

        if (mode === 'welcome') {
            const homeType = this.provider.getAdHomeType();
            const homeTitle = this.provider.getAdHomeTitle();
            const homeBody = this.provider.getAdHomeBody();
            const homeImages = this.provider.getAdHomeImages();

            if (homeType === 'text') {
                contentHtml = `<h2 style="color:var(--gold); font-size: 2.2rem; margin-bottom: 20px; text-transform:uppercase;">${homeTitle}</h2><div style="color:#fff; font-size: 1.1rem; line-height: 1.6; white-space: pre-wrap;">${homeBody}</div>`;
            } else if (homeType === 'text-image') {
                const firstImg = (homeImages && homeImages.length > 0) ? homeImages[0] : '';
                contentHtml = `<h2 style="color:var(--gold); font-size: 1.8rem; margin-bottom: 20px; text-transform:uppercase;">${homeTitle}</h2><div style="display:flex; flex-direction:column; gap:20px; align-items:center;"><img id="adCarouselImg" src="${firstImg}" style="max-width:100%; max-height:60vh; object-fit:contain; border-radius:15px; border:1px solid #333; box-shadow:0 10px 30px rgba(0,0,0,0.5);"><div style="color:#fff; font-size: 1rem; line-height: 1.5; white-space: pre-wrap;">${homeBody}</div></div>`;
            } else if (homeType === 'image') {
                const firstImg = (homeImages && homeImages.length > 0) ? homeImages[0] : '';
                contentHtml = `<img id="adCarouselImg" src="${firstImg}" style="max-width:100%; max-height:75vh; object-fit:contain; border-radius:20px; border:1px solid #333; box-shadow:0 10px 30px rgba(0,0,0,0.8); display:block; margin:0 auto;">`;
            } else if (homeType === 'video') {
                if (!this.adVideoUrl) {
                    this.adVideoUrl = await this.provider.getAdVideoUrl(email);
                }
                if (this.adVideoUrl) {
                    const loopStr = this.provider.isVideoLoop() ? 'loop' : '';
                    contentHtml = `<video id="adHomeVideoElement" src="${this.adVideoUrl}" autoplay muted ${loopStr} playsinline style="width:100%; max-height:75vh; border-radius:20px; border:1px solid #333; box-shadow:0 10px 30px rgba(0,0,0,0.8); display:block; margin:0 auto;"></video>`;
                    isVideoAd = true;
                } else {
                    contentHtml = `<p style="color:#555; text-transform:uppercase; letter-spacing:2px; font-weight:900;">NO SE HA CARGADO NINGÚN VIDEO</p>`;
                }
            } else if (homeType === 'text-video') {
                if (!this.adVideoUrl) {
                    this.adVideoUrl = await this.provider.getAdVideoUrl(email);
                }
                const loopStr = this.provider.isVideoLoop() ? 'loop' : '';
                const videoElement = this.adVideoUrl ? `<video id="adHomeVideoElement" src="${this.adVideoUrl}" autoplay muted ${loopStr} playsinline style="width:100%; max-height:55vh; border-radius:15px; border:1px solid #333; box-shadow:0 10px 30px rgba(0,0,0,0.5);"></video>` : `<p style="color:#333; border:1px dashed #333; padding:20px; border-radius:15px;">VIDEO NO CARGADO</p>`;
                if (this.adVideoUrl) isVideoAd = true;
                contentHtml = `<h2 style="color:var(--gold); font-size: 1.8rem; margin-bottom: 20px; text-transform:uppercase;">${homeTitle}</h2><div style="display:flex; flex-direction:column; gap:20px; align-items:center;">${videoElement}<div style="color:#fff; font-size: 1rem; line-height: 1.5; white-space: pre-wrap;">${homeBody}</div></div>`;
            }
        }

        container.innerHTML = contentHtml;
        
        const homeType = this.provider.getAdHomeType();
        const homeImages = this.provider.getAdHomeImages();
        if (mode === 'welcome' && (homeType === 'text-image' || homeType === 'image')) {
            if (this.provider.useCarousel() && homeImages && homeImages.length > 1) {
                let currentIdx = 0;
                const imgEl = document.getElementById('adCarouselImg') as HTMLImageElement;
                const transTime = this.provider.getTransitionSeconds() * 1000;
                this.adCarouselInterval = window.setInterval(() => {
                    const currentImages = this.provider.getAdHomeImages();
                    currentIdx = (currentIdx + 1) % currentImages.length;
                    if (imgEl) {
                        imgEl.style.opacity = '0';
                        setTimeout(() => {
                            const updatedImages = this.provider.getAdHomeImages();
                            if (updatedImages && updatedImages[currentIdx]) {
                                imgEl.src = updatedImages[currentIdx];
                                imgEl.style.opacity = '1';
                            }
                        }, 500);
                    }
                }, transTime);
            }
        }
        
        const modal = document.getElementById('modalAdHome');
        if (modal) modal.style.display = 'flex';

        // 1. Manejo avanzado de reproducción automática y finalización para Videos de Publicidad
        if (isVideoAd) {
            const videoEl = document.getElementById('adHomeVideoElement') as HTMLVideoElement;
            if (videoEl) {
                videoEl.muted = true;
                
                const startPlayback = async () => {
                    try {
                        await videoEl.play();
                        console.log("[Ad Autoplay] Video iniciado exitosamente en segundo plano/silenciado.");
                        
                        if (this.provider.isVideoMute() === false) {
                            videoEl.muted = false;
                            if (videoEl.paused) {
                                console.warn("[Ad Autoplay] El navegador pausó el video tras habilitar audio. Re-silenciando para priorizar fluidez.");
                                videoEl.muted = true;
                                await videoEl.play();
                            } else {
                                console.log("[Ad Autoplay] Audio del video publicitario desmuteado exitosamente.");
                            }
                        }
                    } catch (playError) {
                        console.warn("[Ad Autoplay] Reproducción automática bloqueada inicialmente, intentando forzar reproducción silenciada:", playError);
                        videoEl.muted = true;
                        try {
                            await videoEl.play();
                        } catch (mutedError) {
                            console.error("[Ad Autoplay] Fallo catastrófico al reproducir video. Saltando publicidad para no congelar la app:", mutedError);
                            if (mode === 'frequency') {
                                if (modal) modal.style.display = 'none';
                                window.dispatchEvent(new CustomEvent('nexo-ad-completed'));
                            }
                        }
                    }
                };

                if (videoEl.readyState >= 2) {
                    startPlayback();
                } else {
                    videoEl.addEventListener('canplay', startPlayback, { once: true });
                }

                if (mode === 'frequency') {
                    let safetyTimeout: any = null;

                    const setupSafetyTimeout = () => {
                        if (safetyTimeout) clearTimeout(safetyTimeout);
                        const duration = videoEl.duration || 30;
                        const delay = Math.min((duration * 1000) + 1500, 45000);
                        console.log(`[Ad Frequency] Seteando temporizador de seguridad dinámico de ${delay / 1000}s basado en duración real.`);
                        safetyTimeout = setTimeout(() => {
                            console.log("[Ad Frequency] Temporizador de seguridad alcanzado, continuando juego de forma preventiva.");
                            if (modal) modal.style.display = 'none';
                            window.dispatchEvent(new CustomEvent('nexo-ad-completed'));
                        }, delay);
                    };

                    if (videoEl.readyState >= 1) {
                        setupSafetyTimeout();
                    } else {
                        videoEl.addEventListener('loadedmetadata', setupSafetyTimeout, { once: true });
                    }

                    videoEl.onended = () => {
                        if (safetyTimeout) clearTimeout(safetyTimeout);
                        console.log("[Ad Frequency] Video de publicidad finalizado de forma natural, continuando juego.");
                        if (modal) modal.style.display = 'none';
                        window.dispatchEvent(new CustomEvent('nexo-ad-completed'));
                    };

                    videoEl.onerror = (e) => {
                        if (safetyTimeout) clearTimeout(safetyTimeout);
                        console.error("[Ad Frequency] Error al cargar o reproducir el recurso de video de publicidad. Continuando juego.", e);
                        if (modal) modal.style.display = 'none';
                        window.dispatchEvent(new CustomEvent('nexo-ad-completed'));
                    };
                }
            }
        } else if (mode === 'frequency') {
            setTimeout(() => {
                console.log("[Ad Frequency] Publicidad de imagen/texto por frecuencia finalizada.");
                if (modal) modal.style.display = 'none';
                window.dispatchEvent(new CustomEvent('nexo-ad-completed'));
            }, 6000);
        }
    }

    renderAdHomeGallery() {
        const list = document.getElementById('adHomeGalleryList');
        if (!list) return;
        list.innerHTML = (this.provider.getAdHomeImages() || []).map((img, idx) => `<div class="carousel-item-admin" style="background-image: url(${img});"><button class="carousel-item-remove" onclick="removeAdHomeImage(${idx})">×</button></div>`).join("");
    }

    stop() {
        if (this.adCarouselInterval) {
            window.clearInterval(this.adCarouselInterval);
            this.adCarouselInterval = undefined;
        }
    }
}


/**
 * ============================================================================
 * 2. INACTIVITY COMPONENT (User Activity Monitor & Screen Saver triggers)
 * ============================================================================
 */
export class InactivityComponent implements IAdComponent {
    id = 'inactivity';
    inactivityTimeout: number | undefined;
    private provider: IInactivityProvider = new DefaultInactivityProvider();

    setProvider(provider: IInactivityProvider) {
        this.provider = provider;
        this.resetInactivityTimer();
    }

    getProvider(): IInactivityProvider {
        return this.provider;
    }

    init() {
        this.setupInactivityEvents();
    }

    resetInactivityTimer() {
        if (this.inactivityTimeout) window.clearTimeout(this.inactivityTimeout);
        const isEnabled = this.provider.isEnabled();
        const seconds = this.provider.getInactivitySeconds();
        if (isEnabled && seconds > 0) {
            this.inactivityTimeout = window.setTimeout(() => {
                const isAnyModalVisible = Array.from(document.querySelectorAll('.modal')).some(m => (m as HTMLElement).style.display === 'flex');
                if (!appWheel.isSpinning && !isAnyModalVisible) {
                    const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
                    if (adHome) adHome.showModal();
                } else if (this.provider.isEnabled()) {
                    this.resetInactivityTimer();
                }
            }, seconds * 1000);
        }
    }

    setupInactivityEvents() {
        ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(name => {
            window.addEventListener(name, () => this.resetInactivityTimer(), { passive: true });
        });
        this.resetInactivityTimer();
    }

    stop() {
        if (this.inactivityTimeout) {
            window.clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = undefined;
        }
    }
}


/**
 * ============================================================================
 * 3. BANNER COMPONENT (Top/Bottom Rotating Banner Carousels)
 * ============================================================================
 */
export class BannerComponent implements IAdComponent {
    id = 'banners';
    bannerInterval: number | undefined;
    bannerPreviewInterval: number | undefined;
    activeBannerBlobUrls: string[] = [];
    private provider: IBannerProvider = new DefaultBannerProvider();

    setProvider(provider: IBannerProvider) {
        this.provider = provider;
        this.startBannersEngine();
    }

    getProvider(): IBannerProvider {
        return this.provider;
    }

    init() {
        // Init logic for banners
    }

    renderAdBannersList() {
        const list = document.getElementById('adBannersList');
        if (!list) return;
        list.innerHTML = (this.provider.getBannersMedia() || []).map((item, idx) => {
            const bg = item.type === 'image' ? `background-image: url(${item.data});` : `background-color: #111;`;
            const videoIcon = item.type === 'video' ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--gold); font-size:1.2rem;">▶</div>` : "";
            return `<div class="carousel-item-admin" style="${bg}">${videoIcon}<button class="carousel-item-remove" onclick="removeAdBannerMedia(${idx})">×</button></div>`;
        }).join("");
    }

    async startBannersEngine() {
        const container = document.getElementById('bannerContainer');
        const appMain = document.getElementById('appMain');
        const btnMenu = document.getElementById('btnOpenMenu');

        if (this.bannerInterval) { window.clearInterval(this.bannerInterval); this.bannerInterval = undefined; }
        
        this.activeBannerBlobUrls.forEach(url => URL.revokeObjectURL(url));
        this.activeBannerBlobUrls = [];

        const isLiveView = document.body.classList.contains('is-live-view');
        const showAdsInLiveView = StateManager.config.publicLiveViewShowAds !== false;

        const isEnabled = this.provider.isEnabled();
        const bannersMedia = this.provider.getBannersMedia();

        if (!isEnabled || 
            !bannersMedia || 
            bannersMedia.length === 0 ||
            (isLiveView && !showAdsInLiveView)) {
            if(container) { container.style.display = 'none'; container.innerHTML = ""; }
            if(appMain) {
                appMain.classList.remove('banner-ad-active');
                appMain.classList.remove('banner-ad-top');
                appMain.classList.remove('banner-ad-bottom');
                appMain.style.paddingTop = `env(safe-area-inset-top, 10px)`;
                appMain.style.paddingBottom = `env(safe-area-inset-bottom, 10px)`;
            }
            if(btnMenu) btnMenu.style.bottom = "";
            if (appWheel) appWheel.draw();
            // @ts-ignore
            if (window.adjustTitleFontSize) window.adjustTitleFontSize();
            return;
        }

        if(container && appMain) {
            container.style.display = 'flex';
            container.innerHTML = "";
            
            appMain.classList.add('banner-ad-active');
            const pos = this.provider.getPosition();
            if (pos === 'top') {
                appMain.classList.add('banner-ad-top');
                appMain.classList.remove('banner-ad-bottom');
            } else {
                appMain.classList.add('banner-ad-bottom');
                appMain.classList.remove('banner-ad-top');
            }
            
            container.style.top = pos === 'top' ? '0' : 'auto';
            container.style.bottom = pos === 'bottom' ? '0' : 'auto';
            
            const sizeMap = { 'compact': 40, 'standard': 60, 'large': 90 };
            const heightPx = sizeMap[this.provider.getSize() || 'standard'];
            container.style.height = heightPx + 'px';
            appMain.style.setProperty('--banner-height', heightPx + 'px');
            
            container.style.borderTop = pos === 'bottom' ? '1px solid #222' : 'none';
            container.style.borderBottom = pos === 'top' ? '1px solid #222' : 'none';

            if (pos === 'top') {
                appMain.style.paddingTop = `calc(${heightPx}px + env(safe-area-inset-top, 10px))`;
                appMain.style.paddingBottom = `env(safe-area-inset-bottom, 10px)`;
            } else {
                appMain.style.paddingBottom = `calc(${heightPx}px + env(safe-area-inset-bottom, 10px))`;
                appMain.style.paddingTop = `env(safe-area-inset-top, 10px)`;
            }

            if (btnMenu) {
                if (pos === 'bottom') {
                    btnMenu.style.bottom = `calc(${heightPx}px + 20px)`;
                } else {
                    btnMenu.style.bottom = "";
                }
            }
            if (appWheel) appWheel.draw();
            // @ts-ignore
            if (window.adjustTitleFontSize) window.adjustTitleFontSize();
        }

        let currentIdx = 0;

        const renderMedia = async (idx: number) => {
            if (!container) return;
            const currentMedia = this.provider.getBannersMedia();
            if (!currentMedia || !currentMedia[idx]) return;
            const item = currentMedia[idx];
            let newEl: HTMLElement;

            if (item.type === 'image') {
                const img = document.createElement('img');
                img.id = 'bannerImg';
                img.src = item.data;
                img.style.opacity = '0';
                img.style.height = '100%';
                img.style.width = '100%';
                img.style.objectFit = 'contain';
                img.style.position = 'absolute';
                img.style.transition = 'opacity 0.5s ease';
                newEl = img;
            } else {
                const video = document.createElement('video');
                video.id = 'bannerVideo';
                video.autoplay = true;
                video.muted = this.provider.isVideoMute();
                video.loop = this.provider.isVideoLoop();
                video.playsInline = true;
                video.style.height = '100%';
                video.style.width = '100%';
                video.style.objectFit = 'contain';
                video.style.position = 'absolute';
                video.style.transition = 'opacity 0.5s ease';
                const url = item.data;
                video.src = url;
                video.style.opacity = '0';
                newEl = video;
            }

            const oldEl = container.firstElementChild as HTMLElement;
            if (oldEl) {
                oldEl.style.opacity = '0';
                setTimeout(() => {
                    container.innerHTML = "";
                    container.appendChild(newEl);
                    setTimeout(() => newEl.style.opacity = '1', 50);
                }, 500);
            } else {
                container.appendChild(newEl);
                setTimeout(() => newEl.style.opacity = '1', 50);
            }
        };

        await renderMedia(0);

        if(bannersMedia.length > 1) {
            const interval = this.provider.getIntervalSeconds() * 1000;
            this.bannerInterval = window.setInterval(async () => {
                const currentMedia = this.provider.getBannersMedia();
                currentIdx = (currentIdx + 1) % currentMedia.length;
                await renderMedia(currentIdx);
            }, interval);
        }
    }

    stop() {
        if (this.bannerInterval) {
            window.clearInterval(this.bannerInterval);
            this.bannerInterval = undefined;
        }
        if (this.bannerPreviewInterval) {
            window.clearInterval(this.bannerPreviewInterval);
            this.bannerPreviewInterval = undefined;
        }
    }
}


/**
 * ============================================================================
 * 4. SIDE PERSISTENT AD COMPONENT (Left/Right Side Rotating Ads)
 * ============================================================================
 */
export class SidePersistentComponent implements IAdComponent {
    id = 'side-persistent';
    sideAdCarouselInterval: number | undefined;
    activeSideAdBlobUrls: string[] = [];
    private provider: ISidePersistentProvider = new DefaultSidePersistentProvider();

    setProvider(provider: ISidePersistentProvider) {
        this.provider = provider;
        this.startSideAdEngine();
    }

    getProvider(): ISidePersistentProvider {
        return this.provider;
    }

    init() {
        // Init side ads
    }

    renderAdSidePersistentList() {
        const list = document.getElementById('adSidePersistentList');
        if (!list) return;
        list.innerHTML = (this.provider.getSideMedia() || []).map((item, idx) => {
            const bg = item.type === 'image' ? `background-image: url(${item.data});` : `background-color: #111;`;
            const videoIcon = item.type === 'video' ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--gold); font-size:1.2rem;">▶</div>` : "";
            return `<div class="carousel-item-admin" style="${bg}">${videoIcon}<button class="carousel-item-remove" onclick="removeAdSidePersistentMedia(${idx})">×</button></div>`;
        }).join("");
    }

    async startSideAdEngine() {
        const sideAdContainer = document.getElementById('sideAdContainer');
        const appMain = document.getElementById('appMain');
        const previewContainer = document.getElementById('sideAdPreviewContainer');
        const previewContent = document.getElementById('sideAdPreviewContent');

        if (this.sideAdCarouselInterval) { window.clearInterval(this.sideAdCarouselInterval); this.sideAdCarouselInterval = undefined; }
        
        this.activeSideAdBlobUrls.forEach(url => URL.revokeObjectURL(url));
        this.activeSideAdBlobUrls = [];

        const config = StateManager.config;
        const isLiveView = document.body.classList.contains('is-live-view');
        const showAdsInLiveView = config.publicLiveViewShowAds !== false;

        const isEnabled = this.provider.isEnabled();
        const sideMedia = this.provider.getSideMedia();

        if (!isEnabled || 
            !sideMedia || 
            sideMedia.length === 0 || 
            config.adStreamingEnabled ||
            (isLiveView && !showAdsInLiveView)) {
            if (sideAdContainer) { sideAdContainer.style.display = 'none'; sideAdContainer.innerHTML = ""; }
            if (previewContainer) previewContainer.style.display = 'none';
            if (appMain) {
                appMain.classList.remove('side-ad-active');
                appMain.classList.remove('side-ad-right');
            }
            if (appWheel) appWheel.draw();
            // @ts-ignore
            if (window.adjustTitleFontSize) window.adjustTitleFontSize();
            return;
        }

        if (sideAdContainer && appMain) {
            sideAdContainer.style.display = 'flex';
            appMain.classList.add('side-ad-active');
            if (this.provider.getPosition() === 'right') {
                appMain.classList.add('side-ad-right');
            } else {
                appMain.classList.remove('side-ad-right');
            }
            if (previewContainer) previewContainer.style.display = 'block';
            // @ts-ignore
            if (window.adjustTitleFontSize) window.adjustTitleFontSize();
        }

        let currentIdx = 0;

        const renderMedia = async (idx: number) => {
            if (!sideAdContainer) return;
            const currentMedia = this.provider.getSideMedia();
            if (!currentMedia || !currentMedia[idx]) return;
            const item = currentMedia[idx];
            let mediaHtml = "";

            if (item.type === 'image') {
                mediaHtml = `<img src="${item.data}" style="opacity:0; transition: opacity 0.5s ease;">`;
            } else {
                const url = item.data;
                const isMuted = this.provider.isVideoMute();
                const isLoop = this.provider.isVideoLoop();
                mediaHtml = `<video src="${url}" autoplay ${isMuted ? 'muted' : ''} ${isLoop ? 'loop' : ''} playsinline style="opacity:0; transition: opacity 0.5s ease;"></video>`;
            }

            const oldWindow = sideAdContainer.querySelector('.side-ad-window');
            const newWindow = document.createElement('div');
            newWindow.className = 'side-ad-window';
            newWindow.innerHTML = mediaHtml;

            if (oldWindow) {
                (oldWindow.firstElementChild as HTMLElement).style.opacity = '0';
                setTimeout(() => {
                    sideAdContainer.innerHTML = "";
                    sideAdContainer.appendChild(newWindow);
                    if (previewContent) previewContent.innerHTML = `<div class="side-ad-window" style="border-radius:10px; box-shadow:none; border-width:1px;">${mediaHtml}</div>`;
                    setTimeout(() => {
                        (newWindow.firstElementChild as HTMLElement).style.opacity = '1';
                        const v = newWindow.querySelector('video');
                        if (v) v.play().catch(() => {});

                        if (previewContent?.querySelector('.side-ad-window img, .side-ad-window video')) {
                            const pv = previewContent.querySelector('.side-ad-window video') as HTMLVideoElement;
                            if (pv) pv.play().catch(() => {});
                            (previewContent.querySelector('.side-ad-window img, .side-ad-window video') as HTMLElement).style.opacity = '1';
                        }
                    }, 50);
                }, 500);
            } else {
                sideAdContainer.appendChild(newWindow);
                if (previewContent) previewContent.innerHTML = `<div class="side-ad-window" style="border-radius:10px; box-shadow:none; border-width:1px;">${mediaHtml}</div>`;
                setTimeout(() => {
                    (newWindow.firstElementChild as HTMLElement).style.opacity = '1';
                    const v = newWindow.querySelector('video');
                    if (v) v.play().catch(() => {});

                    if (previewContent?.querySelector('.side-ad-window img, .side-ad-window video')) {
                        const pv = previewContent.querySelector('.side-ad-window video') as HTMLVideoElement;
                        if (pv) pv.play().catch(() => {});
                        (previewContent.querySelector('.side-ad-window img, .side-ad-window video') as HTMLElement).style.opacity = '1';
                    }
                }, 50);
            }
        };

        await renderMedia(0);

        if (sideMedia.length > 1) {
            const interval = this.provider.getIntervalSeconds() * 1000;
            this.sideAdCarouselInterval = window.setInterval(async () => {
                const currentMedia = this.provider.getSideMedia();
                currentIdx = (currentIdx + 1) % currentMedia.length;
                await renderMedia(currentIdx);
            }, interval);
        }
        
        if (appWheel) appWheel.draw();
    }

    stop() {
        if (this.sideAdCarouselInterval) {
            window.clearInterval(this.sideAdCarouselInterval);
            this.sideAdCarouselInterval = undefined;
        }
    }
}


/**
 * ============================================================================
 * 5. STREAMING COMPONENT (Live Streaming, YouTube/Twitch integration sidebar)
 * ============================================================================
 */
export class StreamingComponent implements IAdComponent {
    id = 'streaming';
    
    // Cache variables to prevent forced iframe reloads
    lastRenderedStreamingUrl = "";
    lastRenderedStreamingPos = "";
    lastRenderedStreamingMute: boolean | undefined = undefined;
    lastRenderedStreamingLoop: boolean | undefined = undefined;
    lastRenderedStreamingEnabled: boolean | undefined = undefined;
    private provider: IStreamingProvider = new DefaultStreamingProvider();

    setProvider(provider: IStreamingProvider) {
        this.provider = provider;
        this.startStreamingEngine();
    }

    getProvider(): IStreamingProvider {
        return this.provider;
    }

    init() {
        // Init streaming
    }

    getEmbedHtml(input: string): string {
        if (!input) return "";
        const clean = input.trim();
        const isMuted = this.provider.isVideoMute();
        const isLoop = this.provider.isVideoLoop();

        // Direct video files
        if (clean.toLowerCase().endsWith('.mp4') || clean.toLowerCase().endsWith('.webm') || clean.toLowerCase().endsWith('.ogg')) {
            return `<video src="${clean}" ${isMuted ? 'muted' : ''} ${isLoop ? 'loop' : ''} autoplay playsinline style="width: 100%; height: 100%; object-fit: contain; border-radius: 9px;"></video>`;
        }

        // 1. If it's already an iframe or div embed code
        if (clean.toLowerCase().startsWith("<iframe") || clean.toLowerCase().startsWith("<div")) {
            let embed = clean;
            if (clean.toLowerCase().startsWith("<iframe")) {
                embed = clean.replace(/width="[^"]*"/gi, 'width="100%"')
                             .replace(/height="[^"]*"/gi, 'height="100%"')
                             .replace(/style="[^"]*"/gi, 'style="width: 100%; height: 100%; border: none; border-radius: 9px;"');
                if (!embed.includes("style=")) {
                    embed = embed.replace("<iframe", '<iframe style="width: 100%; height: 100%; border: none; border-radius: 9px;"');
                }
                // YouTube iframe src parameter patches
                if (embed.includes("youtube.com/embed/")) {
                    const matchSrc = embed.match(/src="([^"]+)"/);
                    if (matchSrc && matchSrc[1]) {
                        try {
                            const urlObj = new URL(matchSrc[1].startsWith('//') ? 'https:' + matchSrc[1] : matchSrc[1]);
                            urlObj.searchParams.set("autoplay", "1");
                            urlObj.searchParams.set("mute", isMuted ? "1" : "0");
                            if (isLoop) {
                                urlObj.searchParams.set("loop", "1");
                                const ytId = matchSrc[1].split("/embed/")[1]?.split(/[?#]/)[0];
                                if (ytId) {
                                    urlObj.searchParams.set("playlist", ytId);
                                }
                            }
                            embed = embed.replace(matchSrc[0], `src="${urlObj.toString()}"`);
                        } catch (e) {
                            console.error("Error patching youtube embed URL", e);
                        }
                    }
                }
            }
            return embed;
        }

        // 2. Convert standard YouTube URL to embed URL
        let ytId = "";
        if (clean.includes("youtube.com/watch")) {
            const urlParams = new URLSearchParams(clean.substring(clean.indexOf("?")));
            ytId = urlParams.get("v") || "";
        } else if (clean.includes("youtu.be/")) {
            const parts = clean.split("youtu.be/");
            ytId = parts[1]?.split(/[?#]/)[0] || "";
        } else if (clean.includes("youtube.com/embed/")) {
            const parts = clean.split("youtube.com/embed/");
            ytId = parts[1]?.split(/[?#]/)[0] || "";
        } else if (clean.includes("youtube.com/live/")) {
            const parts = clean.split("youtube.com/live/");
            ytId = parts[1]?.split(/[?#]/)[0] || "";
        }

        if (ytId) {
            let ytSrc = `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${isMuted ? '1' : '0'}`;
            if (isLoop) {
                ytSrc += `&loop=1&playlist=${ytId}`;
            }
            return `<iframe src="${ytSrc}" style="width: 100%; height: 100%; border: none; border-radius: 9px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        }

        // 3. Convert Twitch Channel URL to embed
        if (clean.includes("twitch.tv/")) {
            const parts = clean.split("twitch.tv/");
            const channel = parts[1]?.split(/[?#]/)[0] || "";
            if (channel) {
                const host = window.location.hostname;
                return `<iframe src="https://player.twitch.tv/?channel=${channel}&parent=${host}&muted=${isMuted ? 'true' : 'false'}&autoplay=true" style="width: 100%; height: 100%; border: none; border-radius: 9px;" allowfullscreen="true"></iframe>`;
            }
        }

        // 4. Default iframe wrap for any general URL
        return `<iframe src="${clean}" style="width: 100%; height: 100%; border: none; border-radius: 9px;" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    }

    async startStreamingEngine() {
        const sideStreamingContainer = document.getElementById('sideStreamingContainer');
        const appMain = document.getElementById('appMain');

        const config = StateManager.config;
        const isLiveView = document.body.classList.contains('is-live-view');
        const showAdsInLiveView = config.publicLiveViewShowAds !== false;

        const isEnabled = !!(this.provider.isEnabled() && this.provider.getStreamingUrl() && (!isLiveView || showAdsInLiveView));
        const currentUrl = this.provider.getStreamingUrl() || "";
        const currentPos = this.provider.getPosition() || "left";
        const currentMute = this.provider.isVideoMute();
        const currentLoop = this.provider.isVideoLoop();

        // If rendering parameters didn't change, preserve current frame state to avoid video interruption
        if (
            this.lastRenderedStreamingEnabled === isEnabled &&
            this.lastRenderedStreamingUrl === currentUrl &&
            this.lastRenderedStreamingPos === currentPos &&
            this.lastRenderedStreamingMute === currentMute &&
            this.lastRenderedStreamingLoop === currentLoop
        ) {
            return;
        }

        // Save current frame state to cache
        this.lastRenderedStreamingEnabled = isEnabled;
        this.lastRenderedStreamingUrl = currentUrl;
        this.lastRenderedStreamingPos = currentPos;
        this.lastRenderedStreamingMute = currentMute;
        this.lastRenderedStreamingLoop = currentLoop;

        if (!isEnabled) {
            if (sideStreamingContainer) { 
                sideStreamingContainer.style.display = 'none'; 
                sideStreamingContainer.innerHTML = ""; 
            }
            if (!config.adSidePersistentEnabled || !config.adSidePersistentMedia || config.adSidePersistentMedia.length === 0) {
                if (appMain) {
                    appMain.classList.remove('side-ad-active');
                    appMain.classList.remove('side-ad-right');
                }
            }
            if (appWheel) appWheel.draw();
            // @ts-ignore
            if (window.adjustTitleFontSize) window.adjustTitleFontSize();
            return;
        }

        if (config.adSidePersistentEnabled) {
            const sideAdContainer = document.getElementById('sideAdContainer');
            if (sideAdContainer) {
                sideAdContainer.style.display = 'none';
                sideAdContainer.innerHTML = "";
            }
        }

        if (sideStreamingContainer && appMain) {
            sideStreamingContainer.style.display = 'flex';
            appMain.classList.add('side-ad-active');
            if (currentPos === 'right') {
                appMain.classList.add('side-ad-right');
            } else {
                appMain.classList.remove('side-ad-right');
            }
            // @ts-ignore
            if (window.adjustTitleFontSize) window.adjustTitleFontSize();
        }

        if (sideStreamingContainer) {
            const embedHtml = this.getEmbedHtml(currentUrl);
            sideStreamingContainer.innerHTML = `<div class="side-ad-window" style="width: 100%; aspect-ratio: 16/9; max-height: 90vh; display: flex; align-items: center; justify-content: center; background: #000; border-radius: 9px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.9);">${embedHtml}</div>`;
        }

        if (appWheel) appWheel.draw();
    }
}


/**
 * ============================================================================
 * 6. QR COMPONENT (Pop-up QR Overlay & Benefits card)
 * ============================================================================
 */
export class QrComponent implements IAdComponent {
    id = 'qr';
    private provider: IQrProvider = new DefaultQrProvider();

    setProvider(provider: IQrProvider) {
        this.provider = provider;
    }

    getProvider(): IQrProvider {
        return this.provider;
    }

    init() {
        // Init QR
    }

    showModal() {
        if (!this.provider.isEnabled() || !this.provider.getQrUrl()) return;
        const title = document.getElementById('qrTitle');
        const msg = document.getElementById('qrMessage');
        const modal = document.getElementById('modalQR');

        if (title) title.innerText = this.provider.getQrTitle();
        if (msg) msg.innerText = this.provider.getQrMessage();
        
        const divLiveContainer = document.getElementById('divLiveViewLinkContainer');
        if (divLiveContainer) divLiveContainer.style.display = 'none';

        getCallbacks().generateCustomizedQR(this.provider.getQrUrl()).then(() => {
            if (modal) modal.style.display = 'flex';
        });
    }
}


/**
 * ============================================================================
 * ORCHESTRATOR: PUBLICIDAD MANAGER
 * ============================================================================
 */
class PublicidadManager {
    private components: Map<string, IAdComponent> = new Map();

    constructor() {
        // Register default components representing nexo core system
        this.registerComponent(new AdHomeComponent());
        this.registerComponent(new InactivityComponent());
        this.registerComponent(new BannerComponent());
        this.registerComponent(new SidePersistentComponent());
        this.registerComponent(new StreamingComponent());
        this.registerComponent(new QrComponent());
    }

    registerComponent(component: IAdComponent) {
        this.components.set(component.id, component);
        try {
            component.init();
        } catch (e) {
            console.error(`Error al inicializar el componente de publicidad [${component.id}]:`, e);
        }
    }

    getComponent<T extends IAdComponent>(id: string): T | undefined {
        return this.components.get(id) as T;
    }

    updateActiveBadges() {
        const config = StateManager.config;
        
        const badgeHome = document.getElementById('adHomeActiveBadge');
        if (badgeHome) {
            badgeHome.innerHTML = config.adInactivityEnabled
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 255, 255, 0.05); color: #888; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">⚪ INACTIVO</span>`;
        }

        const badgeBanners = document.getElementById('adBannersActiveBadge');
        if (badgeBanners) {
            badgeBanners.innerHTML = config.adBannersEnabled
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 255, 255, 0.05); color: #888; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">⚪ INACTIVO</span>`;
        }

        const badgeVideoAds = document.getElementById('adVideoAdsActiveBadge');
        if (badgeVideoAds) {
            badgeVideoAds.innerHTML = config.adVideoAdsEnabled
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 255, 255, 0.05); color: #888; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">⚪ INACTIVO</span>`;
        }

        const badgeSide = document.getElementById('adSidePersistentActiveBadge');
        if (badgeSide) {
            badgeSide.innerHTML = config.adSidePersistentEnabled
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 255, 255, 0.05); color: #888; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">⚪ INACTIVO</span>`;
        }

        const badgeStreaming = document.getElementById('adStreamingActiveBadge');
        if (badgeStreaming) {
            badgeStreaming.innerHTML = config.adStreamingEnabled
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 255, 255, 0.05); color: #888; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">⚪ INACTIVO</span>`;
        }

        const badgeQr = document.getElementById('adQrActiveBadge');
        if (badgeQr) {
            badgeQr.innerHTML = config.adQrEnabled
                ? `<span style="background: rgba(0, 255, 127, 0.15); color: #00ff7f; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">🟢 ACTIVO</span>`
                : `<span style="background: rgba(255, 255, 255, 0.05); color: #888; padding: 4px 8px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; letter-spacing: 0.5px;">⚪ INACTIVO</span>`;
        }
    }

    applyInitialAdLayoutState() {
        const appMain = document.getElementById('appMain');
        if (!appMain) return;

        const config = StateManager.config;
        const isLiveView = document.body.classList.contains('is-live-view');
        const showAdsInLiveView = config.publicLiveViewShowAds !== false;

        const streaming = this.getComponent<StreamingComponent>('streaming');
        const sidePersistent = this.getComponent<SidePersistentComponent>('side-persistent');

        const isStreamingEnabled = !!(streaming && streaming.getProvider().isEnabled() && streaming.getProvider().getStreamingUrl() && (!isLiveView || showAdsInLiveView));
        const sideMedia = sidePersistent ? sidePersistent.getProvider().getSideMedia() : [];
        const isSideAdEnabled = !!(sidePersistent && sidePersistent.getProvider().isEnabled() && sideMedia && sideMedia.length > 0 && !config.adStreamingEnabled && (!isLiveView || showAdsInLiveView));

        if (isStreamingEnabled || isSideAdEnabled) {
            appMain.classList.add('side-ad-active');
            const pos = isStreamingEnabled 
                ? (streaming ? streaming.getProvider().getPosition() : 'left') 
                : (sidePersistent ? sidePersistent.getProvider().getPosition() : 'left');
            if (pos === 'right') {
                appMain.classList.add('side-ad-right');
            } else {
                appMain.classList.remove('side-ad-right');
            }
            
            const sideStreamingContainer = document.getElementById('sideStreamingContainer');
            const sideAdContainer = document.getElementById('sideAdContainer');
            
            if (isStreamingEnabled) {
                if (sideStreamingContainer) sideStreamingContainer.style.display = 'flex';
                if (sideAdContainer) sideAdContainer.style.display = 'none';
            } else {
                if (sideAdContainer) sideAdContainer.style.display = 'flex';
                if (sideStreamingContainer) sideStreamingContainer.style.display = 'none';
            }
        } else {
            appMain.classList.remove('side-ad-active');
            appMain.classList.remove('side-ad-right');
            const sideStreamingContainer = document.getElementById('sideStreamingContainer');
            const sideAdContainer = document.getElementById('sideAdContainer');
            if (sideStreamingContainer) sideStreamingContainer.style.display = 'none';
            if (sideAdContainer) sideAdContainer.style.display = 'none';
        }
    }

    showAppMain() {
        const appMain = document.getElementById('appMain');
        if (appMain) {
            this.applyInitialAdLayoutState();
            appMain.style.display = 'flex';
        }
    }
}

export const publicidadManager = new PublicidadManager();


/**
 * ============================================================================
 * EXPORTED LEGACY WRAPPERS (Maintains perfect backward-compatibility)
 * ============================================================================
 */

export const showAdHomeModal = async (mode: 'welcome' | 'frequency' = 'welcome') => {
    const comp = publicidadManager.getComponent<AdHomeComponent>('ad-home');
    if (comp) await comp.showModal(mode);
};

export const resetInactivityTimer = () => {
    const comp = publicidadManager.getComponent<InactivityComponent>('inactivity');
    if (comp) comp.resetInactivityTimer();
};

export const setupInactivityEvents = () => {
    const comp = publicidadManager.getComponent<InactivityComponent>('inactivity');
    if (comp) comp.setupInactivityEvents();
};

export const showQrModal = () => {
    const comp = publicidadManager.getComponent<QrComponent>('qr');
    if (comp) comp.showModal();
};

export const updatePublicidadActiveBadges = () => {
    publicidadManager.updateActiveBadges();
};

export const renderAdSidePersistentList = () => {
    const comp = publicidadManager.getComponent<SidePersistentComponent>('side-persistent');
    if (comp) comp.renderAdSidePersistentList();
};

export const startSideAdEngine = async () => {
    const comp = publicidadManager.getComponent<SidePersistentComponent>('side-persistent');
    if (comp) await comp.startSideAdEngine();
};

export const renderAdBannersList = () => {
    const comp = publicidadManager.getComponent<BannerComponent>('banners');
    if (comp) comp.renderAdBannersList();
};

export const startBannersEngine = async () => {
    const comp = publicidadManager.getComponent<BannerComponent>('banners');
    if (comp) await comp.startBannersEngine();
};

export const getStreamingEmbedHtml = (input: string): string => {
    const comp = publicidadManager.getComponent<StreamingComponent>('streaming');
    return comp ? comp.getEmbedHtml(input) : "";
};

export const startStreamingEngine = async () => {
    const comp = publicidadManager.getComponent<StreamingComponent>('streaming');
    if (comp) await comp.startStreamingEngine();
};

export const applyInitialAdLayoutState = () => {
    publicidadManager.applyInitialAdLayoutState();
};

export const showAppMain = () => {
    publicidadManager.showAppMain();
};


/**
 * ============================================================================
 * DOM EVENT HANDLERS & REGISTRATION BINDINGS
 * ============================================================================
 */

export const initPublicidadHandlers = () => {
    // Inicializar sub-pestañas de publicidad (100% Modular, Escalable y con Persistencia de sesión)
    const initAdSubtabs = () => {
        const container = document.getElementById('tab-publicidad');
        if (!container) return;

        const subTabs = container.querySelectorAll('.publicidad-sub-tab-btn');
        const subPanes = container.querySelectorAll('.publicidad-sub-tab-pane');

        const setActiveAdSubtab = (subtabId: string) => {
            subTabs.forEach(t => t.classList.remove('active'));
            subPanes.forEach(p => {
                p.classList.remove('active');
                (p as HTMLElement).style.display = 'none';
            });

            const subTabButton = container.querySelector(`.publicidad-sub-tab-btn[data-subtab="${subtabId}"]`);
            const subTabPane = document.getElementById(subtabId);

            if (subTabButton) subTabButton.classList.add('active');
            if (subTabPane) {
                subTabPane.classList.add('active');
                (subTabPane as HTMLElement).style.display = 'block';
            }
            sessionStorage.setItem('nexo_active_ad_subtab', subtabId);
        };

        subTabs.forEach(tab => {
            (tab as HTMLElement).onclick = () => {
                const target = tab.getAttribute('data-subtab');
                if (target) {
                    setActiveAdSubtab(target);
                }
            };
        });

        const savedSubtab = sessionStorage.getItem('nexo_active_ad_subtab') || 'subtab-ad-welcome';
        setActiveAdSubtab(savedSubtab);
    };

    initAdSubtabs();

    const chkAdInactivity = document.getElementById('chkAdInactivity') as HTMLInputElement;
    const inputAdInactivitySeconds = document.getElementById('inputAdInactivitySeconds') as HTMLInputElement;

    const refreshAdPreviews = () => {
        if (chkAdInactivity) chkAdInactivity.checked = !!StateManager.config.adInactivityEnabled;
        if (inputAdInactivitySeconds) inputAdInactivitySeconds.value = (StateManager.config.adInactivitySeconds || 60).toString();
        getCallbacks().applyActiveThemeColors();
        updatePublicidadActiveBadges();
    };

    const handleFile = (input: HTMLInputElement, prop: string) => {
        const files = input.files; if (!files) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = async (re) => {
                let dataUrl = re.target?.result as string;
                if (file.type.startsWith('image/')) {
                    dataUrl = await compressImage(dataUrl);
                }
                if (prop === 'adHomeImages') {
                    if (!StateManager.config.adHomeImages) StateManager.config.adHomeImages = [];
                    StateManager.config.adHomeImages.push(dataUrl); 
                    const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
                    if (adHome) adHome.renderAdHomeGallery();
                } else if (prop === 'adBannersMedia') {
                    if (!StateManager.config.adBannersMedia) StateManager.config.adBannersMedia = [];
                    StateManager.config.adBannersMedia.push({ type: 'image', data: dataUrl }); 
                    const banners = publicidadManager.getComponent<BannerComponent>('banners');
                    if (banners) {
                        banners.renderAdBannersList();
                        banners.startBannersEngine();
                    }
                }
                StateManager.save();
            };
            reader.readAsDataURL(file);
        });
        input.value = "";
    };

    if (chkAdInactivity) chkAdInactivity.onchange = (e) => {
        StateManager.config.adInactivityEnabled = (e.target as HTMLInputElement).checked; 
        StateManager.save(); 
        resetInactivityTimer();
    };
    if (inputAdInactivitySeconds) inputAdInactivitySeconds.oninput = (e) => {
        StateManager.config.adInactivitySeconds = parseInt((e.target as HTMLInputElement).value) || 60; 
        StateManager.save(); 
        resetInactivityTimer();
    };

    const typeBtns = document.querySelectorAll('.ad-type-btn');
    const textInputsArea = document.getElementById('adHomeTextInputs');
    const imgInputArea = document.getElementById('adHomeImageInput');
    const videoInputArea = document.getElementById('adHomeVideoInput');
    const inputTitle = document.getElementById('inputAdHomeTitle') as HTMLInputElement;
    const inputBody = document.getElementById('inputAdHomeBody') as HTMLTextAreaElement;
    const inputAdHomeFiles = document.getElementById('inputAdHomeFiles') as HTMLInputElement;
    const inputAdHomeVideoFile = document.getElementById('inputAdHomeVideoFile') as HTMLInputElement;
    const btnPublishAd = document.getElementById('btnPublishAdHome');
    const chkAdHomeCarousel = document.getElementById('chkAdHomeCarousel') as HTMLInputElement;
    const carouselSettings = document.getElementById('carouselSettings');
    const inputAdHomeTransition = document.getElementById('inputAdHomeTransition') as HTMLInputElement;
    const chkAdVideoMute = document.getElementById('chkAdVideoMute') as HTMLInputElement;
    const chkAdVideoLoop = document.getElementById('chkAdVideoLoop') as HTMLInputElement;

    // Attach deletion functions directly on window for direct HTML inline execution compatibility
    (window as any).removeAdHomeImage = (idx: number) => {
        if (StateManager.config.adHomeImages) { 
            StateManager.config.adHomeImages.splice(idx, 1); 
            StateManager.save(); 
            const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
            if (adHome) adHome.renderAdHomeGallery(); 
        }
    };

    const updateAdHomeUI = async () => {
        if (inputTitle) inputTitle.value = StateManager.config.adHomeTitle || "";
        if (inputBody) inputBody.value = StateManager.config.adHomeBody || "";
        if (chkAdHomeCarousel) chkAdHomeCarousel.checked = !!StateManager.config.adHomeUseCarousel;
        if (inputAdHomeTransition) inputAdHomeTransition.value = (StateManager.config.adHomeTransitionSeconds || 3).toString();
        if (carouselSettings) carouselSettings.style.display = StateManager.config.adHomeUseCarousel ? 'block' : 'none';
        if (chkAdVideoMute) chkAdVideoMute.checked = StateManager.config.adHomeVideoMute !== false;
        if (chkAdVideoLoop) chkAdVideoLoop.checked = StateManager.config.adHomeVideoLoop !== false;
        
        typeBtns.forEach(btn => {
            if (btn.getAttribute('data-type') === StateManager.config.adHomeType) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        if (textInputsArea) textInputsArea.style.display = (StateManager.config.adHomeType === 'text' || StateManager.config.adHomeType === 'text-image' || StateManager.config.adHomeType === 'text-video') ? 'flex' : 'none';
        if (imgInputArea) imgInputArea.style.display = (StateManager.config.adHomeType === 'image' || StateManager.config.adHomeType === 'text-image') ? 'block' : 'none';
        if (videoInputArea) videoInputArea.style.display = (StateManager.config.adHomeType === 'video' || StateManager.config.adHomeType === 'text-video') ? 'block' : 'none';
        
        if (StateManager.config.adHomeType === 'video' || StateManager.config.adHomeType === 'text-video') {
            const email = sessionStorage.getItem('nexo_current_user_email') || '';
            const videoUrl = await fetchMediaFromSupabase(email, "ad_home_video");
            const previewContainer = document.getElementById('videoPreviewContainer');
            const previewEl = document.getElementById('adminVideoPreview') as HTMLVideoElement;
            if (videoUrl && previewContainer && previewEl) {
                const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
                if (adHome) adHome.adVideoUrl = videoUrl;
                previewEl.src = videoUrl;
                previewContainer.style.display = 'block';
            } else if (previewContainer) {
                previewContainer.style.display = 'none';
            }
        }
        
        const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
        if (adHome) adHome.renderAdHomeGallery();
        updatePublicidadActiveBadges();
    };

    if (btnPublishAd) btnPublishAd.onclick = () => {
        if (appWheel.isSpinning) return;
        const modalConfig = document.getElementById('modalConfig');
        if (modalConfig) {
            modalConfig.style.display = 'none';
            sessionStorage.setItem('nexo_menu_open', 'false');
        }
        showAdHomeModal();
    };

    typeBtns.forEach(btn => {
        (btn as HTMLElement).onclick = () => { 
            StateManager.config.adHomeType = btn.getAttribute('data-type') as any; 
            updateAdHomeUI(); 
            StateManager.save(); 
        };
    });
    if (inputTitle) inputTitle.oninput = (e) => { StateManager.config.adHomeTitle = (e.target as HTMLInputElement).value; StateManager.save(); };
    if (inputBody) inputBody.oninput = (e) => { StateManager.config.adHomeBody = (e.target as HTMLTextAreaElement).value; StateManager.save(); };
    if (chkAdHomeCarousel) chkAdHomeCarousel.onchange = (e) => {
        StateManager.config.adHomeUseCarousel = (e.target as HTMLInputElement).checked; updateAdHomeUI(); StateManager.save();
    };
    if (inputAdHomeTransition) inputAdHomeTransition.oninput = (e) => {
        StateManager.config.adHomeTransitionSeconds = parseInt((e.target as HTMLInputElement).value) || 3; StateManager.save();
    };
    
    if (chkAdVideoMute) chkAdVideoMute.onchange = (e) => { StateManager.config.adHomeVideoMute = (e.target as HTMLInputElement).checked; StateManager.save(); };
    if (chkAdVideoLoop) chkAdVideoLoop.onchange = (e) => { StateManager.config.adHomeVideoLoop = (e.target as HTMLInputElement).checked; StateManager.save(); };
    
    const btnAddHomeVid = document.getElementById('btnAdHomeAddVideo');
    if (btnAddHomeVid) btnAddHomeVid.onclick = () => inputAdHomeVideoFile.click();
    
    if (inputAdHomeVideoFile) inputAdHomeVideoFile.onchange = async () => {
        const file = inputAdHomeVideoFile.files?.[0];
        if (file) {
            const email = sessionStorage.getItem('nexo_current_user_email') || '';
            await syncMediaToSupabase(email, "ad_home_video", file);
            inputAdHomeVideoFile.value = "";
            updateAdHomeUI();
        }
    };
    
    const btnRemoveAdVid = document.getElementById('btnRemoveAdVideo');
    if (btnRemoveAdVid) btnRemoveAdVid.onclick = async () => {
        const email = sessionStorage.getItem('nexo_current_user_email') || '';
        await syncMediaToSupabase(email, "ad_home_video", "");
        const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
        if (adHome) adHome.adVideoUrl = null;
        updateAdHomeUI();
    };

    const btnAdHomeAddImg = document.getElementById('btnAdHomeAddImg');
    if (btnAdHomeAddImg) btnAdHomeAddImg.onclick = () => inputAdHomeFiles.click();
    if (inputAdHomeFiles) inputAdHomeFiles.onchange = () => handleFile(inputAdHomeFiles, 'adHomeImages');
    
    const btnPreviewAdHome = document.getElementById('btnPreviewAdHome');
    if (btnPreviewAdHome) btnPreviewAdHome.onclick = () => showAdHomeModal();
    
    const btnCloseAdHome = document.getElementById('btnCloseAdHome');
    if (btnCloseAdHome) btnCloseAdHome.onclick = () => {
        const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
        if (adHome) adHome.stop();
        const modal = document.getElementById('modalAdHome'); 
        if (modal) modal.style.display = 'none';
        const v = document.querySelector('#adHomeContainer video') as HTMLVideoElement;
        if(v) v.pause();
    };

    const chkAdBanners = document.getElementById('chkAdBannersEnabled') as HTMLInputElement;
    const adBannersSettings = document.getElementById('adBannersSettings');
    const inputAdBannersFiles = document.getElementById('inputAdBannersFiles') as HTMLInputElement;
    const inputAdBannersVideoFile = document.getElementById('inputAdBannersVideoFile') as HTMLInputElement;
    const inputAdBannersSec = document.getElementById('inputAdBannersSeconds') as HTMLInputElement;
    const selectAdBannersPos = document.getElementById('selectAdBannersPos') as HTMLSelectElement;
    const selectAdBannersSize = document.getElementById('selectAdBannersSize') as HTMLSelectElement;
    const chkAdBannersAutoHide = document.getElementById('chkAdBannersAutoHide') as HTMLInputElement;
    const chkAdBannersVideoMute = document.getElementById('chkAdBannersVideoMute') as HTMLInputElement;
    const chkAdBannersVideoLoop = document.getElementById('chkAdBannersVideoLoop') as HTMLInputElement;

    const chkAdVideoAds = document.getElementById('chkAdVideoAdsEnabled') as HTMLInputElement;
    const adVideoAdsSettings = document.getElementById('adVideoAdsSettings');
    const inputAdVideoAdsFreq = document.getElementById('inputAdVideoAdsFreq') as HTMLInputElement;

    const chkAdQr = document.getElementById('chkAdQrEnabled') as HTMLInputElement;
    const adQrSettings = document.getElementById('adQrSettings');
    const inputAdQrUrl = document.getElementById('inputAdQrUrl') as HTMLInputElement;
    const inputAdQrTitle = document.getElementById('inputAdQrTitle') as HTMLInputElement;
    const inputAdQrMsg = document.getElementById('inputAdQrMsg') as HTMLTextAreaElement;

    if(chkAdBanners) {
        chkAdBanners.checked = !!StateManager.config.adBannersEnabled;
        if(adBannersSettings) adBannersSettings.style.display = StateManager.config.adBannersEnabled ? 'block' : 'none';
        chkAdBanners.onchange = (e) => {
            StateManager.config.adBannersEnabled = (e.target as HTMLInputElement).checked;
            if(adBannersSettings) adBannersSettings.style.display = StateManager.config.adBannersEnabled ? 'block' : 'none';
            StateManager.save();
            startBannersEngine();
        };
    }
    if(inputAdBannersSec) {
        inputAdBannersSec.value = (StateManager.config.adBannersInterval || 10).toString();
        inputAdBannersSec.oninput = (e) => {
            StateManager.config.adBannersInterval = parseInt((e.target as HTMLInputElement).value) || 10;
            StateManager.save();
            startBannersEngine();
        };
    }
    if(selectAdBannersPos) {
        selectAdBannersPos.value = StateManager.config.adBannersPosition || 'bottom';
        selectAdBannersPos.onchange = (e) => {
            StateManager.config.adBannersPosition = (e.target as HTMLSelectElement).value as any;
            StateManager.save();
            startBannersEngine();
        };
    }
    if(selectAdBannersSize) {
        selectAdBannersSize.value = StateManager.config.adBannersSize || 'standard';
        selectAdBannersSize.onchange = (e) => {
            StateManager.config.adBannersSize = (e.target as HTMLSelectElement).value as any;
            StateManager.save();
            startBannersEngine();
        };
    }
    if(chkAdBannersAutoHide) {
        chkAdBannersAutoHide.checked = !!StateManager.config.adBannersAutoHide;
        chkAdBannersAutoHide.onchange = (e) => {
            StateManager.config.adBannersAutoHide = (e.target as HTMLInputElement).checked;
            StateManager.save();
        };
    }
    if(chkAdBannersVideoMute) {
        chkAdBannersVideoMute.checked = StateManager.config.adBannersVideoMute !== false;
        chkAdBannersVideoMute.onchange = (e) => {
            StateManager.config.adBannersVideoMute = (e.target as HTMLInputElement).checked;
            StateManager.save();
            startBannersEngine();
        };
    }
    if(chkAdBannersVideoLoop) {
        chkAdBannersVideoLoop.checked = StateManager.config.adBannersVideoLoop !== false;
        chkAdBannersVideoLoop.onchange = (e) => {
            StateManager.config.adBannersVideoLoop = (e.target as HTMLInputElement).checked;
            StateManager.save();
            startBannersEngine();
        };
    }

    const btnAdBannersAdd = document.getElementById('btnAdBannersAdd');
    if (btnAdBannersAdd) btnAdBannersAdd.onclick = () => inputAdBannersFiles.click();
    if (inputAdBannersFiles) inputAdBannersFiles.onchange = () => handleFile(inputAdBannersFiles, 'adBannersMedia');

    const btnAdBannersAddVideo = document.getElementById('btnAdBannersAddVideo');
    if (btnAdBannersAddVideo) btnAdBannersAddVideo.onclick = () => inputAdBannersVideoFile.click();
    if (inputAdBannersVideoFile) inputAdBannersVideoFile.onchange = async () => {
        const file = inputAdBannersVideoFile.files?.[0];
        if (file) {
            const email = sessionStorage.getItem('nexo_current_user_email') || '';
            const videoKey = `banner_vid_${Date.now()}`;
            await syncMediaToSupabase(email, videoKey, file);
            if (!StateManager.config.adBannersMedia) StateManager.config.adBannersMedia = [];
            const publicUrl = await fetchMediaFromSupabase(email, videoKey);
            if (publicUrl) {
                StateManager.config.adBannersMedia.push({ type: 'video', data: publicUrl, key: videoKey });
            }
            inputAdBannersVideoFile.value = "";
            StateManager.save();
            renderAdBannersList();
            startBannersEngine();
        }
    };

    if(chkAdVideoAds) {
        chkAdVideoAds.checked = !!StateManager.config.adVideoAdsEnabled;
        if(adVideoAdsSettings) adVideoAdsSettings.style.display = StateManager.config.adVideoAdsEnabled ? 'block' : 'none';
        chkAdVideoAds.onchange = (e) => {
            StateManager.config.adVideoAdsEnabled = (e.target as HTMLInputElement).checked;
            if(adVideoAdsSettings) adVideoAdsSettings.style.display = StateManager.config.adVideoAdsEnabled ? 'block' : 'none';
            StateManager.save();
        };
    }
    if(inputAdVideoAdsFreq) {
        inputAdVideoAdsFreq.value = (StateManager.config.adVideoAdsFrequency || 5).toString();
        inputAdVideoAdsFreq.oninput = (e) => {
            StateManager.config.adVideoAdsFrequency = parseInt((e.target as HTMLInputElement).value) || 5;
            StateManager.save();
        };
    }

    const btnAddFreqVideo = document.getElementById('btnAdFrequencyAddVideo');
    const inputFreqVideo = document.getElementById('inputAdFrequencyVideoFile') as HTMLInputElement;
    const btnRemoveFreqVideo = document.getElementById('btnRemoveAdFrequencyVideo');

    const updateFrequencyVideoPreviewUI = async () => {
        const email = sessionStorage.getItem('nexo_current_user_email') || '';
        const videoUrl = await fetchMediaFromSupabase(email, "ad_frequency_video");
        const container = document.getElementById('frequencyVideoPreviewContainer');
        const videoEl = document.getElementById('adminFrequencyVideoPreview') as HTMLVideoElement;
        
        if (videoUrl && container && videoEl) {
            const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
            if (adHome) adHome.frequencyVideoUrl = videoUrl;
            videoEl.src = videoUrl;
            container.style.display = 'block';
        } else if (container) {
            container.style.display = 'none';
        }
    };

    if (btnAddFreqVideo) btnAddFreqVideo.onclick = () => inputFreqVideo.click();
    if (inputFreqVideo) inputFreqVideo.onchange = async () => {
        const file = inputFreqVideo.files?.[0];
        if (file) {
            const email = sessionStorage.getItem('nexo_current_user_email') || '';
            await syncMediaToSupabase(email, "ad_frequency_video", file);
            inputFreqVideo.value = "";
            updateFrequencyVideoPreviewUI();
        }
    };
    if (btnRemoveFreqVideo) btnRemoveFreqVideo.onclick = async () => {
        const email = sessionStorage.getItem('nexo_current_user_email') || '';
        await syncMediaToSupabase(email, "ad_frequency_video", "");
        const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
        if (adHome) adHome.frequencyVideoUrl = null;
        updateFrequencyVideoPreviewUI();
    };

    if(chkAdQr) {
        chkAdQr.checked = !!StateManager.config.adQrEnabled;
        if(adQrSettings) adQrSettings.style.display = StateManager.config.adQrEnabled ? 'block' : 'none';
        chkAdQr.onchange = (e) => {
            StateManager.config.adQrEnabled = (e.target as HTMLInputElement).checked;
            if(adQrSettings) adQrSettings.style.display = StateManager.config.adQrEnabled ? 'block' : 'none';
            StateManager.save();
        };
    }
    if(inputAdQrUrl) {
        inputAdQrUrl.value = StateManager.config.adQrUrl || "";
        inputAdQrUrl.oninput = (e) => { StateManager.config.adQrUrl = (e.target as HTMLInputElement).value; StateManager.save(); };
    }
    if(inputAdQrTitle) {
        inputAdQrTitle.value = StateManager.config.adQrTitle || "";
        inputAdQrTitle.oninput = (e) => { StateManager.config.adQrTitle = (e.target as HTMLInputElement).value; StateManager.save(); };
    }
    if(inputAdQrMsg) {
        inputAdQrMsg.value = StateManager.config.adQrMessage || "";
        inputAdQrMsg.oninput = (e) => { StateManager.config.adQrMessage = (e.target as HTMLTextAreaElement).value; StateManager.save(); };
    }

    const btnAdBannersPreview = document.getElementById('btnAdBannersPreview');
    const modalBannerPreview = document.getElementById('modalBannerPreview');
    const bannerPreviewMediaContainer = document.getElementById('bannerPreviewMediaContainer');
    const btnCloseBannerPreview = document.getElementById('btnCloseBannerPreview');

    if (btnAdBannersPreview) btnAdBannersPreview.onclick = async () => {
        if (!StateManager.config.adBannersMedia || StateManager.config.adBannersMedia.length === 0) return getCallbacks().showCustomAlert("Carga banners primero.", "ATENCIÓN");
        
        const banners = publicidadManager.getComponent<BannerComponent>('banners');
        if (!banners) return;

        if (banners.bannerPreviewInterval) window.clearInterval(banners.bannerPreviewInterval);
        
        const chkPrevMute = document.getElementById('chkAdBannersPreviewVideoMute') as HTMLInputElement;
        const chkPrevLoop = document.getElementById('chkAdBannersPreviewVideoLoop') as HTMLInputElement;
        
        if (chkPrevMute) chkPrevMute.checked = StateManager.config.adBannersVideoMute !== false;
        if (chkPrevLoop) chkPrevLoop.checked = StateManager.config.adBannersVideoLoop !== false;

        let currentPreviewIdx = 0;
        const renderItem = async (idx: number) => {
            if (!bannerPreviewMediaContainer) return;
            bannerPreviewMediaContainer.innerHTML = "";
            const item = StateManager.config.adBannersMedia![idx];
            if (item.type === 'image') {
                bannerPreviewMediaContainer.innerHTML = `<img src="${item.data}" style="height:100%; width:100%; object-fit:contain; transition: opacity 0.4s ease;">`;
            } else {
                const url = item.data;
                const isMuted = chkPrevMute ? chkPrevMute.checked : (StateManager.config.adBannersVideoMute !== false);
                const isLoop = chkPrevLoop ? chkPrevLoop.checked : (StateManager.config.adBannersVideoLoop !== false);
                bannerPreviewMediaContainer.innerHTML = `<video src="${url}" autoplay ${isMuted ? 'muted' : ''} ${isLoop ? 'loop' : ''} playsinline style="height:100%; width:100%; object-fit:contain; transition: opacity 0.4s ease;"></video>`;
            }
        };

        if (chkPrevMute) chkPrevMute.onchange = () => renderItem(currentPreviewIdx);
        if (chkPrevLoop) chkPrevLoop.onchange = () => renderItem(currentPreviewIdx);

        await renderItem(0);
        if (modalBannerPreview) modalBannerPreview.style.display = 'flex';
        
        if (StateManager.config.adBannersMedia.length > 1) {
            banners.bannerPreviewInterval = window.setInterval(async () => {
                currentPreviewIdx = (currentPreviewIdx + 1) % StateManager.config.adBannersMedia!.length;
                const el = bannerPreviewMediaContainer?.firstElementChild as HTMLElement;
                if (el) el.style.opacity = '0';
                setTimeout(() => renderItem(currentPreviewIdx), 400);
            }, 3000);
        }
    };

    if (btnCloseBannerPreview) btnCloseBannerPreview.onclick = () => {
        const banners = publicidadManager.getComponent<BannerComponent>('banners');
        if (banners && banners.bannerPreviewInterval) window.clearInterval(banners.bannerPreviewInterval);
        if (modalBannerPreview) modalBannerPreview.style.display = 'none';
        if (bannerPreviewMediaContainer) bannerPreviewMediaContainer.innerHTML = "";
    };

    const btnAdFrequencyPreview = document.getElementById('btnAdFrequencyPreview');
    if (btnAdFrequencyPreview) btnAdFrequencyPreview.onclick = () => showAdHomeModal('frequency');

    const btnAdQrPreview = document.getElementById('btnAdQrPreview');
    if (btnAdQrPreview) btnAdQrPreview.onclick = () => showQrModal();

    initSidePersistentAdHandlers();
    initStreamingHandlers();

    updateAdHomeUI(); updateFrequencyVideoPreviewUI(); refreshAdPreviews(); renderAdBannersList(); startBannersEngine();
    updatePublicidadActiveBadges();

    const handleLaunchPublicidad = async (btnId: string, sectionName: string) => {
        const btn = document.getElementById(btnId) as HTMLButtonElement;
        if (!btn) return;
        
        btn.onclick = async () => {
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `⏳ Sincronizando...`;
            
            try {
                // Sincronizar inmediatamente a Supabase
                await StateManager.saveImmediate();
                
                // Efecto premium de éxito
                btn.style.background = 'rgba(0, 255, 127, 0.2)';
                btn.style.borderColor = '#00ff7f';
                btn.style.color = '#00ff7f';
                btn.innerHTML = `✅ ${sectionName.toUpperCase()} EN VIVO!`;
                
                // Mostrar alerta elegante
                getCallbacks().showCustomAlert(
                    `La publicidad de "${sectionName}" ha sido lanzada en tiempo real a todos los dispositivos conectados de manera exitosa.`, 
                    "PUBLICIDAD EN VIVO"
                );
            } catch (err) {
                console.error(err);
                btn.style.background = 'rgba(255, 99, 71, 0.2)';
                btn.style.borderColor = '#ff6347';
                btn.style.color = '#ff6347';
                btn.innerHTML = `❌ Error al lanzar`;
            } finally {
                setTimeout(() => {
                    btn.disabled = false;
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.style.color = '';
                    btn.innerHTML = originalText;
                }, 3000);
            }
        };
    };

    handleLaunchPublicidad('btnLaunchAdHome', 'Anuncio de Bienvenida');
    handleLaunchPublicidad('btnLaunchAdBanners', 'Banners Dinámicos');
    handleLaunchPublicidad('btnLaunchAdFrequency', 'Video Ads');
    handleLaunchPublicidad('btnLaunchAdSidePersistent', 'Publicidad Lateral');
    handleLaunchPublicidad('btnLaunchAdStreaming', 'Streaming en Vivo');
    handleLaunchPublicidad('btnLaunchAdQr', 'Pop-up QR');

    window.addEventListener('nexo-config-realtime', () => {
        updateAdHomeUI();
        updateFrequencyVideoPreviewUI();
        refreshAdPreviews();
        renderAdBannersList();
        startBannersEngine();
        updatePublicidadActiveBadges();

        // Si el anuncio de bienvenida está abierto actualmente, re-renderizar de inmediato
        const modalAdHome = document.getElementById('modalAdHome');
        if (modalAdHome && modalAdHome.style.display === 'flex') {
            const adHomeContainer = document.getElementById('adHomeContainer');
            const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
            const isFreq = adHomeContainer?.querySelector(`video[src*="${(adHome && adHome.frequencyVideoUrl) || '____undefined____'}"]`) || false;
            showAdHomeModal(isFreq ? 'frequency' : 'welcome');
        }
    });

    window.addEventListener('nexo-media-realtime', (e: any) => {
        const detail = e.detail || {};
        const adHome = publicidadManager.getComponent<AdHomeComponent>('ad-home');
        if (detail.mediaKey === 'ad_home_video') {
            if (adHome && adHome.adVideoUrl) URL.revokeObjectURL(adHome.adVideoUrl);
            if (adHome) adHome.adVideoUrl = null;
        }
        if (detail.mediaKey === 'ad_frequency_video') {
            if (adHome && adHome.frequencyVideoUrl) URL.revokeObjectURL(adHome.frequencyVideoUrl);
            if (adHome) adHome.frequencyVideoUrl = null;
        }

        updateAdHomeUI();
        updateFrequencyVideoPreviewUI();
        refreshAdPreviews();
        renderAdBannersList();
        startBannersEngine();
        updatePublicidadActiveBadges();

        // Si el anuncio de bienvenida está abierto actualmente, re-renderizar de inmediato
        const modalAdHome = document.getElementById('modalAdHome');
        if (modalAdHome && modalAdHome.style.display === 'flex') {
            const adHomeContainer = document.getElementById('adHomeContainer');
            const isFreq = adHomeContainer?.querySelector(`video[src*="${(adHome && adHome.frequencyVideoUrl) || '____undefined____'}"]`) || false;
            showAdHomeModal(isFreq ? 'frequency' : 'welcome');
        }
    });
};

export const initSidePersistentAdHandlers = () => {
    const chkEnabled = document.getElementById('chkAdSidePersistentEnabled') as HTMLInputElement;
    const settingsArea = document.getElementById('adSidePersistentSettings');
    const btnAddImg = document.getElementById('btnAdSidePersistentAdd');
    const btnAddVid = document.getElementById('btnAdSidePersistentAddVideo');
    const inputFile = document.getElementById('inputAdSidePersistentFile') as HTMLInputElement;
    const inputVideoFile = document.getElementById('inputAdSidePersistentVideoFile') as HTMLInputElement;
    const selectPos = document.getElementById('selectAdSidePersistentPos') as HTMLSelectElement;
    const inputInterval = document.getElementById('inputAdSidePersistentInterval') as HTMLInputElement;
    const chkSideMute = document.getElementById('chkAdSidePersistentVideoMute') as HTMLInputElement;
    const chkSideLoop = document.getElementById('chkAdSidePersistentVideoLoop') as HTMLInputElement;

    const updateSideAdUI = async () => {
        const config = StateManager.config;
        if (chkEnabled) chkEnabled.checked = !!config.adSidePersistentEnabled;
        if (settingsArea) settingsArea.style.display = config.adSidePersistentEnabled ? 'block' : 'none';
        if (selectPos) selectPos.value = config.adSidePersistentPosition || 'left';
        if (inputInterval) inputInterval.value = (config.adSidePersistentInterval || 10).toString();
        if (chkSideMute) chkSideMute.checked = !!config.adSidePersistentVideoMute;
        if (chkSideLoop) chkSideLoop.checked = !!config.adSidePersistentVideoLoop;

        renderAdSidePersistentList();
        startSideAdEngine();
        updatePublicidadActiveBadges();
    };

    if (chkEnabled) chkEnabled.onchange = (e) => {
        StateManager.config.adSidePersistentEnabled = (e.target as HTMLInputElement).checked;
        StateManager.save();
        updateSideAdUI();
    };

    if (selectPos) selectPos.onchange = (e) => {
        StateManager.config.adSidePersistentPosition = (e.target as HTMLSelectElement).value as any;
        StateManager.save();
        updateSideAdUI();
    };

    if (inputInterval) inputInterval.oninput = (e) => {
        StateManager.config.adSidePersistentInterval = parseInt((e.target as HTMLInputElement).value) || 10;
        StateManager.save();
        startSideAdEngine();
    };

    if (chkSideMute) chkSideMute.onchange = (e) => {
        StateManager.config.adSidePersistentVideoMute = (e.target as HTMLInputElement).checked;
        StateManager.save();
        startSideAdEngine();
    };

    if (chkSideLoop) chkSideLoop.onchange = (e) => {
        StateManager.config.adSidePersistentVideoLoop = (e.target as HTMLInputElement).checked;
        StateManager.save();
        startSideAdEngine();
    };

    if (btnAddImg) btnAddImg.onclick = () => inputFile.click();
    if (btnAddVid) btnAddVid.onclick = () => inputVideoFile.click();

    const handleVideoFile = async (input: HTMLInputElement) => {
        const files = input.files; if (!files) return;
        const email = sessionStorage.getItem('nexo_current_user_email') || '';
        for (const file of Array.from(files)) {
            const videoKey = `side_ad_vid_${Date.now()}`;
            await syncMediaToSupabase(email, videoKey, file);
            const publicUrl = await fetchMediaFromSupabase(email, videoKey);
            if (publicUrl) {
                if (!StateManager.config.adSidePersistentMedia) StateManager.config.adSidePersistentMedia = [];
                StateManager.config.adSidePersistentMedia.push({ type: 'video', data: publicUrl, key: videoKey });
            }
        }
        input.value = "";
        StateManager.save();
        updateSideAdUI();
    };

    const handleImageFile = (input: HTMLInputElement) => {
        const files = input.files; if (!files) return;
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = async (re) => {
                let dataUrl = re.target?.result as string;
                dataUrl = await compressImage(dataUrl);
                if (!StateManager.config.adSidePersistentMedia) StateManager.config.adSidePersistentMedia = [];
                StateManager.config.adSidePersistentMedia.push({ type: 'image', data: dataUrl });
                StateManager.save();
                updateSideAdUI();
            };
            reader.readAsDataURL(file);
        });
        input.value = "";
    };

    if (inputFile) inputFile.onchange = () => handleImageFile(inputFile);
    if (inputVideoFile) inputVideoFile.onchange = () => handleVideoFile(inputVideoFile);

    updateSideAdUI();

    window.addEventListener('nexo-config-realtime', () => {
        updateSideAdUI();
    });

    window.addEventListener('nexo-media-realtime', () => {
        updateSideAdUI();
    });
};

(window as any).removeAdSidePersistentMedia = async (idx: number) => {
    if (StateManager.config.adSidePersistentMedia) {
        const item = StateManager.config.adSidePersistentMedia[idx];
        const email = sessionStorage.getItem('nexo_current_user_email') || '';
        if (item.type === 'video') {
            const videoKey = item.key || item.data.split('/').pop()?.split('?')[0] || '';
            if (videoKey) await syncMediaToSupabase(email, videoKey, "");
        }
        StateManager.config.adSidePersistentMedia.splice(idx, 1);
        StateManager.save();
        renderAdSidePersistentList();
        startSideAdEngine();
    }
};

(window as any).removeAdBannerMedia = async (idx: number) => {
    if (StateManager.config.adBannersMedia) {
        const item = StateManager.config.adBannersMedia[idx];
        const email = sessionStorage.getItem('nexo_current_user_email') || '';
        if (item.type === 'video') {
            const videoKey = item.key || item.data.split('/').pop()?.split('?')[0] || '';
            if (videoKey) await syncMediaToSupabase(email, videoKey, "");
        }
        StateManager.config.adBannersMedia.splice(idx, 1);
        StateManager.save();
        renderAdBannersList();
        startBannersEngine();
    }
};

export const initStreamingHandlers = () => {
    const chkEnabled = document.getElementById('chkAdStreamingEnabled') as HTMLInputElement;
    const settingsArea = document.getElementById('adStreamingSettings');
    const inputUrl = document.getElementById('inputAdStreamingUrl') as HTMLTextAreaElement;
    const selectPos = document.getElementById('selectAdStreamingPos') as HTMLSelectElement;
    const btnPreview = document.getElementById('btnAdStreamingPreview');
    const chkMute = document.getElementById('chkAdStreamingVideoMute') as HTMLInputElement;
    const chkLoop = document.getElementById('chkAdStreamingVideoLoop') as HTMLInputElement;

    const updateStreamingUI = () => {
        const config = StateManager.config;
        if (chkEnabled) chkEnabled.checked = !!config.adStreamingEnabled;
        if (settingsArea) settingsArea.style.display = config.adStreamingEnabled ? 'block' : 'none';
        if (inputUrl) inputUrl.value = config.adStreamingUrl || "";
        if (selectPos) selectPos.value = config.adStreamingPosition || 'left';
        if (chkMute) chkMute.checked = config.adStreamingVideoMute !== false;
        if (chkLoop) chkLoop.checked = config.adStreamingVideoLoop !== false;

        startStreamingEngine();
        updatePublicidadActiveBadges();
    };

    if (chkEnabled) chkEnabled.onchange = (e) => {
        StateManager.config.adStreamingEnabled = (e.target as HTMLInputElement).checked;
        StateManager.save();
        updateStreamingUI();
        startSideAdEngine();
    };

    if (inputUrl) inputUrl.oninput = (e) => {
        StateManager.config.adStreamingUrl = (e.target as HTMLTextAreaElement).value.trim();
        StateManager.save();
        startStreamingEngine();
    };

    if (selectPos) selectPos.onchange = (e) => {
        StateManager.config.adStreamingPosition = (e.target as HTMLSelectElement).value as any;
        StateManager.save();
        updateStreamingUI();
    };

    if (chkMute) chkMute.onchange = (e) => {
        StateManager.config.adStreamingVideoMute = (e.target as HTMLInputElement).checked;
        StateManager.save();
        startStreamingEngine();
    };

    if (chkLoop) chkLoop.onchange = (e) => {
        StateManager.config.adStreamingVideoLoop = (e.target as HTMLInputElement).checked;
        StateManager.save();
        startStreamingEngine();
    };

    if (btnPreview) btnPreview.onclick = () => {
        startStreamingEngine();
    };

    updateStreamingUI();

    window.addEventListener('nexo-config-realtime', () => {
        updateStreamingUI();
    });
};
