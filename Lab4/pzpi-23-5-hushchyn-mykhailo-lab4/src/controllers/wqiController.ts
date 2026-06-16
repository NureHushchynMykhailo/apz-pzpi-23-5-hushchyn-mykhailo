import { WqiService } from '../services/wqiService';
import { Request, Response } from 'express';

const wqiService = new WqiService();

const toStringParam = (value: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export class WqiController {
  async getStationWqi(req: Request, res: Response) {
    try {
      const stationIdRaw = req.params.stationId;

      if (!stationIdRaw) {
        return res.status(400).json({ error: 'stationId is required' });
      }

      const stationId = toStringParam(stationIdRaw);

      const result = await wqiService.calculateStationWqi(stationId);

      if (result.status === 'no_data') {
        return res.status(404).json({ error: result.message });
      }

      return res.json(result);
    } catch (error) {
      console.error('Помилка при розрахунку WQI:', error);
      return res.status(500).json({ error: 'Внутрішня помилка сервера при розрахунку WQI' });
    }
  }
}