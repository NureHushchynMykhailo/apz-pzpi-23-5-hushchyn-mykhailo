import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Activity, Bell, BellOff, MapPin, 
  Droplets, Thermometer, Zap, AlertTriangle, 
  Clock, RefreshCw, X, Wind, ShieldAlert, CheckCircle2, Info
} from 'lucide-react';


import { stationService } from '../services/stationService';
import { telemetryService, type LatestTelemetry } from '../services/telemetryService';
import { subscriptionService } from '../services/subscriptionService';
import { wqiService, type WqiResponse } from '../services/wqiService';
import { alertService, type Alert } from '../services/alertService';
import { equipmentService, type Sensor } from '../services/equipmentService';
import { thresholdService, type Threshold } from '../services/thresholdService';
import type { Station } from '../types/station';
import { useTranslation } from 'react-i18next';



const UserStationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [station, setStation] = useState<Station | null>(null);
  const [telemetry, setTelemetry] = useState<LatestTelemetry[]>([]);
  const [wqiData, setWqiData] = useState<WqiResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);
  
  const [toast, setToast] = useState<{ type: 'success' | 'alert', message: string } | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    const stationId = id || 'demo-station'; // fallback for canvas
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [stationRes, telemetryRes, subsRes, wqiRes, alertsRes, sensorsRes, threshRes] = await Promise.all([
        stationService.getById(stationId).catch(() => null),
        telemetryService.getLatestByStation(stationId).catch(() => []),
        subscriptionService.getSubscriptions().catch(() => []),
        wqiService.getForStation(stationId).catch(() => null),
        alertService.getByStation(stationId).catch(() => []),
        equipmentService.getStationSensors(stationId).catch(() => []),
        thresholdService.getByStation(stationId).catch(() => [])
      ]);

      if (stationRes) setStation(stationRes as Station);
      setTelemetry(Array.isArray(telemetryRes) ? telemetryRes as LatestTelemetry[] : []);
      setWqiData(wqiRes as WqiResponse | null);
      setAlerts(Array.isArray(alertsRes) ? alertsRes as Alert[] : []);
      setSensors(Array.isArray(sensorsRes) ? sensorsRes as Sensor[] : []);
      setThresholds(Array.isArray(threshRes) ? threshRes as Threshold[] : []);
      
      // НАДІЙНИЙ ПАРСЕР ПІДПИСОК
      const rawSubs = Array.isArray(subsRes) ? subsRes : ((subsRes as any)?.data || []);
      const isSub = rawSubs.some((s: any) => (s.stationId === stationId || s.id === stationId || s.station_id === stationId));
      setIsSubscribed(isSub);
    } catch (err) {
      console.error("Помилка завантаження", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleSubscribe = async () => {
    const stationId = id || 'demo-station';
    if (isSubLoading) return;
    setIsSubLoading(true);
    
    // Оптимістичне оновлення
    setIsSubscribed(!isSubscribed);

    try {
      if (isSubscribed) {
        await subscriptionService.unsubscribe(stationId);
        showToast('success', t('userStation.unsubSuccess', 'Ви успішно відписалися від сповіщень.'));
      } else {
        await subscriptionService.subscribe(stationId);
        showToast('success', t('userStation.subSuccess', 'Ви успішно підписалися! Тепер ви отримуватимете сповіщення.'));
      }
    } catch (err) {
      console.error(err);
      setIsSubscribed(isSubscribed); // Відкат
      showToast('alert', t('userStation.subError', 'Помилка при зміні підписки. Спробуйте пізніше.'));
    } finally {
      setIsSubLoading(false);
    }
  };

  const showToast = (type: 'success' | 'alert', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const getSensorIcon = (type: string) => {
    const tStr = type.toLowerCase();
    if (tStr.includes('ph') || tStr.includes('water')) return <Droplets size={28} />;
    if (tStr.includes('temp')) return <Thermometer size={28} />;
    if (tStr.includes('oxygen') || tStr.includes('wind')) return <Wind size={28} />;
    if (tStr.includes('volt') || tStr.includes('energy')) return <Zap size={28} />;
    return <Activity size={28} />;
  };

  const timeSince = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return t('common.justNow', 'Щойно');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} ${t('common.minsAgo', 'хв. тому')}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${t('common.hoursAgo', 'год. тому')}`;
    return `${Math.floor(hours / 24)} ${t('common.daysAgo', 'дн. тому')}`;
  };

  const getWqiColorClass = (wqi: number | undefined) => {
    if (wqi === undefined) return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    if (wqi <= 50) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-500' };
    if (wqi <= 100) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' };
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 animate-pulse pb-24">
        <div className="h-64 bg-slate-200 rounded-[2.5rem] w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-200 rounded-3xl"></div>)}
        </div>
      </div>
    );
  }

  const wqiColors = getWqiColorClass(wqiData?.wqi);

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-8 font-sans pb-24 relative">
      
      {toast && (
        <div className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 bg-white border-l-4 p-5 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] z-50 flex items-start gap-4 animate-in slide-in-from-bottom-8 fade-in duration-500 max-w-sm ${
          toast.type === 'success' ? 'border-emerald-500' : 'border-red-500'
        }`}>
          <div className={`p-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="pr-4">
            <h4 className="font-bold text-slate-900 tracking-tight">{toast.type === 'success' ? t('common.success', 'Успішно') : t('common.warning', 'Увага')}</h4>
            <p className="text-sm font-medium text-slate-600 mt-1 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full p-1.5 transition-colors absolute top-4 right-4">
            <X size={16} />
          </button>
        </div>
      )}

      {/* --- HERO СЕКЦІЯ (Шапка) --- */}
      <div className="bg-slate-900 p-8 md:p-12 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute right-10 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none hidden md:block">
          <Activity size={250} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors mb-6 font-medium text-sm bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md w-fit">
              <ArrowLeft size={16} /> {t('common.back', 'Назад')}
            </button>
            
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-md border ${
                station?.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 
                station?.status === 'maintenance' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 
                'bg-slate-500/20 text-slate-300 border-slate-500/30'
              }`}>
                {station?.status ? t(`stations.status.${station.status}`, station.status) : t('stations.status.offline', 'Офлайн')}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">{station?.name || t('common.station', 'Станція')}</h1>
            
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <MapPin size={18} className="text-indigo-400" />
              <span>{station?.latitude?.toFixed(4) || '--'}, {station?.longitude?.toFixed(4) || '--'}</span>
            </div>
          </div>

          {/* Кнопки керування */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => fetchData(false)} 
              className="w-full sm:w-auto px-5 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 rounded-2xl transition-all flex items-center justify-center gap-2 font-bold"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
              {t('common.refresh', 'Оновити')}
            </button>

            <button 
              onClick={handleToggleSubscribe}
              disabled={isSubLoading}
              className={`w-full sm:w-auto px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg disabled:opacity-70 ${
                isSubscribed 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20' 
                  : 'bg-white text-indigo-900 hover:bg-indigo-50 shadow-white/10'
              }`}
            >
              {isSubLoading ? <RefreshCw className="animate-spin" size={22} /> : isSubscribed ? <Bell className="animate-in zoom-in" size={22} fill="currentColor" /> : <BellOff size={22} />}
              {isSubscribed ? t('userStation.subscribed', 'Ви підписані') : t('userStation.subscribe', 'Підписатися на сповіщення')}
            </button>
          </div>
        </div>
      </div>

      {/* --- БЛОК WQI ТА ЛАЙВ ТЕЛЕМЕТРІЯ --- */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* WQI */}
        {wqiData ? (
          <div className={`lg:col-span-1 rounded-[2.5rem] p-8 border shadow-sm flex flex-col justify-center relative overflow-hidden ${wqiColors.bg} ${wqiColors.border}`}>
            <Activity className={`absolute -right-10 -bottom-10 w-48 h-48 opacity-5 ${wqiColors.text}`} />
            
            <div className="relative z-10">
              <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${wqiColors.text} opacity-80`}>{t('userStation.wqiTitle', 'Індекс якості води')}</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-6xl font-black tracking-tighter ${wqiColors.text}`}>{wqiData.wqi.toFixed(1)}</span>
                <span className={`text-xl font-bold ${wqiColors.text}`}>WQI</span>
              </div>
              {/* Category and description come from backend typically, but rendering as is */}
              <p className={`text-lg font-extrabold mb-3 ${wqiColors.text}`}>{wqiData.category}</p>
              <p className={`text-sm font-medium ${wqiColors.text} opacity-90 leading-relaxed`}>{wqiData.description}</p>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-1 rounded-[2.5rem] p-8 border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center shadow-sm">
            <Info size={40} className="text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">{t('userStation.wqiUnavailable', 'WQI недоступний')}</h3>
            <p className="text-xs text-slate-500 mt-1">{t('userStation.wqiNoData', 'Недостатньо даних для розрахунку.')}</p>
          </div>
        )}

        {/* Телеметрія */}
        <div className="lg:col-span-3">
          {telemetry.length === 0 ? (
            <div className="bg-white h-full p-12 rounded-[2.5rem] border border-dashed border-slate-300 text-center shadow-sm flex flex-col items-center justify-center">
              <ShieldAlert size={48} className="text-slate-300 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-slate-800">{t('userStation.noTelemetry', 'Датчики не передають дані')}</h3>
              <p className="text-slate-500 mt-2">{t('userStation.noTelemetryDesc', 'Станція наразі не надсилає жодних показників телеметрії.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 h-full">
              {telemetry.map(tel => {
                const sensorInfo = sensors.find(s => s.id === tel.sensorId);
                const threshold = thresholds.find(t => t.parameterId === sensorInfo?.parameterId);
                
                let stateColor = "text-emerald-500";
                let stateBg = "bg-emerald-50 group-hover:bg-emerald-100";
                let normText = t('userStation.noNorm', 'Норма не встановлена');
                let statusLabel = t('userStation.statusNormal', 'В нормі');

                if (threshold) {
                  const { minWarning, maxWarning, minCritical, maxCritical } = threshold;
                  normText = `${t('userStation.normPrefix', 'Норма: ')}${minWarning ?? '-'} ... ${maxWarning ?? '-'}`;
                  
                  if ((minCritical != null && tel.value <= minCritical) || (maxCritical != null && tel.value >= maxCritical)) {
                    stateColor = "text-red-500";
                    stateBg = "bg-red-50 group-hover:bg-red-100";
                    statusLabel = t('alarms.critical', 'Критично');
                  } else if ((minWarning != null && tel.value <= minWarning) || (maxWarning != null && tel.value >= maxWarning)) {
                    stateColor = "text-amber-500";
                    stateBg = "bg-amber-50 group-hover:bg-amber-100";
                    statusLabel = t('alarms.warning', 'Увага');
                  }
                }

                return (
                  <div key={tel.sensorId} className={`bg-white rounded-[2rem] p-6 border ${stateColor === 'text-emerald-500' ? 'border-slate-200' : stateColor === 'text-amber-500' ? 'border-amber-200' : 'border-red-200'} shadow-sm flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden`}>
                    <div className="absolute -right-6 -top-6 opacity-5 group-hover:scale-150 transition-transform duration-500 pointer-events-none">
                      {getSensorIcon(tel.type)}
                    </div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <div className={`p-3.5 ${stateBg} ${stateColor} rounded-2xl transition-colors`}>
                        {getSensorIcon(tel.type)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg">
                        <Clock size={12} /> {timeSince(tel.measuredAt)}
                      </span>
                    </div>
                    
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 truncate" title={tel.parameterName}>{tel.parameterName}</p>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className={`text-4xl font-black tracking-tighter ${stateColor === 'text-emerald-500' ? 'text-slate-900' : stateColor}`}>{tel.value}</span>
                        <span className="text-lg font-black text-slate-300">{tel.unit}</span>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{normText}</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${stateBg} ${stateColor}`}>{statusLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* --- СТРІЧКА РЕАЛЬНИХ ТРИВОГ --- */}
      <div className="mt-12">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight mb-6">
          <Bell className="text-amber-500" /> {t('userStation.recentEvents', 'Останні події та тривоги')}
        </h2>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          {alerts.length === 0 ? (
            <div className="p-10 text-center text-emerald-500 font-medium flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                <CheckCircle2 size={32} />
              </div>
              <p className="font-bold text-lg">{t('userStation.noEvents', 'Подій не зафіксовано')}</p>
              <p className="text-slate-400 text-sm mt-1">{t('userStation.noEventsDesc', 'Всі показники знаходяться в межах норми.')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
              {alerts.map(alert => (
                <div key={alert.id} className="p-6 flex items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    alert.type === 'critical' ? 'bg-red-100 text-red-600' : 
                    alert.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <AlertTriangle size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-4 mb-1">
                      <h4 className="font-bold text-slate-900 text-base md:text-lg">{alert.message}</h4>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg w-fit shrink-0">{new Date(alert.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mt-1 flex items-center gap-1.5">
                       {t('common.parameter', 'Параметр')}: <strong className="text-slate-700">{alert.type}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default UserStationDetailsPage;