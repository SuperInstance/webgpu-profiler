/**
 * WebGPU Shader Optimizer Example
 *
 * This example demonstrates how to profile WebGPU compute shaders to identify
 * performance bottlenecks and optimization opportunities. It helps ML engineers
 * and game developers understand which shaders are consuming the most GPU time.
 *
 * Use Case: "My ML model is slow, which shader is the bottleneck?"
 *
 * Features:
 * - Automatic shader execution timing
 * - Bottleneck identification
 * - Optimization suggestions
 * - Comparative analysis between shader versions
 * - Workgroup size optimization recommendations
 *
 * SEO Keywords: shader performance optimization, WebGPU benchmarking,
 * debug GPU bottlenecks, compute shader profiling, GPU performance tuning
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

interface ShaderProfile {
  id: string;
  entryPoint: string;
  avgExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  invocations: number;
  bottlenecks: string[];
  timestamp: number;
}

interface OptimizationSuggestion {
  shaderId: string;
  type: 'workgroup-size' | 'memory' | 'coalescing' | 'divergence' | 'general';
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  expectedImprovement: string;
}

interface ComparisonResult {
  shaderId: string;
  baseline: number;
  optimized: number;
  improvement: number;
  speedup: string;
}

class ShaderOptimizer {
  private profiler: ReturnType<typeof createGPUProfiler>;
  private shaderProfiles: Map<string, ShaderProfile> = new Map();
  private baselineProfiles: Map<string, ShaderProfile> = new Map();
  private optimizationThresholds = {
    slowExecution: 1000, // microseconds
    highVariance: 0.3, // 30% variance
    frequentInvocation: 100, // invocations
  };

  constructor() {
    this.profiler = createGPUProfiler({
      enableShaderProfiling: true,
      enableMonitoring: false,
      enableMemoryTracking: true,
    });
  }

  /**
   * Initialize the optimizer
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Shader Optimizer...');

    try {
      await this.profiler.initialize();

      const deviceInfo = this.profiler.getDeviceInfo();
      console.log('✅ Optimizer initialized');
      console.log(`🎯 GPU: ${deviceInfo.vendor} ${deviceInfo.architecture}`);
      console.log(`⚡ Compute: ${deviceInfo.features.includes('shader-f16') ? 'FP16 supported' : 'FP32 only'}`);

    } catch (error) {
      console.error('❌ Failed to initialize optimizer:', error);
      throw error;
    }
  }

  /**
   * Profile a shader execution
   */
  profileShader(
    shaderId: string,
    entryPoint: string,
    execute: () => Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();

      execute()
        .then(() => {
          const executionTime = (performance.now() - startTime) * 1000; // Convert to microseconds

          // Track with profiler
          this.profiler.trackShader(shaderId, entryPoint, executionTime);

          // Store in our profiles
          const existingProfile = this.shaderProfiles.get(shaderId);
          const profile: ShaderProfile = {
            id: shaderId,
            entryPoint,
            avgExecutionTime: existingProfile
              ? (existingProfile.avgExecutionTime * existingProfile.invocations + executionTime) / (existingProfile.invocations + 1)
              : executionTime,
            minExecutionTime: existingProfile
              ? Math.min(existingProfile.minExecutionTime, executionTime)
              : executionTime,
            maxExecutionTime: existingProfile
              ? Math.max(existingProfile.maxExecutionTime, executionTime)
              : executionTime,
            invocations: (existingProfile?.invocations || 0) + 1,
            bottlenecks: existingProfile?.bottlenecks || [],
            timestamp: Date.now(),
          };

          this.shaderProfiles.set(shaderId, profile);

          // Analyze for bottlenecks
          this.analyzeBottlenecks(profile);

          console.log(`📊 Shader '${shaderId}' executed in ${executionTime.toFixed(2)} μs`);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Analyze shader for bottlenecks
   */
  private analyzeBottlenecks(profile: ShaderProfile): void {
    const bottlenecks: string[] = [];

    // Check execution time
    if (profile.avgExecutionTime > this.optimizationThresholds.slowExecution) {
      bottlenecks.push('High execution time - consider optimizing algorithm or workgroup size');
    }

    // Check variance (indicates instability or resource contention)
    const variance = (profile.maxExecutionTime - profile.minExecutionTime) / profile.avgExecutionTime;
    if (variance > this.optimizationThresholds.highVariance) {
      bottlenecks.push('High execution time variance - possible resource contention or synchronization issues');
    }

    // Check invocation frequency
    if (profile.invocations > this.optimizationThresholds.frequentInvocation) {
      if (profile.avgExecutionTime > 500) {
        bottlenecks.push('Frequently called with moderate execution time - consider caching or batching');
      }
    }

    profile.bottlenecks = bottlenecks;
    this.shaderProfiles.set(profile.id, profile);
  }

  /**
   * Get optimization suggestions for a shader
   */
  getOptimizationSuggestions(shaderId: string): OptimizationSuggestion[] {
    const profile = this.shaderProfiles.get(shaderId);
    if (!profile) {
      return [];
    }

    const suggestions: OptimizationSuggestion[] = [];

    // High execution time suggestions
    if (profile.avgExecutionTime > this.optimizationThresholds.slowExecution) {
      suggestions.push({
        shaderId,
        type: 'general',
        priority: 'high',
        suggestion: 'Shader execution time is high. Consider reducing work complexity or splitting into multiple passes.',
        expectedImprovement: '20-50% reduction',
      });

      suggestions.push({
        shaderId,
        type: 'workgroup-size',
        priority: 'high',
        suggestion: 'Experiment with different workgroup sizes. Try powers of 2 (32, 64, 128, 256)',
        expectedImprovement: '10-30% reduction',
      });
    }

    // Memory-related suggestions
    if (profile.bottlenecks.some(b => b.includes('variance'))) {
      suggestions.push({
        shaderId,
        type: 'memory',
        priority: 'medium',
        suggestion: 'High time variance suggests memory access patterns. Consider using shared memory or improving memory coalescing.',
        expectedImprovement: '15-40% reduction',
      });
    }

    // Frequent invocation suggestions
    if (profile.invocations > this.optimizationThresholds.frequentInvocation) {
      suggestions.push({
        shaderId,
        type: 'coalescing',
        priority: 'medium',
        suggestion: 'Shader is called frequently. Consider batch processing or reducing call frequency.',
        expectedImprovement: '10-25% reduction',
      });
    }

    return suggestions;
  }

  /**
   * Get all optimization suggestions
   */
  getAllOptimizationSuggestions(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    for (const shaderId of this.shaderProfiles.keys()) {
      suggestions.push(...this.getOptimizationSuggestions(shaderId));
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return suggestions;
  }

  /**
   * Capture baseline profile for comparison
   */
  captureBaseline(shaderId: string): void {
    const profile = this.shaderProfiles.get(shaderId);
    if (profile) {
      this.baselineProfiles.set(shaderId, { ...profile });
      console.log(`📸 Baseline captured for shader '${shaderId}'`);
    }
  }

  /**
   * Compare current performance with baseline
   */
  compareWithBaseline(shaderId: string): ComparisonResult | null {
    const baseline = this.baselineProfiles.get(shaderId);
    const current = this.shaderProfiles.get(shaderId);

    if (!baseline || !current) {
      return null;
    }

    const improvement = ((baseline.avgExecutionTime - current.avgExecutionTime) / baseline.avgExecutionTime) * 100;
    const speedup = baseline.avgExecutionTime / current.avgExecutionTime;

    return {
      shaderId,
      baseline: baseline.avgExecutionTime,
      optimized: current.avgExecutionTime,
      improvement,
      speedup: speedup.toFixed(2) + 'x',
    };
  }

  /**
   * Get all comparisons
   */
  getAllComparisons(): ComparisonResult[] {
    const comparisons: ComparisonResult[] = [];

    for (const shaderId of this.baselineProfiles.keys()) {
      const comparison = this.compareWithBaseline(shaderId);
      if (comparison) {
        comparisons.push(comparison);
      }
    }

    return comparisons;
  }

  /**
   * Get shader profile
   */
  getShaderProfile(shaderId: string): ShaderProfile | undefined {
    return this.shaderProfiles.get(shaderId);
  }

  /**
   * Get all shader profiles sorted by execution time
   */
  getSortedProfiles(): ShaderProfile[] {
    return Array.from(this.shaderProfiles.values()).sort(
      (a, b) => b.avgExecutionTime - a.avgExecutionTime
    );
  }

  /**
   * Display optimization report
   */
  displayOptimizationReport(): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 Shader Optimization Report');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const profiles = this.getSortedProfiles();

    if (profiles.length === 0) {
      console.log('No shader profiles available. Run shaders first.');
      return;
    }

    console.log(`🎯 Total Shaders Profiled: ${profiles.length}\n`);

    // Top 5 slowest shaders
    console.log('🐌 Top 5 Slowest Shaders:');
    console.log('───────────────────────────────────────────────────────────────');

    profiles.slice(0, 5).forEach((profile, index) => {
      console.log(`\n${index + 1}. ${profile.id} (${profile.entryPoint})`);
      console.log(`   Average Time: ${profile.avgExecutionTime.toFixed(2)} μs`);
      console.log(`   Range: ${profile.minExecutionTime.toFixed(2)} - ${profile.maxExecutionTime.toFixed(2)} μs`);
      console.log(`   Invocations: ${profile.invocations}`);

      if (profile.bottlenecks.length > 0) {
        console.log('   Bottlenecks:');
        profile.bottlenecks.forEach(b => console.log(`     ⚠️  ${b}`));
      }
    });

    // Optimization suggestions
    const suggestions = this.getAllOptimizationSuggestions();
    if (suggestions.length > 0) {
      console.log('\n\n💡 Optimization Suggestions:');
      console.log('───────────────────────────────────────────────────────────────');

      suggestions.slice(0, 10).forEach((suggestion, index) => {
        const emoji = suggestion.priority === 'high' ? '🔴' : suggestion.priority === 'medium' ? '🟡' : '🟢';
        console.log(`\n${emoji} ${index + 1}. [${suggestion.type.toUpperCase()}] ${suggestion.shaderId}`);
        console.log(`   Priority: ${suggestion.priority.toUpperCase()}`);
        console.log(`   Suggestion: ${suggestion.suggestion}`);
        console.log(`   Expected Improvement: ${suggestion.expectedImprovement}`);
      });
    }

    // Comparison with baseline
    const comparisons = this.getAllComparisons();
    if (comparisons.length > 0) {
      console.log('\n\n📈 Performance Comparison (Baseline vs Current):');
      console.log('───────────────────────────────────────────────────────────────');

      comparisons.forEach(comp => {
        const emoji = comp.improvement > 0 ? '✅' : '❌';
        const change = comp.improvement > 0 ? '+' : '';
        console.log(`${emoji} ${comp.shaderId}:`);
        console.log(`   Baseline: ${comp.baseline.toFixed(2)} μs`);
        console.log(`   Current: ${comp.optimized.toFixed(2)} μs`);
        console.log(`   Improvement: ${change}${comp.improvement.toFixed(2)}% (${comp.speedup} speedup)`);
      });
    }
  }

  /**
   * Export optimizer data
   */
  exportData(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      profiles: Array.from(this.shaderProfiles.values()),
      baselines: Array.from(this.baselineProfiles.values()),
      suggestions: this.getAllOptimizationSuggestions(),
      comparisons: this.getAllComparisons(),
    }, null, 2);
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

async function runShaderOptimizerExample() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔧 WebGPU Shader Optimizer Example');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const optimizer = new ShaderOptimizer();
  await optimizer.initialize();

  const device = optimizer.profiler.getDevice();

  // Example 1: Matrix multiplication shader
  console.log('📦 Example 1: Matrix Multiplication Shader');

  const matrixMultiplyShader = `
    @group(0) @binding(0) var<storage, read> matrixA: array<array<f32, 256>, 256>;
    @group(0) @binding(1) var<storage, read> matrixB: array<array<f32, 256>, 256>;
    @group(0) @binding(2) var<storage, read_write> result: array<array<f32, 256>, 256>;

    @compute @workgroup_size(16, 16)
    fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
      let row = global_id.x;
      let col = global_id.y;

      if (row >= 256u || col >= 256u) {
        return;
      }

      var sum = 0.0;
      for (var k = 0u; k < 256u; k++) {
        sum += matrixA[row][k] * matrixB[k][col];
      }
      result[row][col] = sum;
    }
  `;

  const shaderModule = device.createShaderModule({ code: matrixMultiplyShader });

  // Simulate shader execution
  for (let i = 0; i < 20; i++) {
    await optimizer.profileShader('matrix-multiply', 'main', async () => {
      // Simulate matrix multiplication work
      await simulateWork(0.5 + Math.random() * 0.3); // 500-800μs
    });
  }

  // Capture baseline
  optimizer.captureBaseline('matrix-multiply');

  // Example 2: Image processing shader
  console.log('\n🖼️  Example 2: Image Processing Shader');

  for (let i = 0; i < 15; i++) {
    await optimizer.profileShader('image-filter', 'process', async () => {
      await simulateWork(0.8 + Math.random() * 0.4); // 800-1200μs
    });
  }

  optimizer.captureBaseline('image-filter');

  // Example 3: ML inference shader
  console.log('\n🤖 Example 3: ML Inference Shader');

  for (let i = 0; i < 30; i++) {
    await optimizer.profileShader('ml-inference', 'infer', async () => {
      await simulateWork(1.2 + Math.random() * 0.5); // 1200-1700μs
    });
  }

  optimizer.captureBaseline('ml-inference');

  // Display report
  optimizer.displayOptimizationReport();

  // Simulate optimizations and re-profile
  console.log('\n\n🔄 Simulating Optimizations...\n');

  // "Optimized" versions (simulated faster execution)
  for (let i = 0; i < 20; i++) {
    await optimizer.profileShader('matrix-multiply', 'main', async () => {
      await simulateWork(0.3 + Math.random() * 0.2); // 300-500μs (optimized)
    });
  }

  for (let i = 0; i < 15; i++) {
    await optimizer.profileShader('image-filter', 'process', async () => {
      await simulateWork(0.5 + Math.random() * 0.3); // 500-800μs (optimized)
    });
  }

  for (let i = 0; i < 30; i++) {
    await optimizer.profileShader('ml-inference', 'infer', async () => {
      await simulateWork(0.8 + Math.random() * 0.4); // 800-1200μs (optimized)
    });
  }

  // Display updated report with comparisons
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Updated Report (After Optimizations)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  optimizer.displayOptimizationReport();

  // Export data
  console.log('\n💾 Optimization data exported');

  optimizer.cleanup();
}

function simulateWork(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the example
if (import.meta.url === new URL(import.meta.url).href) {
  runShaderOptimizerExample().catch(console.error);
}

export { ShaderOptimizer, ShaderProfile, OptimizationSuggestion, ComparisonResult };
