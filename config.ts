
export const DEVICE_ID_KEY = "ruleta_nexo_premium_device_id";
export const OFFLINE_SECRET = "RULETA_NEXO_PREMIUM_OFFLINE_SECURE";

export interface UserAccount {
    email: string;
    pin: string;
    company: string;
    createdAt: string;
}

export interface LicenseControl {
    tier: 'LITE' | 'PRO' | 'ENTERPRISE' | 'EXPIRED';
    expiryDate: string;
    licenseKey: string;
    isActive: boolean;
}

export const DEFAULT_LICENSE: LicenseControl = {
    tier: 'LITE',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    licenseKey: 'TRIAL-MODE-LITE',
    isActive: true
};

export const NEXO_ASSETS = {
    LOGOS: {
        GOLD: `/icon.png`,
        STORE: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2U2Mzk0NiI+PHBhdGggZD0iTTcgMThjLTEuMSAwLTIgLjktMiAyczEuMSAyIDIgMiAyLS45IDItMi0uOS0yLTItMnpNMSAydiJoMmwxIDYtMS4zNCAyLjY4Yy0uMTguNDEtLjI4Ljg3LS4yOCAxLjMyIDAgMS4xLjg5IDIgMiAyaDEydjItSDFMNyAxM2wtMS4xLTEuOTYgTDIuMDYgNEgxVjJ6bTE2IDE2Yy0uNTUgMC0xIC40NS0xIDFTMTguNDUgMjAgMTkgMjBzMS0uNDUgMS0xLS40NS0xLTEtMXoiLz48L3N2Zz4=`,
        BEAUTY: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2VjNDg5OSI+PHBhdGggZD0iTTEyIDJjNC40MiAwIDggMy41IDggOHMtMy41OCA4LTggOC04LTMuNTgtOC04IDMuNTgtLTggOC04em0wIDJjLTMuMzEgMC02IDIuNjktNiA2czIuNjkgNiA2IDYgNi0yLjY5IDYtNi0yLjY5LTYtNi02em0wIDJjMi4yMSAwIDQgMS43OSA0IDRzLTEuNzkgNC00IDQtNC0xLjc5LTQtNHMxLjc5LTQgNC00eiIvPjwvc3ZnPg==`,
        FAMILY: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Y5NzMxNiI+PHBhdGggZD0iTTEwIDIwdi02aDR2Nmg1di04aDNMMTIgMyAyIDExdjhoM3oiLz48L3N2Zz4=`,
        KIDS: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzBlYTVlOSI+PHBhdGggZD0iTTEyIDJjLTUuNTIgMC0xMCA0LjQ4LTEwIDEwczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMC00LjQ4LTEwLTEwLTEwem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHptLTQtOWMxLjEwIDAgMi0uOTAgMi0ycy0uOTAtMi0yLTItMiAuOTAtMiAyIC45MCAyIDIgMnptOCA0YzEuMTAgMCAyLS45MCAyLTJzLS45MC0yLTItMi0yIC45MCAyIDIgLjkwIDIgMiAyem0tNC0yYy0xLjEwIDAtMiAuOTAtMiAycy45MCAyIDIgMiAyLS45MCAyLTItLjkwLTItMi0yeiIvPjwvc3ZnPg==`,
        HALLOWEEN: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2Q0YWYzNyI+PHBhdGggZD0iTTEyIDJsMyA2IDYtMi0zIDggSDZMNCAxNGwtMy04IDYgMnoiLz48L3N2Zz4=`
    },
    BGS: {
        GOLD: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PGNpcmNsZSBjeD0iNDAiIGN5PSI0MCIgcj0iMiIgZmlsbD0iI2Q0YWYzNyIgZmlsbC1vcGFjaXR5PSIuMDgiLz48L3N2Zz4=`,
        STORE: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PHJlY3QgeD0iNTAiIHk9IjUwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjAyIi8+PC9zdmc+`,
        BEAUTY: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIj48cGF0aCBkPSJNMCA2MFEzMCAwIDYwIDYwIDkwIDEyMCAxMjAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2VjNDg5OSIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIvPjwvc3ZnPg==`,
        FAMILY: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41IiBmaWxsPSIjZjk3MzE2IiBmaWxsLW9wYWNpdHk9Ii4xIi8+PC9zdmc+`,
        KIDS: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIxMCIgcj0iMS41IiBmaWxsPSIjMGVhNWU5IiBmaWxsLW9wYWNpdHk9Ii4xIi8+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMS41IiBmaWxsPSIjZmFjYzE1IiBmaWxsLW9wYWNpdHk9Ii4xIi8+PC9zdmc+`,
        HALLOWEEN: `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZWE1ODBjIiBzdHJva2Utb3BhY2l0eT0iLjEiPjxwYXRoIGQ9Ik0wIDAgTDEwMCAxMDAgTTEwMCAwIEwwIDEwMCBNNTAgMCBMNTAgMTAwIE0wIDUwIEwxMDAgNTAiLz48L3N2Zz4=`
    }
};

