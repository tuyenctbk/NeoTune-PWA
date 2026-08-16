/**
 * NeoTune Audio & Stream Diagnostics Logging Service
 * Diagnoses playback latency, buffering underruns/stalls, CORS blocks and silent audio
 */

export type DiagnosticCategory = 'stream' | 'webaudio' | 'network' | 'codec' | 'eq' | 'pwa' | 'audio_context';

export interface DiagnosticLogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  category: DiagnosticCategory;
  message: string;
  latencyMs?: number;
  streamUrl?: string;
  details?: Record<string, any>;
}

export interface StreamHealthMetrics {
  totalSessions: number;
  successfulStreams: number;
  failedStreams: number;
  bufferUnderruns: number;
  lastStartupTimeMs: number;
  avgStartupTimeMs: number;
  startupTimeHistory: number[];
  lastCalculatedAt: number;
}

export interface NetworkHealthResult {
  score: number; // 0 - 100
  grade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  color: string;
  avgStartupTimeMs: number;
  bufferUnderruns: number;
  successRate: number;
  totalSessions: number;
  summary: string;
}

const STORAGE_DIAGNOSTICS_KEY = 'neotune_diagnostics_logs';
const STORAGE_METRICS_KEY = 'neotune_diagnostics_metrics';
const MAX_LOGS = 60;
const MAX_HISTORY = 20;

