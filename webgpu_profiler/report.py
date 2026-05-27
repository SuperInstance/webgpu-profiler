"""ProfileReport — generates profiling summaries and bottleneck detection."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

from .metrics import Metrics, MemoryMetrics, PerformanceStats, ShaderMetrics
from .frame import FrameAnalysis


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(frozen=True)
class Bottleneck:
    """An identified performance bottleneck."""

    category: str  # e.g. "shader", "memory", "frame_time"
    severity: Severity
    message: str
    suggestion: str
    metric_key: Optional[str] = None
    metric_value: Optional[float] = None


@dataclass
class ProfileReport:
    """Generates human/machine-readable profiling summaries."""

    device_info: Dict[str, str] = field(default_factory=dict)
    stats: Optional[PerformanceStats] = None
    memory: Optional[MemoryMetrics] = None
    shader_metrics: List[ShaderMetrics] = field(default_factory=list)
    frame_analysis: Optional[FrameAnalysis] = None

    # -- bottleneck detection -----------------------------------------------

    def detect_bottlenecks(self) -> List[Bottleneck]:
        bottlenecks: List[Bottleneck] = []

        # Frame-time related
        if self.stats is not None:
            if self.stats.avg_fps < 30:
                bottlenecks.append(Bottleneck(
                    category="frame_time",
                    severity=Severity.CRITICAL,
                    message=f"Very low average FPS: {self.stats.avg_fps:.1f}",
                    suggestion="Reduce draw calls, simplify shaders, or lower resolution.",
                    metric_key="avg_fps",
                    metric_value=self.stats.avg_fps,
                ))
            elif self.stats.avg_fps < 60:
                bottlenecks.append(Bottleneck(
                    category="frame_time",
                    severity=Severity.WARNING,
                    message=f"Below 60 FPS target: {self.stats.avg_fps:.1f}",
                    suggestion="Profile individual shaders and reduce GPU workload.",
                    metric_key="avg_fps",
                    metric_value=self.stats.avg_fps,
                ))

            ft = self.stats.frame_time_percentiles
            if ft.p99 > 33.3:  # > 30 FPS at 99th percentile
                bottlenecks.append(Bottleneck(
                    category="frame_time",
                    severity=Severity.WARNING,
                    message=f"P99 frame time {ft.p99:.1f} ms (>{33.3:.1f} ms target)",
                    suggestion="Investigate sporadic GPU stalls or large dispatches.",
                    metric_key="p99_frame_time",
                    metric_value=ft.p99,
                ))

        # Memory related
        if self.memory is not None:
            pct = (self.memory.total_allocated / 4_294_967_296) * 100  # assume 4 GB default
            if pct > 90:
                bottlenecks.append(Bottleneck(
                    category="memory",
                    severity=Severity.CRITICAL,
                    message=f"GPU memory usage >90% ({pct:.1f}%)",
                    suggestion="Free unused textures/buffers, reduce texture resolution.",
                    metric_key="memory_usage_pct",
                    metric_value=pct,
                ))
            elif pct > 70:
                bottlenecks.append(Bottleneck(
                    category="memory",
                    severity=Severity.WARNING,
                    message=f"GPU memory usage elevated ({pct:.1f}%)",
                    suggestion="Audit texture and buffer allocations.",
                    metric_key="memory_usage_pct",
                    metric_value=pct,
                ))

            # Check for leaked allocations
            active = sum(1 for a in self.memory.allocations.values() if a.active)
            total = len(self.memory.allocations)
            if total > 0 and active / total > 0.95 and total > 100:
                bottlenecks.append(Bottleneck(
                    category="memory",
                    severity=Severity.WARNING,
                    message=f"{active}/{total} allocations still active",
                    suggestion="Check for memory leaks — many allocations never freed.",
                ))

        # Shader related
        for sm in self.shader_metrics:
            if sm.avg_execution_time > 10_000:  # > 10 ms
                bottlenecks.append(Bottleneck(
                    category="shader",
                    severity=Severity.WARNING if sm.avg_execution_time < 50_000 else Severity.CRITICAL,
                    message=f"Shader '{sm.shader_id}' avg execution {sm.avg_execution_time / 1000:.1f} ms",
                    suggestion="Optimize shader algorithm, reduce workgroup size, or cache results.",
                    metric_key=f"shader_{sm.shader_id}_avg_us",
                    metric_value=sm.avg_execution_time,
                ))
            variance = sm.max_execution_time - sm.min_execution_time
            if variance > sm.avg_execution_time * 0.5:
                bottlenecks.append(Bottleneck(
                    category="shader",
                    severity=Severity.INFO,
                    message=f"Shader '{sm.shader_id}' has high execution variance ({variance:.0f} µs range)",
                    suggestion="Check for data-dependent branches or divergent workgroups.",
                ))

        # Frame analysis related
        if self.frame_analysis is not None and self.frame_analysis.frame_count > 0:
            if self.frame_analysis.is_gpu_bound():
                bottlenecks.append(Bottleneck(
                    category="gpu_bound",
                    severity=Severity.WARNING,
                    message=f"GPU-bound (GPU/CPU ratio: {self.frame_analysis.gpu_cpu_ratio():.2f})",
                    suggestion="GPU is the bottleneck. Simplify shaders or reduce resolution.",
                ))
            spikes = self.frame_analysis.detect_spikes()
            if spikes:
                bottlenecks.append(Bottleneck(
                    category="frame_spikes",
                    severity=Severity.INFO if len(spikes) < 5 else Severity.WARNING,
                    message=f"{len(spikes)} frame-time spikes detected",
                    suggestion="Investigate frames with unusually high GPU time.",
                ))

        return bottlenecks

    # -- report generation -------------------------------------------------

    def summary(self) -> Dict:
        report: Dict = {"device": self.device_info}

        if self.stats:
            report["performance"] = {
                "total_frames": self.stats.total_frames,
                "avg_fps": round(self.stats.avg_fps, 2),
                "min_fps": round(self.stats.min_fps, 2),
                "max_fps": round(self.stats.max_fps, 2),
                "avg_frame_time_ms": round(self.stats.avg_frame_time, 3),
                "frame_time_percentiles": {
                    "p50": round(self.stats.frame_time_percentiles.p50, 3),
                    "p95": round(self.stats.frame_time_percentiles.p95, 3),
                    "p99": round(self.stats.frame_time_percentiles.p99, 3),
                },
                "total_compute_time_ms": round(self.stats.total_compute_time, 3),
                "avg_compute_time_ms": round(self.stats.avg_compute_time, 3),
                "duration_s": round(self.stats.end_time - self.stats.start_time, 3),
            }

        if self.memory:
            report["memory"] = {
                "buffer_bytes": self.memory.buffer_memory,
                "texture_bytes": self.memory.texture_memory,
                "total_allocated_bytes": self.memory.total_allocated,
                "allocation_count": len(self.memory.allocations),
                "active_allocations": sum(1 for a in self.memory.allocations.values() if a.active),
            }

        if self.shader_metrics:
            report["shaders"] = [
                {
                    "id": sm.shader_id,
                    "entry_point": sm.entry_point,
                    "avg_us": round(sm.avg_execution_time, 2),
                    "invocations": sm.invocations,
                    "bottlenecks": sm.bottlenecks,
                }
                for sm in self.shader_metrics
            ]

        if self.frame_analysis and self.frame_analysis.frame_count > 0:
            report["frame_analysis"] = self.frame_analysis.summary()

        bottlenecks = self.detect_bottlenecks()
        if bottlenecks:
            report["bottlenecks"] = [
                {
                    "category": b.category,
                    "severity": b.severity.value,
                    "message": b.message,
                    "suggestion": b.suggestion,
                }
                for b in bottlenecks
            ]

        return report
