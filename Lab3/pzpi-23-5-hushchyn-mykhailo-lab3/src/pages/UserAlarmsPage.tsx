import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, AlertTriangle, AlertCircle, 
  Clock, MapPin, RefreshCw, ShieldCheck, Info,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { subscriptionService } from '../services/subscriptionService';
import { alertService, type Alert } from '../services/alertService';

const UserAlarmsPage = () => {
  const { t, i18n } = useTranslation();
  
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [subscribedStations, setSubscribedStations] = useState<{id: string, name: string}[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Фільтрація за статусом
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const fetchMyAlerts = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      // 1. Отримуємо всі підписки користувача
      const subsRes = await subscriptionService.getSubscriptions();
      const rawSubs = Array.isArray(subsRes) ? subsRes : ((subsRes as any)?.data || []);
      
      const stations = rawSubs.map((s: any) => ({
        id: s.id || s.stationId || s.station_id,
        name: s.name || t('userAlarms.unknownStation', 'Невідома станція')
      })).filter((s: any) => s.id);

      setSubscribedStations(stations);

      // Якщо немає підписок, не робимо зайвих запитів
      if (stations.length === 0) {
        setAlerts([]);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      // 2. Отримуємо алерти для кожної підписаної станції паралельно
      const alertsPromises = stations.map((st: any) => 
        alertService.getByStation(st.id).catch(() => [] as Alert[])
      );
      
      const alertsArrays = await Promise.all(alertsPromises);
      
      // 3. Об'єднуємо всі алерти в один масив і сортуємо за датою (новіші зверху)
      const allAlerts = alertsArrays.flat().sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setAlerts(allAlerts);
    } catch (err) {
      console.error("Помилка завантаження тривог:", err);
      setError(t('userAlarms.fetchError', 'Не вдалося завантажити ваші сповіщення. Спробуйте оновити сторінку.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMyAlerts();
    // Автооновлення кожні 30 секунд
    const interval = setInterval(() => fetchMyAlerts(true), 30000);
    return () => clearInterval(interval);
  }, [fetchMyAlerts]);

  // Фільтрація алертів для відображення
  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => statusFilter === 'all' || alert.type === statusFilter);
  }, [alerts, statusFilter]);

  // UI Хелпери
  const getAlertConfig = (status: string) => {
    switch (status) {
      case 'critical':
        return { icon: <AlertTriangle size={24} className="text-red-600" />, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', badge: 'bg-red-100 text-red-700' };
      case 'warning':
        return { icon: <AlertCircle size={24} className="text-amber-500" />, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-700' };
      default:
        return { icon: <Info size={24} className="text-blue-500" />, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', badge: 'bg-blue-100 text-blue-700' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) return `${diffMins} ${t('common.minsAgo', 'хв. тому')}`;
    if (diffHours < 24) return `${diffHours} ${t('common.hoursAgo', 'год. тому')}`;
    return date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getStationName = (stationId: string) => {
    const st = subscribedStations.find(s => s.id === stationId);
    return st ? st.name : t('userAlarms.unknownStation', 'Невідома станція');
  };

  const criticalCount = alerts.filter(a => a.type === 'critical').length;

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 font-sans pb-24">
      
      {/* Хедер */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 rounded-2xl">
            <Bell size={32} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t('userAlarms.title', 'Мої Сповіщення')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('userAlarms.subtitle', 'Тривоги та події зі станцій, на які ви підписані')}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {criticalCount > 0 && (
            <div className="px-4 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm flex items-center gap-2 animate-pulse shadow-sm border border-red-200">
              <AlertTriangle size={16} />
              {criticalCount} {t('alarms.criticalCount', 'критичних')}
            </div>
          )}
          <button 
            onClick={() => fetchMyAlerts(false)} 
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-slate-300' : ''} />
            {t('common.refresh', 'Оновити')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Панель фільтрів */}
      {subscribedStations.length > 0 && (
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl flex-1 sm:flex-none overflow-x-auto custom-scrollbar">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t('alarms.allTypes', 'Всі події')}
            </button>
            <button 
              onClick={() => setStatusFilter('critical')}
              className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${statusFilter === 'critical' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500"></span> {t('alarms.critical', 'Критичні')}
            </button>
            <button 
              onClick={() => setStatusFilter('warning')}
              className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${statusFilter === 'warning' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-amber-600'}`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> {t('alarms.warning', 'Попередження')}
            </button>
          </div>
        </div>
      )}

      {/* Контент сторінки */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-200 rounded-3xl w-full"></div>
          ))}
        </div>
      ) : subscribedStations.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-300 text-center shadow-sm">
          <Bell size={64} className="mx-auto text-slate-300 mb-5 opacity-40" />
          <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{t('userAlarms.noSubscriptions', 'Немає підписок')}</h3>
          <p className="text-slate-500 text-lg mb-6">{t('userAlarms.noSubscriptionsDesc', 'Ви ще не підписані на жодну станцію, тому сповіщень немає.')}</p>
          <Link to="/dashboard" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">
            {t('userAlarms.goToMap', 'Перейти до карти станцій')}
          </Link>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-300 text-center shadow-sm">
          <ShieldCheck size={64} className="mx-auto text-emerald-400 mb-5 opacity-40" />
          <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{t('alarms.emptyTitle', 'Все спокійно')}</h3>
          <p className="text-slate-500 text-lg">{t('userAlarms.allQuietDesc', 'На станціях, на які ви підписані, немає активних тривог.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(alert => {
            const config = getAlertConfig(alert.type);
            
            return (
              <div key={alert.id} className={`p-5 sm:p-6 rounded-3xl border shadow-sm transition-all flex flex-col sm:flex-row gap-6 sm:items-center relative group hover:shadow-md ${config.bg} ${config.border}`}>
                
                {/* Іконка */}
                <div className="shrink-0 flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100">
                  {config.icon}
                </div>

                {/* Основна інформація */}
                <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${config.badge}`}>
                      {alert.type}
                    </span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1 opacity-80">
                      <Clock size={12} /> {formatTime(alert.createdAt)}
                    </span>
                  </div>
                  
                  <h3 className={`text-lg sm:text-xl font-extrabold mb-1 leading-tight ${config.text}`}>
                    {alert.message}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600 mt-3">
                    <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200/50 text-slate-600">
                      <MapPin size={14} className="text-slate-400" /> {getStationName(alert.stationId)}
                    </div>
                    {alert.type && (
                      <span className="flex items-center gap-1.5 bg-white/60 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200/50 text-slate-500">
                        {t('common.parameter', 'Параметр')}: <span className="uppercase text-[10px] font-black tracking-wider text-slate-700">{alert.type}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Кнопка переходу */}
                <div className="shrink-0 flex items-center justify-end border-t sm:border-t-0 sm:border-l border-slate-200/50 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                  <Link 
                    to={`/dashboard/stations/${alert.stationId}`} 
                    className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {t('userAlarms.stationDetails', 'Деталі станції')} <ChevronRight size={18} />
                  </Link>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserAlarmsPage;