import {
  GPUMetrics,
  GPUMemoryMetrics,
  GPUMemoryAllocation,
  GPUMemorySample,
  GPUShaderMetrics,
  GPUPerformanceStats,
  GPUProfilerConfig,
  GPUProfilerState,
} from './types.js';
import { GPUDeviceManager } from './device-manager.js';

/**
 * Collects and manages GPU performance metrics
 */
export class GPUMetricsCollector {
  private deviceManager: GPUDeviceManager;
  private config: Required<GPUProfilerConfig>;
  private state: GPUProfilerState = 'idle';

  // Metrics storage
  private metricsHistory: GPUMetrics[] = [];
  private memoryMetrics: GPUMemoryMetrics;
  private shaderMetrics: Map<string, GPUShaderMetrics> = new Map();

  // Performance tracking
  private frameStartTime: number = 0;
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private monitoringInterval: number | null = null;

  // Memory tracking
  private memoryAllocations: Map<string, GPUMemoryAllocation> = new Map();
  private memoryHistory: GPUMemorySample[] = [];

  constructor(deviceManager: GPUDeviceManager, config: GPUProfilerConfig = {}) {
    this.deviceManager = deviceManager;
    this.config = {
      enableMonitoring: config.enableMonitoring ?? true,
      monitoringInterval: config.monitoringInterval ?? 1000,
      enableMemoryTracking: config.enableMemoryTracking ?? true,
      enableShaderProfiling: config.enableShaderProfiling ?? true,
      maxHistorySize: config.maxHistorySize ?? 1000,
      onMetricsUpdate: config.onMetricsUpdate ?? (() => {}),
      onMemoryUpdate: config.onMemoryUpdate ?? (() => {}),
      onShaderMetrics: config.onShaderMetrics ?? (() => {}),
    };

    this.memoryMetrics = {
      bufferMemory: 0,
      textureMemory: 0,
      totalAllocated: 0,
      allocations: this.memoryAllocations,
      history: this.memoryHistory,
    };

    this.setupMemoryTracking();
  }

  /**
   * Start collecting metrics
   */
  start(): void {
    if (this.state === 'running') {
      return;
    }

    this.state = 'running';
    this.frameStartTime = performance.now();
    this.lastFrameTime = this.frameStartTime;
    this.frameCount = 0;

    if (this.config.enableMonitoring) {
      this.monitoringInterval = window.setInterval(() => {
        this.collectMetrics();
      }, this.config.monitoringInterval);
    }
  }

