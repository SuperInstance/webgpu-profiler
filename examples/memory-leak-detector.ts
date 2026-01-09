/**
 * GPU Memory Leak Detector Example
 *
 * This example demonstrates how to detect GPU memory leaks in real-time:
 * - Track buffer and texture allocations
 * - Detect memory growth patterns
 * - Alert on potential leaks
 * - Identify leak sources
 *
 * Use Case: "Find memory leaks before they crash production"
 *
 * Keywords: GPU memory leak, memory leak detection, GPU memory tracking, buffer leak, texture leak, WebGPU memory
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

interface MemorySnapshot {
  timestamp: number;
  bufferMemory: number;
  textureMemory: number;
  totalMemory: number;
  bufferCount: number;
  textureCount: number;
}

interface LeakAlert {
  type: 'buffer' | 'texture' | 'total';
  severity: 'warning' | 'critical';
  message: string;
  growthRate: number; // MB per minute
  snapshots: MemorySnapshot[];
}

class GPUMemoryLeakDetector {
  private profiler: ReturnType<typeof createGPUProfiler>;
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots: number = 100; // Keep last 100 snapshots
  private checkInterval: number = 5000; // Check every 5 seconds
  private intervalId: number | null = null;
  private alerts: LeakAlert[] = [];

  // Thresholds for leak detection
  private thresholds = {
    warningGrowthRate: 10, // 10 MB per minute
    criticalGrowthRate: 50, // 50 MB per minute
    minSnapshots: 6, // Need at least 6 snapshots (30 seconds of data)
  };

  constructor() {
    this.profiler = createGPUProfiler({
      enableMonitoring: true,
      monitoringInterval: 1000,
      enableMemoryTracking: true,
    });
  }

  async initialize() {
    await this.profiler.initialize();
    this.profiler.start();
    console.log('✅ Memory Leak Detector initialized\n');
  }

  startMonitoring() {
    console.log('🔍 Starting memory leak monitoring...');
    console.log(`   Check interval: ${this.checkInterval / 1000}s`);
    console.log(`   Warning threshold: ${this.thresholds.warningGrowthRate} MB/min`);
    console.log(`   Critical threshold: ${this.thresholds.criticalGrowthRate} MB/min\n`);

    this.intervalId = window.setInterval(() => {
      this.captureSnapshot();
      this.analyzeMemoryTrends();
    }, this.checkInterval);
  }

  stopMonitoring() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️  Stopped monitoring');
    }
  }

  private captureSnapshot() {
    const metrics = this.profiler.getMemoryMetrics();

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      bufferMemory: metrics.bufferMemory,
      textureMemory: metrics.textureMemory,
      totalMemory: metrics.totalAllocated,
      bufferCount: metrics.bufferCount,
      textureCount: metrics.textureCount,
    };

    this.snapshots.push(snapshot);

    // Keep only the last N snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // Log current state
    console.log(`📊 [${new Date().toLocaleTimeString()}] Memory Snapshot:`);
    console.log(`   Buffers: ${snapshot.bufferCount} (${(snapshot.bufferMemory / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   Textures: ${snapshot.textureCount} (${(snapshot.textureMemory / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`   Total: ${(snapshot.totalMemory / 1024 / 1024).toFixed(2)} MB`);
  }

  private analyzeMemoryTrends() {
    if (this.snapshots.length < this.thresholds.minSnapshots) {
      return; // Need more data
    }

    // Analyze trends over the last minute
    const recentSnapshots = this.snapshots.slice(-this.thresholds.minSnapshots);
    const timeSpan = (recentSnapshots[recentSnapshots.length - 1].timestamp - recentSnapshots[0].timestamp) / 1000 / 60; // minutes

    // Calculate growth rates
    const bufferGrowth = (recentSnapshots[recentSnapshots.length - 1].bufferMemory - recentSnapshots[0].bufferMemory) / 1024 / 1024 / timeSpan;
    const textureGrowth = (recentSnapshots[recentSnapshots.length - 1].textureMemory - recentSnapshots[0].textureMemory) / 1024 / 1024 / timeSpan;
    const totalGrowth = (recentSnapshots[recentSnapshots.length - 1].totalMemory - recentSnapshots[0].totalMemory) / 1024 / 1024 / timeSpan;

    // Check for leaks
    this.checkForLeak('buffer', bufferGrowth, recentSnapshots);
    this.checkForLeak('texture', textureGrowth, recentSnapshots);
    this.checkForLeak('total', totalGrowth, recentSnapshots);
  }

  private checkForLeak(type: 'buffer' | 'texture' | 'total', growthRate: number, snapshots: MemorySnapshot[]) {
    const memoryType = type === 'buffer' ? 'Buffer' : type === 'texture' ? 'Texture' : 'Total';

    if (growthRate > this.thresholds.criticalGrowthRate) {
      const alert: LeakAlert = {
        type,
        severity: 'critical',
        message: `🚨 CRITICAL: ${memoryType} memory growing at ${growthRate.toFixed(2)} MB/min - Likely memory leak!`,
        growthRate,
        snapshots: [...snapshots],
      };

      this.alerts.push(alert);
      console.error(alert.message);

      // Show leak details
      this.showLeakDetails(alert);

    } else if (growthRate > this.thresholds.warningGrowthRate) {
      const alert: LeakAlert = {
        type,
        severity: 'warning',
        message: `⚠️  WARNING: ${memoryType} memory growing at ${growthRate.toFixed(2)} MB/min - Monitor closely`,
        growthRate,
        snapshots: [...snapshots],
      };

      this.alerts.push(alert);
      console.warn(alert.message);
    }
  }

  private showLeakDetails(alert: LeakAlert) {
    console.error(`\n${'='.repeat(60)}`);
    console.error(`🔍 MEMORY LEAK DETECTED - ${alert.severity.toUpperCase()}`);
    console.error(`${'='.repeat(60)}\n`);

    const firstSnapshot = alert.snapshots[0];
    const lastSnapshot = alert.snapshots[alert.snapshots.length - 1];

    console.error(`Memory Type: ${alert.type.toUpperCase()}`);
    console.error(`Growth Rate: ${alert.growthRate.toFixed(2)} MB/min`);

    if (alert.type === 'buffer') {
      const bufferIncrease = lastSnapshot.bufferCount - firstSnapshot.bufferCount;
      console.error(`Buffer Count: ${firstSnapshot.bufferCount} → ${lastSnapshot.bufferCount} (+${bufferIncrease})`);
    } else if (alert.type === 'texture') {
      const textureIncrease = lastSnapshot.textureCount - firstSnapshot.textureCount;
      console.error(`Texture Count: ${firstSnapshot.textureCount} → ${lastSnapshot.textureCount} (+${textureIncrease})`);
    }

    console.error(`\n📈 Memory Trend:`);
    alert.snapshots.forEach((snapshot, index) => {
      const memory = alert.type === 'buffer' ? snapshot.bufferMemory :
                     alert.type === 'texture' ? snapshot.textureMemory :
                     snapshot.totalMemory;
      const time = new Date(snapshot.timestamp).toLocaleTimeString();
      console.error(`   [${index + 1}] ${time}: ${(memory / 1024 / 1024).toFixed(2)} MB`);
    });

    console.error(`\n💡 Recommendations:`);
    if (alert.type === 'buffer') {
      console.error(`   1. Check for undisposed buffers (missing buffer.destroy())`);
      console.error(`   2. Look for buffers created in loops`);
      console.error(`   3. Verify buffer lifecycle management`);
      console.error(`   4. Check for retained references preventing GC`);
    } else if (alert.type === 'texture') {
      console.error(`   1. Check for undisposed textures (missing texture.destroy())`);
      console.error(`   2. Look for textures created in loops`);
      console.error(`   3. Verify texture lifecycle management`);
      console.error(`   4. Check for excessive texture mipmapping`);
    } else {
      console.error(`   1. Review all GPU resource allocations`);
      console.error(`   2. Check for missing cleanup in error handlers`);
      console.error(`   3. Verify resource disposal on component unmount`);
      console.error(`   4. Look for event listeners holding references`);
    }

    console.error(`${'='.repeat(60)}\n`);
  }

  getAlerts(): LeakAlert[] {
    return [...this.alerts];
  }

  getMemoryHistory(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  generateReport(): string {
    const report: string[] = [];
    report.push('=== GPU Memory Leak Detector Report ===\n');

    // Summary
    const latest = this.snapshots[this.snapshots.length - 1];
    report.push('Current Memory Usage:');
    report.push(`  Buffers: ${latest.bufferCount} (${(latest.bufferMemory / 1024 / 1024).toFixed(2)} MB)`);
    report.push(`  Textures: ${latest.textureCount} (${(latest.textureMemory / 1024 / 1024).toFixed(2)} MB)`);
    report.push(`  Total: ${(latest.totalMemory / 1024 / 1024).toFixed(2)} MB\n`);

    // Alerts
    report.push(`Alerts Generated: ${this.alerts.length}`);
    report.push(`  Critical: ${this.alerts.filter(a => a.severity === 'critical').length}`);
    report.push(`  Warning: ${this.alerts.filter(a => a.severity === 'warning').length}\n`);

    // Device info
    const deviceInfo = this.profiler.getDeviceInfo();
    report.push('GPU Device:');
    report.push(`  Vendor: ${deviceInfo.vendor}`);
    report.push(`  Architecture: ${deviceInfo.architecture}`);

    return report.join('\n');
  }

  cleanup() {
    this.stopMonitoring();
    this.profiler.stop();
    this.profiler.cleanup();
    console.log('✅ Cleaned up detector');
  }
}

// Simulate a memory leak for demonstration
async function simulateMemoryLeak() {
  console.log('🔬 Simulating memory leak scenario...\n');

  const detector = new GPUMemoryLeakDetector();
  await detector.initialize();

  // Start monitoring before the leak
  detector.startMonitoring();

  // Get device for creating resources
  const device = detector.profiler.getDevice();

  // Simulate buffer leak (creating buffers without destroying them)
  console.log('⚠️  Creating buffers without cleanup (simulating leak)...');

  let leakInterval = setInterval(() => {
    // Create 10 buffers every second without destroying them
    for (let i = 0; i < 10; i++) {
      const buffer = device.createBuffer({
        size: 1024 * 1024, // 1MB per buffer
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });

      // Track but never destroy - THIS IS THE LEAK!
      detector.profiler.trackBuffer(buffer, `leaky-buffer-${Date.now()}-${i}`);
    }

    console.log(`  Created 10 new buffers (1MB each) - Total leak: ${detector.snapshots.length * 10} MB`);
  }, 1000);

  // Stop after 30 seconds and show report
  setTimeout(() => {
    clearInterval(leakInterval);

    console.log('\n⏹️  Stopping simulation...\n');

    // Wait for final analysis
    setTimeout(() => {
      console.log(detector.generateReport());

      const alerts = detector.getAlerts();
      console.log(`\n📝 Alerts Generated: ${alerts.length}`);
      alerts.forEach((alert, index) => {
        console.log(`  ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
      });

      detector.cleanup();
    }, 2000);
  }, 30000);
}

// Normal usage example
async function monitorApplication() {
  console.log('=== GPU Memory Leak Detector - Normal Usage ===\n');

  const detector = new GPUMemoryLeakDetector();
  await detector.initialize();

  // Start monitoring
  detector.startMonitoring();

  console.log('💡 Monitoring your application for memory leaks...');
  console.log('   The detector will alert you if it detects unusual memory growth.\n');

  // In a real application, you would:
  // 1. Start monitoring at app startup
  // 2. Let it run in the background
  // 3. Check alerts periodically or handle them in real-time
  // 4. Stop monitoring when the app closes

  // For demo, stop after 60 seconds
  setTimeout(() => {
    detector.stopMonitoring();

    const alerts = detector.getAlerts();
    if (alerts.length === 0) {
      console.log('\n✅ No memory leaks detected!');
    } else {
      console.log(`\n⚠️  Generated ${alerts.length} alerts during monitoring`);
    }

    console.log('\n' + detector.generateReport());
    detector.cleanup();
  }, 60000);
}

// Export functions
export { GPUMemoryLeakDetector, simulateMemoryLeak, monitorApplication };

// Auto-run demo
if (typeof window !== 'undefined') {
  (window as any).simulateMemoryLeak = simulateMemoryLeak;
  (window as any).monitorApplication = monitorApplication;
  console.log('📝 Available functions:');
  console.log('  - simulateMemoryLeak() - Demonstrates leak detection with simulated leak');
  console.log('  - monitorApplication() - Monitors your application for leaks');
}
