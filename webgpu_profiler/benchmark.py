"""BenchmarkRunner — compare performance across configurations."""

from __future__ import annotations

import time as _time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional


class BenchmarkType(str, Enum):
    COMPUTE = "compute"
    MEMORY = "memory"
    BANDWIDTH = "bandwidth"
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    SHADER = "shader"


@dataclass(frozen=True)
class BenchmarkResult:
    """Result from a single benchmark run."""

    name: str
    description: str
    score: float  # higher is better
    unit: str
    execution_time: float  # ms
    metrics: Dict[str, float] = field(default_factory=dict)
    timestamp: float = 0.0


@dataclass(frozen=True)
class BenchmarkSuite:
    """Complete benchmark suite results."""

    device: Dict[str, str]
    overall_score: float  # normalized 0–100
    results: List[BenchmarkResult]
    timestamp: float = 0.0
    version: str = "1.0.0"


# A benchmark function takes no args and returns a BenchmarkResult.
BenchmarkFunc = Callable[[], BenchmarkResult]


class BenchmarkRunner:
    """Run and compare GPU benchmarks across configurations."""

    def __init__(self, device_info: Optional[Dict[str, str]] = None) -> None:
        self._device_info = device_info or {}
        self._registry: Dict[str, BenchmarkFunc] = {}
        self._results: List[BenchmarkResult] = []
        self._version = "1.0.0"

    # -- registration ------------------------------------------------------

    def register(self, name: str, func: BenchmarkFunc) -> None:
        self._registry[name] = func

    def register_builtin(self) -> None:
        """Register lightweight built-in benchmarks (CPU-based timing stubs
        useful for testing the framework without a real GPU)."""
        self.register("compute_throughput", self._builtin_compute)
        self.register("memory_bandwidth", self._builtin_memory)
        self.register("latency", self._builtin_latency)
        self.register("throughput", self._builtin_throughput)

    # -- execution ---------------------------------------------------------

    def run(self, name: str) -> BenchmarkResult:
        if name not in self._registry:
            raise KeyError(f"Unknown benchmark: {name!r}")
        result = self._registry[name]()
        self._results.append(result)
        return result

    def run_all(self) -> BenchmarkSuite:
        self._results = []
        for name in list(self._registry):
            self.run(name)

        overall = self._overall_score()
        return BenchmarkSuite(
            device=self._device_info,
            overall_score=overall,
            results=list(self._results),
            timestamp=_time.time(),
            version=self._version,
        )

    def run_comparison(
        self,
        configs: Dict[str, Dict[str, Any]],
        benchmark_name: str,
    ) -> Dict[str, BenchmarkResult]:
        """Run a single named benchmark under multiple configurations.

        *configs* maps a label to arbitrary config data that the registered
        benchmark function can read (e.g. via closure or global state).
        The runner itself simply calls the benchmark once per label and
        annotates the result name with the config label.
        """
        comparison: Dict[str, BenchmarkResult] = {}
        for label, _cfg in configs.items():
            r = self.run(benchmark_name)
            comparison[label] = BenchmarkResult(
                name=f"{benchmark_name}[{label}]",
                description=r.description,
                score=r.score,
                unit=r.unit,
                execution_time=r.execution_time,
                metrics=r.metrics,
                timestamp=r.timestamp,
            )
        return comparison

    # -- scoring -----------------------------------------------------------

    def _overall_score(self) -> float:
        if not self._results:
            return 0.0
        return sum(r.score for r in self._results) / len(self._results)

    # -- built-in benchmark stubs ------------------------------------------

    @staticmethod
    def _builtin_compute() -> BenchmarkResult:
        start = _time.perf_counter()
        # Simulated compute workload
        total = sum(i * i for i in range(100_000))
        elapsed = (_time.perf_counter() - start) * 1000
        return BenchmarkResult(
            name="compute_throughput",
            description="Simple integer arithmetic throughput",
            score=round(100_000 / max(elapsed, 0.001), 2),
            unit="ops/ms",
            execution_time=round(elapsed, 3),
            metrics={"total_ops": 100_000},
            timestamp=_time.time(),
        )

    @staticmethod
    def _builtin_memory() -> BenchmarkResult:
        start = _time.perf_counter()
        # Simulated memory bandwidth (list ops)
        data = bytearray(1_048_576)  # 1 MB
        for i in range(len(data)):
            data[i] = i & 0xFF
        elapsed = (_time.perf_counter() - start) * 1000
        return BenchmarkResult(
            name="memory_bandwidth",
            description="1 MB sequential write bandwidth",
            score=round(1_048_576 / max(elapsed, 0.001) / 1024, 2),
            unit="MB/s",
            execution_time=round(elapsed, 3),
            metrics={"bytes": 1_048_576},
            timestamp=_time.time(),
        )

    @staticmethod
    def _builtin_latency() -> BenchmarkResult:
        start = _time.perf_counter()
        for _ in range(1_000):
            _time.perf_counter()
        elapsed = (_time.perf_counter() - start) * 1000
        return BenchmarkResult(
            name="latency",
            description="Timer resolution latency (1000 calls)",
            score=round(1000 / max(elapsed, 0.001), 2),
            unit="calls/ms",
            execution_time=round(elapsed, 3),
            metrics={"calls": 1000},
            timestamp=_time.time(),
        )

    @staticmethod
    def _builtin_throughput() -> BenchmarkResult:
        start = _time.perf_counter()
        # Simulated throughput: create many small lists
        for _ in range(10_000):
            _ = [0] * 64
        elapsed = (_time.perf_counter() - start) * 1000
        return BenchmarkResult(
            name="throughput",
            description="Small allocation throughput (10k x 64 items)",
            score=round(10_000 / max(elapsed, 0.001), 2),
            unit="allocs/ms",
            execution_time=round(elapsed, 3),
            metrics={"allocations": 10_000},
            timestamp=_time.time(),
        )
