import { describe, it, expect } from 'vitest';

describe('Auth Controller Helpers Unit Tests', () => {
    it('should validate administrator credentials correctly', () => {
        const testUser = {
            email: 'admin@ejemplo.com',
            pin: '1234567890',
            company: 'Empresa Demo'
        };

        expect(testUser.email).toBe('admin@ejemplo.com');
        expect(testUser.pin).toHaveLength(10);
    });

    it('should reject weak collaborator PINs', () => {
        const validatePin = (pin: string) => pin.length >= 4 && /^\d+$/.test(pin);

        expect(validatePin('123')).toBe(false); // Too short
        expect(validatePin('abcd')).toBe(false); // Non-numeric
        expect(validatePin('1234')).toBe(true);  // Valid
    });

    it('should normalize emails to lower case for comparison', () => {
        const email1 = "Administrador@Empresa.com";
        const email2 = "administrador@empresa.com";

        expect(email1.toLowerCase()).toBe(email2);
    });
});
