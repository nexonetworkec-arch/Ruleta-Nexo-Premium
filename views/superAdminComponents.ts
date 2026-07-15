// ==========================================================
// NEXO SUPER ADMIN COMPONENT TYPES (MODULAR & SCALABLE)
// ==========================================================

export interface SuperAdminContext {
    users: any[];
    licenses: any[];
    searchQuery: string;
    licenseSearchQuery?: string;
    licenseFilterStatus?: string;
    stats: {
        totalUsers: number;
        activeLicenses: number;
        noLicense: number;
    };
    loadingUsers: boolean;
    loadingLicenses: boolean;
}

export interface SuperAdminModule {
    id: string;
    name: string;
    render: (ctx: SuperAdminContext) => string;
    bindEvents?: (ctx: SuperAdminContext, container: HTMLElement, parent: any) => void;
}

// ==========================================================
// REGISTRY FOR EXTENSIBLE SUPER ADMIN MODULES (TAB LEVEL)
// ==========================================================
export class SuperAdminRegistry {
    private static providers: SuperAdminModule[] = [];

    public static register(provider: SuperAdminModule) {
        if (!this.providers.find(p => p.id === provider.id)) {
            this.providers.push(provider);
        }
    }

    public static getProviders(): SuperAdminModule[] {
        return [...this.providers];
    }
}


// ==========================================================
// 1. CABECERA (HEADER) COMPONENT & SUB-PLUGINS
// ==========================================================
export interface SuperAdminHeaderPlugin {
    id: string;
    render(ctx: SuperAdminContext): string;
    bindEvents?(container: HTMLElement, parent: any): void;
}

export class SuperAdminHeaderComponent implements SuperAdminModule {
    id = 'header';
    name = 'Cabecera del Súper Administrador';

    private static plugins: SuperAdminHeaderPlugin[] = [];

    public static registerPlugin(plugin: SuperAdminHeaderPlugin) {
        if (!this.plugins.find(p => p.id === plugin.id)) {
            this.plugins.push(plugin);
        }
    }

    public static getPlugins(): SuperAdminHeaderPlugin[] {
        return [...this.plugins];
    }

    render(ctx: SuperAdminContext): string {
        const renderedHtml = SuperAdminHeaderComponent.getPlugins()
            .map(p => p.render(ctx))
            .join('\n');
        return `
            <div id="superadmin-header-wrapper" style="margin-bottom: 25px;">
                ${renderedHtml}
            </div>
        `;
    }

    bindEvents(ctx: SuperAdminContext, container: HTMLElement, parent: any): void {
        SuperAdminHeaderComponent.getPlugins().forEach(p => {
            if (p.bindEvents) {
                p.bindEvents(container, parent);
            }
        });
    }
}


// ==========================================================
// 2. GENERADOR DE LICENCIAS (GENERATOR) COMPONENT & SUB-PLUGINS
// ==========================================================
export interface SuperAdminGeneratorFieldPlugin {
    id: string;
    weight: number; // Order of rendering
    render(ctx: SuperAdminContext): string;
    bindEvents?(container: HTMLElement, parent: any): void;
}

export interface SuperAdminGeneratorActionPlugin {
    id: string;
    weight: number; // Order of rendering
    render(ctx: SuperAdminContext): string;
    bindEvents(container: HTMLElement, parent: any): void;
}

export class SuperAdminGeneratorComponent implements SuperAdminModule {
    id = 'generator';
    name = 'Generador de Licencias';

    private static fields: SuperAdminGeneratorFieldPlugin[] = [];
    private static actions: SuperAdminGeneratorActionPlugin[] = [];

    public static registerField(field: SuperAdminGeneratorFieldPlugin) {
        if (!this.fields.find(f => f.id === field.id)) {
            this.fields.push(field);
            this.fields.sort((a, b) => a.weight - b.weight);
        }
    }

    public static registerAction(action: SuperAdminGeneratorActionPlugin) {
        if (!this.actions.find(a => a.id === action.id)) {
            this.actions.push(action);
            this.actions.sort((a, b) => a.weight - b.weight);
        }
    }

    public static getFields(): SuperAdminGeneratorFieldPlugin[] {
        return [...this.fields];
    }

    public static getActions(): SuperAdminGeneratorActionPlugin[] {
        return [...this.actions];
    }

    render(ctx: SuperAdminContext): string {
        const fieldsHtml = SuperAdminGeneratorComponent.getFields()
            .map(f => f.render(ctx))
            .join('\n');

        const actionsHtml = SuperAdminGeneratorComponent.getActions()
            .map(a => a.render(ctx))
            .join('\n');

        return `
            <div class="config-section" style="background: rgba(212, 175, 55, 0.03); padding: 20px; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.15); margin-bottom: 25px; box-shadow: inset 0 0 20px rgba(212,175,55,0.02);">
                <h5 style="color: var(--gold); font-size: 0.85rem; margin-top: 0; margin-bottom: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-block; width: 6px; height: 6px; background: var(--gold); border-radius: 50%;"></span> Generar Llave de Activación
                </h5>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${fieldsHtml}
                    ${actionsHtml}
                </div>
            </div>
        `;
    }

    bindEvents(ctx: SuperAdminContext, container: HTMLElement, parent: any): void {
        SuperAdminGeneratorComponent.getFields().forEach(f => {
            if (f.bindEvents) f.bindEvents(container, parent);
        });
        SuperAdminGeneratorComponent.getActions().forEach(a => {
            a.bindEvents(container, parent);
        });
    }
}


// ==========================================================
// 3. LISTADO DE LICENCIAS GENERADAS (LICENSES) COMPONENT & SUB-PLUGINS
// ==========================================================
export interface SuperAdminLicensesHeaderPlugin {
    id: string;
    render(ctx: SuperAdminContext): string;
    bindEvents?(container: HTMLElement, parent: any): void;
}

export interface SuperAdminLicenseActionPlugin {
    id: string;
    weight: number;
    render(lic: any, ctx: SuperAdminContext): string;
    bindEvents(container: HTMLElement, lic: any, parent: any): void;
}

