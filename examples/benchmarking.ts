/**
 * Benchmarking Example
 *
 * This example demonstrates comprehensive GPU benchmarking:
 * - Running the complete benchmark suite
 * - Running individual benchmarks
 * - Comparing results across devices
 * - Exporting and importing benchmark results
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

async function benchmarkingExample() {
  console.log('=== Browser GPU Profiler - Benchmarking ===\n');

  // 1. Create and initialize profiler
  const profiler = createGPUProfiler();

  try {
    console.log('Initializing profiler...');
    await profiler.initialize();
    console.log('✓ Profiler initialized\n');

    // 2. Get device info first
    console.log('--- GPU Information ---');
    const deviceInfo = profiler.getDeviceInfo();
    console.log(`Device: ${deviceInfo.vendor} ${deviceInfo.architecture}`);
    console.log(`Description: ${deviceInfo.description}`);
    console.log('');

    // 3. Run complete benchmark suite
    console.log('Running complete benchmark suite...');
    console.log('This may take a minute...\n');

    const suite = await profiler.runBenchmarks();

    console.log('✓ Benchmarks complete\n');

    // 4. Display overall results
    console.log('--- Overall Score ---');
    console.log(`Overall Score: ${suite.overallScore.toFixed(2)}`);
    console.log(`Benchmark Version: ${suite.version}`);
    console.log('');

    // 5. Display individual benchmark results
    console.log('--- Benchmark Results ---');
    suite.results.forEach((result) => {
      console.log(`${result.name}:`);
      console.log(`  Score: ${result.score.toFixed(2)} ${result.unit}`);
      console.log(`  Execution Time: ${result.executionTime.toFixed(2)} ms`);

      // Display additional metrics
      if (result.metrics) {
        console.log(`  Additional Metrics:`);
        Object.entries(result.metrics).forEach(([key, value]) => {
          if (typeof value === 'number') {
            console.log(`    ${key}: ${value.toFixed(2)}`);
          } else {
            console.log(`    ${key}: ${value}`);
          }
        });
      }
      console.log('');
    });

    // 6. Run individual benchmarks
    console.log('--- Individual Benchmarks ---');

    // Compute benchmark
    console.log('Running compute benchmark...');
    const computeResult = await profiler.runBenchmark('compute');
    console.log(`Compute Performance: ${computeResult.score.toFixed(2)} ${computeResult.unit}`);
    console.log('');

    // Memory bandwidth benchmark
    console.log('Running memory bandwidth benchmark...');
    const memoryResult = await profiler.runBenchmark('bandwidth');
    console.log(`Memory Bandwidth: ${memoryResult.score.toFixed(2)} ${memoryResult.unit}`);
    console.log('');

    // Latency benchmark
    console.log('Running latency benchmark...');
    const latencyResult = await profiler.runBenchmark('latency');
    console.log(`Command Latency: ${latencyResult.score.toFixed(2)} ${latencyResult.unit}`);
    console.log('');

    // 7. Export benchmark results
    console.log('--- Exporting Results ---');
    const exported = profiler.exportToString();
    console.log(`Exported ${exported.length} characters of JSON data`);

    // Save to localStorage or file
    try {
      localStorage.setItem('gpu-benchmark-results', exported);
      console.log('✓ Results saved to localStorage');
    } catch (error) {
      console.log('Note: Could not save to localStorage (可能被禁用)');
    }
    console.log('');

    // 8. Import and compare results (demo)
    console.log('--- Cross-Device Comparison Demo ---');

    // Simulate importing results from another device
    const importedData = profiler.import(exported);
    console.log(`Imported results from: ${importedData.device.description}`);
    console.log(`Benchmark timestamp: ${new Date(importedData.timestamp).toISOString()}`);

    const comparisons = profiler.compareWithImport(importedData);
    if (comparisons.length > 0) {
      console.log('\nComparison Results:');
      comparisons.forEach((comp) => {
        console.log(`\n  vs ${comp.device}:`);
        console.log(`    Relative Score: ${comp.relativeScore.toFixed(1)}%`);

        comp.results.forEach((result) => {
          console.log(`      ${result.name}: ${result.score.toFixed(2)} ${result.unit}`);
        });
      });
    }
    console.log('');

    // 9. Performance analysis
    console.log('--- Performance Analysis ---');

    const computeBenchmark = suite.results.find((r) => r.name === 'Compute Performance');
    const memoryBenchmark = suite.results.find((r) => r.name === 'Memory Bandwidth');
    const textureBenchmark = suite.results.find((r) => r.name === 'Texture Transfer');

    if (computeBenchmark && memoryBenchmark && textureBenchmark) {
      // Classify performance tier
      const computeScore = computeBenchmark.score;
      const memoryScore = memoryBenchmark.score;

      let tier = 'Mid-Range';
      if (computeScore > 1000 || memoryScore > 100) {
        tier = 'High-End';
      } else if (computeScore < 100 || memoryScore < 10) {
        tier = 'Entry-Level';
      }

      console.log(`Performance Tier: ${tier}`);
      console.log('');
      console.log('Recommendations:');

      if (computeScore < 100) {
        console.log('  - Consider optimizing compute shaders for better performance');
        console.log('  - Use workgroup sizes that match your GPU architecture');
      }

      if (memoryScore < 20) {
        console.log('  - Consider using texture compression to reduce bandwidth');
        console.log('  - Minimize buffer copies between GPU and CPU');
      }

      if (tier === 'High-End') {
        console.log('  - Your GPU has excellent performance for complex workloads');
        console.log('  - Consider advanced features like ray tracing or ML compute');
      }
    }
    console.log('');

    // 10. Cleanup
    console.log('Cleaning up...');
    profiler.cleanup();
    console.log('✓ Cleanup complete');

  } catch (error) {
    console.error('Error during benchmarking:', error);

    if (error instanceof Error) {
      if (error.message.includes('WebGPU')) {
        console.error('\n💡 WebGPU is not available in this browser.');
        console.error('   Please use Chrome 113+ or Edge 113+ with WebGPU enabled.');
      }
    }
  }
}

// Run the example
benchmarkingExample().catch(console.error);
