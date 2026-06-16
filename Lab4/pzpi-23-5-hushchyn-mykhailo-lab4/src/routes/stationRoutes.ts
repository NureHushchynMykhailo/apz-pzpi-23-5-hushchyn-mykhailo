import { Router } from 'express';
import { StationController } from '../controllers/stationController';
import { checkStationAccess } from '../middlewares/stationMiddleware';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';

const router = Router();
const controller = new StationController();

/**
 * @swagger
 * tags:
 *   name: Stations
 *   description: Керування IoT станціями, призначення та підписки
 */

/**
 * @swagger
 * /stations:
 *   post:
 *     summary: Створити нову станцію
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, offline, maintenance]
 *     responses:
 *       201:
 *         description: Станцію успішно створено
 */
router.post(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'manager']),
  controller.create
);

/**
 * @swagger
 * /stations:
 *   get:
 *     summary: Отримати всі станції
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список усіх станцій
 */
router.get(
  '/',
  authenticateToken,
  controller.getAll
);

/**
 * @swagger
 * /stations/my:
 *   get:
 *     summary: Отримати мої станції (призначені або підписки)
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список станцій користувача
 */
router.get(
  '/my',
  authenticateToken,
  controller.getMyStations
);

// --- РОУТИ ПІДПИСКИ (ДЛЯ ЗВИЧАЙНИХ КОРИСТУВАЧІВ) ---

/**
 * @swagger
 * /stations/subscriptions:
 *   get:
 *     summary: Отримати список підписок користувача
 *     description: Повертає список станцій, на які підписаний поточний користувач (зручно для відображення на головній сторінці viewer).
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Масив станцій, на які оформлена підписка
 */
router.get(
  '/subscriptions',
  authenticateToken,
  controller.getSubscriptions
);

/**
 * @swagger
 * /stations/{id}/subscribe:
 *   post:
 *     summary: Підписатися на станцію
 *     description: Додає станцію до списку "моїх станцій".
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       201:
 *         description: Успішно підписано
 *       409:
 *         description: Ви вже підписані на цю станцію
 */
router.post(
  '/:id/subscribe',
  authenticateToken,
  controller.subscribe
);

/**
 * @swagger
 * /stations/{id}/unsubscribe:
 *   delete:
 *     summary: Відписатися від станції
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Успішно відписано
 */
router.delete(
  '/:id/unsubscribe',
  authenticateToken,
  controller.unsubscribe
);

/**
 * @swagger
 * /stations/{id}/dashboard:
 *   get:
 *     summary: Дашборд станції (Показники, Алерти, Інфо)
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Дані дашборду
 */
router.get(
  '/:id/dashboard',
  authenticateToken,
  checkStationAccess,
  controller.getDashboard
);

// --- РОУТИ CRUD ТА ПРИЗНАЧЕННЯ АДМІНІСТРАТОРОМ ---

/**
 * @swagger
 * /stations/{id}:
 *   put:
 *     summary: Оновити дані станції
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, offline, maintenance]
 *     responses:
 *       200:
 *         description: Оновлено успішно
 */
router.put(
  '/:id',
  authenticateToken,
  authorizeRole(['admin', 'manager']),
  controller.update
);

/**
 * @swagger
 * /stations/{id}:
 *   delete:
 *     summary: Видалити станцію
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Видалено успішно
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole(['admin']),
  controller.delete
);

/**
 * @swagger
 * /stations/{id}:
 *   get:
 *     summary: Отримати деталі станції (за ID)
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Дані станції
 */
router.get(
  '/:id',
  authenticateToken,
  checkStationAccess,
  controller.getById
);

/**
 * @swagger
 * /stations/assign:
 *   post:
 *     summary: Призначити користувача на станцію
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, stationId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               stationId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Успішно призначено
 */
router.post(
  '/assign',
  authenticateToken,
  authorizeRole(['admin', 'manager']),
  controller.assignUser
);

/**
 * @swagger
 * /stations/unassign:
 *   post:
 *     summary: Відкріпити користувача від станції
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, stationId]
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               stationId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Відкріплено
 */
router.post(
  '/unassign',
  authenticateToken,
  authorizeRole(['admin', 'manager']),
  controller.unassignUser
);

/**
 * @swagger
 * /stations/{id}/users:
 *   get:
 *     summary: Отримати користувачів станції
 *     tags: [Stations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Список користувачів
 */
router.get(
  '/:id/users',
  authenticateToken,
  authorizeRole(['admin', 'manager']),
  controller.getAssignedUsers
);

export default router;