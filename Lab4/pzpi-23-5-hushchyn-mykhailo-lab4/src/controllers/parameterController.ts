import { Request, Response } from 'express';
import { ParameterRepository } from '../repositories/parameterRepository';
import { z } from 'zod';

const repo = new ParameterRepository();

const schema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  unit: z.string().min(1),
});

export class ParameterController {
  async create(req: Request, res: Response) {
    try {
      const data = schema.parse(req.body);
      const result = await repo.create(data);
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: 'Invalid parameter data' });
    }
  }

  async getAll(req: Request, res: Response) {
    const result = await repo.findAll();
    res.json(result);
  }

  async delete(req: Request, res: Response) {
    const result = await repo.delete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Parameter not found' });
    res.json(result);
  }
}