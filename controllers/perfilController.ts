import { THEME_PRESETS } from '../config';
import { Security, StateManager } from '../core';
import { appWheel } from '../engine';
import { compressImage } from '../utils';
import { isSupabaseConfigured, activateLicenseOnline, checkLicenseStatusOnline, syncConfigToSupabase, syncMediaToSupabase } from '../supabase';
import { TabStateManager } from './tabStateManager';

/**
 * ============================================================================
 * PROVIDER INTERFACES FOR DATA & BUSINESS LOGIC (100% SWAPPABLE)
 * ============================================================================
 * These interfaces decouple database and service queries from the UI rendering layer.
 */

export interface IPerfilSubscriptionProvider {
    getLicense(): { tier: string; expiryDate: string; isActive: boolean; licenseKey?: string };
    activateLicense(key: string, currentEmail: string): Promise<{ success: boolean; license?: any; error?: string }>;
    verifyGlobalLicense(currentEmail: string): Promise<{ success: boolean; isValid: boolean; license?: any }>;
    getDeviceId(): string;
}

export interface IPerfilUsuarioProvider {
    getProfileName(currentEmail: string): Promise<string>;
    getProfileEmail(currentEmail: string): string;
    getProfileTierBadgeLabel(tier: string, isExpired: boolean): string;
    getProfileTierBadgeStyle(tier: string, isExpired: boolean): { color: string; background: string };
    getMenuSecurityEnabled(): boolean;
    setMenuSecurityEnabled(enabled: boolean): void;
}

export interface IPerfilPersonalizacionProvider {
    getConfigTitle(): string;
    setConfigTitle(val: string): void;
    getConfigSubtitle(): string;
    setConfigSubtitle(val: string): void;
    getConfigTitleFontSize(): number;
    setConfigTitleFontSize(val: number): void;
    getConfigSubtitleFontSize(): number;
    setConfigSubtitleFontSize(val: number): void;
    getConfigAutoFitTitle(): boolean;
    setConfigAutoFitTitle(val: boolean): void;
    getThemeId(): string;
    setThemeId(val: string): void;
    getThemeCustomization(themeId: string): { primary: string; secondary: string; logo: string; bg: string } | undefined;
    setThemeCustomization(themeId: string, customization: { primary: string; secondary: string; logo: string; bg: string }): void;
    syncMediaToSupabase(email: string, key: string, dataUrl: string): Promise<void>;
}


/**
 * ============================================================================
 * VISUAL COMPONENT INTERFACES FOR "MI PERFIL" -> "CUENTA" (100% SWAPPABLE)
 * ============================================================================
 * Each visual subsection inside the Cuenta tab is abstracted into its own 
 * swappable UI component, adhering to a strict, highly modular design.
 */

export interface ISubscriptionComponent {
    render(license: { tier: string; expiryDate: string; isActive: boolean }, deviceId: string): void;
    initHandlers(
        onActivate: (key: string) => Promise<void>,
        onCopyDeviceId: () => void
    ): void;
}

export interface ISecurityComponent {
    render(enabled: boolean): void;
    initHandlers(onToggle: () => void): void;
}

export interface IProfileDetailsComponent {
    render(name: string, email: string, badgeLabel: string, badgeStyle: { color: string; background: string }): void;
}

export interface ISalesSupportComponent {
    render(): void;
}

export interface ISessionComponent {
    initHandlers(onLogout: () => Promise<void>): void;
}

export interface ITextsConfigComponent {
    render(autoFit: boolean, title: string, subtitle: string, titleFontSize: number, subtitleFontSize: number): void;
    getValues(): { autoFit: boolean; title: string; subtitle: string; titleFontSize: number; subtitleFontSize: number };
}

export interface IPaletteConfigComponent {
    render(themeId: string, customThemeIds: string[], currentCustomization?: { primary: string; secondary: string; logo: string; bg: string }): void;
    initHandlers(onThemeChange: (themeId: string) => void): void;
    getValues(): { themeId: string; primary: string; secondary: string };
}

export interface IThemeAssetsComponent {
    render(logoUrl?: string, bgUrl?: string): void;
    initHandlers(
        onLogoChange: (dataUrl: string) => void,
        onBgChange: (dataUrl: string) => void,
        onLogoRemove: () => void,
        onBgRemove: () => void
    ): void;
}

export interface IApplyCustomizationsComponent {
    renderFeedback(message: string, isError: boolean): void;
    setLoadingState(isLoading: boolean, originalText: string): void;
    initHandlers(onApply: () => Promise<void>): void;
}


/**
 * ============================================================================
 * DEFAULT VISUAL COMPONENTS IMPLEMENTATION (DOM DIRECT MANIPULATION)
 * ============================================================================
 * Standard DOM components rendering the HTML blocks of the Account subtab.
 */

