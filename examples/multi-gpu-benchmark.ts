/**
 * Multi-GPU Benchmark Example
 *
 * This example demonstrates profiling on systems with multiple GPUs:
 * - Detect all available GPUs
 * - Benchmark each GPU individually
 * - Compare performance across devices
 * - Optimize workload distribution
 *
 * Use Case: "Optimize for multi-GPU systems and workstations"
 *
 * Keywords: Multi-GPU, GPU benchmark, cross-device testing, workstation GPU, SLI, CrossFire, GPU selection
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

interface GPUBenchmarkResult {
  gpuIndex: number;
  adapterInfo: GPUAdapterInfo;
  score: number;
  fps: number;
  frameTime: number;
  memoryBandwidth: number; // MB/s
  computePerformance: number; // Operations per second
  features: string[];
}

interface WorkloadDistribution {
  gpuIndex: number;
  workloadPercentage: number;
  estimatedTime: number;
}

class MultiGPUBenchmark {
  private results: GPUBenchmarkResult[] = [];
  private testDuration: number = 5000; // 5 seconds per test

  async detectAllGPUs(): Promise<GPUAdapter[]> {
    console.log('🔍 Detecting available GPUs...\n');

    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapters: GPUAdapter[] = [];

    // Try to get multiple adapters
    // Note: Browser support for multi-GPU enumeration is limited
    // This example demonstrates the pattern when available

    try {
      // Request primary adapter
      const primaryAdapter = await navigator.gpu.requestAdapter();
      if (primaryAdapter) {
        adapters.push(primaryAdapter);
        const info = await primaryAdapter.requestAdapterInfo();
        console.log(`✅ GPU 0: ${info.description} (${info.vendor})`);
        console.log(`   Architecture: ${info.architecture}`);
        console.log(`   Vendor: ${info.vendor}`);
        console.log(`   Device: ${info.device}\n`);
      }

      // In the future, browsers may support enumerating multiple adapters
      // For now, we simulate the pattern for demonstration

      // Simulated additional GPUs (for demonstration)
      // In reality, you'd use: await navigator.gpu.requestAdapter({ ...options })

    } catch (error) {
      console.error('Error detecting GPUs:', error);
    }

    console.log(`Found ${adapters.length} GPU(s)\n`);
    return adapters;
  }

  async runBenchmark(gpuIndex: number, adapter: GPUAdapter): Promise<GPUBenchmarkResult> {
    console.log(`🚀 Benchmarking GPU ${gpuIndex}...\n`);

    const device = await adapter.requestDevice();
    const profiler = createGPUProfiler({
      enableMonitoring: true,
      monitoringInterval: 100,
      enableMemoryTracking: true,
    });

    await profiler.initialize();
    profiler.start();

    // Get adapter info
    const adapterInfo = await adapter.requestAdapterInfo();

    // Benchmark 1: Memory Bandwidth Test
    console.log('  📊 Running memory bandwidth test...');
    const memoryBandwidth = await this.benchmarkMemoryBandwidth(device, profiler);

    // Benchmark 2: Compute Performance Test
    console.log('  🧮 Running compute performance test...');
    const computePerformance = await this.benchmarkComputePerformance(device, profiler);

    // Benchmark 3: Frame Rendering Test
    console.log('  🖼️  Running frame rendering test...');
    const frameMetrics = await this.benchmarkFrameRendering(device, profiler);

    // Collect features
    const features = this.getSupportedFeatures(adapter);

    // Calculate overall score (normalized 0-100)
    const score = this.calculateScore({
      memoryBandwidth,
      computePerformance,
      fps: frameMetrics.fps,
      frameTime: frameMetrics.frameTime,
    });

    const result: GPUBenchmarkResult = {
      gpuIndex,
      adapterInfo: adapterInfo,
      score,
      fps: frameMetrics.fps,
      frameTime: frameMetrics.frameTime,
      memoryBandwidth,
      computePerformance,
      features,
    };

    profiler.stop();
    profiler.cleanup();

    console.log(`  ✅ GPU ${gpuIndex} benchmark complete`);
    console.log(`     Score: ${score.toFixed(1)}/100`);
    console.log(`     FPS: ${result.fps.toFixed(2)}`);
    console.log(`     Memory Bandwidth: ${(memoryBandwidth / 1024 / 1024 / 1024).toFixed(2)} GB/s\n`);

    return result;
  }

  private async benchmarkMemoryBandwidth(device: GPUDevice, profiler: any): Promise<number> {
    const bufferSize = 256 * 1024 * 1024; // 256 MB
    const iterations = 10;

    const buffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    });

    profiler.trackBuffer(buffer, 'bandwidth-test-buffer');

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const data = new Uint8Array(bufferSize);
      device.queue.writeBuffer(buffer, 0, data);

      // Create a staging buffer to read back
      const stagingBuffer = device.createBuffer({
        size: bufferSize,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
      });

      const encoder = device.createCommandEncoder();
      encoder.copyBufferToBuffer(buffer, 0, stagingBuffer, 0, bufferSize);
      device.queue.submit([encoder.finish()]);

      stagingBuffer.destroy();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    buffer.destroy();

    // Calculate bandwidth: (bytes * iterations) / (time in seconds)
    const bandwidth = (bufferSize * iterations) / (totalTime / 1000);
    return bandwidth;
  }

  private async benchmarkComputePerformance(device: GPUDevice, profiler: any): Promise<number> {
    const shaderModule = device.createShaderModule({
      code: `
        struct Uniforms {
          iterations: u32,
        }

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          var sum: f32 = 0.0;
          for (var i: u32 = 0; i < 1000; i++) {
            sum += f32(i) * 0.001;
          }
          let result = sum * f32(id.x);
        }
      `
    });

    const pipeline = device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });

    const bufferSize = 256;
    const uniformBuffer = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: { buffer: uniformBuffer },
      }],
    });

    const iterations = 100;
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(4);
      pass.end();
      device.queue.submit([encoder.finish()]);
    }

    await device.queue.onSubmittedWorkDone();
    const endTime = performance.now();

    uniformBuffer.destroy();

    // Operations per second: (workgroups * iterations) / time
    const operations = (4 * 64 * iterations) / ((endTime - startTime) / 1000);
    return operations;
  }

  private async benchmarkFrameRendering(device: GPUDevice, profiler: any): Promise<{ fps: number; frameTime: number }> {
    const shaderModule = device.createShaderModule({
      code: `
        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) uv: vec2<f32>,
        }

        @vertex
        fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
          var positions = array<vec2<f32>, 6>(
            vec2<f32>(-1.0, -1.0),
            vec2<f32>(1.0, -1.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>(1.0, -1.0),
            vec2<f32>(1.0, 1.0)
          );

          var out: VertexOutput;
          out.position = vec4<f32>(positions[vertex_index], 0.0, 1.0);
          out.uv = (positions[vertex_index] + 1.0) * 0.5;
          return out;
        }

        @fragment
        fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
          let color = vec3<f32>(in.uv, 1.0);
          return vec4<f32>(color, 1.0);
        }
      `
    });

    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: shaderModule,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fs_main',
        targets: [{ format: 'bgra8unorm' }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    // Create a fake texture for rendering
    const texture = device.createTexture({
      size: [1920, 1080],
      format: 'bgra8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const frameCount = 100;
    const startTime = performance.now();

    for (let i = 0; i < frameCount; i++) {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: texture.createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        }],
      });

      pass.setPipeline(pipeline);
      pass.draw(6);
      pass.end();

      device.queue.submit([encoder.finish()]);
    }

    await device.queue.onSubmittedWorkDone();
    const endTime = performance.now();

    texture.destroy();

    const totalTime = endTime - startTime;
    const fps = (frameCount / totalTime) * 1000;
    const frameTime = totalTime / frameCount;

    return { fps, frameTime };
  }

  private getSupportedFeatures(adapter: GPUAdapter): string[] {
    const features: string[] = [];

    if (adapter.features.has('depth-clip-control')) features.push('depth-clip-control');
    if (adapter.features.has('depth24unorm-stencil8')) features.push('depth24unorm-stencil8');
    if (adapter.features.has('depth32float-stencil8')) features.push('depth32float-stencil8');
    if (adapter.features.has('texture-compression-bc')) features.push('texture-compression-bc');
    if (adapter.features.has('texture-compression-etc2')) features.push('texture-compression-etc2');
    if (adapter.features.has('texture-compression-astc')) features.push('texture-compression-astc');
    if (adapter.features.has('timestamp-query')) features.push('timestamp-query');
    if (adapter.features.has('indirect-first-instance')) features.push('indirect-first-instance');
    if (adapter.features.has('shader-f16')) features.push('shader-f16');
    if (adapter.features.has('rg11b10ufloat-renderable')) features.push('rg11b10ufloat-renderable');

    return features;
  }

  private calculateScore(metrics: any): number {
    // Normalize metrics to a 0-100 score
    // These are example weights - adjust based on your use case

    const memoryScore = Math.min(metrics.memoryBandwidth / (100 * 1024 * 1024 * 1024) * 30, 30); // Max 30 points
    const computeScore = Math.min(metrics.computePerformance / 1000000000 * 30, 30); // Max 30 points
    const fpsScore = Math.min(metrics.fps / 200 * 25, 25); // Max 25 points for 200 FPS
    const frameTimeScore = Math.min(16.67 / metrics.frameTime * 15, 15); // Max 15 points for 60 FPS (16.67ms)

    return memoryScore + computeScore + fpsScore + frameTimeScore;
  }

  compareResults(): void {
    console.log('\n=== GPU Comparison Results ===\n');

    if (this.results.length === 0) {
      console.log('No benchmark results available');
      return;
    }

    if (this.results.length === 1) {
      console.log('Only one GPU detected - no comparison available\n');
      this.printResult(this.results[0]);
      return;
    }

    // Sort by score
    const sorted = [...this.results].sort((a, b) => b.score - a.score);

    console.log('📊 Performance Ranking:\n');
    sorted.forEach((result, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} GPU ${result.gpuIndex}: ${result.adapterInfo.description}`);
      console.log(`   Score: ${result.score.toFixed(1)}/100`);
      console.log(`   FPS: ${result.fps.toFixed(2)}`);
      console.log(`   Memory: ${(result.memoryBandwidth / 1024 / 1024 / 1024).toFixed(2)} GB/s`);
      console.log(`   Compute: ${(result.computePerformance / 1000000000).toFixed(2)} GFLOPS`);
      console.log('');
    });

    // Performance differences
    if (sorted.length >= 2) {
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      const difference = ((best.score - worst.score) / worst.score * 100);

      console.log(`📈 Performance Gap: ${difference.toFixed(1)}%`);
      console.log(`   ${best.adapterInfo.description} is ${difference.toFixed(0)}% faster than ${worst.adapterInfo.description}\n`);
    }
  }

  private printResult(result: GPUBenchmarkResult): void {
    console.log('GPU Information:');
    console.log(`  Description: ${result.adapterInfo.description}`);
    console.log(`  Vendor: ${result.adapterInfo.vendor}`);
    console.log(`  Architecture: ${result.adapterInfo.architecture}\n`);

    console.log('Performance Metrics:');
    console.log(`  Overall Score: ${result.score.toFixed(1)}/100`);
    console.log(`  FPS: ${result.fps.toFixed(2)}`);
    console.log(`  Frame Time: ${result.frameTime.toFixed(2)} ms`);
    console.log(`  Memory Bandwidth: ${(result.memoryBandwidth / 1024 / 1024 / 1024).toFixed(2)} GB/s`);
    console.log(`  Compute Performance: ${(result.computePerformance / 1000000000).toFixed(2)} GFLOPS\n`);

    console.log(`Supported Features (${result.features.length}):`);
    result.features.forEach(feature => console.log(`  - ${feature}`));
    console.log('');
  }

  optimizeWorkloadDistribution(): WorkloadDistribution[] {
    if (this.results.length === 0) {
      console.log('No benchmark results available for optimization');
      return [];
    }

    console.log('\n💡 Workload Distribution Recommendations:\n');

    const totalScore = this.results.reduce((sum, r) => sum + r.score, 0);
    const distribution: WorkloadDistribution[] = [];

    this.results.forEach(result => {
      const percentage = (result.score / totalScore) * 100;
      const estimatedTime = 100 / result.score; // Normalized time estimate

      distribution.push({
        gpuIndex: result.gpuIndex,
        workloadPercentage: percentage,
        estimatedTime,
      });

      console.log(`GPU ${result.gpuIndex} (${result.adapterInfo.description}):`);
      console.log(`  Workload: ${percentage.toFixed(1)}%`);
      console.log(`  Relative Speed: ${result.score.toFixed(1)}x\n`);
    });

    return distribution;
  }
}

// Main benchmark execution
async function runMultiGPUBenchmark() {
  console.log('=== Multi-GPU Benchmark Suite ===\n');

  const benchmark = new MultiGPUBenchmark();

  try {
    // Detect all GPUs
    const adapters = await benchmark.detectAllGPUs();

    if (adapters.length === 0) {
      console.log('❌ No GPUs detected');
      return;
    }

    // Benchmark each GPU
    console.log('Starting benchmarks...\n');
    const startTime = Date.now();

    for (let i = 0; i < adapters.length; i++) {
      const result = await benchmark.runBenchmark(i, adapters[i]);
      benchmark['results'].push(result);
    }

    const endTime = Date.now();
    console.log(`✅ All benchmarks completed in ${((endTime - startTime) / 1000).toFixed(1)}s\n`);

    // Compare results
    benchmark.compareResults();

    // Optimize workload
    benchmark.optimizeWorkloadDistribution();

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  }
}

// Export
export { MultiGPUBenchmark, runMultiGPUBenchmark };

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).runMultiGPUBenchmark = runMultiGPUBenchmark;
  console.log('📝 Run runMultiGPUBenchmark() to start multi-GPU benchmarking');
}
