import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuthStore } from '../store/authStore';
import api from '../config/axios';
import { AlertCircle, UserPlus } from 'lucide-react';

const LoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);
  const [apiError, setApiError] = useState<string | null>(null);

  // Схема валідації з використанням ключів локалізації
  const loginSchema = z.object({
    email: z.string().email({ message: t('auth.errors.invalidEmail', 'Невірний формат email') }),
    password: z.string().min(6, { message: t('auth.errors.passwordTooShort', 'Пароль має містити мінімум 6 символів') }),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setApiError(null);
    try {
      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { token, user } = response.data;
      loginAction(user, token);
      
      // Маршрутизація на різні інтерфейси залежно від ролі
      if (['admin', 'manager'].includes(user.role)) {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }

    } catch (error: any) {
      if (error.response) {
        // Пріоритет: повідомлення від сервера -> локалізована помилка -> дефолтний текст
        const serverMessage = error.response.data?.message || error.response.data?.error;
        setApiError(serverMessage || t('auth.errors.invalidCredentials', 'Невірний email або пароль.'));
      } else {
        console.warn('Мережева помилка - перевірте бекенд');
        setApiError(t('auth.errors.networkError', 'Помилка з\'єднання з сервером. Перевірте, чи запущено бекенд.'));
      }
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">
          {t('auth.loginTitle', 'Вхід до системи')}
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          {t('auth.loginSubtitle', 'Введіть свої дані для доступу')}
        </p>
      </div>

      {apiError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('auth.email', 'Email')}
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder={t('auth.placeholders.email', 'name@example.com')}
            className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.email ? 'border-red-300' : 'border-slate-300'
            }`}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('auth.password', 'Пароль')}
          </label>
          <input
            {...register('password')}
            type="password"
            placeholder={t('auth.placeholders.password', '••••••••')}
            className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              errors.password ? 'border-red-300' : 'border-slate-300'
            }`}
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? t('auth.loggingIn', 'Виконується вхід...') : t('auth.loginButton', 'Увійти')}
        </button>
      </form>

      <div className="mt-6 text-center border-t border-slate-200 pt-6">
        <Link
          to="/register"
          className="flex items-center justify-center w-full gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-800 transition-colors"
        >
          <UserPlus size={18} /> {t('auth.noAccount', 'Немає акаунту? Створити новий')}
        </Link>
      </div>
    </>
  );
};

export default LoginPage;