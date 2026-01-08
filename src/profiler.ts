import {
  GPUDeviceInfo,
  GPUMetrics,
  GPUMemoryMetrics,
  GPUShaderMetrics,
  GPUBenchmarkSuite as GPUBenchmarkSuiteType,
  GPUBenchmarkResult,
  GPUBenchmarkType,
  GPUPerformanceStats,
  GPUProfilerConfig,
  GPUProfilerState,
  GPUProfilerExport,
  GPUProfilerImport,
  GPUDeviceComparison,
} from './types.js';
import { GPUDeviceManager } from './device-manager.js';
import { GPUMetricsCollector } from './metrics.js';
import { GPUBenchmarkRunner } from './benchmarks.js';

/**
 * Main GPU profiler class for WebGPU performance monitoring
 */
export class GPUProfiler {
  private deviceManager: GPUDeviceManager;
  private metricsCollector: GPUMetricsCollector;
  private benchmarkSuite: GPUBenchmarkRunner;
  private config: GPUProfilerConfig;
  private state: GPUProfilerState = 'idle';
  private version: string = '1.0.0';

  constructor(config: GPUProfilerConfig = {}) {
    this.config = config;
    this.deviceManager = new GPUDeviceManager();
    this.metricsCollector = new GPUMetricsCollector(this.deviceManager, config);
    this.benchmarkSuite = new GPUBenchmarkRunner(this.deviceManager);
  }

