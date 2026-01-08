import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GPUMetricsCollector } from '../src/metrics';
import { GPUDeviceManager } from '../src/device-manager';

describe('GPUMetricsCollector', () => {
  let deviceManager: GPUDeviceManager;
  let collector: GPUMetricsCollector;

  beforeEach(async () => {
    deviceManager = new GPUDeviceManager();
    await deviceManager.initialize();
    collector = new GPUMetricsCollector(deviceManager, {
      enableMonitoring: true,
      enableMemoryTracking: true,
      enableShaderProfiling: true,
      maxHistorySize: 100,
    });
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default config', async () => {
      const defaultCollector = new GPUMetricsCollector(deviceManager);

      expect(defaultCollector.getState()).toBe('idle');
    });

    it('should initialize with custom config', async () => {
      const customCollector = new GPUMetricsCollector(deviceManager, {
        enableMonitoring: false,
        monitoringInterval: 500,
      });

      expect(customCollector.getState()).toBe('idle');
    });
  });

  describe('state management', () => {
    it('should start collecting metrics', () => {
      collector.start();

      expect(collector.getState()).toBe('running');
    });

    it('should stop collecting metrics', () => {
      collector.start();
      collector.stop();

      expect(collector.getState()).toBe('idle');
    });

    it('should pause collecting metrics', () => {
      collector.start();
      collector.pause();

      expect(collector.getState()).toBe('paused');
    });

    it('should resume collecting metrics', () => {
      collector.start();
      collector.pause();
      collector.resume();

      expect(collector.getState()).toBe('running');
    });

    it('should not start if already running', () => {
      collector.start();
      const state1 = collector.getState();
      collector.start();
      const state2 = collector.getState();

      expect(state1).toBe('running');
      expect(state2).toBe('running');
    });
  });

  describe('metrics collection', () => {
    it('should collect current metrics', () => {
      const metrics = collector.collectMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(typeof metrics.utilization).toBe('number');
      expect(typeof metrics.memoryUsed).toBe('number');
      expect(typeof metrics.memoryPercentage).toBe('number');
      expect(typeof metrics.frameTime).toBe('number');
      expect(typeof metrics.fps).toBe('number');
      expect(typeof metrics.computeTime).toBe('number');
    });

    it('should track metrics history', () => {
      collector.start();

      // Collect multiple metrics
      collector.collectMetrics();
      collector.collectMetrics();
      collector.collectMetrics();

      const history = collector.getMetricsHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history size', () => {
      const smallCollector = new GPUMetricsCollector(deviceManager, {
        maxHistorySize: 5,
      });

      smallCollector.start();

      // Collect more than max size
      for (let i = 0; i < 10; i++) {
        smallCollector.collectMetrics();
      }

      const history = smallCollector.getMetricsHistory();

      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should clear metrics', () => {
      collector.start();
      collector.collectMetrics();
      collector.clearMetrics();

      const history = collector.getMetricsHistory();

      expect(history.length).toBe(0);
    });
  });

  describe('memory tracking', () => {
    it('should get initial memory metrics', () => {
      const memory = collector.getMemoryMetrics();

      expect(memory).toBeDefined();
      expect(typeof memory.bufferMemory).toBe('number');
      expect(typeof memory.textureMemory).toBe('number');
      expect(typeof memory.totalAllocated).toBe('number');
      expect(memory.allocations).toBeDefined();
      expect(memory.history).toBeDefined();
    });

    it('should track buffer allocation', () => {
      const mockBuffer = {
        size: 1024,
        usage: 1,
        destroy: vi.fn(),
        hashCode: 'test-buffer',
      } as unknown as GPUBuffer;

      collector.trackBuffer(mockBuffer, 'test-buffer');

      const memory = collector.getMemoryMetrics();

      expect(memory.bufferMemory).toBe(1024);
      expect(memory.totalAllocated).toBe(1024);
      expect(memory.allocations.has('test-buffer')).toBe(true);
    });

    it('should track texture allocation', () => {
      const mockTexture = {
        size: [512, 512, 1],
        format: 'rgba8unorm' as GPUTextureFormat,
        usage: 16,
        destroy: vi.fn(),
        hashCode: 'test-texture',
      } as unknown as GPUTexture;

      collector.trackTexture(mockTexture, 'test-texture');

      const memory = collector.getMemoryMetrics();

      // 512 * 512 * 4 bytes = 1,048,576 bytes
      expect(memory.textureMemory).toBeGreaterThan(0);
      expect(memory.totalAllocated).toBeGreaterThan(0);
      expect(memory.allocations.has('test-texture')).toBe(true);
    });

    it('should untrack buffer', () => {
      const mockBuffer = {
        size: 1024,
        usage: 1,
        destroy: vi.fn(),
        hashCode: 'test-buffer',
      } as unknown as GPUBuffer;

      collector.trackBuffer(mockBuffer, 'test-buffer');
      collector.untrackBuffer('test-buffer');

      const memory = collector.getMemoryMetrics();

      expect(memory.bufferMemory).toBe(0);
      expect(memory.allocations.has('test-buffer')).toBe(false);
    });

    it('should untrack texture', () => {
      const mockTexture = {
        size: [512, 512, 1],
        format: 'rgba8unorm' as GPUTextureFormat,
        usage: 16,
        destroy: vi.fn(),
        hashCode: 'test-texture',
      } as unknown as GPUTexture;

      collector.trackTexture(mockTexture, 'test-texture');
      collector.untrackTexture('test-texture');

      const memory = collector.getMemoryMetrics();

      expect(memory.textureMemory).toBe(0);
      expect(memory.allocations.has('test-texture')).toBe(false);
    });

    it('should record memory history', () => {
      const mockBuffer = {
        size: 1024,
        usage: 1,
        destroy: vi.fn(),
        hashCode: 'test-buffer',
      } as unknown as GPUBuffer;

      collector.trackBuffer(mockBuffer, 'test-buffer');

      const memory = collector.getMemoryMetrics();

      expect(memory.history.length).toBeGreaterThan(0);
      expect(memory.history[0].timestamp).toBeDefined();
      expect(memory.history[0].bufferMemory).toBeDefined();
    });
  });

  describe('shader profiling', () => {
    it('should track shader execution', () => {
      collector.trackShader('test-shader', 'main', 1000);

      const metrics = collector.getShaderMetrics();

      expect(metrics.length).toBe(1);
      expect(metrics[0].shaderId).toBe('test-shader');
      expect(metrics[0].entryPoint).toBe('main');
      expect(metrics[0].avgExecutionTime).toBe(1000);
      expect(metrics[0].invocations).toBe(1);
    });

    it('should update existing shader metrics', () => {
      collector.trackShader('test-shader', 'main', 1000);
      collector.trackShader('test-shader', 'main', 2000);

      const metrics = collector.getShaderMetricsById('test-shader');

      expect(metrics).toBeDefined();
      expect(metrics?.avgExecutionTime).toBe(1500); // (1000 + 2000) / 2
      expect(metrics?.invocations).toBe(2);
      expect(metrics?.minExecutionTime).toBe(1000);
      expect(metrics?.maxExecutionTime).toBe(2000);
    });

    it('should detect bottlenecks', () => {
      // High execution time should trigger bottleneck
      collector.trackShader('slow-shader', 'main', 15000);

      const metrics = collector.getShaderMetricsById('slow-shader');

      expect(metrics?.bottlenecks.length).toBeGreaterThan(0);
    });

    it('should get all shader metrics', () => {
      collector.trackShader('shader1', 'main', 1000);
      collector.trackShader('shader2', 'main', 2000);

      const metrics = collector.getShaderMetrics();

      expect(metrics.length).toBe(2);
    });

    it('should return undefined for non-existent shader', () => {
      const metrics = collector.getShaderMetricsById('non-existent');

      expect(metrics).toBeUndefined();
    });
  });

  describe('performance statistics', () => {
    it('should throw error when no metrics available', () => {
      expect(() => collector.getPerformanceStats()).toThrow('No metrics available');
    });

    it('should calculate performance statistics', () => {
      collector.start();

      // Collect some metrics
      for (let i = 0; i < 10; i++) {
        collector.collectMetrics();
      }

      const stats = collector.getPerformanceStats();

      expect(stats.totalFrames).toBeGreaterThan(0);
      expect(stats.avgFps).toBeGreaterThan(0);
      expect(stats.minFps).toBeGreaterThan(0);
      expect(stats.maxFps).toBeGreaterThan(0);
      expect(stats.avgFrameTime).toBeGreaterThan(0);
      expect(stats.frameTimePercentiles.p50).toBeGreaterThan(0);
      expect(stats.frameTimePercentiles.p95).toBeGreaterThan(0);
      expect(stats.frameTimePercentiles.p99).toBeGreaterThan(0);
      expect(stats.startTime).toBeDefined();
      expect(stats.endTime).toBeDefined();
    });
  });

  describe('callbacks', () => {
    it('should call onMetricsUpdate callback', () => {
      const onMetricsUpdate = vi.fn();

      const callbackCollector = new GPUMetricsCollector(deviceManager, {
        onMetricsUpdate,
      });

      callbackCollector.start();
      callbackCollector.collectMetrics();

      expect(onMetricsUpdate).toHaveBeenCalled();
    });

    it('should call onMemoryUpdate callback', () => {
      const onMemoryUpdate = vi.fn();

      const callbackCollector = new GPUMetricsCollector(deviceManager, {
        onMemoryUpdate,
      });

      const mockBuffer = {
        size: 1024,
        usage: 1,
        destroy: vi.fn(),
        hashCode: 'test-buffer',
      } as unknown as GPUBuffer;

      callbackCollector.trackBuffer(mockBuffer, 'test-buffer');

      expect(onMemoryUpdate).toHaveBeenCalled();
    });

    it('should call onShaderMetrics callback', () => {
      const onShaderMetrics = vi.fn();

      const callbackCollector = new GPUMetricsCollector(deviceManager, {
        onShaderMetrics,
      });

      callbackCollector.trackShader('test-shader', 'main', 1000);

      expect(onShaderMetrics).toHaveBeenCalled();
    });
  });

  describe('disabled features', () => {
    it('should not track memory when disabled', () => {
      const disabledCollector = new GPUMetricsCollector(deviceManager, {
        enableMemoryTracking: false,
      });

      const mockBuffer = {
        size: 1024,
        usage: 1,
        destroy: vi.fn(),
        hashCode: 'test-buffer',
      } as unknown as GPUBuffer;

      disabledCollector.trackBuffer(mockBuffer, 'test-buffer');

      const memory = disabledCollector.getMemoryMetrics();

      expect(memory.bufferMemory).toBe(0);
    });

    it('should not profile shaders when disabled', () => {
      const disabledCollector = new GPUMetricsCollector(deviceManager, {
        enableShaderProfiling: false,
      });

      disabledCollector.trackShader('test-shader', 'main', 1000);

      const metrics = disabledCollector.getShaderMetrics();

      expect(metrics.length).toBe(0);
    });
  });
});
