import {
  GPUDeviceInfo,
  GPUDeviceManagerConfig,
  GPUError,
} from './types.js';

/**
 * Manages WebGPU device initialization and information retrieval
 */
export class GPUDeviceManager {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private deviceInfo: GPUDeviceInfo | null = null;
  private config: GPUDeviceManagerConfig;

  constructor(config: GPUDeviceManagerConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize WebGPU adapter and device
   */
  async initialize(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser');
    }

    try {
      // Request adapter
      this.adapter = await navigator.gpu.requestAdapter(
        this.config.adapterOptions
      );

      if (!this.adapter) {
        throw new Error('Failed to request GPU adapter');
      }

      // Check required features
      if (this.config.requiredFeatures) {
        for (const feature of this.config.requiredFeatures) {
          if (!this.adapter.features.has(feature)) {
            throw new Error(`Required feature ${feature} is not supported`);
          }
        }
      }

      // Check required limits
      if (this.config.requiredLimits) {
        const limits = this.adapter.limits;
        for (const [key, value] of Object.entries(this.config.requiredLimits)) {
          const limitKey = key as keyof GPUSupportedLimits;
          const limitValue = limits[limitKey];
          if (limitValue !== undefined && value > limitValue) {
            throw new Error(
              `Required limit ${key} (${value}) exceeds supported limit (${limitValue})`
            );
          }
        }
      }

      // Request device
      this.device = await this.adapter.requestDevice(this.config.deviceOptions);

      // Gather device information
      this.deviceInfo = await this.gatherDeviceInfo();

      // Handle device loss
      this.device.lost.then((info) => {
        console.error(`GPU device lost: ${info.message}`);
        this.device = null;
        this.adapter = null;
      });
    } catch (error) {
      this.cleanup();
      throw this.handleError(error);
    }
  }

  /**
   * Get the GPU device
   */
  getDevice(): GPUDevice {
    if (!this.device) {
      throw new Error('GPU device not initialized. Call initialize() first.');
    }
    return this.device;
  }

  /**
   * Get the GPU adapter
   */
  getAdapter(): GPUAdapter {
    if (!this.adapter) {
      throw new Error('GPU adapter not initialized. Call initialize() first.');
    }
    return this.adapter;
  }

  /**
   * Get device information
   */
  getDeviceInfo(): GPUDeviceInfo {
    if (!this.deviceInfo) {
      throw new Error('Device information not available. Call initialize() first.');
    }
    return this.deviceInfo;
  }

  /**
   * Check if WebGPU is available
   */
  isAvailable(): boolean {
    return 'gpu' in navigator;
  }

  /**
   * Check if device is initialized
   */
  isInitialized(): boolean {
    return this.device !== null && this.adapter !== null;
  }

  /**
   * Get supported features
   */
  getSupportedFeatures(): string[] {
    if (!this.adapter) {
      return [];
    }
    return Array.from(this.adapter.features).map((f) => f.toString());
  }

  /**
   * Get supported limits
   */
  getSupportedLimits(): GPUSupportedLimits {
    if (!this.adapter) {
      throw new Error('GPU adapter not initialized');
    }
    return this.adapter.limits;
  }

  /**
   * Check if a feature is supported
   */
  hasFeature(feature: string): boolean {
    return this.adapter?.features.has(feature) ?? false;
  }

