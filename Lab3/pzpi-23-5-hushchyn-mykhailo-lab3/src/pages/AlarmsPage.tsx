import  { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, AlertCircle, CheckCircle2, 
  Clock, MapPin, RefreshCw, Trash2, 
} from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { alertService, type Alert, type AlertType } from '../services/alertService';
import { stationService } from '../services/stationService';

const AlarmsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  // Словник для зберігання імен станцій, якщо бекенд не повертає stationName
  const [stationNames, setStationNames] = useState<Record<string, string>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Фільтр статусу (Активні або Всі, оскільки бекенд має /active)
 
  const [typeFilter, setTypeFilter] = useState<'all' | AlertType>('all');

  // Модалка видалення
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: '' });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const canResolve = user && ['admin', 'manager', 'technician'].includes(user.role);
  const canDelete = user && user.role === 'admin';

  // --- Завантаження даних ---
  const fetchAlerts = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      let data: Alert[] = [];
      
      // Згідно з вашим API:
      // /alerts/active - повертає тільки активні
      // Якщо нам потрібні всі (включаючи вирішені), нам потрібно або додати новий роут на бекенді,
      // або, якщо у вас є загальний роут /alerts, використати його. 
      // Припускаємо, що для "all" ви використовуєте або завантаження по станціях, або загальний список.
      // Поки що використовуємо getActiveAlerts.
      
      data = await alertService.getActiveAlerts();

      // Якщо бекенд не повертає імена станцій, спробуємо завантажити їх (Опціонально)
      // Це залежить від реалізації вашого alertController.
      const uniqueStationIds = [...new Set(data.map(a => a.stationId))];
      const namesMap: Record<string, string> = { ...stationNames };
      
      // Завантажуємо імена станцій, яких ще немає в кеші
      const missingIds = uniqueStationIds.filter(id => !namesMap[id]);
      if (missingIds.length > 0) {
        await Promise.all(missingIds.map(async (id) => {
          try {
            const st = await stationService.getById(id);
            namesMap[id] = st.name;
          } catch (e) {
            namesMap[id] = t('alarms.unknownStation', 'Невідома станція');
          }
        }));
        setStationNames(namesMap);
      }

      setAlerts(data);
    } catch (err) {
      console.error(err);
      setError(t('alarms.loadError', 'Не вдалося завантажити тривоги. Перевірте підключення.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [stationNames, t]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => fetchAlerts(true), 20000); // Оновлення кожні 20 сек
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // --- Дії ---
  const handleResolve = async (id: string) => {
    if (!canResolve) return;
    try {
      await alertService.resolveAlert(id);
      // Локальне оновлення: прибираємо з активних
      setAlerts(prev => prev.filter(alert => alert.id !== id));
    } catch (err) {
      alert(t('alarms.resolveError', 'Помилка при закритті тривоги'));
    }
  };

  const handleDelete = async () => {
    setIsActionLoading(true);
    try {
      await alertService.deleteAlert(deleteConfirm.id);
      setAlerts(prev => prev.filter(alert => alert.id !== deleteConfirm.id));
      setDeleteConfirm({ isOpen: false, id: '' });
    } catch (err) {
      alert(t('alarms.deleteError', 'Помилка при видаленні тривоги'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- Локальна фільтрація ---
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter(alert => typeFilter === 'all' || alert.type === typeFilter)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [alerts, typeFilter]);

  // --- UI Helpers ---
  const getTypeConfig = (type: AlertType, isResolved: boolean) => {
    if (isResolved) {
      return { icon: <CheckCircle2 size={24} className="text-slate-400" />, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500' };
    }

    switch (type) {
      case 'critical':
        return { icon: <AlertTriangle size={24} className="text-red-600" />, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', badge: 'bg-red-100 text-red-700' };
      case 'warning':
        return { icon: <AlertCircle size={24} className="text-amber-500" />, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', badge: 'bg-amber-100 text-amber-700' };
      default:
        return { icon: <AlertCircle size={24} />, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', badge: 'bg-slate-100' };
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
    return date.toLocaleDateString();
  };

  const criticalCount = alerts.filter(a => !a.isResolved && a.type === 'critical').length;

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 font-sans">
      
      {/* Хедер */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-red-50 rounded-2xl">
            <AlertTriangle size={32} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t('nav.alerts', 'Системні тривоги')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('alarms.subtitle', 'Моніторинг критичних подій та попереджень')}</p>
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
            onClick={() => fetchAlerts(false)} 
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
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-2">
        <div className="flex bg-slate-100 p-1 rounded-xl flex-1 sm:flex-none overflow-x-auto">
          <button 
            onClick={() => setTypeFilter('all')}
            className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t('alarms.allTypes', 'Всі події')}
          </button>
          <button 
            onClick={() => setTypeFilter('critical')}
            className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${typeFilter === 'critical' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span> {t('alarms.critical', 'Критичні')}
          </button>
          <button 
            onClick={() => setTypeFilter('warning')}
            className={`px-5 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${typeFilter === 'warning' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-amber-600'}`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> {t('alarms.warning', 'Попередження')}
          </button>
        </div>
      </div>

      {/* Список тривог */}
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-slate-200 rounded-3xl w-full"></div>
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-300 text-center shadow-sm">
          <CheckCircle2 size={64} className="mx-auto text-emerald-400 mb-5 opacity-40" />
          <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{t('alarms.emptyTitle', 'Все спокійно')}</h3>
          <p className="text-slate-500 text-lg">{t('alarms.emptyDesc', 'Активних тривог не знайдено.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(alert => {
            const config = getTypeConfig(alert.type, alert.isResolved);
            
            return (
              <div key={alert.id} className={`p-5 sm:p-6 rounded-3xl border shadow-sm transition-all flex flex-col sm:flex-row gap-6 sm:items-center relative group ${config.bg} ${config.border}`}>
                
                {/* Іконка */}
                <div className="shrink-0 flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100">
                  {config.icon}
                </div>

                {/* Основна інформація */}
                <div className="flex-1 min-w-0 pr-10 sm:pr-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${config.badge}`}>
                      {t(`alarms.${alert.type}`, alert.type)}
                    </span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={12} /> {formatTime(alert.createdAt)}
                    </span>
                  </div>
                  
                  <h3 className={`text-lg sm:text-xl font-extrabold mb-1 leading-tight ${config.text}`}>
                    {alert.message}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600 mt-3">
                    <Link to={`/dashboard/stations/${alert.stationId}`} className="flex items-center gap-1.5 hover:text-blue-600 hover:bg-blue-50 transition-colors bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100">
                      <MapPin size={16} className="text-slate-400" /> {stationNames[alert.stationId] || t('alarms.station', 'Станція')}
                    </Link>
                    <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 text-slate-500">
                      {t('alarms.target', 'Ціль')}: <span className="uppercase text-[10px] font-black tracking-wider text-slate-700">{alert.targetRole}</span>
                    </span>
                  </div>
                </div>

                {/* Кнопки */}
                <div className="shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 sm:border-l border-slate-200/50 pt-5 sm:pt-0 sm:pl-6 w-full sm:w-auto">
                  {!alert.isResolved && canResolve && (
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      className="w-full sm:w-auto px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} /> {t('alarms.resolveBtn', 'Вирішити')}
                    </button>
                  )}

                  {canDelete && (
                    <button 
                      onClick={() => setDeleteConfirm({ isOpen: true, id: alert.id })}
                      className="w-full sm:w-auto px-6 py-3 bg-transparent text-slate-400 font-bold rounded-xl hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2 sm:mt-2"
                    >
                      <Trash2 size={18} /> {t('common.delete', 'Видалити')}
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Модалка Видалення */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 transform transition-all">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-2xl mb-3">{t('alarms.deleteConfirm', 'Видалити тривогу?')}</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {t('alarms.deleteDesc', 'Цю дію неможливо скасувати. Запис про тривогу буде видалено з бази даних.')}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm({ isOpen: false, id: '' })} className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                {t('common.cancel', 'Скасувати')}
              </button>
              <button onClick={handleDelete} disabled={isActionLoading} className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-red-500/20">
                {isActionLoading ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {t('common.delete', 'Видалити')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AlarmsPage;