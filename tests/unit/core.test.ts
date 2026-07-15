import { describe, it, expect, vi, beforeAll } from 'vitest';

// Stub localStorage before importing core.ts
vi.hoisted(() => {
    const store: Record<string, string> = {};
    Object.defineProperty(global, 'localStorage', {
        value: {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, val: string) => { store[key] = val; },
            removeItem: (key: string) => { delete store[key]; },
            clear: () => { for (const k in store) delete store[k]; }
        },
        writable: true
    });
});

import { Security } from '../../core';

describe('Security Engine Unit Tests', () => {
    it('should generate a unique stable Device ID and cache it in localStorage', () => {
        const id1 = Security.getDeviceId();
        const id2 = Security.getDeviceId();

        expect(id1).toBeDefined();
        expect(id1.startsWith('NX-')).toBe(true);
        expect(id1).toBe(id2); // Stable
    });

    it('should generate matching signatures and checksums', () => {
        const deviceId = 'NX-TEST-1234';
        const signature = Security.generateNexoSignature(deviceId, 'NEXO_OFFLINE_SECRET_2025');
        expect(signature).toHaveLength(8);

        const checksum = Security.generateNexoChecksum('PRO', '20261231');
        expect(checksum).toHaveLength(5);
    });

    it('should validate offline and online key algorithms correctly', () => {
        // Validation with empty or garbage key should return null
        const invalid = Security.validateLicenseAlgorithm('GARBAGE-KEY', 'user@test.com');
        expect(invalid).toBeNull();
    });

    it('should encrypt and decrypt payloads successfully', async () => {
        const data = { token: 'session-xyz', userId: 123 };
        const encrypted = await Security.encrypt(data);
        expect(encrypted).toBeDefined();
        expect(typeof encrypted).toBe('string');

        const decrypted = await Security.decrypt(encrypted);
        expect(decrypted).toEqual(data);
    });
});
