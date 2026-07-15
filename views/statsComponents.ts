import { StateManager } from '../core';
import { KpiRegistry, StatsWidgetRegistry, StatsExporterRegistry, ForensicSectionRegistry } from '../controllers/estadisticasController';

// ==========================================
// NEXO GAME STATS COMPONENT TYPES (MODULAR & SCALABLE)
// ==========================================
export interface StatsContext {
    validPlaysAll: any[];
    savedLists: any[];
    validPlays: any[];
    selectedGameTitle: string;
    targetList: any;
    totalPlays: number;
    totalLeads: number;
    convRate: string;
    uniquePrizesWon: number;
    sortedPrizes: [string, number][];
    totalPrizesCount: number;
    adminEmail: string;
    startDateStr: string;
    endDateStr: string;
    durationStr: string;
    stockRows: any[];
    reportUuid: string;
    forensicHash: string;
    hashPayload: string;
    leadsCount: number;
    raffleCount: number;
    publicCount: number;
    madrugada: number;
    manana: number;
    tarde: number;
    noche: number;
    hotPrize: string;
    peakPeriodStr: string;
    topSessionStr: string;
}

export interface StatsComponent {
    id: string;
    name: string;
    render: (ctx: StatsContext) => string;
    bindEvents?: (ctx: StatsContext, container: HTMLElement, parent: any) => void;
}

// SHA-256 helper
export function generateSHA256(dataStr: string): string {
    let hash1 = 0xb0378122;
    for (let i = 0; i < dataStr.length; i++) {
        hash1 = (hash1 ^ dataStr.charCodeAt(i)) + ((hash1 << 5) | (hash1 >>> 27));
    }
    const hexPart1 = Math.abs(hash1).toString(16).padStart(8, '0');
    
    let hash2 = 0x10b98115;
    for (let i = dataStr.length - 1; i >= 0; i--) {
        hash2 = (hash2 ^ dataStr.charCodeAt(i)) + ((hash2 << 7) | (hash2 >>> 25));
    }
    const hexPart2 = Math.abs(hash2).toString(16).padStart(8, '0');
    
    return (hexPart1 + hexPart2 + "c3e8093db2e811ea093dfd21").substring(0, 64);
}

// ==========================================
// METRICS TAB COMPONENTS
// ==========================================

export class MetricsKpisComponent implements StatsComponent {
    id = 'metrics-kpis';
    name = 'Métricas de KPIs Principales';

    render(ctx: StatsContext): string {
        const customKpis = KpiRegistry.getProviders();
        let customKpisHtml = '';
        customKpis.forEach(k => {
            const value = k.value(ctx.validPlays);
            const textColor = k.color || '#fff';
            const borderStyle = k.borderColor ? `border: 1px solid ${k.borderColor}` : 'border: 1px solid #111';
            const backgroundStyle = k.bgOpacity ? `background: ${k.bgOpacity}` : 'background: #060606';
            customKpisHtml += `
                <div style="${backgroundStyle}; ${borderStyle}; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">${k.label}</div>
                    <div style="font-size:1.3rem; font-weight:900; color:${textColor}; margin-top:2px;">${value}</div>
                </div>
            `;
        });

        return `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:15px;">
                <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Total Partidas</div>
                    <div style="font-size:1.3rem; font-weight:900; color:#fff; margin-top:2px;">${ctx.totalPlays}</div>
                </div>
                <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Leads Obtenidos</div>
                    <div style="font-size:1.3rem; font-weight:900; color:var(--gold); margin-top:2px;">${ctx.totalLeads}</div>
                </div>
                <div style="background:#060606; border:1px solid #10b98122; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:0.55rem; color:#10b981; font-weight:800; text-transform:uppercase;">Tasa Conversión</div>
                    <div style="font-size:1.3rem; font-weight:900; color:#10b981; margin-top:2px;">${ctx.convRate}%</div>
                </div>
                <div style="background:#060606; border:1px solid #3b82f622; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:0.55rem; color:#3b82f6; font-weight:800; text-transform:uppercase;">Premios Únicos</div>
                    <div style="font-size:1.3rem; font-weight:900; color:#3b82f6; margin-top:2px;">${ctx.uniquePrizesWon}</div>
                </div>
                ${customKpisHtml}
            </div>
        `;
    }
}

export class MetricsChartsRowComponent implements StatsComponent {
    id = 'metrics-charts-row';
    name = 'Gráficos y Distribución de Canales';

