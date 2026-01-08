/**
 * Cross-Device Benchmark Example
 *
 * This example demonstrates how to run GPU benchmarks and compare results
 * across different devices. It's perfect for developers who need to ensure
 * their WebGPU applications perform well on a variety of hardware.
 *
 * Use Case: "How does my app perform on different GPUs?"
 *
 * Features:
 * - Run comprehensive GPU benchmarks
 * - Export results to JSON for comparison
 * - Import and compare with other devices
 * - Visual performance comparison
 * - Device capability analysis
 * - Regression detection
 *
 * SEO Keywords: cross-device GPU comparison, WebGPU benchmarking,
 * browser GPU profiler, GPU performance testing, device capability checks
 */

import { createGPUProfiler } from 'browser-gpu-profiler';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface DeviceBenchmark {
  deviceName: string;
  timestamp: number;
  benchmarks: any;
  deviceInfo: any;
}

interface BenchmarkComparison {
  currentDevice: string;
  referenceDevices: DeviceComparison[];
  timestamp: number;
}

interface DeviceComparison {
  deviceName: string;
  overallScore: number;
  scoreDifference: number;
  performanceRatio: string;
  individualResults: ComparisonMetric[];
}

interface ComparisonMetric {
  name: string;
  current: number;
  reference: number;
  difference: number;
  percentageDifference: number;
  better: boolean;
}

class CrossDeviceBenchmark {
  private profiler: ReturnType<typeof createGPUProfiler>;
  private benchmarkHistoryPath: string;

  constructor(historyPath: string = './benchmark-history') {
    this.profiler = createGPUProfiler({
      enableMonitoring: false,
      enableShaderProfiling: false,
      enableMemoryTracking: false,
    });
    this.benchmarkHistoryPath = historyPath;
  }

  /**
   * Initialize the benchmark system
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Cross-Device Benchmark System...');

    try {
      await this.profiler.initialize();

      const deviceInfo = this.profiler.getDeviceInfo();
      console.log('✅ Benchmark system initialized');
      console.log(`🎯 Current Device: ${deviceInfo.vendor} ${deviceInfo.architecture}`);

    } catch (error) {
      console.error('❌ Failed to initialize benchmark system:', error);
      throw error;
    }
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmarks(): Promise<DeviceBenchmark> {
    console.log('\n🔥 Running Complete Benchmark Suite...');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const startTime = Date.now();
    const results = await this.profiler.runBenchmarks();
    const deviceInfo = this.profiler.getDeviceInfo();
    const duration = Date.now() - startTime;

    const benchmark: DeviceBenchmark = {
      deviceName: `${deviceInfo.vendor} ${deviceInfo.architecture}`,
      timestamp: Date.now(),
      benchmarks: results,
      deviceInfo,
    };

    console.log(`\n✅ Benchmarks completed in ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Overall Score: ${results.overallScore.toFixed(2)}/100`);

    return benchmark;
  }

  /**
   * Display benchmark results
   */
  displayBenchmarkResults(benchmark: DeviceBenchmark): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 Benchmark Results');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Device: ${benchmark.deviceName}`);
    console.log(`Timestamp: ${new Date(benchmark.timestamp).toLocaleString()}`);
    console.log(`Overall Score: ${benchmark.benchmarks.overallScore.toFixed(2)}/100\n`);

    console.log('Individual Benchmarks:');
    console.log('───────────────────────────────────────────────────────────────');

