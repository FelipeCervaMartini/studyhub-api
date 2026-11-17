import request from 'supertest';
import { createSubject, setupTestApp, UNKNOWN_ID } from './helpers';

const ctx = setupTestApp();

describe('GET /metrics', () => {
  it('responde 200 em texto, no formato do Prometheus', async () => {
    const response = await request(ctx.app).get('/metrics').expect(200);

    expect(response.headers['content-type']).toContain('text/plain');
    // Métrica padrão do processo Node.
    expect(response.text).toContain('process_cpu_user_seconds_total');
  });

  it('conta as requisições por método, rota e status', async () => {
    await request(ctx.app).get('/api/v1/subjects').expect(200);

    const response = await request(ctx.app).get('/metrics').expect(200);
    expect(response.text).toContain(
      'http_request_duration_seconds_count{method="GET",route="/api/v1/subjects",status_code="200"} 1',
    );
  });

  it('usa o padrão da rota em vez do id real', async () => {
    const id = await createSubject(ctx.app);
    await request(ctx.app).get(`/api/v1/subjects/${id}`).expect(200);
    await request(ctx.app).get(`/api/v1/subjects/${UNKNOWN_ID}`).expect(404);

    const response = await request(ctx.app).get('/metrics').expect(200);
    expect(response.text).toContain('route="/api/v1/subjects/:id",status_code="200"');
    expect(response.text).toContain('route="/api/v1/subjects/:id",status_code="404"');
    expect(response.text).not.toContain(id);
  });

  it('agrupa rotas inexistentes em uma única série', async () => {
    await request(ctx.app).get('/api/v1/nao-existe').expect(404);
    await request(ctx.app).get('/outra-rota-qualquer').expect(404);

    const response = await request(ctx.app).get('/metrics').expect(200);
    expect(response.text).toContain(
      'http_request_duration_seconds_count{method="GET",route="unmatched",status_code="404"} 2',
    );
  });

  it('não conta as chamadas ao próprio /metrics', async () => {
    await request(ctx.app).get('/metrics').expect(200);

    const response = await request(ctx.app).get('/metrics').expect(200);
    expect(response.text).not.toContain('route="/metrics"');
  });
});
