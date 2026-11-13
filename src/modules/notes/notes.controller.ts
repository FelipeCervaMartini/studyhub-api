import { Router } from 'express';
import { parse, parseId } from '../../shared/validation';
import { createNoteSchema, listNotesQuerySchema, updateNoteSchema } from './notes.schemas';
import type { NoteService } from './notes.service';

export function notesRouter(service: NoteService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await service.list(parse(listNotesQuerySchema, req.query)));
  });

  router.get('/:id', async (req, res) => {
    res.json(await service.get(parseId(req.params.id)));
  });

  router.post('/', async (req, res) => {
    const note = await service.create(parse(createNoteSchema, req.body));
    res.status(201).json(note);
  });

  router.patch('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    res.json(await service.update(id, parse(updateNoteSchema, req.body)));
  });

  router.delete('/:id', async (req, res) => {
    await service.remove(parseId(req.params.id));
    res.status(204).send();
  });

  return router;
}