export class SuperAdminLicensesComponent implements SuperAdminModule {
    id = 'licenses';
    name = 'Licencias Generadas';

    private static headers: SuperAdminLicensesHeaderPlugin[] = [];
    private static actionPlugins: SuperAdminLicenseActionPlugin[] = [];

    public static registerHeader(header: SuperAdminLicensesHeaderPlugin) {
        if (!this.headers.find(h => h.id === header.id)) {
            this.headers.push(header);
        }
    }

    public static registerActionPlugin(action: SuperAdminLicenseActionPlugin) {
        if (!this.actionPlugins.find(a => a.id === action.id)) {
            this.actionPlugins.push(action);
            this.actionPlugins.sort((a, b) => a.weight - b.weight);
        }
    }

    public static getHeaders(): SuperAdminLicensesHeaderPlugin[] {
        return [...this.headers];
    }

    public static getActionPlugins(): SuperAdminLicenseActionPlugin[] {
        return [...this.actionPlugins];
    }

    render(ctx: SuperAdminContext): string {
        let licensesHtml = '';

        const searchQuery = (ctx.licenseSearchQuery || '').toLowerCase();
        const filterStatus = ctx.licenseFilterStatus || 'all';

        // Filter licenses based on search query and status filter
        const filteredLicenses = ctx.licenses.filter(lic => {
            const keyMatch = lic.license_key.toLowerCase().includes(searchQuery);
            const emailMatch = (lic.associated_email || '').toLowerCase().includes(searchQuery);
            const matchesSearch = keyMatch || emailMatch;

            const isExpired = new Date(lic.expiry_date) < new Date();
            let matchesStatus = true;
            if (filterStatus === 'active') {
                matchesStatus = lic.is_active && !isExpired;
            } else if (filterStatus === 'blocked') {
                matchesStatus = !lic.is_active;
            } else if (filterStatus === 'expired') {
                matchesStatus = lic.is_active && isExpired;
            }

            return matchesSearch && matchesStatus;
        });

        if (ctx.loadingLicenses) {
            licensesHtml = `<p style="text-align: center; color: var(--gold); font-size: 0.7rem; padding: 25px;">Cargando licencias en línea...</p>`;
        } else if (filteredLicenses.length === 0) {
            licensesHtml = `<p style="text-align: center; color: #555; font-size: 0.7rem; padding: 25px; border: 1px dashed #222; border-radius: 12px;">No se encontraron licencias con los criterios seleccionados.</p>`;
        } else {
            licensesHtml = filteredLicenses.map(lic => {
                const isExpired = new Date(lic.expiry_date) < new Date();
                const expiryStr = new Date(lic.expiry_date).toLocaleDateString();
                const statusBadgeColor = lic.is_active 
                    ? (isExpired ? '#ea580c' : '#10b981') 
                    : '#ef4444';
                const statusText = lic.is_active 
                    ? (isExpired ? 'EXPIRADA' : 'ACTIVA') 
                    : 'BLOQUEADA';
                    
                const actionsHtml = SuperAdminLicensesComponent.getActionPlugins()
                    .map(act => act.render(lic, ctx))
                    .join('\n');

                return `
                    <div class="license-card" data-key="${lic.license_key}" style="background: #090909; border: 1px solid ${lic.is_active ? 'rgba(212,175,55,0.1)' : 'rgba(239,68,68,0.15)'}; padding: 15px; border-radius: 12px; display: flex; flex-direction: column; gap: 10px; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                            <span style="font-family: monospace; font-size: 0.8rem; font-weight: 900; color: #fff; letter-spacing: 0.5px; word-break: break-all;">${lic.license_key}</span>
                            <button class="btn btn-secondary btn-copy-lic" data-key="${lic.license_key}" style="padding: 5px 10px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; border: 1px solid rgba(255,255,255,0.15);">COPIAR</button>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div style="display: flex; gap: 6px; align-items: center;">
                                <span style="font-size: 0.55rem; font-weight: 900; background: ${lic.tier === 'ENTERPRISE' ? '#9333ea' : (lic.tier === 'PRO' ? '#3b82f6' : '#64748b')}; color: #fff; padding: 2px 6px; border-radius: 4px;">${lic.tier}</span>
                                <span style="font-size: 0.55rem; font-weight: 900; background: ${statusBadgeColor}22; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeColor}33; padding: 2px 6px; border-radius: 4px;">${statusText}</span>
                            </div>
                            <span style="font-size: 0.6rem; color: #666;">Expira: ${expiryStr}</span>
                        </div>
                        
                        <div style="font-size: 0.6rem; color: #888; border-top: 1px dashed #1a1a1a; padding-top: 10px; margin-top: 2px; line-height: 1.4;">
                            <div>Cliente: <span style="color: #fff;">${lic.associated_email || 'Cualquiera (Llave Libre)'}</span></div>
                            ${lic.device_id ? `<div>Hardware ID: <span style="color: var(--gold); font-family: monospace;">${lic.device_id}</span></div>` : ''}
                            ${lic.activated_at ? `<div>Activación: <span style="color: #555;">${new Date(lic.activated_at).toLocaleString()}</span></div>` : ''}
                        </div>
                        
                        <div style="display: flex; gap: 8px; margin-top: 5px;" class="license-card-actions-wrapper">
                            ${actionsHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }

        const headersHtml = SuperAdminLicensesComponent.getHeaders()
            .map(h => h.render(ctx))
            .join('\n');

        return `
            <div class="config-section">
                <div>
                    ${headersHtml}
                    
                    <!-- Search and Status Filters for Licenses -->
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px; align-items: center; background: rgba(255,255,255,0.01); padding: 10px; border-radius: 8px; border: 1px solid #111;">
                        <input type="text" id="inputSuperAdminSearchLicenses" placeholder="Buscar llave o correo..." value="${ctx.licenseSearchQuery || ''}" style="background: #090909; border: 1px solid #222; padding: 8px 12px; border-radius: 6px; font-size: 0.65rem; color: #fff; flex: 1; min-width: 150px;">
                        
                        <div style="display: flex; gap: 4px;">
                            <button class="btn btn-secondary btn-license-filter ${filterStatus === 'all' ? 'active-filter' : ''}" data-status="all" style="padding: 4px 8px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; border: 1px solid ${filterStatus === 'all' ? 'var(--gold)' : '#222'}; color: ${filterStatus === 'all' ? 'var(--gold)' : '#888'}; background: ${filterStatus === 'all' ? 'rgba(212,175,55,0.05)' : 'transparent'}; font-weight: 800;">TODAS</button>
                            <button class="btn btn-secondary btn-license-filter ${filterStatus === 'active' ? 'active-filter' : ''}" data-status="active" style="padding: 4px 8px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; border: 1px solid ${filterStatus === 'active' ? '#10b981' : '#222'}; color: ${filterStatus === 'active' ? '#10b981' : '#888'}; background: ${filterStatus === 'active' ? 'rgba(16,185,129,0.05)' : 'transparent'}; font-weight: 800;">ACTIVAS</button>
                            <button class="btn btn-secondary btn-license-filter ${filterStatus === 'blocked' ? 'active-filter' : ''}" data-status="blocked" style="padding: 4px 8px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; border: 1px solid ${filterStatus === 'blocked' ? '#ef4444' : '#222'}; color: ${filterStatus === 'blocked' ? '#ef4444' : '#888'}; background: ${filterStatus === 'blocked' ? 'rgba(239,68,68,0.05)' : 'transparent'}; font-weight: 800;">BLOQUEADAS</button>
                            <button class="btn btn-secondary btn-license-filter ${filterStatus === 'expired' ? 'active-filter' : ''}" data-status="expired" style="padding: 4px 8px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; border: 1px solid ${filterStatus === 'expired' ? '#ea580c' : '#222'}; color: ${filterStatus === 'expired' ? '#ea580c' : '#888'}; background: ${filterStatus === 'expired' ? 'rgba(234,88,12,0.05)' : 'transparent'}; font-weight: 800;">EXPIRADAS</button>
                        </div>
                    </div>

                    <div id="superAdminLicensesContainer" style="max-height: 480px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding-right: 5px;">
                        ${licensesHtml}
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents(ctx: SuperAdminContext, container: HTMLElement, parent: any): void {
        SuperAdminLicensesComponent.getHeaders().forEach(h => {
            if (h.bindEvents) h.bindEvents(container, parent);
        });

        // Bind license search input
        const searchInput = container.querySelector('#inputSuperAdminSearchLicenses') as HTMLInputElement | null;
        searchInput?.addEventListener('input', () => {
            if (typeof parent.setLicenseSearchQuery === 'function') {
                parent.setLicenseSearchQuery(searchInput.value);
            }
        });

        // Bind license filter buttons
        container.querySelectorAll('.btn-license-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = (e.currentTarget as HTMLElement).getAttribute('data-status') || 'all';
                if (typeof parent.setLicenseFilterStatus === 'function') {
                    parent.setLicenseFilterStatus(status);
                }
            });
        });

        // Loop over rendered license cards to bind their internal actions
        const cards = container.querySelectorAll('.license-card');
        cards.forEach(card => {
            const key = card.getAttribute('data-key');
            const lic = ctx.licenses.find(l => l.license_key === key);
            if (lic) {
                SuperAdminLicensesComponent.getActionPlugins().forEach(act => {
                    act.bindEvents(card as HTMLElement, lic, parent);
                });
            }
        });
    }
}


// ==========================================================
// 4. CONTROL DE CUENTAS DE USUARIOS (USERS) COMPONENT & SUB-PLUGINS
// ==========================================================
export interface SuperAdminUserStatsPlugin {
    id: string;
    weight: number;
    render(ctx: SuperAdminContext): string;
}

export interface SuperAdminUserColumnPlugin {
    id: string;
    weight: number;
    headerName: string;
    renderCell(user: any, ctx: SuperAdminContext): string;
    bindCellEvents?(rowElement: HTMLElement, user: any, parent: any): void;
}

export class SuperAdminUsersComponent implements SuperAdminModule {
    id = 'users';
    name = 'Control de Cuentas y Licencias de Usuarios';

