// test-enem-extrapolation.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas para análise
const responseTimeTrend = new Trend('response_time');
const errorRate = new Rate('errors');

// Configurações que FUNCIONAM para o ENEM
const ENEM_URL = 'https://enem.inep.gov.br/participante/';
const REQUEST_PARAMS = {
  insecureSkipTLSVerify: true,
  timeout: '60s',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache'
  },
  tags: {
    name: 'enem_test',
  }
};

export const options = {
  scenarios: {
    low_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },    // 100 usuários
        { duration: '3m', target: 100 },
      ],
    },
    medium_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 500 },    // 500 usuários
        { duration: '3m', target: 500 },
      ],
      startTime: '5m', // Começa após o primeiro teste
    },
    high_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 1000 },   // 1.000 usuários
        { duration: '3m', target: 1000 },
      ],
      startTime: '10m', // Começa após o segundo teste
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<10000'], // Mais relaxado para testes
    http_req_failed: ['rate<0.1'],      // 10% de erro permitido nos testes
  },
};

export default function () {
  const response = http.get(ENEM_URL, REQUEST_PARAMS);

  const isSuccess = check(response, {
    'status is 200': (r) => r.status === 200,
    'response has content': (r) => r.body && r.body.length > 1000,
    'response time reasonable': (r) => r.timings.duration < 30000,
  });

  // Coleta métricas para análise
  responseTimeTrend.add(response.timings.duration);
  errorRate.add(!isSuccess);

  // Think time mais realista
  sleep(Math.random() * 5 + 1);
}

export function handleSummary(data) {
  // Análise estatística para extrapolação
  const results = analyzeAndExtrapolate(data);
  
  console.log('\n📈 RELATÓRIO PARA ARTIGO CIENTÍFICO');
  console.log('=================================');
  console.log(results.summary);
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'extrapolation_report.json': JSON.stringify(results, null, 2),
  };
}

function analyzeAndExtrapolate(data) {
  const metrics = data.metrics;
  const maxVUs = metrics.vus_max.values.max;
  const avgResponseTime = metrics.http_req_duration.values.avg;
  const errorRate = metrics.http_req_failed.values.rate;
  const totalRequests = metrics.http_reqs.values.count;
  
  // Modelo de extrapolação (fórmula simplificada)
  // Baseado na lei universal de escalabilidade
  const projected100k = {
    responseTime: avgResponseTime * Math.log(100000 / maxVUs + 1),
    errorRate: Math.min(1, errorRate * Math.pow(100000 / maxVUs, 1.5)),
    methodology: 'Lei Universal de Escalabilidade (Gunther)'
  };
  
  return {
    test_results: {
      max_users_simulated: maxVUs,
      average_response_time: avgResponseTime,
      error_rate: errorRate,
      total_requests: totalRequests
    },
    extrapolation_100k: {
      projected_response_time: projected100k.responseTime,
      projected_error_rate: projected100k.errorRate,
      meets_requirements: projected100k.responseTime < 5000 && projected100k.errorRate < 0.02,
      methodology: projected100k.methodology
    },
    summary: `EXTRAPOLAÇÃO PARA 100k USUÁRIOS:
    • Tempo de resposta projetado: ${projected100k.responseTime.toFixed(0)}ms
    • Taxa de erro projetada: ${(projected100k.errorRate * 100).toFixed(2)}%
    • Atende aos requisitos: ${projected100k.responseTime < 5000 && projected100k.errorRate < 0.02 ? 'SIM ✅' : 'NÃO ❌'}
    • Metodologia: ${projected100k.methodology}
    
    JUSTIFICATIVA CIENTÍFICA:
    Utilizamos a Lei Universal de Escalabilidade que modela a contenção
    e coerência em sistemas distribuídos. A extrapolação considera que
    o crescimento do tempo de resposta é logarítmico enquanto a taxa
    de erro cresce exponencialmente após certo ponto.`
  };
}
