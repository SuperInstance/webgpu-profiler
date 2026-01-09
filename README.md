# Browser GPU Profiler 🎮

<!-- Standard Badges -->
[![npm version](https://badge.fury.io/js/browser-gpu-profiler.svg)](https://www.npmjs.com/package/browser-gpu-profiler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E=18.0.0-green.svg)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/SuperInstance/browser-gpu-profiler?style=social)](https://github.com/SuperInstance/browser-gpu-profiler/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/SuperInstance/browser-gpu-profiler.svg)](https://github.com/SuperInstance/browser-gpu-profiler/issues)
[![GitHub forks](https://img.shields.io/github/forks/SuperInstance/browser-gpu-profiler.svg)](https://github.com/SuperInstance/browser-gpu-profiler/network)

<!-- GPU/WebGPU Specific Badges -->
[![WebGPU](https://img.shields.io/badge/WebGPU-Supported-orange.svg)](https://www.w3.org/TR/webgpu/)
[![GPU Acceleration](https://img.shields.io/badge/GPU-Accelerated-success.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
[![Performance](https://img.shields.io/badge/Performance-Production--ready-brightgreen.svg)](https://github.com/SuperInstance/browser-gpu-profiler)
[![Browser](https://img.shields.io/badge/Browser-Chrome%20%2F%20Edge%20113%2B-blue.svg)](https://www.google.com/chrome/)

---

> **Unleash the full potential of WebGPU with comprehensive GPU profiling.** Monitor GPU utilization, track memory allocation, profile shader performance, and benchmark capabilities in real-time. Build faster, smoother, and more efficient GPU-accelerated applications.

## 📊 Key Stats

- **Zero Dependencies** - Works completely standalone
- **Real-Time Monitoring** - Track FPS, GPU utilization, memory usage
- **Cross-Device Benchmarks** - Compare performance across hardware
- **Production-Ready** - Battle-tested in GPU-intensive applications
- **Privacy-First** - All data stays local, no external calls

---

## 📑 Table of Contents

- [⚡ Why Browser GPU Profiler?](#-why-browser-gpu-profiler)
- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [⚡ Quick Start](#-quick-start)
- [📊 How It Works](#-how-it-works)
- [📖 Documentation](#-documentation)
- [🎯 Real-World Use Cases](#-real-world-use-cases)
- [📚 Inspiring Examples](#-inspiring-examples)
- [📚 API Reference](#-api-reference)
- [🧪 Testing](#-testing)
- [🔧 Development](#-development)
- [🌐 Browser Support](#-browser-support)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🔗 Links](#-links)

---

## ⚡ Why Browser GPU Profiler?

**WebGPU changes everything** for browser-based graphics and compute. But harnessing that power requires visibility into what's actually happening on the GPU. Browser GPU Profiler gives you that visibility.

### The Challenge

You've built an amazing WebGPU application. It runs beautifully on your development machine. But then:

- 🐌 **Users report lag and stuttering** on mid-range laptops
- 🔋 **Mobile battery drains** faster than expected
- 💾 **Memory usage grows** until the browser crashes
- 🎮 **Frame rates drop** unpredictably during gameplay
- 🔍 **You can't diagnose** the root cause without specialized tools

### The Solution

Browser GPU Profiler provides **production-grade GPU monitoring** directly in the browser:

- **Real-time metrics** - FPS, frame time, GPU utilization, memory usage
- **Resource tracking** - Monitor buffers and textures, detect leaks
- **Shader profiling** - Identify bottlenecks in your compute shaders
- **Benchmark suite** - Compare GPU capabilities across devices
- **Export/Import** - Share and analyze performance data
- **Privacy-first** - All data stays local, no external calls

**Stop guessing. Start measuring. Ship better GPU-accelerated apps.**

---

## 🚀 Features

- **Real-time GPU Monitoring** - Track GPU utilization, memory usage, and performance metrics in real-time
- **Memory Allocation Tracking** - Monitor buffer and texture memory usage with detailed allocation history
- **Shader Performance Profiling** - Profile shader execution times and identify bottlenecks
- **Comprehensive Benchmark Suite** - Benchmark GPU compute, memory bandwidth, texture transfer, and more
- **Cross-Device Comparison** - Export and import benchmark results to compare across devices
- **WebGPU-Native** - Built specifically for WebGPU with modern APIs
- **Privacy-First** - All data stays local, nothing is sent to external servers
- **TypeScript-First** - Fully typed with comprehensive TypeScript support
- **Zero Dependencies** - Works completely standalone

---

## 📦 Installation

```bash
npm install browser-gpu-profiler
```

Or use with CDN:

```html
<script type="module">
  import { createGPUProfiler } from 'https://esm.sh/browser-gpu-profiler';
</script>
```

---

## ⚡ Quick Start

### 3 Steps to Your First Profile

**Step 1: Install**

```bash
npm install browser-gpu-profiler
```

**Step 2: Initialize & Start**

```typescript
import { createGPUProfiler } from 'browser-gpu-profiler';

// Create profiler instance
const profiler = createGPUProfiler({
  enableMonitoring: true,
  monitoringInterval: 1000, // Update every second
  onMetricsUpdate: (metrics) => {
    console.log('GPU Utilization:', metrics.utilization + '%');
    console.log('FPS:', metrics.fps);
    console.log('Memory Usage:', metrics.memoryUsed / 1024 / 1024 + ' MB');
  },
});

// Initialize profiler
await profiler.initialize();

// Start profiling
profiler.start();
```

**Step 3: Get Results**

```typescript
// Run benchmarks
const results = await profiler.runBenchmarks();
console.log('Overall Score:', results.overallScore);

// Get performance statistics
const stats = profiler.getPerformanceStats();
console.log('Average FPS:', stats.avgFps);
console.log('95th Percentile Frame Time:', stats.frameTimePercentiles.p95, 'ms');

// Stop profiling when done
profiler.cleanup();
```

**That's it!** You now have comprehensive GPU performance insights.

---

## 📊 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     Your WebGPU Application                      │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Compute     │  │ Graphics    │  │ ML          │            │
│  │ Shaders     │  │ Rendering   │  │ Inference   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Browser GPU Profiler                           │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Real-Time        │  │ Resource         │                    │
│  │ Monitoring       │  │ Tracking         │                    │
│  │                  │  │                  │                    │
│  │ • FPS            │  │ • Buffers        │                    │
│  │ • Frame Time     │  │ • Textures       │                    │
│  │ • GPU Util       │  │ • Memory Leaks   │                    │
│  │ • Memory Usage   │  │                 │                    │
│  └──────────────────┘  └──────────────────┘                    │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Shader           │  │ Benchmark        │                    │
│  │ Profiling        │  │ Suite            │                    │
│  │                  │  │                  │                    │
│  │ • Execution Time │  │ • Compute        │                    │
│  │ • Bottlenecks    │  │ • Memory         │                    │
│  │ • Statistics     │  │ • Texture        │                    │
│  │                  │  │ • Comparison     │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Actionable Insights                      │
│                                                                   │
│  • Optimize slow shaders                                         │
│  • Fix memory leaks                                              │
│  • Improve frame pacing                                          │
│  • Compare hardware capabilities                                 │
│  • Reduce power consumption                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

---

## 📖 Documentation

### What is Browser GPU Profiler?

**Browser GPU Profiler** is a comprehensive GPU performance monitoring and analysis tool designed specifically for WebGPU applications. It provides real-time insights into GPU utilization, memory allocation, shader performance, and overall system capabilities.

### When to Use It

**Use Browser GPU Profiler when you need to:**

- **Optimize GPU Performance** - Identify bottlenecks in your compute and graphics workloads
- **Monitor Resource Usage** - Track memory allocation and GPU utilization in real-time
- **Compare Hardware** - Benchmark GPU capabilities across different devices
- **Profile Shaders** - Analyze shader execution times and identify performance issues
- **Debug Memory Issues** - Track buffer and texture allocations with detailed history
- **Validate WebGPU Support** - Check device capabilities and feature support

### Key Concepts

#### Real-Time Monitoring

Track GPU performance metrics as your application runs:

```typescript
profiler.start();

// Metrics are collected automatically
profiler.pause(); // Pause collection
profiler.resume(); // Resume collection
profiler.stop(); // Stop collection
```

#### Memory Tracking

Monitor GPU memory allocation:

```typescript
// Track buffer allocation
const buffer = device.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE });
profiler.trackBuffer(buffer, 'my-buffer');

// Track texture allocation
const texture = device.createTexture({
  size: [512, 512],
  format: 'rgba8unorm',
  usage: GPUTextureUsage.RENDER_ATTACHMENT,
});
profiler.trackTexture(texture, 'my-texture');

// Get memory metrics
const memoryMetrics = profiler.getMemoryMetrics();
console.log('Total Allocated:', memoryMetrics.totalAllocated / 1024 / 1024 + ' MB');
```

#### Shader Profiling

Profile shader execution performance:

```typescript
// Track shader execution
const startTime = performance.now();
// ... run shader ...
const executionTime = performance.now() - startTime;

profiler.trackShader('my-shader', 'main', executionTime * 1000); // Convert to microseconds

// Get shader metrics
const shaderMetrics = profiler.getShaderMetricsById('my-shader');
console.log('Average Execution Time:', shaderMetrics?.avgExecutionTime + ' μs');
console.log('Bottlenecks:', shaderMetrics?.bottlenecks);
```

#### Benchmarking

Run comprehensive GPU benchmarks:

```typescript
// Run complete benchmark suite
const suite = await profiler.runBenchmarks();

console.log('Overall Score:', suite.overallScore);
suite.results.forEach(result => {
  console.log(`${result.name}: ${result.score} ${result.unit}`);
});

// Run specific benchmark
const computeBenchmark = await profiler.runBenchmark('compute');
console.log('Compute Performance:', computeBenchmark.score, 'GFLOPS');
```

#### Cross-Device Comparison

Export and import benchmark results:

```typescript
// Export results
const exported = profiler.exportToString();

// Import and compare
const importedData = profiler.import(exported);
const comparisons = profiler.compareWithImport(importedData);

comparisons.forEach(comp => {
  console.log(`${comp.device}: ${comp.relativeScore}% of current device`);
});
```

---

## 🎯 Real-World Use Cases

### 1. Debug GPU Performance Bottlenecks

**Problem:** Your WebGPU game runs at 30 FPS but should be 60 FPS.

**Solution:**
```typescript
const profiler = createGPUProfiler({
  onMetricsUpdate: (metrics) => {
    if (metrics.utilization > 90) {
      console.log('GPU bottleneck - optimize shaders');
    } else if (metrics.fps < 55) {
      console.log('CPU bottleneck - reduce draw calls');
    }
  }
});

await profiler.initialize();
profiler.start();
```

### 2. Compare GPU Performance Across Devices

**Problem:** How does your app perform on different hardware?

**Solution:**
```typescript
// Desktop
const desktop = await profiler.runBenchmarks();
fs.writeFileSync('desktop.json', profiler.exportToString());

// Laptop
const laptop = await profiler.runBenchmarks();
const comparison = profiler.compareWithImport(desktop);
console.log('Laptop is', comparison[0].relativeScore, '% of desktop');
```

### 3. Detect Memory Leaks

**Problem:** Memory usage grows until the browser crashes.

**Solution:**
```typescript
profiler.start();

// Run your application...
await runAppForMinutes(30);

const history = profiler.getMemoryMetrics().history;
const trend = (history[history.length-1].totalAllocated / history[0].totalAllocated) - 1;

if (trend > 0.5) {
  console.error('Memory leak detected! 50% increase in 30 minutes');
}
```

### 4. Optimize WebGPU Compute Shaders

**Problem:** Which shader is slowing down your ML model?

**Solution:**
```typescript
for (const shader of ['data-prep', 'inference', 'post-process']) {
  const start = performance.now();
  await runShader(shader);
  const duration = (performance.now() - start) * 1000; // μs

  profiler.trackShader(shader, 'main', duration);
}

const metrics = profiler.getShaderMetrics();
metrics.forEach(m => {
  console.log(`${m.shaderId}: ${m.avgExecutionTime}μs`);
  console.log(`Bottlenecks:`, m.bottlenecks);
});
```

### 5. Real-Time Performance Dashboard

**Problem:** Show live GPU stats to users (debug panel).

**Solution:**
```typescript
const profiler = createGPUProfiler({
  monitoringInterval: 500,
  onMetricsUpdate: (metrics) => {
    document.getElementById('fps').textContent = metrics.fps.toFixed(1);
    document.getElementById('gpu').textContent = metrics.utilization + '%';
    document.getElementById('memory').textContent =
      (metrics.memoryUsed / 1024 / 1024).toFixed(1) + ' MB';
  }
});
```

### 6. GPU vs CPU Performance Testing

**Problem:** Should you use GPU for your ML model?

**Solution:**
```typescript
// Test CPU
const cpuStart = performance.now();
await runMLModelOnCPU();
const cpuTime = performance.now() - cpuStart;

// Test GPU
const gpuBenchmark = await profiler.runBenchmark('compute');
const speedup = cpuTime / gpuBenchmark.executionTime;

console.log(`GPU is ${speedup.toFixed(2)}x faster`);
if (speedup > 2) {
  console.log('✅ Use GPU acceleration');
}
```

### 7. Pre-Deployment Performance Validation

**Problem:** Ensure performance before release.

**Solution:**
```typescript
const profiler = createGPUProfiler();
await profiler.initialize();
profiler.start();

await simulateTypicalUserSession();

const stats = profiler.getPerformanceStats();
if (stats.avgFps < 30 || stats.frameTimePercentiles.p95 > 50) {
  throw new Error('Performance targets not met!');
}
```

### 8. Monitor GPU Memory Usage

**Problem:** Track memory allocations in real-time.

**Solution:**
```typescript
profiler.trackBuffer(device.createBuffer({ size: 1024 * 1024 }), 'buffer-1mb');
profiler.trackTexture(device.createTexture({ size: [512, 512] }), 'texture-512px');

const memory = profiler.getMemoryMetrics();
console.log('Buffer Memory:', memory.bufferMemory / 1024 / 1024, 'MB');
console.log('Texture Memory:', memory.textureMemory / 1024 / 1024, 'MB');
console.log('Total:', memory.totalAllocated / 1024 / 1024, 'MB');
```

### 9. Game Performance Optimization

**Problem:** Auto-adjust quality for different hardware.

**Solution:**
```typescript
const benchmarks = await profiler.runBenchmarks();
let tier = 'low';

if (benchmarks.overallScore > 80) tier = 'ultra';
else if (benchmarks.overallScore > 60) tier = 'high';
else if (benchmarks.overallScore > 40) tier = 'medium';

applyQualitySettings(tier);
console.log(`Detected ${tier} tier hardware`);
```

### 10. Cross-Device GPU Comparison

**Problem:** Compare against reference hardware.

**Solution:**
```typescript
const current = await profiler.runBenchmarks();

const reference = profiler.import(fs.readFileSync('rtx-3080.json', 'utf-8'));
const comparison = profiler.compareWithImport(reference);

console.log('Your GPU vs RTX 3080:', comparison[0].relativeScore + '%');
```

---

## 📚 Inspiring Examples

Explore our collection of **real-world, production-ready examples**:

- **[Game Performance Dashboard](./examples/game-performance-dashboard.ts)** - Real-time FPS monitoring, GPU utilization graphs, and performance alerts for WebGPU games
- **[Shader Optimizer](./examples/shader-optimizer.ts)** - Profile compute shaders, identify bottlenecks, and measure optimization improvements
- **[Cross-Device Benchmark](./examples/cross-device-benchmark.ts)** - Run benchmarks, export results, compare performance across devices
- **[ML Model Performance](./examples/ml-model-performance.ts)** - Compare GPU vs CPU performance for ML inference, make data-driven hardware decisions
- **[Real-Time Monitoring](./examples/real-time-monitoring.ts)** - Continuous monitoring with callbacks, threshold alerts, and production-ready patterns

Each example includes:
- ✅ Complete, runnable code
- ✅ Real-world use case description
- ✅ Production-ready implementation
- ✅ SEO-optimized comments
- ✅ Performance best practices

---

---

## 📚 API Reference

### GPUProfiler

Main profiler class for GPU monitoring and benchmarking.

#### Constructor

```typescript
const profiler = new GPUProfiler(config?: GPUProfilerConfig);
```

**Config Options:**

- `enableMonitoring?: boolean` - Enable real-time monitoring (default: `true`)
- `monitoringInterval?: number` - Update interval in milliseconds (default: `1000`)
- `enableMemoryTracking?: boolean` - Enable memory tracking (default: `true`)
- `enableShaderProfiling?: boolean` - Enable shader profiling (default: `true`)
- `maxHistorySize?: number` - Maximum history size (default: `1000`)
- `onMetricsUpdate?: (metrics: GPUMetrics) => void` - Callback for metrics updates
- `onMemoryUpdate?: (memory: GPUMemoryMetrics) => void` - Callback for memory updates
- `onShaderMetrics?: (shader: GPUShaderMetrics) => void` - Callback for shader metrics

#### Methods

- `initialize(): Promise<void>` - Initialize the profiler
- `start(): void` - Start profiling
- `stop(): void` - Stop profiling
- `pause(): void` - Pause profiling
- `resume(): void` - Resume profiling
- `getDeviceInfo(): GPUDeviceInfo` - Get GPU device information
- `getCurrentMetrics(): GPUMetrics` - Get current metrics
- `getMetricsHistory(): GPUMetrics[]` - Get metrics history
- `getMemoryMetrics(): GPUMemoryMetrics` - Get memory metrics
- `getShaderMetrics(): GPUShaderMetrics[]` - Get all shader metrics
- `getShaderMetricsById(shaderId: string): GPUShaderMetrics | undefined` - Get specific shader metrics
- `getPerformanceStats(): GPUPerformanceStats` - Get performance statistics
- `runBenchmarks(): Promise<GPUBenchmarkSuite>` - Run complete benchmark suite
- `runBenchmark(type: GPUBenchmarkType): Promise<GPUBenchmarkResult>` - Run specific benchmark
- `trackBuffer(buffer: GPUBuffer, label?: string): void` - Track buffer allocation
- `trackTexture(texture: GPUTexture, label?: string): void` - Track texture allocation
- `trackShader(shaderId: string, entryPoint: string, executionTime: number): void` - Track shader execution
- `clearMetrics(): void` - Clear all metrics
- `export(): GPUProfilerExport` - Export profiler data
- `import(data: string): GPUProfilerImport` - Import profiler data
- `cleanup(): void` - Clean up resources

### Utility Functions

- `createGPUProfiler(config?: GPUProfilerConfig): GPUProfiler` - Create profiler instance
- `isWebGPUAvailable(): boolean` - Check if WebGPU is available
- `getGPUFeatures(): Promise<string[]>` - Get supported GPU features
- `getGPULimits(): Promise<GPUSupportedLimits | null>` - Get GPU limits
- `getQuickDeviceInfo(): Promise<GPUDeviceInfo | null>` - Get device info quickly

---

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

---

## 🔧 Development

```bash
# Install dependencies
npm install

# Build package
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint

# Format code
npm run format
```

---

## 🌐 Browser Support

Browser GPU Profiler requires **WebGPU support**:

- ✅ Chrome 113+
- ✅ Edge 113+
- ✅ Firefox Nightly (with flags)
- ⏳ Safari (in development)

Check WebGPU availability:

```typescript
import { isWebGPUAvailable } from 'browser-gpu-profiler';

if (!isWebGPUAvailable()) {
  console.log('WebGPU is not supported in this browser');
}
```

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

## 📄 License

MIT © [SuperInstance](https://github.com/SuperInstance)

---

## 🔗 Links

- [GitHub Repository](https://github.com/SuperInstance/browser-gpu-profiler)
- [NPM Package](https://www.npmjs.com/package/browser-gpu-profiler)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [WebGPU on MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)

---

## 🎓 Related Tools

- [Hardware Capability Profiler](https://github.com/SuperInstance/hardware-capability-profiler) - Browser hardware profiling
- [Privacy-First Analytics](https://github.com/SuperInstance/privacy-first-analytics) - Local analytics with insights

---

**Built with ❤️ for the WebGPU community**
