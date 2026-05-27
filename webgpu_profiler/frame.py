"""Per-frame performance analysis."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .metrics import Metrics, average, percentile


@dataclass(frozen=True)
class FrameMetrics:
    """Metrics captured for a single rendered frame."""

    frame_number: int
    timestamp: float
    frame_time: float  # ms
    gpu_time: float  # ms (time GPU was busy)
    cpu_wait_time: float  # ms (CPU time spent waiting for GPU)
    draw_calls: int = 0
    compute_dispatches: int = 0
    memory_allocated: int = 0  # bytes allocated this frame
    memory_freed: int = 0  # bytes freed this frame


class FrameAnalysis:
    """Collects per-frame data and computes breakdowns / anomaly detection."""

    def __init__(self, max_history: int = 1000) -> None:
        self._frames: List[FrameMetrics] = []
        self._max_history = max_history

    # -- recording --------------------------------------------------------

    def record_frame(self, frame: FrameMetrics) -> None:
        self._frames.append(frame)
        if len(self._frames) > self._max_history:
            self._frames.pop(0)

    # -- queries -----------------------------------------------------------

    @property
    def frames(self) -> List[FrameMetrics]:
        return list(self._frames)

    @property
    def frame_count(self) -> int:
        return len(self._frames)

    def average_frame_time(self) -> float:
        return average([f.frame_time for f in self._frames]) if self._frames else 0.0

    def average_gpu_time(self) -> float:
        return average([f.gpu_time for f in self._frames]) if self._frames else 0.0

    def average_cpu_wait(self) -> float:
        return average([f.cpu_wait_time for f in self._frames]) if self._frames else 0.0

    def frame_time_percentiles(self) -> dict[str, float]:
        if not self._frames:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0}
        vals = [f.frame_time for f in self._frames]
        return {
            "p50": percentile(vals, 50),
            "p95": percentile(vals, 95),
            "p99": percentile(vals, 99),
        }

    def fps_over_time(self) -> List[float]:
        return [1000.0 / f.frame_time if f.frame_time > 0 else 0.0 for f in self._frames]

    def average_fps(self) -> float:
        return average(self.fps_over_time()) if self._frames else 0.0

    # -- anomaly detection -------------------------------------------------

    def detect_spikes(self, threshold_std: float = 2.0) -> List[FrameMetrics]:
        """Return frames whose frame_time is more than *threshold_std* standard
        deviations above the mean (potential jank frames)."""
        if len(self._frames) < 3:
            return []
        times = [f.frame_time for f in self._frames]
        avg = average(times)
        std = (sum((t - avg) ** 2 for t in times) / len(times)) ** 0.5
        if std == 0:
            return []
        cutoff = avg + threshold_std * std
        return [f for f in self._frames if f.frame_time > cutoff]

    def gpu_cpu_ratio(self) -> float:
        """Ratio of GPU time to total frame time.  >1 means GPU-bound."""
        gpu = self.average_gpu_time()
        ft = self.average_frame_time()
        return gpu / ft if ft > 0 else 0.0

    def is_gpu_bound(self, threshold: float = 0.8) -> bool:
        return self.gpu_cpu_ratio() >= threshold

    def memory_pressure(self) -> Optional[float]:
        """Net bytes allocated per frame on average (positive = growing)."""
        if not self._frames:
            return None
        net = [f.memory_allocated - f.memory_freed for f in self._frames]
        return average(net)

    def summary(self) -> dict:
        return {
            "frame_count": self.frame_count,
            "avg_frame_time_ms": round(self.average_frame_time(), 3),
            "avg_gpu_time_ms": round(self.average_gpu_time(), 3),
            "avg_cpu_wait_ms": round(self.average_cpu_wait(), 3),
            "avg_fps": round(self.average_fps(), 2),
            "frame_time_percentiles": {k: round(v, 3) for k, v in self.frame_time_percentiles().items()},
            "gpu_bound": self.is_gpu_bound(),
            "spike_count": len(self.detect_spikes()),
            "memory_pressure_bytes_per_frame": round(self.memory_pressure() or 0, 1),
        }
