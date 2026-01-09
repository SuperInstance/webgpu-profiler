/**
 * GPU Profiler CLI Example
 *
 * This example demonstrates a command-line interface for GPU profiling:
 * - Automated benchmarking suite
 * - CI/CD integration
 * - Performance regression testing
 * - Export results in multiple formats
 *
 * Use Case: "Automated GPU performance testing in CI/CD pipelines"
 *
 * Keywords: GPU profiler CLI, automated benchmarking, CI/CD GPU testing, performance regression, GPU automation
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

interface BenchmarkConfig {
  name: string;
  description: string;
  duration: number; // milliseconds
  targetFps?: number;
  maxFrameTime?: number; // milliseconds
}

interface BenchmarkResult {
  name: string;
  passed: boolean;
  metrics: {
    avgFps: number;
    minFps: number;
    maxFps: number;
    avgFrameTime: number;
    totalFrames: number;
    memoryUsed: number;
  };
  timestamp: string;
  deviceInfo: any;
}

interface TestSuite {
  name: string;
  benchmarks: BenchmarkConfig[];
}

class GPUProfilerCLI {
  private profiler: any;
  private results: BenchmarkResult[] = [];

  // Predefined test suites
  private static readonly TEST_SUITES: TestSuite[] = [
    {
      name: 'quick-smoke-test',
      benchmarks: [
        {
          name: 'idle-test',
          description: 'Baseline idle performance',
          duration: 1000,
        },
        {
          name: 'light-load',
          description: 'Light rendering load',
          duration: 2000,
          targetFps: 60,
        },
      ],
    },
    {
      name: 'standard-performance',
      benchmarks: [
        {
          name: 'baseline',
          description: 'Baseline performance measurement',
          duration: 5000,
          targetFps: 60,
        },
        {
          name: 'sustained-load',
          description: 'Sustained load test',
          duration: 10000,
          targetFps: 60,
          maxFrameTime: 16.67,
        },
        {
          name: 'memory-test',
          description: 'Memory allocation test',
          duration: 5000,
        },
      ],
    },
    {
      name: 'comprehensive',
      benchmarks: [
        {
          name: 'idle',
          description: 'Idle performance',
          duration: 2000,
        },
        {
          name: 'light',
          description: 'Light load (30% GPU)',
          duration: 3000,
          targetFps: 60,
        },
        {
          name: 'medium',
          description: 'Medium load (50% GPU)',
          duration: 5000,
          targetFps: 60,
        },
        {
          name: 'heavy',
          description: 'Heavy load (80% GPU)',
          duration: 5000,
          targetFps: 30,
          maxFrameTime: 33.33,
        },
        {
          name: 'sustained',
          description: 'Sustained heavy load',
          duration: 15000,
          targetFps: 30,
        },
        {
          name: 'memory-stress',
          description: 'Memory stress test',
          duration: 5000,
        },
      ],
    },
  ];

  async initialize() {
    this.profiler = createGPUProfiler({
      enableMonitoring: true,
      monitoringInterval: 100,
      enableMemoryTracking: true,
      enableShaderProfiling: true,
    });

    await this.profiler.initialize();
    console.log('✅ GPU Profiler CLI initialized\n');
  }

  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    console.log(`🧪 Running: ${config.name}`);
    console.log(`   Description: ${config.description}`);
    console.log(`   Duration: ${config.duration}ms`);

    if (config.targetFps) {
      console.log(`   Target FPS: ${config.targetFps}`);
    }
    if (config.maxFrameTime) {
      console.log(`   Max Frame Time: ${config.maxFrameTime}ms`);
    }

    // Start profiling
    this.profiler.start();

    // Simulate workload (in real usage, this would be your actual rendering/compute)
    const device = this.profiler.getDevice();

    // Create a simple compute workload
    const shaderModule = device.createShaderModule({
      code: `
        @compute @workgroup_size(64)
        fn main(@builtin(global_invocation_id) id: vec3<u32>) {
          var result: f32 = 0.0;
          for (var i: u32 = 0; i < 100; i++) {
            result += f32(i) * 0.01;
          }
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

    // Run workload for the specified duration
    const startTime = Date.now();
    let frameCount = 0;

    while (Date.now() - startTime < config.duration) {
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.dispatchWorkgroups(100); // Sustained workload
      pass.end();
      device.queue.submit([encoder.finish()]);

      frameCount++;

      // Small delay to avoid 100% CPU
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    // Stop profiling
    this.profiler.stop();

    // Collect metrics
    const stats = this.profiler.getPerformanceStats();
    const metrics = this.profiler.getCurrentMetrics();
    const deviceInfo = this.profiler.getDeviceInfo();

    // Check if benchmarks passed
    let passed = true;
    if (config.targetFps && stats.avgFps < config.targetFps) {
      passed = false;
    }
    if (config.maxFrameTime && stats.avgFrameTime > config.maxFrameTime) {
      passed = false;
    }

    const result: BenchmarkResult = {
      name: config.name,
      passed,
      metrics: {
        avgFps: stats.avgFps,
        minFps: stats.minFps,
        maxFps: stats.maxFps,
        avgFrameTime: stats.avgFrameTime,
        totalFrames: stats.totalFrames,
        memoryUsed: metrics.memoryUsed,
      },
      timestamp: new Date().toISOString(),
      deviceInfo,
    };

    this.results.push(result);

    // Print result
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   Result: ${status}`);
    console.log(`   FPS: ${result.metrics.avgFps.toFixed(2)} (min: ${result.metrics.minFps.toFixed(2)}, max: ${result.metrics.maxFps.toFixed(2)})`);
    console.log(`   Frame Time: ${result.metrics.avgFrameTime.toFixed(2)}ms`);
    console.log(`   Memory: ${(result.metrics.memoryUsed / 1024 / 1024).toFixed(2)} MB\n`);

    return result;
  }

  async runTestSuite(suiteName: string): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Running Test Suite: ${suiteName}`);
    console.log(`${'='.repeat(60)}\n`);

    const suite = GPUProfilerCLI.TEST_SUITES.find(s => s.name === suiteName);

    if (!suite) {
      console.error(`❌ Test suite '${suiteName}' not found`);
      console.log('\nAvailable test suites:');
      GPUProfilerCLI.TEST_SUITES.forEach(s => console.log(`  - ${s.name}`));
      return;
    }

    const suiteStartTime = Date.now();

    for (const benchmark of suite.benchmarks) {
      await this.runBenchmark(benchmark);
    }

    const suiteDuration = ((Date.now() - suiteStartTime) / 1000).toFixed(1);

    // Print suite summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Test Suite Summary: ${suiteName}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Duration: ${suiteDuration}s`);
    console.log(`Total: ${this.results.length} tests`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
    console.log(`Success Rate: ${((passed / this.results.length) * 100).toFixed(0)}%`);
    console.log(`${'='.repeat(60)}\n`);

    if (failed > 0) {
      console.log('❌ Failed tests:');
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}`);
        console.log(`    Expected FPS: ${suite.benchmarks.find(b => b.name === r.name)?.targetFps || 'N/A'}`);
        console.log(`    Actual FPS: ${r.metrics.avgFps.toFixed(2)}`);
      });
      console.log('');
    }
  }

  exportResults(format: 'json' | 'csv' | 'markdown' = 'json'): string {
    console.log(`📤 Exporting results in ${format.toUpperCase()} format...\n`);

    if (format === 'json') {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        deviceInfo: this.results[0]?.deviceInfo,
        results: this.results,
      }, null, 2);
    }

    if (format === 'csv') {
      const headers = ['Name', 'Passed', 'Avg FPS', 'Min FPS', 'Max FPS', 'Avg Frame Time', 'Memory (MB)', 'Timestamp'];
      const rows = this.results.map(r => [
        r.name,
        r.passed ? 'PASS' : 'FAIL',
        r.metrics.avgFps.toFixed(2),
        r.metrics.minFps.toFixed(2),
        r.metrics.maxFps.toFixed(2),
        r.metrics.avgFrameTime.toFixed(2),
        (r.metrics.memoryUsed / 1024 / 1024).toFixed(2),
        r.timestamp,
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    if (format === 'markdown') {
      let md = '# GPU Profiler Benchmark Results\n\n';
      md += `**Timestamp:** ${new Date().toISOString()}\n\n`;
      md += `**Device:** ${this.results[0]?.deviceInfo.description}\n\n`;
      md += '## Results\n\n';
      md += '| Test | Status | Avg FPS | Min FPS | Max FPS | Frame Time | Memory |\n';
      md += '|------|--------|---------|---------|---------|------------|--------|\n';

      this.results.forEach(r => {
        md += `| ${r.name} | ${r.passed ? '✅' : '❌'} | ${r.metrics.avgFps.toFixed(2)} | ${r.metrics.minFps.toFixed(2)} | ${r.metrics.maxFps.toFixed(2)} | ${r.metrics.avgFrameTime.toFixed(2)}ms | ${(r.metrics.memoryUsed / 1024 / 1024).toFixed(2)}MB |\n`;
      });

      return md;
    }

    return '';
  }

  saveResults(filename: string, format: 'json' | 'csv' | 'markdown' = 'json'): void {
    const data = this.exportResults(format);

    // In a browser environment, we'd create a download link
    // For Node.js/CI, we'd write to filesystem
    if (typeof window !== 'undefined') {
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    console.log(`💾 Results saved to ${filename}`);
  }

  cleanup(): void {
    this.profiler.cleanup();
    console.log('✅ Cleanup complete');
  }
}

// Command-line interface simulation
class CLICommands {
  private cli: GPUProfilerCLI;

  constructor() {
    this.cli = new GPUProfilerCLI();
  }

  async execute(args: string[]): Promise<void> {
    await this.cli.initialize();

    const command = args[0];

    switch (command) {
      case 'run':
        await this.runTest(args[1]);
        break;

      case 'list':
        this.listTestSuites();
        break;

      case 'export':
        await this.exportResults(args[1], args[2] as any);
        break;

      case 'help':
        this.printHelp();
        break;

      default:
        console.log(`Unknown command: ${command}`);
        this.printHelp();
    }

    this.cli.cleanup();
  }

  private async runTest(suiteName: string): Promise<void> {
    if (!suiteName) {
      console.log('Please specify a test suite');
      this.listTestSuites();
      return;
    }

    await this.cli.runTestSuite(suiteName);

    // Auto-export results
    const filename = `gpu-benchmark-${suiteName}-${Date.now()}.json`;
    this.cli.saveResults(filename, 'json');
  }

  private listTestSuites(): void {
    console.log('\n📋 Available Test Suites:\n');
    GPUProfilerCLI.TEST_SUITES.forEach(suite => {
      console.log(`${suite.name}:`);
      console.log(`  Description: ${suite.name}`);
      console.log(`  Benchmarks: ${suite.benchmarks.length}`);
      suite.benchmarks.forEach(b => {
        console.log(`    - ${b.name}: ${b.description}`);
      });
      console.log('');
    });
  }

  private async exportResults(suiteName: string, format: string = 'json'): Promise<void> {
    await this.cli.runTestSuite(suiteName);

    const filename = `gpu-benchmark-${suiteName}-${Date.now()}.${format}`;
    this.cli.saveResults(filename, format as any);

    console.log('\n' + this.cli.exportResults(format as any));
  }

  private printHelp(): void {
    console.log(`
GPU Profiler CLI - Usage:

  run <suite>          Run a test suite
  list                 List all available test suites
  export <suite> <fmt> Run suite and export results (json|csv|markdown)
  help                 Show this help message

Test Suites:
  quick-smoke-test     Quick smoke test (2 benchmarks, ~3s)
  standard-performance Standard performance test (3 benchmarks, ~25s)
  comprehensive        Comprehensive test suite (6 benchmarks, ~40s)

Examples:
  run quick-smoke-test
  export standard-performance csv
  list
    `);
  }
}

// Example usage functions
async function runQuickSmokeTest() {
  console.log('=== GPU Profiler CLI - Quick Smoke Test ===\n');

  const cli = new GPUProfilerCLI();
  await cli.initialize();

  await cli.runTestSuite('quick-smoke-test');

  console.log(cli.exportResults('json'));

  cli.cleanup();
}

async function runCIBenchmark() {
  console.log('=== GPU Profiler CLI - CI/CD Pipeline ===\n');

  const cli = new GPUProfilerCLI();
  await cli.initialize();

  // Run standard performance suite
  await cli.runTestSuite('standard-performance');

  // Export in multiple formats for CI
  cli.saveResults(`benchmark-${Date.now()}.json`, 'json');
  cli.saveResults(`benchmark-${Date.now()}.csv`, 'csv');

  // Check if any tests failed
  const failed = cli['results'].filter((r: BenchmarkResult) => !r.passed).length;

  if (failed > 0) {
    console.error(`\n❌ CI/CD FAILED: ${failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log('\n✅ CI/CD PASSED: All tests passed');
    process.exit(0);
  }

  cli.cleanup();
}

async function runComprehensiveBenchmark() {
  console.log('=== GPU Profiler CLI - Comprehensive Benchmark ===\n');

  const cli = new GPUProfilerCLI();
  await cli.initialize();

  await cli.runTestSuite('comprehensive');

  // Generate comprehensive report
  console.log(cli.exportResults('markdown'));

  cli.saveResults(`comprehensive-${Date.now()}.md`, 'markdown');

  cli.cleanup();
}

// Export functions
export { GPUProfilerCLI, CLICommands, runQuickSmokeTest, runCIBenchmark, runComprehensiveBenchmark };

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).runQuickSmokeTest = runQuickSmokeTest;
  (window as any).runCIBenchmark = runCIBenchmark;
  (window as any).runComprehensiveBenchmark = runComprehensiveBenchmark;

  const cli = new CLICommands();
  (window as any).gpuProfilerCLI = (args: string[]) => cli.execute(args);

  console.log('📝 GPU Profiler CLI - Available commands:');
  console.log('  - runQuickSmokeTest()');
  console.log('  - runCIBenchmark()');
  console.log('  - runComprehensiveBenchmark()');
  console.log('  - gpuProfilerCLI(["run", "quick-smoke-test"])');
  console.log('  - gpuProfilerCLI(["list"])');
}
