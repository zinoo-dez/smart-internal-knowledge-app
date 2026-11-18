/**
 * Zero-Dependency Enterprise Concurrency Benchmark Tool
 * Runs high-concurrency requests against NestJS API Gateway to measure throughput & latency.
 *
 * Usage:
 *   node scripts/benchmark-concurrency.js [concurrency] [requests]
 */

const http = require('http');

const CONCURRENCY = parseInt(process.argv[2] || '50', 10);
const TOTAL_REQUESTS = parseInt(process.argv[3] || '200', 10);
const TARGET_URL = process.env.API_URL || 'http://localhost:4000/health';

console.log(`====================================================`);
console.log(`Enterprise Concurrency Benchmark`);
console.log(`Target:       ${TARGET_URL}`);
console.log(`Concurrency:  ${CONCURRENCY} workers`);
console.log(`Total Reqs:   ${TOTAL_REQUESTS}`);
console.log(`====================================================\n`);

let completed = 0;
let successful = 0;
let failed = 0;
const latencies = [];
const startTime = Date.now();

function executeRequest() {
  return new Promise((resolve) => {
    const reqStart = Date.now();
    const req = http.get(TARGET_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        if (res.statusCode >= 200 && res.statusCode < 400) {
          successful++;
        } else {
          failed++;
        }
        completed++;
        resolve();
      });
    });

    req.on('error', () => {
      const duration = Date.now() - reqStart;
      latencies.push(duration);
      failed++;
      completed++;
      resolve();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      failed++;
      completed++;
      resolve();
    });
  });
}

async function runWorker(workerId) {
  while (completed < TOTAL_REQUESTS) {
    await executeRequest();
  }
}

async function main() {
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(runWorker(i));
  }
  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = (latencies.reduce((sum, v) => sum + v, 0) / latencies.length).toFixed(1);
  const qps = (completed / totalTimeSec).toFixed(1);

  console.log(`\n================ Benchmark Results ================`);
  console.log(`Completed:    ${completed} requests in ${totalTimeSec.toFixed(2)}s`);
  console.log(`Throughput:   ${qps} req/sec`);
  console.log(`Successful:   ${successful} (${((successful / completed) * 100).toFixed(1)}%)`);
  console.log(`Failed:       ${failed}`);
  console.log(`Latencies:    Avg: ${avg}ms | P50: ${p50}ms | P95: ${p95}ms | P99: ${p99}ms`);
  console.log(`====================================================\n`);
}

main().catch(console.error);
