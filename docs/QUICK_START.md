# 5-Minute Quick Start Guide

Get up and running with Browser GPU Profiler in **literally 5 minutes**.

---

## What You'll Learn

- Initialize a GPU profiler and start monitoring WebGPU performance
- Track GPU utilization, FPS, and memory usage in real-time
- Run comprehensive benchmarks to evaluate GPU capabilities

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **Chrome 113+**, **Edge 113+**, or **Firefox Nightly** (WebGPU support)
- **A WebGPU project** (or we'll create a simple one together)
- **Basic TypeScript/JavaScript knowledge**

---

## 5-Minute Quick Start

### Step 1: Install (30 seconds)

```bash
npm install browser-gpu-profiler
```

### Step 2: Import & Initialize (2 minutes)

Create a new file `gpu-profile.ts`:

```typescript
import { createGPUProfiler } from 'browser-gpu-profiler';

// Create profiler with monitoring enabled
const profiler = createGPUProfiler({
  enableMonitoring: true,
  monitoringInterval: 1000, // Update every 1 second
  onMetricsUpdate: (metrics) => {
    console.log('🎮 GPU Metrics Update:');
    console.log(`  Utilization: ${metrics.utilization.toFixed(1)}%`);
    console.log(`  FPS: ${metrics.fps.toFixed(1)}`);
    console.log(`  Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
    console.log(`  Memory: ${(metrics.memoryUsed / 1024 / 1024).toFixed(1)} MB`);
  },
});

// Initialize the profiler
await profiler.initialize();
console.log('✅ GPU Profiler initialized!');
```

### Step 3: Start Monitoring (1 minute)

```typescript
// Start collecting metrics
profiler.start();
console.log('🚀 Monitoring started...');

// Run your WebGPU application
// (In real usage, this would be your render loop or compute shaders)

// Let's simulate some activity
setTimeout(() => {
  // Get current metrics
  const currentMetrics = profiler.getCurrentMetrics();
  console.log('📊 Current Status:');
  console.log(`  GPU: ${currentMetrics.utilization}% utilized`);
  console.log(`  FPS: ${currentMetrics.fps}`);
}, 2000);
```

### Step 4: Run Benchmarks (1 minute)

```typescript
// Run comprehensive GPU benchmarks
console.log('🏃 Running benchmarks...');
const benchmarkResults = await profiler.runBenchmarks();

console.log('📈 Benchmark Results:');
console.log(`  Overall Score: ${benchmarkResults.overallScore.toFixed(1)}/100`);

benchmarkResults.results.forEach(result => {
  console.log(`  ${result.name}:`);
  console.log(`    Score: ${result.score.toFixed(2)} ${result.unit}`);
  console.log(`    Execution Time: ${result.executionTime.toFixed(2)}ms`);
});
```

### Step 5: See Results (30 seconds)

```bash
# Run your file
npx tsx gpu-profile.ts

# Expected output:
# ✅ GPU Profiler initialized!
# 🚀 Monitoring started...
# 🎮 GPU Metrics Update:
#   Utilization: 45.2%
#   FPS: 60.0
#   Frame Time: 16.67ms
#   Memory: 128.5 MB
# 📊 Current Status:
#   GPU: 45% utilized
#   FPS: 60
# 🏃 Running benchmarks...
# 📈 Benchmark Results:
#   Overall Score: 78.5/100
#   Compute Performance: 2500.50 GFLOPS
#   Memory Bandwidth: 180.20 GB/s
```

### Step 6: Cleanup (30 seconds)

```typescript
// Stop profiling when done
profiler.stop();
console.log('✅ Monitoring stopped');

// Clean up resources
profiler.cleanup();
console.log('🧹 Resources cleaned up');
```

---

## Complete Working Example

Here's the complete script you can copy-paste:

```typescript
import { createGPUProfiler } from 'browser-gpu-profiler';

async function main() {
  // 1. Create profiler
  const profiler = createGPUProfiler({
    enableMonitoring: true,
    monitoringInterval: 1000,
    onMetricsUpdate: (metrics) => {
      console.log(`GPU: ${metrics.utilization.toFixed(1)}% | FPS: ${metrics.fps.toFixed(1)}`);
    },
  });

  // 2. Initialize
  await profiler.initialize();
  console.log('✅ GPU Profiler ready!');

  // 3. Start monitoring
  profiler.start();

  // 4. Get device info
  const deviceInfo = profiler.getDeviceInfo();
  console.log(`🎮 GPU: ${deviceInfo.vendor} ${deviceInfo.architecture}`);

  // 5. Run benchmarks (optional)
  const benchmarks = await profiler.runBenchmarks();
  console.log(`📈 Overall Score: ${benchmarks.overallScore}/100`);

  // 6. Cleanup
  profiler.stop();
  profiler.cleanup();
  console.log('✅ Done!');
}

