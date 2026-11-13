import { createContext, useContext, useState, type ReactNode } from 'react';
import { getTranslator } from '../lib/i18n';
import type { Language } from '../types/booking';

const LANG_KEY = 'linea_salon_lang';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: ReturnType<typeof getTranslator>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === 'ru' || saved === 'en') return saved;
    } catch {
      // ignore storage errors
    }
    return 'ru';
  });

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // ignore
    }
    document.documentElement.lang = next;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: getTranslator(lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

