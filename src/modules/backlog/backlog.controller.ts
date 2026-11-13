import { Router } from 'express';
import { parse, parseId } from '../../shared/validation';
import {
  createBacklogItemSchema,
  listBacklogQuerySchema,
  updateBacklogItemSchema,
} from './backlog.schemas';
import type { BacklogService } from './backlog.service';

export function backlogRouter(service: BacklogService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await service.list(parse(listBacklogQuerySchema, req.query)));
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(parseId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    const item = await service.create(parse(createBacklogItemSchema, req.body));
    res.status(201).json(item);
  });

  router.patch('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    res.json(await service.update(id, parse(updateBacklogItemSchema, req.body)));
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(parseId(req.params.id));
    res.status(204).send();
  });

  return router;
}
