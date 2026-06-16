import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BarChart3, Calendar, RefreshCw, Activity, 
  AlertTriangle, Settings2, TrendingUp, TrendingDown
} from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { stationService } from '../services/stationService';
import { statisticsService, type SensorStats, type AlertStats, type ActuatorStats } from '../services/statisticsService';
import type { Station } from '../types/station';
import { useTranslation } from 'react-i18next';
// Допоміжна функція для відображення дати у полі <input type="datetime-local">
const formatForInput = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const StationStatisticsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [station, setStation] = useState<Station | null>(null);
  const [sensorStats, setSensorStats] = useState<SensorStats[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats[]>([]);
  const [actuatorStats, setActuatorStats] = useState<ActuatorStats[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Зберігаємо дати як об'єкти Date
  const [dateFrom, setDateFrom] = useState<Date>(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const fetchStatistics = useCallback(async () => {
    const stationId = id || 'test-station-1';
    setIsLoading(true);
    setError(null);

    try {
      const fromISO = dateFrom.toISOString();
      const toISO = dateTo.toISOString();

      const [stationRes, sensorsRes, alertsRes, actuatorsRes] = await Promise.all([
        stationService.getById(stationId).catch(() => null),
        statisticsService.getSensorStats(stationId, fromISO, toISO).catch(() => []),
        statisticsService.getAlertStats(stationId, fromISO, toISO).catch(() => []),
        statisticsService.getActuatorStats(stationId, fromISO, toISO).catch(() => [])
      ]);

      if (stationRes) setStation(stationRes as Station);
      
      setSensorStats(Array.isArray(sensorsRes) ? sensorsRes as SensorStats[] : []);
      setAlertStats(Array.isArray(alertsRes) ? alertsRes as AlertStats[] : []);
      setActuatorStats(Array.isArray(actuatorsRes) ? actuatorsRes as ActuatorStats[] : []);
      
    } catch (err) {
      console.error(err);
      setError(t('stats.errors.fetchFailed', 'Не вдалося завантажити статистику. Перевірте з\'єднання.'));
    } finally {
      setIsLoading(false);
    }
  }, [id, dateFrom, dateTo, t]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Захист роуту
  const canViewStats = user ? ['admin', 'manager', 'analyst'].includes(user.role) : false;
  
  if (!canViewStats) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <AlertTriangle size={64} className="mx-auto text-amber-500 mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-slate-800">{t('stats.noAccess.title', 'Немає доступу')}</h2>
        <p className="text-slate-500 mt-2">{t('stats.noAccess.desc', 'Ваша роль не дозволяє переглядати аналітику.')}</p>
        <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold">
          {t('common.back', 'Повернутися')}
        </button>
      </div>
    );
  }

  // Обробники зміни дат
  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setDateFrom(new Date(e.target.value));
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) setDateTo(new Date(e.target.value));
  };

  // Безпечні масиви
  const safeSensorStats = Array.isArray(sensorStats) ? sensorStats : [];
  const safeActuatorStats = Array.isArray(actuatorStats) ? actuatorStats : [];
  const safeAlertStats = Array.isArray(alertStats) ? alertStats : [];

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 font-sans pb-20">
      
      {/* Хедер */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full transition-colors" title={t('common.back', 'Назад')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
              <BarChart3 className="text-indigo-600" />
              {t('stats.pageTitle', 'Аналітика станції')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{station?.name || t('common.loading', 'Завантаження...')}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2 px-2">
            <Calendar size={16} className="text-slate-400" />
            <input 
              type="datetime-local" 
              value={formatForInput(dateFrom)} 
              onChange={handleFromChange}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
            />
          </div>
          <span className="text-slate-300 font-bold">-</span>
          <div className="flex items-center gap-2 px-2">
            <input 
              type="datetime-local" 
              value={formatForInput(dateTo)} 
              onChange={handleToChange}
              className="bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
            />
          </div>
          <button onClick={fetchStatistics} disabled={isLoading} className="ml-2 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-3xl"></div>
          <div className="h-96 bg-slate-200 rounded-3xl"></div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* СЕКЦІЯ 1: СТАТИСТИКА СЕНСОРІВ */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Activity size={22} className="text-blue-500" /> {t('stats.sensors.titleMinMaxAvg', 'Показники сенсорів (Min/Max/Avg)')}
            </h2>
            {safeSensorStats.length === 0 ? (
              <div className="bg-white p-10 rounded-3xl border border-dashed border-slate-300 text-center text-slate-500">
                {t('stats.sensors.noData', 'Немає даних телеметрії за обраний період.')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {safeSensorStats.map((stat, idx) => (
                  <div key={stat.sensorId || idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                      {stat.parameterName || t('stats.sensors.defaultParam', 'Невідомий параметр')} {stat.unit ? `(${stat.unit})` : ''}
                    </h3>
                    
                    <div className="flex items-end gap-2 mb-6">
                      <span className="text-4xl font-black text-slate-900">{stat.avgValue ? stat.avgValue.toFixed(2) : '0.00'}</span>
                      <span className="text-sm font-bold text-slate-400 mb-1">{t('stats.sensors.avg', 'Середнє')}</span>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><TrendingDown size={16} /></div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('stats.sensors.minShort', 'Мін')}</p>
                          <p className="text-sm font-bold text-slate-800">{stat.minValue !== null && stat.minValue !== undefined ? stat.minValue.toFixed(2) : '0.00'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-50 text-red-600 rounded-lg"><TrendingUp size={16} /></div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('stats.sensors.maxShort', 'Макс')}</p>
                          <p className="text-sm font-bold text-slate-800">{stat.maxValue !== null && stat.maxValue !== undefined ? stat.maxValue.toFixed(2) : '0.00'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* СЕКЦІЯ 2: НАВАНТАЖЕННЯ АКТУАТОРІВ */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Settings2 size={22} className="text-purple-500" /> {t('stats.controllers.avgLoadTitle', 'Середнє навантаження обладнання')}
              </h2>
              
              {safeActuatorStats.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-slate-400 font-medium py-10">
                  {t('stats.controllers.noData', 'Немає даних про роботу обладнання.')}
                </div>
              ) : (
                <div className="space-y-6">
                  {safeActuatorStats.map((act, idx) => (
                    <div key={act.controllerId || idx}>
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <span className="font-bold text-slate-700 block">{act.name || t('stats.table.equipment', 'Обладнання')}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('stats.controllers.maxShort', 'Макс')}: {act.maxLoad || 0}% • {t('stats.controllers.logs', 'Логів')}: {act.totalLogs || 0}</span>
                        </div>
                        <span className="text-sm font-black text-purple-700">{(act.avgLoad || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-1000" 
                          style={{ width: `${Math.min(100, Math.max(0, act.avgLoad || 0))}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* СЕКЦІЯ 3: ТРИВОГИ */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                <AlertTriangle size={22} className="text-amber-500" /> {t('stats.alarms.summaryTitle', 'Зведення тривог')}
              </h2>
              
              {safeAlertStats.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-emerald-500 py-10">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                    <Activity size={32} />
                  </div>
                  <p className="font-bold">{t('stats.alarms.perfectNoAlarms', 'Ідеально! Тривог не зафіксовано.')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {safeAlertStats.map((alert, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${alert.status === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                          <AlertTriangle size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{alert.type}</p>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{alert.status}</p>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-slate-900 bg-white px-4 py-1.5 rounded-xl shadow-sm border border-slate-200">
                        {alert.count}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default StationStatisticsPage;