  /**
   * Stop collecting metrics
   */
  stop(): void {
    if (this.state !== 'running') {
      return;
    }

    this.state = 'idle';

    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Pause metrics collection
   */
  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
      if (this.monitoringInterval !== null) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }
    }
  }

  /**
   * Resume metrics collection
   */
  resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      if (this.config.enableMonitoring) {
        this.monitoringInterval = window.setInterval(() => {
          this.collectMetrics();
        }, this.config.monitoringInterval);
      }
    }
  }

  /**
   * Collect current GPU metrics
   */
  collectMetrics(): GPUMetrics {
    const now = performance.now();
    const frameTime = now - this.lastFrameTime;
    const fps = 1000 / frameTime;

    const metrics: GPUMetrics = {
      timestamp: now,
      utilization: this.estimateUtilization(),
      memoryUsed: this.memoryMetrics.totalAllocated,
      memoryTotal: this.estimateTotalMemory(),
      memoryPercentage: this.calculateMemoryPercentage(),
      frameTime,
      fps,
      computeTime: this.estimateComputeTime(),
    };

    // Add to history
    this.metricsHistory.push(metrics);

    // Trim history if needed
    if (this.metricsHistory.length > this.config.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // Notify callback
    this.config.onMetricsUpdate(metrics);

    this.lastFrameTime = now;
    this.frameCount++;

    return metrics;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): GPUMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get current memory metrics
   */
  getMemoryMetrics(): GPUMemoryMetrics {
    return {
      bufferMemory: this.memoryMetrics.bufferMemory,
      textureMemory: this.memoryMetrics.textureMemory,
      totalAllocated: this.memoryMetrics.totalAllocated,
      allocations: new Map(this.memoryMetrics.allocations),
      history: [...this.memoryMetrics.history],
    };
  }

  /**
   * Get shader metrics
   */
  getShaderMetrics(): GPUShaderMetrics[] {
    return Array.from(this.shaderMetrics.values());
  }

  /**
   * Get shader metrics by ID
   */
  getShaderMetricsById(shaderId: string): GPUShaderMetrics | undefined {
    return this.shaderMetrics.get(shaderId);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): GPUPerformanceStats {
    if (this.metricsHistory.length === 0) {
      throw new Error('No metrics available for statistics');
    }

    const fpsValues = this.metricsHistory.map((m) => m.fps);
    const frameTimeValues = this.metricsHistory.map((m) => m.frameTime);
    const computeTimeValues = this.metricsHistory.map((m) => m.computeTime);

    return {
      totalFrames: this.frameCount,
      avgFps: this.average(fpsValues),
      minFps: Math.min(...fpsValues),
      maxFps: Math.max(...fpsValues),
      avgFrameTime: this.average(frameTimeValues),
      frameTimePercentiles: {
        p50: this.percentile(frameTimeValues, 50),
        p95: this.percentile(frameTimeValues, 95),
        p99: this.percentile(frameTimeValues, 99),
      },
      totalComputeTime: computeTimeValues.reduce((a, b) => a + b, 0),
      avgComputeTime: this.average(computeTimeValues),
      startTime: this.metricsHistory[0].timestamp,
      endTime: this.metricsHistory[this.metricsHistory.length - 1].timestamp,
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metricsHistory = [];
    this.memoryHistory = [];
    this.shaderMetrics.clear();
    this.frameCount = 0;
  }

  /**
   * Track buffer allocation
   */
  trackBuffer(buffer: any, label: string = ''): void {
    if (!this.config.enableMemoryTracking) {
      return;
    }

    const id = label || `buffer_${buffer.hashCode || Math.random()}`;
    const allocation: GPUMemoryAllocation = {
      id,
      type: 'buffer',
      size: buffer.size || 0,
      timestamp: performance.now(),
      usage: buffer.usage || 0,
      active: true,
    };

    this.memoryAllocations.set(id, allocation);
    this.memoryMetrics.bufferMemory += buffer.size;
    this.memoryMetrics.totalAllocated += buffer.size;

    this.recordMemorySample();
    this.config.onMemoryUpdate(this.getMemoryMetrics());
  }

  /**
   * Track texture allocation
   */
  trackTexture(texture: any, label: string = ''): void {
    if (!this.config.enableMemoryTracking) {
      return;
    }

    const size = this.calculateTextureSize(texture);
    const id = label || `texture_${texture.hashCode || Math.random()}`;
    const allocation: GPUMemoryAllocation = {
      id,
      type: 'texture',
      size,
      timestamp: performance.now(),
      usage: texture.usage || 0,
      active: true,
    };

    this.memoryAllocations.set(id, allocation);
    this.memoryMetrics.textureMemory += size;
    this.memoryMetrics.totalAllocated += size;

    this.recordMemorySample();
    this.config.onMemoryUpdate(this.getMemoryMetrics());
  }

  /**
   * Untrack buffer allocation
   */
  untrackBuffer(label: string): void {
    const allocation = this.memoryAllocations.get(label);
    if (allocation && allocation.type === 'buffer') {
      this.memoryMetrics.bufferMemory -= allocation.size;
      this.memoryMetrics.totalAllocated -= allocation.size;
      this.memoryAllocations.delete(label);

      this.recordMemorySample();
      this.config.onMemoryUpdate(this.getMemoryMetrics());
    }
  }

  /**
   * Untrack texture allocation
   */
  untrackTexture(label: string): void {
    const allocation = this.memoryAllocations.get(label);
    if (allocation && allocation.type === 'texture') {
      this.memoryMetrics.textureMemory -= allocation.size;
      this.memoryMetrics.totalAllocated -= allocation.size;
      this.memoryAllocations.delete(label);

      this.recordMemorySample();
      this.config.onMemoryUpdate(this.getMemoryMetrics());
    }
  }

  /**
   * Track shader execution
   */
  trackShader(
    shaderId: string,
    entryPoint: string,
    executionTime: number
  ): void {
    if (!this.config.enableShaderProfiling) {
      return;
    }

    let metrics = this.shaderMetrics.get(shaderId);

    if (!metrics) {
      metrics = {
        shaderId,
        entryPoint,
        avgExecutionTime: executionTime,
        minExecutionTime: executionTime,
        maxExecutionTime: executionTime,
        invocations: 1,
        lastExecution: performance.now(),
        bottlenecks: [],
      };
      this.shaderMetrics.set(shaderId, metrics);
    } else {
      const totalExecutionTime =
        metrics.avgExecutionTime * metrics.invocations + executionTime;
      metrics.invocations++;
      metrics.avgExecutionTime = totalExecutionTime / metrics.invocations;
      metrics.minExecutionTime = Math.min(metrics.minExecutionTime, executionTime);
      metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime);
      metrics.lastExecution = performance.now();

      // Detect potential bottlenecks
      this.detectBottlenecks(metrics);
    }

    this.config.onShaderMetrics(metrics);
  }

  /**
   * Get current state
   */
  getState(): GPUProfilerState {
    return this.state;
  }

  /**
   * Setup memory tracking
   */
  private setupMemoryTracking(): void {
    // Record initial memory sample
    this.recordMemorySample();
  }

  /**
   * Record memory sample for history
   */
  private recordMemorySample(): void {
    const sample: GPUMemorySample = {
      timestamp: performance.now(),
      bufferMemory: this.memoryMetrics.bufferMemory,
      textureMemory: this.memoryMetrics.textureMemory,
      totalAllocated: this.memoryMetrics.totalAllocated,
    };

    this.memoryHistory.push(sample);

    // Trim history if needed
    if (this.memoryHistory.length > this.config.maxHistorySize) {
      this.memoryHistory.shift();
    }
  }

  /**
   * Calculate texture size in bytes
   */
  private calculateTextureSize(texture: any): number {
    const { width, height, depthOrArrayLayers } = texture;
    const format = texture.format;
    const bytesPerBlock = this.getBytesPerBlock(format);
    const blocks = width * height * depthOrArrayLayers;
    return blocks * bytesPerBlock;
  }

  /**
   * Get bytes per block for texture format
   */
  private getBytesPerBlock(format: string): number {
    // Simplified format sizes (most common formats)
    const formatSizes: Record<string, number> = {
      'rgba8unorm': 4,
      'rgba8unorm-srgb': 4,
      'bgra8unorm': 4,
      'bgra8unorm-srgb': 4,
      'rgb9e5ufloat': 4,
      'rgb10a2unorm': 4,
      'rg11b10ufloat': 4,
      'rgb32float': 12,
      'rg32float': 8,
      'r32float': 4,
      'rgba16float': 8,
      'rg16float': 4,
      'r16float': 2,
      'rgba32float': 16,
      'bc1-rgba-unorm': 8,
      'bc1-rgba-unorm-srgb': 8,
      'bc4-r-unorm': 8,
      'bc4-r-snorm': 8,
      'bc5-rg-unorm': 16,
      'bc5-rg-snorm': 16,
      'bc7-rgba-unorm': 16,
      'bc7-rgba-unorm-srgb': 16,
      'etc2-rgb8unorm': 8,
      'etc2-rgb8unorm-srgb': 8,
      'etc2-rgb8a1unorm': 8,
      'etc2-rgb8a1unorm-srgb': 8,
      'eac-r11unorm': 8,
      'eac-r11snorm': 8,
      'eac-rg11unorm': 16,
      'eac-rg11snorm': 16,
      'astc-4x4-unorm': 16,
      'astc-4x4-unorm-srgb': 16,
      'astc-5x4-unorm': 16,
      'astc-5x4-unorm-srgb': 16,
      'astc-5x5-unorm': 16,
      'astc-5x5-unorm-srgb': 16,
      'astc-6x5-unorm': 16,
      'astc-6x5-unorm-srgb': 16,
      'astc-6x6-unorm': 16,
      'astc-6x6-unorm-srgb': 16,
      'astc-8x5-unorm': 16,
      'astc-8x5-unorm-srgb': 16,
      'astc-8x6-unorm': 16,
      'astc-8x6-unorm-srgb': 16,
      'astc-8x8-unorm': 16,
      'astc-8x8-unorm-srgb': 16,
      'astc-10x5-unorm': 16,
      'astc-10x5-unorm-srgb': 16,
      'astc-10x6-unorm': 16,
      'astc-10x6-unorm-srgb': 16,
      'astc-10x8-unorm': 16,
      'astc-10x8-unorm-srgb': 16,
      'astc-10x10-unorm': 16,
      'astc-10x10-unorm-srgb': 16,
      'astc-12x10-unorm': 16,
      'astc-12x10-unorm-srgb': 16,
      'astc-12x12-unorm': 16,
      'astc-12x12-unorm-srgb': 16,
    };

    return formatSizes[format] || 4; // Default to 4 bytes per pixel
  }

  /**
   * Estimate GPU utilization (0-100)
   */
  private estimateUtilization(): number {
    // WebGPU doesn't provide direct utilization metrics
    // This is an approximation based on frame time and compute time
    if (this.metricsHistory.length < 2) {
      return 0;
    }

    const recentMetrics = this.metricsHistory.slice(-10);
    const avgFrameTime = this.average(recentMetrics.map((m) => m.frameTime));
    const avgComputeTime = this.average(recentMetrics.map((m) => m.computeTime));

    // Estimate utilization based on compute time vs frame time
    return Math.min(100, (avgComputeTime / avgFrameTime) * 100);
  }

  /**
   * Estimate total GPU memory
   */
  private estimateTotalMemory(): number {
    // WebGPU doesn't provide total memory, so we estimate based on device info
    const deviceInfo = this.deviceManager.getDeviceInfo();

    // Default to 4GB if unknown
    const defaultMemory = 4 * 1024 * 1024 * 1024;

    // Try to estimate from vendor/architecture
    const vendor = deviceInfo.vendor.toLowerCase();
    const arch = deviceInfo.architecture.toLowerCase();

    // High-end GPUs typically have more memory
    if (arch.includes('4090') || arch.includes('4080')) {
      return 24 * 1024 * 1024 * 1024; // 24GB
    }
    if (arch.includes('4070') || arch.includes('4060')) {
      return 12 * 1024 * 1024 * 1024; // 12GB
    }
    if (arch.includes('3090') || arch.includes('3080')) {
      return 12 * 1024 * 1024 * 1024; // 12GB
    }
    if (arch.includes('3070') || arch.includes('3060')) {
      return 8 * 1024 * 1024 * 1024; // 8GB
    }
    if (vendor.includes('apple') && arch.includes('m3')) {
      return 16 * 1024 * 1024 * 1024; // 16GB
    }
    if (vendor.includes('apple') && arch.includes('m2')) {
      return 12 * 1024 * 1024 * 1024; // 12GB
    }
    if (vendor.includes('apple') && arch.includes('m1')) {
      return 8 * 1024 * 1024 * 1024; // 8GB
    }

    return defaultMemory;
  }

  /**
   * Calculate memory usage percentage
   */
  private calculateMemoryPercentage(): number {
    const total = this.estimateTotalMemory();
    if (total === 0) {
      return 0;
    }
    return (this.memoryMetrics.totalAllocated / total) * 100;
  }

  /**
   * Estimate compute time
   */
  private estimateComputeTime(): number {
    // Use recent shader metrics if available
    if (this.shaderMetrics.size > 0) {
      const shaderTimes = Array.from(this.shaderMetrics.values()).map(
        (s) => s.avgExecutionTime / 1000 // Convert microseconds to milliseconds
      );
      return this.average(shaderTimes);
    }

    // Default estimate
    return 1.0;
  }

  /**
   * Detect performance bottlenecks in shader
   */
  private detectBottlenecks(metrics: GPUShaderMetrics): void {
    metrics.bottlenecks = [];

    // High execution time
    if (metrics.avgExecutionTime > 10000) {
      // > 10ms
      metrics.bottlenecks.push('High execution time - consider optimizing algorithm');
    }

    // High variance in execution time
    const variance = metrics.maxExecutionTime - metrics.minExecutionTime;
    if (variance > metrics.avgExecutionTime * 0.5) {
      metrics.bottlenecks.push('High execution time variance - check for data-dependent branches');
    }

    // High frequency invocations
    if (metrics.invocations > 10000) {
      metrics.bottlenecks.push('High invocation count - consider batching or caching results');
    }
  }

  /**
   * Calculate average of array
   */
  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate percentile of array
   */
  private percentile(values: number[], p: number): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sorted.length) {
      return sorted[sorted.length - 1];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}

// Extend GPUBuffer interface to add hashCode
declare interface GPUBuffer {
  hashCode?: string;
}

declare interface GPUTexture {
  hashCode?: string;
}
