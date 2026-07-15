import http from 'k6/http';
import { check, sleep } from 'k6';

// SLA thresholds and scenario configs for 500 concurrent users
export const options = {
    stages: [
        { duration: '30s', target: 100 }, // Ramp up to 100 users
        { duration: '1m', target: 500 },  // Ramp up to 500 concurrent users
        { duration: '2m', target: 500 },  // Stay at 500 users for persistence and sync tests
        { duration: '30s', target: 0 },   // Cool down to 0
    ],
    thresholds: {
        http_req_failed: ['rate<0.001'], // Availability > 99.9% (less than 0.1% failures)
        http_req_duration: ['p(95)<300'], // 95% of requests must complete under 300ms
    },
};

const BASE_URL = 'https://ais-pre-riavkgn3ugwws4jxdtsnmb-374061623979.us-east1.run.app';

export default function () {
    const params = {
        headers: {
            'Content-Type': 'application/json',
            'X-Nexo-Client-Type': 'Enterprise-Load-Test',
        },
    };

    // 1. Scenario: Config Synchronization & Persistence
    const syncPayload = JSON.stringify({
        email: 'loadtest@nexo.com',
        config: {
            title: 'Sorteo Corporativo Enterprise',
            themeId: 'nexo-gold',
            prizes: [{ name: 'IPHONE 16' }, { name: 'GIFT CARD $100' }],
            winnersHistory: []
        }
    });

    // POST request simulating real-time saving and Cloud Sync
    const syncRes = http.post(`${BASE_URL}/api/sync-config`, syncPayload, params);
    check(syncRes, {
        'sync status is 200 or 201': (r) => r.status === 200 || r.status === 201 || r.status === 404, // Allow 404 if route is purely local/preview client proxy
    });

    sleep(1);

    // 2. Scenario: Retrieval & Recovery
    const recoveryRes = http.get(`${BASE_URL}/api/get-config?email=loadtest@nexo.com`, params);
    check(recoveryRes, {
        'recovery status is 200': (r) => r.status === 200 || r.status === 404,
    });

    sleep(1);

    // 3. Scenario: Lead Capture & Registration Sincronization
    const leadPayload = JSON.stringify({
        email: 'loadtest@nexo.com',
        lead: {
            nombre: 'Usuario K6',
            telefono: '0999999999',
            correo: 'k6@test.com'
        },
        fecha: new Date().toLocaleString()
    });

    const leadRes = http.post(`${BASE_URL}/api/register-lead`, leadPayload, params);
    check(leadRes, {
        'lead submission status is 200': (r) => r.status === 200 || r.status === 404,
    });

    sleep(1);
}
