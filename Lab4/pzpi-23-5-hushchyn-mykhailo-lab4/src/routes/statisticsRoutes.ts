import { Router } from 'express';
import { StatisticsController } from '../controllers/statisticsController';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';

const router = Router();
const controller = new StatisticsController();

const ALLOWED_ROLES = ['admin', 'manager', 'analyst'];

/**
 * @swagger
 * tags:
 *   name: Statistics
 *   description: Аналітичні звіти та агрегація даних станцій
 */

/**
 * @swagger
 * /statistics/station/{stationId}/sensors:
 *   get:
 *     summary: Отримати агреговані дані сенсорів (Мін/Макс/Сер)
 *     description: Повертає статистику по кожному сенсору за вказаний період.
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Початкова дата (за замовчуванням 24 год тому)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Кінцева дата (за замовчуванням зараз)
 *     responses:
 *       200:
 *         description: Успішно отримано статистику сенсорів
 *         content:
 *           application/json:
 *             example:
 *               period:
 *                 from: "2023-10-01T00:00:00.000Z"
 *                 to: "2023-10-02T00:00:00.000Z"
 *               data:
 *                 - sensorId: "123e4567-e89b-12d3-a456-426614174000"
 *                   sensorType: "ph_meter"
 *                   parameterName: "Рівень pH"
 *                   unit: "pH"
 *                   avgValue: 7.25
 *                   minValue: 6.8
 *                   maxValue: 7.5
 *                   readingsCount: 144
 *                 - sensorId: "987fcdeb-51a2-43d7-9012-426614174000"
 *                   sensorType: "do_meter"
 *                   parameterName: "Розчинений кисень"
 *                   unit: "mg/L"
 *                   avgValue: 5.4
 *                   minValue: 4.1
 *                   maxValue: 6.2
 *                   readingsCount: 144
 */
router.get(
  '/station/:stationId/sensors',
  authenticateToken,
  authorizeRole(ALLOWED_ROLES),
  controller.getSensorStats
);

/**
 * @swagger
 * /statistics/station/{stationId}/alerts:
 *   get:
 *     summary: Отримати статистику інцидентів (Alerts)
 *     description: Кількість попереджень та критичних помилок, згрупованих за статусом вирішення.
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Зведення по інцидентах
 *         content:
 *           application/json:
 *             example:
 *               period:
 *                 from: "2023-10-01T00:00:00.000Z"
 *                 to: "2023-10-02T00:00:00.000Z"
 *               data:
 *                 - type: "critical"
 *                   isResolved: true
 *                   count: 2
 *                 - type: "warning"
 *                   isResolved: false
 *                   count: 5
 *                 - type: "warning"
 *                   isResolved: true
 *                   count: 12
 */
router.get(
  '/station/:stationId/alerts',
  authenticateToken,
  authorizeRole(ALLOWED_ROLES),
  controller.getAlertStats
);

/**
 * @swagger
 * /statistics/station/{stationId}/actuators:
 *   get:
 *     summary: Отримати ефективність актуаторів (Середнє навантаження %)
 *     description: Статистика використання обладнання (насосів, аераторів тощо) за обраний період.
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Статистика роботи контролерів
 *         content:
 *           application/json:
 *             example:
 *               period:
 *                 from: "2023-10-01T00:00:00.000Z"
 *                 to: "2023-10-02T00:00:00.000Z"
 *               data:
 *                 - controllerId: "550e8400-e29b-41d4-a716-446655440000"
 *                   name: "Головний насос"
 *                   type: "pump"
 *                   avgLoad: 65.5
 *                   maxLoad: 100
 *                   totalLogs: 48
 *                 - controllerId: "660e8400-e29b-41d4-a716-446655441111"
 *                   name: "Дозатор хлору"
 *                   type: "dispenser_chlorine"
 *                   avgLoad: 12.0
 *                   maxLoad: 25
 *                   totalLogs: 12
 */
router.get(
  '/station/:stationId/actuators',
  authenticateToken,
  authorizeRole(ALLOWED_ROLES),
  controller.getActuatorStats
);

export default router;