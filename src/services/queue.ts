import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { detectPlatform, getCleanUrl, SupportedPlatform } from './platform';
import { downloaderService } from './downloader';
import { statsService } from './stats';

export interface Job {
  id: string;
  url: string;
  platform: SupportedPlatform;
  format: 'mp4' | 'mp3' | 'srt' | 'vtt';
  quality: string;
  status: 'queued' | 'downloading' | 'converting' | 'completed' | 'failed';
  progress: number;
  speed: string;
  eta: string;
  title: string;
  thumbnail: string;
  downloadUrl: string | null;
  realDownloadUrl?: string | null;
  cookiesBrowser?: string | null;
  subtitleLang?: string | null;
  error: string | null;
  createdAt: number;
  downloaded?: boolean;
}

type JobSubscriber = (job: Job) => void;

class QueueService {
  private jobs = new Map<string, Job>();
  private subscribers = new Map<string, Set<JobSubscriber>>();

  constructor() {
    this.startCleanupScheduler();
  }

  private startCleanupScheduler() {
    setInterval(
      async () => {
        try {
          const downloadsDir = path.join(process.cwd(), 'downloads');
          if (!fs.existsSync(downloadsDir)) return;
          const files = await fs.promises.readdir(downloadsDir);
          const now = Date.now();
          const maxAge = 30 * 60 * 1000;
          for (const file of files) {
            const filePath = path.join(downloadsDir, file);
            try {
              const stats = await fs.promises.stat(filePath);
              if (now - stats.mtimeMs > maxAge) {
                await fs.promises.unlink(filePath);
                const jobId = file.split('.')[0];
                this.jobs.delete(jobId);
                console.log(`Scheduler cleaned up expired file and job: ${filePath}`);
              }
            } catch (e) {
              console.error(`Failed to check or delete file ${filePath}:`, e);
            }
          }
        } catch (err) {
          console.error('Error in cleanup scheduler:', err);
        }
      },
      10 * 60 * 1000,
    );
  }

