import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, LayoutDashboard, AlertTriangle, Menu, X, Droplet, User as UserIcon } from 'lucide-react';


import { useAuthStore } from '../store/authStore';
import LanguageSwitcher from '../components/shared/LanguageSwitcher';




const UserLayout = () => {
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

  // Навігація тільки для звичайного користувача
  const navItems = [
    { id: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard', 'Мої Станції') },
    { id: '/dashboard/alerts', icon: AlertTriangle, label: t('nav.alerts', 'Сповіщення') },
    { id: '/dashboard/profile', icon: UserIcon, label: t('nav.profile', 'Мій Профіль') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Світлий Sidebar для користувача */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 text-slate-700 
        transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:relative lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none
      `}>
        {/* Логотип */}
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl">
            <Droplet className="shrink-0 text-emerald-500" size={24} />
          </div>
          <span className="text-xl font-extrabold truncate text-slate-900 tracking-tight">Water Portal</span>
          <button className="lg:hidden ml-auto text-slate-400 hover:text-slate-600" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        {/* Навігація */}
        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-2">
            {t('dashboard.mainMenu', 'Головне меню')}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            
            // Спеціальна перевірка: щоб /dashboard не підсвічувався, коли ми на /dashboard/alerts
            const isActive = item.id === '/dashboard' 
              ? location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/stations')
              : location.pathname.startsWith(item.id);

            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.id); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100/50' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Інформація про користувача внизу */}
        <div className="p-4 m-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            {user?.fullName?.charAt(0) || <UserIcon size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm text-slate-900 truncate">{user?.fullName || t('dashboard.guest', 'Гість')}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Головний контент */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Шапка */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 h-16 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10 sticky top-0">
          <div className="flex items-center">
            <button className="lg:hidden mr-4 text-slate-500 hover:text-slate-700 bg-slate-50 p-1.5 rounded-lg" onClick={toggleSidebar}>
              <Menu size={20} />
            </button>
            <h2 className="text-lg font-extrabold text-slate-800 hidden sm:block tracking-tight">
              {navItems.find((i) => {
                if (i.id === '/dashboard') return location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/stations');
                return location.pathname.startsWith(i.id);
              })?.label || ''}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition-colors text-sm font-bold bg-white hover:bg-red-50 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-red-200 shadow-sm"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{t('nav.logout', 'Вийти')}</span>
            </button>
          </div>
        </header>

        {/* Змінна частина сторінки */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Оверлей для мобільних пристроїв */}
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={toggleSidebar} />}
    </div>
  );
};

export default UserLayout;