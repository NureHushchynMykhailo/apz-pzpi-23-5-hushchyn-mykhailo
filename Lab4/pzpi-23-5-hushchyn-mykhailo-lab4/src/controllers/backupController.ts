import { Request, Response } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import { URL } from 'url';

export class BackupController {

  /**
   * Допоміжна приватна функція для очищення URL
   */
  private getCleanDbUrl(): string {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL is missing');

    try {
      const parsed = new URL(dbUrl);
      parsed.search = ''; 
      return parsed.toString();
    } catch (e) {
      return dbUrl;
    }
  }
  
  createBackup = async (req: Request, res: Response) => {
    try {
      const connectionString = this.getCleanDbUrl();

      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-full-${date}.sql`;

      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'application/sql');

      console.log('Починаємо створення повного бекапу...');

      const dumpProcess = spawn('pg_dump', [
        connectionString,
        '--clean',     
        '--if-exists'  
      ]);

      dumpProcess.stdout.pipe(res);

      dumpProcess.stderr.on('data', (data) => {
        console.error(`pg_dump error: ${data}`);
      });

      dumpProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`pg_dump завершився з кодом ${code}`);
        } else {
          console.log('Повний бекап успішно створено.');
        }
      });

    } catch (e) {
      console.error(e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Помилка при створенні бекапу' });
      }
    }
  }

  createTelemetryBackup = async (req: Request, res: Response) => {
    try {
      const connectionString = this.getCleanDbUrl();

      const date = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-telemetry-${date}.sql`;

      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'application/sql');

      console.log('Починаємо створення бекапу телеметрії та логів...');

    
      const dumpProcess = spawn('pg_dump', [
        connectionString,
        '--clean',
        '--if-exists',
        '-t', 'telemetry',       
        '-t', 'controller_logs'  
      ]);

      dumpProcess.stdout.pipe(res);

      dumpProcess.stderr.on('data', (data) => {
        console.error(`pg_dump (telemetry) error: ${data}`);
      });

      dumpProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`pg_dump завершився з кодом ${code}`);
        } else {
          console.log('Бекап телеметрії успішно створено.');
        }
      });

    } catch (e) {
      console.error(e);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Помилка при створенні бекапу телеметрії' });
      }
    }
  }

  restoreBackup = async (req: Request, res: Response) => {
    const file = (req as any).file;
    try {
      if (!file) {
        return res.status(400).json({ error: 'Файл не завантажено' });
      }

      const connectionString = this.getCleanDbUrl();
      const filePath = file.path;

      console.log(`Починаємо відновлення з файлу: ${filePath}`);

      const psqlProcess = spawn('psql', [connectionString]);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(psqlProcess.stdin);

      psqlProcess.stderr.on('data', (data) => {
        console.log(`psql log: ${data}`); 
      });

      psqlProcess.on('close', (code) => {

        fs.unlink(filePath, (err) => {
          if (err) console.error('Не вдалося видалити тимчасовий файл:', err);
        });

        if (code === 0) {
          console.log('Базу даних успішно відновлено.');
          res.json({ message: 'Базу даних успішно відновлено' });
        } else {
          console.error(`psql завершився з кодом ${code}`);
          res.status(500).json({ error: 'Помилка при відновленні (див. консоль)' });
        }
      });

    } catch (e) {
      console.error(e);
      if (file) {
         fs.unlink(file.path, () => {}); 
      }
      res.status(500).json({ error: 'Критична помилка відновлення' });
    }
  }
}