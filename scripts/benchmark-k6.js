import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 High-Concurrency Enterprise Load Testing Script
 * Uses real server-issued Portfolio Demo Session Bearer tokens (POST /api/auth/demo-session)
 * and exercises /health, /api/search, and SSE /api/chat/stream without masking 429 throttling.
 *
 * Usage:
 *   k6 run scripts/benchmark-k6.js
 */

export const options = {
  stages: [
    { duration: '10s', target: 25 },  // Ramp-up to 25 concurrent users
    { duration: '30s', target: 100 }, // Peak load: 100 concurrent users
    { duration: '10s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    'http_req_duration{endpoint:search}': ['p(95)<250'],
    'http_req_duration{endpoint:chat_stream}': ['p(95)<2500'],
    http_req_failed: ['rate<0.02'],
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

export function setup() {
  const sessionRes = http.post(`${BASE_URL}/api/auth/demo-session`, null, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(sessionRes, {
    'demo session token issued (201)': (r) => r.status === 201,
  });
  const body = sessionRes.json();
  return { token: body && body.token ? body.token : '' };
}

export default function (data) {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // 1. Health Probe
  const healthRes = http.get(`${BASE_URL}/health`, { tags: { endpoint: 'health' } });
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  });

  // 2. Hybrid Search Request (honest 200 check — 429 is tracked as throttling failure)
  const searchRes = http.post(
    `${BASE_URL}/api/search`,
    JSON.stringify({ query, topK: 5 }),
    { headers: authHeaders, tags: { endpoint: 'search' } },
  );
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });

  // 3. SSE Chat Stream Request (sampled 1 in 5 iterations to model realistic chat cadence)
  if (__ITER % 5 === 0) {
    const streamRes = http.post(
      `${BASE_URL}/api/chat/stream`,
      JSON.stringify({
        messages: [{ role: 'user', content: query }],
        modelProvider: 'GEMINI',
        modelName: 'gemini-2.5-flash',
        mode: 'chat',
        thinkingLevel: 'normal',
      }),
      { headers: authHeaders, tags: { endpoint: 'chat_stream' } },
    );
    check(streamRes, {
      'chat stream status is 200/201': (r) => r.status === 200 || r.status === 201,
      'chat stream emitted SSE events': (r) =>
        typeof r.body === 'string' && r.body.includes('"type":"done"'),
    });
  }

  sleep(0.5);
}
