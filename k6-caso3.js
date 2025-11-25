import http from 'k6/http';
import { check } from 'k6';

export let options = {
  scenarios: {
    nordeste: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10000 },
        { duration: '5m', target: 10000 },
        { duration: '1m', target: 0 },
      ],
    },
    sudeste: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10000 },
        { duration: '5m', target: 10000 },
        { duration: '1m', target: 0 },
      ],
    },
  },
};

export default function (data) {
  const url = 'https://enem.inep.gov.br/participante/';
  let res = http.get(url, { headers: { "X-Region": __VU <= 10000 ? "nordeste" : "sudeste" } });
  check(res, { 'status 200': (r) => r.status === 200 });
}
