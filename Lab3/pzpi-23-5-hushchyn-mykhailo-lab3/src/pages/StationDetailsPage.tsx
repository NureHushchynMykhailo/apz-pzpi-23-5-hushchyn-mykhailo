import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, Activity, MapPin, Cpu, Settings2, RefreshCw, 
  AlertCircle, Droplets, Thermometer, Zap, Power, TrendingUp,
  History, X, Plus, Pencil, Trash2, Users, Link as LinkIcon, UserMinus, BellRing, BarChart3
} from 'lucide-react';

import { useAuthStore } from '../store/authStore';
import { stationService } from '../services/stationService';
import { equipmentService, type Sensor, type Actuator, type ActuatorState } from '../services/equipmentService';
import { telemetryService, type LatestTelemetry } from '../services/telemetryService';
import { userService, type User } from '../services/userService';
import { parameterService, type Parameter } from '../services/parameterService';
import { thresholdService, type Threshold } from '../services/thresholdService';
import type { Station } from '../types/station';

const StationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();

  // --- Стан даних ---
  const [station, setStation] = useState<Station | null>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [liveActuators, setLiveActuators] = useState<Record<string, ActuatorState>>({});
  const [telemetry, setTelemetry] = useState<Record<string, LatestTelemetry>>({});
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  
  // Стан для персоналу
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Стан модальних вікон CRUD ---
  const [isManageLoading, setIsManageLoading] = useState(false);
  const [sensorModal, setSensorModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; data: Sensor | null }>({ isOpen: false, mode: 'create', data: null });
  const [actuatorModal, setActuatorModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; data: Actuator | null }>({ isOpen: false, mode: 'create', data: null });
  const [thresholdModal, setThresholdModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; data: Threshold | null }>({ isOpen: false, mode: 'create', data: null });
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'sensor' | 'actuator' | 'threshold'; id: string; name: string }>({ isOpen: false, type: 'sensor', id: '', name: '' });
  const [logModal, setLogModal] = useState<{ isOpen: boolean; type: 'sensor' | 'actuator'; id: string; title: string; unit?: string; }>({ isOpen: false, type: 'sensor', id: '', title: '' });
  const [logsData, setLogsData] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Права доступу
  const canManage = currentUser && ['admin', 'manager'].includes(currentUser.role);
  const canControl = currentUser && ['admin', 'manager', 'technician'].includes(currentUser.role);
  
  // Доступ до статистики мають тільки admin, manager, analyst
  const canViewStats = currentUser && ['admin', 'manager', 'analyst'].includes(currentUser.role);
  const basePath = currentUser && ['admin', 'manager'].includes(currentUser.role) ? '/admin' : '/dashboard';

  // --- Завантаження даних ---
  const fetchData = useCallback(async (isSilent = false) => {
    if (!id) return;
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [stationRes, sensorsRes, actuatorsRes, liveStatesRes, telemetryRes, usersRes, paramsRes, threshRes] = await Promise.all([
        stationService.getById(id),
        equipmentService.getStationSensors(id),
        equipmentService.getStationActuators(id),
        equipmentService.getActuatorsLiveState(id),
        telemetryService.getStationSnapshot(id),
        stationService.getAssignedUsers(id),
        parameterService.getAll(),
        thresholdService.getByStation(id)
      ]);

      setStation(stationRes);
      setSensors(sensorsRes);
      setActuators(actuatorsRes);
      setAssignedUsers(usersRes);
      setParameters(paramsRes);
      setThresholds(threshRes);

      const liveMap: Record<string, ActuatorState> = {};
      liveStatesRes.forEach(state => { liveMap[state.id] = state; });
      setLiveActuators(liveMap);

      const telMap: Record<string, LatestTelemetry> = {};
      telemetryRes.forEach(tData => { telMap[tData.sensorId] = tData; });
      setTelemetry(telMap);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(t('stationDetails.errorLoading', 'Не вдалося завантажити дані. Перевірте з’єднання з сервером.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 15000); 
    return () => clearInterval(timer);
  }, [fetchData]);

  // --- УПРАВЛІННЯ АКТУАТОРАМИ ---
  const handleSliderDrag = (actuatorId: string, value: number) => {
    if (!canControl) return;
    setLiveActuators(prev => ({
      ...prev,
      [actuatorId]: { ...prev[actuatorId] || { id: actuatorId }, activationPercentage: value.toString() } as ActuatorState
    }));
  };

  const handleSliderCommit = async (actuatorId: string, value: number) => {
    if (!canControl) return;
    try {
      const isActive = value > 0;
      await equipmentService.updateActuator(actuatorId, { activationPercentage: value, isActive });
      setActuators(prev => prev.map(a => a.id === actuatorId ? { ...a, isActive } : a));
    } catch (err) { fetchData(true); }
  };

  const toggleDevice = async (actuator: Actuator) => {
    if (!canControl) return;
    try {
      const newState = !actuator.isActive;
      const currentPower = Number(liveActuators[actuator.id]?.activationPercentage || 0);
      const payload: any = { isActive: newState };
      if (newState && currentPower === 0) payload.activationPercentage = 100;
      
      await equipmentService.updateActuator(actuator.id, payload);
      setActuators(prev => prev.map(a => a.id === actuator.id ? { ...a, isActive: newState } : a));
      if (payload.activationPercentage) {
        setLiveActuators(prev => ({ ...prev, [actuator.id]: { ...prev[actuator.id], activationPercentage: '100' } }));
      }
    } catch (err) { console.error('Toggle device failed:', err); }
  };

  // --- CRUD ДІЇ ---
  const handleSensorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    setIsManageLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      if (sensorModal.mode === 'create') {
        await equipmentService.createSensor({
          stationId: id,
          parameterId: formData.get('parameterId') as string,
          type: formData.get('type') as string,
          model: formData.get('model') as string || undefined,
          serialNumber: formData.get('serialNumber') as string || undefined,
          isActive: formData.get('isActive') === 'true'
        });
      } else if (sensorModal.data) {
        await equipmentService.updateSensor(sensorModal.data.id, {
          model: formData.get('model') as string || null,
          serialNumber: formData.get('serialNumber') as string || null,
          isActive: formData.get('isActive') === 'true'
        } as any);
      }
      setSensorModal({ isOpen: false, mode: 'create', data: null });
      fetchData(true);
    } catch (err) { alert(t('stationDetails.saveError', 'Помилка при збереженні')); } 
    finally { setIsManageLoading(false); }
  };

  const handleActuatorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    setIsManageLoading(true);
    const formData = new FormData(e.currentTarget);
    try {
      if (actuatorModal.mode === 'create') {
        await equipmentService.createActuator({
          stationId: id,
          name: formData.get('name') as string,
          type: formData.get('type') as any,
          isActive: formData.get('isActive') === 'true'
        });
      } else if (actuatorModal.data) {
        await equipmentService.updateActuator(actuatorModal.data.id, {
          isActive: formData.get('isActive') === 'true'
        } as any);
      }
      setActuatorModal({ isOpen: false, mode: 'create', data: null });
      fetchData(true);
    } catch (err) { alert(t('stationDetails.createError', 'Помилка при збереженні')); } 
    finally { setIsManageLoading(false); }
  };

  const handleThresholdSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    setIsManageLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      minWarning: formData.get('minWarning') ? Number(formData.get('minWarning')) : undefined,
      maxWarning: formData.get('maxWarning') ? Number(formData.get('maxWarning')) : undefined,
      minCritical: formData.get('minCritical') ? Number(formData.get('minCritical')) : undefined,
      maxCritical: formData.get('maxCritical') ? Number(formData.get('maxCritical')) : undefined,
    };

    try {
      if (thresholdModal.mode === 'create') {
        await thresholdService.create({
          stationId: id,
          parameterId: formData.get('parameterId') as string,
          ...payload
        });
      } else if (thresholdModal.data) {
        await thresholdService.update(thresholdModal.data.id, payload);
      }
      setThresholdModal({ isOpen: false, mode: 'create', data: null });
      fetchData(true);
    } catch (err) { alert(t('stationDetails.createError', 'Помилка при збереженні')); } 
    finally { setIsManageLoading(false); }
  };

  const executeDelete = async () => {
    setIsManageLoading(true);
    try {
      if (deleteConfirm.type === 'sensor') await equipmentService.deleteSensor(deleteConfirm.id);
      else if (deleteConfirm.type === 'actuator') await equipmentService.deleteActuator(deleteConfirm.id);
      else if (deleteConfirm.type === 'threshold') await thresholdService.delete(deleteConfirm.id);
      
      setDeleteConfirm({ isOpen: false, type: 'sensor', id: '', name: '' });
      fetchData(true);
    } catch (err) { alert(t('stationDetails.deleteError', 'Помилка при видаленні')); } 
    finally { setIsManageLoading(false); }
  };

  // --- ЛОГІКА ІСТОРІЇ (Телеметрія/Логи) ---
  const openLogs = async (type: 'sensor' | 'actuator', equipmentId: string, title: string, unit?: string) => {
    setLogModal({ isOpen: true, type, id: equipmentId, title, unit });
    setIsLoadingLogs(true);
    setLogsData([]);
    try {
      const data = type === 'sensor' 
        ? await telemetryService.getSensorHistory(equipmentId) 
        : await equipmentService.getActuatorHistory(equipmentId);
      setLogsData(data);
    } catch (err) { console.error(err); } 
    finally { setIsLoadingLogs(false); }
  };

  // --- ЛОГІКА ПЕРСОНАЛУ ---
  const handleOpenAssignModal = async () => {
    setAssignModalOpen(true);
    try {
      const usersList = await userService.getUsers();
      setAllUsers(usersList);
    } catch (e) { 
      console.error(t('stationDetails.errorLoadingUsersLog', 'Не вдалося завантажити всіх користувачів'), e); 
    }
  };

  const handleAssignUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id) return;
    const formData = new FormData(e.currentTarget);
    const userId = formData.get('userId') as string;
    try {
      await stationService.assignUser(id, userId);
      setAssignModalOpen(false);
      fetchData(true);
    } catch (e) { alert(t('stationDetails.assignError', 'Помилка прив\'язки. Можливо користувач вже призначений.')); }
  };

  const handleUnassignUser = async (userId: string) => {
    if (!id || !window.confirm(t('stationDetails.unassignConfirm', 'Відкріпити цього користувача від станції?'))) return;
    try {
      await stationService.unassignUser(id, userId);
      fetchData(true);
    } catch (e) { alert(t('stationDetails.unassignError', 'Помилка відкріплення.')); }
  };

  // --- ХЕЛПЕРИ ---
  const getIconForSensor = (type: string) => {
    const tStr = type.toLowerCase();
    if (tStr.includes('ph') || tStr.includes('water')) return <Droplets className="text-blue-500" />;
    if (tStr.includes('temp')) return <Thermometer className="text-orange-500" />;
    if (tStr.includes('volt') || tStr.includes('energy')) return <Zap className="text-yellow-500" />;
    return <Activity className="text-emerald-500" />;
  };

  const translateActuatorType = (type: string) => {
    const typeMap: Record<string, string> = {
      'pump': t('equipment.types.pump', 'Насос'),
      'aerator': t('equipment.types.aerator', 'Аератор'),
      'filter': t('equipment.types.filter', 'Фільтр'),
      'valve': t('equipment.types.valve', 'Клапан'),
      'dispenser_chlorine': t('equipment.types.dispenser_chlorine', 'Дозатор Хлору'),
      'dispenser_acid': t('equipment.types.dispenser_acid', 'Дозатор Кислоти'),
      'dispenser_alkali': t('equipment.types.dispenser_alkali', 'Дозатор Лугу'),
    };
    return typeMap[type] || type.replace('_', ' ');
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 animate-pulse">
        <div className="h-24 bg-slate-200 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto relative font-sans pb-20">
      
      {/* Хедер сторінки */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full transition-colors" title={t('common.back', 'Назад')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{station?.name || t('stationDetails.untitled', 'Без назви')}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <MapPin size={14} className="text-slate-400" /> 
              <span>{station?.latitude || '0'}, {station?.longitude || '0'}</span>
              <span className={`ml-3 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${
                station?.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                station?.status === 'maintenance' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {station?.status ? t(`stations.status.${station.status}`, station.status) : t('stations.status.offline', 'Офлайн')}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => fetchData(false)} className="px-5 py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2">
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} /> {t('common.refresh', 'Оновити')}
          </button>

          {/* НОВА КНОПКА: СТАТИСТИКА */}
          {canViewStats && (
            <Link 
              to={`${basePath}/stations/${id}/statistics`} 
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20 flex items-center gap-2"
            >
              <BarChart3 size={16} /> {t('common.analytics', 'Аналітика')}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* КОЛОНКА 1: СЕНСОРИ ТА ПОРОГИ */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* СЕКЦІЯ: ТЕЛЕМЕТРІЯ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp size={22} className="text-blue-500" /> {t('stationDetails.telemetry', 'Телеметрія')}
              </h2>
              {canManage && (
                <button onClick={() => setSensorModal({ isOpen: true, mode: 'create', data: null })} className="flex items-center gap-1.5 text-sm font-semibold bg-blue-50 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                  <Plus size={16} /> {t('stationDetails.addSensor', 'Додати сенсор')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sensors.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
                  <Cpu size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-medium text-lg">{t('stationDetails.noSensors', 'Сенсори не підключені')}</p>
                </div>
              ) : (
                sensors.map(sensor => {
                  const data = telemetry[sensor.id];
                  const displayParameterName = data?.parameterName || parameters.find(p => p.id === sensor.parameterId)?.name || t('equipment.types.sensor', 'Сенсор');

                  return (
                    <div key={sensor.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-300 transition-all duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-start gap-4 min-w-0 pr-2">
                          <div className="p-3 bg-slate-50 rounded-xl shrink-0">{getIconForSensor(data?.type || sensor.type)}</div>
                          <div className="min-w-0">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight truncate">{displayParameterName}</h4>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5 truncate max-w-[140px]">{sensor.model || 'N/A'}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[140px]">SN: {sensor.serialNumber || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-100 shrink-0">
                          <button onClick={() => openLogs('sensor', sensor.id, displayParameterName, data?.unit)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors rounded-md" title={t('common.history', 'Історія')}><History size={16} /></button>
                          {canManage && (
                            <>
                              <button onClick={() => setSensorModal({ isOpen: true, mode: 'edit', data: sensor })} className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded-md" title={t('common.edit', 'Редагувати')}><Pencil size={16} /></button>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, type: 'sensor', id: sensor.id, name: sensor.model || t('equipment.types.sensor', 'Сенсор') })} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md" title={t('common.delete', 'Видалити')}><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1.5 my-4">
                        <span className="text-4xl font-extrabold text-slate-900">{data ? data.value : '--'}</span>
                        <span className="text-base font-semibold text-slate-400">{data?.unit}</span>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${sensor.isActive ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'}`}>
                          {sensor.isActive ? t('common.active', 'ACTIVE') : t('common.offline', 'OFFLINE')}
                        </span>
                        {data?.measuredAt && <span className="text-xs font-medium text-slate-400">{new Date(data.measuredAt).toLocaleTimeString()}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* СЕКЦІЯ: ПОРОГОВІ ЗНАЧЕННЯ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <BellRing size={22} className="text-amber-500" /> {t('stationDetails.thresholds', 'Сповіщення (Пороги)')}
              </h2>
              {canManage && (
                <button onClick={() => setThresholdModal({ isOpen: true, mode: 'create', data: null })} className="flex items-center gap-1.5 text-sm font-semibold bg-amber-50 text-amber-600 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors">
                  <Plus size={16} /> {t('stationDetails.addThreshold', 'Додати поріг')}
                </button>
              )}
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {thresholds.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <BellRing size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-sm">{t('stationDetails.noThresholds', 'Немає налаштованих порогових значень')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 tracking-wider">
                        <th className="py-3 px-5">{t('common.parameter', 'Параметр')}</th>
                        <th className="py-3 px-5 text-center text-amber-600">{t('stationDetails.warningMinMax', 'Попередження (Min/Max)')}</th>
                        <th className="py-3 px-5 text-center text-red-600">{t('stationDetails.criticalMinMax', 'Критично (Min/Max)')}</th>
                        {canManage && <th className="py-3 px-5 text-right">{t('common.actions', 'Дії')}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {thresholds.map(thr => {
                        const param = parameters.find(p => p.id === thr.parameterId);
                        return (
                          <tr key={thr.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-3 px-5 font-bold text-slate-800">{param?.name || t('common.unknown', 'Невідомо')} <span className="text-xs font-medium text-slate-400 ml-1">({param?.unit})</span></td>
                            <td className="py-3 px-5 text-center text-sm font-medium text-slate-600">
                              <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md">{thr.minWarning ?? '-'}</span>
                              <span className="mx-2 text-slate-300">...</span>
                              <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded-md">{thr.maxWarning ?? '-'}</span>
                            </td>
                            <td className="py-3 px-5 text-center text-sm font-medium text-slate-600">
                              <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md">{thr.minCritical ?? '-'}</span>
                              <span className="mx-2 text-slate-300">...</span>
                              <span className="bg-red-50 text-red-700 px-2 py-1 rounded-md">{thr.maxCritical ?? '-'}</span>
                            </td>
                            {canManage && (
                              <td className="py-3 px-5 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setThresholdModal({ isOpen: true, mode: 'edit', data: thr })} className="p-1.5 text-slate-400 hover:text-amber-500 rounded-md" title={t('common.edit', 'Редагувати')}><Pencil size={16} /></button>
                                  <button onClick={() => setDeleteConfirm({ isOpen: true, type: 'threshold', id: thr.id, name: `${t('stationDetails.thresholdsFor', 'Пороги для')} ${param?.name || t('common.parameterLower', 'параметра')}` })} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md" title={t('common.delete', 'Видалити')}><Trash2 size={16} /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* КОЛОНКА 2: АКТУАТОРИ */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Settings2 size={22} className="text-purple-500" /> {t('stationDetails.actuators', 'Керування')}
            </h2>
            {canManage && (
              <button onClick={() => setActuatorModal({ isOpen: true, mode: 'create', data: null })} className="flex items-center gap-1.5 text-sm font-semibold bg-purple-50 text-purple-600 px-4 py-2 rounded-xl hover:bg-purple-100 transition-colors">
                <Plus size={16} /> {t('stationDetails.addActuator', 'Додати')}
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {actuators.length === 0 ? (
               <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-400">
                 <Power size={40} className="mx-auto mb-3 opacity-50" />
                 <p className="font-medium text-lg">{t('stationDetails.noActuators', 'Контролери відсутні')}</p>
               </div>
            ) : (
              actuators.map(actuator => {
                const live = liveActuators[actuator.id];
                const powerLevel = Number(live?.activationPercentage || 0);
                
                return (
                  <div key={actuator.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:border-purple-300 transition-all flex flex-col">
                    <div className="flex justify-between items-center mb-5">
                      <div className="flex items-center gap-4 min-w-0 pr-2">
                        <div className={`p-3 rounded-xl transition-colors shrink-0 ${actuator.isActive ? 'bg-purple-100 text-purple-600 shadow-inner' : 'bg-slate-100 text-slate-400'}`}>
                          <Power size={20} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-slate-900 leading-tight truncate">{actuator.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider truncate">{translateActuatorType(actuator.type)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-lg p-1 shadow-sm border border-slate-100">
                          <button onClick={() => openLogs('actuator', actuator.id, actuator.name)} className="p-1.5 text-slate-400 hover:text-purple-600 transition-colors rounded-md" title={t('common.history', 'Історія')}><History size={16} /></button>
                          {canManage && (
                            <>
                              <button onClick={() => setActuatorModal({ isOpen: true, mode: 'edit', data: actuator })} className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors rounded-md" title={t('common.edit', 'Редагувати')}><Pencil size={16} /></button>
                              <button onClick={() => setDeleteConfirm({ isOpen: true, type: 'actuator', id: actuator.id, name: actuator.name })} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-md" title={t('common.delete', 'Видалити')}><Trash2 size={16} /></button>
                            </>
                          )}
                        </div>

                        <button 
                          onClick={() => toggleDevice(actuator)} disabled={!canControl}
                          className={`w-12 h-7 rounded-full transition-all relative focus:outline-none shadow-inner shrink-0 ${actuator.isActive ? 'bg-emerald-500' : 'bg-slate-200'} ${!canControl && 'opacity-50 cursor-not-allowed'}`}
                        ><div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${actuator.isActive ? 'left-6' : 'left-1'}`} /></button>
                      </div>
                    </div>

                    <div className="mt-2 space-y-3 pt-5 border-t border-slate-100">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('stationDetails.power', 'Потужність')}</span>
                        <span className="text-sm font-black text-slate-800">{powerLevel}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="100" step="1"
                        disabled={!canManage || !actuator.isActive} value={powerLevel}
                        onChange={(e) => handleSliderDrag(actuator.id, Number(e.target.value))}
                        onMouseUp={(e) => handleSliderCommit(actuator.id, Number(e.currentTarget.value))}
                        onTouchEnd={(e) => handleSliderCommit(actuator.id, Number(e.currentTarget.value))}
                        className={`w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none transition-opacity ${!actuator.isActive || !canManage ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'bg-purple-100'}`}
                        style={{ background: actuator.isActive && canManage ? `linear-gradient(to right, #9333ea ${powerLevel}%, #f3e8ff ${powerLevel}%)` : undefined }}
                      />
                      {live?.statusMessage && <p className="text-xs text-slate-500 italic bg-slate-50 py-2 px-3 rounded-lg border border-slate-100 mt-2">{live.statusMessage}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* БЛОК: ПРИЗНАЧЕНИЙ ПЕРСОНАЛ */}
      <div className="mt-10 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Users size={20} /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('stationDetails.assignedStaff', 'Призначений персонал')}</h2>
              <p className="text-xs text-slate-500">{t('stationDetails.assignedStaffDesc', 'Користувачі, які мають доступ до цієї станції')}</p>
            </div>
          </div>
          {canManage && (
            <button onClick={handleOpenAssignModal} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-sm rounded-xl transition-colors">
              <LinkIcon size={16} /> {t('common.assign', 'Прив\'язати')}
            </button>
          )}
        </div>
        
        <div className="p-0">
          {assignedUsers.length === 0 ? (
             <div className="p-10 text-center text-slate-400 font-medium">{t('stationDetails.noAssignedUsers', 'До станції не прив\'язано жодного співробітника')}</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {assignedUsers.map(u => (
                <li key={u.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-200 text-slate-600 font-bold rounded-full flex items-center justify-center">
                      {u.fullName?.[0] || 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{u.fullName}</h4>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{u.role}</p>
                    </div>
                  </div>
                  {canManage && (
                    <button onClick={() => handleUnassignUser(u.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all" title={t('stationDetails.unassignUser', 'Відкріпити від станції')}>
                      <UserMinus size={18} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* =========================================
          МОДАЛЬНІ ВІКНА (CRUD ТА ЛОГИ) 
          ========================================= */}

      {/* Створення / Редагування Сенсора */}
      {sensorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-xl">{sensorModal.mode === 'create' ? t('stationDetails.addSensor', 'Додати сенсор') : t('common.edit', 'Редагувати')}</h3>
              <button onClick={() => setSensorModal({ isOpen: false, mode: 'create', data: null })} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <form onSubmit={handleSensorSubmit} className="p-6 space-y-5">
              {sensorModal.mode === 'create' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.parameter', 'Параметр вимірювання')}</label>
                    <select name="parameterId" required defaultValue={sensorModal.data?.parameterId || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer text-slate-700">
                      <option value="" disabled>{t('common.select', 'Оберіть...')}</option>
                      {parameters.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.type', 'Тип сенсора')}</label>
                    <input name="type" required placeholder={t('stationDetails.sensorTypePlaceholder', "ph_meter, thermometer...")} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.model', 'Модель')}</label>
                  <input name="model" defaultValue={sensorModal.data?.model || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.serialNumber', 'Серійний номер')}</label>
                  <input name="serialNumber" defaultValue={sensorModal.data?.serialNumber || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <input type="checkbox" name="isActive" id="isActiveSens" value="true" defaultChecked={sensorModal.data?.isActive ?? true} className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="isActiveSens" className="text-sm font-semibold text-slate-700">{t('stationDetails.setActive', 'Активний пристрій')}</label>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setSensorModal({ isOpen: false, mode: 'create', data: null })} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel', 'Скасувати')}</button>
                <button type="submit" disabled={isManageLoading} className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all">
                  {isManageLoading ? t('common.saving', 'Збереження...') : t('common.save', 'Зберегти')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Створення / Редагування Порогових значень */}
      {thresholdModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50/50">
              <h3 className="font-extrabold text-slate-900 text-xl">{thresholdModal.mode === 'create' ? t('stationDetails.addThresholdModal', 'Додати поріг сповіщень') : t('stationDetails.editThresholdModal', 'Редагувати пороги')}</h3>
              <button onClick={() => setThresholdModal({ isOpen: false, mode: 'create', data: null })} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <form onSubmit={handleThresholdSubmit} className="p-6 space-y-6">
              
              {thresholdModal.mode === 'create' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.parameter', 'Параметр вимірювання')}</label>
                  <select name="parameterId" required defaultValue={thresholdModal.data?.parameterId || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer text-slate-700">
                    <option value="" disabled>{t('stationDetails.selectParameter', 'Оберіть параметр...')}</option>
                    {parameters.filter(p => !thresholds.some(t => t.parameterId === p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-amber-700 bg-amber-50 p-2 rounded-lg">{t('stationDetails.warningLevel', 'Рівень Попередження (Warning)')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.minimum', 'Мінімум')}</label>
                    <input type="number" step="any" name="minWarning" defaultValue={thresholdModal.data?.minWarning || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.maximum', 'Максимум')}</label>
                    <input type="number" step="any" name="maxWarning" defaultValue={thresholdModal.data?.maxWarning || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-red-700 bg-red-50 p-2 rounded-lg">{t('stationDetails.criticalLevel', 'Критичний Рівень (Critical)')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('stationDetails.criticalMin', 'Критичний Мінімум')}</label>
                    <input type="number" step="any" name="minCritical" defaultValue={thresholdModal.data?.minCritical || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('stationDetails.criticalMax', 'Критичний Максимум')}</label>
                    <input type="number" step="any" name="maxCritical" defaultValue={thresholdModal.data?.maxCritical || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setThresholdModal({ isOpen: false, mode: 'create', data: null })} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">{t('common.cancel', 'Скасувати')}</button>
                <button type="submit" disabled={isManageLoading} className="px-5 py-2.5 text-sm font-bold bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
                  {isManageLoading ? t('common.saving', 'Збереження...') : t('stationDetails.saveThresholds', 'Зберегти пороги')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Створення / Редагування Актуатора */}
      {actuatorModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-xl">{actuatorModal.mode === 'create' ? t('stationDetails.addActuatorFull', 'Додати контролер') : t('common.edit', 'Редагувати')}</h3>
              <button onClick={() => setActuatorModal({ isOpen: false, mode: 'create', data: null })} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <form onSubmit={handleActuatorSubmit} className="p-6 space-y-5">
              {actuatorModal.mode === 'create' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.name', 'Назва')}</label>
                    <input name="name" required placeholder={t('stationDetails.examplePump', 'Напр. Головний насос')} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.type', 'Тип пристрою')}</label>
                    <select name="type" required defaultValue="pump" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all cursor-pointer text-slate-700">
                      <option value="pump">{t('equipment.types.pump', 'Насос (Pump)')}</option>
                      <option value="aerator">{t('equipment.types.aerator', 'Аератор (Aerator)')}</option>
                      <option value="filter">{t('equipment.types.filter', 'Фільтр (Filter)')}</option>
                      <option value="valve">{t('equipment.types.valve', 'Клапан (Valve)')}</option>
                      <option value="dispenser_chlorine">{t('equipment.types.dispenser_chlorine', 'Дозатор Хлору')}</option>
                      <option value="dispenser_acid">{t('equipment.types.dispenser_acid', 'Дозатор Кислоти')}</option>
                      <option value="dispenser_alkali">{t('equipment.types.dispenser_alkali', 'Дозатор Лугу')}</option>
                    </select>
                  </div>
                </>
              )}
              <div className="flex items-center gap-3 pt-2 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <input type="checkbox" name="isActive" id="isActiveAct" value="true" defaultChecked={actuatorModal.data?.isActive ?? false} className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                <label htmlFor="isActiveAct" className="text-sm font-semibold text-slate-700">
                  {actuatorModal.mode === 'create' ? t('stationDetails.turnOnImmediately', 'Увімкнути після додавання') : t('stationDetails.setActive', 'Активний пристрій')}
                </label>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setActuatorModal({ isOpen: false, mode: 'create', data: null })} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel', 'Скасувати')}</button>
                <button type="submit" disabled={isManageLoading} className="px-5 py-2.5 text-sm font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 shadow-md shadow-purple-500/20 transition-all">
                  {isManageLoading ? t('common.saving', 'Збереження...') : t('common.save', 'Зберегти')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Підтвердження видалення */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 transform transition-all">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-2xl mb-3">{t('stationDetails.deleteObject', 'Видалити об\'єкт?')}</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {t('stationDetails.deleteConfirmPrefix', 'Ви збираєтесь видалити ')} <strong className="text-slate-800">{deleteConfirm.name}</strong>{t('stationDetails.deleteConfirmSuffix', '. Цю дію неможливо скасувати.')}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm({ isOpen: false, type: 'sensor', id: '', name: '' })} className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                {t('common.cancel', 'Скасувати')}
              </button>
              <button onClick={executeDelete} disabled={isManageLoading} className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-red-500/20">
                {isManageLoading ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />} {t('common.delete', 'Видалити')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Логи (Історія) */}
      {logModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl shadow-inner ${logModal.type === 'sensor' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}><History size={24} /></div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xl">{logModal.title}</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mt-1">{t('stationDetails.historyOf', 'Історія')} {logModal.type === 'sensor' ? t('stationDetails.historyData', 'показників') : t('stationDetails.historyStates', 'статусів')}</p>
                </div>
              </div>
              <button onClick={() => setLogModal({ ...logModal, isOpen: false })} className="p-2.5 text-slate-400 bg-white shadow-sm hover:text-slate-700 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="animate-spin text-slate-400" size={32} />
                  <p className="text-sm font-medium text-slate-500">{t('common.loading', 'Завантаження...')}</p>
                </div>
              ) : logsData.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                  <History size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-500">{t('common.noData', 'Немає даних для відображення')}</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b border-slate-100 tracking-wider">
                        <th className="py-4 px-6">{t('common.time', 'Час')}</th>
                        <th className="py-4 px-6">{logModal.type === 'sensor' ? t('common.value', 'Значення') : t('stationDetails.power', 'Потужність')}</th>
                        {logModal.type === 'actuator' && <th className="py-4 px-6">{t('common.status', 'Статус')}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {logsData.map((log, index) => (
                        <tr key={log.id || index} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-4 px-6 text-sm font-medium text-slate-600 whitespace-nowrap">{new Date(log.measuredAt || log.timestamp).toLocaleString()}</td>
                          <td className="py-4 px-6">
                            <span className="text-base font-black text-slate-900">{logModal.type === 'sensor' ? log.value : `${log.activationPercentage}%`}</span>
                            {logModal.type === 'sensor' && logModal.unit && <span className="text-xs font-semibold text-slate-500 ml-1.5">{logModal.unit}</span>}
                          </td>
                          {logModal.type === 'actuator' && <td className="py-4 px-6 text-sm text-slate-600"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">{log.statusMessage || '-'}</span></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка прив'язки користувача (Assign) */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="font-extrabold text-slate-900 text-xl">{t('stationDetails.assignUserModal', 'Прикріпити користувача')}</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignUser} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('stationDetails.selectEmployee', 'Оберіть співробітника')}</label>
                <select name="userId" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-slate-700">
                  <option value="" disabled selected>{t('common.select', 'Оберіть...')}</option>
                  {allUsers.filter(u => !assignedUsers.some(au => au.id === u.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-2">{t('stationDetails.assignUserDesc', 'У списку відображаються лише ті користувачі, які ще не прив\'язані до цієї станції.')}</p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setAssignModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">{t('common.cancel', 'Скасувати')}</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2">{t('common.assign', 'Прикріпити')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StationDetailsPage;