/**
 * Real-Time Game Profiler Example
 *
 * This example demonstrates game-specific GPU profiling:
 * - Frame pacing analysis
 * - Draw call optimization
 * - GPU utilization tracking
 * - Performance bottleneck identification
 *
 * Use Case: "Optimize game FPS and reduce frame drops"
 *
 * Keywords: Game profiling, frame pacing, draw call optimization, game FPS, frame drops, GPU utilization, game performance
 */

import { createGPUProfiler } from 'browser-gpu-profiler';

interface FrameMetrics {
  frameNumber: number;
  timestamp: number;
  fps: number;
  frameTime: number;
  gpuTime: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  vsync: boolean;
}

interface FrameDrop {
  frameNumber: number;
  timestamp: number;
  frameTime: number;
  severity: 'minor' | 'moderate' | 'severe';
  cause: string;
}

interface PerformanceIssue {
  type: 'frame_pacing' | 'gpu_overload' | 'cpu_bound' | 'memory_pressure';
  severity: 'warning' | 'critical';
  description: string;
  recommendation: string;
}

class GameProfiler {
  private profiler: any;
  private frameHistory: FrameMetrics[] = [];
  private maxHistoryLength: number = 300; // Keep last 5 seconds at 60 FPS
  private frameDropThreshold: number = 16.67 * 1.5; // 1.5x target frame time
  private targetFPS: number = 60;

  // Game-specific metrics
  private drawCallCount: number = 0;
  private triangleCount: number = 0;
  private activeTextures: number = 0;

  constructor(targetFPS: number = 60) {
    this.targetFPS = targetFPS;
    this.frameDropThreshold = (1000 / targetFPS) * 1.5;
  }

  async initialize() {
    this.profiler = createGPUProfiler({
      enableMonitoring: true,
      monitoringInterval: 16, // ~60 FPS
      enableMemoryTracking: true,
      enableShaderProfiling: true,
    });

    await this.profiler.initialize();
    this.profiler.start();

    console.log('🎮 Game Profiler initialized');
    console.log(`   Target FPS: ${this.targetFPS}`);
    console.log(`   Frame Time Budget: ${(1000 / this.targetFPS).toFixed(2)}ms`);
    console.log(`   Drop Threshold: ${this.frameDropThreshold.toFixed(2)}ms\n`);
  }

  startFrame(): void {
    this.drawCallCount = 0;
    this.triangleCount = 0;
  }

  recordDrawCall(triangles: number = 3): void {
    this.drawCallCount++;
    this.triangleCount += triangles;
  }

  bindTexture(): void {
    this.activeTextures++;
  }

  endFrame(): void {
    const metrics = this.profiler.getCurrentMetrics();
    const stats = this.profiler.getPerformanceStats();

    const frameMetric: FrameMetrics = {
      frameNumber: stats.totalFrames,
      timestamp: Date.now(),
      fps: metrics.fps,
      frameTime: metrics.frameTime,
      gpuTime: metrics.frameTime * 0.8, // Estimate
      drawCalls: this.drawCallCount,
      triangles: this.triangleCount,
      textures: this.activeTextures,
      vsync: metrics.frameTime >= (1000 / this.targetFPS) * 0.9,
    };

    this.frameHistory.push(frameMetric);

    // Keep only recent history
    if (this.frameHistory.length > this.maxHistoryLength) {
      this.frameHistory.shift();
    }
  }

  analyzeFramePacing(): { isSmooth: boolean; inconsistencies: number[] } {
    if (this.frameHistory.length < 10) {
      return { isSmooth: true, inconsistencies: [] };
    }

    const targetFrameTime = 1000 / this.targetFPS;
    const inconsistencies: number[] = [];

    for (let i = 1; i < this.frameHistory.length; i++) {
      const diff = Math.abs(this.frameHistory[i].frameTime - targetFrameTime);
      if (diff > targetFrameTime * 0.5) {
        inconsistencies.push(i);
      }
    }

    const isSmooth = inconsistencies.length < this.frameHistory.length * 0.05; // Less than 5% inconsistencies

    return { isSmooth, inconsistencies };
  }

