import { db } from '../config/db';
import { sensors } from '../db/schema';
import { eq } from 'drizzle-orm';

export class SensorRepository {
  async findAll() {
    return await db.select().from(sensors);
  }

  async findByStation(stationId: string) {
    return await db.select().from(sensors).where(eq(sensors.stationId, stationId));
  }

  async create(data: any) {
    const res = await db.insert(sensors).values(data).returning();
    return res[0];
  }

  async update(id: string, data: any) {
    const res = await db.update(sensors).set(data).where(eq(sensors.id, id)).returning();
    return res[0];
  }

  async delete(id: string) {
    const res = await db.delete(sensors).where(eq(sensors.id, id)).returning();
    return res[0];
  }
}