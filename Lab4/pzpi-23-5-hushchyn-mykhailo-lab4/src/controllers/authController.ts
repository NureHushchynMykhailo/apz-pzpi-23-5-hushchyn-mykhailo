import { Request, Response } from 'express';
import { UserRepository } from '../repositories/userRepository';
import { hashPassword, comparePasswords, generateToken } from '../utils/jwt';
import { z } from 'zod';

const userRepo = new UserRepository();

// Схема валідації Zod
const registerSchema = z.object({
  email: z.string().email("Некоректний формат email"),
  password: z.string().min(6, "Пароль має бути не менше 6 символів"),
  fullName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'technician', 'analyst', 'viewer']).optional()
});

const loginSchema = z.object({
  email: z.string().email("Некоректний формат email"),
  password: z.string().min(1, "Пароль обов'язковий")
});

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      // 1. Валідація вхідних даних
      const validatedData = registerSchema.parse(req.body);
      
      // 2. Перевірка на існуючого користувача
      const existing = await userRepo.findByEmail(validatedData.email);
      if (existing) {
        return res.status(400).json({ error: 'Користувач з таким email вже існує' });
      }

      // 3. Хешування пароля
      const hashedPassword = await hashPassword(validatedData.password);
      
      /**
       * КРИТИЧНЕ ВИПРАВЛЕННЯ:
       * Ми маємо передати в базу даних об'єкт БЕЗ поля 'password', 
       * оскільки в таблиці 'users' такого стовпця немає.
       */
      const { password, ...dbData } = validatedData;
      
      // 4. Створення запису в БД
      const user = await userRepo.create({
        ...dbData,
        passwordHash: hashedPassword
      });

      return res.status(201).json({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      });

    } catch (e) {
      // Виводимо помилку в консоль сервера, щоб ви бачили реальну причину (наприклад, помилку БД)
      console.error("DEBUG REGISTER ERROR:", e);

      if (e instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Помилка валідації даних', 
          details: e.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }

      // Якщо помилка сталася в БД, тепер ми повернемо її опис (тільки для розробки!)
      return res.status(400).json({ 
        error: 'Реєстрація не вдалася',
        message: e instanceof Error ? e.message : String(e)
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await userRepo.findByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ error: 'Невірні дані для входу' });
      }

      const isMatch = await comparePasswords(validatedData.password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Невірні дані для входу' });
      }

      const token = generateToken({ id: user.id, role: user.role || 'viewer' });
      
      return res.json({ 
        token, 
        user: { id: user.id, email: user.email, role: user.role } 
      });
    } catch (e) {
      console.error("DEBUG LOGIN ERROR:", e);

      if (e instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Помилка валідації', 
          details: e.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }
      return res.status(400).json({ error: 'Помилка авторизації' });
    }
  }
}