"""Profiler — main class managing WebGPU profiling sessions."""

from __future__ import annotations

import time as _time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Dict, List, Optional

from .metrics import (
    MemoryAllocation,
    MemoryMetrics,
    MemorySample,
    Metrics,
    PerformanceStats,
    ShaderMetrics,
    compute_performance_stats,
)
from .frame import FrameAnalysis, FrameMetrics
from .report import ProfileReport


class ProfilerState(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"


@dataclass
class ProfilerConfig:
    """Configuration for the profiler."""

    enable_monitoring: bool = True
    monitoring_interval: float = 1.0  # seconds
    enable_memory_tracking: bool = True
    enable_shader_profiling: bool = True
    max_history_size: int = 1000
    on_metrics_update: Optional[Callable[[Metrics], None]] = None
    on_memory_update: Optional[Callable[[MemoryMetrics], None]] = None
    on_shader_metrics: Optional[Callable[[ShaderMetrics], None]] = None


class Profiler:
    """High-level API for profiling WebGPU compute workloads.

    Manages profiling sessions, collects metrics, tracks memory allocations
    and shader invocations, and produces reports.
    """

    def __init__(self, config: Optional[ProfilerConfig] = None) -> None:
        self._config = config or ProfilerConfig()
        self._state: ProfilerState = ProfilerState.IDLE

        # Metrics storage
        self._metrics_history: List[Metrics] = []
        self._memory = MemoryMetrics()
        self._shader_metrics: Dict[str, ShaderMetrics] = {}
        self._frame_analysis = FrameAnalysis(max_history=self._config.max_history_size)

        # Internal tracking
        self._session_start: float = 0.0
        self._last_sample_time: float = 0.0
        self._frame_count: int = 0

    # -- session lifecycle -------------------------------------------------

    @property
    def state(self) -> ProfilerState:
        return self._state

    def start(self) -> None:
        """Begin a profiling session."""
        if self._state == ProfilerState.RUNNING:
            return
        self._state = ProfilerState.RUNNING
        self._session_start = _time.perf_counter()
        self._last_sample_time = self._session_start
        self._frame_count = 0

    def stop(self) -> None:
        """Stop profiling and return to idle."""
        if self._state != ProfilerState.RUNNING and self._state != ProfilerState.PAUSED:
            return
        self._state = ProfilerState.IDLE

    def pause(self) -> None:
        if self._state == ProfilerState.RUNNING:
            self._state = ProfilerState.PAUSED

    def resume(self) -> None:
        if self._state == ProfilerState.PAUSED:
            self._state = ProfilerState.RUNNING
            self._last_sample_time = _time.perf_counter()

    # -- metrics collection ------------------------------------------------

    def sample(self, **overrides: float) -> Metrics:
        """Capture a metrics snapshot (usually called each frame).

        Accepts optional keyword overrides for compute_time, utilization, etc.
        """
        if self._state != ProfilerState.RUNNING:
            raise RuntimeError("Profiler is not running")

        now = _time.perf_counter()
        dt = now - self._last_sample_time
        frame_time = dt * 1000  # ms
        fps = 1000.0 / frame_time if frame_time > 0 else 0.0

        compute_time = overrides.get("compute_time", frame_time * 0.5)
        utilization = overrides.get("utilization", min(100.0, (compute_time / frame_time) * 100) if frame_time > 0 else 0.0)

        m = Metrics(
            timestamp=now,
            utilization=utilization,
            memory_used=self._memory.total_allocated,
            memory_total=4 * 1024 ** 3,  # 4 GB default
            memory_percentage=(self._memory.total_allocated / (4 * 1024 ** 3)) * 100,
            frame_time=frame_time,
            fps=fps,
            compute_time=compute_time,
            power_usage=overrides.get("power_usage"),
            temperature=overrides.get("temperature"),
            clock_speed=overrides.get("clock_speed"),
        )

        self._metrics_history.append(m)
        if len(self._metrics_history) > self._config.max_history_size:
            self._metrics_history.pop(0)

        self._last_sample_time = now
        self._frame_count += 1

        if self._config.on_metrics_update:
            self._config.on_metrics_update(m)

        return m

    # -- memory tracking ---------------------------------------------------

    def track_buffer(self, label: str, size: int, usage: int = 0) -> None:
        if not self._config.enable_memory_tracking:
            return
        alloc = MemoryAllocation(
            id=label, type="buffer", size=size,
            timestamp=_time.perf_counter(), usage=usage, active=True,
        )
        self._memory.allocations[label] = alloc
        self._memory.buffer_memory += size
        self._memory.total_allocated += size
        self._record_memory_sample()
        if self._config.on_memory_update:
            self._config.on_memory_update(self._memory)

    def track_texture(self, label: str, size: int, usage: int = 0) -> None:
        if not self._config.enable_memory_tracking:
            return
        alloc = MemoryAllocation(
            id=label, type="texture", size=size,
            timestamp=_time.perf_counter(), usage=usage, active=True,
        )
        self._memory.allocations[label] = alloc
        self._memory.texture_memory += size
        self._memory.total_allocated += size
        self._record_memory_sample()
        if self._config.on_memory_update:
            self._config.on_memory_update(self._memory)

    def untrack(self, label: str) -> None:
        alloc = self._memory.allocations.pop(label, None)
        if alloc is None or not alloc.active:
            return
        alloc.active = False  # type: ignore[misc]
        if alloc.type == "buffer":
            self._memory.buffer_memory -= alloc.size
        else:
            self._memory.texture_memory -= alloc.size
        self._memory.total_allocated -= alloc.size
        self._record_memory_sample()

    def _record_memory_sample(self) -> None:
        sample = MemorySample(
            timestamp=_time.perf_counter(),
            buffer_memory=self._memory.buffer_memory,
            texture_memory=self._memory.texture_memory,
            total_allocated=self._memory.total_allocated,
        )
        self._memory.history.append(sample)
        if len(self._memory.history) > self._config.max_history_size:
            self._memory.history.pop(0)

    # -- shader tracking ---------------------------------------------------

    def track_shader(self, shader_id: str, entry_point: str, execution_time_us: float) -> None:
        if not self._config.enable_shader_profiling:
            return
        existing = self._shader_metrics.get(shader_id)
        if existing is None:
            sm = ShaderMetrics(
                shader_id=shader_id,
                entry_point=entry_point,
                avg_execution_time=execution_time_us,
                min_execution_time=execution_time_us,
                max_execution_time=execution_time_us,
                invocations=1,
                last_execution=_time.perf_counter(),
                bottlenecks=[],
            )
            self._detect_shader_bottlenecks(sm)
            self._shader_metrics[shader_id] = sm
        else:
            total = existing.avg_execution_time * existing.invocations + execution_time_us
            existing.invocations += 1
            existing.avg_execution_time = total / existing.invocations
            existing.min_execution_time = min(existing.min_execution_time, execution_time_us)
            existing.max_execution_time = max(existing.max_execution_time, execution_time_us)
            existing.last_execution = _time.perf_counter()
            self._detect_shader_bottlenecks(existing)

        if self._config.on_shader_metrics:
            self._config.on_shader_metrics(self._shader_metrics[shader_id])

    @staticmethod
    def _detect_shader_bottlenecks(sm: ShaderMetrics) -> None:
        sm.bottlenecks.clear()
        if sm.avg_execution_time > 10_000:
            sm.bottlenecks.append("High execution time — consider optimizing algorithm")
        variance = sm.max_execution_time - sm.min_execution_time
        if variance > sm.avg_execution_time * 0.5:
            sm.bottlenecks.append("High execution variance — check data-dependent branches")
        if sm.invocations > 10_000:
            sm.bottlenecks.append("High invocation count — consider batching")

    # -- frame analysis ----------------------------------------------------

    def record_frame(self, frame: FrameMetrics) -> None:
        self._frame_analysis.record_frame(frame)

    # -- reporting ---------------------------------------------------------

    @property
    def metrics_history(self) -> List[Metrics]:
        return list(self._metrics_history)

    @property
    def memory_metrics(self) -> MemoryMetrics:
        return self._memory

    @property
    def shader_metrics_list(self) -> List[ShaderMetrics]:
        return list(self._shader_metrics.values())

    @property
    def frame_analysis(self) -> FrameAnalysis:
        return self._frame_analysis

    def performance_stats(self) -> PerformanceStats:
        return compute_performance_stats(self._metrics_history, self._frame_count)

    def report(self, device_info: Optional[Dict[str, str]] = None) -> ProfileReport:
        """Generate a comprehensive profiling report."""
        stats = None
        if self._metrics_history:
            stats = self.performance_stats()

        return ProfileReport(
            device_info=device_info or {},
            stats=stats,
            memory=self._memory,
            shader_metrics=list(self._shader_metrics.values()),
            frame_analysis=self._frame_analysis,
        )

    # -- reset -------------------------------------------------------------

    def reset(self) -> None:
        self._metrics_history.clear()
        self._memory = MemoryMetrics()
        self._shader_metrics.clear()
        self._frame_analysis = FrameAnalysis(max_history=self._config.max_history_size)
        self._frame_count = 0
        self._state = ProfilerState.IDLE