    private static statsPlugins: SuperAdminUserStatsPlugin[] = [];
    private static columnPlugins: SuperAdminUserColumnPlugin[] = [];

    public static registerStatsPlugin(plugin: SuperAdminUserStatsPlugin) {
        if (!this.statsPlugins.find(p => p.id === plugin.id)) {
            this.statsPlugins.push(plugin);
            this.statsPlugins.sort((a, b) => a.weight - b.weight);
        }
    }

    public static registerColumnPlugin(column: SuperAdminUserColumnPlugin) {
        if (!this.columnPlugins.find(c => c.id === column.id)) {
            this.columnPlugins.push(column);
            this.columnPlugins.sort((a, b) => a.weight - b.weight);
        }
    }

    public static getStatsPlugins(): SuperAdminUserStatsPlugin[] {
        return [...this.statsPlugins];
    }

    public static getColumnPlugins(): SuperAdminUserColumnPlugin[] {
        return [...this.columnPlugins];
    }

    render(ctx: SuperAdminContext): string {
        let tableRowsHtml = '';

        if (ctx.loadingUsers) {
            tableRowsHtml = `<tr><td colspan="${SuperAdminUsersComponent.getColumnPlugins().length}" style="text-align: center; color: var(--gold); padding: 40px; font-size: 0.7rem;">Cargando usuarios y licencias de la nube...</td></tr>`;
        } else if (ctx.users.length === 0) {
            tableRowsHtml = `<tr><td colspan="${SuperAdminUsersComponent.getColumnPlugins().length}" style="text-align: center; color: #555; padding: 40px; font-size: 0.7rem;">No se encontraron usuarios.</td></tr>`;
        } else {
            const query = ctx.searchQuery.toLowerCase();
            const filteredUsers = ctx.users.filter(u => 
                u.email.toLowerCase().includes(query) || 
                (u.company || '').toLowerCase().includes(query)
            );

            if (filteredUsers.length === 0) {
                tableRowsHtml = `<tr><td colspan="${SuperAdminUsersComponent.getColumnPlugins().length}" style="text-align: center; color: #555; padding: 40px; font-size: 0.7rem;">No se encontraron usuarios que coincidan con la búsqueda.</td></tr>`;
            } else {
                tableRowsHtml = filteredUsers.map(user => {
                    const columnsCells = SuperAdminUsersComponent.getColumnPlugins()
                        .map(col => `<td style="padding: 12px 8px;">${col.renderCell(user, ctx)}</td>`)
                        .join('\n');

                    return `
                        <tr class="user-row" data-email="${user.email}" style="border-bottom: 1px solid #111;">
                            ${columnsCells}
                        </tr>
                    `;
                }).join('');
            }
        }

        const statsHtml = SuperAdminUsersComponent.getStatsPlugins()
            .map(s => s.render(ctx))
            .join('\n');

        const headersHtml = SuperAdminUsersComponent.getColumnPlugins()
            .map(col => `<th style="padding: 10px 8px;">${col.headerName}</th>`)
            .join('\n');

        return `
            <div class="config-section" style="margin-top: 20px;">
                <!-- Panel de Usuarios Registrados -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
                        <h5 style="color: var(--gold); font-size: 0.85rem; margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
                            👥 Control de Cuentas y Licencias de Usuarios
                        </h5>
                        <div style="display: flex; gap: 8px; align-items: center;">
                            <input type="text" id="inputSuperAdminSearchUsers" placeholder="Buscar por correo..." value="${ctx.searchQuery}" style="background: #090909; border: 1px solid #222; padding: 6px 12px; border-radius: 6px; font-size: 0.65rem; color: #fff; max-width: 180px; width: 100%;">
                            <button id="btnSuperAdminUsersRefresh" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.6rem; width: auto; margin: 0; min-height: unset; border: 1px solid rgba(255,255,255,0.1);">🔄 REFRESCAR</button>
                        </div>
                    </div>
                    
                    <p style="font-size: 0.65rem; color: #666; margin-top: 0; margin-bottom: 15px;">Listado en tiempo real de cuentas registradas en Ruleta Nexo Premium y su estado de licenciamiento, días restantes, fecha de activación y expiración.</p>

                    <!-- Indicadores del Módulo -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 20px;">
                        ${statsHtml}
                    </div>

                    <div style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.65rem; color: #ccc; text-align: left; min-width: 600px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #111; color: #fff; font-weight: 900; text-transform: uppercase; background: #030303;">
                                    ${headersHtml}
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents(ctx: SuperAdminContext, container: HTMLElement, parent: any): void {
        const searchInput = container.querySelector('#inputSuperAdminSearchUsers') as HTMLInputElement | null;
        searchInput?.addEventListener('input', () => {
            parent.setSearchQuery(searchInput.value);
        });

        container.querySelector('#btnSuperAdminUsersRefresh')?.addEventListener('click', () => {
            parent.refreshAll();
        });

        // Bind cells events for each rendered row
        const rows = container.querySelectorAll('.user-row');
        rows.forEach(row => {
            const email = row.getAttribute('data-email');
            const user = ctx.users.find(u => u.email === email);
            if (user) {
                SuperAdminUsersComponent.getColumnPlugins().forEach(col => {
                    if (col.bindCellEvents) {
                        col.bindCellEvents(row as HTMLElement, user, parent);
                    }
                });
            }
        });
    }
}


// ==========================================================
// DEFAULT SUB-PLUGINS IMPLEMENTATIONS
// ==========================================================

// --- Header Plugins ---
class DefaultHeaderTitlePlugin implements SuperAdminHeaderPlugin {
    id = 'default-title';
    render(ctx: SuperAdminContext): string {
        return `
            <div style="margin-bottom: 25px;">
                <h4 style="color: var(--gold); text-shadow: 0 0 10px rgba(212,175,55,0.3); margin-top: 0;">🔑 SÚPER ADMINISTRADOR RULETA NEXO PREMIUM</h4>
                <p style="font-size: 0.75rem; color: #888; margin-bottom: 0;">Control total de licencias en la nube (Supabase) con activación en tiempo real y bloqueo remoto.</p>
            </div>
        `;
    }
}

// --- Generator Fields ---
class DefaultTierSelectField implements SuperAdminGeneratorFieldPlugin {
    id = 'tier-select';
    weight = 10;
    render(ctx: SuperAdminContext): string {
        return `
            <div>
                <label class="custom-label" style="font-size: 0.6rem; color: #aaa;">Nivel del Sistema</label>
                <select id="superAdminTier" class="input-pin" style="width: 100%; margin: 0; padding: 12px; text-align: left; font-size: 0.8rem; background: #0c0c0c; border: 1px solid #222; border-radius: 8px; color: #fff;">
                    <option value="LITE">Nivel 1: LITE (Esencial)</option>
                    <option value="PRO" selected>Nivel 2: PRO (Profesional)</option>
                    <option value="ENTERPRISE">Nivel 3: ENTERPRISE (Corporativo)</option>
                </select>
            </div>
        `;
    }
}

class DefaultDurationSelectField implements SuperAdminGeneratorFieldPlugin {
    id = 'duration-select';
    weight = 20;
    render(ctx: SuperAdminContext): string {
        return `
            <div>
                <label class="custom-label" style="font-size: 0.6rem; color: #aaa;">Periodo de Suscripción</label>
                <select id="superAdminDuration" class="input-pin" style="width: 100%; margin: 0; padding: 12px; text-align: left; font-size: 0.8rem; background: #0c0c0c; border: 1px solid #222; border-radius: 8px; color: #fff;">
                    <option value="30">30 Días (Mensual)</option>
                    <option value="90">90 Días (Trimestral)</option>
                    <option value="180">180 Días (Semestral)</option>
                    <option value="365" selected>365 Días (Anual Corporativo)</option>
                    <option value="1095">1095 Días (3 Años Platinum)</option>
                </select>
            </div>
        `;
    }
}

class DefaultEmailField implements SuperAdminGeneratorFieldPlugin {
    id = 'email-input';
    weight = 30;
    render(ctx: SuperAdminContext): string {
        return `
            <div>
                <label class="custom-label" style="font-size: 0.6rem; color: #aaa;">Correo del Cliente (Opcional - Vinculación de Seguridad)</label>
                <input type="email" id="superAdminEmail" class="input-pin" style="width: 100%; padding: 12px; font-size: 0.8rem; background: #0c0c0c; border: 1px solid #222; border-radius: 8px; color: #fff;" placeholder="cliente@correo.com (Dejar vacío para llave libre)">
                <span style="font-size: 0.55rem; color: #555; display: block; margin-top: 4px;">Si ingresas un correo, la licencia solo se podrá activar usando esa cuenta específica.</span>
            </div>
        `;
    }
}

// --- Generator Actions ---
class DefaultGenerateAction implements SuperAdminGeneratorActionPlugin {
    id = 'generate-btn';
    weight = 10;
    render(ctx: SuperAdminContext): string {
        return `<button id="btnSuperAdminGenerate" class="btn btn-primary" style="margin-top: 5px; font-weight: 900; font-size: 0.7rem; padding: 14px; letter-spacing: 1px;">REGISTRAR Y GUARDAR EN LA NUBE</button>`;
    }
    bindEvents(container: HTMLElement, parent: any): void {
        const btnGenerate = container.querySelector('#btnSuperAdminGenerate');
        btnGenerate?.addEventListener('click', async () => {
            const selectTier = container.querySelector('#superAdminTier') as HTMLSelectElement;
            const selectDuration = container.querySelector('#superAdminDuration') as HTMLSelectElement;
            const inputEmail = container.querySelector('#superAdminEmail') as HTMLInputElement;

            if (!selectTier || !selectDuration) return;
            const tier = selectTier.value;
            const durationDays = parseInt(selectDuration.value || "365");
            const associatedEmail = inputEmail ? inputEmail.value.trim().toLowerCase() : "";

            // Generate activation key
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let p1 = ''; let p2 = ''; let p3 = '';
            for (let i = 0; i < 4; i++) p1 += chars[Math.floor(Math.random() * chars.length)];
            for (let i = 0; i < 4; i++) p2 += chars[Math.floor(Math.random() * chars.length)];
            for (let i = 0; i < 4; i++) p3 += chars[Math.floor(Math.random() * chars.length)];
            const generatedKey = `NEXO-${tier}-${p1}-${p2}-${p3}`;

            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + durationDays);

            parent.showAlert("Registrando llave en el servidor en la nube...", "PROCESANDO");

            try {
                const { createLicenseInSupabase } = await import('../supabase');
                const res = await createLicenseInSupabase(generatedKey, tier, expiryDate.toISOString(), associatedEmail);
                if (res.success) {
                    parent.showAlert(`¡SISTEMA REGISTRADO CON ÉXITO!\n\nLlave: ${generatedKey}\nExpira: ${expiryDate.toLocaleDateString()}\nNivel: ${tier}`, "ÉXITO EN LA NUBE");
                    if (inputEmail) inputEmail.value = "";
                    parent.refreshAll();
                } else {
                    parent.showAlert(`Error al registrar en la nube: ${res.error}`, "ERROR EN BD");
                }
            } catch (err: any) {
                parent.showAlert(`Excepción de red: ${err?.message || String(err)}`, "ERROR");
            }
        });
    }
}

// --- Licenses Plugins ---
class DefaultLicensesHeaderPlugin implements SuperAdminLicensesHeaderPlugin {
    id = 'default-header';
    render(ctx: SuperAdminContext): string {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 8px;">
                <h5 style="color: var(--gold); font-size: 0.85rem; margin: 0; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Licencias Generadas</h5>
                <div style="display: flex; gap: 6px;">
                    <button id="btnSuperAdminExportLicenses" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.6rem; width: auto; margin: 0; min-height: unset; border: 1px solid rgba(212,175,55,0.2); color: var(--gold); font-weight: 800;">📥 EXPORTAR CSV</button>
                    <button id="btnSuperAdminRefresh" class="btn btn-secondary" style="padding: 6px 14px; font-size: 0.6rem; width: auto; margin: 0; min-height: unset; border: 1px solid rgba(255,255,255,0.1); font-weight: 800;">🔄 REFRESCAR</button>
                </div>
            </div>
        `;
    }
    bindEvents(container: HTMLElement, parent: any): void {
        container.querySelector('#btnSuperAdminRefresh')?.addEventListener('click', () => {
            parent.refreshAll();
        });

        container.querySelector('#btnSuperAdminExportLicenses')?.addEventListener('click', () => {
            if (typeof parent.exportLicensesToCSV === 'function') {
                parent.exportLicensesToCSV();
            }
        });
    }
}

class DefaultCopyLicenseAction implements SuperAdminLicenseActionPlugin {
    id = 'copy';
    weight = 10;
    render(lic: any, ctx: SuperAdminContext): string {
        // Handled by copy button in card top, but can return empty or auxiliary label
        return '';
    }
    bindEvents(cardElement: HTMLElement, lic: any, parent: any): void {
        const btn = cardElement.querySelector('.btn-copy-lic');
        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(lic.license_key).then(() => {
                parent.showAlert("Llave copiada al portapapeles:\n" + lic.license_key, "COPIADO");
            });
        });
    }
}

