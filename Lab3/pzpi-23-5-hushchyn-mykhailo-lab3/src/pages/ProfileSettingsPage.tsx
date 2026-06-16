import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Mail, Shield, Key, 
  LogOut, CheckCircle2, AlertTriangle, Loader2, Pencil, X, Save
} from 'lucide-react';

import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../config/axios';

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt?: string;
}

const ProfileSettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuthStore();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Стани для редагування
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Дані форм
  const [formData, setFormData] = useState({ fullName: '', email: '' });
  const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });


  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/users/profile');
        setProfile(response.data);
        setFormData({
          fullName: response.data.fullName || '',
          email: response.data.email || ''
        });
      } catch (err) {
        console.error("Помилка завантаження профілю:", err);
        setError(t('profile.errors.fetchFailed', "Не вдалося завантажити дані профілю. Перевірте з'єднання."));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [t]);

  // Обробка збереження профілю
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Виклик ендпоінту PUT /users/profile
      await api.put('/users/profile', {
        fullName: formData.fullName,
        email: formData.email
      });
      
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setIsEditingProfile(false);
      showToast('success', t('profile.success.profileUpdated', 'Особисті дані успішно оновлено!'));
      
      // Примітка: В реальному проекті тут також варто оновити user в authStore, 
      // щоб ім'я миттєво змінилося в Sidebar/Header
    } catch (err: any) {
      console.error(err);
      showToast('error', err.response?.data?.message || t('profile.errors.updateFailed', 'Не вдалося оновити профіль.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Обробка зміни пароля
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      showToast('error', t('profile.errors.passwordsMismatch', 'Паролі не співпадають!'));
      return;
    }
    
    setIsSaving(true);
    try {
      await api.put('/users/profile', {
        password: passwordData.password
      });
      
      setIsEditingPassword(false);
      setPasswordData({ password: '', confirmPassword: '' });
      showToast('success', t('profile.success.passwordChanged', 'Ваш пароль успішно змінено!'));
    } catch (err: any) {
      console.error(err);
      showToast('error', err.response?.data?.message || t('profile.errors.passwordChangeFailed', 'Не вдалося змінити пароль.'));
    } finally {
      setIsSaving(false);
    }
  };

 

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'manager': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'technician': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'analyst': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200'; // viewer
    }
  };

  const getRoleName = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return t('roles.admin', 'Адміністратор');
      case 'manager': return t('roles.manager', 'Менеджер');
      case 'technician': return t('roles.technician', 'Технік');
      case 'analyst': return t('roles.analyst', 'Аналітик');
      case 'viewer': return t('roles.viewer', 'Користувач (Читач)');
      default: return role || t('roles.unknown', 'Невідомо');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 lg:p-8 flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-4 text-indigo-600">
          <Loader2 size={40} className="animate-spin" />
          <p className="font-bold">{t('profile.loading', 'Завантаження профілю...')}</p>
        </div>
      </div>
    );
  }

  const displayUser = profile || authUser;

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-8 space-y-6 font-sans pb-24 relative">
      
      {/* Toast Сповіщення */}
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

      {/* Хедер сторінки */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-5">
        <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shrink-0">
          <User size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('profile.title', 'Налаштування профілю')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('profile.subtitle', 'Керування особистими даними та параметрами системи')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} className="shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ЛІВА КОЛОНКА: Інформація про користувача */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-5 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {t('profile.personalData.title', 'Особисті дані')}
              </h2>
              {!isEditingProfile && (
                <button 
                  onClick={() => setIsEditingProfile(true)} 
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors font-semibold flex items-center gap-2 text-sm"
                >
                  <Pencil size={16} /> {t('common.edit', 'Редагувати')}
                </button>
              )}
            </div>

            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-5 relative z-10 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('profile.personalData.fullName', "Повне ім'я")}</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.fullName} 
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('profile.personalData.email', 'Електронна пошта')}</label>
                  <input 
                    type="email" 
                    required 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button type="button" onClick={() => setIsEditingProfile(false)} disabled={isSaving} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel', 'Скасувати')}</button>
                  <button type="submit" disabled={isSaving} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {t('profile.personalData.saveChanges', 'Зберегти зміни')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5 relative z-10 animate-in fade-in duration-200">
                {/* ПІБ */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('profile.personalData.fullName', "Повне ім'я")}</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <User size={18} className="text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{displayUser?.fullName || t('profile.personalData.notSpecified', 'Не вказано')}</span>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('profile.personalData.email', 'Електронна пошта')}</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <Mail size={18} className="text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">{displayUser?.email}</span>
                    <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                      <CheckCircle2 size={12} /> {t('profile.personalData.verified', 'Підтверджено')}
                    </span>
                  </div>
                </div>

                {/* Роль */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('profile.personalData.accessLevel', 'Рівень доступу (Роль)')}</label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <Shield size={18} className="text-slate-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-800">{getRoleName(displayUser?.role as string)}</span>
                    </div>
                    <span className={`ml-auto px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getRoleBadgeColor(displayUser?.role as string)}`}>
                      {displayUser?.role}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ПРАВА КОЛОНКА: Налаштування та Безпека */}
        <div className="space-y-6">
          
          

          {/* Безпека */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all">
            <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Key size={20} className="text-amber-500" /> {t('profile.security.title', 'Безпека')}
            </h2>
            
            {isEditingPassword ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('profile.security.newPassword', 'Новий пароль')}</label>
                  <input 
                    type="password" 
                    required minLength={6} 
                    value={passwordData.password} 
                    onChange={e => setPasswordData({...passwordData, password: e.target.value})}
                    placeholder={t('profile.security.minChars', 'Мінімум 6 символів')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('profile.security.confirmPassword', 'Підтвердження пароля')}</label>
                  <input 
                    type="password" 
                    required minLength={6} 
                    value={passwordData.confirmPassword} 
                    onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    placeholder={t('profile.security.repeatPassword', 'Повторіть новий пароль')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all" 
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditingPassword(false)} disabled={isSaving} className="flex-1 py-2.5 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{t('common.cancel', 'Скасувати')}</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-md shadow-amber-500/20 disabled:opacity-50 flex justify-center items-center gap-2">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {t('common.save', 'Зберегти')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="animate-in fade-in duration-200">
                <p className="text-sm text-slate-500 font-medium mb-4">
                  {t('profile.security.prompt', 'Бажаєте оновити пароль для входу до свого акаунту?')}
                </p>
                <button 
                  onClick={() => setIsEditingPassword(true)}
                  className="w-full py-3 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-bold rounded-xl transition-colors border border-slate-200 hover:border-amber-200 flex justify-center items-center gap-2"
                >
                  <Key size={18} /> {t('profile.security.changePassword', 'Змінити пароль')}
                </button>
              </div>
            )}
          </div>

          {/* Вихід */}
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-red-500 mb-3 shadow-sm">
              <LogOut size={24} />
            </div>
            <h3 className="font-bold text-red-900 mb-1">{t('profile.logout.title', 'Вихід з системи')}</h3>
            <p className="text-xs text-red-700/80 font-medium mb-5 px-4">
              {t('profile.logout.description', 'Ви збираєтесь завершити поточну сесію.')}
            </p>
            
            <button 
              onClick={handleLogout}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-red-600/20 flex justify-center items-center gap-2"
            >
               {t('profile.logout.button', 'Вийти з акаунту')}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;