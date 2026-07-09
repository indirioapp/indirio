import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'downloads', 'stats_persistence.json');

const globalForStats = globalThis as unknown as {
  statsServiceInstance: StatsService | undefined;
};

class StatsService {
  private totalDownloads = 0;
  private activeDownloads = 0;
  private visitorIPs = new Map<string, number>();

  constructor() {
    this.loadStats();
  }

  private loadStats() {
    try {
      if (fs.existsSync(STATS_FILE)) {
        const rawData = fs.readFileSync(STATS_FILE, 'utf8');
        const data = JSON.parse(rawData);
        if (typeof data.totalDownloads === 'number') {
          this.totalDownloads = data.totalDownloads;
        }
      }
    } catch (err) {
      console.error('Failed to load stats persistence:', err);
    }
  }

  private saveStats() {
    try {
      const dir = path.dirname(STATS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STATS_FILE, JSON.stringify({ totalDownloads: this.totalDownloads }), 'utf8');
    } catch (err) {
      console.error('Failed to save stats persistence:', err);
    }
  }

  incrementDownloads() {
    this.loadStats();
    this.totalDownloads += 1;
    this.saveStats();
  }

  incrementActive() {
    this.activeDownloads += 1;
  }

  decrementActive() {
    this.activeDownloads = Math.max(0, this.activeDownloads - 1);
  }

  recordIP(ip: string) {
    if (ip) {
      this.visitorIPs.set(ip, Date.now());
    }
  }

  getStats() {
    const now = Date.now();
    const threeMinutesAgo = now - 3 * 60 * 1000;
    
    for (const [ip, lastSeen] of this.visitorIPs.entries()) {
      if (lastSeen < threeMinutesAgo) {
        this.visitorIPs.delete(ip);
      }
    }

    this.loadStats();

    return {
      activeDownloads: this.activeDownloads,
      totalDownloads: this.totalDownloads,
      liveVisitors: Math.max(1, this.visitorIPs.size),
    };
  }
}

export const statsService = globalForStats.statsServiceInstance ?? new StatsService();

if (process.env.NODE_ENV !== 'production') {
  globalForStats.statsServiceInstance = statsService;
}

export default statsService;
