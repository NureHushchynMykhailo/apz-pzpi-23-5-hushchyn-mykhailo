import { Response, NextFunction } from 'express';
import { db } from '../config/db';
import { userStations } from '../db/schema';
import { and, eq } from 'drizzle-orm';
import { AuthRequest } from './authMiddleware'; 

/**
 *  ПЕРЕВІРКА ВЛАСНОСТІ (Специфічна для станцій)
 * Перевіряє, чи закріплений технік за конкретною станцією.
 * Адміни та менеджери пропускаються автоматично.
 */
export const checkStationAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const role = req.user?.role;
  
  // ID станції може бути в URL (params) або в тілі запиту (body)
  const stationId = req.params.id || req.body.stationId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!stationId) {
    return res.status(400).json({ error: 'Station ID is missing' });
  }


  if (role === 'admin' || role === 'manager') {
    return next();
  }


  try {
    const assignment = await db
      .select()
      .from(userStations)
      .where(
        and(
          eq(userStations.userId, userId),
          eq(userStations.stationId, stationId)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      return res.status(403).json({ 
        error: 'Access Denied: You are not assigned to this station.' 
      });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error while checking station access' });
  }
};