main().catch(console.error);
```

---

## Next Steps

### 📖 Learn More

- **[User Guide](./USER_GUIDE.md)** - Complete guide with 15+ real-world use cases
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Full API reference and integration examples
- **[Architecture Guide](./ARCHITECTURE.md)** - Technical deep-dive into internals

### 💡 Try Examples

Explore production-ready examples in the `examples/` directory:

- **Game Performance Dashboard** - Real-time FPS monitoring and alerts
- **Shader Optimizer** - Profile and optimize compute shaders
- **Cross-Device Benchmark** - Compare GPU performance across devices
- **ML Model Performance** - GPU vs CPU comparison for ML workloads

### 🎯 Common Use Cases

1. **Debug Performance Issues** - Identify GPU bottlenecks in real-time
2. **Compare Hardware** - Benchmark across different devices
3. **Detect Memory Leaks** - Track buffer and texture allocations
4. **Optimize Shaders** - Profile execution times and find bottlenecks
5. **Validate Performance** - Ensure performance before release

---

## Troubleshooting

### Issue: "WebGPU is not available"

**Solution:** Check your browser version:
```typescript
import { isWebGPUAvailable } from 'browser-gpu-profiler';

if (!isWebGPUAvailable()) {
  console.error('❌ WebGPU not supported. Please use Chrome 113+ or Edge 113+');
} else {
  console.log('✅ WebGPU is available!');
}
```

### Issue: "Profiling shows 0% utilization"

**Solution:** This is normal if no WebGPU workloads are running. The profiler measures actual GPU usage. Try running a compute shader or rendering loop.

### Issue: "Benchmarks timeout"

**Solution:** Some GPUs take longer for benchmarks. Increase timeout:
```typescript
const profiler = createGPUProfiler({
  benchmarkTimeout: 30000, // 30 seconds
});
```

### Issue: "Memory usage seems high"

**Solution:** The profiler itself uses some memory. For accurate app metrics:
```typescript
// Start profiler first
await profiler.initialize();
profiler.start();

// Then create your WebGPU resources
const baselineMemory = profiler.getMemoryMetrics().totalAllocated;

// ... create your resources ...

const appMemory = profiler.getMemoryMetrics().totalAllocated - baselineMemory;
console.log(`App uses: ${(appMemory / 1024 / 1024).toFixed(1)} MB`);
```

---

## Get Help

### Documentation

- **[README](../README.md)** - Project overview and features
- **[User Guide](./USER_GUIDE.md)** - Complete user documentation
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - API reference

### Community

- **[GitHub Issues](https://github.com/SuperInstance/browser-gpu-profiler/issues)** - Bug reports & feature requests
- **[GitHub Discussions](https://github.com/SuperInstance/browser-gpu-profiler/discussions)** - Questions & discussions
- **[NPM Package](https://www.npmjs.com/package/browser-gpu-profiler)** - Package information

### Quick Reference

```typescript
// Import
import { createGPUProfiler, isWebGPUAvailable } from 'browser-gpu-profiler';

// Check support
if (!isWebGPUAvailable()) {
  // Handle unsupported browsers
}

// Create & initialize
const profiler = createGPUProfiler({ /* config */ });
await profiler.initialize();

// Start/Stop
profiler.start();
profiler.stop();

// Get metrics
const metrics = profiler.getCurrentMetrics();
const memory = profiler.getMemoryMetrics();
const device = profiler.getDeviceInfo();

// Benchmarks
const results = await profiler.runBenchmarks();

// Cleanup
profiler.cleanup();
```

---

## Success Checklist ✅

After completing this guide, you should be able to:

- ✅ Install and import the package
- ✅ Initialize a GPU profiler
- ✅ Start and stop monitoring
- ✅ View real-time GPU metrics (utilization, FPS, memory)
- ✅ Run comprehensive benchmarks
- ✅ Access device information
- ✅ Clean up resources properly

**Did you complete all steps?** You're ready to use Browser GPU Profiler in production!

---

## Where to Go From Here?

### Continue Learning

1. **Read the User Guide** - Learn advanced monitoring patterns
2. **Explore Examples** - See real-world implementations
3. **Check API Reference** - Discover all available methods
4. **Join Community** - Share your use cases and get feedback

### Build Something Amazing

- 🔥 **Game Performance Dashboard** - Real-time FPS monitoring
- 📊 **GPU Benchmark Tool** - Compare hardware performance
- 🐛 **Memory Leak Detector** - Track buffer/texture allocations
- ⚡ **Shader Profiler** - Identify bottlenecks in compute shaders
- 🎯 **Performance Validator** - Ensure performance before releases

---

**Ready to dive deeper?** Check out the [User Guide](./USER_GUIDE.md) for comprehensive documentation!

**Made with ❤️ by the SuperInstance team**
