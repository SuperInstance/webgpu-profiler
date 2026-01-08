# Browser GPU Profiler - User Guide

## Table of Contents

1. [What is GPU Profiling?](#what-is-gpu-profiling)
2. [When Should I Use This?](#when-should-i-use-this)
3. [How Does It Work?](#how-does-it-work)
4. [Quick Start](#quick-start)
5. [Real-World Use Cases](#real-world-use-cases)
6. [Common Patterns](#common-patterns)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## What is GPU Profiling?

### The Simple Explanation

**GPU profiling** is like having a fitness tracker for your graphics card. Just as a fitness tracker measures your heart rate, steps, and calories burned during exercise, GPU profiling measures how your graphics processing unit (GPU) performs during application execution.

**What GPU Profiling Measures:**

- **Utilization** - How hard your GPU is working (0-100%)
- **Frame Rate** - How many frames per second (FPS) your application renders
- **Memory Usage** - How much GPU memory you're using and where
- **Shader Performance** - How long your GPU programs take to execute
- **Compute Performance** - How fast your GPU processes data
- **Bandwidth** - How quickly data moves to/from GPU memory

### Why Does It Matter?

Imagine you're building a 3D game. You test it on your high-end gaming PC and it runs smoothly at 60 FPS. But when your users try it on their laptops, it struggles at 15 FPS. **GPU profiling tells you why.**

It helps you:

1. **Find bottlenecks** - Which part of your code is slowing things down?
2. **Optimize performance** - Make your application run faster and smoother
3. **Reduce hardware requirements** - Make your app work on more devices
4. **Improve user experience** - Prevent lag, stuttering, and crashes
5. **Save battery life** - Efficient GPU usage means less power consumption

### GPU vs CPU Performance

**CPU (Central Processing Unit):**
- General-purpose processor
- Good at sequential tasks
- Limited parallel processing (typically 4-16 cores)
- Slower for graphics/parallel workloads

**GPU (Graphics Processing Unit):**
- Specialized for parallel processing
- Excellent at graphics and matrix operations
- Massive parallelism (thousands of cores)
- 10-100x faster for suitable workloads

**Browser GPU Profiler helps you decide when to use GPU acceleration and how to optimize it.**

---

## When Should I Use This?

### 10+ Real-World Scenarios

#### 1. **Web Game Development**

**Scenario:** You're building a 3D web game using WebGPU and want to ensure smooth 60 FPS performance.

**Solution:** Use real-time monitoring to track FPS, frame time, and GPU utilization.

```typescript
const profiler = createGPUProfiler({
  onMetricsUpdate: (metrics) => {
    if (metrics.fps < 55) {
      console.warn('Performance drop detected!');
      // Reduce quality settings
    }
  }
});
```

**Result:** Deliver a consistently smooth gaming experience.

---

#### 2. **ML Model Optimization**

**Scenario:** You're running machine learning inference in the browser and need to decide between CPU and GPU.

**Solution:** Benchmark both platforms and compare performance.

```typescript
// Run GPU benchmark
const gpuResult = await profiler.runBenchmark('compute');

// Compare with CPU baseline
const speedup = cpuTime / gpuResult.executionTime;

if (speedup > 2) {
  console.log('Use GPU - 2x faster!');
}
```

**Result:** Make data-driven decisions about hardware acceleration.

---

#### 3. **Memory Leak Detection**

**Scenario:** Your WebGPU application gradually slows down after extended use.

**Solution:** Track memory allocations over time.

```typescript
profiler.start();

// ... run application for an hour ...

const memoryHistory = profiler.getMemoryMetrics().history;
const trend = calculateTrend(memoryHistory);

if (trend > 0.1) {
  console.warn('Memory leak detected!');
  // Investigate untracked resources
}
```

**Result:** Catch memory leaks before they crash your application.

---

#### 4. **Shader Performance Debugging**

**Scenario:** Your compute shader takes 50ms but should only take 5ms.

**Solution:** Profile shader execution and identify bottlenecks.

```typescript
const start = performance.now();
await runShader();
const duration = (performance.now() - start) * 1000; // microseconds

profiler.trackShader('my-shader', 'main', duration);

const metrics = profiler.getShaderMetricsById('my-shader');
console.log('Bottlenecks:', metrics.bottlenecks);
```

**Result:** Optimize shader code for 10x performance improvement.

---

#### 5. **Cross-Device Testing**

**Scenario:** You need to ensure your app works on laptops, desktops, and mobile devices.

**Solution:** Run benchmarks on different devices and compare results.

```typescript
// Desktop
const desktopResults = await profiler.runBenchmarks();
saveToFile('desktop-benchmark.json', desktopResults);

// Laptop
const laptopResults = await profiler.runBenchmarks();
saveToFile('laptop-benchmark.json', laptopResults);

// Compare
const comparison = profiler.compareWithImport(laptopResults);
console.log('Laptop is', comparison.relativeScore, '% of desktop');
```

**Result:** Set realistic minimum hardware requirements.

---

#### 6. **Real-Time Monitoring Dashboard**

**Scenario:** You want to display live GPU performance to users (e.g., in a game debug panel).

**Solution:** Use callbacks to update UI in real-time.

```typescript
const profiler = createGPUProfiler({
  monitoringInterval: 500, // Update every 500ms
  onMetricsUpdate: (metrics) => {
    updateDebugPanel({
      fps: metrics.fps,
      gpu: metrics.utilization + '%',
      memory: (metrics.memoryUsed / 1024 / 1024).toFixed(1) + ' MB',
    });
  }
});
```

**Result:** Users see transparent performance information.

---

#### 7. **Pre-Deployment Validation**

**Scenario:** Before releasing your app, you want to ensure it meets performance targets.

**Solution:** Create automated performance tests.

```typescript
const profiler = createGPUProfiler();
await profiler.initialize();
profiler.start();

// Run typical workload
await simulateUserSession();

const stats = profiler.getPerformanceStats();
if (stats.avgFps < 30) {
  throw new Error('Performance target not met!');
}
```

**Result:** Catch performance regressions before deployment.

---

#### 8. **Scientific Visualization**

**Scenario:** You're visualizing large datasets and need to optimize rendering performance.

**Solution:** Profile different visualization techniques.

```typescript
// Technique 1: Point cloud
profiler.trackShader('point-cloud', 'render', duration);

// Technique 2: Heat map
profiler.trackShader('heat-map', 'render', duration);

// Compare
const pointCloud = profiler.getShaderMetricsById('point-cloud');
const heatMap = profiler.getShaderMetricsById('heat-map');

if (pointCloud.avgExecutionTime < heatMap.avgExecutionTime) {
  console.log('Point cloud is faster');
}
```

**Result:** Choose the fastest visualization technique.

---

#### 9. **WebGPU Feature Detection**

**Scenario:** Your app uses advanced WebGPU features and needs to verify hardware support.

**Solution:** Check device capabilities before running.

```typescript
const profiler = createGPUProfiler();
await profiler.initialize();

const deviceInfo = profiler.getDeviceInfo();
if (!deviceInfo.features.includes('timestamp-query')) {
  console.warn('Timestamp queries not supported - using fallback');
}
```

**Result:** Graceful degradation on unsupported hardware.

---

#### 10. **Performance Regression Testing**

**Scenario:** After code changes, you want to ensure performance hasn't degraded.

**Solution:** Compare before/after benchmarks.

```typescript
// Before changes
const before = await profiler.runBenchmarks();
profiler.exportToString('before.json');

// ... make code changes ...

// After changes
const after = await profiler.runBenchmarks();

if (after.overallScore < before.overallScore * 0.95) {
  console.error('Performance regression detected!');
}
```

**Result:** Maintain performance standards across releases.

---

#### 11. **Batch Processing Optimization**

**Scenario:** You're processing video frames and want optimal batch size.

**Solution:** Benchmark different batch sizes.

```typescript
for (const batchSize of [1, 4, 8, 16, 32]) {
  profiler.start();
  await processFrames(batchSize);
  profiler.stop();

  const stats = profiler.getPerformanceStats();
  console.log(`${batchSize}: ${stats.avgFps} FPS`);
}
```

**Result:** Find the sweet spot for throughput vs latency.

---

#### 12. **Power Consumption Monitoring**

**Scenario:** You're building a mobile web app and need to minimize battery drain.

**Solution:** Monitor GPU utilization and optimize for efficiency.

```typescript
const profiler = createGPUProfiler({
  onMetricsUpdate: (metrics) => {
    if (metrics.utilization > 80) {
      console.warn('High GPU usage - reduce quality to save battery');
    }
  }
});
```

**Result:** Extend battery life on mobile devices.

---

## How Does It Work?

### The Architecture (Simplified)

```
Your WebGPU Application
         │
         ├─> Create shaders, buffers, textures
         │
         ▼
┌─────────────────────────────────────┐
│     Browser GPU Profiler            │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Real-Time Monitoring         │  │
│  │ • FPS, frame time            │  │
│  │ • GPU utilization            │  │
│  │ • Memory usage               │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Memory Tracking              │  │
│  │ • Buffer allocations         │  │
│  │ • Texture allocations        │  │
│  │ • Leak detection             │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Shader Profiling             │  │
│  │ • Execution timing           │  │
│  │ • Bottleneck detection       │  │
│  │ • Statistics                 │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │ Benchmark Suite              │  │
│  │ • Compute performance        │  │
│  │ • Memory bandwidth           │  │
│  │ • Texture transfer           │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
         │
         ▼
   WebGPU API
   (Browser)
```

### Data Flow

1. **Initialization**
   - Profiler requests WebGPU adapter and device
   - Gathers device information (vendor, architecture, features)
   - Sets up monitoring interval

2. **Monitoring Loop**
   - Every X milliseconds (default: 1000ms), profiler collects metrics
   - Calculates FPS, frame time, GPU utilization
   - Triggers user callbacks with updated metrics
   - Stores in history for analysis

3. **Resource Tracking**
   - When you create buffers/textures, profiler tracks them
   - Records size, usage, and timestamp
   - Maintains allocation history for leak detection

4. **Shader Profiling**
   - You measure shader execution time with `performance.now()`
   - Profiler records timing and calculates statistics
   - Identifies bottlenecks based on patterns

5. **Benchmarking**
   - Profiler runs standardized tests
   - Measures compute, memory, texture performance
   - Calculates overall score (0-100)

### What Makes It Different?

**vs Browser DevTools:**
- ✅ WebGPU-specific (DevTools focus on WebGL)
- ✅ Customizable monitoring intervals
- ✅ Export/import for cross-device comparison
- ✅ Memory leak detection
- ✅ Production-ready (not just development)

**vs Custom Performance Code:**
- ✅ No need to write your own tracking
- ✅ Comprehensive metrics out of the box
- ✅ Well-tested and reliable
- ✅ Standardized benchmarks
- ✅ Easy to integrate

---

## Quick Start

### 5-Minute Setup

#### Step 1: Install

```bash
npm install browser-gpu-profiler
```

#### Step 2: Basic Profiling

```typescript
import { createGPUProfiler } from 'browser-gpu-profiler';

// Create profiler
const profiler = createGPUProfiler();

// Initialize
await profiler.initialize();

// Start monitoring
profiler.start();

// Run your WebGPU code
// ...

// Get results
const stats = profiler.getPerformanceStats();
console.log(`Average FPS: ${stats.avgFps}`);
console.log(`Frame Time: ${stats.avgFrameTime}ms`);

// Cleanup
profiler.cleanup();
```

#### Step 3: See the Results

That's it! You now have:
- Real-time FPS tracking
- Frame time measurements
- GPU utilization estimates
- Memory usage tracking

### Next Steps

1. **Add callbacks** for real-time updates
2. **Track resources** (buffers, textures)
3. **Profile shaders** for optimization
4. **Run benchmarks** for capability assessment
5. **Export data** for analysis

---

## Real-World Use Cases

### Use Case 1: Debugging GPU Performance Bottlenecks

**Problem:** My WebGPU game runs at 30 FPS but should be 60 FPS.

**Solution:**

```typescript
const profiler = createGPUProfiler({
  monitoringInterval: 100, // Update every 100ms
  onMetricsUpdate: (metrics) => {
    console.log(`FPS: ${metrics.fps}`);
    console.log(`Frame Time: ${metrics.frameTime}ms`);
    console.log(`GPU Utilization: ${metrics.utilization}%`);
    console.log(`Compute Time: ${metrics.computeTime}ms`);
  }
});

await profiler.initialize();
profiler.start();

// Run game for 30 seconds
await runGameFor(30000);

// Analyze results
const stats = profiler.getPerformanceStats();
console.log('P95 Frame Time:', stats.frameTimePercentiles.p95, 'ms');
```

**What to Look For:**
- High GPU utilization (>90%) → GPU bottleneck
- Low GPU utilization (<50%) → CPU bottleneck
- High compute time → Optimize shaders
- High frame time variance → Unstable performance

**Outcome:** Identified that compute shaders were the bottleneck, optimized them, and achieved 60 FPS.

---

### Use Case 2: Comparing GPU Performance Across Devices

**Problem:** How does my app perform on different GPUs?

**Solution:**

```typescript
// Device 1 (Desktop)
const profiler1 = createGPUProfiler();
await profiler1.initialize();
const results1 = await profiler1.runBenchmarks();
console.log('Desktop Score:', results1.overallScore);

// Save to file
fs.writeFileSync('desktop.json', profiler1.exportToString());

// Device 2 (Laptop)
const profiler2 = createGPUProfiler();
await profiler2.initialize();

// Import and compare
const desktopData = profiler2.import(fs.readFileSync('desktop.json', 'utf-8'));
const comparison = profiler2.compareWithImport(desktopData);

comparison.forEach(comp => {
  console.log(`${comp.device}: ${comp.relativeScore}% of current`);
});
```

**Outcome:** Created performance baseline, identified laptop needs 40% longer to complete tasks, adjusted graphics quality accordingly.

---

### Use Case 3: Optimizing WebGPU Compute Shaders

**Problem:** Which shader is slowing down my ML model?

**Solution:**

```typescript
const profiler = createGPUProfiler({ enableShaderProfiling: true });
await profiler.initialize();

// Profile each shader
for (const shader of ['data-prep', 'inference', 'post-process']) {
  const start = performance.now();
  await runShader(shader);
  const duration = (performance.now() - start) * 1000; // μs

  profiler.trackShader(shader, 'main', duration);
}

// Get results
const shaders = profiler.getShaderMetrics();
shaders.forEach(s => {
  console.log(`${s.shaderId}: ${s.avgExecutionTime}μs`);
  if (s.bottlenecks.length > 0) {
    console.log('  Issues:', s.bottlenecks);
  }
});
```

**Outcome:** Found that 'data-prep' shader was taking 60% of total time, optimized it, and achieved 2.5x speedup.

---

### Use Case 4: Monitoring GPU Memory Usage

**Problem:** Is my app leaking GPU memory?

**Solution:**

```typescript
const profiler = createGPUProfiler({
  enableMemoryTracking: true,
  onMemoryUpdate: (memory) => {
    console.log(`Memory: ${memory.totalAllocated / 1024 / 1024} MB`);
  }
});

await profiler.initialize();
profiler.start();

// Track resources
const buffer = device.createBuffer({ size: 1024 * 1024, usage: GPUBufferUsage.STORAGE });
profiler.trackBuffer(buffer, 'large-buffer');

// ... run application ...

// Check for leaks
const history = profiler.getMemoryMetrics().history;
const start = history[0].totalAllocated;
const end = history[history.length - 1].totalAllocated;

if (end > start * 1.5) {
  console.warn('Memory leak detected!');
  console.log('Active allocations:', profiler.getMemoryMetrics().allocations.size);
}
```

**Outcome:** Found untracked texture allocations, added tracking, and fixed memory leak.

---

### Use Case 5: Benchmarking GPU Capabilities

**Problem:** What can this GPU actually do?

**Solution:**

```typescript
const profiler = createGPUProfiler();
await profiler.initialize();

// Run complete benchmark suite
const suite = await profiler.runBenchmarks();

console.log('Overall Score:', suite.overallScore);

suite.results.forEach(result => {
  console.log(`\n${result.name}:`);
  console.log(`  Score: ${result.score.toFixed(2)} ${result.unit}`);
  console.log(`  Time: ${result.executionTime.toFixed(2)}ms`);
});

// Check specific capabilities
const deviceInfo = profiler.getDeviceInfo();
console.log('\nSupported Features:', deviceInfo.features);
console.log('Max Buffer Size:', deviceInfo.limits.maxBufferSize);
```

**Outcome:** Determined GPU can handle 4K textures but not 8K, adjusted asset quality accordingly.

---

### Use Case 6: Real-Time GPU Monitoring in Dashboards

**Problem:** I want to show live performance to users.

**Solution:**

```typescript
class PerformanceMonitor {
  private profiler = createGPUProfiler({
    monitoringInterval: 500,
    onMetricsUpdate: (metrics) => {
      this.updateUI(metrics);
    }
  });

  async start() {
    await this.profiler.initialize();
    this.profiler.start();
  }

  private updateUI(metrics: any) {
    document.getElementById('fps').textContent = metrics.fps.toFixed(1);
    document.getElementById('gpu').textContent = metrics.utilization + '%';
    document.getElementById('memory').textContent =
      (metrics.memoryUsed / 1024 / 1024).toFixed(1) + ' MB';
  }
}

// Use in your app
const monitor = new PerformanceMonitor();
await monitor.start();
```

**Outcome:** Users see transparent performance metrics, can adjust quality settings themselves.

---

### Use Case 7: Game Performance Optimization

**Problem:** Optimize game for different hardware tiers.

**Solution:**

```typescript
const profiler = createGPUProfiler();
await profiler.initialize();

// Determine hardware tier
const benchmarks = await profiler.runBenchmarks();
let tier = 'low';

if (benchmarks.overallScore > 80) tier = 'ultra';
else if (benchmarks.overallScore > 60) tier = 'high';
else if (benchmarks.overallScore > 40) tier = 'medium';

// Apply settings based on tier
const settings = QUALITY_SETTINGS[tier];
applySettings(settings);

console.log(`Detected ${tier} tier hardware`);
```

**Outcome:** Automatic quality scaling ensures smooth gameplay on all devices.

---

### Use Case 8: ML Model Performance Testing

**Problem:** Should I use GPU for my ML model?

**Solution:**

```typescript
// Test CPU performance
const cpuStart = performance.now();
await runMLModelOnCPU();
const cpuTime = performance.now() - cpuStart;

// Test GPU performance
const gpuBenchmark = await profiler.runBenchmark('compute');
const gpuTime = gpuBenchmark.executionTime;

const speedup = cpuTime / gpuTime;
console.log(`GPU is ${speedup.toFixed(2)}x faster`);

if (speedup > 2) {
  console.log('✅ Use GPU acceleration');
} else {
  console.log('⚠️ CPU is sufficient');
}
```

**Outcome:** Small models run faster on CPU (less overhead), large models benefit from GPU acceleration.

---

### Use Case 9: Pre-Deployment GPU Capability Checks

**Problem:** Ensure app meets performance requirements before release.

**Solution:**

```typescript
const profiler = createGPUProfiler();
await profiler.initialize();

// Check requirements
const deviceInfo = profiler.getDeviceInfo();
const benchmarks = await profiler.runBenchmarks();

const requirements = {
  minScore: 30,
  requiredFeatures: ['texture-compression-bc'],
  minBufferSize: 256 * 1024 * 1024, // 256MB
};

if (benchmarks.overallScore < requirements.minScore) {
  throw new Error('GPU too slow');
}

if (!requirements.requiredFeatures.every(f => deviceInfo.features.includes(f))) {
  throw new Error('Missing required features');
}

if (deviceInfo.limits.maxBufferSize < requirements.minBufferSize) {
  throw new Error('Insufficient memory');
}

console.log('✅ All requirements met');
```

**Outcome:** Automated testing prevents releasing on unsupported hardware.

---

### Use Case 10: Cross-Device GPU Comparison

**Problem:** Compare my GPU performance with other devices.

**Solution:**

```typescript
// Run on current device
const profiler = createGPUProfiler();
await profiler.initialize();
const currentResults = await profiler.runBenchmarks();

// Import reference data
const referenceData = profiler.import(`
  {
    "device": { "vendor": "NVIDIA", "architecture": "RTX 3080" },
    "benchmarks": [{
      "overallScore": 85.5,
      "results": [...]
    }]
  }
`);

const comparison = profiler.compareWithImport(referenceData);

console.log('Performance Comparison:');
comparison.forEach(comp => {
  const myScore = currentResults.overallScore;
  const refScore = comp.device;
  const diff = ((myScore - refScore) / refScore * 100).toFixed(1);

  console.log(`${comp.device}: ${diff > 0 ? '+' : ''}${diff}%`);
});
```

**Outcome:** Understand relative performance, set realistic expectations.

---

## Common Patterns

### Pattern 1: Callback-Based Monitoring

```typescript
const profiler = createGPUProfiler({
  monitoringInterval: 1000,
  onMetricsUpdate: (metrics) => {
    // Update UI, log to analytics, etc.
  },
  onMemoryUpdate: (memory) => {
    // Check for leaks, warn user
  },
  onShaderMetrics: (shader) => {
    // Analyze shader performance
  }
});
```

### Pattern 2: Manual Profiling Session

```typescript
const profiler = createGPUProfiler();
await profiler.initialize();

// Profile specific operation
profiler.start();
await runOperation();
profiler.stop();

const stats = profiler.getPerformanceStats();
console.log('Operation FPS:', stats.avgFps);
```

### Pattern 3: Resource Tracking

```typescript
// Create and track
const buffer = device.createBuffer({ size: 1024, usage: GPUBufferUsage.STORAGE });
profiler.trackBuffer(buffer, 'my-buffer');

// Use resource
// ...

// Destroy and untrack
buffer.destroy();
profiler.untrackBuffer('my-buffer');
```

### Pattern 4: Benchmark Comparison

```typescript
// Baseline
const baseline = await profiler.runBenchmarks();
saveToStorage('baseline', baseline);

// After optimization
const optimized = await profiler.runBenchmarks();
const improvement = ((optimized.overallScore - baseline.overallScore) / baseline.overallScore * 100);

console.log(`Improvement: ${improvement.toFixed(1)}%`);
```

### Pattern 5: Conditional Monitoring

```typescript
const profiler = createGPUProfiler({
  enableMonitoring: process.env.NODE_ENV === 'development',
  monitoringInterval: process.env.NODE_ENV === 'development' ? 1000 : 5000,
});
```

---

## Best Practices

### DO ✅

1. **Initialize early** - Call `initialize()` before any WebGPU operations
2. **Cleanup properly** - Always call `cleanup()` when done
3. **Set appropriate intervals** - 1000ms for production, 100ms for debugging
4. **Track all resources** - Track buffers and textures for leak detection
5. **Profile before optimizing** - Measure first, then optimize
6. **Use baselines** - Establish performance baselines for comparison
7. **Test on multiple devices** - Verify performance across hardware
8. **Monitor in production** - Keep lightweight monitoring for real-world data
9. **Export regularly** - Save benchmark results for trend analysis
10. **Set thresholds** - Define acceptable performance ranges

### DON'T ❌

1. **Don't profile too frequently** - Avoid intervals <100ms (overhead)
2. **Don't forget to cleanup** - Memory leaks if you don't call `cleanup()`
3. **Don't ignore bottlenecks** - High frame time variance needs attention
4. **Don't optimize prematurely** - Profile first, then optimize
5. **Don't assume GPU is faster** - Small tasks may be faster on CPU
6. **Don't rely on single metrics** - Look at FPS, frame time, and utilization
7. **Don't forget error handling** - Wrap in try/catch for production
8. **Don't track everything** - Focus on resources that matter
9. **Don't ignore hardware limits** - Respect device capabilities
10. **Don't skip cross-device testing** - Test on target hardware

---

## Troubleshooting

### Issue: "WebGPU is not available"

**Cause:** Browser doesn't support WebGPU or it's not enabled.

**Solution:**
1. Check browser version (Chrome 113+, Edge 113+)
2. Enable WebGPU flags: `chrome://flags/#enable-unsafe-webgpu`
3. Use feature detection:
   ```typescript
   if (!isWebGPUAvailable()) {
     console.error('WebGPU not supported');
     return;
   }
   ```

---

### Issue: "FPS seems incorrect"

**Cause:** Monitoring interval too short or no actual rendering happening.

**Solution:**
1. Increase monitoring interval to 1000ms
2. Ensure you're actually rendering frames
3. Check that `requestAnimationFrame` is being called
4. Verify frame time calculations:
   ```typescript
   const metrics = profiler.getCurrentMetrics();
   console.log('Frame time:', metrics.frameTime, 'ms');
   ```

---

### Issue: "Memory usage keeps increasing"

**Cause:** Memory leak - resources not being destroyed or untracked.

**Solution:**
1. Check you're calling `buffer.destroy()` and `texture.destroy()`
2. Ensure you're calling `profiler.untrackBuffer()` and `profiler.untrackTexture()`
3. Review allocation history:
   ```typescript
   const memory = profiler.getMemoryMetrics();
   memory.allocations.forEach((alloc, id) => {
     if (!alloc.active) {
       console.warn('Leaked allocation:', id);
     }
   });
   ```

---

### Issue: "Shader metrics show no data"

**Cause:** Not calling `profiler.trackShader()` or timing incorrectly.

**Solution:**
1. Ensure you're timing correctly:
   ```typescript
   const start = performance.now();
   await runShader();
   const duration = (performance.now() - start) * 1000; // microseconds
   profiler.trackShader('id', 'entry', duration);
   ```
2. Check shader profiling is enabled:
   ```typescript
   const profiler = createGPUProfiler({ enableShaderProfiling: true });
   ```

---

### Issue: "Benchmarks take too long"

**Cause:** Slow GPU or too many benchmark iterations.

**Solution:**
1. Run individual benchmarks instead of full suite:
   ```typescript
   const result = await profiler.runBenchmark('compute');
   ```
2. Reduce benchmark iterations (modify source if needed)
3. Skip benchmarks in production:
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     await profiler.runBenchmarks();
   }
   ```

---

### Issue: "High overhead affecting performance"

**Cause:** Monitoring too frequently or tracking too many resources.

**Solution:**
1. Increase monitoring interval:
   ```typescript
   const profiler = createGPUProfiler({
     monitoringInterval: 5000 // 5 seconds
   });
   ```
2. Disable unnecessary tracking:
   ```typescript
   const profiler = createGPUProfiler({
     enableMemoryTracking: false,
     enableShaderProfiling: false
   });
   ```
3. Use manual profiling instead of continuous:
   ```typescript
   profiler.start(); // Profile specific operation
   await doWork();
   profiler.stop();
   ```

---

### Issue: "Cross-device comparison shows incorrect results"

**Cause:** Different benchmark versions or inconsistent test conditions.

**Solution:**
1. Ensure same benchmark version:
   ```typescript
   console.log(suite.version); // Should match
   ```
2. Run in consistent conditions:
   - Same browser version
   - No other apps running
   - Same power settings (plugged in)
3. Use relative scores, not absolute:
   ```typescript
   const ratio = currentScore / referenceScore;
   console.log(`Performance: ${ratio * 100}%`);
   ```

---

## Next Steps

1. **Read the Developer Guide** - API reference and integration examples
2. **Explore Examples** - Real-world code samples
3. **Check Architecture Docs** - Deep dive into implementation
4. **Run Benchmarks** - Test your GPU capabilities
5. **Join the Community** - Share your experiences and get help

---

**Need Help?**

- Check the [Developer Guide](./DEVELOPER_GUIDE.md) for API reference
- Explore [examples](../examples/) for real-world code
- Review [architecture docs](./ARCHITECTURE.md) for implementation details
- Open an issue on GitHub for bugs or questions

**Happy Profiling! 🚀**