class DefaultToggleLicenseAction implements SuperAdminLicenseActionPlugin {
    id = 'toggle';
    weight = 20;
    render(lic: any, ctx: SuperAdminContext): string {
        return `
            <button class="btn ${lic.is_active ? 'btn-danger' : 'btn-primary'} btn-toggle-lic" style="flex: 1; padding: 8px; font-size: 0.6rem; min-height: unset; background: ${lic.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}; color: ${lic.is_active ? '#ef4444' : '#10b981'}; border: 1px solid ${lic.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}; font-weight: 900;">
                ${lic.is_active ? '🔴 BLOQUEAR ACCESO' : '🟢 HABILITAR ACCESO'}
            </button>
        `;
    }
    bindEvents(cardElement: HTMLElement, lic: any, parent: any): void {
        const btn = cardElement.querySelector('.btn-toggle-lic');
        btn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            parent.showAlert("Actualizando estado de llave en la nube...", "PROCESANDO");
            try {
                const { toggleLicenseInSupabase } = await import('../supabase');
                const res = await toggleLicenseInSupabase(lic.license_key, !lic.is_active);
                if (res.success) {
                    parent.showAlert(`La licencia ${lic.license_key} ha sido ${!lic.is_active ? 'ACTIVADA' : 'BLOQUEADA'} correctamente.`, "ÉXITO");
                    parent.refreshAll();
                } else {
                    parent.showAlert(`Error al actualizar estado: ${res.error}`, "ERROR");
                }
            } catch (err: any) {
                parent.showAlert(`Error de red: ${err?.message || String(err)}`, "ERROR");
            }
        });
    }
}

