import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GPUProfiler, createGPUProfiler, isWebGPUAvailable } from '../src/profiler';

describe('GPUProfiler', () => {
  let profiler: GPUProfiler;

  beforeEach(() => {
    profiler = createGPUProfiler({
      enableMonitoring: true,
      monitoringInterval: 1000,
      enableMemoryTracking: true,
      enableShaderProfiling: true,
    });
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create profiler instance', () => {
      expect(profiler).toBeDefined();
    });

    it('should initialize successfully', async () => {
      await profiler.initialize();

      expect(profiler.isInitialized()).toBe(true);
    });

    it('should throw error when WebGPU is not available', async () => {
      // @ts-ignore - Remove navigator.gpu temporarily
      const originalGPU = global.navigator.gpu;
      delete (global.navigator as any).gpu;

      const noGPUProfiler = createGPUProfiler();
      await expect(noGPUProfiler.initialize()).rejects.toThrow();

      global.navigator.gpu = originalGPU;
    });
  });

  describe('profiling control', () => {
    beforeEach(async () => {
      await profiler.initialize();
    });

    it('should start profiling', () => {
      profiler.start();

      expect(profiler.getState()).toBe('running');
    });

    it('should stop profiling', () => {
      profiler.start();
      profiler.stop();

      expect(profiler.getState()).toBe('idle');
    });

    it('should pause profiling', () => {
      profiler.start();
      profiler.pause();

      expect(profiler.getState()).toBe('paused');
    });

    it('should resume profiling', () => {
      profiler.start();
      profiler.pause();
      profiler.resume();

      expect(profiler.getState()).toBe('running');
    });

    it('should throw error when starting in error state', async () => {
      const errorProfiler = createGPUProfiler();

      // Simulate error state
      await errorProfiler.initialize();
      (errorProfiler as any).state = 'error';

      expect(() => errorProfiler.start()).toThrow('Cannot start profiler in error state');
    });
  });

  describe('device information', () => {
    beforeEach(async () => {
      await profiler.initialize();
    });

    it('should get device info', () => {
      const deviceInfo = profiler.getDeviceInfo();

      expect(deviceInfo).toBeDefined();
      expect(deviceInfo.vendor).toBeDefined();
      expect(deviceInfo.architecture).toBeDefined();
      expect(deviceInfo.description).toBeDefined();
      expect(deviceInfo.features).toBeDefined();
      expect(deviceInfo.limits).toBeDefined();
    });

    it('should get device', () => {
      const device = profiler.getDevice();

      expect(device).toBeDefined();
    });

    it('should get adapter', () => {
      const adapter = profiler.getAdapter();

      expect(adapter).toBeDefined();
    });

    it('should get supported features', () => {
      const features = profiler.getSupportedFeatures();

      expect(Array.isArray(features)).toBe(true);
    });

    it('should get supported limits', () => {
      const limits = profiler.getSupportedLimits();

      expect(limits).toBeDefined();
    });

    it('should check feature support', () => {
      const hasFeature = profiler.hasFeature('texture-compression-bc' as GPUFeatureName);

      expect(typeof hasFeature).toBe('boolean');
    });

    it('should get specific limit', () => {
      const limit = profiler.getLimit('maxTextureDimension2D');

      expect(limit).toBeDefined();
    });
  });

  describe('metrics collection', () => {
    beforeEach(async () => {
      await profiler.initialize();
      profiler.start();
    });

    it('should get current metrics', () => {
      const metrics = profiler.getCurrentMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.fps).toBeDefined();
      expect(metrics.utilization).toBeDefined();
    });

    it('should get metrics history', () => {
      profiler.getCurrentMetrics();
      profiler.getCurrentMetrics();

      const history = profiler.getMetricsHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should get memory metrics', () => {
      const memory = profiler.getMemoryMetrics();

      expect(memory).toBeDefined();
      expect(memory.totalAllocated).toBeDefined();
    });

    it('should get shader metrics', () => {
      profiler.trackShader('test-shader', 'main', 1000);

      const metrics = profiler.getShaderMetrics();

      expect(metrics.length).toBe(1);
    });

    it('should get shader metrics by ID', () => {
      profiler.trackShader('test-shader', 'main', 1000);

      const metrics = profiler.getShaderMetricsById('test-shader');

      expect(metrics).toBeDefined();
      expect(metrics?.shaderId).toBe('test-shader');
    });

    it('should get performance stats', () => {
      profiler.getCurrentMetrics();
      profiler.getCurrentMetrics();

      const stats = profiler.getPerformanceStats();

      expect(stats).toBeDefined();
      expect(stats.totalFrames).toBeGreaterThan(0);
      expect(stats.avgFps).toBeGreaterThan(0);
    });
  });

  describe('memory tracking', () => {
    beforeEach(async () => {
      await profiler.initialize();
    });

    it('should track buffer', () => {
      const mockBuffer = {
        size: 1024,
        usage: 1,
        destroy: vi.fn(),
        hashCode: 'test-buffer',
      } as unknown as GPUBuffer;

      profiler.trackBuffer(mockBuffer, 'test-buffer');

      const memory = profiler.getMemoryMetrics();

      expect(memory.bufferMemory).toBe(1024);
    });

    it('should track texture', () => {
      const mockTexture = {
        size: [512, 512, 1],
        format: 'rgba8unorm' as GPUTextureFormat,
        usage: 16,
        destroy: vi.fn(),
        hashCode: 'test-texture',
      } as unknown as GPUTexture;

      profiler.trackTexture(mockTexture, 'test-texture');

      const memory = profiler.getMemoryMetrics();

      expect(memory.textureMemory).toBeGreaterThan(0);
    });

    it('should untrack buffer', () => {
      const mockBuffer = {
        size: 1024,
        usage: 1,
        destroy: vi.fn(),
        hashCode: 'test-buffer',
      } as unknown as GPUBuffer;

      profiler.trackBuffer(mockBuffer, 'test-buffer');
      profiler.untrackBuffer('test-buffer');

      const memory = profiler.getMemoryMetrics();

      expect(memory.bufferMemory).toBe(0);
    });

    it('should untrack texture', () => {
      const mockTexture = {
        size: [512, 512, 1],
        format: 'rgba8unorm' as GPUTextureFormat,
        usage: 16,
        destroy: vi.fn(),
        hashCode: 'test-texture',
      } as unknown as GPUTexture;

      profiler.trackTexture(mockTexture, 'test-texture');
      profiler.untrackTexture('test-texture');

      const memory = profiler.getMemoryMetrics();

      expect(memory.textureMemory).toBe(0);
    });
  });

  describe('shader tracking', () => {
    beforeEach(async () => {
      await profiler.initialize();
    });

    it('should track shader execution', () => {
      profiler.trackShader('test-shader', 'main', 1000);

      const metrics = profiler.getShaderMetricsById('test-shader');

      expect(metrics).toBeDefined();
      expect(metrics?.avgExecutionTime).toBe(1000);
    });
  });

  describe('benchmarks', () => {
    beforeEach(async () => {
      await profiler.initialize();
    });

    it('should run compute benchmark', async () => {
      const result = await profiler.runBenchmark('compute');

      expect(result).toBeDefined();
      expect(result.name).toBe('Compute Performance');
      expect(result.score).toBeDefined();
    });

    it('should run memory benchmark', async () => {
      const result = await profiler.runBenchmark('bandwidth');

      expect(result).toBeDefined();
      expect(result.name).toBe('Memory Bandwidth');
    });

    it('should run latency benchmark', async () => {
      const result = await profiler.runBenchmark('latency');

      expect(result).toBeDefined();
      expect(result.name).toBe('Command Latency');
    });

    it('should get benchmark results', async () => {
      await profiler.runBenchmark('compute');

      const results = profiler.getBenchmarkResults();

      expect(results.length).toBe(1);
    });

    it('should clear benchmark results', async () => {
      await profiler.runBenchmark('compute');
      profiler.clearBenchmarks();

      const results = profiler.getBenchmarkResults();

      expect(results.length).toBe(0);
    });
  });

  describe('data management', () => {
    beforeEach(async () => {
      await profiler.initialize();
      profiler.start();
    });

    it('should clear metrics', () => {
      profiler.getCurrentMetrics();
      profiler.clearMetrics();

      const history = profiler.getMetricsHistory();

      expect(history.length).toBe(0);
    });

    it('should export data', () => {
      const exported = profiler.export();

      expect(exported).toBeDefined();
      expect(exported.version).toBeDefined();
      expect(exported.timestamp).toBeDefined();
      expect(exported.device).toBeDefined();
    });

    it('should export data as string', () => {
      const exported = profiler.exportToString();

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed.version).toBeDefined();
    });

    it('should import data', () => {
      const exported = profiler.exportToString();
      const imported = profiler.import(exported);

      expect(imported).toBeDefined();
      expect(imported.device).toBeDefined();
      expect(imported.benchmarks).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await profiler.initialize();
      profiler.start();

      profiler.cleanup();

      expect(profiler.getState()).toBe('idle');
      expect(profiler.isInitialized()).toBe(false);
    });

    it('should reset profiler', async () => {
      await profiler.initialize();
      profiler.start();
      profiler.getCurrentMetrics();

      profiler.reset();

      expect(profiler.getState()).toBe('idle');
      expect(profiler.getMetricsHistory().length).toBe(0);
    });
  });

  describe('utility functions', () => {
    it('should check WebGPU availability', () => {
      expect(isWebGPUAvailable()).toBe(true);
    });

    it('should create profiler with factory function', () => {
      const factoryProfiler = createGPUProfiler();

      expect(factoryProfiler).toBeDefined();
      expect(factoryProfiler).toBeInstanceOf(GPUProfiler);
    });
  });
});
