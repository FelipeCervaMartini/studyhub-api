import type { SubjectRepository } from '../../src/modules/subjects/subjects.repository';
import type { Subject } from '../../src/modules/subjects/subjects.schemas';
import { SubjectService } from '../../src/modules/subjects/subjects.service';
import { ConflictError, NotFoundError } from '../../src/shared/errors';

const subject: Subject = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'DevOps na Prática',
  description: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

function makeRepository(): jest.Mocked<SubjectRepository> {
  return {
    list: jest.fn().mockResolvedValue([subject]),
    findById: jest.fn().mockResolvedValue(subject),
    findByName: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(subject),
    update: jest.fn().mockResolvedValue(subject),
    delete: jest.fn().mockResolvedValue(true),
  };
}

describe('SubjectService', () => {
  let repository: jest.Mocked<SubjectRepository>;
  let service: SubjectService;

  beforeEach(() => {
    repository = makeRepository();
    service = new SubjectService(repository);
  });

  it('lista as matérias do repositório', async () => {
    await expect(service.list()).resolves.toEqual([subject]);
  });

  it('lança NotFoundError ao buscar uma matéria inexistente', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.get(subject.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('cria a matéria quando o nome está disponível', async () => {
    await expect(service.create({ name: subject.name })).resolves.toEqual(subject);
    expect(repository.create).toHaveBeenCalledWith({ name: subject.name });
  });

  it('impede criar duas matérias com o mesmo nome', async () => {
    repository.findByName.mockResolvedValue(subject);
    await expect(service.create({ name: subject.name })).rejects.toBeInstanceOf(ConflictError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('permite atualizar a matéria mantendo o próprio nome', async () => {
    repository.findByName.mockResolvedValue(subject);
    await expect(service.update(subject.id, { name: subject.name })).resolves.toEqual(subject);
  });

  it('impede renomear para o nome de outra matéria', async () => {
    repository.findByName.mockResolvedValue({ ...subject, id: 'outra-materia' });
    await expect(service.update(subject.id, { name: 'Redes' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('não consulta o nome quando ele não é alterado', async () => {
    await service.update(subject.id, { description: 'Disciplina do semestre' });
    expect(repository.findByName).not.toHaveBeenCalled();
  });

  it('lança NotFoundError ao atualizar ou excluir uma matéria inexistente', async () => {
    repository.findById.mockResolvedValue(null);
    repository.delete.mockResolvedValue(false);
    await expect(service.update(subject.id, { name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(service.remove(subject.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
