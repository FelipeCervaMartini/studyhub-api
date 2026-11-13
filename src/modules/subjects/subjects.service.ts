import { ConflictError, NotFoundError } from '../../shared/errors';
import type { SubjectRepository } from './subjects.repository';
import type { CreateSubjectInput, Subject, UpdateSubjectInput } from './subjects.schemas';

export class SubjectService {
  constructor(private readonly subjects: SubjectRepository) {}

  list(): Promise<Subject[]> {
    return this.subjects.list();
  }

  async get(id: string): Promise<Subject> {
    const subject = await this.subjects.findById(id);
    if (!subject) throw new NotFoundError('Matéria');
    return subject;
  }

  async create(data: CreateSubjectInput): Promise<Subject> {
    await this.assertNameAvailable(data.name);
    return this.subjects.create(data);
  }

  async update(id: string, data: UpdateSubjectInput): Promise<Subject> {
    await this.get(id);
    if (data.name !== undefined) await this.assertNameAvailable(data.name, id);

    const updated = await this.subjects.update(id, data);
    if (!updated) throw new NotFoundError('Matéria');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.subjects.delete(id);
    if (!deleted) throw new NotFoundError('Matéria');
  }

  // Regra de negócio: não podem existir duas matérias com o mesmo nome.
  private async assertNameAvailable(name: string, ignoreId?: string): Promise<void> {
    const existing = await this.subjects.findByName(name);
    if (existing && existing.id !== ignoreId) {
      throw new ConflictError(`Já existe uma matéria chamada "${existing.name}"`);
    }
  }
}
