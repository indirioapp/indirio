'use client';

import React from 'react';
import Downloader from '../downloader/Downloader';
import { useTranslation } from '@/context/LanguageContext';
import { YoutubeIcon, TiktokIcon, InstagramIcon, TwitterIcon } from '../ui/BrandIcons';

export default function Hero() {
  const { t } = useTranslation();

  const brandLogos = [
    {
      name: 'YouTube',
      icon: <YoutubeIcon className="w-5 h-5 text-red-500" />,
      color: 'hover:bg-red-500/5',
    },
    {
      name: 'Instagram',
      icon: <InstagramIcon className="w-5 h-5 text-pink-500" />,
      color: 'hover:bg-pink-500/5',
    },
    {
      name: 'TikTok',
      icon: <TiktokIcon className="w-5 h-5 text-zinc-400 dark:text-white animate-pulse" />,
      color: 'hover:bg-white/5',
    },
    {
      name: 'X / Twitter',
      icon: <TwitterIcon className="w-5 h-5 text-zinc-455" />,
      color: 'hover:bg-zinc-300/5',
    },
  ];

  return (
    <section className="relative pt-20 pb-16 overflow-hidden">
      <div className="cyber-grid"></div>

      <div className="aurora-bg">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--aurora-color-1)] blur-[120px] animate-glow-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--aurora-color-2)] blur-[120px] animate-glow-pulse"></div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-theme-primary/30 bg-theme-primary/5 backdrop-blur-md mb-6 animate-float">
          <span className="flex h-2 w-2 rounded-full bg-theme-primary animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-widest text-theme-primary">
            {t('hero.badge')}
          </span>
        </div>

        <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl max-w-3xl mx-auto leading-[1.1] mb-6 tracking-tight">
          <span className="text-gradient block mb-2">{t('hero.titlePre')}</span>
          <span className="text-gradient-purple block font-black">{t('hero.titlePost')}</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-theme-muted max-w-lg mx-auto leading-relaxed mb-12">
          {t('hero.subtitle')}
        </p>

        <div className="w-full mb-16">
          <Downloader />
        </div>

        <div className="w-full max-w-xl mx-auto overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-dark-bg to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-dark-bg to-transparent z-10"></div>

          <div className="flex animate-marquee hover-pause py-4 gap-6 select-none">
            {[...brandLogos, ...brandLogos, ...brandLogos].map((brand, idx) => (
              <div
                key={idx}
                className={`inline-flex items-center gap-2.5 px-4.5 py-2.5 rounded-2xl border border-dark-border bg-theme-mute backdrop-blur-sm text-sm font-semibold text-theme-txt transition-all duration-300 cursor-default ${brand.color}`}
              >
                {brand.icon}
                <span>{brand.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
