import { EventEmitter } from 'node:events';
import type { Request, Response } from 'express';
import { NotFoundError } from '../../src/shared/errors';
import { errorHandler, requestLogger } from '../../src/shared/middleware';

function makeResponse() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function handle(err: unknown) {
  const res = makeResponse();
  errorHandler(err, {} as Request, res as unknown as Response, jest.fn());
  return res;
}

describe('errorHandler', () => {
  let stderr: jest.SpyInstance;

  beforeEach(() => {
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderr.mockRestore();
  });

  it('usa o status e o código do erro de aplicação', () => {
    const res = handle(new NotFoundError('Matéria'));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Matéria não encontrado(a)', details: undefined },
    });
  });

  it('traduz violação de unicidade do PostgreSQL em 409', () => {
    expect(handle({ code: '23505' }).status).toHaveBeenCalledWith(409);
  });

  it('traduz violação de chave estrangeira do PostgreSQL em 409', () => {
    expect(handle({ code: '23503' }).status).toHaveBeenCalledWith(409);
  });

  it('responde 500 sem vazar detalhes internos e registra o erro no log', () => {
    const res = handle(new Error('senha do banco: 123'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('senha do banco: 123'));
  });

  it('trata valores lançados que não são Error', () => {
    expect(handle('falhou').status).toHaveBeenCalledWith(500);
  });
});

describe('requestLogger', () => {
  it('registra método, rota e status em JSON ao final da resposta', () => {
    const stdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const res = Object.assign(new EventEmitter(), { statusCode: 201 });
    const next = jest.fn();

    requestLogger(
      { method: 'POST', originalUrl: '/api/v1/subjects' } as Request,
      res as unknown as Response,
      next,
    );
    expect(next).toHaveBeenCalled();
    res.emit('finish');

    const line = JSON.parse(String(stdout.mock.calls[0]?.[0])) as Record<string, unknown>;
    stdout.mockRestore();
    expect(line).toMatchObject({
      level: 'info',
      message: 'request',
      method: 'POST',
      path: '/api/v1/subjects',
      status: 201,
    });
  });
});
