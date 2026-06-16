import { Request, Response } from 'express';
import { SensorRepository } from '../repositories/sensorRepository';
import { z } from 'zod';

const repo = new SensorRepository();

const schema = z.object({
  stationId: z.string().uuid(),
  parameterId: z.string().uuid(),
  model: z.string().optional(),
  type: z.enum([
    'do_meter',          // Для 'aerator' (Кисень)
    'turbidity_meter',   // Для 'filter' (Каламутність)
    'pressure_sensor',   // Для 'filter' (Тиск -> Промивка)
    'ph_meter',          // Для 'dispenser_acid' / 'dispenser_alkali'
    'orp_meter',         // Для 'dispenser_chlorine'
    'level_sensor',      // Для 'pump' / 'valve' (Рівень води)
    'thermometer'  
  ]),
  serialNumber: z.string().optional(),
  isActive: z.boolean().optional(),
});

export class SensorController {
  async create(req: Request, res: Response) {
    try {
      const data = schema.parse(req.body);
      const result = await repo.create(data);
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: 'Invalid sensor data' });
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
      if (!result) return res.status(404).json({ error: 'Sensor not found' });
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: 'Invalid update data' });
    }
  }

  async delete(req: Request, res: Response) {
    const result = await repo.delete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Sensor not found' });
    res.json(result);
  }
}