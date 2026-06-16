import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Activity, Bell, BellOff, Navigation, 
  Search, List, Map as MapIcon, ChevronRight, 
  Droplets, Thermometer, WifiOff, Wrench, CheckCircle2, AlertTriangle, X, RefreshCw, Info, BellRing
} from 'lucide-react';


import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { stationService } from '../services/stationService';
import { subscriptionService } from '../services/subscriptionService';
import { telemetryService, type LatestTelemetry } from '../services/telemetryService';
import { wqiService, type WqiResponse } from '../services/wqiService';
import type { Station } from '../types/station';
import { useTranslation } from 'react-i18next';


interface ExploredStation extends Station {
  lastReading?: string;
}

const UserStationsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [stations, setStations] = useState<ExploredStation[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const [stationTelemetry, setStationTelemetry] = useState<Record<string, LatestTelemetry[]>>({});
  const [stationWqi, setStationWqi] = useState<Record<string, WqiResponse | null>>({});
  const [loadingData, setLoadingData] = useState<Record<string, boolean>>({});
  
  const [subscribingIds, setSubscribingIds] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'alert', message: string } | null>(null);

  const showToast = (type: 'success' | 'alert', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    if (viewMode === 'map') {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 350);
      return () => clearTimeout(timer);
    }
  }, [viewMode, selectedStationId]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Геопозиція недоступна:", err)
      );
    }

    const fetchExploreData = async () => {
      try {
        setIsLoading(true);
        const [stationsRes, subsRes] = await Promise.all([
          stationService.getAll().catch(() => []),
          subscriptionService.getSubscriptions().catch(() => [])
        ]);
        
        const stationsList = Array.isArray(stationsRes) ? stationsRes : ((stationsRes as any)?.data || []);
        setStations(stationsList as ExploredStation[]);
        
        const rawSubs = Array.isArray(subsRes) ? subsRes : ((subsRes as any)?.data || []);
        const activeSubIds = rawSubs.map((s: any) => s.stationId || s.id || s.station_id).filter(Boolean);

        setSubscriptions(activeSubIds);
      } catch (err) {
        console.error("Помилка завантаження станцій", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExploreData();
  }, []);

  // Автозавантаження даних для списку та підписок
  useEffect(() => {
    const idsToLoad = new Set<string>();
    
    if (viewMode === 'list') {
      stations.forEach(s => idsToLoad.add(s.id));
    }
    subscriptions.forEach(id => idsToLoad.add(id));

    idsToLoad.forEach(stationId => {
      if (!stationTelemetry[stationId] && !loadingData[stationId]) {
        loadStationData(stationId);
      }
    });
  }, [viewMode, stations, subscriptions]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number | null | undefined, lon2: number | null | undefined) => {
    if (lat2 == null || lon2 == null) return Infinity;
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const exploredStations = useMemo(() => {
    if (!Array.isArray(stations)) return [];
    let result = stations.filter(s => s?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (userLocation) {
      result = [...result].sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude, a.longitude);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    }
    return result;
  }, [stations, searchTerm, userLocation]);

  const loadStationData = async (stationId: string) => {
    if (stationTelemetry[stationId] || loadingData[stationId]) return;
    
    setLoadingData(prev => ({ ...prev, [stationId]: true }));
    try {
      const [telemetry, wqi] = await Promise.all([
        telemetryService.getLatestByStation(stationId).catch(() => []),
        wqiService.getForStation(stationId).catch(() => null)
      ]);
      
      setStationTelemetry(prev => ({ ...prev, [stationId]: Array.isArray(telemetry) ? telemetry : [] }));
      setStationWqi(prev => ({ ...prev, [stationId]: wqi }));
    } catch (err) {
      console.error("Помилка завантаження даних станції:", err);
    } finally {
      setLoadingData(prev => ({ ...prev, [stationId]: false }));
    }
  };

  const handleToggleSubscribe = async (e: React.MouseEvent, stationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (subscribingIds[stationId]) return; 
    
    setSubscribingIds(prev => ({ ...prev, [stationId]: true }));
    const isSub = subscriptions.includes(stationId);
    
    setSubscriptions(prev => isSub ? prev.filter(id => id !== stationId) : [...prev, stationId]);

    try {
      if (isSub) {
        await subscriptionService.unsubscribe(stationId);
        showToast('success', t('userStations.unsubSuccess', 'Ви відписалися від сповіщень станції.'));
      } else {
        await subscriptionService.subscribe(stationId);
        showToast('success', t('userStations.subSuccess', 'Ви успішно підписалися на сповіщення!'));
      }
    } catch (err) {
      console.error(err);
      setSubscriptions(prev => !isSub ? prev.filter(id => id !== stationId) : [...prev, stationId]);
      showToast('alert', t('userStations.subError', 'Сталася помилка при зміні підписки.'));
    } finally {
      setSubscribingIds(prev => ({ ...prev, [stationId]: false }));
    }
  };

  const getWqiColorClass = (wqi: number | undefined) => {
    if (wqi === undefined) return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };
    if (wqi <= 50) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'text-emerald-500' };
    if (wqi <= 100) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: 'text-red-500' };
  };

  // Оновлений метод для маркерів (Без ореолів, мерехтіння тільки для обраних/підписаних)
  const getStationIcon = (status: string, isSelected: boolean = false, isSubscribed: boolean = false) => {
    let colorClass = status === 'active' ? 'bg-emerald-500' : status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-500';
    let shadowClass = status === 'active' ? 'shadow-emerald-500/50' : status === 'maintenance' ? 'shadow-amber-500/50' : 'shadow-slate-500/50';
    let scaleClass = 'group-hover:scale-125';

    if (isSelected || isSubscribed) {
      colorClass = 'bg-indigo-600';
      shadowClass = 'shadow-indigo-600/60 shadow-xl';
    }
    if (isSelected) {
      scaleClass = 'scale-125 z-50'; 
    }

    const shouldAnimate = isSelected || isSubscribed;

    return L.divIcon({
      className: 'bg-transparent border-0',
      html: `<div class="relative flex items-center justify-center w-8 h-8 group">
               <div class="absolute w-full h-full ${colorClass} rounded-full opacity-40 ${shouldAnimate ? 'animate-ping' : ''}"></div>
               <div class="relative w-5 h-5 ${colorClass} border-2 border-white rounded-full shadow-lg ${shadowClass} ${scaleClass} transition-all duration-300"></div>
             </div>`,
      iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
    });
  };

  const userIcon = L.divIcon({
    className: 'bg-transparent border-0',
    html: `<div class="relative flex items-center justify-center w-8 h-8">
             <div class="absolute w-full h-full bg-blue-500 rounded-full opacity-30 animate-pulse"></div>
             <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
           </div>`,
    iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16]
  });

  const defaultCenter: [number, number] = [48.3794, 31.1656];
  const mapCenter: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng] 
    : (stations.length > 0 && stations[0].latitude != null && stations[0].longitude != null)
      ? [stations[0].latitude, stations[0].longitude] : defaultCenter; 

  const getStatusIcon = (status: string) => {
    if (status === 'active') return <Activity size={10} />;
    if (status === 'maintenance') return <Wrench size={10} />;
    return <WifiOff size={10} />;
  };

  const getStatusStyle = (status: string) => {
    if (status === 'active') return 'bg-emerald-50 text-emerald-600';
    if (status === 'maintenance') return 'bg-amber-50 text-amber-600';
    return 'bg-slate-100 text-slate-500';
  };

  const renderSensors = (stationId: string) => {
    const isDataLoading = loadingData[stationId];
    const sensors = stationTelemetry[stationId];

    if (isDataLoading) {
      return <span className="text-xs text-indigo-500 font-medium animate-pulse flex items-center gap-1.5"><RefreshCw size={14} className="animate-spin"/> {t('common.loading', 'Завантаження...')}</span>;
    }

    if (!Array.isArray(sensors) || sensors.length === 0) {
      return <span className="text-xs text-slate-400 font-medium">{t('common.noData', 'Дані відсутні')}</span>;
    }

    return sensors.slice(0, 3).map((s, idx) => (
      <div key={idx} className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 shadow-sm">
        {s.type.toLowerCase().includes('ph') || s.type.toLowerCase().includes('water') ? <Droplets size={12} className="text-blue-500" /> : <Thermometer size={12} className="text-orange-500" />}
        <span className="text-[10px] font-bold text-slate-500 truncate max-w-[80px]" title={s.parameterName}>{s.parameterName}:</span>
        <span className="text-xs font-black text-slate-800">{s.value} <span className="text-[9px] text-slate-400 font-bold ml-0.5">{s.unit}</span></span>
      </div>
    ));
  };

  const renderWqi = (stationId: string) => {
    const wqiData = stationWqi[stationId];
    if (loadingData[stationId] || wqiData === undefined) return null; 
    
    if (!wqiData) {
       return (
         <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
           <Info size={16} className="text-slate-400" />
           <span className="text-xs text-slate-500 font-medium">{t('userStations.wqiNotCalculated', 'Індекс WQI наразі не розраховано')}</span>
         </div>
       );
    }

    const colors = getWqiColorClass(wqiData.wqi);

    return (
      <div className={`p-4 rounded-2xl border mb-4 flex flex-col gap-1 shadow-sm ${colors.bg} ${colors.border}`}>
        <div className="flex justify-between items-center">
          <span className={`text-xs font-bold uppercase tracking-wider ${colors.text} flex items-center gap-1.5`}>
            <Activity size={14} className={colors.icon} /> {t('userStations.wqiIndex', 'WQI Індекс Якості Води')}
          </span>
          <span className={`text-3xl font-black ${colors.text}`}>{wqiData.wqi.toFixed(1)}</span>
        </div>
        <div className="flex justify-between items-baseline mt-2">
          <span className={`text-sm font-extrabold ${colors.text}`}>{wqiData.category}</span>
          <span className={`text-[10px] font-medium ${colors.text} opacity-80 text-right max-w-[60%] leading-tight`}>{wqiData.description}</span>
        </div>
      </div>
    );
  };


  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 pb-24 font-sans">
      
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

      {/* Хедер */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t('userStations.exploreTitle', 'Дослідження станцій')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('userStations.exploreSubtitle', 'Знайдіть станції поруч та підпишіться на їхні показники')}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder={t('userStations.searchPlaceholder', 'Знайти станцію...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedStationId(null);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => { setViewMode('map'); setSelectedStationId(null); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-1.5 px-4 rounded-lg text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <MapIcon size={16} /> {t('userStations.map', 'Карта')}
            </button>
            <button 
              onClick={() => { setViewMode('list'); setSelectedStationId(null); }}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-1.5 px-4 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List size={16} /> {t('userStations.list', 'Список')}
            </button>
          </div>
        </div>
      </div>

      {/* --- РЕЖИМ КАРТИ --- */}
      {viewMode === 'map' && (
        <>
          <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[600px] animate-in fade-in duration-300">
            {/* Контейнер Карти */}
            <div className={`bg-white p-2 rounded-[2.5rem] border border-slate-200 shadow-sm relative transition-all duration-500 ease-in-out ${selectedStationId ? 'lg:w-2/3 h-[400px] lg:h-full' : 'w-full h-[600px]'}`}>
              
              {/* Оновлена ЛЕГЕНДА КАРТИ */}
              <div className="absolute bottom-6 left-6 z-[400] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-200 text-xs font-bold text-slate-700 space-y-3 pointer-events-none">
                <h4 className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">{t('userStations.mapLegend', 'Легенда карти')}</h4>
                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm"></div> {t('userStations.activeStation', 'Активна станція')}</div>
                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm"></div> {t('userStations.maintenance', 'Обслуговування')}</div>
                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-slate-500 border-2 border-white shadow-sm"></div> {t('userStations.offline', 'Офлайн')}</div>
                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-sm"></div> {t('userStations.selectedSubscribed', 'Обрана / Підписана')}</div>
                {userLocation && <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60"><div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div> {t('userStations.yourLocation', 'Ваша геопозиція')}</div>}
              </div>

              <MapContainer center={mapCenter} zoom={userLocation ? 12 : 6} className="w-full h-full rounded-[2rem] z-0">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                
                {userLocation && (
                  <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                    <Popup><div className="text-center"><p className="font-bold text-blue-600">{t('userStations.yourPosition', 'Ваша позиція')}</p></div></Popup>
                  </Marker>
                )}

                {exploredStations.map(station => {
                  const isSelected = station.id === selectedStationId;
                  const isSubscribed = subscriptions.includes(station.id);
                  return (
                    <Marker 
                      key={station.id} 
                      position={[station.latitude || 0, station.longitude || 0]} 
                      icon={getStationIcon(station.status, isSelected, isSubscribed)}
                      eventHandlers={{
                        click: () => {
                          setSelectedStationId(station.id);
                          loadStationData(station.id);
                        }
                      }}
                    />
                  );
                })}
              </MapContainer>
            </div>

            {/* Бокова Панель Деталей Станції */}
            {selectedStationId && (
              <div className="w-full lg:w-1/3 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[500px] lg:h-full animate-in slide-in-from-right-8 fade-in duration-300 overflow-hidden">
                {(() => {
                  const st = exploredStations.find(s => s.id === selectedStationId);
                  if (!st) return null;
                  const isSubscribed = subscriptions.includes(st.id);
                  const isSubscribing = subscribingIds[st.id];
                  const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, st.latitude, st.longitude) : null;

                  return (
                    <div className="flex flex-col h-full">
                      {/* Шапка бокової панелі */}
                      <div className="flex items-start justify-between mb-4 shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit ${getStatusStyle(st.status)}`}>
                          {getStatusIcon(st.status)} {t(`stations.status.${st.status}`, st.status)}
                        </span>
                        <button onClick={() => setSelectedStationId(null)} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors">
                          <X size={20} />
                        </button>
                      </div>
                      
                      <h2 className="text-2xl font-black text-slate-900 mb-2 leading-tight shrink-0">{st.name}</h2>
                      
                      <div className="space-y-2 mb-4 shrink-0">
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                          <MapPin size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate">{st.latitude != null ? st.latitude.toFixed(4) : '--'}, {st.longitude != null ? st.longitude.toFixed(4) : '--'}</span>
                        </div>
                        
                        {distance !== null && distance !== Infinity && (
                          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 w-fit px-2.5 py-1 rounded-lg">
                            <Navigation size={12} />
                            {distance < 1 ? `${(distance * 1000).toFixed(0)} ${t('userStations.metersAway', 'м від вас')}` : `${distance.toFixed(1)} ${t('userStations.kmAway', 'км від вас')}`}
                          </div>
                        )}
                      </div>

                      <button 
                        disabled={isSubscribing}
                        onClick={(e) => handleToggleSubscribe(e, st.id)}
                        className={`w-full p-4 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3 font-bold mb-6 shrink-0 disabled:opacity-70 ${
                          isSubscribed 
                            ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' 
                            : 'bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200'
                        }`}
                      >
                        {isSubscribing ? (
                          <RefreshCw size={20} className="animate-spin" />
                        ) : isSubscribed ? (
                          <Bell size={20} className="animate-in zoom-in" />
                        ) : (
                          <BellOff size={20} />
                        )}
                        {isSubscribed ? t('userStations.unsubscribe', 'Відписатися від сповіщень') : t('userStations.subscribe', 'Підписатися на сповіщення')}
                      </button>

                      {renderWqi(st.id)}

                      <div className="flex-1 flex flex-col min-h-0 overflow-hidden mt-2">
                        <h3 className="text-xs uppercase font-black text-slate-400 tracking-wider mb-3 shrink-0">{t('userStations.currentTelemetry', 'Поточні показники телеметрії:')}</h3>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4 custom-scrollbar">
                          {renderSensors(st.id)}
                        </div>
                      </div>

                      <button 
                        onClick={() => navigate(`/dashboard/stations/${st.id}`)}
                        className="w-full mt-4 py-3.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm flex items-center justify-center gap-2 shrink-0"
                      >
                        {t('userStations.detailedReport', 'Детальний звіт')} <ChevronRight size={16} />
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* --- ШВИДКИЙ ДОСТУП ДО ПІДПИСОК (Під мапою) --- */}
          {subscriptions.length > 0 && (
            <div className="mt-6 bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <BellRing size={20} className="text-indigo-500" /> {t('userStations.yourSubscriptions', 'Ваші підписки')}
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {exploredStations.filter(s => subscriptions.includes(s.id)).map(st => (
                  <button
                    key={st.id}
                    onClick={() => navigate(`/dashboard/stations/${st.id}`)}
                    className="flex-shrink-0 w-72 bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left flex flex-col gap-3 group"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 truncate pr-2 group-hover:text-indigo-700 transition-colors text-base">{st.name}</span>
                      <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-500 shrink-0" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <div className={`w-2 h-2 rounded-full ${st.status === 'active' ? 'bg-emerald-500' : st.status === 'maintenance' ? 'bg-amber-500' : 'bg-slate-400'}`}></div>
                        {t(`stations.status.${st.status}`, st.status)}
                      </div>
                      
                      {stationWqi[st.id] && (
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${getWqiColorClass(stationWqi[st.id]?.wqi).bg} ${getWqiColorClass(stationWqi[st.id]?.wqi).text}`}>
                          WQI: {stationWqi[st.id]?.wqi.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* --- РЕЖИМ СПИСКУ --- */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {isLoading ? (
            [1,2,3].map(i => <div key={i} className="h-56 bg-slate-200 animate-pulse rounded-3xl" />)
          ) : exploredStations.map((station) => {
            const isSubscribed = subscriptions.includes(station.id);
            const isSubscribing = subscribingIds[station.id];
            const distance = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, station.latitude, station.longitude) : null;

            return (
              <div 
                key={station.id}
                onClick={() => navigate(`/dashboard/stations/${station.id}`)}
                className="group bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer relative flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider w-fit ${getStatusStyle(station.status)}`}>
                      {getStatusIcon(station.status)} {t(`stations.status.${station.status}`, station.status)}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{station.name}</h3>
                  </div>
                  
                  <button 
                    disabled={isSubscribing}
                    onClick={(e) => handleToggleSubscribe(e, station.id)}
                    className={`p-3 rounded-2xl transition-all shadow-sm disabled:opacity-70 ${
                      isSubscribed 
                        ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' 
                        : 'bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100'
                    }`}
                    title={isSubscribed ? t('userStations.unsubscribe', "Відписатися від сповіщень") : t('userStations.subscribe', "Підписатися на сповіщення")}
                  >
                    {isSubscribing ? (
                      <RefreshCw size={22} className="animate-spin" />
                    ) : isSubscribed ? (
                      <Bell size={22} className="animate-in zoom-in" />
                    ) : (
                      <BellOff size={22} />
                    )}
                  </button>
                </div>
                
                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{station.latitude != null ? station.latitude.toFixed(4) : '--'}, {station.longitude != null ? station.longitude.toFixed(4) : '--'}</span>
                  </div>
                  
                  {distance !== null && distance !== Infinity && (
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/80 border border-indigo-100 w-fit px-2.5 py-1 rounded-lg">
                      <Navigation size={12} />
                      {distance < 1 ? `${(distance * 1000).toFixed(0)} ${t('userStations.metersAway', 'м від вас')}` : `${distance.toFixed(1)} ${t('userStations.kmAway', 'км від вас')}`}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
                  {/* Відображення WQI в списку, якщо завантажено */}
                  {stationWqi[station.id] && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${getWqiColorClass(stationWqi[station.id]?.wqi).bg} ${getWqiColorClass(stationWqi[station.id]?.wqi).text}`}>
                        WQI: {stationWqi[station.id]?.wqi.toFixed(1)} ({stationWqi[station.id]?.category})
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2 block">{t('userStations.currentTelemetry', 'Поточні показники телеметрії:')}</span>
                    <div className="flex flex-wrap gap-2 min-h-[30px]">
                      {renderSensors(station.id)}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs font-bold text-indigo-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('userStations.stationDetails', 'Деталі станції')} <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Повідомлення про відсутність результатів */}
      {!isLoading && exploredStations.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            {viewMode === 'map' ? <MapIcon size={32} /> : <Search size={32} />}
          </div>
          <h3 className="text-xl font-bold text-slate-800">{t('userStations.noStationsFound', 'Станцій не знайдено')}</h3>
          <p className="text-slate-500">{t('userStations.tryChangingQuery', 'Спробуйте змінити запит пошуку')}</p>
        </div>
      )}
    </div>
  );
};

export default UserStationsPage;