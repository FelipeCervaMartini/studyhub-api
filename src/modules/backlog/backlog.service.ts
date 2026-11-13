import { NotFoundError } from '../../shared/errors';
import type { SubjectRepository } from '../subjects/subjects.repository';
import type { BacklogRepository } from './backlog.repository';
import type {
  BacklogFilter,
  BacklogItem,
  BacklogItemChanges,
  CreateBacklogItemInput,
  UpdateBacklogItemInput,
} from './backlog.schemas';

export class BacklogService {
  constructor(
    private readonly backlog: BacklogRepository,
    private readonly subjects: Pick<SubjectRepository, 'findById'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  list(filter: BacklogFilter): Promise<BacklogItem[]> {
    return this.backlog.list(filter);
  }

  async get(id: string): Promise<BacklogItem> {
    const item = await this.backlog.findById(id);
    if (!item) throw new NotFoundError('Item do backlog');
    return item;
  }

  async create(data: CreateBacklogItemInput): Promise<BacklogItem> {
    if (!(await this.subjects.findById(data.subjectId))) throw new NotFoundError('Matéria');
    return this.backlog.create({
      ...data,
      completedAt: data.status === 'done' ? this.now() : null,
    });
  }

  // Regra de negócio: ao virar "done" grava a data de conclusão; ao reabrir, apaga.
  async update(id: string, data: UpdateBacklogItemInput): Promise<BacklogItem> {
    const current = await this.get(id);
    const changes: BacklogItemChanges = { ...data };

    if (data.status !== undefined && data.status !== current.status) {
      if (data.status === 'done') changes.completedAt = this.now();
      else if (current.status === 'done') changes.completedAt = null;
    }

    const updated = await this.backlog.update(id, changes);
    if (!updated) throw new NotFoundError('Item do backlog');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.backlog.delete(id);
    if (!deleted) throw new NotFoundError('Item do backlog');
  }
}
