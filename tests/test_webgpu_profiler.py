"""Comprehensive test suite for webgpu_profiler."""

import time
import pytest

from webgpu_profiler.metrics import (
    MemoryAllocation,
    MemoryMetrics,
    Metrics,
    PerformanceStats,
    ShaderMetrics,
    average,
    compute_performance_stats,
    percentile,
)
from webgpu_profiler.frame import FrameAnalysis, FrameMetrics
from webgpu_profiler.profiler import Profiler, ProfilerConfig, ProfilerState
from webgpu_profiler.report import Bottleneck, ProfileReport, Severity
from webgpu_profiler.benchmark import BenchmarkRunner, BenchmarkResult, BenchmarkSuite, BenchmarkType


# =========================================================================
# Metrics helpers
# =========================================================================

class TestAverage:
    def test_basic(self):
        assert average([1.0, 2.0, 3.0]) == 2.0

    def test_empty(self):
        assert average([]) == 0.0

    def test_single(self):
        assert average([42.0]) == 42.0


class TestPercentile:
    def test_median(self):
        assert percentile([1.0, 2.0, 3.0, 4.0, 5.0], 50) == 3.0

    def test_p99(self):
        vals = list(range(1, 101))
        result = percentile(vals, 99)
        assert 98 <= result <= 100

    def test_empty(self):
        assert percentile([], 50) == 0.0

    def test_single(self):
        assert percentile([7.0], 99) == 7.0


class TestMetrics:
    def test_frozen(self):
        m = Metrics(timestamp=0.0, utilization=50, memory_used=100, memory_total=200,
                    memory_percentage=50, frame_time=16.6, fps=60, compute_time=8.0)
        with pytest.raises(AttributeError):
            m.timestamp = 1.0  # type: ignore[misc]

    def test_optional_fields(self):
        m = Metrics(timestamp=0, utilization=0, memory_used=0, memory_total=1,
                    memory_percentage=0, frame_time=0, fps=0, compute_time=0,
                    power_usage=250.0, temperature=70.0, clock_speed=1800.0)
        assert m.power_usage == 250.0
        assert m.temperature == 70.0
        assert m.clock_speed == 1800.0


class TestComputePerformanceStats:
    def _make_metrics(self, n: int = 10) -> list:
        return [
            Metrics(timestamp=float(i), utilization=50.0, memory_used=0,
                    memory_total=4*1024**3, memory_percentage=0,
                    frame_time=16.6, fps=60.0, compute_time=8.0)
            for i in range(n)
        ]

    def test_basic(self):
        stats = compute_performance_stats(self._make_metrics(), 10)
        assert stats.total_frames == 10
        assert stats.avg_fps == 60.0
        assert stats.min_fps == 60.0
        assert stats.max_fps == 60.0
        assert stats.total_compute_time == 80.0

    def test_empty_raises(self):
        with pytest.raises(ValueError):
            compute_performance_stats([], 0)

    def test_percentiles_present(self):
        stats = compute_performance_stats(self._make_metrics(), 10)
        assert stats.frame_time_percentiles.p50 > 0
        assert stats.frame_time_percentiles.p95 > 0
        assert stats.frame_time_percentiles.p99 > 0


# =========================================================================
# FrameAnalysis
# =========================================================================