export class DefaultSubscriptionComponent implements ISubscriptionComponent {
    render(license: { tier: string; expiryDate: string; isActive: boolean }, deviceId: string) {
        const card = document.getElementById('subscriptionStatusCard');
        const tierDisplay = document.getElementById('licenseTierDisplay');
        const tierBadge = document.getElementById('licenseTierBadge');
        const expiryDisplay = document.getElementById('licenseExpiryDisplay');
        const deviceIdDisplay = document.getElementById('nexoDeviceIdDisplay');
        if (!card || !tierDisplay || !tierBadge || !expiryDisplay) return;

        const isExpired = new Date(license.expiryDate) < new Date() || !license.isActive;

        card.className = "subscription-card";
        tierBadge.className = "tier-badge";

        if (isExpired) {
            card.classList.add('expired');
            tierDisplay.innerText = "LICENCIA EXPIRADA";
            tierBadge.innerText = "BLOQUEADO";
            tierBadge.classList.add('tier-expired');
        } else {
            const tierNames: Record<string, string> = { 
                'LITE': 'RULETA NEXO LITE EDITION', 
                'PRO': 'RULETA NEXO PREMIUM PRO', 
                'ENTERPRISE': 'RULETA NEXO PREMIUM ENTERPRISE' 
            };
            tierDisplay.innerText = tierNames[license.tier as 'LITE' | 'PRO' | 'ENTERPRISE'] || license.tier;
            const tierClass = license.tier.toLowerCase();
            card.classList.add(`active-${tierClass}`);
            tierBadge.innerText = `NIVEL ${license.tier}`;
            tierBadge.classList.add(`tier-${tierClass}`);
        }
        expiryDisplay.innerText = new Date(license.expiryDate).toLocaleDateString();

        if (deviceIdDisplay) {
            deviceIdDisplay.innerText = deviceId;
        }
    }

    initHandlers(onActivate: (key: string) => Promise<void>, onCopyDeviceId: () => void) {
        const btnActivate = document.getElementById('btnActivateLicense');
        if (btnActivate) {
            btnActivate.onclick = () => {
                const input = document.getElementById('licenseKeyInput') as HTMLInputElement;
                if (input) onActivate(input.value.trim());
            };
        }
        const btnActivateLock = document.getElementById('btnActivateLicenseLock');
        if (btnActivateLock) {
            btnActivateLock.onclick = () => {
                const input = document.getElementById('licenseKeyInputLock') as HTMLInputElement;
                if (input) onActivate(input.value.trim());
            };
        }

        const btnCopy = document.getElementById('btnCopyDeviceId');
        if (btnCopy) btnCopy.onclick = onCopyDeviceId;

        const btnCopyLock = document.getElementById('btnCopyDeviceIdLock');
        if (btnCopyLock) btnCopyLock.onclick = onCopyDeviceId;
    }
}

export class DefaultSecurityComponent implements ISecurityComponent {
    render(enabled: boolean) {
        const chkMenuSecurity = document.getElementById('chkMenuSecurity') as HTMLInputElement;
        if (chkMenuSecurity) {
            chkMenuSecurity.checked = enabled;
        }
    }

    initHandlers(onToggle: () => void) {
        const chkMenuSecurity = document.getElementById('chkMenuSecurity') as HTMLInputElement;
        if (chkMenuSecurity) {
            chkMenuSecurity.onclick = (e) => {
                e.preventDefault();
                onToggle();
            };
        }
    }
}

export class DefaultProfileDetailsComponent implements IProfileDetailsComponent {
    render(name: string, email: string, badgeLabel: string, badgeStyle: { color: string; background: string }) {
        const profileNameDisplay = document.getElementById('profileNameDisplay');
        const profileEmailDisplay = document.getElementById('profileEmailDisplay');
        const profileTierBadge = document.getElementById('profileTierBadge');

        if (profileNameDisplay) profileNameDisplay.innerText = name;
        if (profileEmailDisplay) profileEmailDisplay.innerText = email;
        if (profileTierBadge) {
            profileTierBadge.innerText = badgeLabel;
            profileTierBadge.style.color = badgeStyle.color;
            profileTierBadge.style.background = badgeStyle.background;
        }
    }
}

export class DefaultSalesSupportComponent implements ISalesSupportComponent {
    render() {
        // Can be easily enhanced or customized to load dynamic contact details from a server API
    }
}

export class DefaultSessionComponent implements ISessionComponent {
    initHandlers(onLogout: () => Promise<void>) {
        const btnLogOut = document.getElementById('btnLogOut');
        if (btnLogOut) {
            btnLogOut.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await onLogout();
            };
        }
    }
}

export class DefaultTextsConfigComponent implements ITextsConfigComponent {
    render(autoFit: boolean, title: string, subtitle: string, titleFontSize: number, subtitleFontSize: number) {
        const chkAutoFit = document.getElementById('chkAutoFit') as HTMLInputElement;
        const inputEditTitle = document.getElementById('inputEditTitle') as HTMLInputElement;
        const inputEditSubtitle = document.getElementById('inputEditSubtitle') as HTMLInputElement;
        const inputFontSize = document.getElementById('inputFontSize') as HTMLInputElement;
        const inputSubtitleFontSize = document.getElementById('inputSubtitleFontSize') as HTMLInputElement;

        if (chkAutoFit) chkAutoFit.checked = autoFit;
        if (inputEditTitle) inputEditTitle.value = title;
        if (inputEditSubtitle) inputEditSubtitle.value = subtitle;
        if (inputFontSize) inputFontSize.value = titleFontSize.toString();
        if (inputSubtitleFontSize) inputSubtitleFontSize.value = subtitleFontSize.toString();
    }

    getValues() {
        const chkAutoFit = document.getElementById('chkAutoFit') as HTMLInputElement;
        const inputEditTitle = document.getElementById('inputEditTitle') as HTMLInputElement;
        const inputEditSubtitle = document.getElementById('inputEditSubtitle') as HTMLInputElement;
        const inputFontSize = document.getElementById('inputFontSize') as HTMLInputElement;
        const inputSubtitleFontSize = document.getElementById('inputSubtitleFontSize') as HTMLInputElement;

        return {
            autoFit: chkAutoFit ? chkAutoFit.checked : false,
            title: inputEditTitle ? inputEditTitle.value.toUpperCase() : "",
            subtitle: inputEditSubtitle ? inputEditSubtitle.value.toUpperCase() : "",
            titleFontSize: inputFontSize ? parseInt(inputFontSize.value) || 32 : 32,
            subtitleFontSize: inputSubtitleFontSize ? parseInt(inputSubtitleFontSize.value) || 12 : 12
        };
    }
}

