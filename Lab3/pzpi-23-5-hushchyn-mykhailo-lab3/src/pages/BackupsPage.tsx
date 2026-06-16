import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Database, Download, UploadCloud, AlertOctagon, 
  CheckCircle2, AlertTriangle, FileUp, Loader2
} from 'lucide-react';


import { useAuthStore } from '../store/authStore';
import { backupService } from '../services/backupService';


const BackupsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDownloading, setIsDownloading] = useState<'full' | 'telemetry' | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Захист роуту: сторінка тільки для адміністраторів
  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <AlertTriangle size={64} className="mx-auto text-red-500 mb-4 opacity-50" />
        <h2 className="text-2xl font-bold text-slate-800">{t('backups.accessDenied.title', 'Доступ заборонено')}</h2>
        <p className="text-slate-500 mt-2">{t('backups.accessDenied.message', 'Керування резервними копіями доступне лише адміністраторам.')}</p>
        <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold">
          {t('common.back', 'Повернутися')}
        </button>
      </div>
    );
  }

  // --- Обробники завантаження ---
  const handleDownload = async (type: 'full' | 'telemetry') => {
    setIsDownloading(type);
    setMessage(null);
    try {
      const blob = type === 'full' 
        ? await backupService.downloadFull()
        : await backupService.downloadTelemetry();

      // Створення тимчасового посилання для скачування файлу
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `backup_${type}_${dateStr}.sql`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setMessage({ 
        type: 'success', 
        text: t('backups.messages.downloadSuccess', { type, defaultValue: `Резервну копію (${type}) успішно завантажено.` }) 
      });
    } catch (err) {
      console.error(err);
      setMessage({ 
        type: 'error', 
        text: t('backups.messages.downloadError', 'Помилка при створенні резервної копії. Спробуйте пізніше.') 
      });
    } finally {
      setIsDownloading(null);
    }
  };

  // --- Обробники відновлення ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleRestore = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: t('backups.messages.noFileSelected', 'Будь ласка, оберіть файл .sql для відновлення.') });
      return;
    }

    const confirmRestore = window.confirm(
      t('backups.restoreConfirm', "УВАГА! ВІДНОВЛЕННЯ БАЗИ ДАНИХ.\n\nЦя дія видалить УСІ поточні дані в системі та замінить їх даними з файлу. Процес неможливо скасувати.\n\nВи впевнені, що хочете продовжити?")
    );

    if (!confirmRestore) return;

    setIsRestoring(true);
    setMessage(null);

    try {
      await backupService.restore(selectedFile);
      setMessage({ type: 'success', text: t('backups.messages.restoreSuccess', 'Систему успішно відновлено з резервної копії.') });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || t('backups.messages.restoreError', 'Помилка при відновленні бази даних. Перевірте формат файлу.') 
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6 font-sans pb-20">
      
      {/* Хедер */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
        <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
          <Database size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('backups.header.title', 'Резервне копіювання')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('backups.header.subtitle', 'Створення бекапів бази даних та відновлення системи')}</p>
        </div>
      </div>

      {/* Повідомлення про статус */}
      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 border ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="shrink-0 mt-0.5" size={20} /> : <AlertOctagon className="shrink-0 mt-0.5" size={20} />}
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Секція: Створення бекапу */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Download className="text-blue-500" /> {t('backups.export.title', 'Створення копії')}
            </h2>
            <p className="text-sm text-slate-500">{t('backups.export.description', 'Завантажте SQL дамп бази даних на свій пристрій для безпечного зберігання.')}</p>
          </div>

          <div className="space-y-4 mt-auto">
            <button 
              onClick={() => handleDownload('full')}
              disabled={isDownloading !== null || isRestoring}
              className="w-full relative group overflow-hidden rounded-2xl bg-blue-50 border border-blue-200 hover:border-blue-300 p-5 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h3 className="font-bold text-blue-900">{t('backups.export.full.title', 'Повний бекап (FULL)')}</h3>
                  <p className="text-xs text-blue-600/80 mt-1">{t('backups.export.full.subtitle', 'Структура, користувачі, станції та телеметрія')}</p>
                </div>
                {isDownloading === 'full' ? <Loader2 className="animate-spin text-blue-500" /> : <Download size={20} className="text-blue-400 group-hover:text-blue-600 transition-colors" />}
              </div>
            </button>

            <button 
              onClick={() => handleDownload('telemetry')}
              disabled={isDownloading !== null || isRestoring}
              className="w-full relative group overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 p-5 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h3 className="font-bold text-slate-900">{t('backups.export.telemetry.title', 'Тільки телеметрія')}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t('backups.export.telemetry.subtitle', 'Вивантаження архіву логів показників сенсорів')}</p>
                </div>
                {isDownloading === 'telemetry' ? <Loader2 className="animate-spin text-slate-500" /> : <Download size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />}
              </div>
            </button>
          </div>
        </div>

        {/* Секція: Відновлення БД */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-red-100 shadow-sm flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <AlertOctagon size={120} className="text-red-500" />
          </div>
          
          <div className="mb-6 relative z-10">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-2">
              <UploadCloud className="text-red-500" /> {t('backups.import.title', 'Відновлення системи')}
            </h2>
            <p className="text-sm text-slate-500">{t('backups.import.description', 'Завантажте .sql файл для відновлення бази даних до попереднього стану.')}</p>
          </div>

          <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 mb-6 relative z-10">
            <p className="text-xs font-semibold text-red-800 flex items-start gap-2 leading-relaxed">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
              {t('backups.import.warning', 'Обережно! Ця дія видалить всі поточні таблиці та замінить їх даними із завантаженого файлу.')}
            </p>
          </div>

          <div className="mt-auto space-y-4 relative z-10">
            <div>
              <input 
                type="file" 
                accept=".sql" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden" 
                id="backup-upload" 
              />
              <label 
                htmlFor="backup-upload" 
                className={`w-full flex items-center justify-center gap-2 py-4 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  selectedFile ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600'
                } ${isRestoring || isDownloading ? 'pointer-events-none opacity-50' : ''}`}
              >
                <FileUp size={20} />
                <span className="font-semibold text-sm truncate max-w-[200px]">
                  {selectedFile ? selectedFile.name : t('backups.import.selectFile', 'Оберіть файл .sql')}
                </span>
              </label>
            </div>

            <button 
              onClick={handleRestore}
              disabled={!selectedFile || isRestoring || isDownloading !== null}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
            >
              {isRestoring ? <Loader2 className="animate-spin" size={18} /> : <AlertOctagon size={18} />}
              {isRestoring ? t('backups.import.processing', 'Відновлення...') : t('backups.import.button', 'Почати відновлення')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BackupsPage;