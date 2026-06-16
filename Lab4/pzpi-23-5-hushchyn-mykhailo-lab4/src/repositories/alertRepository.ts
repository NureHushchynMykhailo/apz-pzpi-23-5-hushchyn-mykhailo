import { db } from '../config/db';
import { alerts } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export class AlertRepository {
  // 1. Отримати всі АКТИВНІ (невирішені) тривоги
  async findActive() {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.isResolved, false))
      .orderBy(desc(alerts.createdAt));
  }

  // 2. Отримати історію тривог по станції (і активні, і вирішені)
  async findByStation(stationId: string) {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.stationId, stationId))
      .orderBy(desc(alerts.createdAt));
  }

  // 3. Створити нову тривогу
  async create(data: typeof alerts.$inferInsert) {
    const result = await db.insert(alerts).values(data).returning();
    return result[0];
  }

  // 4. Вирішити тривогу (Mark as Resolved)
  async resolve(id: string) {
    const result = await db
      .update(alerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(), // Ставимо поточний час
      })
      .where(eq(alerts.id, id))
      .returning();
    return result[0];
  }

  // 5. Видалити тривогу (Admin clean up)
  async delete(id: string) {
    const result = await db
      .delete(alerts)
      .where(eq(alerts.id, id))
      .returning();
    return result[0];
  }
}