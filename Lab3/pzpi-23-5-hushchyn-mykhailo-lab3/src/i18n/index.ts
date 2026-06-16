import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Імпортуємо наші словники
import ukTranslations from './locales/uk.json';
import enTranslations from './locales/en.json';

i18n
  // Підключаємо визначення мови браузера (зберігає вибір в localStorage)
  .use(LanguageDetector)
  // Передаємо інстанс i18n у react-i18next
  .use(initReactI18next)
  // Ініціалізація
  .init({
    resources: {
      uk: {
        translation: ukTranslations,
      },
      en: {
        translation: enTranslations,
      },
    },
    fallbackLng: 'uk', // Мова за замовчуванням, якщо інша не знайдена
    interpolation: {
      escapeValue: false, // React вже захищає від XSS
    },
  });

export default i18n;