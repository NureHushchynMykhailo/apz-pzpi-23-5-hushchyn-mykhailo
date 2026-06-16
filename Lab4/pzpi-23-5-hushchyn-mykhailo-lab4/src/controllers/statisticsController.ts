import { Request, Response } from 'express';
import { StatisticsRepository } from '../repositories/statisticsRepository';
import { z } from 'zod';

const repo = new StatisticsRepository();

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export class StatisticsController {

  private getDates(req: Request) {
    const { from, to } = querySchema.parse(req.query);
  
    const endDate = to ? new Date(to) : new Date();
    const startDate = from ? new Date(from) : new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

    return { startDate, endDate };
  }

  getSensorStats = async (req: Request, res: Response) => {
    try {
      const { stationId } = req.params;
      const { startDate, endDate } = this.getDates(req);

      const stats = await repo.getSensorStats(stationId, startDate, endDate);
      res.json({ period: { from: startDate, to: endDate }, data: stats });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch sensor stats' });
    }
  }

  getAlertStats = async (req: Request, res: Response) => {
    try {
      const { stationId } = req.params;
      const { startDate, endDate } = this.getDates(req);

      const stats = await repo.getAlertStats(stationId, startDate, endDate);
      res.json({ period: { from: startDate, to: endDate }, data: stats });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch alert stats' });
    }
  }

  getActuatorStats = async (req: Request, res: Response) => {
    try {
      const { stationId } = req.params;
      const { startDate, endDate } = this.getDates(req);

      const stats = await repo.getActuatorStats(stationId, startDate, endDate);
      res.json({ period: { from: startDate, to: endDate }, data: stats });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch actuator stats' });
    }
  }
}