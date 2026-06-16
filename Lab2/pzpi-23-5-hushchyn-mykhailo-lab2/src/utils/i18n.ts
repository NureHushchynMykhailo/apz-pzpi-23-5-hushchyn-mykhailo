import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Імпортуємо наші словники
import en from './locales/en.json';
import uk from './locales/uk.json';

const resources = {
  en: { translation: en },
  uk: { translation: uk }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'uk', // Мова за замовчуванням
  fallbackLng: 'en', // Резервна мова, якщо переклад не знайдено
  interpolation: { escapeValue: false }
});

export default i18n;