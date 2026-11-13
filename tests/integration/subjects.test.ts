import request from 'supertest';
import { createSubject, setupTestApp, UNKNOWN_ID } from './helpers';

const ctx = setupTestApp();

describe('Matérias - /api/v1/subjects', () => {
  it('cria, busca, lista, atualiza e exclui uma matéria', async () => {
    const created = await request(ctx.app)
      .post('/api/v1/subjects')
      .send({ name: '  DevOps na Prática  ', description: 'CI, CD e IaC' })
      .expect(201);

    expect(created.body).toMatchObject({ name: 'DevOps na Prática', description: 'CI, CD e IaC' });
    const id = created.body.id as string;

    await request(ctx.app).get(`/api/v1/subjects/${id}`).expect(200);

    const list = await request(ctx.app).get('/api/v1/subjects').expect(200);
    expect(list.body).toHaveLength(1);

    const updated = await request(ctx.app)
      .patch(`/api/v1/subjects/${id}`)
      .send({ description: null })
      .expect(200);
    expect(updated.body).toMatchObject({ name: 'DevOps na Prática', description: null });

    await request(ctx.app).delete(`/api/v1/subjects/${id}`).expect(204);
    await request(ctx.app).get(`/api/v1/subjects/${id}`).expect(404);
  });

  it('retorna 400 para entrada inválida', async () => {
    const semNome = await request(ctx.app).post('/api/v1/subjects').send({}).expect(400);
    expect(semNome.body.error.code).toBe('VALIDATION_ERROR');
    expect(semNome.body.error.details[0].field).toBe('name');

    await request(ctx.app).post('/api/v1/subjects').send({ name: '   ' }).expect(400);
    await request(ctx.app).post('/api/v1/subjects').send({ name: 'A', extra: 1 }).expect(400);
    await request(ctx.app).get('/api/v1/subjects/nao-e-uuid').expect(400);

    const id = await createSubject(ctx.app);
    await request(ctx.app).patch(`/api/v1/subjects/${id}`).send({}).expect(400);
  });

  it('retorna 400 para JSON malformado', async () => {
    const response = await request(ctx.app)
      .post('/api/v1/subjects')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('retorna 409 para nome duplicado, ignorando maiúsculas e minúsculas', async () => {
    await createSubject(ctx.app, 'Redes');
    const response = await request(ctx.app)
      .post('/api/v1/subjects')
      .send({ name: 'REDES' })
      .expect(409);
    expect(response.body.error.code).toBe('CONFLICT');

    const outra = await createSubject(ctx.app, 'Banco de Dados');
    await request(ctx.app).patch(`/api/v1/subjects/${outra}`).send({ name: 'redes' }).expect(409);
  });

  it('retorna 404 para matéria inexistente', async () => {
    await request(ctx.app).get(`/api/v1/subjects/${UNKNOWN_ID}`).expect(404);
    await request(ctx.app).patch(`/api/v1/subjects/${UNKNOWN_ID}`).send({ name: 'X' }).expect(404);
    await request(ctx.app).delete(`/api/v1/subjects/${UNKNOWN_ID}`).expect(404);
  });

  it('excluir a matéria remove em cascata materiais, backlog e anotações', async () => {
    const subjectId = await createSubject(ctx.app);
    await request(ctx.app)
      .post('/api/v1/materials')
      .send({ subjectId, title: 'Slides da aula 5', type: 'slides' })
      .expect(201);
    await request(ctx.app)
      .post('/api/v1/backlog')
      .send({ subjectId, title: 'Revisar Terraform' })
      .expect(201);
    await request(ctx.app)
      .post('/api/v1/notes')
      .send({ subjectId, title: 'IaC', content: 'Infraestrutura declarativa' })
      .expect(201);

    await request(ctx.app).delete(`/api/v1/subjects/${subjectId}`).expect(204);

    for (const resource of ['materials', 'backlog', 'notes']) {
      const response = await request(ctx.app).get(`/api/v1/${resource}`).expect(200);
      expect(response.body).toEqual([]);
    }
  });
});
