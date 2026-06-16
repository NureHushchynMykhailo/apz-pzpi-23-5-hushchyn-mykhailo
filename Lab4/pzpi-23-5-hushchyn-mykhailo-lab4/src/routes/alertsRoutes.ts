import { Router } from 'express';
import { AlertController } from '../controllers/alertController';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';

const router = Router();
const controller = new AlertController();

/**
 * @swagger
 * tags:
 *   - name: Alerts
 *     description: System warnings and critical events management
 */

/**
 * @swagger
 * /alerts/active:
 *   get:
 *     summary: Get all ACTIVE (unresolved) alerts
 *     tags: [Alerts]
 *     security: 
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active alerts
 */
router.get('/active', authenticateToken, controller.getActive);

/**
 * @swagger
 * /alerts/station/{stationId}:
 *   get:
 *     summary: Get alert history for a station
 *     tags: [Alerts]
 *     security: 
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: List of alerts
 */
router.get('/station/:stationId', authenticateToken, controller.getByStation);

/**
 * @swagger
 * /alerts:
 *   post:
 *     summary: Manually create an alert (System/Admin)
 *     tags: [Alerts]
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
 *               - type
 *               - targetRole
 *               - message
 *             properties:
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               type:
 *                 type: string
 *                 enum: [warning, critical]
 *               targetRole:
 *                 type: string
 *                 enum: [technician, manager, admin]
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Alert created
 */
router.post('/', authenticateToken, authorizeRole(['admin', 'manager']), controller.create);

/**
 * @swagger
 * /alerts/{id}/resolve:
 *   patch:
 *     summary: Mark alert as RESOLVED
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: Alert resolved
 */
router.patch('/:id/resolve', authenticateToken, authorizeRole(['admin', 'manager', 'technician']), controller.resolve);

/**
 * @swagger
 * /alerts/{id}:
 *   delete:
 *     summary: Delete alert record (Admin only)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', authenticateToken, authorizeRole(['admin']), controller.delete);

export default router;