class TestFrameAnalysis:
    def _make_frame(self, i: int, ft: float = 16.6, gpu: float = 10.0) -> FrameMetrics:
        return FrameMetrics(frame_number=i, timestamp=float(i), frame_time=ft,
                            gpu_time=gpu, cpu_wait_time=ft - gpu)

    def test_record_and_count(self):
        fa = FrameAnalysis()
        for i in range(5):
            fa.record_frame(self._make_frame(i))
        assert fa.frame_count == 5

    def test_averages(self):
        fa = FrameAnalysis()
        for i in range(10):
            fa.record_frame(self._make_frame(i, ft=20.0, gpu=15.0))
        assert fa.average_frame_time() == 20.0
        assert fa.average_gpu_time() == 15.0
        assert fa.average_cpu_wait() == 5.0

    def test_fps(self):
        fa = FrameAnalysis()
        fa.record_frame(self._make_frame(0, ft=10.0))
        assert fa.average_fps() == 100.0

    def test_gpu_bound(self):
        fa = FrameAnalysis()
        for i in range(5):
            fa.record_frame(self._make_frame(i, ft=10.0, gpu=9.0))
        assert fa.is_gpu_bound(threshold=0.8)

    def test_not_gpu_bound(self):
        fa = FrameAnalysis()
        for i in range(5):
            fa.record_frame(self._make_frame(i, ft=10.0, gpu=3.0))
        assert not fa.is_gpu_bound(threshold=0.8)

    def test_spike_detection(self):
        fa = FrameAnalysis()
        for i in range(20):
            fa.record_frame(self._make_frame(i, ft=16.0))
        # Add a spike
        fa.record_frame(self._make_frame(20, ft=100.0))
        spikes = fa.detect_spikes()
        assert len(spikes) >= 1
        assert spikes[0].frame_time == 100.0

    def test_no_spikes_few_frames(self):
        fa = FrameAnalysis()
        fa.record_frame(self._make_frame(0))
        assert fa.detect_spikes() == []

    def test_memory_pressure(self):
        fa = FrameAnalysis()
        for i in range(10):
            fa.record_frame(FrameMetrics(frame_number=i, timestamp=float(i),
                                         frame_time=16.0, gpu_time=10.0,
                                         cpu_wait_time=6.0,
                                         memory_allocated=100, memory_freed=50))
        pressure = fa.memory_pressure()
        assert pressure == 50.0

    def test_memory_pressure_empty(self):
        fa = FrameAnalysis()
        assert fa.memory_pressure() is None

    def test_summary(self):
        fa = FrameAnalysis()
        for i in range(5):
            fa.record_frame(self._make_frame(i, ft=16.0, gpu=10.0))
        s = fa.summary()
        assert s["frame_count"] == 5
        assert "avg_fps" in s

    def test_max_history(self):
        fa = FrameAnalysis(max_history=3)
        for i in range(10):
            fa.record_frame(self._make_frame(i))
        assert fa.frame_count == 3


# =========================================================================
# Profiler
# =========================================================================

