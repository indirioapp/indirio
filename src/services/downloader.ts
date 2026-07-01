import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { SupportedPlatform, PLATFORMS } from './platform';

const execPromise = promisify(exec);

export interface PlaylistEntry {
  id: string;
  title: string;
  duration: number;
  durationString: string;
  thumbnail: string;
  url: string;
}

export interface SubtitleTrack {
  lang: string;
  name: string;
  isAuto: boolean;
}

export interface VideoMetadata {
  url: string;
  platform: SupportedPlatform;
  platformName: string;
  videoId: string;
  title: string;
  thumbnail: string;
  duration: number;
  durationString: string;
  formats: DownloadFormat[];
  videoUrl?: string | null;
  cookiesBrowser?: string | null;
  isPlaylist?: boolean;
  entries?: PlaylistEntry[];
  subtitles?: SubtitleTrack[];
}

export interface DownloadFormat {
  id: string;
  quality: string;
  format: 'mp4' | 'mp3';
  sizeMb: number;
  label: string;
}

const FALLBACK_THUMBNAILS: Record<SupportedPlatform, string> = {
  youtube:
    'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
  tiktok:
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  instagram:
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&auto=format&fit=crop&q=80',
  twitter:
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
};

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseISODuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 120;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

export class DownloaderService {
  async extractPlaylistMetadata(url: string): Promise<VideoMetadata> {
    const parsedUrl = new URL(url);
    const listId = parsedUrl.searchParams.get('list') || 'unknown';
    let title = `YouTube Oynatma Listesi (${listId})`;
    let thumbnail = FALLBACK_THUMBNAILS.youtube;
    let entries: PlaylistEntry[] = [];
    let successFlag = false;
    let cookiesBrowser: string | null = null;

    try {
      let cmd = `yt-dlp --flat-playlist --dump-single-json "${url}"`;
      const cookiesPath = path.join(process.cwd(), 'instagram-cookies.txt');
      if (fs.existsSync(cookiesPath)) {
        cmd = `yt-dlp --cookies "${cookiesPath}" --flat-playlist --dump-single-json "${url}"`;
      }
      if (process.platform === 'darwin') {
        cmd = `env DYLD_LIBRARY_PATH="/opt/homebrew/opt/expat/lib" ${cmd}`;
      }
      let stdoutResult = '';
      try {
        const { stdout } = await execPromise(cmd, { timeout: 15000 });
        stdoutResult = stdout;
      } catch (playlistErr) {
        const browsers = ['chrome', 'safari', 'firefox'];
        let success = false;
        for (const browser of browsers) {
          try {
            let cmdWithCookies = `yt-dlp --cookies-from-browser ${browser} --flat-playlist --dump-single-json "${url}"`;
            if (process.platform === 'darwin') {
              cmdWithCookies = `env DYLD_LIBRARY_PATH="/opt/homebrew/opt/expat/lib" ${cmdWithCookies}`;
            }
            const { stdout } = await execPromise(cmdWithCookies, { timeout: 15000 });
            stdoutResult = stdout;
            cookiesBrowser = browser;
            success = true;
            break;
          } catch (cookieErr) {
            console.warn(cookieErr);
          }
        }
        if (!success) {
          throw playlistErr;
        }
      }

      const data = JSON.parse(stdoutResult);
      if (data) {
        if (data.title) title = data.title;
        if (data.entries && Array.isArray(data.entries)) {
          entries = (
            data.entries as {
              id?: string;
              url?: string;
              title?: string;
              duration?: number | string;
            }[]
          ).map((entry) => {
            const id = entry.id || entry.url || 'unknown';
            const dur = entry.duration
              ? typeof entry.duration === 'number'
                ? entry.duration
                : parseInt(entry.duration, 10)
              : 120;
            return {
              id,
              title: entry.title || 'Unknown Video',
              duration: dur,
              durationString: formatDuration(dur),
              thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${id}`,
            };
          });
          successFlag = true;
        }
      }
    } catch (err) {
      console.warn('yt-dlp playlist dump failed, falling back to scraper:', err);
    }

    if (!successFlag) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const html = await res.text();
          const match = html.match(/var ytInitialData\s*=\s*({.+?});/);
          let rawData;
          if (match) {
            rawData = JSON.parse(match[1]);
          } else {
            const altMatch = html.match(/window\["ytInitialData"\]\s*=\s*({.+?});/);
            if (altMatch) {
              rawData = JSON.parse(altMatch[1]);
            }
          }

          if (rawData) {
            title =
              rawData.metadata?.playlistMetadataRenderer?.title ||
              rawData.header?.playlistHeaderRenderer?.title?.simpleText ||
              title;
            let playlistVideoList = null;
            try {
              const tabs = rawData.contents.twoColumnBrowseResultsRenderer.tabs;
              const tabContent = tabs[0].tabRenderer.content;
              const sectionContents = tabContent.sectionListRenderer.contents;
              const itemSectionContent = sectionContents[0].itemSectionRenderer.contents;
              playlistVideoList = itemSectionContent[0].playlistVideoListRenderer.contents;
            } catch {
              try {
                playlistVideoList =
                  rawData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
                    .sectionListRenderer.contents[0].itemSectionRenderer.contents[0]
                    .playlistVideoListRenderer.contents;
              } catch {
                playlistVideoList = null;
              }
            }

            if (playlistVideoList && Array.isArray(playlistVideoList)) {
              entries = (
                playlistVideoList as {
                  playlistVideoRenderer?: {
                    videoId: string;
                    title?: { runs?: { text: string }[] };
                    lengthText?: { simpleText: string };
                  };
                }[]
              )
                .map((item) => {
                  const entry = item.playlistVideoRenderer;
                  if (!entry) return null;
                  const id = entry.videoId;
                  const durText = entry.lengthText?.simpleText || '0:00';
                  const parts = durText.split(':').map(Number);
                  let dur = 0;
                  if (parts.length === 3) {
                    dur = parts[0] * 3600 + parts[1] * 60 + parts[2];
                  } else if (parts.length === 2) {
                    dur = parts[0] * 60 + parts[1];
                  }
                  return {
                    id,
                    title: entry.title?.runs?.[0]?.text || 'Unknown Video',
                    duration: dur,
                    durationString: durText,
                    thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
                    url: `https://www.youtube.com/watch?v=${id}`,
                  };
                })
                .filter(Boolean) as PlaylistEntry[];
              successFlag = true;
            }
          }
        }
      } catch (err) {
        console.error('Playlist scraping fallback also failed:', err);
      }
    }

    if (entries.length > 0 && entries[0].thumbnail) {
      thumbnail = entries[0].thumbnail;
    }

    return {
      url,
      platform: 'youtube',
      platformName: 'YouTube',
      videoId: listId,
      title,
      thumbnail,
      duration: entries.reduce((acc, curr) => acc + curr.duration, 0),
      durationString: formatDuration(entries.reduce((acc, curr) => acc + curr.duration, 0)),
      formats: [],
      isPlaylist: true,
      entries,
      cookiesBrowser,
    };
  }

  async extractMetadata(url: string, platform: SupportedPlatform): Promise<VideoMetadata> {
    if (platform === 'youtube' && (url.includes('/playlist') || url.includes('list='))) {
      return this.extractPlaylistMetadata(url);
    }

    const config = PLATFORMS[platform];
    const match = url.match(config.regex);
    const videoId = match
      ? match[1] || match[2] || 'unknown'
      : Math.random().toString(36).substring(7);

    let title = `${config.name} İçeriği (${videoId})`;
    let thumbnail = FALLBACK_THUMBNAILS[platform];
    let duration = 120;
    let hasRealMeta = false;
    let videoUrl: string | null = null;
    const subtitles: SubtitleTrack[] = [];

    let cookiesBrowser: string | null = null;
    try {
      const escapedUrl = url.replace(/"/g, '\\"');
      const targetUrl = platform === 'twitter' ? url.replace('x.com', 'twitter.com') : escapedUrl;

      let cmd = `yt-dlp --dump-json "${targetUrl}"`;
      const cookiesPath = path.join(process.cwd(), 'instagram-cookies.txt');
      if (fs.existsSync(cookiesPath)) {
        cmd = `yt-dlp --cookies "${cookiesPath}" --dump-json "${targetUrl}"`;
      }

      if (process.platform === 'darwin') {
        cmd = `env DYLD_LIBRARY_PATH="/opt/homebrew/opt/expat/lib" ${cmd}`;
      }

      let stdoutResult = '';
      try {
        const { stdout } = await execPromise(cmd, { timeout: 9000 });
        stdoutResult = stdout;
      } catch (guestErr) {
        const browsers = ['chrome', 'safari', 'firefox'];
        let success = false;
        for (const browser of browsers) {
          try {
            let cmdWithCookies = `yt-dlp --cookies-from-browser ${browser} --dump-json "${targetUrl}"`;
            if (process.platform === 'darwin') {
              cmdWithCookies = `env DYLD_LIBRARY_PATH="/opt/homebrew/opt/expat/lib" ${cmdWithCookies}`;
            }
            const { stdout } = await execPromise(cmdWithCookies, { timeout: 9000 });
            stdoutResult = stdout;
            cookiesBrowser = browser;
            success = true;
            break;
          } catch (cookieErr) {
            console.warn(cookieErr);
          }
        }
        if (!success) {
          throw guestErr;
        }
      }

      const ytdlData = JSON.parse(stdoutResult);

      if (ytdlData) {
        if (ytdlData.title) title = ytdlData.title;
        if (ytdlData.duration) duration = parseInt(ytdlData.duration, 10);

        if (ytdlData.thumbnail) {
          thumbnail = ytdlData.thumbnail;
        } else if (ytdlData.thumbnails && ytdlData.thumbnails.length > 0) {
          thumbnail = ytdlData.thumbnails[ytdlData.thumbnails.length - 1].url || thumbnail;
        }

        if (platform === 'instagram' && ytdlData.url) {
          videoUrl = ytdlData.url;
        }

        if (ytdlData.subtitles) {
          for (const [lang, formats] of Object.entries(ytdlData.subtitles)) {
            if (Array.isArray(formats) && formats.length > 0) {
              subtitles.push({
                lang,
                name: (formats[0] as { name?: string }).name || lang,
                isAuto: false,
              });
            }
          }
        }
        if (ytdlData.automatic_captions) {
          for (const [lang, formats] of Object.entries(ytdlData.automatic_captions)) {
            if (
              Array.isArray(formats) &&
              formats.length > 0 &&
              !subtitles.some((s) => s.lang === lang)
            ) {
              subtitles.push({
                lang,
                name: `${(formats[0] as { name?: string }).name || lang} (Otomatik)`,
                isAuto: true,
              });
            }
          }
        }

        hasRealMeta = true;
      }
    } catch (err) {
      console.warn('yt-dlp metadata dump failed, falling back to HTTP scraper:', err);
    }

    if (!hasRealMeta) {
      if (platform === 'youtube' || platform === 'tiktok' || platform === 'twitter') {
        try {
          let oembedUrl = '';
          if (platform === 'youtube') {
            oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
          } else if (platform === 'tiktok') {
            oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
          } else if (platform === 'twitter') {
            const twitterUrl = url.replace('x.com', 'twitter.com');
            oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(twitterUrl)}`;
          }

          const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) });
          if (res.ok) {
            const data = await res.json();

            if (platform === 'twitter' && data.html) {
              const tweetTextMatch = data.html.match(/<p[^>]*>([\s\S]*?)<\/p>/);
              if (tweetTextMatch && tweetTextMatch[1]) {
                title = tweetTextMatch[1].replace(/<[^>]*>/g, '').trim();
              } else if (data.author_name) {
                title = `${data.author_name} (@${data.author_name}) on X`;
              }
            } else {
              if (data.title) title = data.title;
            }

            if (data.thumbnail_url) {
              thumbnail = data.thumbnail_url;
            }
          }
        } catch (err) {
          console.warn(`oEmbed fetch failed for ${platform}:`, err);
        }
      } else {
        try {
          let scrapeUrl = url;
          if (platform === 'instagram') {
            scrapeUrl = `https://www.instagram.com/p/${videoId}/embed/captioned/`;
          }

          const res = await fetch(scrapeUrl, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            signal: AbortSignal.timeout(4000),
          });

          if (res.ok) {
            const html = await res.text();

            if (platform === 'instagram') {
              const captionMatch =
                html.match(/<div[^>]*class=["']CaptionText["'][^>]*>([\s\S]*?)<\/div>/i) ||
                html.match(/<span[^>]*class=["']CaptionText["'][^>]*>([\s\S]*?)<\/span>/i) ||
                html.match(/<div[^>]*class=["']Caption["'][^>]*>([\s\S]*?)<\/div>/i);

              if (captionMatch && captionMatch[1]) {
                title = captionMatch[1].replace(/<[^>]*>/g, '').trim();
              } else {
                const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
                if (titleTagMatch && titleTagMatch[1]) {
                  title = titleTagMatch[1].trim();
                }
              }

              const imageMatch =
                html.match(/<img[^>]*class=["']EmbeddedMediaImage["'][^>]*src=["']([^"']+)["']/i) ||
                html.match(/src=["']([^"']+)["'][^>]*class=["']EmbeddedMediaImage["']/i) ||
                html.match(/<img[^>]*class=["']EmbeddedMedia["'][^>]*src=["']([^"']+)["']/i);

              if (imageMatch && imageMatch[1]) {
                thumbnail = imageMatch[1];
              }

              const videoMatch =
                html.match(/"video_url"\s*:\s*["']([^"']+)["']/i) ||
                html.match(/<video[^>]*src=["']([^"']+)["']/i) ||
                html.match(/"video_url"\s*:\s*["'](https:\/\/scontent[^"']+)["']/i);

              if (videoMatch && videoMatch[1]) {
                videoUrl = videoMatch[1]
                  .replace(/\\u0026/g, '&')
                  .replace(/\\u002f/g, '/')
                  .replaceAll('\\/', '/');
                console.log(
                  `Instagram Scraper: Successfully extracted direct video CDN link for post ${videoId}`,
                );
              }
            } else {
              const ogTitleMatch =
                html.match(
                  /<meta[^>]*(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i,
                ) ||
                html.match(
                  /<meta\s+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:title["']/i,
                );

              const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);

              if (ogTitleMatch && ogTitleMatch[1]) {
                title = ogTitleMatch[1];
              } else if (titleTagMatch && titleTagMatch[1]) {
                title = titleTagMatch[1].trim();
              }

              const ogImageMatch =
                html.match(
                  /<meta[^>]*(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i,
                ) ||
                html.match(
                  /<meta\s+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i,
                );

              if (ogImageMatch && ogImageMatch[1]) {
                thumbnail = ogImageMatch[1];
              }
            }
          }
        } catch (err) {
          console.warn(`Scraping failed for ${platform}:`, err);
        }
      }

      if (platform === 'youtube') {
        try {
          const ytRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            },
            signal: AbortSignal.timeout(3000),
          });
          if (ytRes.ok) {
            const html = await ytRes.text();
            const durationMatch = html.match(
              /<meta\s+itemprop=["']duration["']\s+content=["']([^"']+)["']/i,
            );
            if (durationMatch && durationMatch[1]) {
              duration = parseISODuration(durationMatch[1]);
            }
          }
        } catch (err) {
          console.warn('Scraping YouTube duration failed:', err);
        }
      } else if (platform === 'tiktok') duration = 45;
      else if (platform === 'instagram') duration = 58;
      else if (platform === 'twitter') duration = 72;
    }

    title = title
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    if (title.endsWith(' | Instagram')) title = title.substring(0, title.length - 12);
    if (title.endsWith(' - Instagram')) title = title.substring(0, title.length - 12);
    if (title.startsWith('Instagram post by ')) title = title.substring(18);

    const formats: DownloadFormat[] = [
      {
        id: '1080p',
        quality: '1080p',
        format: 'mp4',
        sizeMb: parseFloat((duration * 0.15).toFixed(1)),
        label: 'Full HD (1080p)',
      },
      {
        id: '720p',
        quality: '720p',
        format: 'mp4',
        sizeMb: parseFloat((duration * 0.08).toFixed(1)),
        label: 'HD (720p)',
      },
      {
        id: '360p',
        quality: '360p',
        format: 'mp4',
        sizeMb: parseFloat((duration * 0.03).toFixed(1)),
        label: 'SD (360p)',
      },
      {
        id: 'mp3_hq',
        quality: 'audio high quality',
        format: 'mp3',
        sizeMb: parseFloat((duration * 0.015).toFixed(1)),
        label: 'Audio High Quality (320kbps)',
      },
    ];

    formats.forEach((f) => {
      if (f.sizeMb <= 0) f.sizeMb = f.format === 'mp3' ? 1.4 : 3.2;
    });

    return {
      url,
      platform,
      platformName: config.name,
      videoId,
      title,
      thumbnail,
      duration,
      durationString: formatDuration(duration),
      formats,
      videoUrl,
      cookiesBrowser,
      subtitles,
    };
  }
}

export const downloaderService = new DownloaderService();
export default downloaderService;
