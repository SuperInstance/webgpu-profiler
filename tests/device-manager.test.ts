import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GPUDeviceManager } from '../src/device-manager';
import { GPUError } from '../src/types';

describe('GPUDeviceManager', () => {
  let deviceManager: GPUDeviceManager;

  beforeEach(() => {
    deviceManager = new GPUDeviceManager();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully when WebGPU is available', async () => {
      await deviceManager.initialize();

      expect(deviceManager.isInitialized()).toBe(true);
      expect(deviceManager.getDevice()).toBeDefined();
      expect(deviceManager.getAdapter()).toBeDefined();
    });

    it('should throw error when WebGPU is not supported', async () => {
      // @ts-ignore - Remove navigator.gpu
      const originalGPU = global.navigator.gpu;
      delete (global.navigator as any).gpu;

      await expect(deviceManager.initialize()).rejects.toThrow('WebGPU is not supported');

      global.navigator.gpu = originalGPU;
    });

    it('should throw error when adapter request fails', async () => {
      vi.spyOn(global.navigator.gpu, 'requestAdapter').mockResolvedValueOnce(null);

      await expect(deviceManager.initialize()).rejects.toThrow('Failed to request GPU adapter');
    });

    it('should gather device information on initialization', async () => {
      await deviceManager.initialize();

      const deviceInfo = deviceManager.getDeviceInfo();

      expect(deviceInfo).toBeDefined();
      expect(deviceInfo.vendor).toBeDefined();
      expect(deviceInfo.architecture).toBeDefined();
      expect(deviceInfo.features).toBeDefined();
      expect(deviceInfo.limits).toBeDefined();
    });
  });

  describe('device info', () => {
    it('should parse vendor correctly', async () => {
      await deviceManager.initialize();

      const deviceInfo = deviceManager.getDeviceInfo();

      expect(['Test Vendor', 'NVIDIA', 'AMD', 'Intel', 'Apple', 'Qualcomm', 'Unknown'])
        .toContain(deviceInfo.vendor);
    });

    it('should get supported features', async () => {
      await deviceManager.initialize();

      const features = deviceManager.getSupportedFeatures();

      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });

    it('should check if feature is supported', async () => {
      await deviceManager.initialize();

      expect(deviceManager.hasFeature('texture-compression-bc' as GPUFeatureName)).toBe(true);
      expect(deviceManager.hasFeature('unknown-feature' as GPUFeatureName)).toBe(false);
    });

    it('should get supported limits', async () => {
      await deviceManager.initialize();

      const limits = deviceManager.getSupportedLimits();

      expect(limits).toBeDefined();
      expect(limits.maxTextureDimension2D).toBeDefined();
    });

    it('should get specific limit value', async () => {
      await deviceManager.initialize();

      const maxTexture = deviceManager.getLimit('maxTextureDimension2D');

      expect(maxTexture).toBeDefined();
      expect(typeof maxTexture).toBe('number');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await deviceManager.initialize();

      deviceManager.cleanup();

      expect(deviceManager.isInitialized()).toBe(false);
    });

    it('should call device.destroy on cleanup', async () => {
      await deviceManager.initialize();

      const device = deviceManager.getDevice();
      const destroySpy = vi.spyOn(device, 'destroy');

      deviceManager.cleanup();

      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle RequestAdapterFailed error', async () => {
      vi.spyOn(global.navigator.gpu, 'requestAdapter').mockRejectedValueOnce(
        new Error('Adapter request failed')
      );

      await expect(deviceManager.initialize()).rejects.toContain(GPUError.RequestAdapterFailed);
    });

    it('should handle RequestDeviceFailed error', async () => {
      const mockAdapter = await global.navigator.gpu.requestAdapter();

      vi.spyOn(mockAdapter!, 'requestDevice').mockRejectedValueOnce(
        new Error('Device request failed')
      );

      await expect(deviceManager.initialize()).rejects.toContain(GPUError.RequestDeviceFailed);
    });
  });

  describe('availability checks', () => {
    it('should check WebGPU availability', () => {
      expect(deviceManager.isAvailable()).toBe(true);
    });

    it('should return false for isInitialized before initialization', () => {
      expect(deviceManager.isInitialized()).toBe(false);
    });

    it('should throw error when getting device before initialization', () => {
      expect(() => deviceManager.getDevice()).toThrow('GPU device not initialized');
    });

    it('should throw error when getting adapter before initialization', () => {
      expect(() => deviceManager.getAdapter()).toThrow('GPU adapter not initialized');
    });

    it('should throw error when getting device info before initialization', () => {
      expect(() => deviceManager.getDeviceInfo()).toThrow('Device information not available');
    });
  });
});