class TestProfiler:
    def test_lifecycle(self):
        p = Profiler()
        assert p.state == ProfilerState.IDLE
        p.start()
        assert p.state == ProfilerState.RUNNING
        p.pause()
        assert p.state == ProfilerState.PAUSED
        p.resume()
        assert p.state == ProfilerState.RUNNING
        p.stop()
        assert p.state == ProfilerState.IDLE

    def test_double_start(self):
        p = Profiler()
        p.start()
        p.start()  # should be no-op
        assert p.state == ProfilerState.RUNNING
        p.stop()

    def test_sample(self):
        p = Profiler()
        p.start()
        m = p.sample()
        assert m.fps > 0
        assert m.frame_time > 0
        p.stop()

    def test_sample_not_running_raises(self):
        p = Profiler()
        with pytest.raises(RuntimeError):
            p.sample()

    def test_sample_frame_time_override(self):
        # Feeding explicit frame_time lets the analytics API ingest recorded /
        # replay data instead of deriving nonsense frame times from a wall-clock
        # delta (which is microseconds when sample() is called in a tight loop).
        p = Profiler()
        p.start()
        for _ in range(60):
            p.sample(frame_time=16.7, compute_time=12.0, utilization=72.0)
        p.stop()
        stats = p.performance_stats()
        assert round(stats.avg_frame_time, 1) == 16.7
        assert 59 <= stats.avg_fps <= 61
        # Physically consistent: compute time cannot exceed the frame time.
        assert stats.avg_compute_time <= stats.avg_frame_time

    def test_memory_tracking(self):
        p = Profiler()
        p.track_buffer("buf1", 1024)
        assert p.memory_metrics.buffer_memory == 1024
        assert p.memory_metrics.total_allocated == 1024

        p.track_texture("tex1", 2048)
        assert p.memory_metrics.texture_memory == 2048
        assert p.memory_metrics.total_allocated == 3072

        p.untrack("buf1")
        assert p.memory_metrics.buffer_memory == 0
        assert p.memory_metrics.total_allocated == 2048

    def test_untrack_unknown(self):
        p = Profiler()
        p.untrack("nonexistent")  # should not raise

    def test_memory_disabled(self):
        p = Profiler(ProfilerConfig(enable_memory_tracking=False))
        p.track_buffer("buf", 1024)
        assert p.memory_metrics.total_allocated == 0

    def test_shader_tracking(self):
        p = Profiler()
        p.track_shader("shader_a", "main", 500.0)
        metrics = p.shader_metrics_list
        assert len(metrics) == 1
        assert metrics[0].avg_execution_time == 500.0
        assert metrics[0].invocations == 1

        p.track_shader("shader_a", "main", 1500.0)
        metrics = p.shader_metrics_list
        assert metrics[0].invocations == 2
        assert metrics[0].avg_execution_time == 1000.0
        assert metrics[0].min_execution_time == 500.0
        assert metrics[0].max_execution_time == 1500.0

    def test_shader_bottleneck_detection(self):
        p = Profiler()
        p.track_shader("slow", "main", 20_000.0)  # > 10ms
        sm = p.shader_metrics_list[0]
        assert any("High execution time" in b for b in sm.bottlenecks)

    def test_shader_disabled(self):
        p = Profiler(ProfilerConfig(enable_shader_profiling=False))
        p.track_shader("s", "main", 100.0)
        assert len(p.shader_metrics_list) == 0

    def test_frame_recording(self):
        p = Profiler()
        frame = FrameMetrics(frame_number=0, timestamp=0.0, frame_time=16.0,
                             gpu_time=10.0, cpu_wait_time=6.0)
        p.record_frame(frame)
        assert p.frame_analysis.frame_count == 1

    def test_performance_stats(self):
        p = Profiler()
        p.start()
        for _ in range(5):
            time.sleep(0.001)
            p.sample()
        p.stop()
        stats = p.performance_stats()
        assert stats.total_frames == 5
        assert stats.avg_fps > 0

    def test_report(self):
        p = Profiler()
        p.start()
        time.sleep(0.001)
        p.sample()
        p.track_buffer("buf", 1024)
        p.track_shader("s", "main", 500.0)
        p.stop()
        report = p.report(device_info={"vendor": "Test", "architecture": "v1"})
        assert report.device_info["vendor"] == "Test"
        assert report.stats is not None
        bottlenecks = report.detect_bottlenecks()
        assert isinstance(bottlenecks, list)

    def test_report_summary(self):
        p = Profiler()
        p.start()
        p.sample()
        p.stop()
        report = p.report()
        s = report.summary()
        assert "device" in s
        assert "performance" in s
        assert "memory" in s

    def test_reset(self):
        p = Profiler()
        p.start()
        p.sample()
        p.track_buffer("buf", 1024)
        p.track_shader("s", "main", 100.0)
        p.stop()
        p.reset()
        assert len(p.metrics_history) == 0
        assert p.memory_metrics.total_allocated == 0
        assert len(p.shader_metrics_list) == 0
        assert p.frame_analysis.frame_count == 0
        assert p.state == ProfilerState.IDLE

    def test_callback(self):
        collected: list = []
        p = Profiler(ProfilerConfig(on_metrics_update=collected.append))
        p.start()
        p.sample()
        p.stop()
        assert len(collected) == 1

    def test_max_history(self):
        p = Profiler(ProfilerConfig(max_history_size=5))
        p.start()
        for _ in range(10):
            time.sleep(0.001)
            p.sample()
        p.stop()
        assert len(p.metrics_history) == 5


# =========================================================================
# ProfileReport / Bottleneck detection
# =========================================================================