export class DefaultPaletteConfigComponent implements IPaletteConfigComponent {
    render(themeId: string, customThemeIds: string[], currentCustomization?: { primary: string; secondary: string; logo: string; bg: string }) {
        const panel = document.getElementById('themeCustomPanel');
        const inputThemePrimary = document.getElementById('themePrimaryColor') as HTMLInputElement;
        const inputThemeSecondary = document.getElementById('themeSecondaryColor') as HTMLInputElement;
        const themeSelector = document.getElementById('themeSelector') as HTMLSelectElement;

        if (themeSelector) {
            const presetNames: Record<string, string> = {
                'nexo-gold': 'OCEANIC (CIÁN y PIZARRA)',
                'nexo-store': 'EMERALD (MENTA y BOSQUE)',
                'nexo-beauty': 'VIOLET (TECH PREMIUM)',
                'nexo-family': 'AMBER (MÁRMOL y BRONCE)',
                'nexo-kids': 'SKY (AZUL y GRIS SLATE)',
                'nexo-halloween': 'LUXURY (ORO SATINADO)'
            };
            let options = Object.keys(THEME_PRESETS).map(tid => `<option value="${tid}" ${themeId === tid ? 'selected' : ''}>${presetNames[tid] || tid.replace('nexo-', '').toUpperCase()}</option>`).join('');
            
            customThemeIds.forEach(tid => {
                if (!THEME_PRESETS[tid]) options += `<option value="${tid}" ${themeId === tid ? 'selected' : ''}>TEMA: ${tid.replace('custom_', '').toUpperCase()}</option>`;
            });
            options += `<option value="create-new-theme">+ CREAR TEMA NUEVO</option>`;
            themeSelector.innerHTML = options;
        }

        if (currentCustomization) {
            if (inputThemePrimary) inputThemePrimary.value = currentCustomization.primary;
            if (inputThemeSecondary) inputThemeSecondary.value = currentCustomization.secondary;
        }

        if (panel) {
            panel.style.display = 'block';
        }
    }

    initHandlers(onThemeChange: (themeId: string) => void) {
        const themeSelector = document.getElementById('themeSelector') as HTMLSelectElement;
        if (themeSelector) {
            themeSelector.onchange = (e) => {
                const val = (e.target as HTMLSelectElement).value;
                onThemeChange(val);
            };
        }
    }

    getValues() {
        const themeSelector = document.getElementById('themeSelector') as HTMLSelectElement;
        const inputThemePrimary = document.getElementById('themePrimaryColor') as HTMLInputElement;
        const inputThemeSecondary = document.getElementById('themeSecondaryColor') as HTMLInputElement;

        return {
            themeId: themeSelector ? themeSelector.value : "",
            primary: inputThemePrimary ? inputThemePrimary.value : "",
            secondary: inputThemeSecondary ? inputThemeSecondary.value : ""
        };
    }
}

export class DefaultThemeAssetsComponent implements IThemeAssetsComponent {
    render(logoUrl?: string, bgUrl?: string) {
        const miniLogoPerfil = document.getElementById('miniLogoPreview');
        const miniBgPerfil = document.getElementById('miniBgPreview');
        const miniLogoTab = document.getElementById('miniLogoTabPreview');
        const miniBgTab = document.getElementById('miniBgTabPreview');

        const logoBgStyle = logoUrl ? `url(${logoUrl})` : 'none';
        if (miniLogoPerfil) miniLogoPerfil.style.backgroundImage = logoBgStyle;
        if (miniLogoTab) miniLogoTab.style.backgroundImage = logoBgStyle;

        const bgBgStyle = bgUrl ? `url(${bgUrl})` : 'none';
        if (miniBgPerfil) miniBgPerfil.style.backgroundImage = bgBgStyle;
        if (miniBgTab) miniBgTab.style.backgroundImage = bgBgStyle;
    }

    initHandlers(
        onLogoChange: (dataUrl: string) => void,
        onBgChange: (dataUrl: string) => void,
        onLogoRemove: () => void,
        onBgRemove: () => void
    ) {
        const inputThemeLogo = document.getElementById('inputThemeLogo') as HTMLInputElement;
        const inputThemeBg = document.getElementById('inputThemeBg') as HTMLInputElement;

        const btnChangeLogo = document.getElementById('btnThemeChangeLogo');
        const btnTabChangeLogo = document.getElementById('btnThemeTabChangeLogo');
        if (btnChangeLogo) btnChangeLogo.onclick = () => { if (inputThemeLogo) inputThemeLogo.click(); };
        if (btnTabChangeLogo) btnTabChangeLogo.onclick = () => { if (inputThemeLogo) inputThemeLogo.click(); };

        const btnChangeBg = document.getElementById('btnThemeChangeBg');
        const btnTabChangeBg = document.getElementById('btnThemeTabChangeBg');
        if (btnChangeBg) btnChangeBg.onclick = () => { if (inputThemeBg) inputThemeBg.click(); };
        if (btnTabChangeBg) btnTabChangeBg.onclick = () => { if (inputThemeBg) inputThemeBg.click(); };

        if (inputThemeLogo) {
            inputThemeLogo.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (re) => {
                        let dataUrl = re.target?.result as string;
                        dataUrl = await compressImage(dataUrl);
                        onLogoChange(dataUrl);
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        if (inputThemeBg) {
            inputThemeBg.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (re) => {
                        let dataUrl = re.target?.result as string;
                        dataUrl = await compressImage(dataUrl);
                        onBgChange(dataUrl);
                    };
                    reader.readAsDataURL(file);
                }
            };
        }

        const btnRemoveLogo = document.getElementById('btnThemeRemoveLogo');
        const btnTabRemoveLogo = document.getElementById('btnThemeTabRemoveLogo');
        if (btnRemoveLogo) btnRemoveLogo.onclick = onLogoRemove;
        if (btnTabRemoveLogo) btnTabRemoveLogo.onclick = onLogoRemove;

        const btnRemoveBg = document.getElementById('btnThemeRemoveBg');
        const btnTabRemoveBg = document.getElementById('btnThemeTabRemoveBg');
        if (btnRemoveBg) btnRemoveBg.onclick = onBgRemove;
        if (btnTabRemoveBg) btnTabRemoveBg.onclick = onBgRemove;
    }
}