class DiagnosticsService {
  private logs: DiagnosticLogEntry[] = [];
  private metrics: StreamHealthMetrics = {
    totalSessions: 0,
    successfulStreams: 0,
    failedStreams: 0,
    bufferUnderruns: 0,
    lastStartupTimeMs: 0,
    avgStartupTimeMs: 0,
    startupTimeHistory: [],
    lastCalculatedAt: Date.now()
  };
  private listeners: Array<(logs: DiagnosticLogEntry[]) => void> = [];
  private metricsListeners: Array<(metrics: StreamHealthMetrics) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedLogs = localStorage.getItem(STORAGE_DIAGNOSTICS_KEY);
        if (savedLogs) {
          this.logs = JSON.parse(savedLogs);
        }
        const savedMetrics = localStorage.getItem(STORAGE_METRICS_KEY);
        if (savedMetrics) {
          this.metrics = { ...this.metrics, ...JSON.parse(savedMetrics) };
        }
      } catch {}
    }
  }

  public log(
    level: DiagnosticLogEntry['level'],
    category: DiagnosticLogEntry['category'],
    message: string,
    latencyMs?: number,
    streamUrl?: string,
    details?: Record<string, any>
  ): void {
    const entry: DiagnosticLogEntry = {
      id: `diag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      latencyMs,
      streamUrl,
      details
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.saveLogs();
    this.listeners.forEach(fn => fn(this.logs));
  }

  /**
   * Record a stream initiation session
   */
  public recordStreamStart(): void {
    this.metrics.totalSessions += 1;
    this.saveMetrics();
  }

  /**
   * Record stream startup time / Time to First Audio (TTFA)
   */
  public recordStartupSuccess(startupTimeMs: number, stationName?: string, streamUrl?: string): void {
    this.metrics.successfulStreams += 1;
    this.metrics.lastStartupTimeMs = startupTimeMs;
    this.metrics.startupTimeHistory.push(startupTimeMs);
    if (this.metrics.startupTimeHistory.length > MAX_HISTORY) {
      this.metrics.startupTimeHistory.shift();
    }

    const sum = this.metrics.startupTimeHistory.reduce((acc, v) => acc + v, 0);
    this.metrics.avgStartupTimeMs = Math.round(sum / this.metrics.startupTimeHistory.length);
    this.metrics.lastCalculatedAt = Date.now();

    this.saveMetrics();
    this.log(
      'success',
      'stream',
      `Stream playback established in ${startupTimeMs}ms (${stationName || 'Radio Station'})`,
      startupTimeMs,
      streamUrl
    );
  }

  /**
   * Record a buffer underrun / waiting event
   */
  public recordBufferUnderrun(streamUrl?: string): void {
    this.metrics.bufferUnderruns += 1;
    this.metrics.lastCalculatedAt = Date.now();
    this.saveMetrics();
    this.log('warn', 'network', 'Buffer underrun detected (audio pipeline stall)', undefined, streamUrl);
  }

  /**
   * Record a stream error / drop
   */
  public recordStreamFailure(errorMsg: string, streamUrl?: string): void {
    this.metrics.failedStreams += 1;
    this.metrics.lastCalculatedAt = Date.now();
    this.saveMetrics();
    this.log('error', 'stream', `Stream connection error: ${errorMsg}`, undefined, streamUrl);
  }

  /**
   * Compute comprehensive Network Health score (0-100)
   */
  public getNetworkHealth(): NetworkHealthResult {
    const { totalSessions, successfulStreams, bufferUnderruns, avgStartupTimeMs } = this.metrics;

    if (totalSessions === 0 && successfulStreams === 0) {
      return {
        score: 100,
        grade: 'Excellent',
        color: '#10b981',
        avgStartupTimeMs: 0,
        bufferUnderruns: 0,
        successRate: 100,
        totalSessions: 0,
        summary: 'Awaiting first stream telemetry measurement'
      };
    }

    // Success rate component (40 points max)
    const successRate = totalSessions > 0 ? (successfulStreams / totalSessions) * 100 : 100;
    const successScore = (Math.min(100, successRate) / 100) * 40;

    // Latency / Startup time component (35 points max)
    // < 800ms = 35 pts, 800-1800ms = 30 pts, 1800-3000ms = 22 pts, >3000ms = 10 pts
    let latencyScore = 35;
    if (avgStartupTimeMs > 3500) {
      latencyScore = 12;
    } else if (avgStartupTimeMs > 2200) {
      latencyScore = 22;
    } else if (avgStartupTimeMs > 1200) {
      latencyScore = 29;
    }

    // Buffer underrun penalty (25 points max)
    // 0 underruns per 5 sessions = 25 pts, drops by 4 pts per underrun
    const underrunScore = Math.max(0, 25 - bufferUnderruns * 3.5);

    const totalScore = Math.min(100, Math.max(10, Math.round(successScore + latencyScore + underrunScore)));

    let grade: NetworkHealthResult['grade'] = 'Excellent';
    let color = '#10b981';
    let summary = 'Ultra-low latency connection with zero stutter';

    if (totalScore < 60) {
      grade = 'Poor';
      color = '#f43f5e';
      summary = 'High latency or frequent buffer stalls detected';
    } else if (totalScore < 80) {
      grade = 'Fair';
      color = '#f59e0b';
      summary = 'Moderate streaming latency or occasional packet delays';
    } else if (totalScore < 92) {
      grade = 'Good';
      color = '#06b6d4';
      summary = 'Stable audio stream with responsive connection';
    }

    return {
      score: totalScore,
      grade,
      color,
      avgStartupTimeMs,
      bufferUnderruns,
      successRate: Math.round(successRate),
      totalSessions,
      summary
    };
  }

  public getMetrics(): StreamHealthMetrics {
    return { ...this.metrics };
  }

  public getLogs(): DiagnosticLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.metrics = {
      totalSessions: 0,
      successfulStreams: 0,
      failedStreams: 0,
      bufferUnderruns: 0,
      lastStartupTimeMs: 0,
      avgStartupTimeMs: 0,
      startupTimeHistory: [],
      lastCalculatedAt: Date.now()
    };

    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_DIAGNOSTICS_KEY);
      localStorage.removeItem(STORAGE_METRICS_KEY);
    }
    this.listeners.forEach(fn => fn([]));
    this.metricsListeners.forEach(fn => fn(this.metrics));
  }

  public subscribe(callback: (logs: DiagnosticLogEntry[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  public subscribeMetrics(callback: (metrics: StreamHealthMetrics) => void): () => void {
    this.metricsListeners.push(callback);
    return () => {
      this.metricsListeners = this.metricsListeners.filter(cb => cb !== callback);
    };
  }

  private saveLogs(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_DIAGNOSTICS_KEY, JSON.stringify(this.logs));
      } catch {}
    }
  }

  private saveMetrics(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_METRICS_KEY, JSON.stringify(this.metrics));
      } catch {}
    }
    this.metricsListeners.forEach(fn => fn(this.metrics));
  }

  public generateReport(): string {
    const time = new Date().toISOString();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const health = this.getNetworkHealth();

    let text = `=== NeoTune Audio Stream Diagnostics Report ===\n`;
    text += `Generated: ${time}\n`;
    text += `User Agent: ${ua}\n`;
    text += `Online: ${isOnline ? 'YES' : 'NO'}\n`;
    text += `Network Health Score: ${health.score}% (${health.grade})\n`;
    text += `Avg Start-up Time: ${health.avgStartupTimeMs}ms\n`;
    text += `Buffer Underruns: ${health.bufferUnderruns}\n`;
    text += `Stream Success Rate: ${health.successRate}%\n`;
    text += `Total Log Entries: ${this.logs.length}\n\n`;

    text += `--- RECENT STREAM & PLAYBACK EVENTS ---\n`;
    this.logs.slice(0, 25).forEach((l) => {
      const date = new Date(l.timestamp).toLocaleTimeString();
      const lat = l.latencyMs !== undefined ? ` [Latency: ${l.latencyMs}ms]` : '';
      text += `[${date}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}${lat}\n`;
      if (l.streamUrl) text += `  URL: ${l.streamUrl}\n`;
      if (l.details) text += `  Details: ${JSON.stringify(l.details)}\n`;
    });

    return text;
  }
}

export const diagnosticsService = new DiagnosticsService();
