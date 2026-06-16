import { Router } from 'express';
import { ThresholdController } from '../controllers/thresholdController';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';

const router = Router();
const controller = new ThresholdController();

/**
 * @swagger
 * tags:
 *   - name: Thresholds
 *     description: Alert limits for stations
 */

/**
 * @swagger
 * /thresholds/station/{stationId}:
 *   get:
 *     summary: Get thresholds for a station
 *     tags:
 *       - Thresholds
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
 *         description: List of thresholds
 */
router.get(
 '/station/:stationId',
 authenticateToken,
 controller.getByStation
);

/**
 * @swagger
 * /thresholds:
 *   post:
 *     summary: Set threshold (Admin/Manager)
 *     tags:
 *       - Thresholds
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
 *               minWarning:
 *                 type: number
 *               maxWarning:
 *                 type: number
 *               minCritical:
 *                 type: number
 *               maxCritical:
 *                 type: number
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/',
  authenticateToken,
  authorizeRole(['admin', 'manager']),
  controller.create
);

/**
 * @swagger
 * /thresholds/{id}:
 *   patch:
 *     summary: Update threshold (Admin/Manager)
 *     tags:
 *       - Thresholds
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
 *               minWarning:
 *                 type: number
 *               maxWarning:
 *                 type: number
 *               minCritical:
 *                 type: number
 *               maxCritical:
 *                 type: number
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
 * /thresholds/{id}:
 *   delete:
 *     summary: Delete threshold
 *     tags:
 *       - Thresholds
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
  authorizeRole(['admin', 'manager']),
  controller.delete
);

export default router;