export class DefaultApplyCustomizationsComponent implements IApplyCustomizationsComponent {
    renderFeedback(message: string, isError: boolean) {
        const feedback = document.getElementById('applyChangesFeedback');
        const btnApply = document.getElementById('btnApplyCustomizations');
        if (feedback) {
            feedback.innerText = message;
            feedback.style.color = isError ? "#ef4444" : "#10b981";
        }
        if (btnApply) {
            if (isError) {
                btnApply.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            } else {
                btnApply.style.background = 'linear-gradient(135deg, #059669 0%, #10b981 100%)';
            }
        }
    }

    setLoadingState(isLoading: boolean, originalText: string) {
        const btnApply = document.getElementById('btnApplyCustomizations');
        if (btnApply) {
            if (isLoading) {
                btnApply.setAttribute('disabled', 'true');
                btnApply.innerHTML = '<span>⏳</span> APLICANDO CAMBIOS...';
            } else {
                btnApply.removeAttribute('disabled');
                btnApply.innerHTML = originalText;
                btnApply.style.background = '';
            }
        }
    }

    initHandlers(onApply: () => Promise<void>) {
        const btnApply = document.getElementById('btnApplyCustomizations');
        if (btnApply) {
            btnApply.onclick = async (e) => {
                e.preventDefault();
                await onApply();
            };
        }
    }
}


/**
 * ============================================================================
 * DEFAULT SYSTEM DATA PROVIDERS (Reads from Local Config, Session, and Supabase)
 * ============================================================================
 */

export class DefaultPerfilSubscriptionProvider implements IPerfilSubscriptionProvider {
    getLicense() {
        return StateManager.config.license;
    }

    async activateLicense(key: string, currentEmail: string) {
        if (isSupabaseConfigured) {
            try {
                const res = await activateLicenseOnline(key, currentEmail, Security.getDeviceId());
                return res;
            } catch (err: any) {
                console.error("Error activating license online:", err);
                return { success: false, error: err?.message || String(err) };
            }
        }
        
        // Offline validation
        const offlineLicense = Security.validateLicenseAlgorithm(key, currentEmail);
        if (offlineLicense) {
            return { success: true, license: offlineLicense };
        }
        return { success: false, error: "Llave de activación local inválida." };
    }

    async verifyGlobalLicense(currentEmail: string) {
        const license = StateManager.config.license;
        if (isSupabaseConfigured && license.licenseKey && license.licenseKey !== 'TRIAL-MODE-LITE') {
            try {
                const status = await checkLicenseStatusOnline(license.licenseKey, currentEmail);
                if (status.success) {
                    return { success: true, isValid: !!status.isValid, license: status.license };
                }
            } catch (err) {
                console.warn("Error checking license status online:", err);
            }
        }
        const isExpired = new Date(license.expiryDate) < new Date() || !license.isActive;
        return { success: true, isValid: !isExpired, license };
    }

    getDeviceId() {
        return Security.getDeviceId();
    }
}

export class DefaultPerfilUsuarioProvider implements IPerfilUsuarioProvider {
    async getProfileName(currentEmail: string) {
        const isSub = sessionStorage.getItem('nexo_sub_account_active') === 'true';
        if (isSub) {
            const subName = sessionStorage.getItem('nexo_sub_account_name') || "";
            const subRole = sessionStorage.getItem('nexo_sub_account_role') || "";
            const roleLabels: Record<string, string> = { 'designer': 'DISEÑADOR', 'marketing': 'MARKETING', 'advertising': 'PUBLICIDAD', 'custom': 'COLABORADOR' };
            const roleLabel = roleLabels[subRole] || subRole.toUpperCase();
            return `${subName.toUpperCase()} (${roleLabel})`;
        }

        let companyName = sessionStorage.getItem('nexo_current_user_company');
        if (!companyName && isSupabaseConfigured) {
            try {
                const { supabase } = await import('../supabase');
                const email = currentEmail.toLowerCase();
                const { data: profile } = await supabase.from('profiles').select('company').eq('email', email).maybeSingle();
                if (profile && profile.company) {
                    companyName = profile.company;
                    sessionStorage.setItem('nexo_current_user_company', companyName);
                } else {
                    const { data: nUser } = await supabase.from('nexo_users').select('company').eq('email', email).maybeSingle();
                    if (nUser && nUser.company) {
                        companyName = nUser.company;
                        sessionStorage.setItem('nexo_current_user_company', companyName);
                    }
                }
            } catch (err) {
                console.error("Error fetching user company from Supabase in default provider:", err);
            }
        }
        return (companyName || "USUARIO ACTIVO").toUpperCase();
    }

