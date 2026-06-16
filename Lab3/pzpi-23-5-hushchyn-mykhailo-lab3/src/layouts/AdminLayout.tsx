import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Activity, Users, Settings, Database, 
  LogOut, Menu, X, ShieldAlert, BarChart3 
} from 'lucide-react';


import { useAuthStore } from '../store/authStore';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';


const DashboardLayout = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Навігація для адміністраторів та менеджерів
  const adminNavItems = [
    { id: '/admin', icon: Activity, label: t('nav.stations', 'Станції') },
    { id: '/admin/alerts', icon: ShieldAlert, label: t('nav.alerts', 'Тривоги') },
    { id: '/admin/statistics', icon: BarChart3, label: t('nav.statistics', 'Аналітика') },
    { id: '/admin/users', icon: Users, label: t('nav.users', 'Користувачі') },
    { id: '/admin/backups', icon: Database, label: t('nav.backups', 'Резервні копії') },
    { id: '/admin/profile', icon: Settings, label: t('nav.settings', 'Налаштування') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Темний Sidebar для адмінів */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 
        transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:relative lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none
      `}>
        {/* Логотип */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shrink-0">
            <Activity size={20} />
          </div>
          <span className="text-xl font-bold text-white truncate">{t('dashboard.adminPanel', 'Admin Panel')}</span>
          <button className="lg:hidden ml-auto text-slate-400 hover:text-white" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        {/* Навігація */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2 mt-4">
            {t('dashboard.management', 'Керування')}
          </div>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            // Перевірка активності пункту меню
            const isActive = item.id === '/admin' 
              ? location.pathname === '/admin' || location.pathname.startsWith('/admin/stations')
              : location.pathname.startsWith(item.id);

            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 shadow-sm' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-indigo-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Профіль користувача внизу Sidebar */}
        <div className="p-4 m-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="text-xs text-slate-400 mb-1">{t('dashboard.logged_in_as', 'Увійшли як')}:</p>
          <p className="text-sm font-bold text-white truncate">{user?.fullName || user?.email}</p>
          <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest bg-indigo-500 text-white">
            {user?.role ? t(`roles.${user.role}`, user.role) : t('roles.admin', 'Адміністратор')}
          </div>
        </div>
      </aside>

      {/* Головний контент */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Шапка */}
        <header className="bg-white shadow-sm border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10">
          <div className="flex items-center">
            <button className="lg:hidden mr-4 text-slate-500 hover:text-slate-700" onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
            {/* Динамічний заголовок сторінки */}
            <h2 className="text-lg font-bold text-slate-800 hidden sm:block">
              {adminNavItems.find((i) => {
                if (i.id === '/admin') return location.pathname === '/admin' || location.pathname.startsWith('/admin/stations');
                return location.pathname.startsWith(i.id);
              })?.label || t('dashboard.adminPanelFallback', 'Адмін Панель')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-bold"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{t('nav.logout', 'Вийти')}</span>
            </button>
          </div>
        </header>

        {/* Змінна частина сторінки */}
        <main className="flex-1 overflow-auto bg-slate-50/50">
          <Outlet />
        </main>
      </div>

      {/* Оверлей для мобільного меню */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={toggleSidebar} />}
    </div>
  );
};

export default DashboardLayout;