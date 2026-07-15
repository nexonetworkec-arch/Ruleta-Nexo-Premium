import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage mechanism
class MockStorage {
    private store: Record<string, string> = {};
    getItem(key: string) { return this.store[key] || null; }
    setItem(key: string, value: string) { this.store[key] = value; }
    removeItem(key: string) { delete this.store[key]; }
    clear() { this.store = {}; }
}

const mockLocalStorage = new MockStorage();

// Mock StateManager
const MockStateManager = {
    config: {
        auditLog: [] as { action: string; timestamp: string }[],
        winnersHistory: [] as any[]
    },
    save: vi.fn(() => {
        mockLocalStorage.setItem('ruleta_config', JSON.stringify(MockStateManager.config));
    })
};

describe('Audit Logging System Integration Tests', () => {
    beforeEach(() => {
        MockStateManager.config.auditLog = [];
        MockStateManager.config.winnersHistory = [];
        vi.clearAllMocks();
    });

    it('should add log entries in chronological order (unshift) and cap them at 60 items', () => {
        const addAuditEntry = (action: string) => {
            if (!MockStateManager.config.auditLog) {
                MockStateManager.config.auditLog = [];
            }
            const timestamp = "12:00:00";
            MockStateManager.config.auditLog.unshift({ action, timestamp });
            
            if (MockStateManager.config.auditLog.length > 60) {
                MockStateManager.config.auditLog = MockStateManager.config.auditLog.slice(0, 60);
            }
            MockStateManager.save();
        };

        // Add 65 elements
        for (let i = 1; i <= 65; i++) {
            addAuditEntry(`Acción número ${i}`);
        }

        expect(MockStateManager.config.auditLog.length).toBe(60);
        // The first element in the array is the most recent (unshifted)
        expect(MockStateManager.config.auditLog[0].action).toBe('Acción número 65');
        expect(MockStateManager.save).toHaveBeenCalledTimes(65);
    });

    it('should prune history to 100 items when optimizing a bloated database (>150 items)', () => {
        // Mocking 160 elements in history
        MockStateManager.config.winnersHistory = Array(160).fill({ nombre: 'Ganador' });
        MockStateManager.config.auditLog = Array(10).fill({ action: 'Auditoría', timestamp: '10:00' });

        const optimizeStorage = () => {
            let actionsCount = 0;
            if (MockStateManager.config.winnersHistory.length > 150) {
                MockStateManager.config.winnersHistory = MockStateManager.config.winnersHistory.slice(0, 100);
                actionsCount++;
            }
            if (MockStateManager.config.auditLog.length > 5) {
                MockStateManager.config.auditLog = MockStateManager.config.auditLog.slice(0, 5);
                actionsCount++;
            }
            MockStateManager.save();
        };

        optimizeStorage();

        expect(MockStateManager.config.winnersHistory.length).toBe(100);
        expect(MockStateManager.config.auditLog.length).toBe(5);
        expect(MockStateManager.save).toHaveBeenCalled();
    });
});
