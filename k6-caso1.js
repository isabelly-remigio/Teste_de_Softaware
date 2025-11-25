// import http from 'k6/http';
// import { check, sleep } from 'k6';

// export let options = {
//   stages: [
//     { duration: '1m', target: 100000 }, // subir até 100k
//     { duration: '5m', target: 100000 }, // manter
//     { duration: '1m', target: 0 },      // derrubar
//   ],
//   thresholds: {
//     http_req_duration: ['p(95)<5000'], // 95% < 5s
//     http_req_failed: ['rate<0.02'],    // erros < 2%
//   },
// };

// export default function () {
//   const url = 'https://enem.inep.gov.br/participante/';
//   const res = http.get(url, { tags: { name: "pagina_participante" } });

//   check(res, { 'status 200': (r) => r.status === 200 });
//   sleep(1);
// }


import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },     // sobe para 100
    { duration: '1m', target: 500 },      // sobe para 500
    { duration: '1m', target: 1000 },     // sobe para 1000
    { duration: '1m', target: 2000 },     // sobe para 2000
    { duration: '1m', target: 0 },        // derruba
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const url = 'https://enem.inep.gov.br/participante/';
  const res = http.get(url);

  check(res, {
    'status 200': (r) => r.status === 200,
  });

  sleep(1);
}
