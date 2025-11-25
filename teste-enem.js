// test-enem-100k-optimized.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    spike_test: {
      executor: 'constant-vus',
      vus: 100000,        // 100k usuários simultâneos
      duration: '15m',    // 15 minutos no pico
    },
  },
  discardResponseBodies: true, // Otimização de memória
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    http_req_failed: ['rate<0.02'],
  },
  noConnectionReuse: true, // Conexões novas para cada request
};

export default function () {
  const params = {
    insecureSkipTLSVerify: true,
    timeout: '25s',
    tags: { name: 'enem_spike' },
  };

  const responses = http.batch([
    ['GET', 'https://enem.inep.gov.br/participante/', null, params],
  ]);

  check(responses[0], {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 10000,
  });
}