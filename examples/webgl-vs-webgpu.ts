/**
 * WebGL vs WebGPU Comparison Example
 *
 * This example demonstrates how to compare performance between WebGL and WebGPU:
 * - Benchmark both APIs side-by-side
 * - Measure performance differences
 * - Determine migration value
 * - Identify bottlenecks
 *
 * Use Case: "Should I migrate from WebGL to WebGPU?"
 *
 * Keywords: WebGL vs WebGPU, WebGPU migration, GPU performance comparison, graphics API benchmark, WebGL to WebGPU
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

interface WebGLContext {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
}

interface WebGPUContext {
  canvas: HTMLCanvasElement;
  device: GPUDevice;
  context: GPUCanvasContext;
}

async function setupWebGL(canvas: HTMLCanvasElement): Promise<WebGLContext> {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    throw new Error('WebGL2 not supported');
  }

  return { canvas, gl };
}

async function setupWebGPU(canvas: HTMLCanvasElement): Promise<WebGPUContext> {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No GPU adapter found');
  }

  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu') as GPUCanvasContext;

  return { canvas, device, context };
}

async function runWebGLBenchmark(ctx: WebGLContext, iterations: number = 100) {
  const { gl } = ctx;

  // Simple triangle shader
  const vsSource = `
    attribute vec4 a_position;
    void main() {
      gl_Position = a_position;
    }
  `;

  const fsSource = `
    precision mediump float;
    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `;

  // Compile shaders
  const vs = gl.createShader(gl.VERTEX_SHADER)!;
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);

  const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);

  // Create program
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  // Create geometry
  const positions = new Float32Array([
    -0.5, -0.5,
     0.5, -0.5,
     0.0,  0.5,
  ]);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  // Benchmark
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    gl.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const endTime = performance.now();
  return endTime - startTime;
}

async function runWebGPUBenchmark(ctx: WebGPUContext, iterations: number = 100) {
  const { device, context } = ctx;

  // Shader
  const shaderModule = device.createShaderModule({
    code: `
      @vertex
      fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
        var positions = array<vec2<f32>, 3>(
          vec2<f32>(-0.5, -0.5),
          vec2<f32>(0.5, -0.5),
          vec2<f32>(0.0, 0.5)
        );
        return vec4<f32>(positions[vertex_index], 0.0, 1.0);
      }

      @fragment
      fn fs_main() -> @location(0) vec4<f32> {
        return vec4<f32>(1.0, 0.0, 0.0, 1.0);
      }
    `
  });

  // Pipeline
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: shaderModule,
      entryPoint: 'vs_main',
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fs_main',
      targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const contextFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format: contextFormat,
  });

  // Benchmark
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    renderPass.setPipeline(pipeline);
    renderPass.draw(3);
    renderPass.end();

    device.queue.submit([commandEncoder.finish()]);
  }

  const endTime = performance.now();
  return endTime - startTime;
}

async function webglVsWebGPUComparison() {
  console.log('=== WebGL vs WebGPU Performance Comparison ===\n');

  // Create canvases
  const webglCanvas = document.createElement('canvas');
  webglCanvas.width = 800;
  webglCanvas.height = 600;

  const webgpuCanvas = document.createElement('canvas');
  webgpuCanvas.width = 800;
  webgpuCanvas.height = 600;

  // Initialize profiler
  const profiler = createGPUProfiler({
    enableMonitoring: true,
    monitoringInterval: 100,
    enableMemoryTracking: true,
  });

  await profiler.initialize();
  profiler.start();

  const results = {
    webgl: {
      supported: false,
      benchmarkTime: 0,
      avgFps: 0,
      memoryUsage: 0,
    },
    webgpu: {
      supported: false,
      benchmarkTime: 0,
      avgFps: 0,
      memoryUsage: 0,
    },
  };

  // Test WebGL
  console.log('🔍 Testing WebGL...');
  try {
    const webglCtx = await setupWebGL(webglCanvas);
    results.webgl.supported = true;

    // Collect WebGL metrics
    await new Promise(resolve => setTimeout(resolve, 500));
    const webglMetrics = profiler.getCurrentMetrics();
    results.webgl.avgFps = webglMetrics.fps;
    results.webgl.memoryUsage = webglMetrics.memoryUsed;

    // Run benchmark
    const webglTime = await runWebGLBenchmark(webglCtx, 100);
    results.webgl.benchmarkTime = webglTime;

    console.log(`✅ WebGL Benchmark: ${webglTime.toFixed(2)}ms for 100 iterations`);
    console.log(`   Avg FPS: ${results.webgl.avgFps.toFixed(2)}`);
    console.log(`   Memory: ${(results.webgl.memoryUsage / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.log(`❌ WebGL not available: ${(error as Error).message}`);
  }

  console.log('');

  // Test WebGPU
  console.log('🔍 Testing WebGPU...');
  try {
    const webgpuCtx = await setupWebGPU(webgpuCanvas);
    results.webgpu.supported = true;

    // Collect WebGPU metrics
    await new Promise(resolve => setTimeout(resolve, 500));
    const webgpuMetrics = profiler.getCurrentMetrics();
    results.webgpu.avgFps = webgpuMetrics.fps;
    results.webgpu.memoryUsage = webgpuMetrics.memoryUsed;

    // Run benchmark
    const webgpuTime = await runWebGPUBenchmark(webgpuCtx, 100);
    results.webgpu.benchmarkTime = webgpuTime;

    console.log(`✅ WebGPU Benchmark: ${webgpuTime.toFixed(2)}ms for 100 iterations`);
    console.log(`   Avg FPS: ${results.webgpu.avgFps.toFixed(2)}`);
    console.log(`   Memory: ${(results.webgpu.memoryUsage / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.log(`❌ WebGPU not available: ${(error as Error).message}`);
  }

  console.log('\n--- Comparison Results ---\n');

  if (results.webgl.supported && results.webgpu.supported) {
    const speedup = results.webgl.benchmarkTime / results.webgpu.benchmarkTime;
    const memoryDiff = ((results.webgl.memoryUsage - results.webgpu.memoryUsage) / results.webgl.memoryUsage * 100);

    console.log(`📊 Performance Metrics:`);
    console.log(`   WebGPU Speedup: ${speedup.toFixed(2)}x`);
    console.log(`   Time Reduction: ${((1 - 1/speedup) * 100).toFixed(1)}%`);
    console.log(`   Memory Difference: ${memoryDiff.toFixed(1)}%`);

    console.log(`\n💡 Migration Recommendation:`);

    if (speedup > 1.5) {
      console.log(`   ✅ STRONGLY RECOMMENDED - WebGPU is ${speedup.toFixed(1)}x faster`);
      console.log(`   Performance gains justify migration effort`);
    } else if (speedup > 1.2) {
      console.log(`   ⚠️ CONSIDER - WebGPU is ${speedup.toFixed(1)}x faster`);
      console.log(`   Evaluate if performance gains justify migration cost`);
    } else {
      console.log(`   ℹ️ OPTIONAL - WebGPU shows minimal performance improvement`);
      console.log(`   WebGPU may offer other benefits (compute, memory management)`);
    }

    console.log(`\n🎯 Key Considerations:`);
    console.log(`   • Browser Support: WebGPU is newer, check your target audience`);
    console.log(`   • Development Time: Factor in migration and testing costs`);
    console.log(`   • Feature Set: WebGPU offers compute shaders and better memory control`);
    console.log(`   • Future-Proofing: WebGPU is the future of web graphics`);

  } else if (results.webgpu.supported) {
    console.log(`ℹ️ Only WebGPU is available - it's the default choice`);
  } else if (results.webgl.supported) {
    console.log(`ℹ️ Only WebGL is available - stick with WebGL for compatibility`);
  } else {
    console.log(`❌ Neither WebGL nor WebGPU is available`);
  }

  console.log(`\n📈 Detailed Metrics:`);
  const deviceInfo = profiler.getDeviceInfo();
  console.log(`   GPU: ${deviceInfo.vendor} ${deviceInfo.description}`);
  console.log(`   Architecture: ${deviceInfo.architecture}`);
  console.log(`   Supported Features: ${deviceInfo.features.length}`);

  // Cleanup
  profiler.stop();
  profiler.cleanup();

  console.log('\n✅ Comparison complete!');
}

// Export for use in HTML or testing
export { webglVsWebGPUComparison };

// Auto-run if executed directly
if (typeof window !== 'undefined') {
  (window as any).runWebGLComparison = webglVsWebGPUComparison;
  console.log('📝 Run webglVsWebGPUComparison() in the console to start the comparison');
}
