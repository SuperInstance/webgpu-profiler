/**
 * Basic Usage Example
 *
 * This example demonstrates basic GPU profiling functionality:
 * - Initializing the profiler
 * - Collecting real-time metrics
 * - Tracking memory allocations
 * - Basic benchmarking
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

async function basicUsageExample() {
  console.log('=== Browser GPU Profiler - Basic Usage ===\n');

  // 1. Create profiler instance
  const profiler = createGPUProfiler({
    enableMonitoring: true,
    monitoringInterval: 1000, // Update every second
    enableMemoryTracking: true,
    enableShaderProfiling: true,
  });

  try {
    // 2. Initialize profiler
    console.log('Initializing profiler...');
    await profiler.initialize();
    console.log('✓ Profiler initialized\n');

    // 3. Get device information
    console.log('--- GPU Device Information ---');
    const deviceInfo = profiler.getDeviceInfo();
    console.log(`Vendor: ${deviceInfo.vendor}`);
    console.log(`Architecture: ${deviceInfo.architecture}`);
    console.log(`Description: ${deviceInfo.description}`);
    console.log(`Features: ${deviceInfo.features.length} supported`);
    console.log('');

    // 4. Start profiling
    console.log('Starting profiling...');
    profiler.start();
    console.log('✓ Profiling started\n');

    // 5. Collect some metrics
    console.log('--- Collecting Metrics ---');
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const metrics = profiler.getCurrentMetrics();

      console.log(`Sample ${i + 1}:`);
      console.log(`  FPS: ${metrics.fps.toFixed(2)}`);
      console.log(`  Frame Time: ${metrics.frameTime.toFixed(2)} ms`);
      console.log(`  GPU Utilization: ${metrics.utilization.toFixed(1)}%`);
      console.log(`  Memory Used: ${(metrics.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log('');
    }

    // 6. Track memory allocations
    console.log('--- Memory Tracking ---');
    const device = profiler.getDevice();

    // Create a test buffer
    const testBuffer = device.createBuffer({
      size: 1024 * 1024, // 1MB
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    profiler.trackBuffer(testBuffer, 'test-buffer');
    console.log('Created and tracked 1MB buffer');

    const memoryMetrics = profiler.getMemoryMetrics();
    console.log(`Total Allocated: ${(memoryMetrics.totalAllocated / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Buffer Memory: ${(memoryMetrics.bufferMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log('');

    // 7. Track shader execution
    console.log('--- Shader Profiling ---');
    profiler.trackShader('compute-shader', 'main', 1500); // 1500 microseconds
    profiler.trackShader('compute-shader', 'main', 1800);
    profiler.trackShader('compute-shader', 'main', 1200);

    const shaderMetrics = profiler.getShaderMetricsById('compute-shader');
    if (shaderMetrics) {
      console.log(`Shader: ${shaderMetrics.shaderId}`);
      console.log(`  Entry Point: ${shaderMetrics.entryPoint}`);
      console.log(`  Invocations: ${shaderMetrics.invocations}`);
      console.log(`  Avg Execution Time: ${shaderMetrics.avgExecutionTime.toFixed(2)} μs`);
      console.log(`  Min: ${shaderMetrics.minExecutionTime} μs`);
      console.log(`  Max: ${shaderMetrics.maxExecutionTime} μs`);
    }
    console.log('');

    // 8. Get performance statistics
    console.log('--- Performance Statistics ---');
    const stats = profiler.getPerformanceStats();
    console.log(`Total Frames: ${stats.totalFrames}`);
    console.log(`Average FPS: ${stats.avgFps.toFixed(2)}`);
    console.log(`Min FPS: ${stats.minFps.toFixed(2)}`);
    console.log(`Max FPS: ${stats.maxFps.toFixed(2)}`);
    console.log(`Average Frame Time: ${stats.avgFrameTime.toFixed(2)} ms`);
    console.log('');

    // 9. Export data
    console.log('--- Exporting Data ---');
    const exported = profiler.export();
    console.log(`Exported data version: ${exported.version}`);
    console.log(`Export timestamp: ${new Date(exported.timestamp).toISOString()}`);
    console.log('');

    // 10. Cleanup
    console.log('Cleaning up...');
    testBuffer.destroy();
    profiler.stop();
    profiler.cleanup();
    console.log('✓ Cleanup complete');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
basicUsageExample().catch(console.error);