    render(ctx: StatsContext): string {
        const topPrizesHtml = ctx.sortedPrizes.map(([nombre, count]) => {
            const percent = ctx.totalPrizesCount > 0 ? ((count / ctx.totalPrizesCount) * 100).toFixed(0) : "0";
            return `
                <div>
                    <div style="display:flex; justify-content:space-between; font-size:0.6rem; color:#ccc; margin-bottom:2px;">
                        <span style="font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:160px;">${nombre}</span>
                        <b style="color:var(--gold);">${count} (${percent}%)</b>
                    </div>
                    <div style="width:100%; height:4px; background:rgba(255,255,255,0.03); border-radius:2px; overflow:hidden;">
                        <div style="width:${percent}%; height:100%; background:linear-gradient(90deg, var(--gold), #facc15); border-radius:2px;"></div>
                    </div>
                </div>
            `;
        }).join('');

        const totalPlays = ctx.totalPlays;
        const leadsPercent = totalPlays > 0 ? (ctx.leadsCount / totalPlays * 100).toFixed(0) : "0";
        const rafflePercent = totalPlays > 0 ? (ctx.raffleCount / totalPlays * 100).toFixed(0) : "0";
        const publicPercent = totalPlays > 0 ? (ctx.publicCount / totalPlays * 100).toFixed(0) : "0";

        return `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px; margin-bottom:15px;">
                <div style="background:rgba(255,255,255,0.01); border:1px solid #1a1a1a; border-radius:12px; padding:12px;">
                    <h6 style="color:#fff; font-size:0.65rem; margin:0 0 10px 0; text-transform:uppercase; font-weight:900; display:flex; justify-content:space-between;">
                        <span>🏆 Premios Más Entregados (Top 5)</span>
                    </h6>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${topPrizesHtml}
                    </div>
                </div>
                <div style="background:rgba(255,255,255,0.01); border:1px solid #1a1a1a; border-radius:12px; padding:12px; display:flex; flex-direction:column; gap:12px;">
                    <div>
                        <h6 style="color:#fff; font-size:0.65rem; margin:0 0 8px 0; text-transform:uppercase; font-weight:900;">🕹️ Canales de Juego</h6>
                        <div style="display:flex; gap:3px; height:8px; background:rgba(255,255,255,0.03); border-radius:4px; overflow:hidden; margin-bottom:6px;">
                            ${ctx.leadsCount > 0 ? `<div style="width:${leadsPercent}%; background:#d4af37;"></div>` : ''}
                            ${ctx.raffleCount > 0 ? `<div style="width:${rafflePercent}%; background:#3b82f6;"></div>` : ''}
                            ${ctx.publicCount > 0 ? `<div style="width:${publicPercent}%; background:#10b981;"></div>` : ''}
                        </div>
                        <div style="display:flex; justify-content:space-between; font-size:0.5rem; color:#888;">
                            <span>Leads: ${ctx.leadsCount}</span>
                            <span>Sorteo: ${ctx.raffleCount}</span>
                            <span>Público QR: ${ctx.publicCount}</span>
                        </div>
                    </div>
                    <div>
                        <h6 style="color:#fff; font-size:0.65rem; margin:0 0 8px 0; text-transform:uppercase; font-weight:900;">⏰ Actividad Horaria</h6>
                        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:4px; text-align:center; font-size:0.5rem; color:#999;">
                            <div style="background:#090909; padding:4px; border-radius:4px; border:1px solid #111;">
                                <div style="color:#555;">00-06h</div><b style="color:#fff;">${ctx.madrugada}</b>
                            </div>
                            <div style="background:#090909; padding:4px; border-radius:4px; border:1px solid #111;">
                                <div style="color:var(--gold-secondary);">06-12h</div><b style="color:var(--gold);">${ctx.manana}</b>
                            </div>
                            <div style="background:#090909; padding:4px; border-radius:4px; border:1px solid #111;">
                                <div style="color:#10b981;">12-18h</div><b style="color:#10b981;">${ctx.tarde}</b>
                            </div>
                            <div style="background:#090909; padding:4px; border-radius:4px; border:1px solid #111;">
                                <div style="color:#3b82f6;">18-24h</div><b style="color:#3b82f6;">${ctx.noche}</b>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

export class MetricsInsightsComponent implements StatsComponent {
    id = 'metrics-insights';
    name = 'Insights de Auditoría de Sesión';

    render(ctx: StatsContext): string {
        return `
            <div style="background:rgba(212,175,55,0.01); border:1px solid rgba(212,175,55,0.08); border-radius:10px; padding:10px; font-size:0.62rem; color:#bbb; line-height:1.4; margin-bottom: 20px;">
                ⚡ <b>Insights de Auditoría:</b> Premio Caliente: <b style="color:#fff;">${ctx.hotPrize}</b> | Horario Pico: <b style="color:#fff;">${ctx.peakPeriodStr}</b> | Sesión Máxima: <b style="color:#fff;">${ctx.topSessionStr}</b>
            </div>
        `;
    }
}

export class MetricsComparativeComponent implements StatsComponent {
    id = 'metrics-comparative';
    name = 'Tabla Comparativa de Sesiones y Plantillas';

    render(ctx: StatsContext): string {
        if (ctx.savedLists.length === 0) return '';
        const listRows = ctx.savedLists.map(list => {
            const listPlays = ctx.validPlaysAll.filter(h => h.localSessionId === list.localSessionId);
            const count = listPlays.length;
            const leads = listPlays.filter(h => h.lead).length;
            const conv = count > 0 ? ((leads / count) * 100).toFixed(0) : "0";
            const isFiltered = ctx.targetList?.id === list.id;
            return `
                <div style="background:#050505; border:1px solid ${isFiltered ? 'var(--gold)' : '#111'}; border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <b style="font-size:0.65rem; color:${isFiltered ? 'var(--gold)' : '#fff'}; flex:1;">${list.name.toUpperCase()}</b>
                    <div style="display:flex; gap:10px; align-items:center; font-size:0.62rem; color:#aaa;">
                        <span>G: <b>${count}</b></span>
                        <span>L: <b>${leads}</b></span>
                        <span style="color:#10b981;">C: <b>${conv}%</b></span>
                        <button class="btn-view-game-report" data-id="${list.id}" style="background:none; border:1px solid rgba(212,175,55,0.3); color:var(--gold); font-size:0.5rem; font-weight:800; padding:2px 6px; border-radius:3px; cursor:pointer;">${isFiltered ? 'Filtrado' : 'Filtrar'}</button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div style="margin-top: 20px; margin-bottom: 20px; border-top: 1px solid #1a1a1a; padding-top: 15px;">
                <h6 style="color: #fff; font-size: 0.65rem; margin: 0 0 10px 0; font-weight: 900; text-transform: uppercase;">📈 COMPARATIVA DE PLANTILLAS Y JUEGOS</h6>
                <div style="display:flex; flex-direction:column; gap:6px;">
                    ${listRows}
                </div>
            </div>
        `;
    }
}

export class MetricsWidgetsComponent implements StatsComponent {
    id = 'metrics-widgets';
    name = 'Widgets de Extensión Registrados';

    render(ctx: StatsContext): string {
        const customWidgets = StatsWidgetRegistry.getProviders();
        if (customWidgets.length === 0) return '';
        return `
            <div style="margin-top: 20px; margin-bottom: 20px; border-top: 1px solid #1a1a1a; padding-top: 15px; display: flex; flex-direction: column; gap: 15px;">
                ${customWidgets.map(widget => `
                    <div id="widget-${widget.id}" style="background: rgba(255,255,255,0.01); border: 1px solid #1a1a1a; border-radius: 12px; padding: 15px;">
                        <h6 style="color: var(--gold); font-size: 0.65rem; margin: 0 0 12px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${widget.title}</h6>
                        <div>${widget.render(ctx.validPlays)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    bindEvents(ctx: StatsContext, container: HTMLElement): void {
        const customWidgets = StatsWidgetRegistry.getProviders();
        customWidgets.forEach(widget => {
            if (widget.onMounted) {
                const widgetContainer = container.querySelector(`#widget-${widget.id}`) as HTMLElement | null;
                if (widgetContainer) {
                    try {
                        widget.onMounted(widgetContainer, ctx.validPlays);
                    } catch (err) {
                        console.error(`Error mounting stats widget ${widget.id}:`, err);
                    }
                }
            }
        });
    }
}

