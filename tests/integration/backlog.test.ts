import request from 'supertest';
import { createSubject, setupTestApp, UNKNOWN_ID } from './helpers';

const ctx = setupTestApp();

describe('Backlog de estudo - /api/v1/backlog', () => {
  it('cria item com os valores padrão', async () => {
    const subjectId = await createSubject(ctx.app);
    const response = await request(ctx.app)
      .post('/api/v1/backlog')
      .send({ subjectId, title: 'Assistir aula 5', dueDate: '2026-12-01' })
      .expect(201);

    expect(response.body).toMatchObject({
      subjectId,
      title: 'Assistir aula 5',
      status: 'pending',
      priority: 'medium',
      dueDate: '2026-12-01',
      completedAt: null,
    });
  });

  it('registra e apaga a data de conclusão conforme o status', async () => {
    const subjectId = await createSubject(ctx.app);
    const created = await request(ctx.app)
      .post('/api/v1/backlog')
      .send({ subjectId, title: 'Entregar fase 1' })
      .expect(201);
    const url = `/api/v1/backlog/${created.body.id}`;

    const done = await request(ctx.app).patch(url).send({ status: 'done' }).expect(200);
    expect(done.body.status).toBe('done');
    expect(done.body.completedAt).not.toBeNull();

    const reopened = await request(ctx.app).patch(url).send({ status: 'pending' }).expect(200);
    expect(reopened.body.completedAt).toBeNull();
  });

  it('filtra por matéria e status e ordena por prioridade', async () => {
    const devops = await createSubject(ctx.app, 'DevOps');
    const redes = await createSubject(ctx.app, 'Redes');
    const send = (body: object) => request(ctx.app).post('/api/v1/backlog').send(body).expect(201);

    await send({ subjectId: devops, title: 'baixa', priority: 'low' });
    await send({ subjectId: devops, title: 'alta', priority: 'high' });
    await send({ subjectId: devops, title: 'concluído', status: 'done' });
    await send({ subjectId: redes, title: 'de outra matéria' });

    const porMateria = await request(ctx.app)
      .get('/api/v1/backlog')
      .query({ subjectId: devops })
      .expect(200);
    expect(porMateria.body.map((item: { title: string }) => item.title)).toEqual([
      'alta',
      'concluído',
      'baixa',
    ]);

    const pendentes = await request(ctx.app)
      .get('/api/v1/backlog')
      .query({ subjectId: devops, status: 'pending' })
      .expect(200);
    expect(pendentes.body).toHaveLength(2);

    await request(ctx.app).get('/api/v1/backlog').query({ status: 'invalido' }).expect(400);
  });

  it('valida a entrada', async () => {
    const subjectId = await createSubject(ctx.app);
    const post = (body: object) => request(ctx.app).post('/api/v1/backlog').send(body);

    await post({ subjectId, title: 'X', priority: 'urgente' }).expect(400);
    await post({ subjectId, title: 'X', dueDate: '01/12/2026' }).expect(400);
    await post({ subjectId, title: 'X', dueDate: '2026-02-30' }).expect(400);
    await post({ title: 'sem matéria' }).expect(400);
    await post({ subjectId: UNKNOWN_ID, title: 'matéria inexistente' }).expect(404);
  });

  it('busca, atualiza e exclui, com 404 para item inexistente', async () => {
    const subjectId = await createSubject(ctx.app);
    const created = await request(ctx.app)
      .post('/api/v1/backlog')
      .send({ subjectId, title: 'Ler capítulo 2', description: 'páginas 30 a 60' })
      .expect(201);
    const url = `/api/v1/backlog/${created.body.id}`;

    await request(ctx.app).get(url).expect(200);
    const updated = await request(ctx.app)
      .patch(url)
      .send({ title: 'Ler capítulo 3', description: null, dueDate: '2026-11-30' })
      .expect(200);
    expect(updated.body).toMatchObject({
      title: 'Ler capítulo 3',
      description: null,
      dueDate: '2026-11-30',
    });

    await request(ctx.app).delete(url).expect(204);
    await request(ctx.app).get(url).expect(404);
    await request(ctx.app).patch(url).send({ title: 'X' }).expect(404);
    await request(ctx.app).delete(url).expect(404);
  });
});
