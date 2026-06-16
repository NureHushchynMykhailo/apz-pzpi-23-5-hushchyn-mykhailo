import { db } from '../config/db';
import { sensors, telemetry } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export class WqiService {
  /**
   * Стандарти якості для параметрів (приклад типових норм ВООЗ/ДСТУ).
   * ideal: ідеальне значення (для pH = 7, для DO = 14.6, для решти зазвичай 0)
   * standard: максимально допустиме значення
   * weight: вага параметра в розрахунку
   */
  private standards: Record<string, { ideal: number; standard: number; weight: number }> = {
    'ph_meter': { ideal: 7.0, standard: 8.5, weight: 0.22 },
    'do_meter': { ideal: 14.6, standard: 5.0, weight: 0.22 }, // Для кисню standard - це мінімум
    'turbidity_meter': { ideal: 0.0, standard: 5.0, weight: 0.16 },
    // Можна додавати інші типи сенсорів за необхідності
  };

  /**
   * Отримати поточний індекс WQI для станції
   */
  async calculateStationWqi(stationId: string) {
    // Отримуємо останні показники з кожного сенсора на станції
    const latestSensorsData = await db
      .selectDistinctOn([sensors.id], {
        sensorId: sensors.id,
        type: sensors.type,
        value: telemetry.value,
      })
      .from(sensors)
      .leftJoin(telemetry, eq(sensors.id, telemetry.sensorId))
      .where(eq(sensors.stationId, stationId))
      .orderBy(sensors.id, desc(telemetry.measuredAt));

    let totalWeight = 0;
    let weightedQISum = 0;
    const parametersUsed: any[] = [];

    // Розрахунок Q (Quality Rating) для кожного доступного параметра
    for (const data of latestSensorsData) {
      if (data.value === null || !this.standards[data.type]) continue;

      const std = this.standards[data.type];
      const val = Number(data.value);
      let qi = 0;

      // Математика WQI залежить від типу параметра
      if (data.type === 'ph_meter') {
        // Для pH рахуємо відхилення від ідеальних 7.0
        qi = 100 * (Math.abs(val - std.ideal) / (std.standard - std.ideal));
      } else if (data.type === 'do_meter') {
        // Для кисню чим більше, тим краще (14.6 - це 100% насичення)
        qi = 100 * ((std.ideal - val) / (std.ideal - std.standard));
      } else {
        // Для каламутності та інших забрудників (0 - ідеал)
        qi = 100 * (val / std.standard);
      }

      // Якщо значення краще ідеалу, обмежуємо його
      if (qi < 0) qi = 0;

      weightedQISum += qi * std.weight;
      totalWeight += std.weight;

      parametersUsed.push({
        type: data.type,
        value: val,
        qi: Math.round(qi * 100) / 100,
        weight: std.weight
      });
    }

    if (totalWeight === 0) {
      return { status: 'no_data', message: 'Недостатньо даних для розрахунку WQI' };
    }

    // Підсумковий розрахунок WQI
    const wqiValue = Math.round((weightedQISum / totalWeight) * 100) / 100;
    const category = this.getWqiCategory(wqiValue);

    return {
      status: 'success',
      wqi: wqiValue,
      category: category.name,
      description: category.desc,
      parametersUsed
    };
  }

  /**
   * Визначення категорії якості води за шкалою WQI
   */
  private getWqiCategory(wqi: number) {
    if (wqi <= 25) return { name: 'Відмінна', desc: 'Вода високої якості, придатна для пиття.' };
    if (wqi <= 50) return { name: 'Добра', desc: 'Вода хорошої якості.' };
    if (wqi <= 75) return { name: 'Задовільна', desc: 'Вода потребує незначного очищення.' };
    if (wqi <= 100) return { name: 'Погана', desc: 'Вода дуже поганої якості, непридатна для споживання.' };
    return { name: 'Небезпечна', desc: 'Критичний рівень забруднення.' };
  }
}