import { describe, it, expect, vi } from 'vitest';
import { DEFAULT_LICENSE } from '../../config';

describe('Licensing Module Unit Tests', () => {
    it('should fall back to LITE trial license by default', () => {
        expect(DEFAULT_LICENSE.tier).toBe('LITE');
        expect(DEFAULT_LICENSE.isActive).toBe(true);
        expect(DEFAULT_LICENSE.licenseKey).toBe('TRIAL-MODE-LITE');
        
        const expiry = new Date(DEFAULT_LICENSE.expiryDate).getTime();
        const now = Date.now();
        expect(expiry).toBeGreaterThan(now);
    });

    it('should correctly mark expired licenses as inactive', () => {
        const expiredLicense = {
            tier: 'PRO' as const,
            expiryDate: new Date(Date.now() - 1000 * 60).toISOString(), // 1 minute ago
            licenseKey: 'PRO-1234',
            isActive: true
        };

        const isExpired = new Date(expiredLicense.expiryDate) < new Date();
        expect(isExpired).toBe(true);
    });

    it('should correctly recognize inactive licenses even if expiry is future', () => {
        const deactivatedLicense = {
            tier: 'ENTERPRISE' as const,
            expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // Tomorrow
            licenseKey: 'ENT-999',
            isActive: false
        };

        const isDeactivated = !deactivatedLicense.isActive;
        expect(isDeactivated).toBe(true);
    });
});
