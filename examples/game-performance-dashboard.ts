/**
 * Game Performance Dashboard Example
 *
 * This example demonstrates how to build a real-time GPU monitoring dashboard
 * for WebGPU games. It shows live FPS, GPU utilization, memory usage, and
 * helps identify performance bottlenecks during gameplay.
 *
 * Use Case: "I'm building a WebGPU game and need to optimize performance"
 *
 * Features:
 * - Live FPS counter with frame time analysis
 * - GPU utilization graph with moving average
 * - Memory usage tracking with leak detection
 * - Performance alerts and warnings
 * - Frame pacing visualization
 *
 * SEO Keywords: how to profile GPU in browser, WebGPU performance monitoring,
 * GPU utilization monitoring, game performance optimization, debug GPU bottlenecks
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

interface DashboardMetrics {
  fps: number;
  frameTime: number;
  gpuUtilization: number;
  memoryUsed: number;
  memoryTotal: number;
  computeTime: number;
  timestamp: number;
}

interface PerformanceAlert {
  severity: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: number;
  value: number;
}

class GamePerformanceDashboard {
  private profiler: ReturnType<typeof createGPUProfiler>;
  private metrics: DashboardMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private maxHistorySize = 300; // Keep 5 minutes of history at 1-second intervals
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];

  // Performance thresholds
  private readonly TARGET_FPS = 60;
  private readonly MIN_ACCEPTABLE_FPS = 30;
  private readonly CRITICAL_FPS = 20;
  private readonly HIGH_GPU_UTILIZATION = 90;
  private readonly HIGH_MEMORY_USAGE = 0.9; // 90%

  constructor() {
    this.profiler = createGPUProfiler({
      enableMonitoring: true,
      monitoringInterval: 1000, // Update every second
      enableMemoryTracking: true,
      enableShaderProfiling: true,
      onMetricsUpdate: (metrics) => this.handleMetricsUpdate(metrics),
      onMemoryUpdate: (memory) => this.handleMemoryUpdate(memory),
    });
  }

  /**
   * Initialize the dashboard
   */
  async initialize(): Promise<void> {
    console.log('🎮 Initializing Game Performance Dashboard...');

    try {
      await this.profiler.initialize();

      const deviceInfo = this.profiler.getDeviceInfo();
      console.log('✅ Dashboard initialized');
      console.log(`📊 GPU: ${deviceInfo.vendor} ${deviceInfo.architecture}`);
      console.log(`💾 Memory: ${this.formatBytes(deviceInfo.limits.maxBufferSize)}`);

      this.startMonitoring();
    } catch (error) {
      console.error('❌ Failed to initialize dashboard:', error);
      throw error;
    }
  }

  /**
   * Start monitoring performance
   */
  private startMonitoring(): void {
    this.profiler.start();
    console.log('🚀 Performance monitoring started');
  }

  /**
   * Handle metrics updates from profiler
   */
  private handleMetricsUpdate(metrics: any): void {
    const dashboardMetric: DashboardMetrics = {
      fps: metrics.fps,
      frameTime: metrics.frameTime,
      gpuUtilization: metrics.utilization,
      memoryUsed: metrics.memoryUsed,
      memoryTotal: metrics.memoryTotal,
      computeTime: metrics.computeTime,
      timestamp: metrics.timestamp,
    };

    // Add to history
    this.metrics.push(dashboardMetric);
    if (this.metrics.length > this.maxHistorySize) {
      this.metrics.shift();
    }

    // Check for performance issues
    this.checkPerformanceThresholds(dashboardMetric);

    // Update dashboard display
    this.updateDashboard(dashboardMetric);
  }

  /**
   * Handle memory updates
   */
  private handleMemoryUpdate(memory: any): void {
    // Check for memory leaks
    if (memory.history.length > 10) {
      const recent = memory.history.slice(-10);
      const trend = this.calculateMemoryTrend(recent);

      if (trend > 0.1) {
        // 10% increase over 10 samples
        this.createAlert('warning', 'Potential memory leak detected', memory.totalAllocated);
      }
    }
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(metrics: DashboardMetrics): void {
    // FPS checks
    if (metrics.fps < this.CRITICAL_FPS) {
      this.createAlert('critical', 'Critical FPS drop', metrics.fps);
    } else if (metrics.fps < this.MIN_ACCEPTABLE_FPS) {
      this.createAlert('warning', 'FPS below acceptable threshold', metrics.fps);
    } else if (metrics.fps < this.TARGET_FPS - 10) {
      this.createAlert('info', 'FPS below target', metrics.fps);
    }

    // GPU utilization checks
    if (metrics.gpuUtilization > this.HIGH_GPU_UTILIZATION) {
      this.createAlert('warning', 'High GPU utilization', metrics.gpuUtilization);
    }

    // Memory usage checks
    const memoryPercentage = metrics.memoryUsed / metrics.memoryTotal;
    if (memoryPercentage > this.HIGH_MEMORY_USAGE) {
      this.createAlert('critical', 'High memory usage', memoryPercentage * 100);
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(severity: PerformanceAlert['severity'], message: string, value: number): void {
    const alert: PerformanceAlert = {
      severity,
      message,
      timestamp: Date.now(),
      value,
    };

    this.alerts.push(alert);
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    // Notify callbacks
    this.alertCallbacks.forEach(callback => callback(alert));

    // Log to console
    const emoji = severity === 'critical' ? '🚨' : severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${severity.toUpperCase()}] ${message}: ${value.toFixed(2)}`);
  }

  /**
   * Update dashboard display
   */
  private updateDashboard(metrics: DashboardMetrics): void {
    // This is where you would update your UI
    // For this example, we'll just log a compact status line
    const status = this.getPerformanceStatus(metrics);
    const bar = this.createProgressBar(metrics.gpuUtilization, 100);

    console.log(
      `${status.icon} FPS: ${metrics.fps.toFixed(1)} | ` +
      `Frame: ${metrics.frameTime.toFixed(2)}ms | ` +
      `GPU: ${bar} ${metrics.gpuUtilization.toFixed(0)}% | ` +
      `Memory: ${this.formatBytes(metrics.memoryUsed)} / ${this.formatBytes(metrics.memoryTotal)}`
    );
  }

  /**
   * Get performance status based on current metrics
   */
  private getPerformanceStatus(metrics: DashboardMetrics): { icon: string; status: string } {
    if (metrics.fps >= this.TARGET_FPS - 5) {
      return { icon: '🟢', status: 'Excellent' };
    } else if (metrics.fps >= this.MIN_ACCEPTABLE_FPS) {
      return { icon: '🟡', status: 'Good' };
    } else if (metrics.fps >= this.CRITICAL_FPS) {
      return { icon: '🟠', status: 'Fair' };
    } else {
      return { icon: '🔴', status: 'Poor' };
    }
  }

  /**
   * Calculate memory trend (positive = increasing, negative = decreasing)
   */
  private calculateMemoryTrend(history: any[]): number {
    if (history.length < 2) return 0;

    const first = history[0].totalAllocated;
    const last = history[history.length - 1].totalAllocated;

    return (last - first) / first;
  }

  /**
   * Create a simple text progress bar
   */
  private createProgressBar(value: number, max: number, width = 20): string {
    const filled = Math.round((value / max) * width);
    const empty = width - filled;
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): DashboardMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): DashboardMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get recent alerts
   */
  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): any {
    if (this.metrics.length === 0) {
      return null;
    }

    const fpsValues = this.metrics.map(m => m.fps);
    const frameTimeValues = this.metrics.map(m => m.frameTime);
    const gpuUtilValues = this.metrics.map(m => m.gpuUtilization);

    return {
      fps: {
        avg: this.average(fpsValues),
        min: Math.min(...fpsValues),
        max: Math.max(...fpsValues),
        p95: this.percentile(fpsValues, 95),
        p99: this.percentile(fpsValues, 99),
      },
      frameTime: {
        avg: this.average(frameTimeValues),
        min: Math.min(...frameTimeValues),
        max: Math.max(...frameTimeValues),
        p95: this.percentile(frameTimeValues, 95),
        p99: this.percentile(frameTimeValues, 99),
      },
      gpuUtilization: {
        avg: this.average(gpuUtilValues),
        min: Math.min(...gpuUtilValues),
        max: Math.max(...gpuUtilValues),
      },
    };
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Export dashboard data
   */
  exportData(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      alerts: this.alerts,
      stats: this.getPerformanceStats(),
    }, null, 2);
  }

  /**
   * Stop monitoring and cleanup
   */
  stop(): void {
    this.profiler.stop();
    this.profiler.cleanup();
    console.log('🛑 Performance monitoring stopped');
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

async function runGameDashboardExample() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎮 Game Performance Dashboard Example');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const dashboard = new GamePerformanceDashboard();

  // Subscribe to alerts
  dashboard.onAlert((alert) => {
    // In a real application, you would show these in the UI
    console.log(`🔔 Alert received: ${alert.message}`);
  });

  await dashboard.initialize();

  // Simulate game running for 30 seconds
  console.log('\n🎯 Simulating game gameplay (30 seconds)...\n');

  await sleep(30000);

  // Display final statistics
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Final Performance Statistics');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const stats = dashboard.getPerformanceStats();
  if (stats) {
    console.log('FPS Statistics:');
    console.log(`  Average: ${stats.fps.avg.toFixed(2)} FPS`);
    console.log(`  Min: ${stats.fps.min.toFixed(2)} FPS`);
    console.log(`  Max: ${stats.fps.max.toFixed(2)} FPS`);
    console.log(`  95th Percentile: ${stats.fps.p95.toFixed(2)} FPS`);
    console.log(`  99th Percentile: ${stats.fps.p99.toFixed(2)} FPS`);

    console.log('\nFrame Time Statistics:');
    console.log(`  Average: ${stats.frameTime.avg.toFixed(2)} ms`);
    console.log(`  Min: ${stats.frameTime.min.toFixed(2)} ms`);
    console.log(`  Max: ${stats.frameTime.max.toFixed(2)} ms`);
    console.log(`  95th Percentile: ${stats.frameTime.p95.toFixed(2)} ms`);

    console.log('\nGPU Utilization Statistics:');
    console.log(`  Average: ${stats.gpuUtilization.avg.toFixed(2)}%`);
    console.log(`  Min: ${stats.gpuUtilization.min.toFixed(2)}%`);
    console.log(`  Max: ${stats.gpuUtilization.max.toFixed(2)}%`);
  }

  console.log('\n🚨 Alerts Summary:');
  const alerts = dashboard.getAlerts();
  console.log(`  Total Alerts: ${alerts.length}`);
  console.log(`  Critical: ${dashboard.getAlerts('critical').length}`);
  console.log(`  Warnings: ${dashboard.getAlerts('warning').length}`);
  console.log(`  Info: ${dashboard.getAlerts('info').length}`);

  // Export data
  const exported = dashboard.exportData();
  console.log('\n💾 Dashboard data exported');

  dashboard.stop();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the example if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  runGameDashboardExample().catch(console.error);
}

export { GamePerformanceDashboard, DashboardMetrics, PerformanceAlert };