  async createJob(
    url: string,
    format: 'mp4' | 'mp3' | 'srt' | 'vtt',
    quality: string,
    subtitleLang?: string | null,
  ): Promise<Job> {
    const jobId = Math.random().toString(36).substring(2, 15);
    const platform = detectPlatform(url);

    if (!platform) {
      throw new Error('Geçersiz veya desteklenmeyen platform linki.');
    }

    const cleanUrl = getCleanUrl(url);
    const metadata = await downloaderService.extractMetadata(cleanUrl, platform);

    const job: Job = {
      id: jobId,
      url: cleanUrl,
      platform,
      format,
      quality,
      status: 'queued',
      progress: 0,
      speed: '0 KB/s',
      eta: '--',
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      downloadUrl: null,
      realDownloadUrl: metadata.videoUrl || null,
      cookiesBrowser: metadata.cookiesBrowser || null,
      subtitleLang: subtitleLang || null,
      error: null,
      createdAt: Date.now(),
    };

    this.jobs.set(jobId, job);
    statsService.incrementDownloads();

    this.startProcessing(jobId);

    return job;
  }

  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  markAsDownloaded(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.downloaded = true;
    }
  }

  subscribe(jobId: string, callback: JobSubscriber): () => void {
    if (!this.subscribers.has(jobId)) {
      this.subscribers.set(jobId, new Set());
    }

    this.subscribers.get(jobId)!.add(callback);

    const currentJob = this.getJob(jobId);
    if (currentJob) {
      callback(currentJob);
    }

    return () => {
      const subs = this.subscribers.get(jobId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(jobId);
        }
      }
    };
  }

  notifySubscribers(jobId: string, job: Job) {
    const subs = this.subscribers.get(jobId);
    if (subs) {
      subs.forEach((callback) => callback({ ...job }));
    }
  }

  private async startProcessing(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const downloadsDir = path.join(process.cwd(), 'downloads');

    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const browsers = [null, 'chrome', 'safari', 'firefox'];
    let currentAttemptIndex = job.cookiesBrowser ? browsers.indexOf(job.cookiesBrowser) : 0;
    if (currentAttemptIndex === -1) {
      currentAttemptIndex = 0;
    }

    const runAttempt = () => {
      const activeBrowser = browsers[currentAttemptIndex];
      job.status = 'downloading';
      this.notifySubscribers(jobId, job);

      let args: string[] = [];
      const outputTemplate = path.join(downloadsDir, `${jobId}.%(ext)s`);

      let qualitySelector = 'bestvideo[height<=720]+bestaudio/best';
      if (job.quality === '1080p') {
        qualitySelector = 'bestvideo[height<=1080]+bestaudio/best';
      } else if (job.quality === '360p') {
        qualitySelector = 'bestvideo[height<=360]+bestaudio/best';
      }

      const targetUrl = job.url.replace('x.com', 'twitter.com');

      if (job.format === 'srt' || job.format === 'vtt') {
        args = [
          '--skip-download',
          '--write-subs',
          '--write-auto-subs',
          '--sub-langs',
          job.quality,
          '--sub-format',
          job.format,
          '-o',
          outputTemplate,
          '--no-playlist',
          '--newline',
          targetUrl,
        ];
      } else if (job.format === 'mp3') {
        args = [
          '-x',
          '--audio-format',
          'mp3',
          '--audio-quality',
          '320k',
          '-o',
          outputTemplate,
          '--no-playlist',
          '--newline',
          targetUrl,
        ];
      } else {
        args = [
          '-f',
          qualitySelector,
          '--merge-output-format',
          'mp4',
          '-o',
          outputTemplate,
          '--no-playlist',
          '--newline',
          targetUrl,
        ];
        if (job.subtitleLang) {
          args.push(
            '--write-subs',
            '--write-auto-subs',
            '--sub-langs',
            job.subtitleLang,
            '--embed-subs',
          );
        }
      }

      const cookiesPath = path.join(process.cwd(), 'instagram-cookies.txt');
      if (fs.existsSync(cookiesPath)) {
        args.unshift('--cookies', cookiesPath);
      } else if (activeBrowser) {
        args.unshift('--cookies-from-browser', activeBrowser);
      }

      let spawnCmd = 'yt-dlp';
      let spawnArgs = args;

      if (process.platform === 'darwin') {
        spawnCmd = 'env';
        spawnArgs = ['DYLD_LIBRARY_PATH=/opt/homebrew/opt/expat/lib', 'yt-dlp', ...args];
      }

      console.log(`Queue: Spawning ${spawnCmd} with arguments: ${spawnArgs.join(' ')}`);
      const child = spawn(spawnCmd, spawnArgs);
      statsService.incrementActive();

      child.stdout.on('data', (data) => {
        const line = data.toString();
        const updatedJob = this.jobs.get(jobId);
        if (!updatedJob) return;

        const progressMatch = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/i);
        const speedMatch = line.match(/at\s+(\d+(?:\.\d+)?\w+\/s)/i);
        const etaMatch = line.match(/ETA\s+(\d+:\d+)/i);

        if (progressMatch) {
          updatedJob.progress = Math.min(99, Math.floor(parseFloat(progressMatch[1])));
        }
        if (speedMatch) {
          updatedJob.speed = speedMatch[1];
        }
        if (etaMatch) {
          updatedJob.eta = etaMatch[1];
        }

        if (line.includes('[ExtractAudio]') || line.includes('[ffmpeg]')) {
          updatedJob.status = 'converting';
          updatedJob.progress = 95;
          updatedJob.speed = 'Dönüştürülüyor...';
          updatedJob.eta = 'Birkaç saniye';
        }

        this.notifySubscribers(jobId, updatedJob);
      });

      child.stderr.on('data', (data) => {
        console.warn(`yt-dlp [stderr]: ${data.toString()}`);
      });

      child.on('close', (code) => {
        statsService.decrementActive();
        const updatedJob = this.jobs.get(jobId);
        if (!updatedJob) return;

        if (code === 0) {
          let ext = updatedJob.format;
          let finalPath = path.join(downloadsDir, `${jobId}.${ext}`);

          if (ext === 'srt' || ext === 'vtt') {
            try {
              const files = fs.readdirSync(downloadsDir);
              const matchingFile = files.find((f) => f.startsWith(jobId));
              if (matchingFile) {
                const detectedExt = path.extname(matchingFile).replace('.', '');
                finalPath = path.join(downloadsDir, `${jobId}.${detectedExt}`);
                fs.renameSync(path.join(downloadsDir, matchingFile), finalPath);
                updatedJob.format = detectedExt as 'mp4' | 'mp3' | 'srt' | 'vtt';
                ext = detectedExt as 'mp4' | 'mp3' | 'srt' | 'vtt';
              }
            } catch (renameErr) {
              console.error('Rename subtitle file failed:', renameErr);
            }
          }

          if (fs.existsSync(finalPath)) {
            updatedJob.status = 'completed';
            updatedJob.progress = 100;
            updatedJob.speed = 'Tamamlandı';
            updatedJob.eta = '0s';
            updatedJob.realDownloadUrl = finalPath;
            updatedJob.downloadUrl = `/api/download/file?id=${jobId}&filename=${encodeURIComponent(updatedJob.title)}&format=${ext}`;
            this.notifySubscribers(jobId, updatedJob);

            setTimeout(
              async () => {
                try {
                  const jobToCheck = this.jobs.get(jobId);
                  if (jobToCheck && !jobToCheck.downloaded) {
                    const downloadsDirToCheck = path.dirname(finalPath);
                    const files = await fs.promises.readdir(downloadsDirToCheck);
                    for (const file of files) {
                      if (file.startsWith(jobId)) {
                        const filePath = path.join(downloadsDirToCheck, file);
                        await fs.promises.unlink(filePath);
                        console.log(`Auto deleted unretrieved download file: ${filePath}`);
                      }
                    }
                    this.jobs.delete(jobId);
                    console.log(`Auto deleted unretrieved job: ${jobId}`);
                    jobToCheck.status = 'failed';
                    jobToCheck.error =
                      'Dosya 2 dakika içinde indirilmediği için otomatik olarak silindi.';
                    this.notifySubscribers(jobId, jobToCheck);
                  }
                } catch (e) {
                  console.error(`Auto cleanup failed for job ${jobId}:`, e);
                }
              },
              2 * 60 * 1000,
            );
          } else {
            console.error(`Downloaded file not found at: ${finalPath}`);
            updatedJob.status = 'failed';
            updatedJob.error = 'İndirilen medya dosyası diskte bulunamadı.';
            this.notifySubscribers(jobId, updatedJob);
          }
        } else {
          console.error(`yt-dlp exited with non-zero code: ${code}`);
          if (currentAttemptIndex < browsers.length - 1) {
            currentAttemptIndex++;
            console.log(`Retrying download with cookies from ${browsers[currentAttemptIndex]}...`);
            runAttempt();
          } else {
            updatedJob.status = 'failed';
            updatedJob.error = 'Video indirilirken sunucu hatası oluştu (yt-dlp).';
            this.notifySubscribers(jobId, updatedJob);
          }
        }
      });
    };

    try {
      runAttempt();
    } catch (err) {
      const errorObj = err as Error;
      console.error(`Queue processing crash for job ${jobId}:`, errorObj);
      job.status = 'failed';
      job.error = errorObj.message || 'İndirme işlemi başlatılırken hata oluştu.';
      this.notifySubscribers(jobId, job);
    }
  }
}

export const queueService = new QueueService();
export default queueService;
