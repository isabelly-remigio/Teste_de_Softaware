// test-enem-caso3-regional.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Métricas separadas por região
const responseTimeNordeste = new Trend('response_time_nordeste');
const responseTimeSudeste = new Trend('response_time_sudeste');
const errorRateNordeste = new Rate('errors_nordeste');
const errorRateSudeste = new Rate('errors_sudeste');
const successNordeste = new Counter('success_nordeste');
const successSudeste = new Counter('success_sudeste');

const ENEM_URL = 'https://enem.inep.gov.br/participante/';

// Headers específicos para Nordeste
const HEADERS_NORDESTE = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-A205GN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'X-Forwarded-For': '186.192.0.1' // IP simulado do Nordeste
};

// Headers específicos para Sudeste
const HEADERS_SUDESTE = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'X-Forwarded-For': '200.100.0.1' // IP simulado do Sudeste
};

const REQUEST_PARAMS = {
    insecureSkipTLSVerify: true,
    timeout: '30s',
};

export const options = {
    scenarios: {
        nordeste_users: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 100 },    // 100 usuários Nordeste
                { duration: '2m', target: 100 },
                { duration: '1m', target: 250 },    // 250 usuários Nordeste
                { duration: '3m', target: 250 },
                { duration: '1m', target: 0 },
            ],
            exec: 'nordesteScenario',
        },
        sudeste_users: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '1m', target: 100 },    // 100 usuários Sudeste
                { duration: '2m', target: 100 },
                { duration: '1m', target: 250 },    // 250 usuários Sudeste
                { duration: '3m', target: 250 },
                { duration: '1m', target: 0 },
            ],
            startTime: '30s', // Inicia 30s depois do Nordeste
            exec: 'sudesteScenario',
        },
    },
    thresholds: {
        'http_req_duration{scenario:nordeste_users}': ['p(95)<8000'],
        'http_req_duration{scenario:sudeste_users}': ['p(95)<8000'],
        'http_req_failed{scenario:nordeste_users}': ['rate<0.03'],
        'http_req_failed{scenario:sudeste_users}': ['rate<0.03'],
    },
};

// Função específica para usuários do Nordeste
export function nordesteScenario() {
    const params = {
        ...REQUEST_PARAMS,
        headers: HEADERS_NORDESTE,
        tags: { region: 'nordeste' }
    };

    const response = http.get(ENEM_URL, params);

    const isSuccess = check(response, {
        'nordeste status is 200': (r) => r.status === 200,
        'nordeste response time reasonable': (r) => r.timings.duration < 30000,
        'nordeste has content': (r) => r.body && r.body.length > 1000,
    });

    responseTimeNordeste.add(response.timings.duration);
    errorRateNordeste.add(!isSuccess);
    
    if (isSuccess) {
        successNordeste.add(1);
    }

    sleep(Math.random() * 5 + 3); // 3-8 segundos entre requisições
}

// Função específica para usuários do Sudeste
export function sudesteScenario() {
    const params = {
        ...REQUEST_PARAMS,
        headers: HEADERS_SUDESTE,
        tags: { region: 'sudeste' }
    };

    const response = http.get(ENEM_URL, params);

    const isSuccess = check(response, {
        'sudeste status is 200': (r) => r.status === 200,
        'sudeste response time reasonable': (r) => r.timings.duration < 30000,
        'sudeste has content': (r) => r.body && r.body.length > 1000,
    });

    responseTimeSudeste.add(response.timings.duration);
    errorRateSudeste.add(!isSuccess);
    
    if (isSuccess) {
        successSudeste.add(1);
    }

    sleep(Math.random() * 5 + 3); // 3-8 segundos entre requisições
}

export function handleSummary(data) {
    const analysis = analyzeRegionalPerformance(data);
    
    console.log('\n🌎 RELATÓRIO CASO 3 - ESCALABILIDADE REGIONAL');
    console.log('============================================');
    console.log(analysis.report);
    
    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'caso3_regional_analysis.json': JSON.stringify(analysis, null, 2),
    };
}