class DefaultDeleteLicenseAction implements SuperAdminLicenseActionPlugin {
    id = 'delete';
    weight = 30;
    render(lic: any, ctx: SuperAdminContext): string {
        return `
            <button class="btn btn-danger btn-delete-lic" style="padding: 8px 12px; font-size: 0.6rem; min-height: unset; width: auto; margin:0; font-weight: 900;">
                X
            </button>
        `;
    }
    bindEvents(cardElement: HTMLElement, lic: any, parent: any): void {
        const btn = cardElement.querySelector('.btn-delete-lic');
        btn?.addEventListener('click', (e) => {
            e.stopPropagation();
            parent.showConfirm(`¿ESTÁS ABSOLUTAMENTE SEGURO de eliminar la licencia ${lic.license_key} de por vida? Esta acción es irreversible y desconectará a su cliente de inmediato.`, async () => {
                parent.showAlert("Eliminando llave en la nube...", "PROCESANDO");
                try {
                    const { deleteLicenseFromSupabase } = await import('../supabase');
                    const res = await deleteLicenseFromSupabase(lic.license_key);
                    if (res.success) {
                        parent.showAlert("La licencia ha sido eliminada permanentemente.", "SISTEMA LIMPIO");
                        parent.refreshAll();
                    } else {
                        parent.showAlert(`Error al eliminar llave: ${res.error}`, "ERROR");
                    }
                } catch (err: any) {
                    parent.showAlert(`Error de red: ${err?.message || String(err)}`, "ERROR");
                }
            });
        });
    }
}

