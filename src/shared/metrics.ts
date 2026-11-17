import type { Request, RequestHandler } from 'express';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

export interface Metrics {
  // Mede a duração de cada requisição.
  middleware: RequestHandler;
  // Responde GET /metrics no formato de texto que o Prometheus lê.
  handler: RequestHandler;
}

// Usa o padrão da rota (/subjects/:id) e não a URL real, senão cada id vira uma série nova no Prometheus.
function routeLabel(req: Request): string {
  const route = req.route as { path?: unknown } | undefined;
  if (typeof route?.path !== 'string') return 'unmatched';

  // Monta /api/v1/subjects/:id a partir da URL (o req.baseUrl não serve: o Express limpa ele quando dá erro).
  const urlSegments = req.originalUrl.replace(/\?.*$/, '').split('/').filter(Boolean);
  const routeSegments = route.path.split('/').filter(Boolean);
  const prefix = urlSegments.slice(0, urlSegments.length - routeSegments.length);
  return `/${[...prefix, ...routeSegments].join('/')}`;
}

// Cria as métricas da API. Cada app tem o seu registro, assim os testes não misturam os números.
export function createMetrics(): Metrics {
  const registry = new Registry();

  // Métricas do processo Node: memória, CPU, event loop e coleta de lixo.
  collectDefaultMetrics({ register: registry });

  // O histograma já guarda a quantidade (_count) e a soma dos tempos (_sum) das requisições.
  const httpDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração das requisições HTTP em segundos',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [registry],
  });

  const middleware: RequestHandler = (req, res, next) => {
    const stopTimer = httpDuration.startTimer();
    res.on('finish', () => {
      stopTimer({ method: req.method, route: routeLabel(req), status_code: res.statusCode });
    });
    next();
  };

  const handler: RequestHandler = async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  };

  return { middleware, handler };
}
