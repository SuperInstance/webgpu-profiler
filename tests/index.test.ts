import { describe, it, expect } from 'vitest';
import {
  GPUProfiler,
  GPUDeviceManager,
  GPUMetricsCollector,
  GPUBenchmarkRunner,
  createGPUProfiler,
  isWebGPUAvailable,
  getGPUFeatures,
  getGPULimits,
  getQuickDeviceInfo,
  VERSION,
} from '../src/index';

describe('Index exports', () => {
  describe('classes', () => {
    it('should export GPUProfiler', () => {
      expect(GPUProfiler).toBeDefined();
    });

    it('should export GPUDeviceManager', () => {
      expect(GPUDeviceManager).toBeDefined();
    });

    it('should export GPUMetricsCollector', () => {
      expect(GPUMetricsCollector).toBeDefined();
    });

    it('should export GPUBenchmarkRunner', () => {
      expect(GPUBenchmarkRunner).toBeDefined();
    });
  });

  describe('utility functions', () => {
    it('should export createGPUProfiler', () => {
      expect(createGPUProfiler).toBeDefined();
      expect(typeof createGPUProfiler).toBe('function');
    });

    it('should export isWebGPUAvailable', () => {
      expect(isWebGPUAvailable).toBeDefined();
      expect(typeof isWebGPUAvailable).toBe('function');
    });

    it('should export getGPUFeatures', () => {
      expect(getGPUFeatures).toBeDefined();
      expect(typeof getGPUFeatures).toBe('function');
    });

    it('should export getGPULimits', () => {
      expect(getGPULimits).toBeDefined();
      expect(typeof getGPULimits).toBe('function');
    });

    it('should export getQuickDeviceInfo', () => {
      expect(getQuickDeviceInfo).toBeDefined();
      expect(typeof getQuickDeviceInfo).toBe('function');
    });
  });

  describe('constants', () => {
    it('should export VERSION', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
    });
  });

  describe('utility function behavior', () => {
    it('should check WebGPU availability', () => {
      const available = isWebGPUAvailable();

      expect(typeof available).toBe('boolean');
    });

    it('should get GPU features', async () => {
      const features = await getGPUFeatures();

      expect(Array.isArray(features)).toBe(true);
    });

    it('should get GPU limits', async () => {
      const limits = await getGPULimits();

      if (limits) {
        expect(limits).toBeDefined();
      }
    });

    it('should get quick device info', async () => {
      const deviceInfo = await getQuickDeviceInfo();

      if (deviceInfo) {
        expect(deviceInfo.vendor).toBeDefined();
        expect(deviceInfo.architecture).toBeDefined();
        expect(deviceInfo.description).toBeDefined();
      }
    });
  });

  describe('createGPUProfiler', () => {
    it('should create profiler instance', () => {
      const profiler = createGPUProfiler();

      expect(profiler).toBeInstanceOf(GPUProfiler);
    });

    it('should create profiler with config', () => {
      const profiler = createGPUProfiler({
        enableMonitoring: false,
      });

      expect(profiler).toBeInstanceOf(GPUProfiler);
    });
  });
});