// --- Users Plugins ---
class DefaultTotalUsersStats implements SuperAdminUserStatsPlugin {
    id = 'total-users';
    weight = 10;
    render(ctx: SuperAdminContext): string {
        return `
            <div style="background: #060606; border: 1px solid #1a1a1a; padding: 10px 15px; border-radius: 10px; text-align: center;">
                <div style="font-size: 0.55rem; color: #666; font-weight: 900; text-transform: uppercase;">Total Cuentas</div>
                <div style="font-size: 1.2rem; font-weight: 900; color: #fff; margin-top: 5px;">${ctx.stats.totalUsers}</div>
            </div>
        `;
    }
}

class DefaultActiveLicensesStats implements SuperAdminUserStatsPlugin {
    id = 'active-licenses';
    weight = 20;
    render(ctx: SuperAdminContext): string {
        return `
            <div style="background: #060606; border: 1px solid #10b98122; padding: 10px 15px; border-radius: 10px; text-align: center;">
                <div style="font-size: 0.55rem; color: #10b981; font-weight: 900; text-transform: uppercase;">Licencia Activa</div>
                <div style="font-size: 1.2rem; font-weight: 900; color: #10b981; margin-top: 5px;">${ctx.stats.activeLicenses}</div>
            </div>
        `;
    }
}

class DefaultNoLicenseStats implements SuperAdminUserStatsPlugin {
    id = 'no-license';
    weight = 30;
    render(ctx: SuperAdminContext): string {
        return `
            <div style="background: #060606; border: 1px solid #ef444422; padding: 10px 15px; border-radius: 10px; text-align: center;">
                <div style="font-size: 0.55rem; color: #ef4444; font-weight: 900; text-transform: uppercase;">Sin Licencia / Exp.</div>
                <div style="font-size: 1.2rem; font-weight: 900; color: #ef4444; margin-top: 5px;">${ctx.stats.noLicense}</div>
            </div>
        `;
    }
}

// User Column Plugins
class UserEmailColumn implements SuperAdminUserColumnPlugin {
    id = 'email';
    weight = 10;
    headerName = 'Usuario / Correo';
    renderCell(user: any, ctx: SuperAdminContext): string {
        const signupDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
        return `
            <div style="font-weight: bold; color: #fff;">${user.email}</div>
            <div style="font-size: 0.55rem; color: #555;">Registrado: ${signupDate}</div>
        `;
    }
}

class CompanyColumn implements SuperAdminUserColumnPlugin {
    id = 'company';
    weight = 20;
    headerName = 'Empresa';
    renderCell(user: any, ctx: SuperAdminContext): string {
        return user.company || 'Sin Empresa';
    }
}

class AccountStatusColumn implements SuperAdminUserColumnPlugin {
    id = 'account-status';
    weight = 30;
    headerName = 'Estado Cuenta';
    renderCell(user: any, ctx: SuperAdminContext): string {
        return `<span style="font-size: 0.55rem; font-weight: 900; background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); padding: 2px 6px; border-radius: 4px;">ACTIVA</span>`;
    }
}

class LinkedLicenseColumn implements SuperAdminUserColumnPlugin {
    id = 'license-key';
    weight = 40;
    headerName = 'Licencia Vinculada';
    renderCell(user: any, ctx: SuperAdminContext): string {
        const userLics = ctx.licenses.filter(l => l.associated_email && l.associated_email.toLowerCase() === user.email.toLowerCase());
        userLics.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime());
        const activeLic = userLics.find(l => l.is_active && new Date(l.expiry_date) >= new Date());
        const latestLic = activeLic || userLics[0];

