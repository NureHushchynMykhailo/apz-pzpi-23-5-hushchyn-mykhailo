import { db } from '../config/db';
import { alerts, stationThresholds, sensors, parameters } from '../db/schema';
import { eq, and, like } from 'drizzle-orm';

export class AlertService {

  /**
   * Головний метод: Перевірка значення, створення АБО закриття алерту
   */
  async checkAndCreateAlert(sensorId: string, value: number) {
  
    // 1. Отримуємо контекст сенсора (до якої станції і якого параметра він належить)
    const sensorContext = await db
      .select({
        stationId: sensors.stationId,
        parameterId: sensors.parameterId,
        paramName: parameters.name,
        paramUnit: parameters.unit
      })
      .from(sensors)
      .innerJoin(parameters, eq(sensors.parameterId, parameters.id))
      .where(eq(sensors.id, sensorId))
      .limit(1);

    if (!sensorContext.length) return;
    const { stationId, parameterId, paramName, paramUnit } = sensorContext[0];

    // 2. Отримуємо пороги (правила) для цієї станції та параметра
    const rulesData = await db
      .select()
      .from(stationThresholds)
      .where(
        and(
          eq(stationThresholds.stationId, stationId),
          eq(stationThresholds.parameterId, parameterId)
        )
      )
      .limit(1);

    if (!rulesData.length) return;
    const rules = rulesData[0];

    // Логіка перевірки
    const isLow = rules.minCritical !== null && value <= Number(rules.minCritical);
    const isHigh = rules.maxCritical !== null && value >= Number(rules.maxCritical);
    const isWarnLow = rules.minWarning !== null && value <= Number(rules.minWarning) && !isLow;
    const isWarnHigh = rules.maxWarning !== null && value >= Number(rules.maxWarning) && !isHigh;

    let alertType: 'critical' | 'warning' | null = null;
    let message = '';
    // Додаємо 'viewer' як цільову аудиторію для інформування про небезпеку
    let targetRole: 'admin' | 'technician' | 'viewer' = 'technician'; 

    if (isLow) {
      alertType = 'critical';
      targetRole = 'viewer'; // Критично низький рівень - важливо для підписників (і адмінів)
      message = `Критично низький рівень! ${paramName}: ${value} ${paramUnit} (Норма від ${rules.minWarning || rules.minCritical})`;
    } else if (isHigh) {
      alertType = 'critical';
      targetRole = 'viewer'; // Критично високий рівень
      message = `Критично високий рівень! ${paramName}: ${value} ${paramUnit} (Норма до ${rules.maxWarning || rules.maxCritical})`;
    } else if (isWarnLow) {
      alertType = 'warning';
      targetRole = 'technician'; // Попередження (можливо, обладнання працює не так) - для техніків
      message = `Попередження (Низький рівень). ${paramName}: ${value} ${paramUnit}`;
    } else if (isWarnHigh) {
      alertType = 'warning';
      targetRole = 'technician'; // Попередження - для техніків
      message = `Попередження (Високий рівень). ${paramName}: ${value} ${paramUnit}`;
    }

    // 3. Створюємо або оновлюємо алерт
    if (alertType) {
      await this.createAlertIfNotExists(stationId, alertType, targetRole, message);
    } else {
      // 4. Якщо показники В НОРМІ, автоматично закриваємо попередні відкриті алерти для цього параметра
      await this.resolveAlertsForParameter(stationId, paramName);
    }
  }

  /**
   * Автоматичне закриття алертів, якщо показники повернулися в норму
   */
  private async resolveAlertsForParameter(stationId: string, paramName: string) {
    const alertsToResolve = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.stationId, stationId),
          eq(alerts.isResolved, false),
          like(alerts.message, `%${paramName}%`) // Шукаємо відкриті алерти саме для цього параметра
        )
      );

    if (alertsToResolve.length > 0) {
      console.log(`Auto-resolving ${alertsToResolve.length} alerts for ${paramName}`);
      
      await db
        .update(alerts)
        .set({
          isResolved: true,
          resolvedAt: new Date(),
        })
        .where(
          and(
            eq(alerts.stationId, stationId),
            eq(alerts.isResolved, false),
            like(alerts.message, `%${paramName}%`)
          )
        );
    }
  }

  /**
   * Створення алерту з захистом від дублікатів
   */
  private async createAlertIfNotExists(
    stationId: string, 
    type: 'critical' | 'warning', 
    targetRole: 'admin' | 'technician' | 'viewer' | 'manager' | 'analyst', 
    message: string
  ) {
    // Перевіряємо, чи вже є ТАКИЙ САМИЙ активний алерт для цієї станції
    const existing = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.stationId, stationId),
          eq(alerts.isResolved, false),
          eq(alerts.message, message) // Точний збіг повідомлення
        )
      )
      .limit(1);

    // Якщо такого активного алерту ще немає - створюємо
    if (existing.length === 0) {
      await db.insert(alerts).values({
        stationId,
        type,
        targetRole,
        message,
      });
      console.log(`[ALERT CREATED] ${type.toUpperCase()} for ${targetRole}: ${message}`);
    }
  }
}