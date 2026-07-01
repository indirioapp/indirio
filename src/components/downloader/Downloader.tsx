'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import {
  Download,
  Link2,
  Clipboard,
  Music,
  Film,
  Clock,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Info,
  Check,
  QrCode,
  Users,
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { detectPlatform, PLATFORMS, SupportedPlatform } from '@/services/platform';
import { VideoMetadata } from '@/services/downloader';
import { Job } from '@/services/queue';
import { useTranslation } from '@/context/LanguageContext';

type DownloaderStep =
  'input' | 'analyzing' | 'playlist-select' | 'select' | 'downloading' | 'completed';

export default function Downloader() {
  const { success, error, info } = useToast();
  const { locale, t } = useTranslation();

  const [step, setStep] = useState<DownloaderStep>('input');
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<SupportedPlatform | null>(null);

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'mp4' | 'mp3' | 'srt' | 'vtt'>('mp4');
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [currentSize, setCurrentSize] = useState<number>(0);

  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [downloadEta, setDownloadEta] = useState('');
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [finalDownloadUrl, setFinalDownloadUrl] = useState<string | null>(null);

  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [activeQrIndex, setActiveQrIndex] = useState<number>(0);

  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [playlistQueue, setPlaylistQueue] = useState<
    {
      id: string;
      title: string;
      thumbnail: string;
      url: string;
      status: 'pending' | 'downloading' | 'completed' | 'failed';
      progress: number;
      downloadUrl?: string;
    }[]
  >([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(-1);
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string>('');

  const [stats, setStats] = useState<{
    activeDownloads: number;
    totalDownloads: number;
    liveVisitors: number;
  } | null>(null);

  const getConfettiColors = () => {
    return ['#6366f1', '#a5b4fc', '#4f46e5', '#c084fc'];
  };

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        if (active && data.success && data.stats) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const triggerAnalyze = async (targetUrl: string) => {
    if (!targetUrl.trim()) {
      error(t('downloader.errorNoLink'));
      return;
    }

    const platform = detectPlatform(targetUrl);
    if (!platform) {
      error(t('downloader.errorUnsupported'));
      return;
    }

    setStep('analyzing');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(resData.error || t('downloader.errorUnsupported'));
      }

      const meta = resData.data;
      setMetadata(meta);

      if (meta.isPlaylist) {
        setStep('playlist-select');
        if (meta.entries && meta.entries.length > 0) {
          setSelectedEntryIds(meta.entries.map((ent: { id: string }) => ent.id));
        }
      } else {
        setStep('select');
      }
      success(t('downloader.analyzedSuccess'));
    } catch (err) {
      const errorObj = err as Error;
      error(errorObj.message || t('downloader.errorUnsupported'));
      setStep('input');
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (url) {
      const detected = detectPlatform(url);
      setTimeout(() => setDetectedPlatform(detected), 0);
    } else {
      setTimeout(() => setDetectedPlatform(null), 0);
    }
  }, [url]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cleanupsse'));
      }
    };
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setTimeout(() => {
        setUrl(urlParam);
        triggerAnalyze(urlParam);
      }, 0);

      if (typeof window !== 'undefined') {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (metadata) {
      if (selectedFormat === 'srt' || selectedFormat === 'vtt') {
        if (metadata.subtitles && metadata.subtitles.length > 0) {
          setTimeout(() => {
            setSelectedQuality(metadata.subtitles![0].lang);
            setCurrentSize(0);
          }, 0);
        } else {
          setTimeout(() => {
            setSelectedQuality('');
            setCurrentSize(0);
          }, 0);
        }
      } else {
        const filtered = metadata.formats.filter((f) => f.format === selectedFormat);
        if (filtered.length > 0) {
          const targetQuality = filtered[0].quality;
          const targetSize = filtered[0].sizeMb;
          setTimeout(() => {
            setSelectedQuality(targetQuality);
            setCurrentSize(targetSize);
          }, 0);
        }
      }
    }
  }, [metadata, selectedFormat]);

  const handleQualityChange = (qualityVal: string) => {
    setSelectedQuality(qualityVal);
    if (metadata) {
      const formatObj = metadata.formats.find(
        (f) => f.format === selectedFormat && f.quality === qualityVal,
      );
      if (formatObj) {
        setCurrentSize(formatObj.sizeMb);
      }
    }
  };

  const handlePaste = async () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        success(t('downloader.pasteSuccess'));
      } else {
        info(t('downloader.pasteEmpty'));
      }
    } catch {
      info(t('downloader.pasteError'));
    }
  };

  const handleReset = () => {
    setUrl('');
    setMetadata(null);
    setSelectedFormat('mp4');
    setSelectedQuality('');
    setCurrentSize(0);
    setDownloadProgress(0);
    setDownloadSpeed('');
    setDownloadEta('');
    setDownloadStatus('');
    setFinalDownloadUrl(null);
    setQrCodeUrl('');
    setActiveQrIndex(0);
    setSelectedEntryIds([]);
    setPlaylistQueue([]);
    setCurrentQueueIndex(-1);
    setSelectedSubtitleLang('');
    setStep('input');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cleanupsse'));
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerAnalyze(url);
  };

  const handleStartDownload = async () => {
    if (!metadata) return;

    try {
      setStep('downloading');
      setDownloadProgress(0);
      setDownloadStatus(locale === 'tr' ? 'Kuyruğa alınıyor...' : 'Queuing...');

      const payload: { url: string; format: string; quality: string; subtitleLang?: string } = {
        url: metadata.url,
        format: selectedFormat,
        quality: selectedQuality,
      };

      if (selectedFormat === 'mp4' && selectedSubtitleLang) {
        payload.subtitleLang = selectedSubtitleLang;
      }

      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok || !resData.success) {
        throw new Error(
          resData.error ||
            (locale === 'tr'
              ? 'İndirme kuyruğuna eklenirken hata oluştu.'
              : 'Error adding to download queue.'),
        );
      }

      connectToProgressStream(resData.jobId);
    } catch (err) {
      const errorObj = err as Error;
      error(
        errorObj.message ||
          (locale === 'tr' ? 'İndirme başlatılamadı.' : 'Could not start download.'),
      );
      setStep('select');
    }
  };

  const connectToProgressStream = (id: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cleanupsse'));
    }

    const sse = new EventSource(`/api/progress?jobId=${id}`);

    if (typeof window !== 'undefined') {
      const closeSSE = () => {
        sse.close();
        window.removeEventListener('cleanupsse', closeSSE);
      };
      window.addEventListener('cleanupsse', closeSSE);
    }

    sse.onmessage = (event) => {
      try {
        const job: Job = JSON.parse(event.data);

        setDownloadProgress(job.progress);
        setDownloadSpeed(job.speed);
        setDownloadEta(job.eta);

        if (job.status === 'downloading') {
          setDownloadStatus(
            `${locale === 'tr' ? 'İndiriliyor...' : 'Downloading...'} %${job.progress}`,
          );
        } else if (job.status === 'converting') {
          setDownloadStatus(
            locale === 'tr' ? 'Ses dosyasına dönüştürülüyor...' : 'Converting to audio...',
          );
        } else if (job.status === 'completed') {
          setDownloadStatus(locale === 'tr' ? 'Tamamlandı!' : 'Completed!');
          setFinalDownloadUrl(job.downloadUrl);
          setStep('completed');
          sse.close();

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: getConfettiColors(),
          });
        } else if (job.status === 'failed') {
          error(
            job.error || (locale === 'tr' ? 'İndirme işlemi başarısız oldu.' : 'Download failed.'),
          );
          setStep('select');
          sse.close();
        }
      } catch (err) {
        console.error('SSE Message parsing error:', err);
      }
    };

    onconnectionerror(sse);
  };

  const onconnectionerror = (sse: EventSource) => {
    sse.onerror = (err) => {
      console.error('SSE connection error:', err);
      sse.close();
    };
  };

  const connectPlaylistProgress = (id: string, index: number) => {
    return new Promise<string>((resolve, reject) => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cleanupsse'));
      }

      const sse = new EventSource(`/api/progress?jobId=${id}`);

      if (typeof window !== 'undefined') {
        const closeSSE = () => {
          sse.close();
          window.removeEventListener('cleanupsse', closeSSE);
        };
        window.addEventListener('cleanupsse', closeSSE);
      }

      sse.onmessage = (event) => {
        try {
          const job: Job = JSON.parse(event.data);

          setDownloadProgress(job.progress);
          setDownloadSpeed(job.speed);
          setDownloadEta(job.eta);

          setPlaylistQueue((prev) =>
            prev.map((item, idx) => {
              if (idx === index) {
                return {
                  ...item,
                  status:
                    job.status === 'converting'
                      ? 'downloading'
                      : (job.status as 'pending' | 'downloading' | 'completed' | 'failed'),
                  progress: job.progress,
                };
              }
              return item;
            }),
          );

          if (job.status === 'completed') {
            setPlaylistQueue((prev) =>
              prev.map((item, idx) => {
                if (idx === index) {
                  return {
                    ...item,
                    status: 'completed',
                    progress: 100,
                    downloadUrl: job.downloadUrl || undefined,
                  };
                }
                return item;
              }),
            );
            sse.close();
            resolve(job.downloadUrl || '');
          } else if (job.status === 'failed') {
            setPlaylistQueue((prev) =>
              prev.map((item, idx) => {
                if (idx === index) {
                  return { ...item, status: 'failed', progress: 0 };
                }
                return item;
              }),
            );
            sse.close();
            reject(new Error(job.error || 'Failed'));
          }
        } catch (err) {
          console.error(err);
        }
      };

      sse.onerror = () => {
        sse.close();
        reject(new Error('SSE connection failed'));
      };
    });
  };

  const handlePlaylistDownloadStart = async () => {
    if (!metadata || !metadata.entries) return;

    const queue = metadata.entries
      .filter((entry) => selectedEntryIds.includes(entry.id))
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        thumbnail: entry.thumbnail,
        url: entry.url,
        status: 'pending' as const,
        progress: 0,
      }));

    if (queue.length === 0) {
      error(
        locale === 'tr' ? 'Lütfen en az bir video seçin.' : 'Please select at least one video.',
      );
      return;
    }

    setPlaylistQueue(queue);
    setStep('downloading');
    setDownloadProgress(0);

    const updatedQueue = [...queue];

    for (let i = 0; i < updatedQueue.length; i++) {
      setCurrentQueueIndex(i);
      setPlaylistQueue((prev) =>
        prev.map((item, idx) => {
          if (idx === i) return { ...item, status: 'downloading' };
          return item;
        }),
      );

      try {
        const response = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: updatedQueue[i].url,
            format: selectedFormat,
            quality: selectedQuality || '720p',
          }),
        });

        const resData = await response.json();
        if (!response.ok || !resData.success) {
          throw new Error(resData.error || 'Failed to enqueue');
        }

        await connectPlaylistProgress(resData.jobId, i);
      } catch {
        setPlaylistQueue((prev) =>
          prev.map((item, idx) => {
            if (idx === i) return { ...item, status: 'failed' };
            return item;
          }),
        );
      }
    }

    setStep('completed');
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      colors: getConfettiColors(),
    });
  };

  useEffect(() => {
    if (step === 'completed' && finalDownloadUrl) {
      QRCode.toDataURL(window.location.origin + finalDownloadUrl)
        .then((urlCode) => {
          if (activeQrIndex === 0) {
            setQrCodeUrl(urlCode);
          }
        })
        .catch((err) => console.error(err));
    } else if (step === 'completed' && playlistQueue.length > 0) {
      const activeItem = playlistQueue[activeQrIndex];
      if (activeItem && activeItem.downloadUrl) {
        QRCode.toDataURL(window.location.origin + activeItem.downloadUrl)
          .then((urlCode) => {
            setQrCodeUrl(urlCode);
          })
          .catch((err) => console.error(err));
      }
    }
  }, [step, finalDownloadUrl, playlistQueue, activeQrIndex]);

  return (
    <div id="downloader-section" className="relative w-full max-w-3xl mx-auto px-4 z-10">
      <AnimatePresence mode="wait">
        {step === 'input' && (
          <motion.div
            key="step-input"
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full"
          >
            <form onSubmit={handleAnalyze} className="relative w-full">
              <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-dark-card/85 backdrop-blur-xl rounded-2xl p-3 sm:p-2.5 sm:pr-3.5 shadow-2xl border border-dark-border group focus-within:border-theme-primary/50 focus-within:ring-4 focus-within:ring-theme-primary/10 transition-all duration-300 gap-3 sm:gap-0">
                <div className="flex items-center w-full sm:flex-1 min-w-0 bg-theme-mute sm:bg-transparent border border-dark-border sm:border-0 rounded-xl sm:rounded-none px-3 sm:px-0">
                  <div className="pl-1 sm:pl-4 text-zinc-400 shrink-0">
                    <Link2 className="w-5 h-5 group-focus-within:text-theme-primary transition-colors" />
                  </div>

                  <input
                    ref={inputRef}
                    type="url"
                    placeholder={t('downloader.placeholder')}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-transparent border-0 outline-none focus:ring-0 text-theme-txt placeholder-zinc-500 text-sm sm:text-base py-3.5 sm:py-4 px-2 sm:px-3 min-w-0"
                    required
                  />

                  {detectedPlatform && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`hidden sm:inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold border mr-3 bg-gradient-to-r text-white border-dark-border ${
                        PLATFORMS[detectedPlatform].color
                      }`}
                    >
                      {PLATFORMS[detectedPlatform].name}
                    </motion.span>
                  )}

                  <button
                    type="button"
                    onClick={handlePaste}
                    className="p-2.5 sm:p-3 text-zinc-455 hover:text-theme-txt bg-theme-hover-bg rounded-xl transition-all mr-0 sm:mr-3 cursor-pointer shrink-0"
                    title={t('downloader.pasteBtn')}
                  >
                    <Clipboard className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-theme-primary hover:bg-theme-hover text-black font-bold text-sm sm:text-base px-7 py-4 sm:py-3.5 shadow-lg shadow-theme-glow active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 w-full sm:w-auto sm:ml-3"
                >
                  {t('downloader.downloadBtn')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full bg-dark-card/45 border border-dark-border shadow-2xl backdrop-blur-md rounded-2xl p-4 sm:p-5 mt-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-theme-primary/5 via-transparent to-theme-primary/5 pointer-events-none"></div>
                <div className="grid grid-cols-3 divide-x divide-dark-border text-center relative z-10">
                  <div className="flex flex-col items-center justify-center px-2">
                    <div className="flex items-center gap-1.5 mb-1.5 justify-center">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-theme-primary"></span>
                      </span>
                      <span className="text-sm sm:text-xl font-black text-theme-txt font-mono tracking-tight">
                        {stats.activeDownloads}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-theme-muted uppercase tracking-wider">
                      {t('downloader.statsActive')}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center px-2">
                    <div className="flex items-center gap-1.5 mb-1.5 justify-center">
                      <Download className="w-4 h-4 text-theme-primary shrink-0" />
                      <span className="text-sm sm:text-xl font-black text-theme-txt font-mono tracking-tight">
                        {stats.totalDownloads.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-theme-muted uppercase tracking-wider">
                      {t('downloader.statsTotal')}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center px-2">
                    <div className="flex items-center gap-1.5 mb-1.5 justify-center">
                      <Users className="w-4 h-4 text-theme-primary shrink-0" />
                      <span className="text-sm sm:text-xl font-black text-theme-txt font-mono tracking-tight">
                        {stats.liveVisitors}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-theme-muted uppercase tracking-wider">
                      {t('downloader.statsVisitors')}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 text-xs text-zinc-550 font-medium">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-550" /> {t('downloader.infoTip')}
              </span>
            </div>
          </motion.div>
        )}

        {step === 'analyzing' && (
          <motion.div
            key="step-analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-dark-card/85 backdrop-blur-xl border border-dark-border rounded-2xl p-8 shadow-2xl w-full text-center relative overflow-hidden"
          >
            <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-theme-primary to-transparent top-0 animate-scan pointer-events-none"></div>

            <div className="flex flex-col items-center py-6">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-4 border-dark-border border-t-theme-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-theme-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-theme-txt mb-2">
                {t('downloader.analyzingTitle')}
              </h3>
              <p className="text-theme-muted text-sm max-w-sm">{t('downloader.analyzingDesc')}</p>

              <div className="w-full max-w-md mt-8 space-y-3">
                <div className="h-4 bg-theme-hover-bg rounded-lg w-3/4 mx-auto animate-pulse"></div>
                <div className="h-3 bg-theme-hover-bg rounded-lg w-1/2 mx-auto animate-pulse"></div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'playlist-select' && metadata && (
          <motion.div
            key="step-playlist-select"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-dark-card/85 backdrop-blur-xl border border-dark-border rounded-2xl p-6 sm:p-8 shadow-2xl w-full flex flex-col gap-6"
          >
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative w-full sm:w-52 aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-dark-border flex-shrink-0">
                <img
                  src={metadata.thumbnail}
                  alt={metadata.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-bold text-red-400 mb-3">
                  {t('downloader.playlistTitle')}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-theme-txt leading-snug break-words">
                  {metadata.title}
                </h3>
                <p className="text-xs text-theme-muted mt-1">
                  {metadata.entries?.length || 0} {locale === 'tr' ? 'Video' : 'Videos'} •{' '}
                  {metadata.durationString}
                </p>
              </div>
            </div>

            <div className="h-px bg-theme-hover-bg w-full"></div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  {t('downloader.selectFormat')}
                </label>
                <div className="grid grid-cols-2 gap-2 bg-theme-mute p-1.5 rounded-xl border border-dark-border w-64">
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('mp4')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFormat === 'mp4'
                        ? 'bg-theme-primary text-black'
                        : 'text-theme-txt/80 hover:text-theme-txt'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    MP4
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFormat('mp3')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFormat === 'mp3'
                        ? 'bg-theme-primary text-black'
                        : 'text-theme-txt/80 hover:text-theme-txt'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    MP3
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 mb-2">
                  {locale === 'tr' ? 'Kalite' : 'Quality'}
                </label>
                <div className="flex gap-2">
                  {(selectedFormat === 'mp4' ? ['1080p', '720p', '360p'] : ['mp3_hq']).map((q) => {
                    const label = q === 'mp3_hq' ? '320kbps' : q;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSelectedQuality(q)}
                        className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          selectedQuality === q || (selectedFormat === 'mp3' && q === 'mp3_hq')
                            ? 'bg-theme-primary/10 border-theme-primary text-theme-primary'
                            : 'bg-theme-mute border border-dark-border text-theme-txt/80 hover:text-theme-txt'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-bold text-theme-muted">
                {t('downloader.playlistSelectedCount')}: {selectedEntryIds.length} /{' '}
                {metadata.entries?.length || 0}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedEntryIds.length === (metadata.entries?.length || 0)) {
                    setSelectedEntryIds([]);
                  } else {
                    setSelectedEntryIds(metadata.entries?.map((e) => e.id) || []);
                  }
                }}
                className="text-xs font-bold text-theme-primary hover:text-theme-txt transition-colors"
              >
                {selectedEntryIds.length === (metadata.entries?.length || 0)
                  ? locale === 'tr'
                    ? 'Seçimleri Kaldır'
                    : 'Deselect All'
                  : locale === 'tr'
                    ? 'Tümünü Seç'
                    : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-dark-border rounded-xl bg-theme-mute p-2 space-y-2 custom-scrollbar">
              {metadata.entries?.map((entry) => {
                const isChecked = selectedEntryIds.includes(entry.id);
                return (
                  <div
                    key={entry.id}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedEntryIds((prev) => prev.filter((id) => id !== entry.id));
                      } else {
                        setSelectedEntryIds((prev) => [...prev, entry.id]);
                      }
                    }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-theme-hover-bg border-dark-border'
                        : 'border-transparent hover:bg-theme-hover-bg'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="rounded border-white/10 text-theme-primary focus:ring-theme-primary/10 bg-theme-bg-input w-4 h-4 cursor-pointer"
                    />
                    <img
                      src={entry.thumbnail}
                      alt={entry.title}
                      className="w-16 aspect-video object-cover rounded-md border border-dark-border"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-theme-txt truncate">
                        {entry.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-theme-muted mt-0.5">
                        <Clock className="w-3 h-3" />
                        {entry.durationString}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-dark-border hover:border-white/20 hover:bg-white/5 px-5 py-3.5 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('downloader.cancelBtn')}
              </button>

              <button
                type="button"
                onClick={handlePlaylistDownloadStart}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-theme-primary hover:bg-theme-hover text-black font-bold text-xs px-5 py-3.5 shadow-lg shadow-theme-glow active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                {t('downloader.playlistDownloadAll')}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'select' && metadata && (
          <motion.div
            key="step-select"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-dark-card/85 backdrop-blur-xl border border-dark-border rounded-2xl p-6 sm:p-8 shadow-2xl w-full flex flex-col gap-6"
          >
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="relative w-full sm:w-52 aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-dark-border flex-shrink-0 group">
                <img
                  src={metadata.thumbnail}
                  alt={metadata.title}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
                <div className="absolute bottom-2 right-2 bg-theme-accent-card border border-dark-border px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-theme-txt flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {metadata.durationString}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-bold border mb-3 bg-gradient-to-r text-white border-dark-border ${
                    PLATFORMS[metadata.platform].color
                  }`}
                >
                  {metadata.platformName}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-theme-txt leading-snug break-words">
                  {metadata.title}
                </h3>
              </div>
            </div>

            <div className="h-px bg-theme-hover-bg w-full"></div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                {t('downloader.selectFormat')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-theme-mute p-1.5 rounded-xl border border-dark-border max-w-lg">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('mp4')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    selectedFormat === 'mp4'
                      ? 'bg-theme-primary text-black font-extrabold'
                      : 'text-theme-txt/80 hover:text-theme-txt hover:bg-theme-hover-bg'
                  }`}
                >
                  <Film className="w-4 h-4" />
                  MP4
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('mp3')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    selectedFormat === 'mp3'
                      ? 'bg-theme-primary text-black font-extrabold'
                      : 'text-theme-txt/80 hover:text-theme-txt hover:bg-theme-hover-bg'
                  }`}
                >
                  <Music className="w-4 h-4" />
                  MP3
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('srt')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    selectedFormat === 'srt'
                      ? 'bg-theme-primary text-black font-extrabold'
                      : 'text-theme-txt/80 hover:text-theme-txt hover:bg-theme-hover-bg'
                  }`}
                >
                  <span className="text-[10px] font-extrabold border border-current px-1 rounded shrink-0">
                    SRT
                  </span>
                  {t('downloader.subtitleFormatSrt')
                    .replace('Altyazı ', '')
                    .replace('Subtitle ', '')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('vtt')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                    selectedFormat === 'vtt'
                      ? 'bg-theme-primary text-black font-extrabold'
                      : 'text-theme-txt/80 hover:text-theme-txt hover:bg-theme-hover-bg'
                  }`}
                >
                  <span className="text-[10px] font-extrabold border border-current px-1 rounded shrink-0">
                    VTT
                  </span>
                  {t('downloader.subtitleFormatVtt')
                    .replace('Altyazı ', '')
                    .replace('Subtitle ', '')}
                </button>
              </div>
            </div>

            {selectedFormat === 'mp4' && metadata.subtitles && metadata.subtitles.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                  {t('downloader.subtitleLabel')}
                </label>
                <select
                  value={selectedSubtitleLang}
                  onChange={(e) => setSelectedSubtitleLang(e.target.value)}
                  className="w-full max-w-sm bg-theme-input border border-dark-border rounded-xl px-4 py-3 text-sm text-theme-txt focus:outline-none focus:border-theme-primary transition-colors cursor-pointer"
                >
                  <option value="">{t('downloader.subtitleNone')}</option>
                  {metadata.subtitles.map((sub) => (
                    <option key={sub.lang} value={sub.lang}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550 mb-3">
                {selectedFormat === 'srt' || selectedFormat === 'vtt'
                  ? 'SUBTITLE LANGUAGE'
                  : t('downloader.selectQuality')}
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selectedFormat === 'srt' || selectedFormat === 'vtt' ? (
                  metadata.subtitles && metadata.subtitles.length > 0 ? (
                    metadata.subtitles.map((sub) => {
                      const isSelected = selectedQuality === sub.lang;
                      return (
                        <button
                          key={sub.lang}
                          type="button"
                          onClick={() => setSelectedQuality(sub.lang)}
                          className={`text-left p-4 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-theme-primary/10 border-theme-primary shadow-md ring-1 ring-theme-primary/35'
                              : 'bg-theme-mute border border-dark-border hover:bg-theme-hover-bg text-theme-txt/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-theme-primary/10 text-theme-primary">
                              <span className="text-[11px] font-extrabold border border-current px-1 py-0.2 rounded shrink-0">
                                {selectedFormat.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="block text-sm font-bold leading-tight">
                                {sub.name}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-theme-primary flex-shrink-0" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-theme-muted text-sm p-4 rounded-xl border border-dark-border bg-theme-mute col-span-1 sm:col-span-2">
                      {locale === 'tr'
                        ? 'Bu videoda kullanılabilir altyazı bulunamadı.'
                        : 'No available subtitles found for this video.'}
                    </div>
                  )
                ) : (
                  metadata.formats
                    .filter((f) => f.format === selectedFormat)
                    .map((f) => {
                      const isSelected = selectedQuality === f.quality;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleQualityChange(f.quality)}
                          className={`text-left p-4 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-theme-primary/10 border-theme-primary shadow-md ring-1 ring-theme-primary/35'
                              : 'bg-theme-mute border border-dark-border hover:bg-theme-hover-bg text-theme-txt/80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-theme-primary/10 text-theme-primary">
                              {selectedFormat === 'mp3' ? (
                                <Music className="w-4 h-4" />
                              ) : (
                                <Film className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <span className="block text-sm font-bold leading-tight">
                                {f.label}
                              </span>
                              <span className="block text-[11px] text-theme-muted mt-0.5 font-medium">
                                {selectedFormat === 'mp3'
                                  ? locale === 'tr'
                                    ? 'En Yüksek Kalite Ses'
                                    : 'Highest Quality Audio'
                                  : f.quality}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                isSelected
                                  ? 'text-theme-primary bg-theme-primary/20'
                                  : 'text-zinc-550 bg-theme-hover-bg'
                              }`}
                            >
                              ~{f.sizeMb} MB
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-theme-primary flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3.5 w-full max-w-md mt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 px-5 py-4 text-sm font-bold text-zinc-350 hover:text-white transition-all cursor-pointer"
              >
                {t('downloader.cancelBtn')}
              </button>

              <button
                type="button"
                onClick={handleStartDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-theme-primary hover:bg-theme-hover text-black font-bold text-sm px-5 py-4 shadow active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                {t('downloader.startDownloadBtn')} {currentSize > 0 ? `(${currentSize} MB)` : ''}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'downloading' && (
          <motion.div
            key="step-downloading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-dark-card/85 backdrop-blur-xl border border-dark-border rounded-2xl p-8 shadow-2xl w-full flex flex-col gap-6"
          >
            {playlistQueue.length > 0 ? (
              <div className="w-full space-y-4">
                <div className="text-center py-2">
                  <h3 className="text-base font-bold text-theme-txt mb-1.5">
                    {locale === 'tr' ? 'Oynatma Listesi İndiriliyor...' : 'Downloading Playlist...'}
                  </h3>
                  <p className="text-xs text-theme-muted font-medium">
                    {currentQueueIndex + 1} / {playlistQueue.length}{' '}
                    {locale === 'tr' ? 'Video İşleniyor' : 'Videos Processing'}
                  </p>
                </div>

                <div className="max-h-64 overflow-y-auto border border-dark-border rounded-xl bg-theme-mute p-3 space-y-2.5 custom-scrollbar">
                  {playlistQueue.map((item, idx) => {
                    const isActive = idx === currentQueueIndex;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
                          isActive
                            ? 'bg-theme-primary/5 border-theme-primary/30'
                            : 'border-transparent bg-transparent'
                        }`}
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-14 aspect-video object-cover rounded-md border border-dark-border flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-theme-txt truncate">
                            {item.title}
                          </span>
                          {isActive && (
                            <div className="w-full bg-zinc-850 h-1 rounded-full overflow-hidden mt-2">
                              <div
                                className="bg-theme-primary h-full rounded-full transition-all duration-300"
                                style={{ width: `${downloadProgress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-right min-w-[70px]">
                          {item.status === 'completed' && (
                            <span className="text-[10px] font-bold text-emerald-450 bg-emerald-500/10 px-2 py-1 rounded-md">
                              DONE
                            </span>
                          )}
                          {item.status === 'downloading' && (
                            <span className="text-[10px] font-bold text-theme-primary bg-theme-primary/10 px-2 py-1 rounded-md animate-pulse">
                              %{downloadProgress}
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="text-[10px] font-bold text-zinc-550 bg-theme-hover-bg px-2 py-1 rounded-md">
                              WAIT
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="text-[10px] font-bold text-rose-455 bg-rose-500/10 px-2 py-1 rounded-md">
                              ERR
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4 text-center text-xs font-semibold bg-theme-mute border border-dark-border rounded-xl p-3.5">
                  <div>
                    <span className="block text-zinc-500 font-bold uppercase tracking-wider text-[9px] mb-1">
                      {t('downloader.speedLabel')}
                    </span>
                    <span className="font-bold text-theme-txt text-sm block">
                      {downloadSpeed || '--'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-500 font-bold uppercase tracking-wider text-[9px] mb-1">
                      {t('downloader.etaLabel')}
                    </span>
                    <span className="font-bold text-theme-txt text-sm block">
                      {downloadEta || '--'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-zinc-800"
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      className="stroke-theme-primary transition-all duration-300"
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={2 * Math.PI * 34 * (1 - downloadProgress / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-theme-txt">%{downloadProgress}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-theme-txt mb-1.5">{downloadStatus}</h3>
                <p className="text-sm text-zinc-550 max-w-md mx-auto truncate font-medium">
                  {metadata?.title}
                </p>
              </div>
            )}

            {playlistQueue.length === 0 && (
              <div className="bg-theme-mute border border-dark-border rounded-xl p-5 space-y-4">
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-theme-primary transition-all duration-300 rounded-full"
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                  <div>
                    <span className="block text-zinc-550 font-bold uppercase tracking-wider text-[9px] mb-1">
                      {t('downloader.speedLabel')}
                    </span>
                    <span className="font-bold text-theme-txt text-sm block">
                      {downloadSpeed || '--'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-555 font-bold uppercase tracking-wider text-[9px] mb-1">
                      {t('downloader.etaLabel')}
                    </span>
                    <span className="font-bold text-theme-txt text-sm block">
                      {downloadEta || '--'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-zinc-555 font-bold uppercase tracking-wider text-[9px] mb-1">
                      {t('downloader.sizeLabel')}
                    </span>
                    <span className="font-bold text-theme-txt text-sm block">
                      ~{currentSize} MB
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dark-border px-4 py-2.5 text-xs font-bold text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                {t('downloader.cancelDownloadBtn')}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'completed' && metadata && (
          <motion.div
            key="step-completed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#040c08]/85 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 sm:p-10 shadow-2xl w-full text-center flex flex-col items-center gap-6"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-455 shadow-lg shadow-emerald-500/10 animate-float">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-theme-txt mb-2">
                {t('downloader.successTitle')}
              </h3>
              <p className="text-theme-muted text-sm max-w-md mx-auto truncate font-medium">
                {metadata.title}
              </p>
            </div>

            {playlistQueue.length > 0 ? (
              <div className="w-full space-y-4">
                <div className="max-h-60 overflow-y-auto border border-dark-border rounded-xl bg-theme-mute p-3 space-y-2.5 custom-scrollbar w-full text-left">
                  {playlistQueue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-dark-border bg-theme-hover-bg animate-fade-in-up"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-12 aspect-video object-cover rounded-md border border-dark-border flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-theme-txt truncate max-w-[200px] sm:max-w-[320px]">
                            {item.title}
                          </span>
                          <span className="block text-[10px] text-zinc-500">
                            {selectedFormat.toUpperCase()} •{' '}
                            {selectedQuality === 'mp3_hq' ? '320kbps' : selectedQuality}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.status === 'completed' && item.downloadUrl ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveQrIndex(idx);
                              }}
                              className={`p-2 rounded-lg border text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer ${
                                activeQrIndex === idx
                                  ? 'border-theme-primary text-theme-primary bg-theme-primary/10'
                                  : 'border-dark-border'
                              }`}
                              title={t('downloader.qrLabel')}
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                            <a
                              href={item.downloadUrl}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all active:scale-95 shadow"
                              onClick={() => success(t('downloader.successToast'))}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-455 bg-rose-500/10 px-2.5 py-1.5 rounded-md">
                            ERR
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-theme-mute border border-dark-border rounded-xl px-5 py-4 w-full max-w-md flex justify-around text-xs font-bold text-theme-txt/80 animate-fade-in-up">
                <span>Format: {selectedFormat.toUpperCase()}</span>
                <span className="h-4 w-px bg-theme-hover-bg"></span>
                <span>
                  {t('history.quality')}: {selectedQuality}
                </span>
                <span className="h-4 w-px bg-theme-hover-bg"></span>
                <span>
                  {t('history.size')}: {currentSize} MB
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3.5 w-full max-w-md mt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 px-5 py-4 text-sm font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                {t('downloader.anotherDownloadBtn')}
              </button>

              {playlistQueue.length === 0 && (
                <a
                  href={finalDownloadUrl || '#'}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-5 py-4 shadow active:scale-95 transition-all"
                  onClick={() => {
                    success(t('downloader.successToast'));
                  }}
                >
                  <Download className="w-4 h-4" />
                  {t('downloader.downloadFileBtn')}
                </a>
              )}
            </div>

            {qrCodeUrl && (
              <div className="w-full max-w-md bg-theme-mute border border-dark-border rounded-2xl p-5 mt-2 flex flex-col items-center gap-4 text-center animate-fade-in-up">
                <div className="flex items-center gap-2 text-theme-primary font-semibold text-sm">
                  <QrCode className="w-4 h-4 animate-pulse" />
                  <span>MOBILE_TRANSMIT_QR</span>
                </div>
                <div className="p-3 bg-white rounded-xl shadow-xl flex items-center justify-center">
                  <img src={qrCodeUrl} alt="QR Code Share" className="w-44 h-44" />
                </div>
                <p className="text-[11px] text-theme-muted leading-relaxed max-w-xs">
                  {t('downloader.qrDesc')}
                </p>
                {playlistQueue.length > 0 && (
                  <p className="text-[10px] text-theme-primary font-medium">
                    {locale === 'tr' ? 'Seçili video: ' : 'Selected video: '}
                    <span className="underline truncate max-w-[200px] inline-block align-bottom">
                      {playlistQueue[activeQrIndex]?.title}
                    </span>
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
