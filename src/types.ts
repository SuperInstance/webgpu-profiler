/**
 * GPU device information
 */
export interface GPUDeviceInfo {
  /** Vendor name (e.g., 'NVIDIA', 'AMD', 'Intel') */
  vendor: string;
  /** Device/architecture name */
  architecture: string;
  /** Device description */
  description: string;
  /** WebGPU adapter info */
  adapterInfo: GPUAdapterInfo;
  /** Supported features */
  features: string[];
  /** Supported limits */
  limits: GPUSupportedLimits;
}

/**
 * Real-time GPU utilization metrics
 */
export interface GPUMetrics {
  /** Timestamp of measurement */
  timestamp: number;
  /** GPU utilization percentage (0-100) */
  utilization: number;
  /** Memory usage in bytes */
  memoryUsed: number;
  /** Total memory available in bytes */
  memoryTotal: number;
  /** Memory usage percentage (0-100) */
  memoryPercentage: number;
  /** Power usage in watts (if available) */
  powerUsage?: number;
  /** Temperature in Celsius (if available) */
  temperature?: number;
  /** Clock speed in MHz */
  clockSpeed?: number;
  /** Frame time in milliseconds */
  frameTime: number;
  /** Frames per second */
  fps: number;
  /** Compute time in milliseconds */
  computeTime: number;
}

/**
 * Memory allocation tracking
 */
export interface GPUMemoryMetrics {
  /** Buffer memory usage in bytes */
  bufferMemory: number;
  /** Texture memory usage in bytes */
  textureMemory: number;
  /** Total allocated memory in bytes */
  totalAllocated: number;
  /** Memory allocation by resource */
  allocations: Map<string, GPUMemoryAllocation>;
  /** Memory allocation history */
  history: GPUMemorySample[];
}

/**
 * Individual memory allocation
 */
export interface GPUMemoryAllocation {
  /** Resource identifier */
  id: string;
  /** Resource type */
  type: 'buffer' | 'texture';
  /** Size in bytes */
  size: number;
  /** Allocation timestamp */
  timestamp: number;
  /** Usage flags */
  usage: number;
  /** Whether still allocated */
  active: boolean;
}

/**
 * Memory sample for history tracking
 */
export interface GPUMemorySample {
  timestamp: number;
  bufferMemory: number;
  textureMemory: number;
  totalAllocated: number;
}

/**
 * Shader performance metrics
 */
export interface GPUShaderMetrics {
  /** Shader module identifier */
  shaderId: string;
  /** Entry point name */
  entryPoint: string;
  /** Average execution time in microseconds */
  avgExecutionTime: number;
  /** Minimum execution time in microseconds */
  minExecutionTime: number;
  /** Maximum execution time in microseconds */
  maxExecutionTime: number;
  /** Total invocations */
  invocations: number;
  /** Last execution timestamp */
  lastExecution: number;
  /** Identified bottlenecks */
  bottlenecks: string[];
}

/**
 * Benchmark result
 */
export interface GPUBenchmarkResult {
  /** Benchmark name */
  name: string;
  /** Benchmark description */
  description: string;
  /** Score (higher is better) */
  score: number;
  /** Unit of measurement */
  unit: string;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Additional metrics */
  metrics: Record<string, number>;
  /** Timestamp */
  timestamp: number;
}

/**
 * Comprehensive benchmark suite results
 */
export interface GPUBenchmarkSuite {
  /** Device information */
  device: GPUDeviceInfo;
  /** Overall score (normalized 0-100) */
  overallScore: number;
  /** Individual benchmark results */
  results: GPUBenchmarkResult[];
  /** Comparison with other devices */
  comparisons?: GPUDeviceComparison[];
  /** Benchmark timestamp */
  timestamp: number;
  /** Benchmark version */
  version: string;
}

/**
 * Device comparison data
 */
export interface GPUDeviceComparison {
  /** Device name */
  device: string;
  /** Relative score (percentage) */
  relativeScore: number;
  /** Benchmark results */
  results: GPUBenchmarkResult[];
  /** Timestamp of comparison */
  timestamp: number;
}