export interface ThemeCustomization {
    primary: string;
    secondary: string;
    logo: string;
    bg: string;
}

export const THEME_PRESETS: Record<string, ThemeCustomization> = {
    'nexo-gold': { primary: '#06b6d4', secondary: '#0f172a', logo: NEXO_ASSETS.LOGOS.GOLD, bg: NEXO_ASSETS.BGS.GOLD },
    'nexo-store': { primary: '#10b981', secondary: '#064e3b', logo: NEXO_ASSETS.LOGOS.STORE, bg: NEXO_ASSETS.BGS.STORE },
    'nexo-beauty': { primary: '#8b5cf6', secondary: '#1e1b4b', logo: NEXO_ASSETS.LOGOS.BEAUTY, bg: NEXO_ASSETS.BGS.BEAUTY },
    'nexo-family': { primary: '#f97316', secondary: '#27272a', logo: NEXO_ASSETS.LOGOS.FAMILY, bg: NEXO_ASSETS.BGS.FAMILY },
    'nexo-kids': { primary: '#38bdf8', secondary: '#0f172a', logo: NEXO_ASSETS.LOGOS.KIDS, bg: NEXO_ASSETS.BGS.KIDS },
    'nexo-halloween': { primary: '#d4af37', secondary: '#1c1917', logo: NEXO_ASSETS.LOGOS.HALLOWEEN, bg: NEXO_ASSETS.BGS.HALLOWEEN }
};

export interface Prize {
    name: string;
    isSpecial?: boolean;
    celebrationText?: string;
    claimBtnText?: string;
    claimUrl?: string;
    stock?: number;
}

export interface FormField {
    id: string;
    label: string;
    placeholder: string;
}

export type LeadData = Record<string, string>;

export interface WinnerEntry {
    nombre: string;
    fecha: string;
    lead?: LeadData;
    publicSessionId?: string;
    localSessionId?: string;
}

export interface BannerMedia {
    type: 'image' | 'video';
    data: string;
    key?: string;
}

export interface SavedPrizeList {
    id: string;
    name: string;
    prizes: Prize[];
    formFields?: FormField[];
    localRequireRegister?: boolean;
    autoRemoveWinner?: boolean;
    localSessionListEnabled?: boolean;
    localSessionId?: string;
    raffleMode?: boolean;
    publicJoinEnabled?: boolean;
    publicRegisterEnabled?: boolean;
    publicRemoveWinner?: boolean;
    publicSessionListEnabled?: boolean;
    publicLiveViewEnabled?: boolean;
    publicLiveViewShowAds?: boolean;
    publicAfterAction?: 'live' | 'promo' | 'none';
    publicPromoUrl?: string;
    publicMaxParticipants?: number;
    publicTimeLimit?: number;
    syncSpinEnabled?: boolean;
    publicSessionId?: string;
    publicSessionExpiry?: number;
    publicSpinsCount?: number;
    adQrTitle?: string;
    adQrMessage?: string;
    qrCardBgColor?: string;
    qrCardAccentColor?: string;
    qrCardBorderColor?: string;
    qrCardBrandText?: string;
    qrCardBrandColor?: string;
    qrCardTitleColor?: string;
    qrCardMessageColor?: string;
    qrCardFooterText?: string;
    qrCardFooterColor?: string;
    qrCardCopyrightText?: string;
    qrCardCopyrightColor?: string;
}