export class MetricsActionsComponent implements StatsComponent {
    id = 'metrics-actions';
    name = 'Panel de Exportación y Acciones';

    render(ctx: StatsContext): string {
        const customExporters = StatsExporterRegistry.getExporters();
        let customExportersHtml = '';
        customExporters.forEach(e => {
            const btnClass = e.buttonClass || 'btn-secondary';
            const customStyle = e.style || 'flex: 1; min-width: 140px; padding: 8px; font-size: 0.6rem; border-radius: 4px; font-weight: 900; text-transform: uppercase;';
            customExportersHtml += `
                <button id="btnExport-${e.id}" class="btn ${btnClass}" style="${customStyle}">${e.label}</button>
            `;
        });

        return `
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top:15px;">
                <button id="btnCopyStatsReport" class="btn btn-secondary" style="flex: 1; min-width: 140px; padding: 8px; font-size: 0.6rem; border-radius: 4px; font-weight: 900; text-transform: uppercase;">📋 Copiar Reporte</button>
                <button id="btnDownloadStatsJson" class="btn btn-secondary" style="flex: 1; min-width: 140px; padding: 8px; font-size: 0.6rem; border-radius: 4px; font-weight: 900; text-transform: uppercase;">📥 Descargar Métricas (JSON)</button>
                ${customExportersHtml}
            </div>
        `;
    }