/**
 * Profiler configuration
 */
export interface GPUProfilerConfig {
  /** Enable real-time monitoring */
  enableMonitoring?: boolean;
  /** Monitoring update interval in milliseconds */
  monitoringInterval?: number;
  /** Enable memory tracking */
  enableMemoryTracking?: boolean;
  /** Enable shader profiling */
  enableShaderProfiling?: boolean;
  /** Maximum history size */
  maxHistorySize?: number;
  /** Callback for metrics updates */
  onMetricsUpdate?: (metrics: GPUMetrics) => void;
  /** Callback for memory updates */
  onMemoryUpdate?: (memory: GPUMemoryMetrics) => void;
  /** Callback for shader metrics */
  onShaderMetrics?: (shader: GPUShaderMetrics) => void;
}

/**
 * WebGPU device manager configuration
 */
export interface GPUDeviceManagerConfig {
  /** Required features */
  requiredFeatures?: string[];
  /** Required limits */
  requiredLimits?: Record<string, number>;
  /** Request adapter options */
  adapterOptions?: any;
  /** Request device options */
  deviceOptions?: any;
}

/**
 * Compute pipeline analysis
 */
export interface GPUComputePipelineAnalysis {
  /** Pipeline identifier */
  pipelineId: string;
  /** Shader module */
  shaderModule: string;
  /** Entry point */
  entryPoint: string;
  /** Bind group layout */
  bindGroupLayout: any;
  /** Compute pipeline descriptor */
  pipelineDescriptor: any;
  /** Performance metrics */
  metrics: GPUShaderMetrics;
  /** Resource usage */
  resources: {
    workgroupSize: [number, number, number];
    workgroupsPerDispatch: [number, number, number];
    totalWorkgroups: number;
  };
}

/**
 * Performance statistics
 */
export interface GPUPerformanceStats {
  /** Total frames rendered */
  totalFrames: number;
  /** Average FPS */
  avgFps: number;
  /** Minimum FPS */
  minFps: number;
  /** Maximum FPS */
  maxFps: number;
  /** Average frame time (ms) */
  avgFrameTime: number;
  /** Frame time percentiles */
  frameTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  /** Total compute time (ms) */
  totalComputeTime: number;
  /** Average compute time (ms) */
  avgComputeTime: number;
  /** Timestamp of first sample */
  startTime: number;
  /** Timestamp of last sample */
  endTime: number;
}

/**
 * Export format for metrics and benchmarks
 */
export interface GPUProfilerExport {
  /** Export format version */
  version: string;
  /** Export timestamp */
  timestamp: number;
  /** Device information */
  device: GPUDeviceInfo;
  /** Performance metrics */
  metrics?: GPUMetrics[];
  /** Memory metrics */
  memory?: GPUMemoryMetrics;
  /** Shader metrics */
  shaderMetrics?: GPUShaderMetrics[];
  /** Benchmark results */
  benchmarks?: GPUBenchmarkSuite[];
  /** Performance statistics */
  stats?: GPUPerformanceStats;
}

/**
 * Import data for comparison
 */
export interface GPUProfilerImport {
  /** Imported device information */
  device: GPUDeviceInfo;
  /** Imported benchmark results */
  benchmarks: GPUBenchmarkSuite[];
  /** Import timestamp */
  timestamp: number;
}

/**
 * WebGPU error types
 */
export type GPUError =
  | 'RequestAdapterFailed'
  | 'RequestDeviceFailed'
  | 'OutOfMemory'
  | 'ValidationError'
  | 'InternalError'
  | 'UnknownError';

/**
 * Profiler state
 */
export type GPUProfilerState = 'idle' | 'running' | 'paused' | 'error';

/**
 * Benchmark types
 */
export type GPUBenchmarkType =
  | 'compute'
  | 'memory'
  | 'bandwidth'
  | 'latency'
  | 'throughput'
  | 'shader'
  | string;

/**
 * Memory usage flags
 */
export type GPUMemoryUsage = any;
