import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 200000 },
    { duration: '6m', target: 200000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<8000'],
    http_req_failed: ['rate<0.03'],
  },
};

export default function () {
  const url = 'https://enem.inep.gov.br/participante/';
  const res = http.get(url);

  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}