    getProfileEmail(currentEmail: string) {
        const isSub = sessionStorage.getItem('nexo_sub_account_active') === 'true';
        if (isSub) {
            return `Colaborador de ${currentEmail}`;
        }
        return currentEmail;
    }

    getProfileTierBadgeLabel(tier: string, isExpired: boolean) {
        if (isExpired) {
            return "SISTEMA BLOQUEADO";
        }
        const labels: Record<string, string> = {
            'LITE': 'VERSIÓN LITE / TRIAL',
            'PRO': 'PRO PREMIUM ACTIVO',
            'ENTERPRISE': 'NIVEL ENTERPRISE'
        };
        return labels[tier as 'LITE'|'PRO'|'ENTERPRISE'] || labels['LITE'];
    }

    getProfileTierBadgeStyle(tier: string, isExpired: boolean) {
        if (isExpired) {
            return { color: 'var(--danger)', background: 'rgba(255, 77, 77, 0.1)' };
        }
        const styles: Record<string, { color: string; background: string }> = {
            'LITE': { color: 'var(--gold)', background: 'rgba(212,175,55,0.1)' },
            'PRO': { color: 'var(--success)', background: 'rgba(0,200,83,0.1)' },
            'ENTERPRISE': { color: '#00e5ff', background: 'rgba(0,229,255,0.1)' }
        };
        return styles[tier as 'LITE'|'PRO'|'ENTERPRISE'] || styles['LITE'];
    }

    getMenuSecurityEnabled() {
        return !!StateManager.config.menuSecurityEnabled;
    }

    setMenuSecurityEnabled(enabled: boolean) {
        StateManager.config.menuSecurityEnabled = enabled;
        StateManager.save();
    }
}

export class DefaultPerfilPersonalizacionProvider implements IPerfilPersonalizacionProvider {
    getConfigTitle() {
        return StateManager.config.title;
    }
    setConfigTitle(val: string) {
        StateManager.config.title = val;
        StateManager.save();
    }
    getConfigSubtitle() {
        return StateManager.config.subtitle || "";
    }
    setConfigSubtitle(val: string) {
        StateManager.config.subtitle = val;
        StateManager.save();
    }
    getConfigTitleFontSize() {
        return StateManager.config.titleFontSize || 32;
    }
    setConfigTitleFontSize(val: number) {
        StateManager.config.titleFontSize = val;
        StateManager.save();
    }
    getConfigSubtitleFontSize() {
        return StateManager.config.subtitleFontSize || 12;
    }
    setConfigSubtitleFontSize(val: number) {
        StateManager.config.subtitleFontSize = val;
        StateManager.save();
    }
    getConfigAutoFitTitle() {
        return !!StateManager.config.autoFitTitle;
    }
    setConfigAutoFitTitle(val: boolean) {
        StateManager.config.autoFitTitle = val;
        StateManager.save();
    }
    getThemeId() {
        return StateManager.config.themeId;
    }
    setThemeId(val: string) {
        StateManager.config.themeId = val;
        StateManager.save();
    }
    getThemeCustomization(themeId: string) {
        return StateManager.config.themeCustomizations[themeId];
    }
    setThemeCustomization(themeId: string, customization: { primary: string; secondary: string; logo: string; bg: string }) {
        StateManager.config.themeCustomizations[themeId] = customization;
        StateManager.save();
    }
    async syncMediaToSupabase(email: string, key: string, dataUrl: string) {
        await syncMediaToSupabase(email, key, dataUrl);
    }
}


/**
 * ============================================================================
 * PROFILE CALLBACKS & CENTRAL MANAGER
 * ============================================================================
 */

export interface PerfilCallbacks {
    showCustomAlert: (message: string, title?: string) => void;
    showCustomConfirm: (message: string, onConfirm: () => void) => void;
    applyActiveThemeColors: () => void;
    adjustTitleFontSize: () => void;
    executeWithAuth: (callback: () => void) => void;
}

let callbacks: PerfilCallbacks | null = null;

export const setPerfilCallbacks = (cb: PerfilCallbacks) => {
    callbacks = cb;
};

const getCallbacks = (): PerfilCallbacks => {
    if (!callbacks) {
        throw new Error("Perfil callbacks must be set before invoking functions.");
    }
    return callbacks;
};

export class PerfilController {
    // Business providers
    private subscriptionProvider: IPerfilSubscriptionProvider = new DefaultPerfilSubscriptionProvider();
    private usuarioProvider: IPerfilUsuarioProvider = new DefaultPerfilUsuarioProvider();
    private personalizacionProvider: IPerfilPersonalizacionProvider = new DefaultPerfilPersonalizacionProvider();

    // Visual subcomponents (100% modular, customizable, and swappable)
    private subscriptionComponent: ISubscriptionComponent = new DefaultSubscriptionComponent();
    private securityComponent: ISecurityComponent = new DefaultSecurityComponent();
    private profileDetailsComponent: IProfileDetailsComponent = new DefaultProfileDetailsComponent();
    private salesSupportComponent: ISalesSupportComponent = new DefaultSalesSupportComponent();
    private sessionComponent: ISessionComponent = new DefaultSessionComponent();

    // Personalization modular subcomponents
    private textsConfigComponent: ITextsConfigComponent = new DefaultTextsConfigComponent();
    private paletteConfigComponent: IPaletteConfigComponent = new DefaultPaletteConfigComponent();
    private themeAssetsComponent: IThemeAssetsComponent = new DefaultThemeAssetsComponent();
    private applyCustomizationsComponent: IApplyCustomizationsComponent = new DefaultApplyCustomizationsComponent();

