import {
  GPUDeviceInfo,
  GPUBenchmarkResult,
  GPUBenchmarkSuite,
  GPUBenchmarkType,
  GPUDeviceComparison,
  GPUProfilerImport,
} from './types.js';
import { GPUDeviceManager } from './device-manager.js';

/**
 * GPU benchmark suite for performance testing
 */
export class GPUBenchmarkRunner {
  private deviceManager: GPUDeviceManager;
  private results: GPUBenchmarkResult[] = [];
  private version: string = '1.0.0';

  constructor(deviceManager: GPUDeviceManager) {
    this.deviceManager = deviceManager;
  }

  /**
   * Run complete benchmark suite
   */
  async runCompleteSuite(): Promise<GPUBenchmarkSuite> {
    this.results = [];

    // Run all benchmarks
    this.results.push(await this.runComputeBenchmark());
    this.results.push(await this.runMemoryBandwidthBenchmark());
    this.results.push(await this.runTextureTransferBenchmark());
    this.results.push(await this.runShaderCompilationBenchmark());
    this.results.push(await this.runPipelineCreationBenchmark());
    this.results.push(await this.runLatencyBenchmark());

    // Calculate overall score
    const overallScore = this.calculateOverallScore();

    const deviceInfo = this.deviceManager.getDeviceInfo();

    return {
      device: deviceInfo,
      overallScore,
      results: this.results,
      timestamp: Date.now(),
      version: this.version,
    };
  }

  /**
   * Run specific benchmark type
   */
  async runBenchmark(type: GPUBenchmarkType): Promise<GPUBenchmarkResult> {
    switch (type) {
      case 'compute':
        return this.runComputeBenchmark();
      case 'memory':
      case 'bandwidth':
        return this.runMemoryBandwidthBenchmark();
      case 'latency':
        return this.runLatencyBenchmark();
      case 'throughput':
        return this.runTextureTransferBenchmark();
      default:
        throw new Error(`Unknown benchmark type: ${type}`);
    }
  }

