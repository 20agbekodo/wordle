import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../i18n/translations';
import { useLanguage } from '../i18n/LanguageContext';

const FLAGS: Record<Language, string> = {
  en: '🇺🇸',
  fr: '🇫🇷',
  es: '🇪🇸',
};

const LABELS: Record<Language, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

const LANGUAGES: Language[] = ['en', 'fr', 'es'];

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-full bg-stone-200 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-300 dark:hover:bg-zinc-700 transition-colors border border-stone-300 dark:border-zinc-600 shadow-sm text-base leading-none w-[38px] h-[38px] flex items-center justify-center"
        aria-label="Select language"
      >
        {FLAGS[language]}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-700 rounded-2xl shadow-xl overflow-hidden z-[600] w-36">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              onClick={() => { setLanguage(lang); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                language === lang
                  ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300'
                  : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{FLAGS[lang]}</span>
              <span>{LABELS[lang]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