    private pendingThemeId: string = "";
    private pendingLogoDataUrl: string | null = null;
    private pendingBgDataUrl: string | null = null;

    // Component/Provider setters for dependency injection (scalability and custom extensions)
    setSubscriptionProvider(provider: IPerfilSubscriptionProvider) { this.subscriptionProvider = provider; }
    setUsuarioProvider(provider: IPerfilUsuarioProvider) { this.usuarioProvider = provider; }
    setPersonalizacionProvider(provider: IPerfilPersonalizacionProvider) { this.personalizacionProvider = provider; }

    setSubscriptionComponent(comp: ISubscriptionComponent) { this.subscriptionComponent = comp; }
    setSecurityComponent(comp: ISecurityComponent) { this.securityComponent = comp; }
    setProfileDetailsComponent(comp: IProfileDetailsComponent) { this.profileDetailsComponent = comp; }
    setSalesSupportComponent(comp: ISalesSupportComponent) { this.salesSupportComponent = comp; }
    setSessionComponent(comp: ISessionComponent) { this.sessionComponent = comp; }

    setTextsConfigComponent(comp: ITextsConfigComponent) { this.textsConfigComponent = comp; }
    setPaletteConfigComponent(comp: IPaletteConfigComponent) { this.paletteConfigComponent = comp; }
    setThemeAssetsComponent(comp: IThemeAssetsComponent) { this.themeAssetsComponent = comp; }
    setApplyCustomizationsComponent(comp: IApplyCustomizationsComponent) { this.applyCustomizationsComponent = comp; }

    getSubscriptionProvider() { return this.subscriptionProvider; }
    getUsuarioProvider() { return this.usuarioProvider; }
    getPersonalizacionProvider() { return this.personalizacionProvider; }

    getTextsConfigComponent() { return this.textsConfigComponent; }
    getPaletteConfigComponent() { return this.paletteConfigComponent; }
    getThemeAssetsComponent() { return this.themeAssetsComponent; }
    getApplyCustomizationsComponent() { return this.applyCustomizationsComponent; }

    async renderSubscriptionDashboard() {
        const license = this.subscriptionProvider.getLicense();
        const isExpired = new Date(license.expiryDate) < new Date() || !license.isActive;
        const deviceId = this.subscriptionProvider.getDeviceId();

        // 1. Delegate Subscription status card rendering
        this.subscriptionComponent.render(license, deviceId);

        // 2. Delegate Enterprise user info card rendering
        const currentEmail = sessionStorage.getItem('nexo_current_user_email') || "";
        if (currentEmail) {
            const profileName = await this.usuarioProvider.getProfileName(currentEmail);
            const profileEmail = this.usuarioProvider.getProfileEmail(currentEmail);
            const badgeLabel = this.usuarioProvider.getProfileTierBadgeLabel(license.tier, isExpired);
            const badgeStyle = this.usuarioProvider.getProfileTierBadgeStyle(license.tier, isExpired);
            
            this.profileDetailsComponent.render(profileName, profileEmail, badgeLabel, badgeStyle);
        }

        // 3. Delegate system menu security pin checkbox rendering
        const menuSecurityEnabled = this.usuarioProvider.getMenuSecurityEnabled();
        this.securityComponent.render(menuSecurityEnabled);

        // 4. Delegate Technical Support contact info rendering
        this.salesSupportComponent.render();
    }

    async handleLicenseActivation(inputId: string, onSuccess: () => void) {
        const input = document.getElementById(inputId) as HTMLInputElement;
        if (!input) return;

        const key = input.value.trim();
        const cb = getCallbacks();
        if (!key) return cb.showCustomAlert("Por favor, ingrese una llave.", "ATENCIÓN");

        const currentEmail = sessionStorage.getItem('nexo_current_user_email') || '';

        cb.showCustomAlert("Verificando la llave de activación con el servidor...", "PROCESANDO");

        const result = await this.subscriptionProvider.activateLicense(key, currentEmail);
        if (result.success && result.license) {
            StateManager.config.license = result.license;
            StateManager.save();

            if (isSupabaseConfigured && currentEmail) {
                await syncConfigToSupabase(currentEmail, StateManager.config);
            }

            appWheel.audio.init();
            cb.showCustomAlert(`¡SISTEMA ACTIVADO!\nNivel: ${result.license.tier}\nExpira: ${new Date(result.license.expiryDate).toLocaleDateString()}`, "ÉXITO");
            await this.renderSubscriptionDashboard();
            onSuccess();
            input.value = "";
        } else {
            cb.showCustomAlert(`ERROR DE ACTIVACIÓN:\n\n${result.error || 'Clave inválida'}`, "ERROR");
        }
    }

    async verifyGlobalLicense(onSuccess: () => void) {
        const currentEmail = sessionStorage.getItem('nexo_current_user_email') || '';
        const res = await this.subscriptionProvider.verifyGlobalLicense(currentEmail);
        if (res.success && res.license) {
            const currentLicense = StateManager.config.license;
            if (currentLicense.tier !== res.license.tier || currentLicense.expiryDate !== res.license.expiryDate || currentLicense.isActive !== res.license.isActive) {
                StateManager.config.license = res.license;
                StateManager.save();
                await this.renderSubscriptionDashboard();
            }
        }

        const updatedLicense = StateManager.config.license;
        const isExpired = new Date(updatedLicense.expiryDate) < new Date() || !updatedLicense.isActive;
        const modalLock = document.getElementById('modalLicenseLock');
        if (isExpired) {
            if (modalLock) modalLock.style.display = 'flex';
            const btnSpin = document.getElementById('btnSpinCenter');
            if (btnSpin) (btnSpin as HTMLButtonElement).disabled = true;

            const deviceIdDisplayLock = document.getElementById('nexoDeviceIdDisplayLock');
            if (deviceIdDisplayLock) deviceIdDisplayLock.innerText = this.subscriptionProvider.getDeviceId();
        } else {
            if (modalLock) modalLock.style.display = 'none';
        }
    }