  /**
   * Compute benchmark - measures shader compute performance
   */
  async runComputeBenchmark(): Promise<GPUBenchmarkResult> {
    const device = this.deviceManager.getDevice();
    const startTime = performance.now();

    // Create compute shader
    const shaderModule = device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read> input: array<f32>;
        @group(0) @binding(1) var<storage, read_write> output: array<f32>;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let index = global_id.x;
          if (index >= arrayLength(&input)) {
            return;
          }
          output[index] = input[index] * 2.0 + 1.0;
        }
      `,
    });

    // Create buffers
    const bufferSize = 1024 * 1024 * 16; // 16M floats = 64MB
    const inputBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const outputBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Create pipeline
    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });

    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: inputBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
      ],
    });

    // Run compute passes
    const iterations = 100;
    const totalElements = bufferSize / 4;

    for (let i = 0; i < iterations; i++) {
      const commandEncoder = device.createCommandEncoder();
      const passEncoder = commandEncoder.beginComputePass();
      passEncoder.setPipeline(pipeline);
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.dispatchWorkgroups(Math.ceil(totalElements / 64));
      passEncoder.end();

      device.queue.submit([commandEncoder.finish()]);
      await device.queue.onSubmittedWorkDone();
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Calculate score (GFLOPS)
    const operations = totalElements * 2 * iterations; // 2 operations per element
    const gflops = (operations / executionTime) / 1e6;

    inputBuffer.destroy();
    outputBuffer.destroy();

    return {
      name: 'Compute Performance',
      description: 'Measures GPU compute throughput using parallel arithmetic operations',
      score: gflops,
      unit: 'GFLOPS',
      executionTime,
      metrics: {
        totalElements,
        iterations,
        operationsPerSecond: operations / executionTime,
        bufferSize,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Memory bandwidth benchmark
   */
  async runMemoryBandwidthBenchmark(): Promise<GPUBenchmarkResult> {
    const device = this.deviceManager.getDevice();
    const startTime = performance.now();

    // Create large buffers
    const bufferSize = 1024 * 1024 * 256; // 256MB
    const buffer1 = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    const buffer2 = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });

    // Perform buffer copies
    const iterations = 50;
    const totalBytes = bufferSize * iterations * 2; // Read + write

    for (let i = 0; i < iterations; i++) {
      const encoder = device.createCommandEncoder();
      encoder.copyBufferToBuffer(buffer1, 0, buffer2, 0, bufferSize);
      device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone();
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Calculate bandwidth (GB/s)
    const bandwidth = totalBytes / executionTime / 1024 / 1024 / 1024;

    buffer1.destroy();
    buffer2.destroy();

    return {
      name: 'Memory Bandwidth',
      description: 'Measures GPU memory bandwidth using buffer-to-buffer copies',
      score: bandwidth,
      unit: 'GB/s',
      executionTime,
      metrics: {
        bufferSize,
        iterations,
        totalBytes,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Texture transfer benchmark
   */
  async runTextureTransferBenchmark(): Promise<GPUBenchmarkResult> {
    const device = this.deviceManager.getDevice();
    const startTime = performance.now();

    // Create textures
    const textureSize = 2048;
    const textureFormat: GPUTextureFormat = 'rgba8unorm';
    const texture1 = device.createTexture({
      size: [textureSize, textureSize, 1],
      format: textureFormat,
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    const texture2 = device.createTexture({
      size: [textureSize, textureSize, 1],
      format: textureFormat,
      usage: GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Perform texture copies
    const iterations = 50;
    const bytesPerTexture = textureSize * textureSize * 4; // 4 bytes per pixel
    const totalBytes = bytesPerTexture * iterations * 2; // Read + write

    for (let i = 0; i < iterations; i++) {
      const encoder = device.createCommandEncoder();
      encoder.copyTextureToTexture(
        { texture: texture1 },
        { texture: texture2 },
        [textureSize, textureSize, 1]
      );
      device.queue.submit([encoder.finish()]);
      await device.queue.onSubmittedWorkDone();
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Calculate throughput (GB/s)
    const throughput = totalBytes / executionTime / 1024 / 1024 / 1024;

    texture1.destroy();
    texture2.destroy();

    return {
      name: 'Texture Transfer',
      description: 'Measures texture-to-texture copy performance',
      score: throughput,
      unit: 'GB/s',
      executionTime,
      metrics: {
        textureSize,
        bytesPerTexture,
        iterations,
        totalBytes,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Shader compilation benchmark
   */
  async runShaderCompilationBenchmark(): Promise<GPUBenchmarkResult> {
    const device = this.deviceManager.getDevice();
    const startTime = performance.now();

    const shaderCode = `
      struct Uniforms {
        a: f32,
        b: f32,
        c: f32,
      };

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      @group(0) @binding(1) var<storage, read> input: array<f32>;
      @group(0) @binding(2) var<storage, read_write> output: array<f32>;

      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= arrayLength(&input)) {
          return;
        }
        let x = input[index];
        let result = uniforms.a * x * x + uniforms.b * x + uniforms.c;
        output[index] = result;
      }
    `;

    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      device.createShaderModule({ code: shaderCode });
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Calculate score (shaders per second)
    const shadersPerSecond = iterations / (executionTime / 1000);

    return {
      name: 'Shader Compilation',
      description: 'Measures shader module compilation speed',
      score: shadersPerSecond,
      unit: 'shaders/s',
      executionTime,
      metrics: {
        iterations,
        avgCompilationTime: executionTime / iterations,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Pipeline creation benchmark
   */
  async runPipelineCreationBenchmark(): Promise<GPUBenchmarkResult> {
    const device = this.deviceManager.getDevice();
    const startTime = performance.now();

    const shaderModule = device.createShaderModule({
      code: `
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let x = f32(global_id.x);
          let y = f32(global_id.y);
          let z = f32(global_id.z);
          let result = x * y * z;
        }
      `,
    });

    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      });
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Calculate score (pipelines per second)
    const pipelinesPerSecond = iterations / (executionTime / 1000);

    return {
      name: 'Pipeline Creation',
      description: 'Measures compute pipeline creation speed',
      score: pipelinesPerSecond,
      unit: 'pipelines/s',
      executionTime,
      metrics: {
        iterations,
        avgCreationTime: executionTime / iterations,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Latency benchmark - measures round-trip time
   */
  async runLatencyBenchmark(): Promise<GPUBenchmarkResult> {
    const device = this.deviceManager.getDevice();
    const latencies: number[] = [];

    const buffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      // Create a simple command
      const encoder = device.createCommandEncoder();
      encoder.writeBuffer(buffer, 0, new Uint8Array([42]));
      device.queue.submit([encoder.finish()]);

      // Wait for completion
      await device.queue.onSubmittedWorkDone();

      const endTime = performance.now();
      latencies.push(endTime - startTime);
    }

    buffer.destroy();

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const minLatency = Math.min(...latencies);
    const maxLatency = Math.max(...latencies);

    return {
      name: 'Command Latency',
      description: 'Measures GPU command round-trip latency',
      score: avgLatency,
      unit: 'ms',
      executionTime: latencies.reduce((a, b) => a + b, 0),
      metrics: {
        avgLatency,
        minLatency,
        maxLatency,
        iterations,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Compare results with imported data
   */
  compareWithImport(importedData: GPUProfilerImport): GPUDeviceComparison[] {
    const comparisons: GPUDeviceComparison[] = [];
    const currentResults = this.results;

    if (!importedData.benchmarks || importedData.benchmarks.length === 0) {
      return comparisons;
    }

    const importedBenchmarks = importedData.benchmarks[0].results;

    // Compare each benchmark
    for (const imported of importedBenchmarks) {
      const current = currentResults.find((r) => r.name === imported.name);

      if (current) {
        const relativeScore = (current.score / imported.score) * 100;
        comparisons.push({
          device: importedData.device.description,
          relativeScore,
          results: [current, imported],
          timestamp: Date.now(),
        });
      }
    }

    return comparisons;
  }

  /**
   * Get benchmark results
   */
  getResults(): GPUBenchmarkResult[] {
    return [...this.results];
  }

  /**
   * Clear benchmark results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Calculate overall benchmark score
   */
  private calculateOverallScore(): number {
    if (this.results.length === 0) {
      return 0;
    }

    // Normalize each benchmark score and calculate weighted average
    const weights: Record<string, number> = {
      'Compute Performance': 0.3,
      'Memory Bandwidth': 0.25,
      'Texture Transfer': 0.2,
      'Shader Compilation': 0.1,
      'Pipeline Creation': 0.1,
      'Command Latency': 0.05,
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const result of this.results) {
      const weight = weights[result.name] || 0.1;
      totalScore += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }
}

/**
 * Export benchmark results for comparison
 */
export function exportBenchmarkResults(
  suite: GPUBenchmarkSuite
): string {
  return JSON.stringify(suite, null, 2);
}

/**
 * Import benchmark results
 */
export function importBenchmarkResults(
  data: string
): GPUProfilerImport {
  const parsed = JSON.parse(data);

  return {
    device: parsed.device,
    benchmarks: [parsed],
    timestamp: parsed.timestamp,
  };
}
