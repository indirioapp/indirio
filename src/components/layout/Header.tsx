'use client';

import React, { useState } from 'react';
import { Download, Menu, X, Globe } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { GithubIcon } from '@/components/ui/BrandIcons';

export default function Header() {
  const { locale, setLocale, availableLanguages } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-dark-bg/85 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-theme-primary shadow-md shadow-theme-glow transition-all duration-300">
              <Download className="h-4.5 w-4.5 text-black" />
            </div>
            <span className="text-lg font-black tracking-tight text-theme-txt font-mono uppercase">
              indirio<span className="text-theme-primary font-medium">.com.tr</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => {
                  setIsLangOpen(!isLangOpen);
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-theme-txt/70 hover:text-theme-txt hover:bg-white/10 text-xs font-bold font-mono transition-all cursor-pointer select-none uppercase tracking-wider"
                title="Select Language / Dil Seçin"
              >
                <Globe className="w-3.5 h-3.5 text-theme-primary" />
                {locale.split('-')[0]}
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-lg border border-white/5 bg-[#0d111d]/95 backdrop-blur-xl p-1.5 shadow-2xl z-50 animate-fade-in-up">
                  {availableLanguages.map((lang) => {
                    const isSelected = locale === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLocale(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono font-semibold transition-all flex items-center justify-between hover:bg-white/5 cursor-pointer ${
                          isSelected
                            ? 'text-theme-primary bg-white/5'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>{lang.name}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-theme-primary"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <a
              href="https://github.com/indirioapp/indirio"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-theme-primary/30 px-4 py-1.5 text-xs font-semibold text-theme-txt font-mono transition-all duration-300 shadow-md hover:shadow-theme-glow active:scale-95"
            >
              <GithubIcon className="w-3.5 h-3.5 text-zinc-450 group-hover:text-theme-primary transition-colors" />
              <span>GITHUB</span>
            </a>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white focus:outline-none transition-all"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-b border-white/5 bg-dark-bg/95 backdrop-blur-xl animate-fade-in-up">
          <div className="px-4 pb-5 pt-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-550 uppercase">Language:</span>
              <div className="flex gap-2">
                {availableLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLocale(lang.code);
                      setIsOpen(false);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono border ${
                      locale === lang.code
                        ? 'border-theme-primary text-theme-primary bg-white/5'
                        : 'border-white/5 text-zinc-400'
                    }`}
                  >
                    {lang.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-white/5">
              <a
                href="https://github.com/indirioapp/indirio"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-theme-primary px-4 py-2 text-sm font-semibold font-mono text-black hover:bg-theme-hover active:scale-95 transition-all duration-150 shadow-lg shadow-theme-glow"
              >
                <GithubIcon className="w-4 h-4" />
                <span>GITHUB</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