    initSubscriptionHandlers(verifyGlobalLicenseFn: () => Promise<void>) {
        this.subscriptionComponent.initHandlers(
            async (key) => {
                const cb = getCallbacks();
                if (!key) return cb.showCustomAlert("Por favor, ingrese una llave.", "ATENCIÓN");

                const currentEmail = sessionStorage.getItem('nexo_current_user_email') || '';
                cb.showCustomAlert("Verificando la llave de activación con el servidor...", "PROCESANDO");

                const result = await this.subscriptionProvider.activateLicense(key, currentEmail);
                if (result.success && result.license) {
                    StateManager.config.license = result.license;
                    StateManager.save();

                    if (isSupabaseConfigured && currentEmail) {
                        await syncConfigToSupabase(currentEmail, StateManager.config);
                    }

                    appWheel.audio.init();
                    cb.showCustomAlert(`¡SISTEMA ACTIVADO!\nNivel: ${result.license.tier}\nExpira: ${new Date(result.license.expiryDate).toLocaleDateString()}`, "ÉXITO");
                    await this.renderSubscriptionDashboard();
                    verifyGlobalLicenseFn();
                } else {
                    cb.showCustomAlert(`ERROR DE ACTIVACIÓN:\n\n${result.error || 'Clave inválida'}`, "ERROR");
                }
            },
            () => {
                const id = this.subscriptionProvider.getDeviceId();
                const cb = getCallbacks();
                navigator.clipboard.writeText(id).then(() => {
                    cb.showCustomAlert("ID DE DISPOSITIVO COPIADO: " + id, "COPIADO");
                });
            }
        );
    }

    async renderPersonalizationDashboard() {
        const title = this.personalizacionProvider.getConfigTitle();
        const subtitle = this.personalizacionProvider.getConfigSubtitle();
        const titleFontSize = this.personalizacionProvider.getConfigTitleFontSize();
        const subtitleFontSize = this.personalizacionProvider.getConfigSubtitleFontSize();
        const autoFit = this.personalizacionProvider.getConfigAutoFitTitle();
        
        // 1. Render Texts & Titles
        this.textsConfigComponent.render(autoFit, title, subtitle, titleFontSize, subtitleFontSize);

        if (!this.pendingThemeId) {
            this.pendingThemeId = this.personalizacionProvider.getThemeId();
        }

        const customization = this.personalizacionProvider.getThemeCustomization(this.pendingThemeId) || { primary: '#fff', secondary: '#000', logo: '', bg: '' };
        const customThemeIds = Object.keys(StateManager.config.themeCustomizations);

        // 2. Render Palette Config
        this.paletteConfigComponent.render(this.pendingThemeId, customThemeIds, customization);

        // 3. Render Theme Assets
        const logo = this.pendingLogoDataUrl !== null ? this.pendingLogoDataUrl : customization.logo;
        const bg = this.pendingBgDataUrl !== null ? this.pendingBgDataUrl : customization.bg;
        this.themeAssetsComponent.render(logo, bg);
    }

