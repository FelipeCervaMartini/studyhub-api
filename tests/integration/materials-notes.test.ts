import request from 'supertest';
import { createSubject, setupTestApp, UNKNOWN_ID } from './helpers';

const ctx = setupTestApp();

describe('Materiais - /api/v1/materials', () => {
  it('cria, lista por matéria, atualiza e exclui', async () => {
    const devops = await createSubject(ctx.app, 'DevOps');
    const redes = await createSubject(ctx.app, 'Redes');

    const created = await request(ctx.app)
      .post('/api/v1/materials')
      .send({
        subjectId: devops,
        title: 'Manual de DevOps',
        type: 'book',
        url: 'https://example.com/manual-devops',
      })
      .expect(201);
    await request(ctx.app)
      .post('/api/v1/materials')
      .send({ subjectId: redes, title: 'Aula gravada', type: 'video' })
      .expect(201);

    const all = await request(ctx.app).get('/api/v1/materials').expect(200);
    expect(all.body).toHaveLength(2);

    const filtered = await request(ctx.app)
      .get('/api/v1/materials')
      .query({ subjectId: devops })
      .expect(200);
    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].title).toBe('Manual de DevOps');

    const url = `/api/v1/materials/${created.body.id}`;
    await request(ctx.app).get(url).expect(200);
    const updated = await request(ctx.app)
      .patch(url)
      .send({ type: 'article', url: null })
      .expect(200);
    expect(updated.body).toMatchObject({ type: 'article', url: null, title: 'Manual de DevOps' });

    await request(ctx.app).delete(url).expect(204);
    await request(ctx.app).get(url).expect(404);
    await request(ctx.app).patch(url).send({ title: 'X' }).expect(404);
    await request(ctx.app).delete(url).expect(404);
  });

  it('valida tipo, URL e matéria', async () => {
    const subjectId = await createSubject(ctx.app);
    const post = (body: object) => request(ctx.app).post('/api/v1/materials').send(body);

    await post({ subjectId, title: 'X', type: 'podcast' }).expect(400);
    await post({ subjectId, title: 'X', type: 'book', url: 'não é url' }).expect(400);
    await post({ subjectId: UNKNOWN_ID, title: 'X', type: 'book' }).expect(404);
    await request(ctx.app).get('/api/v1/materials').query({ subjectId: 'abc' }).expect(400);
  });

  it('não permite mover o material para outra matéria pelo PATCH', async () => {
    const subjectId = await createSubject(ctx.app);
    const created = await post201(subjectId);
    await request(ctx.app)
      .patch(`/api/v1/materials/${created}`)
      .send({ subjectId: UNKNOWN_ID })
      .expect(400);
  });

  async function post201(subjectId: string): Promise<string> {
    const response = await request(ctx.app)
      .post('/api/v1/materials')
      .send({ subjectId, title: 'Slides', type: 'slides' })
      .expect(201);
    return response.body.id as string;
  }
});

describe('Anotações - /api/v1/notes', () => {
  it('cria, lista por matéria, atualiza e exclui', async () => {
    const subjectId = await createSubject(ctx.app);
    const created = await request(ctx.app)
      .post('/api/v1/notes')
      .send({ subjectId, title: 'Integração contínua', content: 'Commits frequentes e build automatizado.' })
      .expect(201);

    const list = await request(ctx.app).get('/api/v1/notes').query({ subjectId }).expect(200);
    expect(list.body).toHaveLength(1);

    const url = `/api/v1/notes/${created.body.id}`;
    await request(ctx.app).get(url).expect(200);
    const updated = await request(ctx.app).patch(url).send({ content: 'Novo texto' }).expect(200);
    expect(updated.body).toMatchObject({ title: 'Integração contínua', content: 'Novo texto' });

    await request(ctx.app).delete(url).expect(204);
    await request(ctx.app).get(url).expect(404);
    await request(ctx.app).patch(url).send({ title: 'X' }).expect(404);
    await request(ctx.app).delete(url).expect(404);
  });

  it('valida conteúdo e matéria', async () => {
    const subjectId = await createSubject(ctx.app);
    const post = (body: object) => request(ctx.app).post('/api/v1/notes').send(body);

    await post({ subjectId, title: 'Sem conteúdo' }).expect(400);
    await post({ subjectId, title: 'Vazio', content: '   ' }).expect(400);
    await post({ subjectId: UNKNOWN_ID, title: 'X', content: 'Y' }).expect(404);
  });
});
