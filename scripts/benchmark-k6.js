import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 High-Concurrency Enterprise Load Testing Script
 * Simulates 50 to 200 virtual users querying the Hybrid Search & Semantic Cache engine.
 * 
 * Usage:
 *   k6 run scripts/benchmark-k6.js
 */

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp-up to 50 concurrent users
    { duration: '30s', target: 200 }, // Peak load: 200 concurrent users
    { duration: '10s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    // 95% of queries must complete under 200ms
    http_req_duration: ['p(95)<200'],
    // HTTP error rate must remain strictly below 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';

const QUERIES = [
  'How to setup Wireguard VPN connection?',
  'What is the employee annual leave and parental policy?',
  'PostgreSQL migration and rollback procedure',
  'What are the response SLAs for P1 incident tickets?',
  'Wi-Fi credentials and guest network access',
];

export default function () {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];

  // 1. Health Probe
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // 2. Hybrid Search Request (with mock dev auth)
  const payload = JSON.stringify({
    query: query,
    topK: 5,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-mock-user-id': `load-user-${__VU}`,
      'x-mock-org-id': 'org-load-test',
      'x-mock-role': 'MEMBER',
    },
  };

  const searchRes = http.post(`${BASE_URL}/api/search`, payload, params);
  check(searchRes, {
    'search status is 200 or 429 throttled': (r) => r.status === 200 || r.status === 429,
  });

  sleep(0.5);
}
