# Browser GPU Profiler - Architecture

## System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           GPUProfiler (Main)                              │
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Lifecycle       │  │  API Surface     │  │  Data Export     │       │
│  │  Management      │  │                  │  │  / Import        │       │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘       │
│           │                     │                     │                   │
└───────────┼─────────────────────┼─────────────────────┼───────────────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌───────────────────────┐ ┌──────────────┐ ┌─────────────────────┐
│   GPUDeviceManager    │ │  Utilities   │ │  Export/Import      │
│                       │ │              │ │                     │
│ • Initialize WebGPU   │ │ • Feature    │ │ • JSON serialization│
│ • Device info         │ │   detection  │ │ • Data validation   │
│ • Feature/limit check │ │ • Quick info │ │ • Comparison logic  │
└───────────┬───────────┘ └──────────────┘ └─────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                        GPUMetricsCollector                                │
│                                                                           │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │ Real-time          │  │ Memory             │  │ Shader            │  │
│  │ Monitoring         │  │ Tracking           │  │ Profiling         │  │
│  │                    │  │                    │  │                   │  │
│  │ • FPS              │  │ • Buffer tracking  │  │ • Execution time  │  │
│  │ • Utilization      │  │ • Texture tracking │  │ • Bottlenecks     │  │
│  │ • Frame time       │  │ • History          │  │ • Statistics      │  │
│  │ • Memory usage     │  │ • Leak detection   │  │                   │  │
│  └────────────────────┘  └────────────────────┘  └──────────────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Performance Statistics                         │   │
│  │  • Average/min/max FPS  • Frame time percentiles  • Totals      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         GPUBenchmarkSuite                                 │
│                                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Compute  │  │ Memory   │  │ Texture  │  │ Shader   │  │ Latency  │  │
│  │ Benchmark│  │ Bandwidth│  │ Transfer │  │ Compile  │  │ Benchmark│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Scoring & Comparison                          │   │
│  │  • Overall score calculation  • Cross-device comparison          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                          WebGPU API                                       │
│                                                                           │
│  • GPUDevice  • GPUAdapter  • GPUBuffer  • GPUTexture  • GPUShader       │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Initialization Flow

```
User Code
   │
   ├─> createGPUProfiler(config)
   │       │
   │       └─> new GPUProfiler(config)
   │               │
   │               ├─> new GPUDeviceManager()
   │               ├─> new GPUMetricsCollector(deviceManager, config)
   │               └─> new GPUBenchmarkSuite(deviceManager)
   │
   ├─> profiler.initialize()
   │       │
   │       └─> deviceManager.initialize()
   │               │
   │               ├─> navigator.gpu.requestAdapter()
   │               ├─> adapter.requestDevice()
   │               ├─> gatherDeviceInfo()
   │               └─> Setup callbacks
   │
   └─> profiler.start()
           │
           └─> metricsCollector.start()
                   │
                   └─> setInterval(monitoringInterval)
                           │
                           └─> collectMetrics()
                                   │
                                   ├─> Estimate utilization
                                   ├─> Calculate memory
                                   ├─> Measure frame time
                                   ├─> onMetricsUpdate callback
                                   └─> Store in history
```

### Metrics Collection Flow

```
profiler.getCurrentMetrics()
   │
   └─> metricsCollector.collectMetrics()
           │
           ├─> Get timestamp
           ├─> Calculate frame time (vs last frame)
           ├─> Calculate FPS (1000 / frame time)
           ├─> Estimate GPU utilization
           ├─> Get memory usage
           ├─> Estimate compute time
           ├─> Trigger callback
           └─> Return GPUMetrics object
```

### Memory Tracking Flow

```
User creates buffer:
   │
   └─> device.createBuffer(...)
           │
           └─> profiler.trackBuffer(buffer, label)
                   │
                   ├─> Create GPUMemoryAllocation
                   ├─> Add to allocations map
                   ├─> Update totals (bufferMemory, totalAllocated)
                   ├─> Record memory sample
                   └─> Trigger onMemoryUpdate callback

User destroys buffer:
   │
   └─> buffer.destroy()
           │
           └─> profiler.untrackBuffer(label)
                   │
                   ├─> Find allocation
                   ├─> Subtract from totals
                   ├─> Remove from allocations map
                   ├─> Record memory sample
                   └─> Trigger onMemoryUpdate callback
```

### Shader Profiling Flow

```
User executes shader:
   │
   ├─> const startTime = performance.now()
   │
   ├─> [Execute shader]
   │
   ├─> const endTime = performance.now()
   │
   └─> profiler.trackShader(shaderId, entryPoint, endTime - startTime)
           │
           ├─> Get or create GPUShaderMetrics
           ├─> Update execution time statistics
           ├─> Detect bottlenecks
           ├─> Trigger onShaderMetrics callback
           └─> Store in shaderMetrics map
```

### Benchmarking Flow

```
profiler.runBenchmarks()
   │
   └─> benchmarkSuite.runCompleteSuite()
           │
           ├─> runComputeBenchmark()
           │       ├─> Create compute shader
           │       ├─> Create buffers
           │       ├─> Run N iterations
           │       ├─> Calculate score (GFLOPS)
           │       └─> Return GPUBenchmarkResult
           │
           ├─> runMemoryBandwidthBenchmark()
           │       ├─> Create large buffers
           │       ├─> Run buffer copies
           │       ├─> Calculate bandwidth (GB/s)
           │       └─> Return GPUBenchmarkResult
           │
           ├─> [Other benchmarks...]
           │
           ├─> Calculate overall score
           │
           └─> Return GPUBenchmarkSuite
```

