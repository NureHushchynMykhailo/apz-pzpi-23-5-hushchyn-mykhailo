import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
      <Globe size={16} className="text-slate-500 ml-1" />
      <button
        onClick={() => changeLanguage('uk')}
        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
          i18n.language === 'uk'
            ? 'bg-white shadow text-slate-800'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        UK
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
          i18n.language === 'en'
            ? 'bg-white shadow text-slate-800'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;