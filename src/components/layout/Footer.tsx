'use client';

import React, { useState } from 'react';
import { Download, Heart, X } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';

export default function Footer() {
  const t = useTranslation().t;
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | null>(null);

  return (
    <footer className="border-t border-white/5 bg-dark-bg py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="space-y-3 md:col-span-3">
            <a href="#" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-theme-primary">
                <Download className="h-4 w-4 text-black" />
              </div>
              <span className="text-md font-bold tracking-tight text-theme-txt font-mono uppercase">
                indirio<span className="text-theme-primary">.com.tr</span>
              </span>
            </a>
            <p className="text-xs text-zinc-400 max-w-md leading-relaxed">{t('footer.desc')}</p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-theme-txt uppercase tracking-wider font-mono mb-3">
              {t('footer.legalTitle')}
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => setActiveModal('terms')}
                  className="text-xs text-zinc-400 hover:text-theme-primary transition-colors font-mono cursor-pointer text-left focus:outline-none"
                >
                  {t('footer.terms')}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveModal('privacy')}
                  className="text-xs text-zinc-450 hover:text-theme-primary transition-colors font-mono cursor-pointer text-left focus:outline-none"
                >
                  {t('footer.privacy')}
                </button>
              </li>
              <li>
                <a
                  href="mailto:contact@aydindemirci.xyz"
                  className="text-xs text-zinc-400 hover:text-white transition-colors font-mono font-semibold text-theme-primary hover:text-theme-hover"
                >
                  {t('footer.contact')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] text-zinc-550 max-w-xl text-center md:text-left leading-relaxed">
            {t('footer.disclaimer')}
          </p>
          <p
            className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono"
            suppressHydrationWarning
          >
            © {new Date().getFullYear()} INDIRIO.COM.TR. {t('footer.rights')} Made with{' '}
            <Heart className="w-3 h-3 text-theme-primary fill-theme-primary animate-pulse" />
          </p>
        </div>
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-bg/85 backdrop-blur-md">
          <div className="glass-panel max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-2xl p-6 md:p-8 border border-white/10 shadow-2xl relative animate-fade-in-up">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {activeModal === 'terms' ? (
              <div>
                <h2 className="text-xl font-bold text-theme-txt font-mono uppercase border-b border-white/5 pb-3 mb-6">
                  Kullanım Koşulları
                </h2>
                <div className="space-y-4 text-xs text-zinc-550 leading-relaxed font-sans">
                  <p>
                    <strong>1. Kabul Edilen Koşullar:</strong> indirio.com.tr web sitesini ziyaret
                    ederek veya buradaki araçları kullanarak, bu kullanım koşullarını tamamen kabul
                    etmiş olursunuz.
                  </p>
                  <p>
                    <strong>2. Hizmet Tanımı:</strong> indirio.com.tr, sosyal medya platformlarındaki
                    halka açık video ve ses dosyalarını kişisel kullanım amacıyla analiz etmenizi ve
                    indirmenizi sağlayan ücretsiz, açık kaynaklı bir araçtır.
                  </p>
                  <p>
                    <strong>3. Fikri Mülkiyet ve Telif Hakları:</strong> Servisimiz telif haklarıyla
                    korunan içeriklerin izinsiz indirilmesini teşvik etmez. İndirilen tüm
                    içeriklerin yasal sorumluluğu tamamen kullanıcının kendisine aittir.
                    Kullanıcılar telif hakkı sahibi tarafından izin verilmiş içerikleri indirmekle
                    yükümlüdür.
                  </p>
                  <p>
                    <strong>4. Sistem Kötüye Kullanımı:</strong> Sunucu altyapısına zarar
                    verebilecek otomatik bot istekleri, aşırı kazıma (scraping) faaliyetleri ve spam
                    denemeleri kesinlikle yasaktır.
                  </p>
                  <p>
                    <strong>5. Sorumluluk Sınırlandırması:</strong> indirio.com.tr, harici
                    platformların yapacağı API veya yapılandırma değişikliklerinden dolayı hizmette
                    yaşanabilecek kesintilerden veya indirilen dosyaların kullanımından kaynaklanan
                    doğrudan ya da dolaylı zararlardan sorumlu tutulamaz.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-theme-txt font-mono uppercase border-b border-white/5 pb-3 mb-6">
                  Gizlilik Politikası
                </h2>
                <div className="space-y-4 text-xs text-zinc-550 leading-relaxed font-sans">
                  <p>
                    <strong>1. Kişisel Veri Toplama:</strong> indirio.com.tr, kullanıcılardan hiçbir
                    kişisel veri toplamaz, bunları işlemez ve herhangi bir veritabanında saklamaz.
                    Sistemimiz tamamen sunucusuz ve veritabanı bağlantısı olmadan (stateless)
                    çalışmaktadır.
                  </p>
                  <p>
                    <strong>2. Çerezler ve Yerel Depolama:</strong> Ziyaretçilerin dil tercihleri
                    gibi temel arayüz yapılandırmaları dışında hiçbir izleme çerezi
                    kullanılmamaktadır. Tarayıcınızda depolanan tüm tercihler tamamen cihazınız
                    bünyesinde yerel olarak barındırılır.
                  </p>
                  <p>
                    <strong>3. Üçüncü Taraf Siteler:</strong> Web sitemiz, indirmek istediğiniz
                    videoların barındığı dış platformlara istek gönderir. Bu harici platformların
                    gizlilik ve güvenlik politikaları kendilerine aittir.
                  </p>
                  <p>
                    <strong>4. Dosya Güvenliği:</strong> Sunucularımızda geçici olarak oluşturulan
                    indirme dosyaları, güvenlik ve optimizasyon amacıyla sistemdeki zamanlanmış
                    görevler tarafından kısa süre içinde kalıcı olarak silinir.
                  </p>
                  <p>
                    <strong>5. İrtibat:</strong> Gizlilik politikamız ve veri güvenliğiyle ilgili
                    sorularınız için bizimle contact@aydindemirci.xyz adresi üzerinden iletişime
                    geçebilirsiniz.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