  /**
   * Get specific limit value
   */
  getLimit<T extends keyof GPUSupportedLimits>(
    limit: T
  ): GPUSupportedLimits[T] | undefined {
    return this.adapter?.limits[limit];
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.device && !this.device.destroyed) {
      this.device.destroy();
    }
    this.device = null;
    this.adapter = null;
    this.deviceInfo = null;
  }

  /**
   * Gather comprehensive device information
   */
  private async gatherDeviceInfo(): Promise<GPUDeviceInfo> {
    if (!this.adapter || !this.device) {
      throw new Error('GPU adapter and device must be initialized');
    }

    const adapterInfo = await this.adapter.requestAdapterInfo();

    // Parse vendor from description
    const vendor = this.parseVendor(adapterInfo.description);

    // Parse architecture
    const architecture = this.parseArchitecture(adapterInfo);

    return {
      vendor,
      architecture,
      description: adapterInfo.description,
      adapterInfo,
      features: this.getSupportedFeatures(),
      limits: this.adapter.limits,
    };
  }

  /**
   * Parse vendor name from description
   */
  private parseVendor(description: string): string {
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('nvidia') || lowerDesc.includes('geforce') || lowerDesc.includes('quadro') || lowerDesc.includes('tesla')) {
      return 'NVIDIA';
    }
    if (lowerDesc.includes('amd') || lowerDesc.includes('radeon') || lowerDesc.includes('gfx')) {
      return 'AMD';
    }
    if (lowerDesc.includes('intel') && (lowerDesc.includes('iris') || lowerDesc.includes('arc') || lowerDesc.includes('uhd') || lowerDesc.includes('hd graphics'))) {
      return 'Intel';
    }
    if (lowerDesc.includes('apple') && (lowerDesc.includes('m1') || lowerDesc.includes('m2') || lowerDesc.includes('m3') || lowerDesc.includes('gpu'))) {
      return 'Apple';
    }
    if (lowerDesc.includes('qualcomm') || lowerDesc.includes('adreno')) {
      return 'Qualcomm';
    }

    return 'Unknown';
  }

  /**
   * Parse architecture information
   */
  private parseArchitecture(adapterInfo: GPUAdapterInfo): string {
    const { architecture, vendor, description } = adapterInfo;

    if (architecture) {
      return architecture;
    }

    // Fallback to parsing from description
    const lowerDesc = description.toLowerCase();

    // NVIDIA architectures
    if (lowerDesc.includes('rtx 40') || lowerDesc.includes('ada')) {
      return 'Ada Lovelace';
    }
    if (lowerDesc.includes('rtx 30') || lowerDesc.includes('ampere')) {
      return 'Ampere';
    }
    if (lowerDesc.includes('rtx 20') || lowerDesc.includes('turing')) {
      return 'Turing';
    }
    if (lowerDesc.includes('gtx 10') || lowerDesc.includes('pascal')) {
      return 'Pascal';
    }

    // AMD architectures
    if (lowerDesc.includes('rdna 3') || lowerDesc.includes('rx 7000')) {
      return 'RDNA 3';
    }
    if (lowerDesc.includes('rdna 2') || lowerDesc.includes('rx 6000')) {
      return 'RDNA 2';
    }
    if (lowerDesc.includes('rdna')) {
      return 'RDNA';
    }
    if (lowerDesc.includes('cdna')) {
      return 'CDNA';
    }

    // Apple architectures
    if (lowerDesc.includes('m3')) {
      return 'Apple M3 GPU';
    }
    if (lowerDesc.includes('m2')) {
      return 'Apple M2 GPU';
    }
    if (lowerDesc.includes('m1')) {
      return 'Apple M1 GPU';
    }

    // Intel architectures
    if (lowerDesc.includes('arc')) {
      return 'Intel Arc Alchemist';
    }
    if (lowerDesc.includes('iris xe')) {
      return 'Intel Iris Xe';
    }

    return 'Unknown Architecture';
  }

  /**
   * Handle and classify errors
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('adapter')) {
        return new Error(`RequestAdapterFailed: ${error.message}`);
      }
      if (message.includes('device')) {
        return new Error(`RequestDeviceFailed: ${error.message}`);
      }
      if (message.includes('memory')) {
        return new Error(`OutOfMemory: ${error.message}`);
      }
      if (message.includes('validation')) {
        return new Error(`ValidationError: ${error.message}`);
      }
      if (message.includes('internal')) {
        return new Error(`InternalError: ${error.message}`);
      }

      return error;
    }

    return new Error(`UnknownError: ${String(error)}`);
  }
}
