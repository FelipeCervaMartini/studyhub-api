import { NotFoundError } from '../../shared/errors';
import type { SubjectRepository } from '../subjects/subjects.repository';
import type { MaterialRepository } from './materials.repository';
import type {
  CreateMaterialInput,
  Material,
  MaterialFilter,
  UpdateMaterialInput,
} from './materials.schemas';

export class MaterialService {
  constructor(
    private readonly materials: MaterialRepository,
    private readonly subjects: Pick<SubjectRepository, 'findById'>,
  ) {}

  list(filter: MaterialFilter): Promise<Material[]> {
    return this.materials.list(filter);
  }

  async get(id: string): Promise<Material> {
    const material = await this.materials.findById(id);
    if (!material) throw new NotFoundError('Material');
    return material;
  }

  // Regra de negócio: todo material pertence a uma matéria existente.
  async create(data: CreateMaterialInput): Promise<Material> {
    if (!(await this.subjects.findById(data.subjectId))) throw new NotFoundError('Matéria');
    return this.materials.create(data);
  }

  async update(id: string, data: UpdateMaterialInput): Promise<Material> {
    const updated = await this.materials.update(id, data);
    if (!updated) throw new NotFoundError('Material');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.materials.delete(id);
    if (!deleted) throw new NotFoundError('Material');
  }
}
