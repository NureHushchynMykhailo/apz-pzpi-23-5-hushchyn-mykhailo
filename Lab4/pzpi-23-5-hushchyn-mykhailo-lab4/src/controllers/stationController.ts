import { Response } from 'express';
import { StationRepository } from '../repositories/stationRepository';
import { AuthRequest } from '../middlewares/authMiddleware';
import { z } from 'zod';

const stationRepo = new StationRepository();

const stationSchema = z.object({
  name: z.string().min(2, 'Назва має містити щонайменше 2 символи'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  status: z.enum(['active', 'offline', 'maintenance']).optional(),
});

const assignSchema = z.object({
  userId: z.string().uuid(),
  stationId: z.string().uuid(),
});

export class StationController {
  async create(req: AuthRequest, res: Response) {
    try {
      const data = stationSchema.parse(req.body);
      const newStation = await stationRepo.create(data);
      res.status(201).json(newStation);
    } catch (e) {
      if (e instanceof z.ZodError) {
         return res.status(400).json({ error: 'Помилка валідації', details: e.issues });
      }
      res.status(500).json({ error: 'Не вдалося створити станцію' });
    }
  }

  async getAll(req: AuthRequest, res: Response) {
    try {
      const result = await stationRepo.findAll();
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: 'Не вдалося завантажити станції' });
    }
  }

  async getMyStations(req: AuthRequest, res: Response) {
      try {
          const userId = req.user!.id;
          const result = await stationRepo.findByUserId(userId);
          res.json(result);
      } catch (e) {
          res.status(500).json({ error: 'Не вдалося завантажити ваші станції' });
      }
  }

  async getById(req: AuthRequest, res: Response) {
      try {
          const station = await stationRepo.findById(req.params.id);
          if (!station) return res.status(404).json({ error: 'Станцію не знайдено' });
          res.json(station);
      } catch (e) {
          res.status(500).json({ error: 'Не вдалося завантажити станцію' });
      }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const data = stationSchema.parse(req.body);
      const updated = await stationRepo.update(req.params.id, data);
      if (!updated) return res.status(404).json({ error: 'Станцію не знайдено' });
      res.json(updated);
    } catch (e) {
      res.status(400).json({ error: 'Помилка валідації' });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const deleted = await stationRepo.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Станцію не знайдено' });
      res.json({ message: 'Успішно видалено', id: req.params.id });
    } catch (e) {
      res.status(500).json({ error: 'Не вдалося видалити станцію' });
    }
  }

  // --- МЕТОДИ ДЛЯ ПІДПИСКИ (ЗВИЧАЙНІ КОРИСТУВАЧІ) ---

  async subscribe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id; // ID поточного користувача з токена
      const stationId = req.params.id;

      // Перевіряємо чи існує станція
      const station = await stationRepo.findById(stationId);
      if (!station) return res.status(404).json({ error: 'Станцію не знайдено' });

      const alreadyAssigned = await stationRepo.isUserAssigned(userId, stationId);
      if (alreadyAssigned) return res.status(409).json({ error: 'Ви вже підписані на цю станцію' });
      
      await stationRepo.assignUser(userId, stationId);
      res.status(201).json({ message: 'Ви успішно підписалися на оновлення станції' });
    } catch (e) {
      res.status(500).json({ error: 'Помилка підписки' });
    }
  }

  async getSubscriptions(req: AuthRequest, res: Response) {
      try {
          const userId = req.user!.id;
          // Використовуємо той самий метод репозиторію, оскільки підписки зберігаються в user_stations
          const result = await stationRepo.findByUserId(userId);
          res.json(result);
      } catch (e) {
          res.status(500).json({ error: 'Не вдалося завантажити список підписок' });
      }
  }

  async unsubscribe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const stationId = req.params.id;
      
      await stationRepo.unassignUser(userId, stationId);
      res.json({ message: 'Ви відписалися від станції' });
    } catch (e) {
      res.status(500).json({ error: 'Помилка відписки' });
    }
  }

  async getDashboard(req: AuthRequest, res: Response) {
    try {
      const stationId = req.params.id;
      const dashboardData = await stationRepo.getStationDashboard(stationId);
      
      if (!dashboardData.station) {
        return res.status(404).json({ error: 'Станцію не знайдено' });
      }

      res.json(dashboardData);
    } catch (e) {
      console.error("Dashboard Error:", e);
      res.status(500).json({ error: 'Не вдалося завантажити дашборд станції' });
    }
  }

  // --- МЕТОДИ ПРИЗНАЧЕННЯ ДЛЯ АДМІНІВ ---

  async assignUser(req: AuthRequest, res: Response) {
    try {
      const { userId, stationId } = assignSchema.parse(req.body);
      const alreadyAssigned = await stationRepo.isUserAssigned(userId, stationId);
      if (alreadyAssigned) return res.status(409).json({ error: 'Користувач вже призначений на цю станцію' });
      
      await stationRepo.assignUser(userId, stationId);
      res.status(201).json({ message: 'Користувача успішно призначено' });
    } catch (e) {
      res.status(400).json({ error: 'Невірні дані для призначення' });
    }
  }

  async unassignUser(req: AuthRequest, res: Response) {
    try {
      const { userId, stationId } = assignSchema.parse(req.body);
      await stationRepo.unassignUser(userId, stationId);
      res.json({ message: 'Користувача відкріплено' });
    } catch (e) {
      res.status(400).json({ error: 'Невірні дані для відкріплення' });
    }
  }

  async getAssignedUsers(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const users = await stationRepo.findAssignedUsersByStation(id);
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Не вдалося отримати призначених користувачів' });
    }
  }
}