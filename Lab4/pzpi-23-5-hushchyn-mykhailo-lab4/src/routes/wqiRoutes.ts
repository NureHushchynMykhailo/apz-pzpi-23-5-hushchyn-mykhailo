import { Router } from 'express';

import { authenticateToken } from '../middlewares/authMiddleware';
import { WqiController } from '../controllers/wqiController';

const router = Router();
const controller = new WqiController();

/**
 * @swagger
 * tags:
 *   name: Water Quality Index
 *   description: Аналітика Індексу Якості Води (WQI)
 */

/**
 * @swagger
 * /wqi/station/{stationId}:
 *   get:
 *     summary: Отримати показник WQI для станції
 *     description: Автоматично розраховує Індекс Якості Води (WQI) на основі останніх показників сенсорів (pH, розчинений кисень, каламутність тощо).
 *     tags: [Water Quality Index]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID станції
 *     responses:
 *       200:
 *         description: Успішний розрахунок WQI
 *         content:
 *           application/json:
 *             example:
 *               status: "success"
 *               wqi: 34.5
 *               category: "Добра"
 *               description: "Вода хорошої якості."
 *               parametersUsed:
 *                 - type: "ph_meter"
 *                   value: 7.4
 *                   qi: 26.67
 *                   weight: 0.22
 *                 - type: "do_meter"
 *                   value: 8.5
 *                   qi: 63.54
 *                   weight: 0.22
 *       404:
 *         description: Недостатньо даних (відсутня телеметрія для основних сенсорів)
 */
router.get(
  '/station/:stationId',
  authenticateToken,
  controller.getStationWqi
);

export default router;