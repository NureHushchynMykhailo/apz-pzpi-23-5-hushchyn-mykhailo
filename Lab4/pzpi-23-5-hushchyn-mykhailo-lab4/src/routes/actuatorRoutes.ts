import { Router } from 'express';
import { ActuatorController } from '../controllers/actuatorController';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';

const router = Router();
const controller = new ActuatorController();

/**
 * @swagger
 * tags:
 *   name: Actuators
 *   description: Management of Controllers (Pumps, Fans) and their logs
 */

// --- DEVICE CRUD ---

/**
 * @swagger
 * /actuators/station/{stationId}:
 *   get:
 *     summary: Get all actuators on a station
 *     tags: [Actuators]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: stationId
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: List of devices
 */
router.get(
  '/station/:stationId',
  authenticateToken,
  controller.getByStation
);

/**
 * @swagger
 * /actuators:
 *   post:
 *     summary: Create new actuator (Admin/Manager)
 *     tags: [Actuators]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stationId, name, type]
 *             properties:
 *               stationId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [aerator, filter, reagent_dispenser, pump]
 *               isActive:
 *                 type: boolean
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
 * /actuators/{id}:
 *   patch:
 *     summary: Update actuator (e.g. switch ON/OFF)
 *     tags: [Actuators]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
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
 * /actuators/{id}:
 *   delete:
 *     summary: Delete actuator (Admin)
 *     tags: [Actuators]
 *     security: [{ bearerAuth: [] }]
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
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole(['admin']),
  controller.delete
);

// --- LOGS / HISTORY ---

/**
 * @swagger
 * /actuators/log:
 *   post:
 *     summary: Register device state (Duty Cycle)
 *     tags: [Actuators]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [controllerId, activationPercentage]
 *             properties:
 *               controllerId:
 *                 type: string
 *                 format: uuid
 *               activationPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               statusMessage:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Logged
 */
router.post(
  '/log',
  authenticateToken,
  controller.registerState
);

/**
 * @swagger
 * /actuators/{id}/history:
 *   get:
 *     summary: Get operation history for actuator
 *     tags: [Actuators]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     responses:
 *       200:
 *         description: History logs
 */
router.get(
  '/:id/history',
  authenticateToken,
  controller.getHistory
);
/**
 * @swagger
 * /actuators/station/{stationId}/latest:
 *   get:
 *     summary: Get LIVE state of all active actuators on a station
 *     description: >
 *       Returns a snapshot of what each device is doing right now
 *       (based on the last log entry).
 *     tags:
 *       - Actuators
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
 *         description: Array of device states
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                     example: pump
 *                   lastUpdate:
 *                     type: string
 *                     format: date-time
 *                   activationPercentage:
 *                     type: string
 *                     example: "100.00"
 *                   statusMessage:
 *                     type: string
 *                     example: "Pumping"
 */
router.get(
  '/station/:stationId/latest',
  authenticateToken,
  controller.getLatestStateByStation
);




/**
 * @swagger
 * /actuators/{id}:
 *   patch:
 *     summary: Оновити стан актуатора (Керування)
 *     description: Дозволяє змінити статус (isActive) та встановити відсоток увімкнення.
 *     tags: [Actuators]
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
 *               isActive:
 *                 type: boolean
 *                 description: Увімкнути чи вимкнути пристрій
 *               activationPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Відсоток потужності/увімкнення
 *     responses:
 *       200:
 *         description: Успішно оновлено
 *       400:
 *         description: Помилка валідації
 */
router.patch(
  '/:id',
  authenticateToken,
  authorizeRole(['admin', 'manager', 'technician']),
  controller.update
);


export default router;