  detectFrameDrops(): FrameDrop[] {
    const frameDrops: FrameDrop[] = [];

    for (let i = 1; i < this.frameHistory.length; i++) {
      const frame = this.frameHistory[i];
      const prevFrame = this.frameHistory[i - 1];

      if (frame.frameTime > this.frameDropThreshold) {
        let severity: 'minor' | 'moderate' | 'severe';
        let cause = '';

        if (frame.frameTime > this.frameDropThreshold * 2) {
          severity = 'severe';
        } else if (frame.frameTime > this.frameDropThreshold * 1.5) {
          severity = 'moderate';
        } else {
          severity = 'minor';
        }

        // Determine likely cause
        if (frame.drawCalls > prevFrame.drawCalls * 1.5) {
          cause = 'Draw call spike';
        } else if (frame.triangles > prevFrame.triangles * 1.5) {
          cause = 'Triangle count spike';
        } else if (frame.textures > prevFrame.textures * 1.5) {
          cause = 'Texture bandwidth spike';
        } else {
          cause = 'GPU overload or CPU bottleneck';
        }

        frameDrops.push({
          frameNumber: frame.frameNumber,
          timestamp: frame.timestamp,
          frameTime: frame.frameTime,
          severity,
          cause,
        });
      }
    }

    return frameDrops;
  }

  identifyBottlenecks(): PerformanceIssue[] {
    const issues: PerformanceIssue[] = [];
    const recentFrames = this.frameHistory.slice(-60); // Last second

    if (recentFrames.length < 30) {
      return issues;
    }

    const avgFps = recentFrames.reduce((sum, f) => sum + f.fps, 0) / recentFrames.length;
    const avgDrawCalls = recentFrames.reduce((sum, f) => sum + f.drawCalls, 0) / recentFrames.length;
    const avgTriangles = recentFrames.reduce((sum, f) => sum + f.triangles, 0) / recentFrames.length;
    const avgFrameTime = recentFrames.reduce((sum, f) => sum + f.frameTime, 0) / recentFrames.length;

    // Check for GPU overload
    if (avgFps < this.targetFPS * 0.8) {
      if (avgDrawCalls > 1000) {
        issues.push({
          type: 'gpu_overload',
          severity: 'critical',
          description: `Too many draw calls: ${avgDrawCalls.toFixed(0)} per frame`,
          recommendation: 'Implement batch rendering, instancing, or reduce draw calls',
        });
      }

      if (avgTriangles > 1000000) {
        issues.push({
          type: 'gpu_overload',
          severity: 'critical',
          description: `Triangle count too high: ${(avgTriangles / 1000).toFixed(0)}K per frame`,
          recommendation: 'Reduce geometry complexity, implement LOD system',
        });
      }
    }

    // Check for frame pacing issues
    const { isSmooth } = this.analyzeFramePacing();
    if (!isSmooth) {
      issues.push({
        type: 'frame_pacing',
        severity: 'warning',
        description: 'Inconsistent frame timing detected',
        recommendation: 'Enable vsync, implement frame pacing, or use triple buffering',
      });
    }

    // Check if CPU bound
    if (avgFrameTime > 16.67 && avgDrawCalls < 100) {
      issues.push({
        type: 'cpu_bound',
        severity: 'warning',
        description: 'Likely CPU-bound (low draw calls but high frame time)',
        recommendation: 'Optimize game logic, use worker threads, or reduce physics calculations',
      });
    }

    return issues;
  }

  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const recentFrames = this.frameHistory.slice(-60);

    if (recentFrames.length < 30) {
      return recommendations;
    }

    const avgDrawCalls = recentFrames.reduce((sum, f) => sum + f.drawCalls, 0) / recentFrames.length;
    const avgTriangles = recentFrames.reduce((sum, f) => sum + f.triangles, 0) / recentFrames.length;
    const avgFps = recentFrames.reduce((sum, f) => sum + f.fps, 0) / recentFrames.length;

