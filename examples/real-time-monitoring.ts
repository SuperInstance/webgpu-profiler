/**
 * Real-Time Monitoring Example
 *
 * This example demonstrates real-time GPU monitoring:
 * - Setting up callbacks for live metrics
 * - Creating a dashboard display
 * - Monitoring memory allocations over time
 * - Detecting performance issues
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

// Simple HTML dashboard (would be used in a browser)
function createHTMLDashboard(): void {
  const dashboard = document.createElement('div');
  dashboard.id = 'gpu-dashboard';
  dashboard.style.position = 'fixed';
  dashboard.style.top = '10px';
  dashboard.style.right = '10px';
  dashboard.style.padding = '15px';
  dashboard.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  dashboard.style.color = '#fff';
  dashboard.style.borderRadius = '8px';
  dashboard.style.fontFamily = 'monospace';
  dashboard.style.fontSize = '12px';
  dashboard.style.zIndex = '9999';
  dashboard.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold;">GPU Profiler Dashboard</div>
    <div id="gpu-fps">FPS: --</div>
    <div id="gpu-utilization">Utilization: --</div>
    <div id="gpu-memory">Memory: --</div>
    <div id="gpu-frames">Frames: --</div>
    <div style="margin-top: 10px; font-size: 10px;">
      <div style="color: #4CAF50;">● Good</div>
      <div style="color: #FFC107;">● Warning</div>
      <div style="color: #F44336;">● Critical</div>
    </div>
  `;

  document.body.appendChild(dashboard);
}

function updateDashboard(metrics: any, memory: any, stats: any): void {
  const fpsElement = document.getElementById('gpu-fps');
  const utilizationElement = document.getElementById('gpu-utilization');
  const memoryElement = document.getElementById('gpu-memory');
  const framesElement = document.getElementById('gpu-frames');

  if (fpsElement) {
    const fps = metrics.fps;
    const color = fps >= 55 ? '#4CAF50' : fps >= 30 ? '#FFC107' : '#F44336';
    fpsElement.innerHTML = `FPS: <span style="color: ${color}">${fps.toFixed(1)}</span>`;
  }

  if (utilizationElement) {
    const utilization = metrics.utilization;
    const color = utilization <= 70 ? '#4CAF50' : utilization <= 90 ? '#FFC107' : '#F44336';
    utilizationElement.innerHTML = `Utilization: <span style="color: ${color}">${utilization.toFixed(1)}%</span>`;
  }

  if (memoryElement) {
    const memoryMB = (memory.totalAllocated / 1024 / 1024).toFixed(1);
    memoryElement.innerHTML = `Memory: ${memoryMB} MB`;
  }

  if (framesElement && stats) {
    framesElement.innerHTML = `Frames: ${stats.totalFrames}`;
  }
}

async function realTimeMonitoringExample() {
  console.log('=== Browser GPU Profiler - Real-Time Monitoring ===\n');

  // Metrics history for analysis
  const metricsHistory: any[] = [];
  const memoryHistory: any[] = [];
  let performanceIssues: string[] = [];

  // 1. Create profiler with callbacks
  const profiler = createGPUProfiler({
    enableMonitoring: true,
    monitoringInterval: 500, // Update every 500ms
    enableMemoryTracking: true,
    enableShaderProfiling: true,
    maxHistorySize: 2000,

    // Callback: Metrics update
    onMetricsUpdate: (metrics) => {
      metricsHistory.push(metrics);

      // Detect performance issues
      if (metrics.fps < 30) {
        const issue = `Low FPS detected: ${metrics.fps.toFixed(1)}`;
        if (!performanceIssues.includes(issue)) {
          performanceIssues.push(issue);
          console.warn(`⚠️ ${issue}`);
        }
      }

      if (metrics.utilization > 90) {
        const issue = `High GPU utilization: ${metrics.utilization.toFixed(1)}%`;
        if (!performanceIssues.includes(issue)) {
          performanceIssues.push(issue);
          console.warn(`⚠️ ${issue}`);
        }
      }
    },

    // Callback: Memory update
    onMemoryUpdate: (memory) => {
      memoryHistory.push(memory);

      // Detect memory leaks
      if (memoryHistory.length > 10) {
        const recent = memoryHistory.slice(-10);
        const trend = recent[recent.length - 1].totalAllocated - recent[0].totalAllocized;

        if (trend > 10 * 1024 * 1024) {
          // Increased by more than 10MB
          const issue = `Potential memory leak: +${(trend / 1024 / 1024).toFixed(1)} MB`;
          if (!performanceIssues.includes(issue)) {
            performanceIssues.push(issue);
            console.warn(`⚠️ ${issue}`);
          }
        }
      }
    },

    // Callback: Shader metrics
    onShaderMetrics: (shader) => {
      if (shader.bottlenecks.length > 0) {
        console.warn(`⚠️ Shader ${shader.shaderId} bottlenecks:`);
        shader.bottlenecks.forEach((bottleneck) => {
          console.warn(`   - ${bottleneck}`);
        });
      }
    },
  });

  try {
    // 2. Initialize profiler
    console.log('Initializing profiler...');
    await profiler.initialize();
    console.log('✓ Profiler initialized\n');

    // 3. Get device info
    const deviceInfo = profiler.getDeviceInfo();
    console.log(`Device: ${deviceInfo.vendor} ${deviceInfo.architecture}`);
    console.log('');

    // 4. Create HTML dashboard (if in browser)
    if (typeof document !== 'undefined') {
      createHTMLDashboard();
      console.log('✓ Dashboard created');
    }

    // 5. Start monitoring
    console.log('Starting real-time monitoring...');
    profiler.start();
    console.log('✓ Monitoring started\n');

    console.log('Collecting metrics for 10 seconds...\n');

    // Simulate application workload
    const device = profiler.getDevice();

    // Create some test buffers
    const buffers: GPUBuffer[] = [];
    for (let i = 0; i < 5; i++) {
      const buffer = device.createBuffer({
        size: 1024 * 1024 * 2, // 2MB each
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      buffers.push(buffer);
      profiler.trackBuffer(buffer, `buffer-${i}`);
    }

    // Monitor for 10 seconds
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Create some shader activity
    for (let i = 0; i < 10; i++) {
      profiler.trackShader('test-compute', 'main', Math.random() * 2000 + 500);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // 6. Stop monitoring
    profiler.stop();
    console.log('\n✓ Monitoring stopped\n');

    // 7. Analyze collected data
    console.log('--- Performance Analysis ---');

    if (metricsHistory.length > 0) {
      const avgFPS = metricsHistory.reduce((sum, m) => sum + m.fps, 0) / metricsHistory.length;
      const avgUtilization = metricsHistory.reduce((sum, m) => sum + m.utilization, 0) / metricsHistory.length;
      const avgFrameTime = metricsHistory.reduce((sum, m) => sum + m.frameTime, 0) / metricsHistory.length;

      console.log(`Average FPS: ${avgFPS.toFixed(2)}`);
      console.log(`Average Utilization: ${avgUtilization.toFixed(1)}%`);
      console.log(`Average Frame Time: ${avgFrameTime.toFixed(2)} ms`);
      console.log('');
    }

    // 8. Get comprehensive statistics
    const stats = profiler.getPerformanceStats();
    console.log('--- Statistics ---');
    console.log(`Total Frames: ${stats.totalFrames}`);
    console.log(`Min FPS: ${stats.minFps.toFixed(2)}`);
    console.log(`Max FPS: ${stats.maxFps.toFixed(2)}`);
    console.log(`Frame Time (p50): ${stats.frameTimePercentiles.p50.toFixed(2)} ms`);
    console.log(`Frame Time (p95): ${stats.frameTimePercentiles.p95.toFixed(2)} ms`);
    console.log(`Frame Time (p99): ${stats.frameTimePercentiles.p99.toFixed(2)} ms`);
    console.log('');

    // 9. Memory analysis
    const memoryMetrics = profiler.getMemoryMetrics();
    console.log('--- Memory Analysis ---');
    console.log(`Total Allocated: ${(memoryMetrics.totalAllocated / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Buffer Memory: ${(memoryMetrics.bufferMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Texture Memory: ${(memoryMetrics.textureMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Active Allocations: ${memoryMetrics.allocations.size}`);
    console.log('');

    // 10. Shader analysis
    const shaderMetrics = profiler.getShaderMetrics();
    if (shaderMetrics.length > 0) {
      console.log('--- Shader Performance ---');
      shaderMetrics.forEach((shader) => {
        console.log(`Shader: ${shader.shaderId}`);
        console.log(`  Invocations: ${shader.invocations}`);
        console.log(`  Avg Time: ${shader.avgExecutionTime.toFixed(2)} μs`);
        console.log(`  Min: ${shader.minExecutionTime} μs`);
        console.log(`  Max: ${shader.maxExecutionTime} μs`);
        if (shader.bottlenecks.length > 0) {
          console.log(`  Bottlenecks:`);
          shader.bottlenecks.forEach((b) => console.log(`    - ${b}`));
        }
      });
      console.log('');
    }

    // 11. Summary
    console.log('--- Summary ---');
    console.log(`Monitoring Duration: 10 seconds`);
    console.log(`Metrics Collected: ${metricsHistory.length}`);
    console.log(`Memory Samples: ${memoryHistory.length}`);
    console.log(`Performance Issues Detected: ${performanceIssues.length}`);

    if (performanceIssues.length > 0) {
      console.log('\nIssues:');
      performanceIssues.forEach((issue) => console.log(`  ⚠️ ${issue}`));
    } else {
      console.log('\n✓ No performance issues detected');
    }

    // 12. Cleanup
    console.log('\nCleaning up...');
    buffers.forEach((buffer) => buffer.destroy());
    profiler.cleanup();
    console.log('✓ Cleanup complete');

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the example
realTimeMonitoringExample().catch(console.error);
