import  { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, Calendar, MapPin, Activity, 
  Cpu, ArrowDownRight, ArrowUpRight, Minus, Loader2, Info, RefreshCw
} from 'lucide-react';


import { useTranslation } from 'react-i18next';
import api from '../config/axios';
import { stationService } from '../services/stationService';

export const statisticsService = {
  getSensorStats: async (stationId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await api.get(`/statistics/station/${stationId}/sensors?${params.toString()}`);
    return response.data;
  },
  getControllerStats: async (stationId: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const response = await api.get(`/statistics/station/${stationId}/actuators?${params.toString()}`);
    return response.data;
  }
};




// Допоміжна функція для форматування дати в input
const formatForInput = (date: Date) => {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const AdminStatisticsPage = () => {
  const { t } = useTranslation(); // Підключення хука локалізації

  const [stations, setStations] = useState<any[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('');
  
  // Часові рамки
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all' | 'custom'>('24h');
  const [dateFrom, setDateFrom] = useState<Date>(() => {
    const d = new Date(); d.setHours(d.getHours() - 24); return d;
  });
  const [dateTo, setDateTo] = useState<Date>(() => new Date());
  
  const [sensorStats, setSensorStats] = useState<any[]>([]);
  const [controllerStats, setControllerStats] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Завантаження списку станцій
  useEffect(() => {
    const loadStations = async () => {
      try {
        const res = await stationService.getAll();
        const stationList = Array.isArray(res) ? res : (res as any).data || [];
        setStations(stationList);
        if (stationList.length > 0) {
          setSelectedStationId(stationList[0].id);
        }
      } catch (err) {
        console.error("Failed to load stations", err);
      } finally {
        setIsInitialLoad(false);
      }
    };
    loadStations();
  }, []);

  // Функція для виконання запиту з поточними датами
  const fetchStats = useCallback(async (stationId: string, fromDate: Date, toDate: Date) => {
    setIsLoading(true);
    try {
      const fromISO = fromDate.toISOString();
      const toISO = toDate.toISOString();

      const [sStats, cStats] = await Promise.all([
        statisticsService.getSensorStats(stationId, fromISO, toISO).catch(() => []),
        statisticsService.getControllerStats(stationId, fromISO, toISO).catch(() => null)
      ]);

      setSensorStats(Array.isArray(sStats) ? sStats : sStats?.data || []);
      setControllerStats(cStats);
    } catch (err) {
      console.error("Failed to load statistics", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Автоматичне завантаження при зміні станції
  useEffect(() => {
    if (selectedStationId && timeRange !== 'custom') {
      fetchStats(selectedStationId, dateFrom, dateTo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStationId]);

  // Обробка натискання на пресети часу
  const handlePresetClick = (preset: '24h' | '7d' | '30d' | 'all') => {
    setTimeRange(preset);
    const to = new Date();
    const from = new Date();
    
    if (preset === '24h') from.setHours(from.getHours() - 24);
    else if (preset === '7d') from.setDate(from.getDate() - 7);
    else if (preset === '30d') from.setDate(from.getDate() - 30);
    else if (preset === 'all') from.setTime(0);

    setDateFrom(from);
    setDateTo(to);

    if (selectedStationId) {
      fetchStats(selectedStationId, from, to);
    }
  };

  // Кнопка примусового оновлення
  const handleRefresh = () => {
    if (selectedStationId) {
      fetchStats(selectedStationId, dateFrom, dateTo);
    }
  };

  // Візуальна шкала
  const calculateBarWidth = (val: number, min: number, max: number) => {
    if (max === min) return 50;
    const padding = (max - min) * 0.2; 
    const visualMin = min - padding;
    const visualMax = max + padding;
    const percentage = ((val - visualMin) / (visualMax - visualMin)) * 100;
    return Math.max(5, Math.min(95, percentage));
  };

  if (isInitialLoad) {
    return (
      <div className="flex justify-center items-center h-64 text-indigo-600">
        <Loader2 size={40} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      
      {/* Хедер та фільтри */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl shrink-0">
            <BarChart3 size={32} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {t('stats.title', 'Аналітика та Звіти')}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('stats.subtitle', 'Агреговані дані сенсорів та контролерів')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
          {/* Вибір станції */}
          <div className="relative w-full md:w-72">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" size={18} />
            <select 
              value={selectedStationId}
              onChange={(e) => {
                setSelectedStationId(e.target.value);
                if(timeRange === 'custom') handleRefresh();
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%234f46e5' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em` }}
            >
              {stations.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col xl:flex-row gap-3 w-full">
            {/* Швидкі пресети */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-full xl:w-auto shrink-0 overflow-x-auto custom-scrollbar">
              {[
                { id: '24h', label: t('stats.periods.24h', '24 год') },
                { id: '7d', label: t('stats.periods.7d', '7 днів') },
                { id: '30d', label: t('stats.periods.30d', '30 днів') },
                { id: 'all', label: t('stats.periods.all', 'За весь час') }
              ].map(period => (
                <button 
                  key={period.id}
                  onClick={() => handlePresetClick(period.id as any)}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${timeRange === period.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {period.label}
                </button>
              ))}
              {timeRange === 'custom' && (
                <div className="px-4 py-2 rounded-lg text-sm font-bold bg-white text-indigo-600 shadow-sm whitespace-nowrap border border-indigo-100">
                  {t('stats.periods.custom', 'Свій період')}
                </div>
              )}
            </div>

            {/* Кастомні дати */}
            <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shrink-0 w-full xl:w-auto">
              <div className="flex items-center gap-1.5 px-2 bg-slate-50 rounded-lg border border-slate-100">
                <Calendar size={14} className="text-slate-400" />
                <input 
                  type="datetime-local" 
                  value={formatForInput(dateFrom)} 
                  onChange={(e) => {
                    if (e.target.value) { setDateFrom(new Date(e.target.value)); setTimeRange('custom'); }
                  }}
                  className="bg-transparent py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                />
              </div>
              <span className="text-slate-300 font-bold">-</span>
              <div className="flex items-center gap-1.5 px-2 bg-slate-50 rounded-lg border border-slate-100">
                <input 
                  type="datetime-local" 
                  value={formatForInput(dateTo)} 
                  onChange={(e) => {
                    if (e.target.value) { setDateTo(new Date(e.target.value)); setTimeRange('custom'); }
                  }}
                  className="bg-transparent py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                />
              </div>
              
              <button 
                onClick={handleRefresh} 
                disabled={isLoading} 
                className="ml-auto p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 px-3"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                <span className="text-xs font-bold">{t('stats.refresh', 'Оновити')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Контент */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-white border border-slate-200 rounded-3xl"></div>)}
        </div>
      ) : !selectedStationId ? (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
          <Info size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-bold text-slate-700">{t('stats.selectStation.title', 'Оберіть станцію')}</h3>
          <p className="text-slate-500 mt-2">{t('stats.selectStation.desc', 'Для перегляду аналітики необхідно обрати станцію зі списку.')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* СЕКЦІЯ: Сенсори (Агрегація) */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <Activity size={20} className="text-emerald-500" /> {t('stats.sensors.title', 'Агреговані показники сенсорів')}
            </h2>
            
            {sensorStats.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm flex flex-col items-center">
                <Info size={32} className="text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">{t('stats.sensors.noData', 'За обраний період немає даних телеметрії.')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sensorStats.map((sensor, idx) => {
                  const avg = sensor.avgValue ?? sensor.avg;
                  const min = sensor.minValue ?? sensor.min;
                  const max = sensor.maxValue ?? sensor.max;

                  return (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{sensor.type || t('stats.sensors.defaultType', 'Сенсор')}</p>
                          <h3 className="text-lg font-black text-slate-900 truncate" title={sensor.parameterName}>{sensor.parameterName || t('stats.sensors.defaultParam', 'Невідомий параметр')}</h3>
                        </div>
                        <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100">
                          {sensor.unit || ''}
                        </div>
                      </div>

                      <div className="space-y-5">
                        {/* Середнє (AVG) */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-bold text-slate-600 flex items-center gap-1"><Minus size={14} className="text-blue-500"/> {t('stats.sensors.avg', 'Середнє')}</span>
                            <span className="font-black text-slate-900">{avg !== undefined && avg !== null ? Number(avg).toFixed(2) : '--'}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${calculateBarWidth(Number(avg || 0), Number(min || 0), Number(max || 0))}%` }}></div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          {/* Мінімум */}
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              <ArrowDownRight size={14} className="text-emerald-500" /> {t('stats.sensors.min', 'Мінімум')}
                            </div>
                            <span className="text-lg font-black text-slate-800">{min !== undefined && min !== null ? Number(min).toFixed(2) : '--'}</span>
                          </div>
                          
                          {/* Максимум */}
                          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                              <ArrowUpRight size={14} className="text-red-500" /> {t('stats.sensors.max', 'Максимум')}
                            </div>
                            <span className="text-lg font-black text-slate-800">{max !== undefined && max !== null ? Number(max).toFixed(2) : '--'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* СЕКЦІЯ: Контролери (Навантаження) */}
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2 mt-8">
              <Cpu size={20} className="text-indigo-500" /> {t('stats.controllers.title', 'Навантаження контролерів (Актюаторів)')}
            </h2>

            {!controllerStats?.data || controllerStats.data.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm flex flex-col items-center">
                <Info size={32} className="text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">{t('stats.controllers.noData', 'За обраний період немає даних про роботу контролерів.')}</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                        <th className="p-5">{t('stats.table.equipment', 'Обладнання')}</th>
                        <th className="p-5 w-1/3">{t('stats.table.avgLoad', 'Сер. Навантаження')}</th>
                        <th className="p-5 text-center">{t('stats.table.maxLoad', 'Пікове Навант.')}</th>
                        <th className="p-5 text-right">{t('stats.table.logsCount', 'Кількість Логів')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {controllerStats.data.map((ctrl: any) => (
                        <tr key={ctrl.controllerId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5">
                            <div className="font-bold text-slate-900">{ctrl.name}</div>
                            <div className="text-xs font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">{ctrl.type}</div>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${ctrl.avgLoad > 80 ? 'bg-red-500' : ctrl.avgLoad > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                  style={{ width: `${ctrl.avgLoad}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-black text-slate-700 w-12">{ctrl.avgLoad.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black ${
                              ctrl.maxLoad > 90 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {ctrl.maxLoad}%
                            </span>
                          </td>
                          <td className="p-5 text-right font-bold text-slate-600">
                            {ctrl.totalLogs}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default AdminStatisticsPage;