export type SupportedPlatform = 'youtube' | 'tiktok' | 'instagram' | 'twitter';

export interface PlatformConfig {
  name: string;
  icon: string;
  color: string;
  regex: RegExp;
}

export const PLATFORMS: Record<SupportedPlatform, PlatformConfig> = {
  youtube: {
    name: 'YouTube',
    icon: 'Youtube',
    color: 'from-red-500 to-rose-600',
    regex:
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i,
  },
  tiktok: {
    name: 'TikTok',
    icon: 'Tiktok',
    color: 'from-zinc-900 to-black',
    regex: /(?:tiktok\.com\/)(?:@[\w.-]+\/video\/(\d+)|t\/([a-zA-Z0-9]+))/i,
  },
  instagram: {
    name: 'Instagram',
    icon: 'Instagram',
    color: 'from-pink-500 via-purple-500 to-orange-500',
    regex: /(?:instagram\.com\/)(?:p|reels?|tv|stories\/[\w.-]+)\/([a-zA-Z0-9_-]+)/i,
  },
  twitter: {
    name: 'X (Twitter)',
    icon: 'Twitter',
    color: 'from-zinc-800 to-zinc-900',
    regex: /(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status\/(\d+)/i,
  },
};

export function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function detectPlatform(url: string): SupportedPlatform | null {
  if (!isValidUrl(url)) return null;

  for (const [platform, config] of Object.entries(PLATFORMS)) {
    if (config.regex.test(url)) {
      return platform as SupportedPlatform;
    }
  }

  return null;
}

export function getCleanUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);

    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
      'ref',
      's',
      't',
      'igsh',
    ];

    trackingParams.forEach((param) => url.searchParams.delete(param));

    if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
      if (
        url.pathname.includes('/watch') ||
        url.pathname.includes('/v/') ||
        url.pathname.includes('/embed/')
      ) {
        url.searchParams.delete('list');
        url.searchParams.delete('index');
      }
    }

    if (url.hostname.includes('twitter.com') || url.hostname.includes('x.com')) {
      url.search = '';
    }

    if (url.hostname.includes('instagram.com')) {
      url.search = '';
    }

    if (url.hostname.includes('tiktok.com')) {
      url.search = '';
    }

    return url.toString();
  } catch {
    return urlStr;
  }
}