function analyzeRegionalPerformance(data) {
    const metrics = data.metrics;
    
    // Extrai métricas por região
    const nordesteMetrics = {
        responseTime: metrics['http_req_duration{scenario:nordeste_users}']?.values?.['p(95)'] || 0,
        errorRate: metrics['http_req_failed{scenario:nordeste_users}']?.values?.rate || 1,
        totalRequests: metrics['http_reqs{scenario:nordeste_users}']?.values?.count || 0
    };
    
    const sudesteMetrics = {
        responseTime: metrics['http_req_duration{scenario:sudeste_users}']?.values?.['p(95)'] || 0,
        errorRate: metrics['http_req_failed{scenario:sudeste_users}']?.values?.rate || 1,
        totalRequests: metrics['http_reqs{scenario:sudeste_users}']?.values?.count || 0
    };

    const comparison = compareRegions(nordesteMetrics, sudesteMetrics);
    
    return {
        nordeste_performance: nordesteMetrics,
        sudeste_performance: sudesteMetrics,
        regional_comparison: comparison,
        requirements_met: {
            equivalent_performance: comparison.performanceDifference < 10, // < 10% diferença
            low_error_both_regions: nordesteMetrics.errorRate < 0.03 && sudesteMetrics.errorRate < 0.03,
            load_balancing_effective: comparison.performanceDifference < 15
        },
        report: generateRegionalReport(nordesteMetrics, sudesteMetrics, comparison)
    };
}

function compareRegions(nordeste, sudeste) {
    const timeDifference = Math.abs(nordeste.responseTime - sudeste.responseTime);
    const avgTime = (nordeste.responseTime + sudeste.responseTime) / 2;
    const performanceDifference = avgTime > 0 ? (timeDifference / avgTime) * 100 : 100;
    
    const errorDifference = Math.abs(nordeste.errorRate - sudeste.errorRate);
    const avgError = (nordeste.errorRate + sudeste.errorRate) / 2;
    const errorDifferencePercent = avgError > 0 ? (errorDifference / avgError) * 100 : 100;
    
    return {
        performanceDifference: performanceDifference,
        errorDifferencePercent: errorDifferencePercent,
        timeDifference: timeDifference,
        conclusion: performanceDifference < 10 ? 'EQUIVALENTE' : 'DIVERGENTE'
    };
}

function generateRegionalReport(nordeste, sudeste, comparison) {
    const meetsPerformance = comparison.performanceDifference < 10;
    const meetsError = nordeste.errorRate < 0.03 && sudeste.errorRate < 0.03;
    
    return `
🌎 CASO 3: ESCALABILIDADE REGIONAL - 500 USUÁRIOS (250 por região)

📊 DESEMPENHO POR REGIÃO:

📍 NORDESTE:
   • Tempo de resposta (P95): ${nordeste.responseTime.toFixed(0)}ms
   • Taxa de erro: ${(nordeste.errorRate * 100).toFixed(2)}%
   • Requisições totais: ${nordeste.totalRequests}

📍 SUDESTE:
   • Tempo de resposta (P95): ${sudeste.responseTime.toFixed(0)}ms
   • Taxa de erro: ${(sudeste.errorRate * 100).toFixed(2)}%
   • Requisições totais: ${sudeste.totalRequests}

📈 ANÁLISE COMPARATIVA:
   • Diferença de performance: ${comparison.performanceDifference.toFixed(2)}%
   • Diferença de erro: ${comparison.errorDifferencePercent.toFixed(2)}%
   • Equivalência: ${comparison.conclusion}

✅ VERIFICAÇÃO DOS REQUISITOS:
   • Performance equivalente (<10% diferença): ${meetsPerformance ? 'ATENDIDO ✅' : 'NÃO ATENDIDO ❌'}
   • Baixo erro em ambas regiões (<3%): ${meetsError ? 'ATENDIDO ✅' : 'NÃO ATENDIDO ❌'}
   • Balanceamento eficiente: ${comparison.performanceDifference < 15 ? 'ATENDIDO ✅' : 'NÃO ATENDIDO ❌'}

🎯 CONCLUSÃO DO CASO 3:
${meetsPerformance && meetsError ? 
  '✅ O sistema demonstra ESCALABILIDADE REGIONAL ADEQUADA' :
  '❌ O sistema apresenta PROBLEMAS DE ESCALABILIDADE REGIONAL'
}

🔍 METODOLOGIA:
• 250 usuários simulados do Nordeste
• 250 usuários simulados do Sudeste  
• Headers específicos por região
• Análise comparativa de performance
• Teste de 8 minutos com ramp-up gradual
  `;
}

// Corrige o erro do textSummary
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';



// K6_INSECURE_SKIP_TLS_VERIFY=true k6 run test-enem-caso3-10k.js