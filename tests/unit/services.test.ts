import { vi, describe, it, expect, beforeEach } from 'vitest';

// 1. Stub globals immediately using vi.hoisted so they run before ESM imports are loaded
vi.hoisted(() => {
    const mockSessionStore: Record<string, string> = {};
    const mockLocalStore: Record<string, string> = {};

    const mockElement = {
        value: '',
        innerText: '',
        style: { display: 'none', opacity: '1' },
        onclick: null,
        onchange: null,
        disabled: false,
        appendChild: () => {},
        setAttribute: () => {},
        removeAttribute: () => {},
        closest: () => ({
            querySelector: () => ({ value: 'true' })
        })
    };

    const mockCanvas = {
        ...mockElement,
        width: 100,
        height: 100,
        getContext: () => ({
            fillStyle: '',
            fillRect: () => {},
            strokeStyle: '',
            lineWidth: 1,
            strokeRect: () => {},
            font: '',
            textAlign: '',
            fillText: () => {},
            measureText: () => ({ width: 50 }),
            beginPath: () => {},
            arc: () => {},
            lineTo: () => {},
            fill: () => {},
            stroke: () => {},
            save: () => {},
            restore: () => {},
            translate: () => {},
            rotate: () => {},
            createLinearGradient: () => ({
                addColorStop: () => {}
            })
        }),
        toDataURL: () => 'data:image/png;base64,123'
    };

    const mockDoc = {
        getElementById: (id: string) => {
            if (id === 'licenseKeyInput' || id === 'licenseKeyInputLock') {
                return { ...mockCanvas, value: 'NX-PR-20261231-XYZ' };
            }
            // For wheelCanvas or any other canvas elements
            return mockCanvas;
        },
        createElement: (tag: string) => {
            if (tag === 'canvas') {
                return mockCanvas;
            }
            return mockCanvas; // default to mockCanvas for layout elements as well
        },
        querySelectorAll: () => []
    };

    // Define globally
    Object.defineProperty(global, 'sessionStorage', {
        value: {
            getItem: (key: string) => mockSessionStore[key] || null,
            setItem: (key: string, val: string) => { mockSessionStore[key] = val; },
            removeItem: (key: string) => { delete mockSessionStore[key]; },
            clear: () => { for (const k in mockSessionStore) delete mockSessionStore[k]; }
        },
        writable: true
    });

    Object.defineProperty(global, 'localStorage', {
        value: {
            getItem: (key: string) => mockLocalStore[key] || null,
            setItem: (key: string, val: string) => { mockLocalStore[key] = val; },
            removeItem: (key: string) => { delete mockLocalStore[key]; },
            clear: () => { for (const k in mockLocalStore) delete mockLocalStore[k]; }
        },
        writable: true
    });

    Object.defineProperty(global, 'document', {
        value: mockDoc,
        writable: true
    });

    Object.defineProperty(global, 'window', {
        value: {
            location: { origin: 'http://localhost' },
            setTimeout: (cb: any, delay: number) => { cb(); return 0; },
            addEventListener: () => {},
            dispatchEvent: () => {},
            innerWidth: 1024
        },
        writable: true
    });

    Object.defineProperty(global, 'navigator', {
        value: {
            clipboard: {
                writeText: () => Promise.resolve()
            }
        },
        writable: true
    });
});

// 2. Now standard ESM imports can run safely
import { StateManager } from '../../core';
import { addAuditEntry, optimizeStorage } from '../../services/auditService';
import { handleLicenseActivation, verifyGlobalLicense } from '../../services/licenseService';
import { exportCSVFunction, exportTXTFunction, exportIMGFunction } from '../../services/exportService';

describe('Audit Service Unit Tests', () => {
    beforeEach(() => {
        StateManager.config.auditLog = [];
        StateManager.config.winnersHistory = [];
    });

    it('should add audit entries and limit to 60 items', () => {
        addAuditEntry('Action 1');
        expect(StateManager.config.auditLog.length).toBe(1);
        expect(StateManager.config.auditLog[0].action).toBe('Action 1');

        for (let i = 0; i < 70; i++) {
            addAuditEntry(`Action ${i}`);
        }
        expect(StateManager.config.auditLog.length).toBe(60);
    });

    it('should optimize storage correctly', () => {
        StateManager.config.winnersHistory = Array(160).fill({ nombre: 'Premio' });
        StateManager.config.auditLog = Array(10).fill({ action: 'Log', timestamp: '10:00' });

        const confirmMock = vi.fn((msg: string, onConfirm: () => void) => onConfirm());
        const alertMock = vi.fn();
        const dispatchMock = vi.fn();

        optimizeStorage(confirmMock, alertMock, dispatchMock);

        expect(StateManager.config.winnersHistory.length).toBe(100);
        expect(StateManager.config.auditLog.length).toBe(5 + 1); // 5 pruned + 1 audit log entry
    });
});

describe('License Service Unit Tests', () => {
    beforeEach(() => {
        sessionStorage.setItem('nexo_current_user_email', 'test@example.com');
    });

    it('should handle activation fails or falls back to offline algorithms', async () => {
        const alertMock = vi.fn();
        const dashboardMock = vi.fn();
        const verifyMock = vi.fn(() => Promise.resolve());

        await handleLicenseActivation('licenseKeyInput', alertMock, dashboardMock, verifyMock);
        expect(alertMock).toHaveBeenCalled();
    });

    it('should verify global licenses and lock the interface if expired', async () => {
        StateManager.config.license = {
            tier: 'LITE',
            expiryDate: new Date(Date.now() - 100000).toISOString(),
            licenseKey: 'TRIAL-MODE-LITE',
            isActive: true
        };

        const dashboardMock = vi.fn();
        await verifyGlobalLicense(dashboardMock);
        // Ensure standard flows complete without crashing
        expect(dashboardMock).not.toHaveBeenCalled();
    });
});

describe('Export Service Unit Tests', () => {
    beforeEach(() => {
        StateManager.config.winnersHistory = [
            { nombre: 'PREMIO 1', fecha: '01/01/2026', lead: { nombre: 'Juan' }, localSessionId: 'sess1' }
        ];
        StateManager.config.formFields = [
            { id: 'nombre', label: 'Nombre', placeholder: 'Ej: Juan' }
        ];
        StateManager.config.title = 'Test Event';
        StateManager.config.localSessionId = 'sess1';
        StateManager.config.localSessionListEnabled = false;
        StateManager.config.publicSessionListEnabled = false;
    });

    it('should trigger exports for CSV, TXT and Canvas/IMG', () => {
        const alertMock = vi.fn();

        exportCSVFunction(alertMock);
        exportTXTFunction(alertMock);
        exportIMGFunction(alertMock);

        expect(alertMock).not.toHaveBeenCalled();
    });
});