        if (latestLic) {
            const startStr = latestLic.activated_at 
                ? new Date(latestLic.activated_at).toLocaleDateString() 
                : (latestLic.created_at ? new Date(latestLic.created_at).toLocaleDateString() : 'Pendiente');
            const expiryStr = new Date(latestLic.expiry_date).toLocaleDateString();

            return `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="font-family: monospace; font-weight:900; color:#fff; display:flex; align-items:center; gap:5px;">
                        <span>${latestLic.license_key}</span>
                        <span style="cursor:pointer; color:var(--gold); font-size:0.6rem;" class="span-copy-user-lic" data-key="${latestLic.license_key}">📋 COPIAR</span>
                    </div>
                    <div style="font-size:0.55rem; color:#666;">
                        Activación: <span style="color:#aaa;">${startStr}</span> | Expiración: <span style="color:#aaa;">${expiryStr}</span>
                    </div>
                </div>
            `;
        }
        return `<span style="color: #666; font-style: italic;">Sin licencia asociada</span>`;
    }
    bindCellEvents(rowElement: HTMLElement, user: any, parent: any): void {
        const copySpan = rowElement.querySelector('.span-copy-user-lic');
        copySpan?.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = copySpan.getAttribute('data-key');
            if (key) {
                navigator.clipboard.writeText(key).then(() => {
                    parent.showAlert("Llave copiada al portapapeles:\n" + key, "COPIADO");
                });
            }
        });
    }
}

class PlanTierColumn implements SuperAdminUserColumnPlugin {
    id = 'tier';
    weight = 50;
    headerName = 'Nivel / Plan';
    renderCell(user: any, ctx: SuperAdminContext): string {
        const userLics = ctx.licenses.filter(l => l.associated_email && l.associated_email.toLowerCase() === user.email.toLowerCase());
        userLics.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime());
        const activeLic = userLics.find(l => l.is_active && new Date(l.expiry_date) >= new Date());
        const latestLic = activeLic || userLics[0];

        if (latestLic) {
            return `<span style="font-size: 0.55rem; font-weight: 900; background: ${latestLic.tier === 'ENTERPRISE' ? '#9333ea' : (latestLic.tier === 'PRO' ? '#3b82f6' : '#64748b')}; color: #fff; padding: 2px 6px; border-radius: 4px;">${latestLic.tier}</span>`;
        }
        return `<span style="color: #444;">-</span>`;
    }
}

class RemainingDaysColumn implements SuperAdminUserColumnPlugin {
    id = 'days-left';
    weight = 60;
    headerName = 'Días Restantes';
    renderCell(user: any, ctx: SuperAdminContext): string {
        const userLics = ctx.licenses.filter(l => l.associated_email && l.associated_email.toLowerCase() === user.email.toLowerCase());
        userLics.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime());
        const activeLic = userLics.find(l => l.is_active && new Date(l.expiry_date) >= new Date());
        const latestLic = activeLic || userLics[0];

        if (latestLic) {
            const isExpired = new Date(latestLic.expiry_date) < new Date();
            let diffDays = 0;
            if (!isExpired) {
                const diffTime = new Date(latestLic.expiry_date).getTime() - Date.now();
                diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                const diffTime = Date.now() - new Date(latestLic.expiry_date).getTime();
                diffDays = -Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }

            if (isExpired) {
                return `<span style="color:#ea580c; font-weight:bold;">EXPIRADA (${Math.abs(diffDays)}d)</span>`;
            }
            return `<span style="color:#10b981; font-weight:bold;">${diffDays} días restantes</span>`;
        }
        return `<span style="color: #ef4444; font-weight: bold;">0 días (Inactivo)</span>`;
    }
}

class ControlActionsColumn implements SuperAdminUserColumnPlugin {
    id = 'actions';
    weight = 70;
    headerName = 'Acción de Control';
    renderCell(user: any, ctx: SuperAdminContext): string {
        const userLics = ctx.licenses.filter(l => l.associated_email && l.associated_email.toLowerCase() === user.email.toLowerCase());
        userLics.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime());
        const activeLic = userLics.find(l => l.is_active && new Date(l.expiry_date) >= new Date());
        const latestLic = activeLic || userLics[0];