## Component Interaction

### State Management

```
GPUProfiler States:
  idle ──> running ──> paused ──> running ──> idle
    │                                    │
    └────────────> error <───────────────┘
                     │
                     └─> cleanup() -> idle
```

### Callback Flow

```
Metrics Update:
  collectMetrics() ──> onMetricsUpdate(GPUMetrics) ──> User callback

Memory Update:
  trackBuffer/Texture() ──> onMemoryUpdate(GPUMemoryMetrics) ──> User callback

Shader Metrics:
  trackShader() ──> onShaderMetrics(GPUShaderMetrics) ──> User callback
```

### Data Storage

```
Memory Hierarchy:

GPUProfiler
  │
  ├─> metricsHistory: GPUMetrics[] (maxHistorySize items)
  │       └─> Circular buffer, trimmed when full
  │
  ├─> memoryMetrics: GPUMemoryMetrics
  │       ├─> allocations: Map<string, GPUMemoryAllocation>
  │       └─> history: GPUMemorySample[] (maxHistorySize items)
  │
  ├─> shaderMetrics: Map<string, GPUShaderMetrics>
  │       └─> Persistent, keyed by shaderId
  │
  └─> benchmarkResults: GPUBenchmarkResult[]
          └─> Accumulated, cleared explicitly
```

## Integration Points

### With WebGPU Applications

```
Application Code
       │
       ├─> profiler.initialize()
       │       │
       │       └─> Get GPU device from profiler
       │               │
       │               └─> Use device for WebGPU operations
       │
       ├─> profiler.start()
       │       │
       │       └─> Automatic metrics collection
       │
       ├─> Track resources
       │       │
       │       ├─> profiler.trackBuffer(buffer, label)
       │       ├─> profiler.trackTexture(texture, label)
       │       └─> profiler.trackShader(id, entryPoint, time)
       │
       ├─> Get insights
       │       │
       │       ├─> profiler.getMetricsHistory()
       │       ├─> profiler.getMemoryMetrics()
       │       └─> profiler.getPerformanceStats()
       │
       └─> profiler.cleanup()
```

### Export/Import Flow

```
Export:
  profiler.export()
       │
       ├─> Collect all data
       │       ├─> Device info
       │       ├─> Metrics history
       │       ├─> Memory metrics
       │       ├─> Shader metrics
       │       ├─> Benchmark results
       │       └─> Performance stats
       │
       └─> Return GPUProfilerExport object
               │
               └─> JSON.stringify() -> Save to file/server

Import:
  profiler.import(jsonString)
       │
       ├─> Parse JSON
       │
       └─> Return GPUProfilerImport object
               │
               └─> Use for comparison/analysis
```

## Performance Characteristics

### Time Complexity

- `collectMetrics()`: O(1)
- `trackBuffer/Texture()`: O(1)
- `untrackBuffer/Texture()`: O(1)
- `trackShader()`: O(1)
- `getPerformanceStats()`: O(n) where n = metricsHistory.length
- `runBenchmarks()`: O(1) per benchmark (fixed iterations)

### Space Complexity

- Metrics history: O(n) where n = maxHistorySize
- Memory allocations: O(m) where m = active allocations
- Shader metrics: O(s) where s = unique shaders tracked
- Benchmark results: O(b) where b = benchmarks run

### Memory Usage

Typical memory footprint:
- Metrics history: ~100 bytes per sample
- Memory allocation: ~200 bytes per allocation
- Shader metrics: ~150 bytes per shader
- Total (1000 samples, 100 allocations, 10 shaders): ~150 KB

## Security & Privacy

### Data Handling

- **All data stays local** - No network requests
- **No external dependencies** - Uses only WebGPU APIs
- **Privacy-first** - No telemetry or tracking
- **User-controlled export** - Explicit export/import

### WebGPU Security

- Uses browser's WebGPU security model
- No access to system-level GPU info
- Sandboxed execution
- Same-origin policy applies

## Extension Points

### Custom Metrics

```typescript
class CustomMetricsCollector extends GPUMetricsCollector {
  collectCustomMetric(value: number) {
    // Custom collection logic
  }
}
```

### Custom Benchmarks

```typescript
class CustomBenchmarkSuite extends GPUBenchmarkSuite {
  async runCustomBenchmark() {
    // Custom benchmark logic
  }
}
```

### Custom Export Format

```typescript
interface CustomExport extends GPUProfilerExport {
  customData: any;
}
```

## Testing Strategy

### Unit Tests

- Device manager: WebGPU initialization, feature detection
- Metrics collector: Collection, tracking, statistics
- Benchmark suite: Individual benchmarks, scoring
- Profiler: Lifecycle, API surface, export/import

### Integration Tests

- Full profiling session
- Benchmark execution
- Memory tracking workflow
- Export/import cycle

### Mocking

- Mock WebGPU API for testing environments
- Mock performance.now() for deterministic tests
- Mock setInterval/clearInterval for control
