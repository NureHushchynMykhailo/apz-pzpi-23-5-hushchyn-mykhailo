import { Router } from 'express';
import { ParameterController } from '../controllers/parameterController';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';

const router = Router();
const controller = new ParameterController();

/**
 * @swagger
 * tags:
 *   - name: Parameters
 *     description: Dictionary of measured parameters (pH, Temperature, etc.)
 */

/**
 * @swagger
 * /parameters:
 *   get:
 *     summary: Get all parameters
 *     tags:
 *       - Parameters
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of parameters
 */
router.get('/', authenticateToken, controller.getAll);

/**
 * @swagger
 * /parameters:
 *   post:
 *     summary: Create parameter (Admin only)
 *     tags:
 *       - Parameters
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - unit
 *             properties:
 *               code:
 *                 type: string
 *                 example: ph_val
 *               name:
 *                 type: string
 *                 example: Acidity (pH)
 *               unit:
 *                 type: string
 *                 example: pH
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/',
  authenticateToken,
  authorizeRole(['admin']),
  controller.create
);

/**
 * @swagger
 * /parameters/{id}:
 *   delete:
 *     summary: Delete parameter (Admin only)
 *     tags:
 *       - Parameters
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