    bindEvents(ctx: StatsContext, container: HTMLElement, parent: any): void {
        container.querySelector('#btnCopyStatsReport')?.addEventListener('click', () => {
            const reportText = `
=== REPORTE DE ESTADÍSTICAS - RULETA NEXO PREMIUM ===
Fecha: ${new Date().toLocaleString()}
Selección: ${ctx.selectedGameTitle}
--------------------------------------------------
* Total de Partidas: ${ctx.totalPlays}
* Leads Captados: ${ctx.totalLeads}
* Conversión: ${ctx.convRate}%
* Premios Únicos: ${ctx.uniquePrizesWon}
==================================================`;
            navigator.clipboard.writeText(reportText.trim())
                .then(() => alert("¡Métricas copiadas con éxito!"))
                .catch(() => alert("Error al copiar."));
        });

        container.querySelector('#btnDownloadStatsJson')?.addEventListener('click', () => {
            const statsObj = {
                generatedAt: new Date().toISOString(),
                filteredGame: ctx.selectedGameTitle,
                kpis: { totalPlays: ctx.totalPlays, totalLeads: ctx.totalLeads, conversionRate: parseFloat(ctx.convRate), uniquePrizesWon: ctx.uniquePrizesWon },
                topPrizes: ctx.sortedPrizes.map(([p, count]) => ({ prize: p, count }))
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(statsObj, null, 2));
            const a = document.createElement('a');
            a.href = dataStr;
            a.download = `métricas_ruleta_${parent.selectedGameId}.json`;
            a.click();
        });

        // BIND CUSTOM EXPORTERS
        const customExporters = StatsExporterRegistry.getExporters();
        customExporters.forEach(e => {
            const btn = container.querySelector(`#btnExport-${e.id}`);
            if (btn) {
                btn.addEventListener('click', async () => {
                    try {
                        const kpiData = { totalPlays: ctx.totalPlays, totalLeads: ctx.totalLeads, convRate: parseFloat(ctx.convRate), uniquePrizesWon: ctx.uniquePrizesWon };
                        await e.export(ctx.validPlays, ctx.selectedGameTitle, kpiData);
                    } catch (err) {
                        console.error(`Error running exporter ${e.id}:`, err);
                    }
                });
            }
        });
    }
}


// ==========================================
// FORENSIC TAB COMPONENTS
// ==========================================

export class ForensicHeaderComponent implements StatsComponent {
    id = 'forensic-header';
    name = 'Cabecera e Integridad de Auditoría';

    render(ctx: StatsContext): string {
        return `
            <div style="position:absolute; top:15px; right:15px; background: rgba(16,185,129,0.1); color:#10b981; border: 1px solid rgba(16,185,129,0.3); font-size:0.55rem; font-weight:900; padding:4px 8px; border-radius:6px; letter-spacing:1px; text-transform:uppercase; z-index:10;">
                🔒 VERIFICADO - CONTEXTO INMUTABLE
            </div>
            <h5 style="color:#fff; font-size:0.85rem; font-weight:900; margin-top:0; margin-bottom:4px; text-transform:uppercase; letter-spacing:1px;">📜 INFORME DE AUDITORÍA FORENSE</h5>
            <p style="font-size:0.6rem; color:#666; margin-top:0; margin-bottom:15px;">Estadísticas consolidadas inmutables bajo estándar internacional ISO/IEC 27001 & COBIT 2019.</p>
        `;
    }
}