    // Draw call optimization
    if (avgDrawCalls > 500) {
      recommendations.push('🎯 Reduce draw calls by batching similar objects');
      recommendations.push('🎯 Use GPU instancing for repeated geometry');
      recommendations.push('🎯 Implement texture atlasing to reduce material changes');
    }

    // Geometry optimization
    if (avgTriangles > 500000) {
      recommendations.push('📐 Implement Level of Detail (LOD) system');
      recommendations.push('📐 Use frustum culling more aggressively');
      recommendations.push('📐 Reduce polygon count on distant objects');
    }

    // Frame rate optimization
    if (avgFps < this.targetFPS * 0.9) {
      recommendations.push('⚡ Lower shadow quality or resolution');
      recommendations.push('⚡ Reduce post-processing effects');
      recommendations.push('⚡ Optimize shader complexity');
      recommendations.push('⚡ Use occlusion culling');
    }

    return recommendations;
  }

  printRealTimeStats(): void {
    if (this.frameHistory.length === 0) {
      return;
    }

    const latest = this.frameHistory[this.frameHistory.length - 1];
    const recent = this.frameHistory.slice(-60);

    const avgFps = recent.reduce((sum, f) => sum + f.fps, 0) / recent.length;
    const avgFrameTime = recent.reduce((sum, f) => sum + f.frameTime, 0) / recent.length;
    const avgDrawCalls = recent.reduce((sum, f) => sum + f.drawCalls, 0) / recent.length;

    // Clear previous line and print stats
    const stats = `
🎮 Game Performance:
   FPS: ${latest.fps.toFixed(1)} (avg: ${avgFps.toFixed(1)})
   Frame Time: ${latest.frameTime.toFixed(2)}ms (avg: ${avgFrameTime.toFixed(2)}ms)
   Draw Calls: ${latest.drawCalls} (avg: ${avgDrawCalls.toFixed(0)})
   Triangles: ${(latest.triangles / 1000).toFixed(1)}K
   Textures: ${latest.textures}
    `;

    console.log(stats);
  }

  generateReport(): string {
    if (this.frameHistory.length === 0) {
      return 'No frame data available';
    }

    const lines: string[] = [];
    lines.push('=== Game Performance Report ===\n');

    // Overall stats
    const avgFps = this.frameHistory.reduce((sum, f) => sum + f.fps, 0) / this.frameHistory.length;
    const maxFps = Math.max(...this.frameHistory.map(f => f.fps));
    const minFps = Math.min(...this.frameHistory.map(f => f.fps));
    const avgDrawCalls = this.frameHistory.reduce((sum, f) => sum + f.drawCalls, 0) / this.frameHistory.length;

    lines.push('Performance Summary:');
    lines.push(`  Target FPS: ${this.targetFPS}`);
    lines.push(`  Average FPS: ${avgFps.toFixed(2)}`);
    lines.push(`  Min FPS: ${minFps.toFixed(2)}`);
    lines.push(`  Max FPS: ${maxFps.toFixed(2)}`);
    lines.push(`  Performance: ${(avgFps / this.targetFPS * 100).toFixed(0)}% of target\n`);

    lines.push('Rendering Stats:');
    lines.push(`  Average Draw Calls: ${avgDrawCalls.toFixed(0)}`);
    lines.push(`  Average Triangles: ${(this.frameHistory.reduce((sum, f) => sum + f.triangles, 0) / this.frameHistory.length / 1000).toFixed(1)}K`);

    // Frame drops
    const frameDrops = this.detectFrameDrops();
    lines.push(`\nFrame Drops: ${frameDrops.length}`);
    const severeDrops = frameDrops.filter(d => d.severity === 'severe').length;
    const moderateDrops = frameDrops.filter(d => d.severity === 'moderate').length;
    lines.push(`  Severe: ${severeDrops}`);
    lines.push(`  Moderate: ${moderateDrops}`);

    // Bottlenecks
    const bottlenecks = this.identifyBottlenecks();
    if (bottlenecks.length > 0) {
      lines.push(`\n⚠️  Issues Detected: ${bottlenecks.length}`);
      bottlenecks.forEach((issue, i) => {
        lines.push(`\n${i + 1}. ${issue.type.toUpperCase()} [${issue.severity.toUpperCase()}]`);
        lines.push(`   ${issue.description}`);
        lines.push(`   💡 ${issue.recommendation}`);
      });
    }

    // Recommendations
    const recommendations = this.getOptimizationRecommendations();
    if (recommendations.length > 0) {
      lines.push(`\n💡 Optimization Recommendations:`);
      recommendations.forEach(rec => lines.push(`  ${rec}`));
    }

    return lines.join('\n');
  }

  stop(): void {
    this.profiler.stop();
    this.profiler.cleanup();
  }
}

