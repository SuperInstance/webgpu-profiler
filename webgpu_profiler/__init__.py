"""WebGPU Profiler — GPU compute performance profiling and benchmarking."""

from .profiler import Profiler, ProfilerConfig, ProfilerState
from .metrics import Metrics, MemoryMetrics, MemoryAllocation, MemorySample, ShaderMetrics, PerformanceStats
from .frame import FrameAnalysis, FrameMetrics
from .report import ProfileReport, Bottleneck
from .benchmark import BenchmarkRunner, BenchmarkResult, BenchmarkSuite, BenchmarkType

__version__ = "1.0.0"
__all__ = [
    "Profiler",
    "ProfilerConfig",
    "ProfilerState",
    "Metrics",
    "MemoryMetrics",
    "MemoryAllocation",
    "MemorySample",
    "ShaderMetrics",
    "PerformanceStats",
    "FrameAnalysis",
    "FrameMetrics",
    "ProfileReport",
    "Bottleneck",
    "BenchmarkRunner",
    "BenchmarkResult",
    "BenchmarkSuite",
    "BenchmarkType",
]
