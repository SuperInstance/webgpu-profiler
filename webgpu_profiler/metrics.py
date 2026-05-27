"""Metrics data structures for GPU performance monitoring."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class Metrics:
    """Snapshot of GPU performance metrics at a point in time."""

    timestamp: float
    utilization: float  # 0–100 %
    memory_used: int  # bytes
    memory_total: int  # bytes
    memory_percentage: float  # 0–100 %
    frame_time: float  # ms
    fps: float
    compute_time: float  # ms
    power_usage: Optional[float] = None  # watts
    temperature: Optional[float] = None  # °C
    clock_speed: Optional[float] = None  # MHz


@dataclass
class MemoryAllocation:
    """A single GPU memory allocation."""

    id: str
    type: str  # "buffer" | "texture"
    size: int  # bytes
    timestamp: float
    usage: int = 0
    active: bool = True


@dataclass(frozen=True)
class MemorySample:
    """Historical memory snapshot."""

    timestamp: float
    buffer_memory: int
    texture_memory: int
    total_allocated: int


@dataclass
class MemoryMetrics:
    """Aggregate memory tracking state."""

    buffer_memory: int = 0
    texture_memory: int = 0
    total_allocated: int = 0
    allocations: Dict[str, MemoryAllocation] = field(default_factory=dict)
    history: List[MemorySample] = field(default_factory=list)


@dataclass
class ShaderMetrics:
    """Performance metrics for a single shader module."""

    shader_id: str
    entry_point: str
    avg_execution_time: float  # µs
    min_execution_time: float  # µs
    max_execution_time: float  # µs
    invocations: int = 1
    last_execution: float = 0.0
    bottlenecks: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class FrameTimePercentiles:
    p50: float
    p95: float
    p99: float


@dataclass(frozen=True)
class PerformanceStats:
    """Aggregated performance statistics over a profiling session."""

    total_frames: int
    avg_fps: float
    min_fps: float
    max_fps: float
    avg_frame_time: float  # ms
    frame_time_percentiles: FrameTimePercentiles
    total_compute_time: float  # ms
    avg_compute_time: float  # ms
    start_time: float
    end_time: float


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def average(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    idx = (p / 100.0) * (len(s) - 1)
    lower = int(idx)
    upper = min(lower + 1, len(s) - 1)
    weight = idx - lower
    return s[lower] * (1 - weight) + s[upper] * weight


def compute_performance_stats(
    metrics_history: List[Metrics],
    frame_count: int,
) -> PerformanceStats:
    """Derive :class:`PerformanceStats` from a list of :class:`Metrics`."""
    if not metrics_history:
        raise ValueError("No metrics available for statistics")

    fps_vals = [m.fps for m in metrics_history]
    ft_vals = [m.frame_time for m in metrics_history]
    ct_vals = [m.compute_time for m in metrics_history]

    return PerformanceStats(
        total_frames=frame_count,
        avg_fps=average(fps_vals),
        min_fps=min(fps_vals),
        max_fps=max(fps_vals),
        avg_frame_time=average(ft_vals),
        frame_time_percentiles=FrameTimePercentiles(
            p50=percentile(ft_vals, 50),
            p95=percentile(ft_vals, 95),
            p99=percentile(ft_vals, 99),
        ),
        total_compute_time=sum(ct_vals),
        avg_compute_time=average(ct_vals),
        start_time=metrics_history[0].timestamp,
        end_time=metrics_history[-1].timestamp,
    )
