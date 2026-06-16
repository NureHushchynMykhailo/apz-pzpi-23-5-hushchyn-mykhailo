import { db } from '../config/db';
import { telemetry, sensors, alerts, controllerLogs, controllers, parameters } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export class StatisticsRepository {

 
  async getSensorStats(stationId: string, from: Date, to: Date) {
    return await db
      .select({
        sensorId: sensors.id,
        sensorType: sensors.type,
        parameterName: parameters.name,
        unit: parameters.unit,
        avgValue: sql<number>`CAST(AVG(${telemetry.value}) AS FLOAT)`,
        minValue: sql<number>`MIN(${telemetry.value})`,
        maxValue: sql<number>`MAX(${telemetry.value})`,
        readingsCount: sql<number>`COUNT(${telemetry.id})`
      })
      .from(telemetry)
      .innerJoin(sensors, eq(telemetry.sensorId, sensors.id))
      .innerJoin(parameters, eq(sensors.parameterId, parameters.id))
      .where(
        and(
          eq(sensors.stationId, stationId),
          gte(telemetry.measuredAt, from),
          lte(telemetry.measuredAt, to)
        )
      )
      .groupBy(sensors.id, sensors.type, parameters.name, parameters.unit);
  }

 
  async getAlertStats(stationId: string, from: Date, to: Date) {
    return await db
      .select({
        type: alerts.type,      
        isResolved: alerts.isResolved,
        count: sql<number>`COUNT(${alerts.id})`
      })
      .from(alerts)
      .where(
        and(
          eq(alerts.stationId, stationId),
          gte(alerts.createdAt, from),
          lte(alerts.createdAt, to)
        )
      )
      .groupBy(alerts.type, alerts.isResolved);
  }


  async getActuatorStats(stationId: string, from: Date, to: Date) {
    return await db
      .select({
        controllerId: controllers.id,
        name: controllers.name,
        type: controllers.type,
        avgLoad: sql<number>`CAST(AVG(${controllerLogs.activationPercentage}) AS FLOAT)`,
        maxLoad: sql<number>`MAX(${controllerLogs.activationPercentage})`,
        totalLogs: sql<number>`COUNT(${controllerLogs.id})`
      })
      .from(controllerLogs)
      .innerJoin(controllers, eq(controllerLogs.controllerId, controllers.id))
      .where(
        and(
          eq(controllers.stationId, stationId),
          gte(controllerLogs.timestamp, from),
          lte(controllerLogs.timestamp, to)
        )
      )
      .groupBy(controllers.id, controllers.name, controllers.type);
  }
}