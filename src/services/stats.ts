const globalForStats = globalThis as unknown as {
  statsServiceInstance: StatsService | undefined;
};

class StatsService {
  private totalDownloads = 0;
  private activeDownloads = 0;
  private uniqueIPs = new Set<string>();

  incrementDownloads() {
    this.totalDownloads += 1;
  }

  incrementActive() {
    this.activeDownloads += 1;
  }

  decrementActive() {
    this.activeDownloads = Math.max(0, this.activeDownloads - 1);
  }

  recordIP(ip: string) {
    if (ip) {
      this.uniqueIPs.add(ip);
    }
  }

  getStats() {
    return {
      activeDownloads: this.activeDownloads,
      totalDownloads: this.totalDownloads,
      liveVisitors: this.uniqueIPs.size,
    };
  }
}

export const statsService = globalForStats.statsServiceInstance ?? new StatsService();

if (process.env.NODE_ENV !== 'production') {
  globalForStats.statsServiceInstance = statsService;
}

export default statsService;