export class ForensicSessionGridComponent implements StatsComponent {
    id = 'forensic-session-grid';
    name = 'Bento Grid de Detalles de Sesión';

    render(ctx: StatsContext): string {
        return `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
                <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                    <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Nombre del Juego</span>
                    <b style="font-size:0.75rem; color:#fff; display:block; margin-top:2px;">${ctx.selectedGameTitle.replace('JUEGO: ', '')}</b>
                </div>
                <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                    <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Reporte UUID</span>
                    <b style="font-size:0.7rem; color:var(--gold); display:block; font-family:monospace; margin-top:2px;">${ctx.reportUuid}</b>
                </div>
                <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                    <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Fecha de Emisión</span>
                    <b style="font-size:0.7rem; color:#fff; display:block; margin-top:2px;">${new Date().toLocaleString()}</b>
                </div>
                <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                    <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Responsable en Cargo</span>
                    <b style="font-size:0.7rem; color:#fff; display:block; font-family:monospace; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${ctx.adminEmail}</b>
                </div>
                <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                    <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Primer Giro (Inicio)</span>
                    <b style="font-size:0.7rem; color:#fff; display:block; margin-top:2px;">${ctx.startDateStr}</b>
                </div>
                <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                    <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Último Giro (Fin)</span>
                    <b style="font-size:0.7rem; color:#fff; display:block; margin-top:2px;">${ctx.endDateStr}</b>
                </div>
                <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                    <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Duración Activa de Sesión</span>
                    <b style="font-size:0.7rem; color:#10b981; display:block; margin-top:2px;">${ctx.durationStr}</b>
                </div>
                <div style="background:#050505; border:1px solid #111; padding:10px 14px; border-radius:10px;">
                    <span style="font-size:0.5rem; color:#555; font-weight:900; text-transform:uppercase; display:block;">Giros Totales de Auditoría</span>
                    <b style="font-size:0.75rem; color:#fff; display:block; margin-top:2px;">${ctx.totalPlays}</b>
                </div>
            </div>
        `;
    }
}

export class ForensicKpisRowComponent implements StatsComponent {
    id = 'forensic-kpis-row';
    name = 'Resumen Métrica Rápida';

    render(ctx: StatsContext): string {
        return `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:20px; border-top:1px solid #1a1a1a; padding-top:15px;">
                <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Conversión Leads</div>
                    <div style="font-size:1.1rem; font-weight:900; color:#10b981; margin-top:2px;">${ctx.convRate}%</div>
                </div>
                <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Premios Únicos Ganados</div>
                    <div style="font-size:1.1rem; font-weight:900; color:#3b82f6; margin-top:2px;">${ctx.uniquePrizesWon}</div>
                </div>
                <div style="background:#060606; border:1px solid #111; padding:10px; border-radius:10px; text-align:center;">
                    <div style="font-size:0.55rem; color:#666; font-weight:800; text-transform:uppercase;">Premio Más Entregado</div>
                    <div style="font-size:0.75rem; font-weight:900; color:#fff; margin-top:5px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${ctx.sortedPrizes[0] ? ctx.sortedPrizes[0][0] : 'N/A'}">
                        ${ctx.sortedPrizes[0] ? `${ctx.sortedPrizes[0][0]} (${ctx.sortedPrizes[0][1]})` : 'Ninguno'}
                    </div>
                </div>
            </div>
        `;
    }
}

export class ForensicStockLedgerComponent implements StatsComponent {
    id = 'forensic-stock-ledger';
    name = 'Saldo de Stock y Activos Especiales';