// Simulate a game loop
async function simulateGameLoop(duration: number = 5000) {
  console.log('🎮 Simulating game loop...\n');

  const profiler = new GameProfiler(60);
  await profiler.initialize();

  const startTime = Date.now();

  // Game loop simulation
  while (Date.now() - startTime < duration) {
    profiler.startFrame();

    // Simulate rendering
    const drawCalls = Math.floor(Math.random() * 200) + 50; // 50-250 draw calls
    for (let i = 0; i < drawCalls; i++) {
      const triangles = Math.floor(Math.random() * 5000) + 100; // 100-5100 triangles
      profiler.recordDrawCall(triangles);
    }

    // Simulate texture binds
    const textures = Math.floor(Math.random() * 20) + 5;
    for (let i = 0; i < textures; i++) {
      profiler.bindTexture();
    }

    profiler.endFrame();

    // Print stats every second
    if (Date.now() - startTime > 0 && Math.floor((Date.now() - startTime) / 1000) > Math.floor((Date.now() - startTime - 16) / 1000)) {
      profiler.printRealTimeStats();
    }

    // Simulate frame time
    await new Promise(resolve => setTimeout(resolve, 16));
  }

  console.log('\n' + profiler.generateReport());

  profiler.stop();
}

// Real game integration example
async function profileRealGame() {
  console.log('=== Game Profiler - Real Integration ===\n');

  const profiler = new GameProfiler(60);
  await profiler.initialize();

  console.log('💡 Integrate this profiler into your game loop:\n');

  console.log(`
// In your game loop:
function gameLoop() {
  profiler.startFrame();

  // Your rendering code
  renderScene();

  // Track draw calls
  profiler.recordDrawCall(triangleCount);

  profiler.endFrame();

  requestAnimationFrame(gameLoop);
}

// Check performance periodically
setInterval(() => {
  const bottlenecks = profiler.identifyBottlenecks();
  if (bottlenecks.length > 0) {
    console.warn('Performance issues detected:', bottlenecks);
  }
}, 5000);
  `);

  // Simulate a few frames
  for (let i = 0; i < 10; i++) {
    profiler.startFrame();
    profiler.recordDrawCall(1000);
    profiler.recordDrawCall(500);
    profiler.bindTexture();
    profiler.bindTexture();
    profiler.endFrame();
    await new Promise(resolve => setTimeout(resolve, 16));
  }

  console.log('\n📊 Sample Report:\n');
  console.log(profiler.generateReport());

  profiler.stop();
}

// Export functions
export { GameProfiler, simulateGameLoop, profileRealGame };

// Auto-run
if (typeof window !== 'undefined') {
  (window as any).simulateGameLoop = simulateGameLoop;
  (window as any).profileRealGame = profileRealGame;
  console.log('📝 Game Profiler - Available functions:');
  console.log('  - simulateGameLoop(duration) - Simulate a game loop');
  console.log('  - profileRealGame() - Show integration example');
}
