import { db } from '../config/db';
import { telemetry,sensors,parameters } from '../db/schema';
import { eq, desc, and } from 'drizzle-orm';

export class TelemetryRepository {
  async findBySensor(sensorId: string, limit: number = 100) {
    return await db
      .select()
      .from(telemetry)
      .where(eq(telemetry.sensorId, sensorId))
      .orderBy(desc(telemetry.measuredAt))
      .limit(limit);
  }

  async create(data: any) {
    const res = await db.insert(telemetry).values(data).returning();
    return res[0];
  }

  async delete(id: string) {
    const res = await db.delete(telemetry).where(eq(telemetry.id, id)).returning();
    return res[0];
  }

  async findLatestByStation(stationId: string) {
    return await db
      .selectDistinctOn([sensors.id], {
        sensorId: sensors.id,
        type: sensors.type,         // Тип сенсора (do_meter, ph_meter...)
        model: sensors.model,       // Модель
        parameterName: parameters.name, // Назва параметра (Acidity, Temperature)
        unit: parameters.unit,      // Одиниця виміру (pH, °C)
        value: telemetry.value,     // Останнє значення
        measuredAt: telemetry.measuredAt // Час виміру
      })
      .from(sensors)
      // Приєднуємо телеметрію
      .leftJoin(telemetry, eq(sensors.id, telemetry.sensorId))
      // Приєднуємо параметри, щоб знати одиниці виміру
      .leftJoin(parameters, eq(sensors.parameterId, parameters.id))
      .where(
        and(
          eq(sensors.stationId, stationId),
          eq(sensors.isActive, true) // Тільки активні сенсори
        )
      )
      // Магія Postgres: сортуємо за ID сенсора, а потім за часом (найсвіжіші зверху)
      // DISTINCT ON бере перший рядок з групи, тобто найсвіжіший
      .orderBy(sensors.id, desc(telemetry.measuredAt));
  }
}