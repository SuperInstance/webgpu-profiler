# Browser GPU Profiler - Developer Guide

## Table of Contents

1. [Architecture](#architecture)
2. [API Reference](#api-reference)
3. [Integration Examples](#integration-examples)
4. [Extension Points](#extension-points)
5. [Performance Considerations](#performance-considerations)
6. [TypeScript Support](#typescript-support)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       GPUProfiler                            │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐ │
│  │ Device       │  │ Metrics       │  │ Benchmark       │ │
│  │ Manager      │  │ Collector     │  │ Suite           │ │
│  └──────────────┘  └───────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │                    │                     │
         ▼                    ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   WebGPU API    │  │  Performance    │  │   Benchmark     │
│                 │  │    Metrics      │  │   Results       │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Core Components

#### 1. GPUProfiler (Main Class)

**Responsibilities:**
- Coordinate all profiling operations
- Provide unified API
- Manage profiler lifecycle
- Export/import data

**Key Methods:**
```typescript
class GPUProfiler {
  initialize(): Promise<void>
  start(): void
  stop(): void
  getCurrentMetrics(): GPUMetrics
  runBenchmarks(): Promise<GPUBenchmarkSuite>
  export(): GPUProfilerExport
  // ... see API reference below
}
```

#### 2. GPUDeviceManager

**Responsibilities:**
- WebGPU initialization
- Device information gathering
- Feature/limit checking
- Resource cleanup

**Key Methods:**
```typescript
class GPUDeviceManager {
  initialize(): Promise<void>
  getDevice(): GPUDevice
  getAdapter(): GPUAdapter
  getDeviceInfo(): GPUDeviceInfo
  hasFeature(feature: GPUFeatureName): boolean
  getLimit<T>(limit: T): GPUSupportedLimits[T]
  cleanup(): void
}
```

#### 3. GPUMetricsCollector

**Responsibilities:**
- Real-time metrics collection
- Memory tracking
- Shader profiling
- Performance statistics

**Key Methods:**
```typescript
class GPUMetricsCollector {
  start(): void
  stop(): void
  collectMetrics(): GPUMetrics
  trackBuffer(buffer: GPUBuffer, label?: string): void
  trackTexture(texture: GPUTexture, label?: string): void
  trackShader(id: string, entryPoint: string, time: number): void
  getPerformanceStats(): GPUPerformanceStats
}
```

#### 4. GPUBenchmarkSuite

**Responsibilities:**
- Run GPU benchmarks
- Calculate scores
- Compare results
- Export/import data

**Key Methods:**
```typescript
class GPUBenchmarkSuite {
  runCompleteSuite(): Promise<GPUBenchmarkSuite>
  runBenchmark(type: GPUBenchmarkType): Promise<GPUBenchmarkResult>
  compareWithImport(data: GPUProfilerImport): GPUDeviceComparison[]
}
```

---

## API Reference

### GPUProfiler

Main profiler class for GPU monitoring and benchmarking.

#### Constructor

```typescript
constructor(config?: GPUProfilerConfig)
```

**Parameters:**
- `config` (optional): Configuration object

**Example:**
```typescript
const profiler = new GPUProfiler({
  enableMonitoring: true,
  monitoringInterval: 1000,
  onMetricsUpdate: (metrics) => console.log(metrics.fps),
});
```

#### Methods

##### initialize()

Initialize the profiler and request GPU device.

```typescript
async initialize(): Promise<void>
```

**Throws:**
- `Error` if WebGPU is not available
- `Error` if adapter/device request fails

**Example:**
```typescript
try {
  await profiler.initialize();
  console.log('Profiler initialized');
} catch (error) {
  console.error('Failed to initialize:', error);
}
```

##### start()

Start profiling metrics collection.

```typescript
start(): void
```

**Example:**
```typescript
profiler.start();
```

##### stop()

Stop profiling metrics collection.

```typescript
stop(): void
```

**Example:**
```typescript
profiler.stop();
```

##### pause()

Pause metrics collection.

```typescript
pause(): void
```

##### resume()

Resume paused metrics collection.

```typescript
resume(): void
```

##### getDeviceInfo()

Get GPU device information.

```typescript
getDeviceInfo(): GPUDeviceInfo
```

**Returns:** Device information object

**Example:**
```typescript
const info = profiler.getDeviceInfo();
console.log(`${info.vendor} ${info.architecture}`);
```

##### getCurrentMetrics()

Get current GPU metrics.

```typescript
getCurrentMetrics(): GPUMetrics
```

**Returns:** Current metrics snapshot

**Example:**
```typescript
const metrics = profiler.getCurrentMetrics();
console.log(`FPS: ${metrics.fps}`);
```

##### getMetricsHistory()

Get metrics history.

```typescript
getMetricsHistory(): GPUMetrics[]
```

**Returns:** Array of historical metrics

##### runBenchmarks()

Run complete benchmark suite.

```typescript
async runBenchmarks(): Promise<GPUBenchmarkSuite>
```

**Returns:** Complete benchmark results

**Example:**
```typescript
const suite = await profiler.runBenchmarks();
console.log(`Overall score: ${suite.overallScore}`);
```

##### export()

Export profiler data.

```typescript
export(): GPUProfilerExport
```

**Returns:** Exported data object

**Example:**
```typescript
const exported = profiler.export();
const json = JSON.stringify(exported, null, 2);
```

---

### Types

#### GPUDeviceInfo

```typescript
interface GPUDeviceInfo {
  vendor: string;
  architecture: string;
  description: string;
  adapterInfo: GPUAdapterInfo;
  features: string[];
  limits: GPUSupportedLimits;
}
```

#### GPUMetrics

```typescript
interface GPUMetrics {
  timestamp: number;
  utilization: number;        // 0-100
  memoryUsed: number;         // bytes
  memoryTotal: number;        // bytes
  memoryPercentage: number;   // 0-100
  frameTime: number;          // ms
  fps: number;
  computeTime: number;        // ms
}
```

#### GPUMemoryMetrics

```typescript
interface GPUMemoryMetrics {
  bufferMemory: number;       // bytes
  textureMemory: number;      // bytes
  totalAllocated: number;     // bytes
  allocations: Map<string, GPUMemoryAllocation>;
  history: GPUMemorySample[];
}
```

#### GPUShaderMetrics

```typescript
interface GPUShaderMetrics {
  shaderId: string;
  entryPoint: string;
  avgExecutionTime: number;   // microseconds
  minExecutionTime: number;   // microseconds
  maxExecutionTime: number;   // microseconds
  invocations: number;
  lastExecution: number;
  bottlenecks: string[];
}
```

#### GPUBenchmarkResult

```typescript
interface GPUBenchmarkResult {
  name: string;
  description: string;
  score: number;
  unit: string;
  executionTime: number;      // ms
  metrics: Record<string, number>;
  timestamp: number;
}
```

---

## Integration Examples

### Integration with React

```typescript
import { useEffect, useState } from 'react';
import { createGPUProfiler, GPUMetrics } from 'browser-gpu-profiler';

function GPUStats() {
  const [metrics, setMetrics] = useState<GPUMetrics | null>(null);
  const [profiler] = useState(() => createGPUProfiler({
    onMetricsUpdate: (m) => setMetrics(m),
  }));

  useEffect(() => {
    let mounted = true;

    async function init() {
      await profiler.initialize();
      if (mounted) {
        profiler.start();
      }
    }

    init();

    return () => {
      mounted = false;
      profiler.cleanup();
    };
  }, [profiler]);

  if (!metrics) return <div>Loading...</div>;

  return (
    <div>
      <div>FPS: {metrics.fps.toFixed(1)}</div>
      <div>Utilization: {metrics.utilization.toFixed(1)}%</div>
      <div>Memory: {(metrics.memoryUsed / 1024 / 1024).toFixed(1)} MB</div>
    </div>
  );
}
```

### Integration with Three.js

```typescript
import * as THREE from 'three';
import { createGPUProfiler } from 'browser-gpu-profiler';

class GPUMonitor {
  private profiler = createGPUProfiler();

  async init(renderer: THREE.WebGLRenderer) {
    await this.profiler.initialize();

    // Track renderer memory
    const info = renderer.info;
    this.profiler.start();

    // Monitor in render loop
    const render = renderer.render;
    renderer.render = (...args) => {
      render.apply(renderer, args);

      // Update metrics
      this.profiler.getCurrentMetrics();
    };
  }

  getStats() {
    return this.profiler.getPerformanceStats();
  }

  cleanup() {
    this.profiler.cleanup();
  }
}

// Usage
const monitor = new GPUMonitor();
await monitor.init(renderer);
```

### Integration with Custom WebGPU Engine

```typescript
class Engine {
  private profiler = createGPUProfiler();

  async initialize() {
    // Initialize profiler
    await this.profiler.initialize();

    // Get WebGPU device
    this.device = this.profiler.getDevice();

    // Start profiling
    this.profiler.start();

    // Setup engine...
  }

  createBuffer(size: number, usage: number) {
    const buffer = this.device.createBuffer({ size, usage });

    // Track buffer
    this.profiler.trackBuffer(buffer, `buffer-${this.bufferId++}`);

    return buffer;
  }

  destroyBuffer(buffer: GPUBuffer, label: string) {
    buffer.destroy();
    this.profiler.untrackBuffer(label);
  }

  async runCompute(shaderModule: string, entryPoint: string) {
    const startTime = performance.now();

    // ... run compute shader ...

    await this.device.queue.onSubmittedWorkDone();
    const executionTime = (performance.now() - startTime) * 1000;

    // Track execution
    this.profiler.trackShader(
      shaderModule,
      entryPoint,
      executionTime
    );
  }

  getPerformanceReport() {
    return {
      metrics: this.profiler.getCurrentMetrics(),
      memory: this.profiler.getMemoryMetrics(),
      stats: this.profiler.getPerformanceStats(),
    };
  }

  cleanup() {
    this.profiler.cleanup();
  }
}
```

---

## Extension Points

### Custom Metrics Collection

Extend metrics collector:

```typescript
class CustomMetricsCollector extends GPUMetricsCollector {
  private customMetrics: number[] = [];

  collectCustomMetric(value: number) {
    this.customMetrics.push(value);
  }

  getCustomMetrics() {
    return this.customMetrics;
  }
}
```

### Custom Benchmarks

Add custom benchmarks:

```typescript
class CustomBenchmarkSuite extends GPUBenchmarkSuite {
  async runCustomBenchmark(): Promise<GPUBenchmarkResult> {
    const device = this.deviceManager.getDevice();
    const startTime = performance.now();

    // ... custom benchmark logic ...

    const endTime = performance.now();

    return {
      name: 'Custom Benchmark',
      description: 'My custom benchmark',
      score: calculatedScore,
      unit: 'ops/s',
      executionTime: endTime - startTime,
      metrics: {},
      timestamp: Date.now(),
    };
  }
}
```

### Custom Export Format

Customize export format:

```typescript
interface CustomExport extends GPUProfilerExport {
  customData: any;
}

function customExport(profiler: GPUProfiler): CustomExport {
  const base = profiler.export();

  return {
    ...base,
    customData: {
      applicationVersion: '1.0.0',
      customMetrics: { /* ... */ },
    },
  };
}
```

---

## Performance Considerations

### Overhead

**Metrics Collection:**
- Minimal overhead (~0.1ms per collection)
- Configurable interval (default: 1000ms)
- History size limited to prevent memory growth

**Memory Tracking:**
- O(1) for tracking/untracking
- Minimal memory footprint per allocation
- Automatic history trimming

**Benchmarking:**
- Significant overhead (intentional)
- Run only when needed
- Not suitable for production monitoring

### Optimization Tips

1. **Adjust Monitoring Interval**
   ```typescript
   // Fast updates (more overhead)
   { monitoringInterval: 100 }

   // Slow updates (less overhead)
   { monitoringInterval: 5000 }
   ```

2. **Limit History Size**
   ```typescript
   { maxHistorySize: 100 }
   ```

3. **Disable Unneeded Features**
   ```typescript
   {
     enableMemoryTracking: false,
     enableShaderProfiling: false,
   }
   ```

4. **Use Callbacks Efficiently**
   ```typescript
   // Bad: Heavy computation in callback
   onMetricsUpdate: (metrics) => {
     const complex = heavyCalculation(metrics);
   }

   // Good: Defer computation
   onMetricsUpdate: (metrics) => {
     queueMicrotask(() => heavyCalculation(metrics));
   }
   ```

---

## TypeScript Support

### Strict Type Safety

Full TypeScript support with comprehensive types:

```typescript
import {
  GPUProfiler,
  GPUDeviceInfo,
  GPUMetrics,
  GPUMemoryMetrics,
  // ... all types exported
} from 'browser-gpu-profiler';
```

### Type Guards

```typescript
function isWebGPUProfiler(obj: any): obj is GPUProfiler {
  return obj && typeof obj.initialize === 'function';
}
```

### Generic Extensions

```typescript
interface ExtendedProfiler<T> extends GPUProfiler {
  getCustomData(): T;
}

class MyProfiler<T> implements ExtendedProfiler<T> {
  // ... implementation
}
```

---

## Additional Resources

- [User Guide](./USER_GUIDE.md)
- [Examples](../examples/)
- [Type Definitions](../src/types.ts)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