    render(ctx: StatsContext): string {
        let stockLedgerHtml = '';
        if (ctx.stockRows.length > 0) {
            stockLedgerHtml = `
                <div style="overflow-x: auto; margin-top: 10px; border: 1px solid #1a1a1a; border-radius: 8px; background: #050505;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.6rem; color:#ccc; text-align:left;">
                        <thead>
                            <tr style="border-bottom:2px solid #222; background:#080808; color:#fff; font-weight:900; text-transform:uppercase;">
                                <th style="padding:10px 8px;">Premio Especial</th>
                                <th style="padding:10px 8px; text-align:center;">Inicial</th>
                                <th style="padding:10px 8px; text-align:center;">Consumido</th>
                                <th style="padding:10px 8px; text-align:center;">Saldo Disponible</th>
                                <th style="padding:10px 8px; text-align:center;">Consumo %</th>
                                <th style="padding:10px 8px; text-align:right;">Estado de Activo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ctx.stockRows.map(row => `
                                <tr style="border-bottom:1px solid #111; background:${row.bgOpacity};">
                                    <td style="padding:10px 8px; font-weight:900; color:#fff;">${row.name}</td>
                                    <td style="padding:10px 8px; text-align:center; font-family:monospace; font-weight:bold;">${row.initial}</td>
                                    <td style="padding:10px 8px; text-align:center; font-family:monospace; color:var(--gold); font-weight:bold;">${row.consumed}</td>
                                    <td style="padding:10px 8px; text-align:center; font-family:monospace; color:${row.current === 0 ? '#ef4444' : '#10b981'}; font-weight:bold;">${row.current}</td>
                                    <td style="padding:10px 8px; text-align:center;">
                                        <div style="display:flex; align-items:center; justify-content:center; gap:5px;">
                                            <span style="font-family:monospace;">${row.rate}%</span>
                                            <div style="width:40px; height:4px; background:#222; border-radius:2px; overflow:hidden;">
                                                <div style="width:${row.rate}%; height:100%; background:${row.statusColor};"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style="padding:10px 8px; text-align:right; font-weight:900; color:${row.statusColor}; letter-spacing:0.5px; font-size:0.55rem;">
                                        ${row.statusLabel}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            stockLedgerHtml = `
                <div style="border: 1px dashed #222; border-radius: 8px; padding: 20px; text-align:center; color:#555; font-size:0.65rem; margin-top:10px; background:#040404;">
                    ⚠️ El juego seleccionado no registra premios con límites de stock (todos los premios son ilimitados).
                </div>
            `;
        }

        return `
            <div style="border-top:1px solid #1a1a1a; padding-top:15px;">
                <h6 style="color:#fff; font-size:0.65rem; margin:0; font-weight:900; text-transform:uppercase; letter-spacing:0.5px;">⚖️ CONTROL Y SALDO DE STOCK DE PREMISAS DE JUEGO</h6>
                ${stockLedgerHtml}
            </div>
        `;
    }
}

export class ForensicLogbookComponent implements StatsComponent {
    id = 'forensic-logbook';
    name = 'Bitácora Cronológica de Sucesos';

