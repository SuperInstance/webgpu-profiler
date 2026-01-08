/**
 * Browser-based GPU Profiler for WebGPU
 *
 * A comprehensive GPU profiling tool for WebGPU applications.
 * Monitor GPU utilization, track memory allocation, profile shader performance,
 * and benchmark GPU capabilities in real-time.
 */

// Main profiler
export {
  GPUProfiler,
  createGPUProfiler,
  isWebGPUAvailable,
  getGPUFeatures,
  getGPULimits,
  getQuickDeviceInfo,
} from './profiler.js';

// Device manager
export { GPUDeviceManager } from './device-manager.js';

// Metrics collector
export { GPUMetricsCollector } from './metrics.js';

// Benchmark suite
export {
  GPUBenchmarkRunner,
  exportBenchmarkResults,
  importBenchmarkResults,
} from './benchmarks.js';

// Types
export type {
  GPUDeviceInfo,
  GPUMetrics,
  GPUMemoryMetrics,
  GPUMemoryAllocation,
  GPUMemorySample,
  GPUShaderMetrics,
  GPUBenchmarkResult,
  GPUBenchmarkSuite as GPUBenchmarkSuiteType,
  GPUDeviceComparison,
  GPUProfilerConfig,
  GPUDeviceManagerConfig,
  GPUComputePipelineAnalysis,
  GPUPerformanceStats,
  GPUProfilerExport,
  GPUProfilerImport,
  GPUError,
  GPUProfilerState,
  GPUBenchmarkType,
  GPUMemoryUsage,
} from './types.js';

// Version
export const VERSION = '1.0.0';
