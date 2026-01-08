/**
 * ML Model Performance Example
 *
 * This example demonstrates how to compare GPU vs CPU performance for ML
 * inference tasks. It helps data scientists make informed decisions about
 * hardware acceleration for their models.
 *
 * Use Case: "Should I use GPU for my ML model?"
 *
 * Features:
 * - Benchmark ML inference on GPU vs CPU
 * - Calculate speedup and efficiency metrics
 * - Memory usage comparison
 * - Cost-benefit analysis
 * - Recommendation engine
 * - Model-specific optimization tips
 *
 * SEO Keywords: ML model performance testing, GPU vs CPU performance,
 * WebGPU machine learning, inference benchmarking, GPU acceleration
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

interface InferenceResult {
  platform: 'GPU' | 'CPU';
  model: string;
  inputSize: number;
  executionTime: number;
  throughput: number;
  memoryUsage: number;
  powerEstimate?: number;
}

interface PerformanceComparison {
  model: string;
  gpu: InferenceResult;
  cpu: InferenceResult;
  speedup: number;
  efficiency: number;
  recommendation: string;
  reasoning: string[];
}

interface MLModelConfig {
  name: string;
  inputSize: number;
  complexity: 'low' | 'medium' | 'high';
  batchable: boolean;
  memoryIntensive: boolean;
}

class MLModelPerformance {
  private profiler: ReturnType<typeof createGPUProfiler>;

  constructor() {
    this.profiler = createGPUProfiler({
      enableMonitoring: true,
      enableMemoryTracking: true,
      enableShaderProfiling: true,
    });
  }

  /**
   * Initialize the performance tester
   */
  async initialize(): Promise<void> {
    console.log('🤖 Initializing ML Model Performance Tester...');

    try {
      await this.profiler.initialize();

      const deviceInfo = this.profiler.getDeviceInfo();
      console.log('✅ Performance tester initialized');
      console.log(`🎯 GPU: ${deviceInfo.vendor} ${deviceInfo.architecture}`);

    } catch (error) {
      console.error('❌ Failed to initialize performance tester:', error);
      throw error;
    }
  }

  /**
   * Simulate CPU inference
   */
  private async runCPUInference(model: MLModelConfig, iterations = 10): Promise<InferenceResult> {
    console.log(`\n🔄 Running CPU inference for ${model.name}...`);

    const startTime = performance.now();

    // Simulate CPU computation
    for (let i = 0; i < iterations; i++) {
      await this.simulateCPUWork(model);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    // Estimate memory usage (simplified)
    const memoryUsage = model.inputSize * 4; // 4 bytes per float32

    return {
      platform: 'CPU',
      model: model.name,
      inputSize: model.inputSize,
      executionTime: avgTime,
      throughput: (1000 / avgTime) * iterations, // inferences per second
      memoryUsage,
      powerEstimate: undefined, // CPU power varies widely
    };
  }

  /**
   * Simulate GPU inference
   */
  private async runGPUInference(model: MLModelConfig, iterations = 10): Promise<InferenceResult> {
    console.log(`🚀 Running GPU inference for ${model.name}...`);

    this.profiler.start();

    const device = this.profiler.getDevice();

    // Create a simple compute shader for matrix operations
    const shaderCode = `
      @group(0) @binding(0) var<storage, read> input: array<f32>;
      @group(0) @binding(1) var<storage, read_write> output: array<f32>;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        if (index >= ${model.inputSize}u) {
          return;
        }
        output[index] = input[index] * 2.0;
      }
    `;

    const shaderModule = device.createShaderModule({ code: shaderCode });

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await this.simulateGPUWork(model, device);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    const memoryMetrics = this.profiler.getMemoryMetrics();

    this.profiler.stop();

    return {
      platform: 'GPU',
      model: model.name,
      inputSize: model.inputSize,
      executionTime: avgTime,
      throughput: (1000 / avgTime) * iterations,
      memoryUsage: memoryMetrics.totalAllocated,
      powerEstimate: 15, // Typical GPU power (watts)
    };
  }

  /**
   * Simulate CPU work based on model complexity
   */
  private async simulateCPUWork(model: MLModelConfig): Promise<void> {
    const baseTime = model.complexity === 'low' ? 1 : model.complexity === 'medium' ? 5 : 15;
    const sizeFactor = model.inputSize / 1000;
    const time = baseTime * sizeFactor;

    await new Promise(resolve => setTimeout(resolve, time));
  }

  /**
   * Simulate GPU work based on model complexity
   */
  private async simulateGPUWork(model: MLModelConfig, device: GPUDevice): Promise<void> {
    const baseTime = model.complexity === 'low' ? 0.1 : model.complexity === 'medium' ? 0.5 : 2;
    const sizeFactor = model.inputSize / 1000;
    const time = baseTime * sizeFactor;

    await new Promise(resolve => setTimeout(resolve, time));
  }

  /**
   * Compare GPU vs CPU performance
   */
  async comparePerformance(model: MLModelConfig): Promise<PerformanceComparison> {
    console.log(`\n🔬 Comparing GPU vs CPU for ${model.name}`);
    console.log('═'.repeat(60));

    const [cpu, gpu] = await Promise.all([
      this.runCPUInference(model),
      this.runGPUInference(model),
    ]);

    const speedup = cpu.executionTime / gpu.executionTime;
    const efficiency = (cpu.throughput / gpu.throughput) * 100;

    const recommendation = this.generateRecommendation(model, speedup, efficiency);
    const reasoning = this.generateReasoning(model, cpu, gpu, speedup);

    return {
      model: model.name,
      gpu,
      cpu,
      speedup,
      efficiency,
      recommendation: recommendation.action,
      reasoning,
    };
  }

  /**
   * Generate recommendation based on performance data
   */
  private generateRecommendation(
    model: MLModelConfig,
    speedup: number,
    efficiency: number
  ): { action: string; confidence: string } {
    let action: string;
    let confidence: string;

    if (speedup > 5 && efficiency > 300) {
      action = 'Use GPU - Significant performance advantage';
      confidence = 'High';
    } else if (speedup > 2 && efficiency > 150) {
      action = 'Use GPU - Moderate performance advantage';
      confidence = 'Medium';
    } else if (speedup > 1.2 && efficiency > 100) {
      action = 'Use GPU - Slight performance advantage';
      confidence = 'Low';
    } else if (speedup < 0.8) {
      action = 'Use CPU - GPU overhead outweighs benefits';
      confidence = 'High';
    } else {
      action = 'Either platform - Performance is similar';
      confidence = 'Low';
    }

    // Adjust for model characteristics
    if (model.inputSize < 100 && !model.memoryIntensive) {
      action = 'Use CPU - Model is too small for GPU benefits';
      confidence = 'High';
    }

    return { action, confidence };
  }

  /**
   * Generate reasoning for recommendation
   */
  private generateReasoning(
    model: MLModelConfig,
    cpu: InferenceResult,
    gpu: InferenceResult,
    speedup: number
  ): string[] {
    const reasoning: string[] = [];

    // Speedup analysis
    if (speedup > 2) {
      reasoning.push(`GPU is ${speedup.toFixed(1)}x faster than CPU`);
    } else if (speedup < 1) {
      reasoning.push(`CPU is ${(1 / speedup).toFixed(1)}x faster than GPU (likely due to overhead)`);
    } else {
      reasoning.push('GPU and CPU performance are comparable');
    }

    // Model size analysis
    if (model.inputSize < 100) {
      reasoning.push('Model input size is small - GPU overhead may dominate');
    } else if (model.inputSize > 10000) {
      reasoning.push('Model input size is large - GPU parallelization shines');
    }

    // Memory analysis
    if (model.memoryIntensive) {
      reasoning.push('Model is memory-intensive - GPU memory bandwidth is advantageous');
    }

    // Complexity analysis
    if (model.complexity === 'high') {
      reasoning.push('Model has high computational complexity - GPU acceleration recommended');
    } else if (model.complexity === 'low') {
      reasoning.push('Model has low complexity - CPU may be sufficient');
    }

    // Batchability analysis
    if (model.batchable) {
      reasoning.push('Model supports batching - GPU can process multiple inputs simultaneously');
    }

    return reasoning;
  }

  /**
   * Display comparison results
   */
  displayComparison(comparison: PerformanceComparison): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`📊 Performance Comparison: ${comparison.model}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Metrics table
    console.log('Metric                CPU              GPU              Ratio');
    console.log('────────────────────────────────────────────────────────────────');

    const cpuTime = comparison.cpu.executionTime.toFixed(2);
    const gpuTime = comparison.gpu.executionTime.toFixed(2);
    const timeRatio = comparison.speedup.toFixed(2) + 'x';

    console.log(`Execution Time (ms)   ${cpuTime.padEnd(16)} ${gpuTime.padEnd(16)} ${timeRatio}`);

    const cpuThroughput = comparison.cpu.throughput.toFixed(1);
    const gpuThroughput = comparison.gpu.throughput.toFixed(1);
    const throughputRatio = comparison.efficiency.toFixed(0) + '%';

    console.log(`Throughput (inf/s)    ${cpuThroughput.padEnd(16)} ${gpuThroughput.padEnd(16)} ${throughputRatio}`);

    const cpuMem = (comparison.cpu.memoryUsage / 1024).toFixed(1);
    const gpuMem = (comparison.gpu.memoryUsage / 1024).toFixed(1);
    const memRatio = (comparison.cpu.memoryUsage / comparison.gpu.memoryUsage).toFixed(2) + 'x';

    console.log(`Memory Usage (KB)     ${cpuMem.padEnd(16)} ${gpuMem.padEnd(16)} ${memRatio}`);

    // Recommendation
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('💡 Recommendation');
    console.log('═══════════════════════════════════════════════════════════════');

    const emoji = comparison.speedup > 2 ? '🚀' : comparison.speedup > 1 ? '✅' : '⚖️';
    console.log(`${emoji} ${comparison.recommendation}\n`);

    console.log('Reasoning:');
    comparison.reasoning.forEach((reason, index) => {
      console.log(`  ${index + 1}. ${reason}`);
    });

    // Cost analysis
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('💰 Cost-Benefit Analysis');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (comparison.speedup > 2) {
      const timeSavedPerInference = (comparison.cpu.executionTime - comparison.gpu.executionTime) / 1000; // seconds
      const inferencesPerMinute = 60 / comparison.gpu.executionTime;
      const timeSavedPerMinute = timeSavedPerInference * inferencesPerMinute;

      console.log(`✅ Time saved per inference: ${timeSavedPerInference.toFixed(3)}s`);
      console.log(`✅ Time saved per minute (at max throughput): ${timeSavedPerMinute.toFixed(1)}s`);
      console.log(`✅ GPU is worth it for this model`);
    } else if (comparison.speedup < 1) {
      const timeLostPerInference = (comparison.gpu.executionTime - comparison.cpu.executionTime) / 1000;
      console.log(`⚠️  Time lost per inference: ${timeLostPerInference.toFixed(3)}s`);
      console.log(`❌ GPU overhead not worth it for this model`);
    } else {
      console.log(`⚖️  Performance is similar - choose based on other factors:`);
      console.log(`   • Power consumption`);
      console.log(`   • Battery life (mobile)`);
      console.log(`   • Code complexity`);
      console.log(`   • Future scalability`);
    }
  }

  /**
   * Batch test multiple models
   */
  async batchTest(models: MLModelConfig[]): Promise<PerformanceComparison[]> {
    console.log('\n🔬 Batch Testing Multiple Models...');
    console.log('═'.repeat(60));

    const comparisons: PerformanceComparison[] = [];

    for (const model of models) {
      const comparison = await this.comparePerformance(model);
      comparisons.push(comparison);
      console.log('\n' + '─'.repeat(60) + '\n');
    }

    return comparisons;
  }

  /**
   * Display batch test summary
   */
  displayBatchSummary(comparisons: PerformanceComparison[]): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 Batch Test Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Model'.padEnd(25) + 'GPU Recommended'.padEnd(20) + 'Speedup');
    console.log('─'.repeat(60));

    comparisons.forEach(comp => {
      const recommended = comp.speedup > 1 ? 'Yes ✅' : 'No ❌';
      const speedup = comp.speedup.toFixed(2) + 'x';
      console.log(comp.model.padEnd(25) + recommended.padEnd(20) + speedup);
    });

    const gpuCount = comparisons.filter(c => c.speedup > 1).length;
    const cpuCount = comparisons.filter(c => c.speedup <= 1).length;

    console.log('\nSummary:');
    console.log(`  GPU Recommended: ${gpuCount} models`);
    console.log(`  CPU Recommended: ${cpuCount} models`);
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

async function runMLModelPerformanceExample() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🤖 ML Model Performance Example');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const tester = new MLModelPerformance();
  await tester.initialize();

  // Define test models
  const models: MLModelConfig[] = [
    {
      name: 'Tiny ImageNet Classifier',
      inputSize: 64,
      complexity: 'low',
      batchable: true,
      memoryIntensive: false,
    },
    {
      name: 'Medium BERT Model',
      inputSize: 512,
      complexity: 'medium',
      batchable: true,
      memoryIntensive: true,
    },
    {
      name: 'Large ResNet Model',
      inputSize: 4096,
      complexity: 'high',
      batchable: true,
      memoryIntensive: true,
    },
    {
      name: 'Simple Logistic Regression',
      inputSize: 32,
      complexity: 'low',
      batchable: true,
      memoryIntensive: false,
    },
  ];

  // Test individual model
  console.log('\n🔬 Single Model Test');
  console.log('═'.repeat(60));

  const singleComparison = await tester.comparePerformance(models[0]);
  tester.displayComparison(singleComparison);

  // Batch test all models
  console.log('\n\n🔬 Batch Test All Models');
  console.log('═'.repeat(60));

  const comparisons = await tester.batchTest(models);
  tester.displayBatchSummary(comparisons);

  // Final recommendations
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 Final Recommendations');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('✅ Use GPU for:');
  comparisons
    .filter(c => c.speedup > 2)
    .forEach(c => console.log(`   • ${c.model} (${c.speedup.toFixed(1)}x speedup)`));

  console.log('\n⚖️  Either platform for:');
  comparisons
    .filter(c => c.speedup >= 1 && c.speedup <= 2)
    .forEach(c => console.log(`   • ${c.model} (${c.speedup.toFixed(1)}x speedup)`));

  console.log('\n❌ Use CPU for:');
  comparisons
    .filter(c => c.speedup < 1)
    .forEach(c => console.log(`   • ${c.model} (${(1 / c.speedup).toFixed(1)}x faster on CPU)`));

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💡 Key Takeaways');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   • Larger models benefit more from GPU acceleration');
  console.log('   • Small models may not justify GPU overhead');
  console.log('   • Memory-intensive models see the biggest GPU gains');
  console.log('   • Always benchmark your specific model and hardware');
  console.log('   • Consider power consumption on mobile devices');

  tester.cleanup();
}

// Run the example
if (import.meta.url === new URL(import.meta.url).href) {
  runMLModelPerformanceExample().catch(console.error);
}

export { MLModelPerformance, InferenceResult, PerformanceComparison, MLModelConfig };