    benchmark.benchmarks.results.forEach((result: any, index: number) => {
      const bar = this.createScoreBar(result.score, 100);
      console.log(`\n${index + 1}. ${result.name}`);
      console.log(`   Score: ${result.score.toFixed(2)} ${result.unit}`);
      console.log(`   ${bar}`);
      console.log(`   Time: ${result.executionTime.toFixed(2)}ms`);

      // Show additional metrics if available
      if (result.metrics && Object.keys(result.metrics).length > 0) {
        console.log('   Metrics:');
        Object.entries(result.metrics).forEach(([key, value]) => {
          console.log(`     ${key}: ${Number(value).toFixed(2)}`);
        });
      }
    });
  }

  /**
   * Save benchmark to file
   */
  saveBenchmark(benchmark: DeviceBenchmark, filename?: string): string {
    const deviceName = benchmark.deviceName.replace(/\s+/g, '-').toLowerCase();
    const timestamp = new Date(benchmark.timestamp).toISOString().split('T')[0];
    const defaultFilename = `benchmark-${deviceName}-${timestamp}.json`;
    const finalFilename = filename || defaultFilename;

    const filepath = join(this.benchmarkHistoryPath, finalFilename);

    try {
      writeFileSync(filepath, JSON.stringify(benchmark, null, 2), 'utf-8');
      console.log(`\n💾 Benchmark saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ Failed to save benchmark:', error);
      throw error;
    }
  }

  /**
   * Load benchmark from file
   */
  loadBenchmark(filepath: string): DeviceBenchmark | null {
    try {
      if (!existsSync(filepath)) {
        console.error(`❌ File not found: ${filepath}`);
        return null;
      }

      const data = readFileSync(filepath, 'utf-8');
      const benchmark = JSON.parse(data) as DeviceBenchmark;

      console.log(`\n📂 Benchmark loaded from: ${filepath}`);
      console.log(`   Device: ${benchmark.deviceName}`);
      console.log(`   Date: ${new Date(benchmark.timestamp).toLocaleString()}`);

      return benchmark;
    } catch (error) {
      console.error('❌ Failed to load benchmark:', error);
      return null;
    }
  }

  /**
   * Load all benchmarks from history directory
   */
  loadAllBenchmarks(): DeviceBenchmark[] {
    const { readdirSync, readFileSync } = require('fs');
    const { join } = require('path');

    if (!existsSync(this.benchmarkHistoryPath)) {
      return [];
    }

    const benchmarks: DeviceBenchmark[] = [];

    try {
      const files = readdirSync(this.benchmarkHistoryPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      jsonFiles.forEach(file => {
        try {
          const filepath = join(this.benchmarkHistoryPath, file);
          const data = readFileSync(filepath, 'utf-8');
          const benchmark = JSON.parse(data) as DeviceBenchmark;
          benchmarks.push(benchmark);
        } catch (error) {
          console.warn(`⚠️  Failed to load ${file}:`, error);
        }
      });
    } catch (error) {
      console.error('❌ Failed to load benchmarks:', error);
    }

    return benchmarks;
  }

  /**
   * Compare current benchmark with reference benchmarks
   */
  compareWithReferences(current: DeviceBenchmark, references: DeviceBenchmark[]): BenchmarkComparison {
    const comparisons: DeviceComparison[] = [];

    references.forEach(ref => {
      const comparison = this.compareBenchmarks(current, ref);
      comparisons.push(comparison);
    });

    // Sort by overall score
    comparisons.sort((a, b) => b.overallScore - a.overallScore);

    return {
      currentDevice: current.deviceName,
      referenceDevices: comparisons,
      timestamp: Date.now(),
    };
  }

  /**
   * Compare two benchmarks
   */
  private compareBenchmarks(benchmark1: DeviceBenchmark, benchmark2: DeviceBenchmark): DeviceComparison {
    const results1 = benchmark1.benchmarks.results;
    const results2 = benchmark2.benchmarks.results;

    const individualResults: ComparisonMetric[] = [];

    results1.forEach((r1: any) => {
      const r2 = results2.find((r: any) => r.name === r1.name);

      if (r2) {
        const difference = r1.score - r2.score;
        const percentageDifference = (difference / r2.score) * 100;

        individualResults.push({
          name: r1.name,
          current: r1.score,
          reference: r2.score,
          difference,
          percentageDifference,
          better: difference > 0,
        });
      }
    });

    const scoreDifference = benchmark1.benchmarks.overallScore - benchmark2.benchmarks.overallScore;
    const performanceRatio = (benchmark1.benchmarks.overallScore / benchmark2.benchmarks.overallScore).toFixed(2);

    return {
      deviceName: benchmark2.deviceName,
      overallScore: benchmark2.benchmarks.overallScore,
      scoreDifference,
      performanceRatio: `${performanceRatio}x`,
      individualResults,
    };
  }

  /**
   * Display comparison results
   */
  displayComparison(comparison: BenchmarkComparison): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 Cross-Device Performance Comparison');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(`Current Device: ${comparison.currentDevice}`);
    console.log(`Reference Devices: ${comparison.referenceDevices.length}\n`);

    comparison.referenceDevices.forEach((ref, index) => {
      const scoreDiff = ref.scoreDifference;
      const emoji = scoreDiff > 0 ? '✅' : scoreDiff < 0 ? '❌' : '⚖️';
      const change = scoreDiff > 0 ? '+' : '';

      console.log(`${index + 1}. ${emoji} ${ref.deviceName}`);
      console.log(`   Overall Score: ${ref.overallScore.toFixed(2)}/100`);
      console.log(`   Difference: ${change}${scoreDiff.toFixed(2)} (${ref.performanceRatio} of current)`);

      console.log('\n   Individual Metrics:');
      console.log('   ───────────────────────────────────────────────────────────');

      ref.individualResults.forEach(metric => {
        const arrow = metric.better ? '↑' : '↓';
        const pctChange = metric.percentageDifference > 0 ? '+' : '';
        const color = metric.better ? '✅' : '❌';

        console.log(`   ${color} ${metric.name}:`);
        console.log(`      Current: ${metric.current.toFixed(2)} | Reference: ${metric.reference.toFixed(2)}`);
        console.log(`      ${arrow} ${pctChange}${metric.percentageDifference.toFixed(1)}%`);
      });

      console.log();
    });
  }

  /**
   * Detect performance regression
   */
  detectRegression(current: DeviceBenchmark, previous: DeviceBenchmark): boolean {
    const scoreDifference = current.benchmarks.overallScore - previous.benchmarks.overallScore;
    const regressionThreshold = -5; // 5% decrease

    if (scoreDifference < regressionThreshold) {
      console.warn(`⚠️  Performance regression detected!`);
      console.warn(`   Previous score: ${previous.benchmarks.overallScore.toFixed(2)}`);
      console.warn(`   Current score: ${current.benchmarks.overallScore.toFixed(2)}`);
      console.warn(`   Decrease: ${scoreDifference.toFixed(2)}%`);

      return true;
    }

    return false;
  }

  /**
   * Create a visual score bar
   */
  private createScoreBar(score: number, max: number, width = 30): string {
    const filled = Math.round((score / max) * width);
    const empty = width - filled;

    let bar = '[';
    if (score >= 80) {
      bar += '█'.repeat(filled);
    } else if (score >= 60) {
      bar += '▓'.repeat(filled);
    } else if (score >= 40) {
      bar += '▒'.repeat(filled);
    } else {
      bar += '░'.repeat(filled);
    }
    bar += '░'.repeat(empty);
    bar += ']';

    return bar;
  }

  /**
   * Export comparison report
   */
  exportComparisonReport(comparison: BenchmarkComparison): string {
    return JSON.stringify(comparison, null, 2);
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.profiler.cleanup();
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

async function runCrossDeviceBenchmarkExample() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 Cross-Device Benchmark Example');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const benchmark = new CrossDeviceBenchmark('./examples/benchmark-history');
  await benchmark.initialize();

  // Run benchmarks on current device
  console.log('📊 Running benchmarks on current device...\n');
  const currentResults = await benchmark.runBenchmarks();
  benchmark.displayBenchmarkResults(currentResults);

  // Save current benchmark
  const savedFile = benchmark.saveBenchmark(currentResults);

  // Load reference benchmarks (if any exist)
  console.log('\n\n📂 Loading reference benchmarks...\n');
  const referenceBenchmarks = benchmark.loadAllBenchmarks();

  // Filter out current benchmark from references
  const otherDevices = referenceBenchmarks.filter(b => b.deviceName !== currentResults.deviceName);

  if (otherDevices.length > 0) {
    console.log(`Found ${otherDevices.length} reference benchmark(s)\n`);

    // Compare with reference devices
    const comparison = benchmark.compareWithReferences(currentResults, otherDevices);
    benchmark.displayComparison(comparison);

    // Export comparison report
    const report = benchmark.exportComparisonReport(comparison);
    console.log('\n💾 Comparison report generated');

  } else {
    console.log('No reference benchmarks found.');
    console.log('💡 Tip: Run this example on different devices to build a comparison database!');
  }

  // Create sample reference data for demonstration
  console.log('\n\n📝 Creating Sample Reference Data (for demonstration)...');

  const sampleReferences: DeviceBenchmark[] = [
    {
      deviceName: 'NVIDIA RTX 3080',
      timestamp: Date.now() - 86400000, // 1 day ago
      benchmarks: {
        overallScore: 85.5,
        results: [
          { name: 'Compute Performance', score: 12000, unit: 'GFLOPS', executionTime: 500, metrics: {} },
          { name: 'Memory Bandwidth', score: 760, unit: 'GB/s', executionTime: 450, metrics: {} },
          { name: 'Texture Transfer', score: 450, unit: 'GB/s', executionTime: 300, metrics: {} },
        ],
      },
      deviceInfo: { vendor: 'NVIDIA', architecture: 'RTX 3080' },
    },
    {
      deviceName: 'AMD RX 6800',
      timestamp: Date.now() - 172800000, // 2 days ago
      benchmarks: {
        overallScore: 78.2,
        results: [
          { name: 'Compute Performance', score: 10500, unit: 'GFLOPS', executionTime: 550, metrics: {} },
          { name: 'Memory Bandwidth', score: 720, unit: 'GB/s', executionTime: 480, metrics: {} },
          { name: 'Texture Transfer', score: 410, unit: 'GB/s', executionTime: 320, metrics: {} },
        ],
      },
      deviceInfo: { vendor: 'AMD', architecture: 'RX 6800' },
    },
  ];

  const sampleComparison = benchmark.compareWithReferences(currentResults, sampleReferences);
  benchmark.displayComparison(sampleComparison);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Cross-Device Benchmark Complete');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n💡 Tips:');
  console.log('   • Run benchmarks on multiple devices to build a comparison database');
  console.log('   • Use comparison reports to identify hardware-specific optimizations');
  console.log('   • Track performance over time to detect regressions');
  console.log('   • Share benchmark files with team members for collaborative analysis');

  benchmark.cleanup();
}

// Run the example
if (import.meta.url === new URL(import.meta.url).href) {
  runCrossDeviceBenchmarkExample().catch(console.error);
}

export { CrossDeviceBenchmark, DeviceBenchmark, BenchmarkComparison, DeviceComparison };