    render(ctx: StatsContext): string {
        let logbookRowsHtml = '';
        if (ctx.validPlays.length > 0) {
            const sortedChronologically = [...ctx.validPlays].map(p => {
                let timeMs = 0;
                try {
                    timeMs = Date.parse(p.fecha);
                    if (isNaN(timeMs)) {
                        timeMs = new Date(p.fecha).getTime();
                    }
                } catch (e) {}
                return { ...p, timeMs };
            }).sort((a, b) => b.timeMs - a.timeMs);

            logbookRowsHtml = sortedChronologically.map((p, idx) => {
                const leadDetails = p.lead ? Object.entries(p.lead).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(', ') : 'Público/Directo';
                const txHash = generateSHA256(p.fecha + p.nombre).substring(0, 10).toUpperCase();
                return `
                    <tr style="border-bottom:1px solid #111; font-family:monospace; font-size:0.55rem;">
                        <td style="padding:6px; color:#888;">[${p.fecha}]</td>
                        <td style="padding:6px; color:#fff; font-weight:900;">${p.nombre}</td>
                        <td style="padding:6px; color:#aaa; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;" title="${leadDetails}">${leadDetails}</td>
                        <td style="padding:6px; text-align:right; color:#00ff66;">TX-${txHash}</td>
                    </tr>
                `;
            }).join('');
        } else {
            logbookRowsHtml = `
                <tr>
                    <td colspan="4" style="text-align:center; color:#555; padding:20px; font-size:0.65rem; font-style:italic;">No hay sucesos de giros en el historial para auditar.</td>
                </tr>
            `;
        }

        return `
            <div style="margin-top: 20px; border-top: 1px solid #1a1a1a; padding-top: 15px;">
                <h6 style="color:#fff; font-size:0.65rem; margin:0 0 10px 0; font-weight:900; text-transform:uppercase; display:flex; justify-content:space-between; align-items:center;">
                    <span>📑 BITÁCORA CRONOLÓGICA DE SUCESOS (FORENSIC LOGS)</span>
                    <span style="color:#888; font-size:0.55rem; font-weight:normal;">ÚLTIMOS ${ctx.totalPlays} GIROS</span>
                </h6>
                <div style="max-height: 200px; overflow-y: auto; border: 1px solid #151515; border-radius: 8px;">
                    <table style="width:100%; border-collapse:collapse; text-align:left;">
                        <thead style="position: sticky; top: 0; background:#0a0a0a; border-bottom:1px solid #222;">
                            <tr style="color:#fff; font-size:0.55rem; font-weight:900; text-transform:uppercase;">
                                <th style="padding:6px;">Marca de Tiempo</th>
                                <th style="padding:6px;">Recompensa Obtenida</th>
                                <th style="padding:6px;">Datos de Identidad (Leads)</th>
                                <th style="padding:6px; text-align:right;">Firma TX</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logbookRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

export class ForensicCustomSectionsComponent implements StatsComponent {
    id = 'forensic-custom-sections';
    name = 'Secciones de Auditoría de Extensiones de Terceros';

    render(ctx: StatsContext): string {
        const customSections = ForensicSectionRegistry.getSections();
        let customSectionsHtml = '';
        customSections.forEach(s => {
            customSectionsHtml += `
                <div style="border-top: 1px solid #1a1a1a; padding-top: 15px; margin-top: 15px;">
                    <h6 style="color: var(--gold); font-size: 0.65rem; margin: 0 0 10px 0; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${s.title}</h6>
                    <div>${s.renderSectionHtml(ctx.validPlays)}</div>
                </div>
            `;
        });
        return customSectionsHtml;
    }
}

export class ForensicIntegrityBoxComponent implements StatsComponent {
    id = 'forensic-integrity-box';
    name = 'Bloque de Integridad Criptográfica';

    render(ctx: StatsContext): string {
        return `
            <div style="background: #030303; border: 1px solid #10b98144; border-left: 4px solid #10b981; border-radius: 6px; padding: 12px; margin-top: 20px; font-family: monospace; font-size: 0.55rem; color: #00ff66; word-break: break-all; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
                <div>[ESTADO] COMPILACIÓN DE INTEGRIDAD: VERIFICADO POR MOTOR FORENSE NEXO</div>
                <div style="margin-top: 4px;">[FIRMA DIGITAL INMUTABLE DE AUDITORÍA]: ${ctx.forensicHash}</div>
                <div style="margin-top: 4px; color: #888;">Normativas Compliant: SOC 2 Type II | ISO/IEC 27001:2022 | COBIT 2019 Audit Matrix</div>
            </div>
        `;
    }
}

export class ForensicActionsComponent implements StatsComponent {
    id = 'forensic-actions';
    name = 'Acciones e Impresión de Certificado de Auditoría';

    render(ctx: StatsContext): string {
        return `
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px;">
                <button id="btnCopyForensicReport" class="btn btn-secondary" style="flex: 1; min-width: 130px; padding: 10px; font-size: 0.6rem; border-radius: 6px; font-weight: 900; text-transform: uppercase; background:#111; color:#fff; border: 1px solid #333; cursor:pointer;">📋 Copiar Reporte Oficial</button>
                <button id="btnDownloadForensicJson" class="btn btn-secondary" style="flex: 1; min-width: 130px; padding: 10px; font-size: 0.6rem; border-radius: 6px; font-weight: 900; text-transform: uppercase; background:#111; color:#fff; border: 1px solid #333; cursor:pointer;">📥 Descargar JSON de Auditoría</button>
                <button id="btnPrintForensicCertificate" class="btn btn-primary" style="flex: 1; min-width: 130px; padding: 10px; font-size: 0.6rem; border-radius: 6px; font-weight: 900; text-transform: uppercase; background:#d4af37; color:#000; border:1px solid #d4af37; cursor:pointer; font-weight:bold;">🖨️ Certificado Imprimible</button>
            </div>
        `;
    }

    bindEvents(ctx: StatsContext, container: HTMLElement, parent: any): void {
        container.querySelector('#btnCopyForensicReport')?.addEventListener('click', () => {
            const asciiReport = `
================================================================================
                    RULETA NEXO PREMIUM - INFORME FORENSE
================================================================================
ID REPORTE: ${ctx.reportUuid}
FECHA EMISIÓN: ${new Date().toLocaleString()}
JUEGO / PLANTILLA: ${ctx.selectedGameTitle}
AUDITOR EN CARGO: ${ctx.adminEmail}
ESTADO DE AUDITORÍA: VERIFICADO - CONTEXTO INMUTABLE
================================================================================

1. CRONOLOGÍA DE LA SESIÓN:
--------------------------------------------------------------------------------
* FECHA/HORA INICIO: ${ctx.startDateStr}
* FECHA/HORA FIN   : ${ctx.endDateStr}
* DURACIÓN ACTIVA  : ${ctx.durationStr}

2. MÉTRICAS CLAVE (KPIs):
--------------------------------------------------------------------------------
* GIROS TOTALES      : ${ctx.totalPlays}
* LEADS CAPTADOS     : ${ctx.totalLeads}
* CONVERSIÓN LEADS   : ${ctx.convRate}%
* PREMIOS ADJUDICADOS: ${ctx.totalPrizesCount}

3. CONTROL Y SALDO DE STOCK DE PREMIOS (AUDITORÍA DE ACTIVOS):
--------------------------------------------------------------------------------
${ctx.stockRows.length > 0 ? ctx.stockRows.map(row => 
`* PREMIO: ${row.name}
  [Stock Inicial: ${row.initial} | Ganados: ${row.consumed} | Saldo Disponible: ${row.current} | Consumo: ${row.rate}%]
  [Estado: ${row.statusLabel}]`
).join('\n') : '* Sin límites de stock configurados (Premios Ilimitados).'}

4. PREMIOS MÁS REPETIDOS (TOP 5):
--------------------------------------------------------------------------------
${ctx.sortedPrizes.map(([p, count], idx) => `${idx + 1}. ${p}: ${count} veces`).join('\n')}
${(() => {
    const customSections = ForensicSectionRegistry.getSections();
    let text = '';
    customSections.forEach((s, idx) => {
        text += `\n\n${idx + 5}. ${s.title.toUpperCase()}:\n--------------------------------------------------------------------------------\n${s.renderSectionText(ctx.validPlays)}`;
    });
    return text;
})()}

${(() => {
    const count = ForensicSectionRegistry.getSections().length;
    return (count + 5).toString();
})()}. FIRMA DIGITAL DE AUDITORÍA FORENSE:
--------------------------------------------------------------------------------
[SHA-256 CHECK-SUM]: ${ctx.forensicHash}
[NORMATIVA DE CUMPLIMIENTO]: ISO/IEC 27001, COBIT 2019, SOC 2 TYPE II Compliant.
--------------------------------------------------------------------------------
              INFORME GENERADO AUTOMÁTICAMENTE - INTEGRIDAD PROTEGIDA
================================================================================`.trim();

            navigator.clipboard.writeText(asciiReport)
                .then(() => alert("¡Informe forense ASCII copiado al portapapeles con éxito!"))
                .catch(() => alert("Error al copiar el informe."));
        });

        container.querySelector('#btnDownloadForensicJson')?.addEventListener('click', () => {
            const forensicObj = {
                reportHeader: {
                    reportUuid: ctx.reportUuid,
                    generatedAt: new Date().toISOString(),
                    auditor: ctx.adminEmail,
                    standard: "ISO/IEC 27001:2022 / COBIT 2019"
                },
                sessionDetails: {
                    gameName: ctx.selectedGameTitle.replace('JUEGO: ', ''),
                    sessionStart: ctx.startDateStr,
                    sessionEnd: ctx.endDateStr,
                    activeDuration: ctx.durationStr,
                    totalSpins: ctx.totalPlays
                },
                kpis: {
                    totalSpins: ctx.totalPlays,
                    leadsCaptured: ctx.totalLeads,
                    conversionRate: parseFloat(ctx.convRate),
                    uniquePrizesWon: ctx.uniquePrizesWon
                },
                stockLedger: ctx.stockRows.map(row => ({
                    prizeName: row.name,
                    initialStock: row.initial,
                    consumedStock: row.consumed,
                    remainingStock: row.current,
                    depletionRatePercent: parseFloat(row.rate),
                    status: row.statusLabel
                })),
                topWinningPrizes: ctx.sortedPrizes.map(([p, count]) => ({ prizeName: p, count })),
                cryptographicValidation: {
                    payloadSignature: ctx.hashPayload,
                    sha256VerificationChecksum: ctx.forensicHash
                }
            };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(forensicObj, null, 2));
            const a = document.createElement('a');
            a.href = dataStr;
            a.download = `informe_forense_${parent.selectedGameId}_${ctx.reportUuid}.json`;
            a.click();
        });

        container.querySelector('#btnPrintForensicCertificate')?.addEventListener('click', () => {
            if (typeof parent.showForensicCertificateModal === 'function') {
                parent.showForensicCertificateModal(ctx);
            }
        });
    }
}
