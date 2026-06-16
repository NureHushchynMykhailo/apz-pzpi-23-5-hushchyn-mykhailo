import { Request, Response } from 'express';
import { TelemetryRepository } from '../repositories/telemetryRepository';
const { SmartControlService } = require('../services/smartControlService');
const { AlertService } = require( '../services/alertService'); 
import { z } from 'zod';

const repo = new TelemetryRepository();
const smartControl = new SmartControlService();
const alertService = new AlertService();
const schema = z.object({
  sensorId: z.string().uuid(),
  value: z.number(),
  measuredAt: z.string().datetime().optional(),
});

export class TelemetryController {
  
  async add(req: Request, res: Response) {
    try {
      const data = schema.parse(req.body);
      const result = await repo.create({
        ...data,
        measuredAt: data.measuredAt ? new Date(data.measuredAt) : new Date()
      });
      await smartControl.processTelemetry(data.sensorId, data.value);
      await alertService.checkAndCreateAlert(data.sensorId, data.value); 
      res.status(201).json(result);
    } catch (e) {
      res.status(400).json({ error: 'Invalid telemetry data' });
    }
  }

  async getBySensor(req: Request, res: Response) {
    const result = await repo.findBySensor(req.params.sensorId);
    res.json(result);
  }

   async getLatestByStation(req: Request, res: Response) {
    try {
      const { stationId } = req.params;
      
      const result = await repo.findLatestByStation(stationId);
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch station telemetry' });
    }
  }
}