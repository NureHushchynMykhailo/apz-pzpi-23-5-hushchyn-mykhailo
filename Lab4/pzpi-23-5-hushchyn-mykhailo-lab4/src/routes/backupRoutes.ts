import { Router } from 'express';
import { BackupController } from '../controllers/backupController';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware';
import multer from 'multer';
import os from 'os';

const router = Router();
const controller = new BackupController();

// Налаштування multer для збереження файлу відновлення у тимчасову папку
const upload = multer({ dest: os.tmpdir() });

/**
 * @swagger
 * tags:
 *   - name: Backups
 *     description: Database Backup & Restore management (Admin Only)
 */

/**
 * @swagger
 * /backups/full:
 *   get:
 *     summary: Download FULL database backup (.sql)
 *     description: Exports schema and all data from all tables.
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SQL file stream
 *         content:
 *           application/sql:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get(
  '/full', 
  authenticateToken, 
  authorizeRole(['admin']), 
  controller.createBackup
);

/**
 * @swagger
 * /backups/telemetry:
 *   get:
 *     summary: Download Telemetry & Logs backup only (.sql)
 *     description: Exports only 'telemetry' and 'controller_logs' tables. Useful for archiving heavy data.
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SQL file stream
 *         content:
 *           application/sql:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Forbidden (Admin only)
 */
router.get(
  '/telemetry', 
  authenticateToken, 
  authorizeRole(['admin']), 
  controller.createTelemetryBackup
);

/**
 * @swagger
 * /backups/restore:
 *   post:
 *     summary: Restore database from .sql file
 *     description: Accepts both full backups and partial telemetry backups. WARNING! This process drops existing tables before recreation.
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The .sql backup file
 *     responses:
 *       200:
 *         description: Restore successful
 *       400:
 *         description: File missing
 *       500:
 *         description: Restore failed
 */
router.post(
  '/restore', 
  authenticateToken, 
  authorizeRole(['admin']), 
  upload.single('file'), 
  controller.restoreBackup
);

export default router;
