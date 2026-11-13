import { Router } from 'express';
import { parse, parseId } from '../../shared/validation';
import {
  createMaterialSchema,
  listMaterialsQuerySchema,
  updateMaterialSchema,
} from './materials.schemas';
import type { MaterialService } from './materials.service';

export function materialsRouter(service: MaterialService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await service.list(parse(listMaterialsQuerySchema, req.query)));
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(parseId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    const material = await service.create(parse(createMaterialSchema, req.body));
    res.status(201).json(material);
  });

  router.patch('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    res.json(await service.update(id, parse(updateMaterialSchema, req.body)));
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(parseId(req.params.id));
    res.status(204).send();
  });

  return router;
}
