import { z } from 'zod';
import { loadEnv } from '../../src/config/env';
import { ValidationError } from '../../src/shared/errors';
import { buildUpdateSet } from '../../src/shared/sql';
import { parse, parseId } from '../../src/shared/validation';

describe('loadEnv', () => {
  it('aplica os valores padrão', () => {
    const env = loadEnv({ DATABASE_URL: 'postgres://localhost/db' });
    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'postgres://localhost/db',
    });
  });

  it('converte a porta para número', () => {
    expect(loadEnv({ DATABASE_URL: 'x', PORT: '8080' }).PORT).toBe(8080);
  });

  it('falha com mensagem clara quando falta a DATABASE_URL', () => {
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('recusa porta fora do intervalo válido', () => {
    expect(() => loadEnv({ DATABASE_URL: 'x', PORT: '70000' })).toThrow(/PORT/);
  });
});

describe('buildUpdateSet', () => {
  const columns = { title: 'title', dueDate: 'due_date' };

  it('gera apenas as colunas presentes, com parâmetros numerados', () => {
    expect(buildUpdateSet({ dueDate: '2026-12-01' }, columns)).toEqual({
      assignments: ['due_date = $1'],
      values: ['2026-12-01'],
    });
  });

  it('mantém null como valor (limpar o campo) e ignora undefined', () => {
    expect(buildUpdateSet({ title: 'A', dueDate: null }, columns)).toEqual({
      assignments: ['title = $1', 'due_date = $2'],
      values: ['A', null],
    });
    expect(buildUpdateSet({ title: undefined }, columns).assignments).toEqual([]);
  });

  it('ignora chaves que não estão no mapa de colunas', () => {
    const data = { title: 'A', hacked: 'DROP TABLE' } as { title: string };
    expect(buildUpdateSet(data, { title: 'title' }).assignments).toEqual(['title = $1']);
  });
});

describe('validation', () => {
  it('retorna o dado validado', () => {
    expect(parse(z.object({ n: z.number() }), { n: 1 })).toEqual({ n: 1 });
  });

  it('lança ValidationError com o campo que falhou', () => {
    try {
      parse(z.object({ n: z.number() }), { n: 'x' });
      throw new Error('deveria ter falhado');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).status).toBe(400);
      expect((error as ValidationError).details).toEqual([
        expect.objectContaining({ field: 'n' }),
      ]);
    }
  });

  it('recusa id que não é UUID', () => {
    expect(() => parseId('123')).toThrow(ValidationError);
  });
});
