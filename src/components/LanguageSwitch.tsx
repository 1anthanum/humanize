import type { Language } from '@/types';
import { t } from '@/i18n';

interface LanguageSwitchProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageSwitch({ language, onLanguageChange }: LanguageSwitchProps) {
  return (
    <div className="lang-switch" role="radiogroup" aria-label="Language selection">
      <button
        className={`lang-btn ${language === 'en' ? 'lang-btn-active' : ''}`}
        onClick={() => onLanguageChange('en')}
        aria-checked={language === 'en'}
        role="radio"
      >
        {t('lang.en', language)}
      </button>
      <button
        className={`lang-btn ${language === 'zh' ? 'lang-btn-active' : ''}`}
        onClick={() => onLanguageChange('zh')}
        aria-checked={language === 'zh'}
        role="radio"
      >
        {t('lang.zh', language)}
      </button>
    </div>
  );
}
