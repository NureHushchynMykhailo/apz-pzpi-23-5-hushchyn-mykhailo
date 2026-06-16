import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../config/axios';
import { AlertCircle, LogIn, CheckCircle } from 'lucide-react';

const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Переносимо схему всередину, щоб мати доступ до функції t()
  const registerSchema = z.object({
    fullName: z.string().min(2, { message: t('auth.errors.nameTooShort', "Введіть ім'я (мінімум 2 символи)") }),
    email: z.string().email({ message: t('auth.errors.invalidEmail', 'Невірний формат email') }),
    password: z.string().min(6, { message: t('auth.errors.passwordTooShort', 'Пароль має містити мінімум 6 символів') }),
  });

  type RegisterFormValues = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setApiError(null);
    setSuccessMsg(null);
    try {
      // Відправляємо дані на бекенд, ЖОРСТКО фіксуючи роль 'viewer' (звичайний користувач)
      await api.post('/auth/register', { 
        ...data, 
        role: 'viewer' 
      });
      
      setSuccessMsg(t('auth.success.registered', 'Реєстрація успішна! Перенаправляємо на сторінку входу...'));
      reset();
      
      // Через 2 секунди перенаправляємо на логін
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (error: any) {
      if (error.response) {
        const serverMessage = error.response.data?.message || error.response.data?.error || t('auth.errors.registrationFailed', 'Помилка реєстрації. Можливо, email вже зайнятий.');
        setApiError(serverMessage);
      } else {
        setApiError(t('auth.errors.networkError', 'Помилка з\'єднання з сервером. Перевірте, чи запущено бекенд.'));
      }
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">{t('auth.registerTitle', 'Створення акаунту')}</h2>
        <p className="text-sm text-slate-500 mt-2">
          {t('auth.registerSubtitle', 'Заповніть форму нижче для доступу до системи (Користувач)')}
        </p>
      </div>

      {apiError && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          <span>{apiError}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-md flex items-center gap-2 text-sm">
          <CheckCircle size={18} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.fullName', "Повне ім'я")}</label>
          <input
            {...register('fullName')}
            type="text"
            placeholder={t('auth.placeholders.fullName', 'Іван Іваненко')}
            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.email', 'Email')}</label>
          <input
            {...register('email')}
            type="email"
            placeholder={t('auth.placeholders.email', 'user@example.com')}
            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.password', 'Пароль')}</label>
          <input
            {...register('password')}
            type="password"
            placeholder={t('auth.placeholders.passwordMin', 'Мінімум 6 символів')}
            className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !!successMsg}
          className="w-full flex justify-center mt-6 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? t('auth.registering', 'Реєстрація...') : t('auth.registerButton', 'Зареєструватися')}
        </button>
      </form>

      <div className="mt-6 text-center border-t border-slate-200 pt-6">
        <Link
          to="/login"
          className="flex items-center justify-center w-full gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
        >
          <LogIn size={18} /> {t('auth.alreadyHaveAccount', 'Вже маєте акаунт? Увійти')}
        </Link>
      </div>
    </>
  );
};

export default RegisterPage;