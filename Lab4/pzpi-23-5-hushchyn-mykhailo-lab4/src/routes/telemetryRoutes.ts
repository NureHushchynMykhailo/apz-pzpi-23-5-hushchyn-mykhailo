import { Router } from 'express';
import { TelemetryController } from '../controllers/telemetryController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();
const controller = new TelemetryController();

/**
 * @swagger
 * tags:
 *   - name: Telemetry
 *     description: Time-series data from sensors
 */

/**
 * @swagger
 * /telemetry:
 *   post:
 *     summary: Send telemetry data
 *     tags:
 *       - Telemetry
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sensorId
 *               - value
 *             properties:
 *               sensorId:
 *                 type: string
 *                 format: uuid
 *               value:
 *                 type: number
 *               measuredAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional ISO date
 *     responses:
 *       201:
 *         description: Data recorded
 */
router.post(
  '/',
  authenticateToken,
  controller.add
);

/**
 * @swagger
 * /telemetry/sensor/{sensorId}:
 *   get:
 *     summary: Get latest telemetry for sensor (limit 100)
 *     tags:
 *       - Telemetry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sensorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of data points
 */
router.get(
  '/sensor/:sensorId',
  authenticateToken,
  controller.getBySensor
);
/**
 * @swagger
 * /telemetry/station/{stationId}/latest:
 *   get:
 *     summary: Get LATEST reading for EACH sensor on a station
 *     description: >
 *       Returns a snapshot of the station's current status (Dashboard view).
 *       Includes sensor type, parameter name, and units.
 *     tags:
 *       - Telemetry
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Array of latest sensor readings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   sensorId:
 *                     type: string
 *                   type:
 *                     type: string
 *                     example: ph_meter
 *                   parameterName:
 *                     type: string
 *                     example: Acidity
 *                   unit:
 *                     type: string
 *                     example: pH
 *                   value:
 *                     type: number
 *                     example: 7.2
 *                   measuredAt:
 *                     type: string
 *                     format: date-time
 */
router.get(
  '/station/:stationId/latest',
  authenticateToken,
  controller.getLatestByStation
);

export default router;