  /**
   * Initialize the profiler
   */
  async initialize(): Promise<void> {
    try {
      await this.deviceManager.initialize();
      this.state = 'idle';
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }

  /**
   * Start profiling
   */
  start(): void {
    if (this.state === 'error') {
      throw new Error('Cannot start profiler in error state');
    }

    this.metricsCollector.start();
    this.state = 'running';
  }

  /**
   * Stop profiling
   */
  stop(): void {
    this.metricsCollector.stop();
    this.state = 'idle';
  }

  /**
   * Pause profiling
   */
  pause(): void {
    this.metricsCollector.pause();
    this.state = 'paused';
  }

  /**
   * Resume profiling
   */
  resume(): void {
    this.metricsCollector.resume();
    this.state = 'running';
  }

  /**
   * Get current GPU device information
   */
  getDeviceInfo(): GPUDeviceInfo {
    return this.deviceManager.getDeviceInfo();
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): GPUMetrics {
    return this.metricsCollector.collectMetrics();
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): GPUMetrics[] {
    return this.metricsCollector.getMetricsHistory();
  }

  /**
   * Get memory metrics
   */
  getMemoryMetrics(): GPUMemoryMetrics {
    return this.metricsCollector.getMemoryMetrics();
  }

  /**
   * Get shader metrics
   */
  getShaderMetrics(): GPUShaderMetrics[] {
    return this.metricsCollector.getShaderMetrics();
  }

  /**
   * Get shader metrics by ID
   */
  getShaderMetricsById(shaderId: string): GPUShaderMetrics | undefined {
    return this.metricsCollector.getShaderMetricsById(shaderId);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): GPUPerformanceStats {
    return this.metricsCollector.getPerformanceStats();
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmarks(): Promise<GPUBenchmarkSuiteType> {
    return this.benchmarkSuite.runCompleteSuite();
  }

  /**
   * Run specific benchmark
   */
  async runBenchmark(type: GPUBenchmarkType): Promise<GPUBenchmarkResult> {
    return this.benchmarkSuite.runBenchmark(type);
  }

  /**
   * Get benchmark results
   */
  getBenchmarkResults(): GPUBenchmarkResult[] {
    return this.benchmarkSuite.getResults();
  }

  /**
   * Compare with imported benchmark results
   */
  compareWithImport(importedData: GPUProfilerImport): GPUDeviceComparison[] {
    return this.benchmarkSuite.compareWithImport(importedData);
  }

  /**
   * Track buffer allocation
   */
  trackBuffer(buffer: any, label?: string): void {
    this.metricsCollector.trackBuffer(buffer, label);
  }

  /**
   * Track texture allocation
   */
  trackTexture(texture: any, label?: string): void {
    this.metricsCollector.trackTexture(texture, label);
  }

  /**
   * Untrack buffer allocation
   */
  untrackBuffer(label: string): void {
    this.metricsCollector.untrackBuffer(label);
  }

  /**
   * Untrack texture allocation
   */
  untrackTexture(label: string): void {
    this.metricsCollector.untrackTexture(label);
  }

  /**
   * Track shader execution
   */
  trackShader(
    shaderId: string,
    entryPoint: string,
    executionTime: number
  ): void {
    this.metricsCollector.trackShader(shaderId, entryPoint, executionTime);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metricsCollector.clearMetrics();
  }

  /**
   * Clear benchmark results
   */
  clearBenchmarks(): void {
    this.benchmarkSuite.clearResults();
  }

  /**
   * Get profiler state
   */
  getState(): GPUProfilerState {
    return this.state;
  }

  /**
   * Get GPU device
   */
  getDevice(): GPUDevice {
    return this.deviceManager.getDevice();
  }

  /**
   * Get GPU adapter
   */
  getAdapter(): GPUAdapter {
    return this.deviceManager.getAdapter();
  }

  /**
   * Check if WebGPU is available
   */
  isAvailable(): boolean {
    return this.deviceManager.isAvailable();
  }

  /**
   * Check if profiler is initialized
   */
  isInitialized(): boolean {
    return this.deviceManager.isInitialized();
  }

  /**
   * Get supported features
   */
  getSupportedFeatures(): string[] {
    return this.deviceManager.getSupportedFeatures();
  }

  /**
   * Check if a feature is supported
   */
  hasFeature(feature: string): boolean {
    return this.deviceManager.hasFeature(feature);
  }

  /**
   * Get supported limits
   */
  getSupportedLimits(): GPUSupportedLimits {
    return this.deviceManager.getSupportedLimits();
  }

  /**
   * Get specific limit value
   */
  getLimit<T extends keyof GPUSupportedLimits>(
    limit: T
  ): GPUSupportedLimits[T] | undefined {
    return this.deviceManager.getLimit(limit);
  }

  /**
   * Export profiler data
   */
  export(): GPUProfilerExport {
    return {
      version: this.version,
      timestamp: Date.now(),
      device: this.deviceManager.getDeviceInfo(),
      metrics: this.metricsCollector.getMetricsHistory(),
      memory: this.metricsCollector.getMemoryMetrics(),
      shaderMetrics: this.metricsCollector.getShaderMetrics(),
      benchmarks: this.benchmarkSuite.getResults().length > 0
        ? [{
            device: this.deviceManager.getDeviceInfo(),
            overallScore: 0,
            results: this.benchmarkSuite.getResults(),
            timestamp: Date.now(),
            version: this.version,
          }]
        : undefined,
      stats: this.metricsCollector.getMetricsHistory().length > 0
        ? this.metricsCollector.getPerformanceStats()
        : undefined,
    };
  }

  /**
   * Import profiler data
   */
  import(data: string): GPUProfilerImport {
    const parsed = JSON.parse(data);
    return {
      device: parsed.device,
      benchmarks: parsed.benchmarks || [],
      timestamp: parsed.timestamp,
    };
  }

  /**
   * Export profiler data as JSON string
   */
  exportToString(): string {
    return JSON.stringify(this.export(), null, 2);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stop();
    this.deviceManager.cleanup();
    this.state = 'idle';
  }

  /**
   * Reset profiler to initial state
   */
  reset(): void {
    this.stop();
    this.clearMetrics();
    this.clearBenchmarks();
    this.state = 'idle';
  }
}

/**
 * Create a new GPU profiler instance
 */
export function createGPUProfiler(config?: GPUProfilerConfig): GPUProfiler {
  return new GPUProfiler(config);
}

/**
 * Check if WebGPU is available in current browser
 */
export function isWebGPUAvailable(): boolean {
  return 'gpu' in navigator;
}

/**
 * Get GPU features without initializing profiler
 */
export async function getGPUFeatures(): Promise<string[]> {
  if (!isWebGPUAvailable()) {
    return [];
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return [];
    }

    return Array.from(adapter.features).map((f) => f.toString());
  } catch {
    return [];
  }
}

/**
 * Get GPU limits without initializing profiler
 */
export async function getGPULimits(): Promise<GPUSupportedLimits | null> {
  if (!isWebGPUAvailable()) {
    return null;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return null;
    }

    return adapter.limits;
  } catch {
    return null;
  }
}

/**
 * Quick GPU device info without full profiler
 */
export async function getQuickDeviceInfo(): Promise<GPUDeviceInfo | null> {
  if (!isWebGPUAvailable()) {
    return null;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return null;
    }

    const device = await adapter.requestDevice();
    const adapterInfo = await adapter.requestAdapterInfo();

    const deviceInfo: GPUDeviceInfo = {
      vendor: adapterInfo.vendor || 'Unknown',
      architecture: adapterInfo.architecture || 'Unknown',
      description: adapterInfo.description,
      adapterInfo,
      features: Array.from(adapter.features).map((f) => f.toString()),
      limits: adapter.limits,
    };

    device.destroy();

    return deviceInfo;
  } catch {
    return null;
  }
}