    initThemeHandlers() {
        this.pendingThemeId = this.personalizacionProvider.getThemeId();
        this.pendingLogoDataUrl = null;
        this.pendingBgDataUrl = null;

        // 1. Initialize Palette Config Handlers
        this.paletteConfigComponent.initHandlers((val) => {
            if (val === 'create-new-theme') {
                const newId = "custom_" + Date.now();
                const currentConfig = this.personalizacionProvider.getThemeCustomization(this.pendingThemeId) || THEME_PRESETS['nexo-gold'];
                this.personalizacionProvider.setThemeCustomization(newId, JSON.parse(JSON.stringify(currentConfig)));
                this.pendingThemeId = newId;
                this.pendingLogoDataUrl = null;
                this.pendingBgDataUrl = null;
            } else {
                this.pendingThemeId = val;
                this.pendingLogoDataUrl = null;
                this.pendingBgDataUrl = null;
            }
            this.renderPersonalizationDashboard();
        });

        // 2. Initialize Assets (Logo, Bg) Config Handlers
        this.themeAssetsComponent.initHandlers(
            (logoDataUrl) => {
                this.pendingLogoDataUrl = logoDataUrl;
                this.renderPersonalizationDashboard();
            },
            (bgDataUrl) => {
                this.pendingBgDataUrl = bgDataUrl;
                this.renderPersonalizationDashboard();
            },
            () => {
                this.pendingLogoDataUrl = "";
                this.renderPersonalizationDashboard();
            },
            () => {
                this.pendingBgDataUrl = "";
                this.renderPersonalizationDashboard();
            }
        );

        // 3. Initialize Apply/Save Config Handlers
        this.applyCustomizationsComponent.initHandlers(async () => {
            const originalBtn = document.getElementById('btnApplyCustomizations');
            const originalText = originalBtn ? originalBtn.innerHTML : '💾 APLICAR CAMBIOS DE PERSONALIZACIÓN';
            this.applyCustomizationsComponent.setLoadingState(true, originalText);

            try {
                // Get values from texts subcomponent
                const texts = this.textsConfigComponent.getValues();
                this.personalizacionProvider.setConfigTitle(texts.title);
                this.personalizacionProvider.setConfigSubtitle(texts.subtitle);
                this.personalizacionProvider.setConfigTitleFontSize(texts.titleFontSize);
                this.personalizacionProvider.setConfigSubtitleFontSize(texts.subtitleFontSize);
                this.personalizacionProvider.setConfigAutoFitTitle(texts.autoFit);

                // Get values from palette subcomponent (color pickers)
                const palette = this.paletteConfigComponent.getValues();
                const themeToSave = palette.themeId || this.pendingThemeId;
                this.personalizacionProvider.setThemeId(themeToSave);

                const customization = this.personalizacionProvider.getThemeCustomization(themeToSave) || { primary: '#fff', secondary: '#000', logo: '', bg: '' };
                customization.primary = palette.primary;
                customization.secondary = palette.secondary;

                if (this.pendingLogoDataUrl !== null) {
                    customization.logo = this.pendingLogoDataUrl;
                    const mediaKey = `theme_logo_${themeToSave}`;
                    if (isSupabaseConfigured) {
                        const email = sessionStorage.getItem('nexo_current_user_email');
                        if (email) {
                            try { await this.personalizacionProvider.syncMediaToSupabase(email, mediaKey, this.pendingLogoDataUrl || ''); } catch (err) { console.warn(err); }
                        }
                    }
                }

                if (this.pendingBgDataUrl !== null) {
                    customization.bg = this.pendingBgDataUrl;
                    const mediaKey = `theme_bg_${themeToSave}`;
                    if (isSupabaseConfigured) {
                        const email = sessionStorage.getItem('nexo_current_user_email');
                        if (email) {
                            try { await this.personalizacionProvider.syncMediaToSupabase(email, mediaKey, this.pendingBgDataUrl || ''); } catch (err) { console.warn(err); }
                        }
                    }
                }

                this.personalizacionProvider.setThemeCustomization(themeToSave, customization);

                const cb = getCallbacks();
                
                const mainTitle = document.getElementById('mainTitle');
                const mainSubtitle = document.getElementById('mainSubtitle');
                if (mainTitle) mainTitle.innerText = this.personalizacionProvider.getConfigTitle();
                if (mainSubtitle) {
                    mainSubtitle.innerText = this.personalizacionProvider.getConfigSubtitle() || "SISTEMA DE SORTEO";
                    mainSubtitle.style.fontSize = this.personalizacionProvider.getConfigSubtitleFontSize() + 'px';
                }

                if (this.personalizacionProvider.getConfigAutoFitTitle()) {
                    cb.adjustTitleFontSize();
                } else if (mainTitle) {
                    mainTitle.style.fontSize = this.personalizacionProvider.getConfigTitleFontSize() + 'px';
                }

                cb.applyActiveThemeColors();

                this.applyCustomizationsComponent.renderFeedback("¡Los cambios visuales y textos se han sincronizado e implementado en todo el sistema!", false);
                const btnApply = document.getElementById('btnApplyCustomizations');
                if (btnApply) {
                    btnApply.innerHTML = '<span>✓</span> ¡CAMBIOS APLICADOS!';
                }

                this.pendingLogoDataUrl = null;
                this.pendingBgDataUrl = null;

                setTimeout(() => {
                    this.applyCustomizationsComponent.setLoadingState(false, originalText);
                    this.applyCustomizationsComponent.renderFeedback("Haz clic aquí para aplicar y guardar permanentemente todos los cambios de diseño, colores, títulos y tipografía de la ruleta.", false);
                    const feedback = document.getElementById('applyChangesFeedback');
                    if (feedback) feedback.style.color = "";
                }, 3000);

            } catch (err) {
                console.error("Error applying customizations:", err);
                this.applyCustomizationsComponent.renderFeedback("ERROR AL GUARDAR CAMBIOS DE DISEÑO", true);
                const btnApply = document.getElementById('btnApplyCustomizations');
                if (btnApply) {
                    btnApply.innerHTML = '<span>❌</span> ERROR AL GUARDAR';
                }
                setTimeout(() => {
                    this.applyCustomizationsComponent.setLoadingState(false, originalText);
                    this.applyCustomizationsComponent.renderFeedback("Haz clic aquí para aplicar y guardar permanentemente todos los cambios de diseño, colores, títulos y tipografía de la ruleta.", false);
                    const feedback = document.getElementById('applyChangesFeedback');
                    if (feedback) feedback.style.color = "";
                }, 3000);
            }
        });

        // Initialize display
        this.renderPersonalizationDashboard();
    }

    initSubTabs() {
        const container = document.getElementById('tab-perfil');
        if (!container) return;
        const subTabs = container.querySelectorAll('.sub-tab-btn[data-subtab]');
        subTabs.forEach(tab => {
            (tab as HTMLElement).onclick = () => {
                const target = tab.getAttribute('data-subtab');
                if (target) {
                    TabStateManager.setActiveSubtab(target);
                }
            };
        });
    }

    initMenuSecurityHandler() {
        this.securityComponent.initHandlers(() => {
            const cb = getCallbacks();
            cb.executeWithAuth(() => {
                const nextVal = !this.usuarioProvider.getMenuSecurityEnabled();
                this.usuarioProvider.setMenuSecurityEnabled(nextVal);
                this.securityComponent.render(nextVal);
            });
        });
    }

    initSessionHandlers() {
        this.sessionComponent.initHandlers(async () => {
            const handleLogoutExported = (window as any).handleLogout;
            if (handleLogoutExported) {
                await handleLogoutExported();
            }
        });
    }
}

export const perfilController = new PerfilController();
