import { db } from '../config/db';
import { controllers, controllerLogs } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export class ActuatorRepository {
 
  async findByStation(stationId: string) {
    return await db
      .select()
      .from(controllers)
      .where(eq(controllers.stationId, stationId));
  }

  async findById(id: string) {
    const result = await db
      .select()
      .from(controllers)
      .where(eq(controllers.id, id))
      .limit(1);
    return result[0] || null;
  }

  async create(data: typeof controllers.$inferInsert) {
    const result = await db.insert(controllers).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<typeof controllers.$inferInsert>) {
    const result = await db
      .update(controllers)
      .set(data)
      .where(eq(controllers.id, id))
      .returning();
    return result[0];
  }


  async delete(id: string) {
    const result = await db
      .delete(controllers)
      .where(eq(controllers.id, id))
      .returning();
    return result[0];
  }

 
  async logState(data: typeof controllerLogs.$inferInsert) {
    const result = await db.insert(controllerLogs).values(data).returning();
    return result[0];
  }

  async getLogs(controllerId: string, limit: number = 50) {
    return await db
      .select()
      .from(controllerLogs)
      .where(eq(controllerLogs.controllerId, controllerId))
      .orderBy(desc(controllerLogs.timestamp))
      .limit(limit);
  }
   async findLatestStateByStation(stationId: string) {
    return await db
      .selectDistinctOn([controllers.id], {
        id: controllers.id,
        name: controllers.name,
        type: controllers.type,
        isActive: controllers.isActive, // Include this field to know if it's ON/OFF
        
        lastUpdate: controllerLogs.timestamp,
        activationPercentage: controllerLogs.activationPercentage,
        statusMessage: controllerLogs.statusMessage
      })
      .from(controllers)
      .leftJoin(controllerLogs, eq(controllers.id, controllerLogs.controllerId))
      .where(eq(controllers.stationId, stationId)) // Removed "isActive" filter
      .orderBy(controllers.id, desc(controllerLogs.timestamp));
  }
}