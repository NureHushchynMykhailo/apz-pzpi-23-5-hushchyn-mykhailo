import { db } from '../config/db';
import { stations, userStations, users, alerts, telemetry, sensors, parameters } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export class StationRepository {
  async findAll() {
    return await db.select().from(stations);
  }

  async findById(id: string) {
    const result = await db.select().from(stations).where(eq(stations.id, id)).limit(1);
    return result[0] || null;
  }

  async findByUserId(userId: string) {
    return await db
      .select({
        id: stations.id,
        name: stations.name,
        status: stations.status,
        latitude: stations.latitude,
        longitude: stations.longitude,
        assignedAt: userStations.assignedAt,
      })
      .from(stations)
      .innerJoin(userStations, eq(stations.id, userStations.stationId))
      .where(eq(userStations.userId, userId));
  }

  async create(data: any) {
    const result = await db.insert(stations).values(data).returning();
    return result[0];
  }

  async update(id: string, data: any) {
    const result = await db.update(stations).set(data).where(eq(stations.id, id)).returning();
    return result[0];
  }

  async delete(id: string) {
    const result = await db.delete(stations).where(eq(stations.id, id)).returning();
    return result[0];
  }

  async isUserAssigned(userId: string, stationId: string) {
    const result = await db
      .select()
      .from(userStations)
      .where(and(eq(userStations.userId, userId), eq(userStations.stationId, stationId)))
      .limit(1);
    return result.length > 0;
  }

  async assignUser(userId: string, stationId: string) {
      const result = await db.insert(userStations).values({
          userId,
          stationId
      }).returning();
      return result[0];
  }

  async unassignUser(userId: string, stationId: string) {
      const result = await db.delete(userStations)
          .where(and(eq(userStations.userId, userId), eq(userStations.stationId, stationId)))
          .returning();
      return result[0];
  }

  async findAssignedUsersByStation(stationId: string) {
    return await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        assignedAt: userStations.assignedAt,
      })
      .from(users)
      .innerJoin(userStations, eq(users.id, userStations.userId))
      .where(eq(userStations.stationId, stationId));
  }

  // --- КОМПЛЕКСНИЙ МЕТОД ДЛЯ ДАШБОРДУ ПІДПИСНИКА ---
  
  async getStationDashboard(stationId: string) {
    // 1. Отримуємо базову інфо про станцію
    const station = await this.findById(stationId);
    if (!station) return { station: null, alerts: [], sensors: [] };

    // 2. Отримуємо активні (невирішені) алерти для інформування про небезпеку
    const activeAlerts = await db
      .select({
        id: alerts.id,
        type: alerts.type,
        message: alerts.message,
        createdAt: alerts.createdAt
      })
      .from(alerts)
      .where(
        and(
          eq(alerts.stationId, stationId),
          eq(alerts.isResolved, false) // Тільки активні проблеми
        )
      )
      .orderBy(desc(alerts.createdAt));

    // 3. Отримуємо останні показники (snapshot) по кожному сенсору станції
    const latestSensorsData = await db
      .selectDistinctOn([sensors.id], {
        sensorId: sensors.id,
        type: sensors.type,
        parameterName: parameters.name,
        unit: parameters.unit,
        lastValue: telemetry.value,
        measuredAt: telemetry.measuredAt
      })
      .from(sensors)
      .innerJoin(parameters, eq(sensors.parameterId, parameters.id))
      .leftJoin(telemetry, eq(sensors.id, telemetry.sensorId))
      .where(eq(sensors.stationId, stationId))
      .orderBy(sensors.id, desc(telemetry.measuredAt));

    return {
      station,
      alerts: activeAlerts,
      sensors: latestSensorsData
    };
  }
}