import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, MapPin, RefreshCw, Plus, WifiOff, Wrench, 
  AlertCircle, ChevronRight, Search, Filter, Trash2, X, Server, Pencil
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/authStore';
import { useStationStore } from '../store/stationStore';
import { stationService } from '../services/stationService';
import type { Station, CreateStationDTO, StationStatus } from '../types/station';

const StationsListPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  // Отримуємо стан та методи зі стора
  const { stations, isLoading, error, fetchStations, createStation, deleteStation } = useStationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StationStatus>('all');

  // Модальні вікна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [deletingStation, setDeletingStation] = useState<Station | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Перевірка прав доступу
  const canManage: boolean = user ? ['admin', 'manager'].includes(user.role) : false;
  
  // Базовий шлях для правильної навігації у роутері
  const basePath = canManage ? '/admin' : '/dashboard';

  // Схема валідації Zod перенесена всередину компонента для доступу до t()
  const stationSchema = z.object({
    name: z.string().min(3, { message: t('stations.errors.nameMinLength', 'Мінімум 3 символи') }),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    status: z.enum(['active', 'offline', 'maintenance']),
  });

  // Налаштування React Hook Form
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(stationSchema),
    defaultValues: { status: 'active' }
  });

  // Завантажуємо станції при монтуванні
  useEffect(() => {
    fetchStations(canManage);
  }, [fetchStations, canManage]);

  const filteredStations = useMemo(() => {
    return stations.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [stations, searchQuery, statusFilter]);

  // Відкриття модалки СТВОРЕННЯ
  const openCreateModal = () => {
    setEditingStation(null);
    reset({ name: '', latitude: '', longitude: '', status: 'active' }); 
    setIsModalOpen(true);
  };

  // Відкриття модалки РЕДАГУВАННЯ
  const openEditModal = (station: Station) => {
    setEditingStation(station);
    setValue('name', station.name);
    setValue('latitude', station.latitude !== null ? String(station.latitude) : '');
    setValue('longitude', station.longitude !== null ? String(station.longitude) : '');
    setValue('status', station.status);
    setIsModalOpen(true);
  };

  // Обробка форми (Створення та Редагування)
  const onSubmit = async (data: any) => {
    setIsActionLoading(true);
    
    const payload: Partial<CreateStationDTO> = {
      name: data.name,
      latitude: data.latitude ? Number(data.latitude) : undefined,
      longitude: data.longitude ? Number(data.longitude) : undefined,
      status: data.status as StationStatus,
    };

    try {
      if (editingStation) {
        await stationService.update(editingStation.id, payload);
        await fetchStations(canManage); // Оновлюємо список після редагування
      } else {
        await createStation(payload as CreateStationDTO);
      }
      setIsModalOpen(false);
      setEditingStation(null);
      reset();
    } catch (err) {
      console.error(err);
      alert(t('stations.saveError', 'Помилка при збереженні станції'));
    } finally {
      setIsActionLoading(false);
    }
  };

  // Обробка видалення
  const handleDeleteConfirm = async () => {
    if (!deletingStation) return;
    setIsActionLoading(true);
    try {
      await deleteStation(deletingStation.id);
      setDeletingStation(null);
    } catch (err) {
      console.error(err);
      alert(t('stations.deleteError', 'Помилка при видаленні станції'));
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 font-sans pb-20">
      
      {/* Хедер */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
            <Server size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t('nav.stations', 'Мої Станції')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('stations.subtitle', 'Огляд та керування IoT станціями')}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button onClick={() => fetchStations(canManage)} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors shadow-sm" title={t('common.refresh', 'Оновити')}>
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {canManage && (
            <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm">
              <Plus size={18} /> {t('stations.create', 'Створити станцію')}
            </button>
          )}
        </div>
      </div>

      {/* Панель Фільтрів */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('stations.searchPlaceholder', 'Пошук за назвою станції...')} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors font-medium" 
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl overflow-x-auto">
          <Filter size={18} className="text-slate-400 ml-2 hidden sm:block" />
          <button onClick={() => setStatusFilter('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t('common.all', 'Всі')}</button>
          <button onClick={() => setStatusFilter('active')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${statusFilter === 'active' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-emerald-700'}`}>{t('stations.status.active', 'Активні')}</button>
          <button onClick={() => setStatusFilter('maintenance')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${statusFilter === 'maintenance' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-amber-700'}`}>{t('stations.status.maintenance', 'В обслуговуванні')}</button>
          <button onClick={() => setStatusFilter('offline')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${statusFilter === 'offline' ? 'bg-slate-200 text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t('stations.status.offline', 'Офлайн')}</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Сітка станцій */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-slate-200 rounded-3xl"></div>)}
        </div>
      ) : filteredStations.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-300 text-center shadow-sm">
          <Server size={64} className="mx-auto text-slate-300 mb-5 opacity-40" />
          <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{t('stations.notFound', 'Станцій не знайдено')}</h3>
          <p className="text-slate-500">{t('stations.notFoundDesc', 'Змініть фільтри або створіть нову станцію.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStations.map(station => (
            <div key={station.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col overflow-hidden">
              <div className="p-6 pb-4 border-b border-slate-100 flex-1">
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                    station.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                    station.status === 'maintenance' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {station.status === 'active' && <Activity size={12} />}
                    {station.status === 'maintenance' && <Wrench size={12} />}
                    {station.status === 'offline' && <WifiOff size={12} />}
                    {t(`stations.status.${station.status}`, station.status)}
                  </span>
                  
                  {/* Кнопки редагування та видалення */}
                  {canManage && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur rounded-lg p-1">
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditModal(station); }} 
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                        title={t('common.edit', 'Редагувати')}
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingStation(station); }} 
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                        title={t('common.delete', 'Видалити')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-3 line-clamp-2" title={station.name}>{station.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-auto">
                  <MapPin size={14} className="text-slate-400" />
                  {station.latitude || 0}, {station.longitude || 0}
                </div>
              </div>
              <div className="p-4 bg-slate-50/50">
                <Link 
                  to={`${basePath}/stations/${station.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-sm"
                >
                  {t('stations.goToDashboard', 'Перейти до дашборду')} <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* МОДАЛКА: СТВОРЕННЯ / РЕДАГУВАННЯ СТАНЦІЇ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="font-extrabold text-slate-900 text-xl">
                {editingStation ? t('stations.editStation', 'Редагувати станцію') : t('stations.createStation', 'Нова станція')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('stations.form.name', 'Назва станції')} <span className="text-red-500">*</span></label>
                <input 
                  {...register('name')}
                  placeholder={t('stations.form.namePlaceholder', 'Напр. Насосна станція №1')}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-xl focus:ring-2 outline-none transition-colors ${errors?.name ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-emerald-500'}`} 
                />
                {errors?.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{String(errors.name.message)}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('stations.form.latitude', 'Широта (Lat)')}</label>
                  <input 
                    type="number" step="any" {...register('latitude')}
                    placeholder="48.46" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-colors" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('stations.form.longitude', 'Довгота (Lng)')}</label>
                  <input 
                    type="number" step="any" {...register('longitude')}
                    placeholder="35.04" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-colors" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.status', 'Статус')}</label>
                <select 
                  {...register('status')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer text-slate-700"
                >
                  <option value="active">{t('stations.status.active', 'Активна')}</option>
                  <option value="maintenance">{t('stations.status.maintenance', 'В обслуговуванні')}</option>
                  <option value="offline">{t('stations.status.offline', 'Офлайн')}</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  {t('common.cancel', 'Скасувати')}
                </button>
                <button type="submit" disabled={isActionLoading} className="px-5 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all">
                  {isActionLoading && <RefreshCw size={16} className="animate-spin" />} 
                  {editingStation ? t('common.save', 'Зберегти') : t('common.create', 'Створити')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* МОДАЛКА: ВИДАЛЕННЯ */}
      {deletingStation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden text-center p-8">
            <AlertCircle className="mx-auto text-red-600 mb-6" size={48} />
            <h3 className="font-extrabold text-slate-900 text-2xl mb-3">{t('stations.deleteConfirmTitle', 'Видалити станцію?')}</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {t('common.deleteConfirmText', 'Ви збираєтесь видалити')} <strong className="text-slate-800">{deletingStation.name}</strong>. {t('common.cannotUndo', 'Цю дію неможливо скасувати.')}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeletingStation(null)} disabled={isActionLoading} className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                {t('common.cancel', 'Скасувати')}
              </button>
              <button onClick={handleDeleteConfirm} disabled={isActionLoading} className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-red-500/20">
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

export default StationsListPage;