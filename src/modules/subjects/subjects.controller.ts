import { Router } from 'express';
import { parse, parseId } from '../../shared/validation';
import { createSubjectSchema, updateSubjectSchema } from './subjects.schemas';
import type { SubjectService } from './subjects.service';

// Camada HTTP: valida a entrada, chama o serviço e define o status da resposta.
export function subjectsRouter(service: SubjectService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await service.list());
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(parseId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    const subject = await service.create(parse(createSubjectSchema, req.body));
    res.status(201).json(subject);
  });

  router.patch('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    res.json(await service.update(id, parse(updateSubjectSchema, req.body)));
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(parseId(req.params.id));
    res.status(204).send();
  });

  return router;
}
