import { Request, Response } from 'express';
import { AlertRepository } from '../repositories/alertRepository';
import { z } from 'zod';

const repo = new AlertRepository();

// Валідація створення
const createSchema = z.object({
  stationId: z.string().uuid(),
  type: z.enum(['warning', 'critical']),
  targetRole: z.enum(['admin', 'manager', 'technician', 'analyst', 'viewer']),
  message: z.string().min(3),
});

export class AlertController {
  
  // Отримати всі активні тривоги (Dashboard)
  async getActive(req: Request, res: Response) {
    try {
      const alerts = await repo.findActive();
      res.json(alerts);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  }

  // Отримати всі тривоги конкретної станції
  async getByStation(req: Request, res: Response) {
    try {
      const { stationId } = req.params;
      const alerts = await repo.findByStation(stationId);
      res.json(alerts);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch station alerts' });
    }
  }

  // Створити тривогу вручну
  async create(req: Request, res: Response) {
    try {
      const data = createSchema.parse(req.body);
      
      const alert = await repo.create({
        ...data,
        isResolved: false
      });
      
      res.status(201).json(alert);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ errors: e.issues });
      res.status(500).json({ error: 'Failed to create alert' });
    }
  }

  // Позначити тривогу як вирішену
  async resolve(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updated = await repo.resolve(id);
      
      if (!updated) return res.status(404).json({ error: 'Alert not found' });
      
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  }

  // Видалити тривогу
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await repo.delete(id);
      
      if (!deleted) return res.status(404).json({ error: 'Alert not found' });
      
      res.json({ message: 'Alert deleted successfully' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to delete alert' });
    }
  }
}