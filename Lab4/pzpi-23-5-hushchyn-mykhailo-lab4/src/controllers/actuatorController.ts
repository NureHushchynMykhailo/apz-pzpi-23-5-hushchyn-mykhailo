import { Request, Response } from 'express';
import { ActuatorRepository } from '../repositories/actuatorRepository';
import { z } from 'zod';

const repo = new ActuatorRepository();

// helper для Express params (убирает string | string[])
const toStringParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const createSchema = z.object({
  stationId: z.string().uuid(),
  name: z.string().min(2),
  type: z.enum([
    'aerator',
    'filter',
    'pump',
    'dispenser_acid',
    'dispenser_alkali',
    'dispenser_chlorine',
    'valve'
  ]),
  isActive: z.boolean().default(false),
});

const updateSchema = z.object({
  activationPercentage: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

const logSchema = z.object({
  controllerId: z.string().uuid(),
  activationPercentage: z.number().min(0).max(100),
  statusMessage: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export class ActuatorController {

  async getByStation(req: Request, res: Response) {
    try {
      const stationId = toStringParam(req.params.stationId);

      const devices = await repo.findByStation(stationId);
      res.json(devices);
    } catch (e) {
      res.status(500).json({ error: 'Не вдалося отримати список пристроїв' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = createSchema.parse(req.body);
      const device = await repo.create(data);
      res.status(201).json(device);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ errors: e.issues });
      res.status(500).json({ error: 'Помилка створення актуатора' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const id = toStringParam(req.params.id);

      const { activationPercentage, isActive } =
        updateSchema.parse(req.body);

      let updatedDevice = null;

      if (isActive !== undefined) {
        updatedDevice = await repo.update(id, { isActive });
      } else {
        updatedDevice = await repo.findById(id);
      }

      if (!updatedDevice) {
        return res.status(404).json({ error: 'Актуатор не знайдено' });
      }

      if (activationPercentage !== undefined) {
        await repo.logState({
          controllerId: id,
          activationPercentage: activationPercentage.toString(),
          statusMessage: isActive !== undefined
            ? (isActive ? 'Увімкнено через PATCH' : 'Вимкнено через PATCH')
            : 'Оновлено рівень активації',
          timestamp: new Date(),
        });
      }

      res.json({
        message: 'Стан актуатора оновлено',
        device: updatedDevice,
        currentActivation: activationPercentage
      });

    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ errors: e.issues });
      }
      res.status(500).json({ error: 'Помилка оновлення актуатора' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const id = toStringParam(req.params.id);

      await repo.delete(id);
      res.status(204).send();
    } catch (e) {
      res.status(500).json({ error: 'Помилка видалення' });
    }
  }

  async registerState(req: Request, res: Response) {
    try {
      const data = logSchema.parse(req.body);

      const device = await repo.findById(data.controllerId);
      if (!device) {
        return res.status(404).json({ error: 'Контролер не знайдено' });
      }

      const log = await repo.logState({
        controllerId: data.controllerId,
        activationPercentage: data.activationPercentage.toString(),
        statusMessage: data.statusMessage,
        timestamp: data.timestamp
          ? new Date(data.timestamp)
          : new Date(),
      });

      res.status(201).json(log);

    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ errors: e.issues });
      }
      res.status(500).json({ error: 'Не вдалося зареєструвати стан' });
    }
  }

  async getHistory(req: Request, res: Response) {
    try {
      const id = toStringParam(req.params.id);

      const logs = await repo.getLogs(id);
      res.json(logs);

    } catch (e) {
      res.status(500).json({ error: 'Не вдалося отримати історію' });
    }
  }

  async getLatestStateByStation(req: Request, res: Response) {
    try {
      const stationId = toStringParam(req.params.stationId);

      const states = await repo.findLatestStateByStation(stationId);
      res.json(states);

    } catch (e) {
      res.status(500).json({ error: 'Не вдалося отримати поточний стан' });
    }
  }
}