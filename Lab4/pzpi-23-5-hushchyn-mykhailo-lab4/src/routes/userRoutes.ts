import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';

const router = Router();
const controller = new UserController();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Керування користувачами та автентифікація
 */

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Отримати профіль поточного користувача
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Дані профілю користувача
 *       401:
 *         description: Неавторизовано
 *       404:
 *         description: Користувача не знайдено
 */
router.get(
  '/profile',
  authenticateToken,
  controller.getProfile
);

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Оновити власний профіль (пошта, пароль, нік)
 *     description: Дозволяє поточному користувачу змінити свої власні дані. Можна надсилати лише ті поля, які потрібно змінити.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Нова електронна пошта
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Новий пароль
 *               fullName:
 *                 type: string
 *                 description: Нове ім'я або нікнейм
 *     responses:
 *       200:
 *         description: Профіль успішно оновлено
 *       400:
 *         description: Помилка валідації або email вже зайнятий
 *       401:
 *         description: Неавторизовано
 */
router.put(
  '/profile',
  authenticateToken,
  controller.updateOwnProfile
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Отримати всіх користувачів (Лише для Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список усіх користувачів
 *       403:
 *         description: Заборонено - потрібен доступ рівня Admin
 */
router.get(
  '/',
  authenticateToken,
  authorizeRole(['admin']),
  controller.getAllUsers
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Оновити профіль користувача (Лише для Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID користувача
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 description: Повне ім'я користувача
 *               role:
 *                 type: string
 *                 enum: [admin, manager, technician, analyst, viewer]
 *                 description: Роль користувача
 *     responses:
 *       200:
 *         description: Профіль успішно оновлено
 *       400:
 *         description: Помилка валідації
 *       403:
 *         description: Заборонено - потрібен доступ рівня Admin
 *       404:
 *         description: Користувача не знайдено
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRole(['admin']),
  controller.updateUser
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Видалити користувача за ID (Лише для Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID користувача
 *     responses:
 *       200:
 *         description: Користувача успішно видалено
 *       403:
 *         description: Заборонено - потрібен доступ рівня Admin
 *       404:
 *         description: Користувача не знайдено
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole(['admin']),
  controller.deleteUser
);

export default router;