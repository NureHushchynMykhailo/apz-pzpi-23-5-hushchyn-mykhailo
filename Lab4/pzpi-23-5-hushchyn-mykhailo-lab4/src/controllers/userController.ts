import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { AuthRequest } from '../middlewares/authMiddleware';
import { hashPassword } from '../utils/jwt';
import { z } from 'zod';

const userRepo = new UserRepository();

// Схема для оновлення користувача адміністратором
const updateByAdminSchema = z.object({
  fullName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'technician', 'analyst', 'viewer']).optional()
});

// Схема для оновлення власного профілю користувачем
const updateOwnProfileSchema = z.object({
  email: z.string().email("Некоректний формат email").optional(),
  password: z.string().min(6, "Пароль має бути не менше 6 символів").optional(),
  fullName: z.string().min(2, "Нік/Ім'я має містити мінімум 2 символи").optional()
});

export class UserController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await userRepo.findById(req.user!.id);
      if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });

      res.json({ 
        id: user.id, 
        email: user.email, 
        fullName: user.fullName, 
        role: user.role,
        createdAt: user.createdAt 
      });
    } catch (e) {
      res.status(500).json({ error: 'Помилка сервера' });
    }
  }

  // --- НОВИЙ МЕТОД ДЛЯ ОНОВЛЕННЯ ВЛАСНОГО ПРОФІЛЮ ---
  async updateOwnProfile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const data = updateOwnProfileSchema.parse(req.body);

      // Якщо передано порожній об'єкт
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'Не передано даних для оновлення' });
      }

      const updatePayload: any = {};

      if (data.fullName) {
        updatePayload.fullName = data.fullName;
      }

      // Перевірка, чи не зайнятий email, якщо користувач хоче його змінити
      if (data.email) {
        const existingUser = await userRepo.findByEmail(data.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: 'Цей email вже використовується іншим користувачем' });
        }
        updatePayload.email = data.email;
      }

      // Хешування нового пароля
      if (data.password) {
        updatePayload.passwordHash = await hashPassword(data.password);
      }

      const updatedUser = await userRepo.update(userId, updatePayload);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'Користувача не знайдено' });
      }

      res.json({
        message: 'Ваш профіль успішно оновлено',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role
        }
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Помилка валідації', 
          details: e.issues.map(i => ({ field: i.path[0], message: i.message })) 
        });
      }
      res.status(500).json({ error: 'Не вдалося оновити профіль' });
    }
  }

  async getAllUsers(req: Request, res: Response) {
    try {
      const all = await userRepo.findAll();
      res.json(all);
    } catch (e) {
      res.status(500).json({ error: 'Не вдалося отримати користувачів' });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = updateByAdminSchema.parse(req.body);
      
      const updatedUser = await userRepo.update(id, data);
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'Користувача не знайдено' });
      }

      res.json({
        message: 'Профіль успішно оновлено',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          role: updatedUser.role
        }
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Помилка валідації', 
          details: e.issues.map(i => ({ field: i.path[0], message: i.message })) 
        });
      }
      res.status(500).json({ error: 'Не вдалося оновити користувача' });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const deleted = await userRepo.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Користувача не знайдено' });
      res.json({ message: 'Користувача успішно видалено' });
    } catch (e) {
      res.status(500).json({ error: 'Не вдалося видалити користувача' });
    }
  }
}