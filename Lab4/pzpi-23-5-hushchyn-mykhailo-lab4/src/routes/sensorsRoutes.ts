import { Router } from 'express';
import { SensorController } from '../controllers/sensorController';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';

const router = Router();
const controller = new SensorController();

/**
 * @swagger
 * tags:
 *   - name: Sensors
 *     description: Physical sensors hardware
 */

/**
 * @swagger
 * /sensors/station/{stationId}:
 *   get:
 *     summary: Get sensors by station
 *     tags:
 *       - Sensors
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
 *         description: List of sensors
 */
router.get(
  '/station/:stationId',
  authenticateToken,
  controller.getByStation
);

/**
 * @swagger
 * /sensors:
 *   post:
 *     summary: Add sensor (Admin/Technician)
 *     tags:
 *       - Sensors
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stationId
 *               - parameterId
 *             properties:
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               parameterId:
 *                 type: string
 *                 format: uuid
 *               model:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'technician']),
  controller.create
);

/**
 * @swagger
 * /sensors/{id}:
 *   patch:
 *     summary: Update sensor
 *     tags:
 *       - Sensors
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               model:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated
 */
router.patch(
  '/:id',
  authenticateToken,
  authorizeRole(['admin', 'manager']),
  controller.update
);

/**
 * @swagger
 * /sensors/{id}:
 *   delete:
 *     summary: Delete sensor (Admin only)
 *     tags:
 *       - Sensors
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
 *         description: Deleted
 */
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole(['admin']),
  controller.delete
);

export default router;
