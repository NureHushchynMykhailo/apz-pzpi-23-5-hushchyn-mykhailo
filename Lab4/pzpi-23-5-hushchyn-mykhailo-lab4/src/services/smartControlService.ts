import { db } from '../config/db';
import { sensors, controllers, stationThresholds, parameters, controllerLogs, alerts, telemetry } from '../db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export class SmartControlService {


  private readonly TARGET_RECOVERY_TIME_MINUTES = 15;

  // Коефіцієнти PID
  private Kp = 20.0; // Пропорційний (Сила реакції на миттєву помилку)
  private Ki = 0.5;  // Інтегральний (Накопичення сили, якщо помилка не зникає)
  private Kd = 15.0; // Диференціальний (Гальмування, щоб не перелетіти ціль)

  /**
   * Головний метод
   */
  async processTelemetry(sensorId: string, currentValue: number) {
    const sensorInfo = await this.getSensorContext(sensorId);
    if (!sensorInfo) return;

    const { stationId, parameterCode, parameterId } = sensorInfo;

    if (!parameterCode) return;

    
    const historyData = await db
      .select({ value: telemetry.value, time: telemetry.measuredAt })
      .from(telemetry)
      .where(eq(telemetry.sensorId, sensorId))
      .orderBy(desc(telemetry.measuredAt))
      .limit(10);
    
    const historyValues = [...historyData.map(h => h.value).reverse(), currentValue];

    const waterTemp = await this.getStationParameter(stationId, 'temperature') || 20.0;
    const rules = await this.getThresholds(stationId, parameterId);
    if (!rules) return;

    switch (parameterCode) {
      case 'dissolved_oxygen':
        await this.controlAeratorPID(stationId, currentValue, historyValues, waterTemp, rules);
        break;
      
      case 'ph_level':
        await this.controlPhAdvanced(stationId, currentValue, historyValues, waterTemp, rules);
        break;

      case 'orp':
        const currentPH = await this.getStationParameter(stationId, 'ph_level') || 7.0;
        await this.controlDisinfectionTimeBased(stationId, currentValue, historyValues, currentPH, rules);
        break;

      case 'pressure':
      case 'turbidity':
        const trend = this.calculateSlope(historyValues.slice(-3)); 
        await this.controlFilterLogic(stationId, currentValue, trend, rules, parameterCode);
        break;

      case 'water_level':
        const levelTrend = this.calculateSlope(historyValues.slice(-5));
        await this.controlLevelPredictive(stationId, currentValue, levelTrend, rules);
        break;
    }

    const shortTrend = this.calculateSlope(historyValues.slice(-3));
  }

  // ------------------------------------------------------------------
  // СКЛАДНА МАТЕМАТИКА (PID + TIME-BASED)
  // ------------------------------------------------------------------

  /**
   * PID Controller Formula:
   * u(t) = Kp*e(t) + Ki*∫e(t) + Kd*de(t)/dt
   */
  private calculatePID(target: number, current: number, history: number[]): number {
    const error = target - current; 
   
    const P = this.Kp * error;

    const integralError = history.reduce((acc, val) => acc + (target - val), 0);
    const I = this.Ki * integralError;

   
    const slope = this.calculateSlope(history.slice(-3)); 
    const D = this.Kd * (-slope); 

    return P + I + D;
  }

  /**
   * Аератор з PID регулюванням та термо-компенсацією
   */
  private async controlAeratorPID(stationId: string, currentDO: number, history: number[], temp: number, rules: any) {
    const aerator = await this.findController(stationId, 'aerator');
    if (!aerator) return;

    let setPoint = (rules.minWarning || 5.0) + 1.0; 
 
    if (temp > 25) setPoint += 0.5;

    if (currentDO > setPoint + 1.0) {
      await this.sendCommand(aerator.id, 0, 'Auto: DO Optimal');
      return;
    }

    let power = this.calculatePID(setPoint, currentDO, history);

    if (currentDO < (rules.minCritical || 3.0)) power = 100;

    await this.sendCommand(aerator.id, power, `Auto PID: Target=${setPoint.toFixed(1)}, Err=${(setPoint - currentDO).toFixed(2)}`);
  }

  /**
   * pH Контроль: Враховує логарифмічну природу pH та час реакції
   */
  private async controlPhAdvanced(stationId: string, currentPH: number, history: number[], temp: number, rules: any) {
    const acidPump = await this.findController(stationId, 'dispenser_acid');
    const alkaliPump = await this.findController(stationId, 'dispenser_alkali');
    
    const maxLimit = rules.maxWarning || 8.5;
    const minLimit = rules.minWarning || 6.5;
    const optimalPH = ((maxLimit+minLimit)/2)||7.2; 
 
    const diff = Math.abs(currentPH - optimalPH);
    const logErrorWeight = Math.pow(10, diff) * 0.5; 
   
    const requiredRate = (diff / this.TARGET_RECOVERY_TIME_MINUTES); 

    let power = (requiredRate * 1000) + (logErrorWeight * 5); 

   
    const slope = this.calculateSlope(history.slice(-3));
    power -= (Math.abs(slope) * 500); 

    power = this.clamp(power, 0, 100);

    if (currentPH > maxLimit) {
      if (acidPump) {
        await this.sendCommand(acidPump.id, power, `Auto pH-: LogFactor=${logErrorWeight.toFixed(1)}`);
      }
      if (alkaliPump) {
        await this.sendCommand(alkaliPump.id, 0, 'Standby (pH High)');
      }
    } 
    else if (currentPH < minLimit) {
      if (alkaliPump) {
        await this.sendCommand(alkaliPump.id, power, `Auto pH+: LogFactor=${logErrorWeight.toFixed(1)}`);
      }
      if (acidPump) {
        await this.sendCommand(acidPump.id, 0, 'Standby (pH Low)');
      }
    } 
    else {
      if (acidPump) await this.sendCommand(acidPump.id, 0, 'pH Stable');
      if (alkaliPump) await this.sendCommand(alkaliPump.id, 0, 'pH Stable');
    }
  }

  /**
   * Дезінфекція (Time-Based Injection):
   * Розраховує необхідну дозу на об'єм резервуара.
   */
  private async controlDisinfectionTimeBased(stationId: string, currentORP: number, history: number[], ph: number, rules: any) {
    const chlorinePump = await this.findController(stationId, 'dispenser_chlorine');
    if (!chlorinePump) return;

    const targetORP = 700; 
    if (currentORP >= targetORP) {
      await this.sendCommand(chlorinePump.id, 0, 'ORP Optimal');
      return;
    }

    const deficit = targetORP - currentORP;

    let efficiencyFactor = 1.0;
    if (ph > 7.5) efficiencyFactor = 0.5;
    if (ph > 8.0) efficiencyFactor = 0.3;

    
    const requiredSpeedPerMin = deficit / this.TARGET_RECOVERY_TIME_MINUTES;
   
    const pumpCalibrationConstant = 10.0; 
    
    let power = (requiredSpeedPerMin / pumpCalibrationConstant) * 100;
   
    power = power / efficiencyFactor;

    await this.sendCommand(chlorinePump.id, power, `Auto ORP: Deficit=${deficit}, pH-Eff=${efficiencyFactor}`);
  }

  /**
   * Рівень води: Предиктивне наповнення (Predictive Filling)
   * Якщо рівень падає швидко, ми вмикаємо насос РАНІШЕ, ніж досягнемо мінімуму.
   */
  private async controlLevelPredictive(stationId: string, currentLevel: number, trend: number, rules: any) {
    const pump = await this.findController(stationId, 'pump');
    const valve = await this.findController(stationId, 'valve');
  
    const minWarning = rules.minWarning || 20;  
    const maxWarning = rules.maxWarning || 90;  
    const minCritical = rules.minCritical || 10;

    const predictedLevel = currentLevel + (trend * 5); 

 
    if (valve) {
      if (predictedLevel < minWarning) {
        const fillPower = trend < -1.0 ? 100 : 60;
        await this.sendCommand(valve.id, fillPower, `Auto: Filling (Lvl ${currentLevel.toFixed(1)}%)`);
      } 
      else if (currentLevel > maxWarning) {
        await this.sendCommand(valve.id, 0, 'Auto: Tank Full - Valve Closed');
      }
 
    }


    if (pump) {
      if (currentLevel < minCritical) {
        await this.sendCommand(pump.id, 0, 'Auto: DRY RUN PROTECTION (Critical)');
        return;
      }

      let targetPower = 0;

      if (currentLevel > maxWarning) {
        targetPower = 100;
      } 
      else if (currentLevel > 50) {
      
        targetPower = 80 + (trend * 2); 
      } 
      else if (currentLevel >= minWarning) {
    
        const ratio = (currentLevel - minWarning) / (50 - minWarning);
        targetPower = 40 + (ratio * 30);

        if (trend < -1.0) targetPower -= 10;
      } 
      else {
   
        targetPower = 30;
      }

  
      const noise = (Math.random() * 4) - 2; 
      targetPower += noise;

      targetPower = this.clamp(targetPower, 0, 100);

      const statusMsg = `Auto: VFD Mode | Lvl: ${currentLevel.toFixed(1)}% | Trnd: ${trend.toFixed(2)}`;
      await this.sendCommand(pump.id, targetPower, statusMsg);
    }
  }

  /**
   * Фільтр (Logic remains mostly boolean but with trend check)
   */
  private async controlFilterLogic(stationId: string, value: number, trend: number, rules: any, type: string) {
    const filter = await this.findController(stationId, 'filter');
    if (!filter) return;
    const limit = rules.maxWarning || 5.0;

    if (value > limit) {
      await this.sendCommand(filter.id, 100, `Auto: ${type} Limit`);
    } else if (value > limit * 0.9 && trend > 0.5) {
      // Якщо ми на 90% від ліміту і стрімко ростемо -> превентивна промивка
      await this.sendCommand(filter.id, 100, `Auto: Predictive Wash (${type} rising fast)`);
    } else {
      await this.sendCommand(filter.id, 0, 'Standby');
    }
  }

  // ------------------------------------------------------------------
  // HELPER METHODS
  // ------------------------------------------------------------------

  /**
   * Розрахунок нахилу (Slope/Trend) методом найменших квадратів або простою дельтою.
   * Тут проста усереднена дельта між точками.
   * Returns: зміна значення за один крок часу.
   */
  private calculateSlope(values: number[]): number {
    if (values.length < 2) return 0;
    let sumDiff = 0;
    for (let i = 1; i < values.length; i++) {
      sumDiff += (values[i] - values[i-1]); // values[i] новіше, ніж values[i-1] у моєму сортуванні вище?
      // Увага: historyValues у мене відсортований [старе, ..., нове].
      // Тому values[i] - values[i-1] це (нове - старе).
    }
    return sumDiff / (values.length - 1);
  }

  private clamp(num: number, min: number, max: number) {
    return Math.max(min, Math.min(num, max));
  }

  // --- DB HELPERS ---
  private async getStationParameter(stationId: string, paramCode: string): Promise<number | null> {
    const res = await db
      .select({ value: telemetry.value })
      .from(telemetry)
      .innerJoin(sensors, eq(telemetry.sensorId, sensors.id))
      .innerJoin(parameters, eq(sensors.parameterId, parameters.id))
      .where(and(eq(sensors.stationId, stationId), eq(parameters.code, paramCode)))
      .orderBy(desc(telemetry.measuredAt))
      .limit(1);
    return res.length ? res[0].value : null;
  }

  private async getSensorContext(sensorId: string) {
    const res = await db
      .select({
        stationId: sensors.stationId,
        parameterId: sensors.parameterId,
        parameterCode: parameters.code,
      })
      .from(sensors)
      .leftJoin(parameters, eq(sensors.parameterId, parameters.id))
      .where(eq(sensors.id, sensorId))
      .limit(1);
    return res[0];
  }

  private async getThresholds(stationId: string, parameterId: string) {
    const res = await db
      .select()
      .from(stationThresholds)
      .where(and(eq(stationThresholds.stationId, stationId), eq(stationThresholds.parameterId, parameterId)))
      .limit(1);
    return res[0];
  }

  private async findController(stationId: string, type: any) {
    const res = await db
      .select()
      .from(controllers)
      .where(and(eq(controllers.stationId, stationId), eq(controllers.type, type)))
      .limit(1);
    return res[0];
  }

  private async sendCommand(controllerId: string, percentage: number, msg: string) {
    const finalPct = this.clamp(percentage, 0, 100).toFixed(2);
    const isActive = parseFloat(finalPct) > 0;

    await db.update(controllers).set({ isActive }).where(eq(controllers.id, controllerId));
    await db.insert(controllerLogs).values({
      controllerId,
      activationPercentage: finalPct,
      statusMessage: msg,
      timestamp: new Date()
    });
  }
}