import type { BacklogRepository } from '../../src/modules/backlog/backlog.repository';
import type { BacklogItem } from '../../src/modules/backlog/backlog.schemas';
import { BacklogService } from '../../src/modules/backlog/backlog.service';
import { NotFoundError } from '../../src/shared/errors';

const NOW = new Date('2026-03-10T12:00:00Z');
const SUBJECT_ID = '11111111-1111-4111-8111-111111111111';

const pendingItem: BacklogItem = {
  id: '22222222-2222-4222-8222-222222222222',
  subjectId: SUBJECT_ID,
  title: 'Assistir aula 5',
  description: null,
  status: 'pending',
  priority: 'medium',
  dueDate: null,
  completedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

function makeRepository(current: BacklogItem): jest.Mocked<BacklogRepository> {
  return {
    list: jest.fn().mockResolvedValue([current]),
    findById: jest.fn().mockResolvedValue(current),
    create: jest.fn().mockImplementation(async (data) => ({ ...current, ...data })),
    update: jest.fn().mockImplementation(async (_id, data) => ({ ...current, ...data })),
    delete: jest.fn().mockResolvedValue(true),
  };
}

function makeService(current: BacklogItem = pendingItem, subjectExists = true) {
  const repository = makeRepository(current);
  const subjects = { findById: jest.fn().mockResolvedValue(subjectExists ? { id: SUBJECT_ID } : null) };
  const service = new BacklogService(repository, subjects, () => NOW);
  return { repository, service };
}

describe('BacklogService', () => {
  describe('create', () => {
    it('recusa item de uma matéria inexistente', async () => {
      const { service, repository } = makeService(pendingItem, false);
      await expect(
        service.create({ subjectId: SUBJECT_ID, title: 'X', status: 'pending', priority: 'low' }),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('cria item pendente sem data de conclusão', async () => {
      const { service } = makeService();
      const item = await service.create({
        subjectId: SUBJECT_ID,
        title: 'Ler capítulo 2',
        status: 'pending',
        priority: 'high',
      });
      expect(item.completedAt).toBeNull();
    });

    it('registra a data de conclusão quando o item já nasce concluído', async () => {
      const { service } = makeService();
      const item = await service.create({
        subjectId: SUBJECT_ID,
        title: 'Entregar fase 1',
        status: 'done',
        priority: 'high',
      });
      expect(item.completedAt).toEqual(NOW);
    });
  });

  describe('update', () => {
    it('registra a data de conclusão ao concluir o item', async () => {
      const { service, repository } = makeService();
      await service.update(pendingItem.id, { status: 'done' });
      expect(repository.update).toHaveBeenCalledWith(pendingItem.id, {
        status: 'done',
        completedAt: NOW,
      });
    });

    it('apaga a data de conclusão ao reabrir um item concluído', async () => {
      const doneItem: BacklogItem = { ...pendingItem, status: 'done', completedAt: NOW };
      const { service, repository } = makeService(doneItem);
      await service.update(doneItem.id, { status: 'in_progress' });
      expect(repository.update).toHaveBeenCalledWith(doneItem.id, {
        status: 'in_progress',
        completedAt: null,
      });
    });

    it('preserva a data de conclusão original ao editar um item já concluído', async () => {
      const doneItem: BacklogItem = { ...pendingItem, status: 'done', completedAt: NOW };
      const { service, repository } = makeService(doneItem);
      await service.update(doneItem.id, { status: 'done', title: 'Novo título' });
      expect(repository.update).toHaveBeenCalledWith(doneItem.id, {
        status: 'done',
        title: 'Novo título',
      });
    });

    it('não mexe na data de conclusão em mudanças entre status não concluídos', async () => {
      const { service, repository } = makeService();
      await service.update(pendingItem.id, { status: 'in_progress' });
      expect(repository.update).toHaveBeenCalledWith(pendingItem.id, { status: 'in_progress' });
    });

    it('lança NotFoundError para item inexistente', async () => {
      const { service, repository } = makeService();
      repository.findById.mockResolvedValue(null);
      await expect(service.update(pendingItem.id, { title: 'X' })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  it('lança NotFoundError ao excluir item inexistente', async () => {
    const { service, repository } = makeService();
    repository.delete.mockResolvedValue(false);
    await expect(service.remove(pendingItem.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