export interface AppConfig {
    title: string;
    subtitle: string;
    prizes: Prize[];
    savedPrizeLists?: SavedPrizeList[];
    winnersHistory: WinnerEntry[];
    autoRemoveWinner: boolean;
    raffleMode?: boolean; 
    titleFontSize: number;
    subtitleFontSize: number;
    autoFitTitle: boolean;
    themeId: string;
    themeCustomizations: Record<string, ThemeCustomization>;
    formFields: FormField[];
    enableRegistration: boolean;
    adHomeType?: 'text' | 'text-image' | 'image' | 'video' | 'text-video';
    adHomeTitle?: string;
    adHomeBody?: string;
    adHomeImage?: string; 
    adHomeImages?: string[];
    adHomeUseCarousel?: boolean;
    adHomeTransitionSeconds?: number;
    adInactivityEnabled?: boolean;
    adInactivitySeconds?: number;
    adHomeVideoMute?: boolean;
    adHomeVideoLoop?: boolean;
    adHomeVideoAutoplay?: boolean;
    license: LicenseControl;
    menuSecurityEnabled?: boolean; 
    adBannersEnabled?: boolean;
    adBannersImages?: string[]; 
    adBannersMedia?: BannerMedia[];
    adBannersInterval?: number;
    adBannersPosition?: 'top' | 'bottom';
    adBannersSize?: 'compact' | 'standard' | 'large';
    adBannersAutoHide?: boolean;
    adBannersVideoMute?: boolean;
    adBannersVideoLoop?: boolean;
    adVideoAdsEnabled?: boolean;
    adVideoAdsFrequency?: number;
    adQrEnabled?: boolean;
    adQrUrl?: string;
    adQrTitle?: string;
    adQrMessage?: string;
    spinsSinceLastAd?: number;
    adSidePersistentEnabled?: boolean;
    adSidePersistentPosition?: 'left' | 'right';
    adSidePersistentMedia?: BannerMedia[];
    adSidePersistentInterval?: number;
    adSidePersistentVideoMute?: boolean;
    adSidePersistentVideoLoop?: boolean;
    adStreamingEnabled?: boolean;
    adStreamingPosition?: 'left' | 'right';
    adStreamingUrl?: string;
    adStreamingVideoMute?: boolean;
    adStreamingVideoLoop?: boolean;
    publicJoinEnabled?: boolean;
    publicMaxParticipants?: number;
    publicTimeLimit?: number;
    publicSessionId?: string;
    publicSessionExpiry?: number;
    publicSpinsCount?: number;
    syncSpinEnabled?: boolean;
    syncSpinState?: any;
    publicLiveViewEnabled?: boolean;
    publicLiveViewShowAds?: boolean;
    publicAfterAction?: 'live' | 'promo' | 'none';
    publicPromoUrl?: string;
    qrCardBgColor?: string;
    qrCardAccentColor?: string;
    qrCardBorderColor?: string;
    qrCardBrandText?: string;
    qrCardBrandColor?: string;
    qrCardTitleColor?: string;
    qrCardMessageColor?: string;
    qrCardFooterText?: string;
    qrCardFooterColor?: string;
    qrCardCopyrightText?: string;
    qrCardCopyrightColor?: string;
    publicSessionListEnabled?: boolean;
    localRequireRegister?: boolean;
    localSessionListEnabled?: boolean;
    localSessionId?: string;
    publicRegisterEnabled?: boolean;
    publicRemoveWinner?: boolean;
    activeSavedListId?: string;
    activeReportGameId?: string | null;
    timerEnabled?: boolean;
    isGameActive?: boolean;
    activeGameRunId?: string | null;
    auditLog?: { action: string; timestamp: string }[];
    embedWidgetEnabled?: boolean;
    embedShowTitle?: boolean;
    embedShowSubtitle?: boolean;
    embedTheme?: string;
}