        if (latestLic) {
            return `
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn btn-secondary btn-toggle-user-lic" data-key="${latestLic.license_key}" data-active="${latestLic.is_active}" style="padding: 4px 8px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; border: 1px solid ${latestLic.is_active ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}; color: ${latestLic.is_active ? '#ef4444' : '#10b981'}; background: ${latestLic.is_active ? 'rgba(239,68,68,0.05)' : 'rgba(16,185,129,0.05)'}; font-weight:900;">
                        ${latestLic.is_active ? 'BLOQUEAR' : 'HABILITAR'}
                    </button>
                    <button class="btn btn-danger btn-delete-user-lic" data-key="${latestLic.license_key}" style="padding: 4px 8px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; font-weight: 900;">
                        ELIMINAR
                    </button>
                </div>
            `;
        }
        return `
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button class="btn btn-primary btn-quick-lic" data-email="${user.email}" style="padding: 4px 8px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; background: rgba(212,175,55,0.1); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); font-weight:900;">
                    ⚡ CREAR PRO 1 AÑO
                </button>
                <button class="btn btn-secondary btn-prep-lic" data-email="${user.email}" style="padding: 4px 8px; font-size: 0.55rem; width: auto; margin: 0; min-height: unset; font-weight:900; border:1px solid #222;">
                    VINCULAR...
                </button>
            </div>
        `;
    }
    bindCellEvents(rowElement: HTMLElement, user: any, parent: any): void {
        const toggleBtn = rowElement.querySelector('.btn-toggle-user-lic');
        toggleBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const key = toggleBtn.getAttribute('data-key');
            const is_active = toggleBtn.getAttribute('data-active') === 'true';
            if (key) {
                parent.showAlert("Actualizando estado de llave...", "PROCESANDO");
                try {
                    const { toggleLicenseInSupabase } = await import('../supabase');
                    const res = await toggleLicenseInSupabase(key, !is_active);
                    if (res.success) {
                        parent.showAlert(`La licencia ${key} ha sido ${!is_active ? 'ACTIVADA' : 'BLOQUEADA'} correctamente.`, "ÉXITO");
                        parent.refreshAll();
                    } else {
                        parent.showAlert(`Error al actualizar estado: ${res.error}`, "ERROR");
                    }
                } catch (err: any) {
                    parent.showAlert(`Error: ${err?.message}`, "ERROR");
                }
            }
        });

        const deleteBtn = rowElement.querySelector('.btn-delete-user-lic');
        deleteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = deleteBtn.getAttribute('data-key');
            if (key) {
                parent.showConfirm(`¿Seguro que deseas eliminar permanentemente la licencia ${key}?`, async () => {
                    parent.showAlert("Eliminando llave...", "PROCESANDO");
                    try {
                        const { deleteLicenseFromSupabase } = await import('../supabase');
                        const res = await deleteLicenseFromSupabase(key);
                        if (res.success) {
                            parent.showAlert("La licencia ha sido eliminada.", "ÉXITO");
                            parent.refreshAll();
                        } else {
                            parent.showAlert(`Error: ${res.error}`, "ERROR");
                        }
                    } catch (err: any) {
                        parent.showAlert(`Error: ${err?.message}`, "ERROR");
                    }
                });
            }
        });

        const quickBtn = rowElement.querySelector('.btn-quick-lic');
        quickBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            parent.showConfirm(`¿Deseas generar y vincular una licencia PRO de 365 días para el usuario ${user.email} de forma automática?`, async () => {
                parent.showAlert("Generando licencia...", "PROCESANDO");
                
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let p1 = ''; let p2 = ''; let p3 = '';
                for (let i = 0; i < 4; i++) p1 += chars[Math.floor(Math.random() * chars.length)];
                for (let i = 0; i < 4; i++) p2 += chars[Math.floor(Math.random() * chars.length)];
                for (let i = 0; i < 4; i++) p3 += chars[Math.floor(Math.random() * chars.length)];
                const generatedKey = `NEXO-${"PRO"}-${p1}-${p2}-${p3}`;
                
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 365);
                
                try {
                    const { createLicenseInSupabase } = await import('../supabase');
                    const res = await createLicenseInSupabase(generatedKey, "PRO", expiryDate.toISOString(), user.email);
                    if (res.success) {
                        parent.showAlert(`¡Licencia PRO anual vinculada con éxito!\n\nLlave: ${generatedKey}\nCliente: ${user.email}\nExpira: ${expiryDate.toLocaleDateString()}`, "VINCULADO");
                        parent.refreshAll();
                    } else {
                        parent.showAlert(`Error: ${res.error}`, "ERROR");
                    }
                } catch (err: any) {
                    parent.showAlert(`Error: ${err?.message}`, "ERROR");
                }
            });
        });

        const prepBtn = rowElement.querySelector('.btn-prep-lic');
        prepBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const emailInput = document.getElementById('superAdminEmail') as HTMLInputElement | null;
            if (emailInput) {
                emailInput.value = user.email;
                emailInput.style.border = "2px solid var(--gold)";
                emailInput.style.boxShadow = "0 0 10px rgba(212,175,55,0.4)";
                setTimeout(() => {
                    emailInput.style.border = "1px solid #222";
                    emailInput.style.boxShadow = "none";
                }, 3000);
                
                const selectTier = document.getElementById('superAdminTier') as HTMLSelectElement | null;
                if (selectTier) selectTier.value = "PRO";
                
                emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                parent.showAlert(`Se ha pre-completado el correo del usuario: ${user.email}. Selecciona el plan y periodo en el panel superior para generar su llave de activación de manera personalizada.`, "LISTO");
            }
        });
    }
}

// ==========================================================
// REGISTRATION OF DEFAULT MODULES AND SUB-PLUGINS
// ==========================================================

// Register Header Component and its default sub-plugins
SuperAdminHeaderComponent.registerPlugin(new DefaultHeaderTitlePlugin());
SuperAdminRegistry.register(new SuperAdminHeaderComponent());

// Register Generator Component and its default sub-plugins
SuperAdminGeneratorComponent.registerField(new DefaultTierSelectField());
SuperAdminGeneratorComponent.registerField(new DefaultDurationSelectField());
SuperAdminGeneratorComponent.registerField(new DefaultEmailField());
SuperAdminGeneratorComponent.registerAction(new DefaultGenerateAction());
SuperAdminRegistry.register(new SuperAdminGeneratorComponent());

// Register Licenses Component and its default sub-plugins
SuperAdminLicensesComponent.registerHeader(new DefaultLicensesHeaderPlugin());
SuperAdminLicensesComponent.registerActionPlugin(new DefaultCopyLicenseAction());
SuperAdminLicensesComponent.registerActionPlugin(new DefaultToggleLicenseAction());
SuperAdminLicensesComponent.registerActionPlugin(new DefaultDeleteLicenseAction());
SuperAdminRegistry.register(new SuperAdminLicensesComponent());

// Register Users Component and its default sub-plugins
SuperAdminUsersComponent.registerStatsPlugin(new DefaultTotalUsersStats());
SuperAdminUsersComponent.registerStatsPlugin(new DefaultActiveLicensesStats());
SuperAdminUsersComponent.registerStatsPlugin(new DefaultNoLicenseStats());

SuperAdminUsersComponent.registerColumnPlugin(new UserEmailColumn());
SuperAdminUsersComponent.registerColumnPlugin(new CompanyColumn());
SuperAdminUsersComponent.registerColumnPlugin(new AccountStatusColumn());
SuperAdminUsersComponent.registerColumnPlugin(new LinkedLicenseColumn());
SuperAdminUsersComponent.registerColumnPlugin(new PlanTierColumn());
SuperAdminUsersComponent.registerColumnPlugin(new RemainingDaysColumn());
SuperAdminUsersComponent.registerColumnPlugin(new ControlActionsColumn());
SuperAdminRegistry.register(new SuperAdminUsersComponent());
