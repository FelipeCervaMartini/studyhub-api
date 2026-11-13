import { NotFoundError } from '../../shared/errors';
import type { SubjectRepository } from '../subjects/subjects.repository';
import type { NoteRepository } from './notes.repository';
import type { CreateNoteInput, Note, NoteFilter, UpdateNoteInput } from './notes.schemas';

export class NoteService {
  constructor(
    private readonly notes: NoteRepository,
    private readonly subjects: Pick<SubjectRepository, 'findById'>,
  ) {}

  list(filter: NoteFilter): Promise<Note[]> {
    return this.notes.list(filter);
  }

  async get(id: string): Promise<Note> {
    const note = await this.notes.findById(id);
    if (!note) throw new NotFoundError('Anotação');
    return note;
  }

  async create(data: CreateNoteInput): Promise<Note> {
    if (!(await this.subjects.findById(data.subjectId))) throw new NotFoundError('Matéria');
    return this.notes.create(data);
  }

  async update(id: string, data: UpdateNoteInput): Promise<Note> {
    const updated = await this.notes.update(id, data);
    if (!updated) throw new NotFoundError('Anotação');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.notes.delete(id);
    if (!deleted) throw new NotFoundError('Anotação');
  }
}
