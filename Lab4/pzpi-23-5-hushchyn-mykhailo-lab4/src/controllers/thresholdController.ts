import { Request, Response } from 'express';
import { ThresholdRepository } from '../repositories/thresholdRepository';
import { z } from 'zod';

const repo = new ThresholdRepository();

const schema = z.object({
  stationId: z.string().uuid(),
  parameterId: z.string().uuid(),
  minWarning: z.number().optional(),
  maxWarning: z.number().optional(),
  minCritical: z.number().optional(),
  maxCritical: z.number().optional(),
});

export class ThresholdController {
  async create(req: Request, res: Response) {
    try {
      const data = schema.parse(req.body);
      const result = await repo.create(data);
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: 'Invalid threshold data' });
    }
  }

  async getByStation(req: Request, res: Response) {
    const result = await repo.findByStation(req.params.stationId);
    res.json(result);
  }

  async update(req: Request, res: Response) {
    try {
      const data = schema.partial().parse(req.body);
      const result = await repo.update(req.params.id, data);
      if (!result) return res.status(404).json({ error: 'Threshold not found' });
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: 'Invalid update data' });
    }
  }

  async delete(req: Request, res: Response) {
    const result = await repo.delete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Threshold not found' });
    res.json(result);
  }
}