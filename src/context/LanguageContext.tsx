'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import tr_TR from '../locales/languages/tr_TR.json';
import en_US from '../locales/languages/en_US.json';
import es_ES from '../locales/languages/es_ES.json';

const translations: Record<string, Record<string, unknown>> = {
  'tr-TR': tr_TR as unknown as Record<string, unknown>,
  'en-US': en_US as unknown as Record<string, unknown>,
  'es-ES': es_ES as unknown as Record<string, unknown>,
};

export interface Language {
  code: string;
  name: string;
}

export const availableLanguages: Language[] = Object.keys(translations).map((code) => ({
  code,
  name: ((translations[code]?.meta as Record<string, unknown>)?.langName as string) || code,
}));

interface LanguageContextType {
  locale: string;
  setLocale: (locale: string) => void;
  availableLanguages: Language[];
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<string>('tr-TR');

  useEffect(() => {
    const saved = localStorage.getItem('indirio_lang');
    if (saved && Object.keys(translations).includes(saved)) {
      setTimeout(() => setLocaleState(saved), 0);
    } else {
      const browserLang = navigator.language;
      const matched = Object.keys(translations).find(
        (code) =>
          code.toLowerCase() === browserLang.toLowerCase() ||
          code.split('-')[0] === browserLang.split('-')[0],
      );
      if (matched) {
        setTimeout(() => setLocaleState(matched), 0);
      }
    }
  }, []);

  const setLocale = useCallback((newLocale: string) => {
    if (Object.keys(translations).includes(newLocale)) {
      setLocaleState(newLocale);
      localStorage.setItem('indirio_lang', newLocale);
    }
  }, []);

  const t = useCallback(
    (keyPath: string): string => {
      const parts = keyPath.split('.');
      let val: unknown = translations[locale];
      for (const part of parts) {
        if (val === undefined || val === null) break;
        val = (val as Record<string, unknown>)[part];
      }
      if (typeof val === 'string') return val;

      let fallbackVal: unknown = translations['en-US'];
      for (const part of parts) {
        if (fallbackVal === undefined || fallbackVal === null) return keyPath;
        fallbackVal = (fallbackVal as Record<string, unknown>)[part];
      }
      return typeof fallbackVal === 'string' ? fallbackVal : keyPath;
    },
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, availableLanguages, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