class TestProfileReport:
    def test_empty_report(self):
        r = ProfileReport()
        assert r.detect_bottlenecks() == []
        s = r.summary()
        assert "device" in s

    def test_low_fps_critical(self):
        stats = _make_stats(avg_fps=20.0, min_fps=15.0, max_fps=25.0)
        r = ProfileReport(stats=stats)
        bns = r.detect_bottlenecks()
        assert any(b.severity == Severity.CRITICAL and "FPS" in b.message for b in bns)

    def test_low_fps_warning(self):
        stats = _make_stats(avg_fps=45.0, min_fps=30.0, max_fps=60.0)
        r = ProfileReport(stats=stats)
        bns = r.detect_bottlenecks()
        assert any(b.severity == Severity.WARNING and "FPS" in b.message for b in bns)

    def test_high_p99(self):
        from webgpu_profiler.metrics import FrameTimePercentiles
        stats = PerformanceStats(
            total_frames=100, avg_fps=60.0, min_fps=55.0, max_fps=65.0,
            avg_frame_time=16.6,
            frame_time_percentiles=FrameTimePercentiles(p50=16.6, p95=20.0, p99=40.0),
            total_compute_time=800.0, avg_compute_time=8.0,
            start_time=0.0, end_time=1.0,
        )
        r = ProfileReport(stats=stats)
        bns = r.detect_bottlenecks()
        assert any("P99" in b.message for b in bns)

    def test_memory_critical(self):
        mem = MemoryMetrics(total_allocated=4_000_000_000)
        r = ProfileReport(memory=mem)
        bns = r.detect_bottlenecks()
        assert any(b.category == "memory" and b.severity == Severity.CRITICAL for b in bns)

    def test_memory_warning(self):
        mem = MemoryMetrics(total_allocated=3_200_000_000)
        r = ProfileReport(memory=mem)
        bns = r.detect_bottlenecks()
        assert any(b.category == "memory" and b.severity == Severity.WARNING for b in bns)

    def test_shader_slow(self):
        sm = ShaderMetrics(shader_id="heavy", entry_point="main",
                           avg_execution_time=50_000.0, min_execution_time=40_000.0,
                           max_execution_time=60_000.0)
        r = ProfileReport(shader_metrics=[sm])
        bns = r.detect_bottlenecks()
        assert any(b.category == "shader" for b in bns)

    def test_shader_variance(self):
        sm = ShaderMetrics(shader_id="var", entry_point="main",
                           avg_execution_time=1000.0, min_execution_time=100.0,
                           max_execution_time=5000.0)
        r = ProfileReport(shader_metrics=[sm])
        bns = r.detect_bottlenecks()
        assert any("variance" in b.message.lower() for b in bns)

    def test_gpu_bound_frame_analysis(self):
        fa = FrameAnalysis()
        for i in range(10):
            fa.record_frame(FrameMetrics(frame_number=i, timestamp=float(i),
                                         frame_time=10.0, gpu_time=9.0,
                                         cpu_wait_time=1.0))
        r = ProfileReport(frame_analysis=fa)
        bns = r.detect_bottlenecks()
        assert any(b.category == "gpu_bound" for b in bns)

    def test_summary_keys(self):
        r = ProfileReport(device_info={"vendor": "NVIDIA"})
        s = r.summary()
        assert s["device"]["vendor"] == "NVIDIA"


# =========================================================================
# BenchmarkRunner
# =========================================================================

class TestBenchmarkRunner:
    def test_register_and_run(self):
        br = BenchmarkRunner()
        br.register("test", lambda: BenchmarkResult(
            name="test", description="test", score=42.0, unit="ms",
            execution_time=1.0, timestamp=time.time()))
        result = br.run("test")
        assert result.score == 42.0

    def test_unknown_benchmark_raises(self):
        br = BenchmarkRunner()
        with pytest.raises(KeyError):
            br.run("nope")

    def test_run_all_builtins(self):
        br = BenchmarkRunner(device_info={"vendor": "Test"})
        br.register_builtin()
        suite = br.run_all()
        assert suite.overall_score > 0
        assert len(suite.results) == 4
        assert suite.device["vendor"] == "Test"

    def test_run_comparison(self):
        br = BenchmarkRunner()
        br.register("test", lambda: BenchmarkResult(
            name="test", description="test", score=10.0, unit="ms",
            execution_time=1.0, timestamp=time.time()))
        comparison = br.run_comparison({"cfg_a": {}, "cfg_b": {}}, "test")
        assert len(comparison) == 2
        assert "cfg_a" in comparison
        assert comparison["cfg_a"].name == "test[cfg_a]"

    def test_empty_run_all(self):
        br = BenchmarkRunner()
        suite = br.run_all()
        assert suite.overall_score == 0.0
        assert suite.results == []

    def test_benchmark_types(self):
        assert BenchmarkType.COMPUTE == "compute"
        assert BenchmarkType.MEMORY == "memory"
        assert BenchmarkType.LATENCY == "latency"


# =========================================================================
# Helpers
# =========================================================================

def _make_stats(avg_fps=60.0, min_fps=55.0, max_fps=65.0) -> PerformanceStats:
    from webgpu_profiler.metrics import FrameTimePercentiles
    return PerformanceStats(
        total_frames=100,
        avg_fps=avg_fps,
        min_fps=min_fps,
        max_fps=max_fps,
        avg_frame_time=16.6,
        frame_time_percentiles=FrameTimePercentiles(p50=16.6, p95=18.0, p99=20.0),
        total_compute_time=800.0,
        avg_compute_time=8.0,
        start_time=0.0,
        end_time=1.0,
    )
