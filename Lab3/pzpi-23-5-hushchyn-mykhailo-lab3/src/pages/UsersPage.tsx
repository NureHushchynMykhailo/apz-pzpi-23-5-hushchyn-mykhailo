import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Search, Filter, Plus, Shield, ShieldAlert, 
  Wrench, Eye, Pencil, Trash2, X, AlertCircle, RefreshCw,
  Link as LinkIcon, BarChart
} from 'lucide-react';


import { useTranslation } from 'react-i18next';
import { useUserStore } from '../store/userStore';
import { useAuthStore } from '../store/authStore';
import { type User, type UserRole,type CreateUserDTO,type UpdateUserDTO } from '../services/userService';
import { stationService } from '../services/stationService';
import { type Station } from '../types/station';




const UsersPage = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const { users, isLoading, error, fetchUsers, createUser, updateUser, deleteUser } = useUserStore();

  // Локальні стани для UI
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  
  // Стани модалок CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });
  
  // Стан модалки прив'язки до станції
  const [assignModal, setAssignModal] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });
  const [stationsList, setStationsList] = useState<Station[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Фільтрація користувачів
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchSearch = 
        user.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === 'all' || user.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Хелпери для ролей
  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case 'admin': return { icon: <ShieldAlert size={16} />, color: 'text-red-700 bg-red-100 border-red-200', label: t('roles.admin', 'Адміністратор') };
      case 'manager': return { icon: <Shield size={16} />, color: 'text-blue-700 bg-blue-100 border-blue-200', label: t('roles.manager', 'Менеджер') };
      case 'technician': return { icon: <Wrench size={16} />, color: 'text-emerald-700 bg-emerald-100 border-emerald-200', label: t('roles.technician', 'Технік') };
      case 'analyst': return { icon: <BarChart size={16} />, color: 'text-indigo-700 bg-indigo-100 border-indigo-200', label: t('roles.analyst', 'Аналітик') };
      case 'viewer': return { icon: <Eye size={16} />, color: 'text-purple-700 bg-purple-100 border-purple-200', label: t('roles.viewer', 'Глядач') };
      default: return { icon: <Users size={16} />, color: 'text-slate-700 bg-slate-100 border-slate-200', label: role };
    }
  };

  // Обробка форми створення/редагування
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      if (editingUser) {
        const updateData: UpdateUserDTO = {
          fullName: formData.get('fullName') as string,
          role: formData.get('role') as UserRole,
        };

        // Адмін може блокувати/розблоковувати інших, але не себе
        if (editingUser.id !== currentUser?.id) {
          updateData.isActive = formData.get('isActive') === 'true';
        }

        await updateUser(editingUser.id, updateData);
      } else {
        await createUser({
          email: formData.get('email') as string,
          password: formData.get('password') as string,
          fullName: formData.get('fullName') as string,
          role: formData.get('role') as UserRole,
        } as CreateUserDTO);
      }
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Помилка при збереженні:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Відкриття модалки прив'язки
  const openAssignModal = async (user: User) => {
    setAssignModal({ isOpen: true, user });
    try {
      const st = await stationService.getStations();
      setStationsList(st);
    } catch (error) {
      console.error('Не вдалося завантажити станції', error);
    }
  };

  // Відправка форми прив'язки
  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assignModal.user) return;
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const stationId = formData.get('stationId') as string;

    try {
      await stationService.assignUser(stationId, assignModal.user.id);
      alert(t('users.assignSuccess', 'Користувача успішно прикріплено до станції!'));
      setAssignModal({ isOpen: false, user: null });
    } catch (err) {
      alert(t('users.assignError', 'Помилка прикріплення. Можливо користувач вже призначений.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обробка видалення
  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteUser(deleteConfirm.id);
      setDeleteConfirm({ isOpen: false, id: '', name: '' });
    } catch (err) {
      console.error('Помилка при видаленні:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 space-y-6 font-sans pb-20">
      
      {/* Хедер */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-50 rounded-2xl">
            <Users size={32} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t('nav.users', 'Користувачі')}</h1>
            <p className="text-sm text-slate-500 mt-1">{t('users.subtitle', 'Управління доступом та ролями персоналу')}</p>
          </div>
        </div>
        
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={18} /> {t('users.create', 'Створити користувача')}
        </button>
      </div>

      {/* Панель Фільтрів */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('users.searchPlaceholder', "Пошук за ім'ям або email...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors font-medium" 
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl overflow-x-auto">
          <Filter size={18} className="text-slate-400 ml-2 hidden sm:block" />
          <button onClick={() => setRoleFilter('all')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${roleFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t('roles.all', 'Всі')}</button>
          <button onClick={() => setRoleFilter('admin')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${roleFilter === 'admin' ? 'bg-red-50 text-red-700 shadow-sm' : 'text-slate-500 hover:text-red-700'}`}>{t('roles.admins', 'Адміни')}</button>
          <button onClick={() => setRoleFilter('manager')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${roleFilter === 'manager' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-blue-700'}`}>{t('roles.managers', 'Менеджери')}</button>
          <button onClick={() => setRoleFilter('technician')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${roleFilter === 'technician' ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-emerald-700'}`}>{t('roles.technicians', 'Техніки')}</button>
          <button onClick={() => setRoleFilter('analyst')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${roleFilter === 'analyst' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-700'}`}>{t('roles.analysts', 'Аналітики')}</button>
          <button onClick={() => setRoleFilter('viewer')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${roleFilter === 'viewer' ? 'bg-purple-50 text-purple-700 shadow-sm' : 'text-slate-500 hover:text-purple-700'}`}>{t('roles.viewers', 'Глядачі')}</button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Список користувачів */}
      {isLoading && !isSubmitting ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-200 rounded-2xl w-full"></div>)}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-300 text-center shadow-sm">
          <Users size={64} className="mx-auto text-slate-300 mb-5 opacity-40" />
          <h3 className="text-2xl font-extrabold text-slate-800 mb-2">{t('users.notFound', 'Користувачів не знайдено')}</h3>
          <p className="text-slate-500 text-lg">{t('users.notFoundDesc', 'Спробуйте змінити критерії пошуку або фільтри.')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-wider border-b border-slate-200">
                  <th className="py-4 px-6">{t('common.user', 'Користувач')}</th>
                  <th className="py-4 px-6">{t('common.role', 'Роль')}</th>
            
                  <th className="py-4 px-6">{t('users.registeredAt', 'Дата реєстрації')}</th>
                  <th className="py-4 px-6 text-right">{t('common.actions', 'Дії')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(userItem => {
                  const roleConfig = getRoleConfig(userItem.role);
                  const isMe = currentUser?.id === userItem.id;

                  return (
                    <tr key={userItem.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            {userItem.fullName?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              {userItem.fullName}
                              {isMe && <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">{t('common.you', 'Ви')}</span>}
                            </div>
                            <div className="text-xs text-slate-500">{userItem.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${roleConfig.color}`}>
                          {roleConfig.icon} {roleConfig.label}
                        </span>
                      </td>
                      
                      <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                        {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Кнопка Прикріплення */}
                          <button 
                            onClick={() => openAssignModal(userItem)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                            title={t('users.assignToStation', 'Призначити на станцію')}
                          >
                            <LinkIcon size={18} />
                          </button>
                          
                          <button 
                            onClick={() => openEditModal(userItem)}
                            className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-colors"
                            title={t('common.edit', 'Редагувати')}
                          >
                            <Pencil size={18} />
                          </button>
                          
                          <button 
                            onClick={() => setDeleteConfirm({ isOpen: true, id: userItem.id, name: userItem.fullName })}
                            disabled={isMe}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            title={isMe ? t('users.cannotDeleteSelf', "Неможливо видалити свій акаунт") : t('common.delete', "Видалити")}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================
          МОДАЛЬНЕ ВІКНО СТВОРЕННЯ / РЕДАГУВАННЯ
          ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-slate-900 text-xl">
                {editingUser ? t('users.editUser', 'Редагувати користувача') : t('users.newUser', 'Новий користувач')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.fullName', "П.І.Б.")}</label>
                <input 
                  name="fullName" 
                  required 
                  defaultValue={editingUser?.fullName || ''} 
                  placeholder={t('users.placeholders.fullName', 'Іван Іванов')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.email', 'Email')}</label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  disabled={!!editingUser} 
                  defaultValue={editingUser?.email || ''} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:bg-slate-100" 
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('users.tempPassword', 'Тимчасовий пароль')}</label>
                  <input 
                    type="password" 
                    name="password" 
                    required 
                    minLength={6} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.role', 'Роль')}</label>
                <select 
                  name="role" 
                  required 
                  defaultValue={editingUser?.role || 'technician'} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-slate-700"
                >
                  <option value="admin">{t('roles.adminDesc', 'Адміністратор (Повний доступ)')}</option>
                  <option value="manager">{t('roles.managerDesc', 'Менеджер (Управління станціями)')}</option>
                  <option value="technician">{t('roles.technicianDesc', 'Технік (Керування обладнанням)')}</option>
                  <option value="analyst">{t('roles.analystDesc', 'Аналітик (Статистика та звіти)')}</option>
                  <option value="viewer">{t('roles.viewerDesc', 'Глядач (Тільки перегляд даних)')}</option>
                </select>
              </div>

              {editingUser && editingUser.id !== currentUser?.id && (
                <div className="flex items-center gap-3 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <input 
                    type="checkbox" 
                    name="isActive" 
                    id="isActive" 
                    value="true" 
                    defaultChecked={editingUser.isActive} 
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                  />
                  <label htmlFor="isActive" className="text-sm font-bold text-slate-700 cursor-pointer">
                    {t('users.allowLogin', 'Акаунт активний (дозволити вхід)')}
                  </label>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel', 'Скасувати')}</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
                  {editingUser ? t('common.update', 'Оновити') : t('common.create', 'Створити')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          МОДАЛЬНЕ ВІКНО ПРИВ'ЯЗКИ ДО СТАНЦІЇ
          ========================================= */}
      {assignModal.isOpen && assignModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="font-extrabold text-slate-900 text-xl">{t('users.assignTitle', 'Призначити на станцію')}</h3>
              <button onClick={() => setAssignModal({ isOpen: false, user: null })} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6 space-y-5">
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('users.assignDesc', 'Оберіть станцію, до якої буде надано доступ користувачу')} <strong className="text-slate-900">{assignModal.user.fullName}</strong>.
              </p>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('common.station', 'Станція')}</label>
                <select 
                  name="stationId" 
                  required 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer text-slate-900 font-medium"
                >
                  <option value="" disabled selected>{t('users.selectStation', 'Оберіть станцію...')}</option>
                  {stationsList.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setAssignModal({ isOpen: false, user: null })} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">{t('common.cancel', 'Скасувати')}</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2">
                  {isSubmitting && <RefreshCw size={16} className="animate-spin" />}
                  {t('users.assignBtn', 'Призначити')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          МОДАЛЬНЕ ВІКНО ВИДАЛЕННЯ
          ========================================= */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 transform transition-all">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="text-red-600" size={32} />
            </div>
            <h3 className="font-extrabold text-slate-900 text-2xl mb-3">{t('users.deleteConfirmTitle', 'Видалити акаунт?')}</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              {t('users.deleteConfirmDesc', 'Ви збираєтесь видалити користувача')} <strong className="text-slate-800">{deleteConfirm.name}</strong>. {t('common.cannotUndo', 'Цю дію неможливо скасувати.')}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm({ isOpen: false, id: '', name: '' })} className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                {t('common.cancel', 'Скасувати')}
              </button>
              <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 px-5 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-red-500/20">
                {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {t('common.delete', 'Видалити')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersPage;