import { db } from '../config/db';
import { stationThresholds } from '../db/schema';
import { eq } from 'drizzle-orm';

export class ThresholdRepository {
  async findByStation(stationId: string) {
    return await db.select().from(stationThresholds).where(eq(stationThresholds.stationId, stationId));
  }

  async create(data: any) {
    const res = await db.insert(stationThresholds).values(data).returning();
    return res[0];
  }

  async update(id: string, data: any) {
    const res = await db.update(stationThresholds).set(data).where(eq(stationThresholds.id, id)).returning();
    return res[0];
  }

  async delete(id: string) {
    const res = await db.delete(stationThresholds).where(eq(stationThresholds.id, id)).returning();
    return res[0];
  }
}