export const INITIAL_DEFAULT_CONFIG: AppConfig = {
    title: "RULETA PREMIUM",
    subtitle: "SISTEMA DE SORTEO",
    prizes: [
        { name: "OPCIÓN 1" },
        { name: "OPCIÓN 2" },
        { name: "OPCIÓN 3" },
        { name: "OPCIÓN 4" }
    ],
    savedPrizeLists: [],
    winnersHistory: [],
    auditLog: [],
    autoRemoveWinner: false,
    raffleMode: false,
    titleFontSize: 32,
    subtitleFontSize: 12,
    autoFitTitle: true,
    themeId: "nexo-gold",
    themeCustomizations: JSON.parse(JSON.stringify(THEME_PRESETS)),
    formFields: [
        { id: "nombre", label: "Nombre Completo", placeholder: "Ej: Juan Pérez" },
        { id: "telefono", label: "Teléfono / WhatsApp", placeholder: "Ej: 0998877665" },
        { id: "email", label: "Correo Electrónico", placeholder: "Ej: juan@mail.com" }
    ],
    enableRegistration: false,
    timerEnabled: false,
    isGameActive: false,
    adHomeType: 'text',
    adHomeTitle: "¡BIENVENIDO!",
    adHomeBody: "Prepárate para participar en nuestro gran sorteo corporativo.",
    adHomeImages: [],
    adHomeUseCarousel: false,
    adHomeTransitionSeconds: 3,
    adInactivityEnabled: false,
    adInactivitySeconds: 60,
    adHomeVideoMute: true,
    adHomeVideoLoop: true,
    adHomeVideoAutoplay: true,
    license: { ...DEFAULT_LICENSE },
    menuSecurityEnabled: true,
    adBannersEnabled: false,
    adBannersMedia: [],
    adBannersInterval: 10,
    adBannersPosition: 'bottom',
    adBannersSize: 'standard',
    adBannersAutoHide: false,
    adBannersVideoMute: true,
    adBannersVideoLoop: true,
    adVideoAdsEnabled: false,
    adVideoAdsFrequency: 5,
    adQrEnabled: false,
    adQrUrl: "",
    adQrTitle: "¡SÍGUENOS Y GANA MÁS!",
    adQrMessage: "Escanea este código para obtener beneficios adicionales.",
    spinsSinceLastAd: 0,
    adSidePersistentEnabled: false,
    adSidePersistentPosition: 'left',
    adSidePersistentMedia: [],
    adSidePersistentInterval: 10,
    adSidePersistentVideoMute: true,
    adSidePersistentVideoLoop: true,
    publicJoinEnabled: false,
    publicMaxParticipants: 0,
    publicTimeLimit: 0,
    publicSessionId: "",
    publicSessionExpiry: 0,
    publicSpinsCount: 0,
    syncSpinEnabled: false,
    syncSpinState: null,
    publicLiveViewEnabled: true,
    publicSessionListEnabled: false,
    localRequireRegister: false,
    localSessionListEnabled: false,
    localSessionId: "",
    publicRegisterEnabled: false,
    publicRemoveWinner: false,
    activeSavedListId: "",
    activeReportGameId: null,
    publicAfterAction: 'none',
    publicPromoUrl: "",
    qrCardBgColor: "#060709",
    qrCardAccentColor: "#D4AF37",
    qrCardBorderColor: "#D4AF37",
    qrCardBrandText: "✦   R U L E T A   N E X O   P R E M I U M   ✦",
    qrCardBrandColor: "#D4AF37",
    qrCardTitleColor: "#FFFFFF",
    qrCardMessageColor: "#CCCCCC",
    qrCardFooterText: "SISTEMA DE RULETA & SORTEOS PREMIUM",
    qrCardFooterColor: "#D4AF37",
    qrCardCopyrightText: "© RULETA NEXO PREMIUM. TODOS LOS DERECHOS RESERVADOS.",
    qrCardCopyrightColor: "#666666",
    adStreamingEnabled: false,
    adStreamingPosition: 'left',
    adStreamingUrl: "",
    adStreamingVideoMute: true,
    adStreamingVideoLoop: true,
    embedWidgetEnabled: false,
    embedShowTitle: true,
    embedShowSubtitle: true,
    embedTheme: 'default'
};
