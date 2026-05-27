"""Tests for webgpu_profiler.alert module."""

from __future__ import annotations

import math

import pytest

from webgpu_profiler.alert import (
    Alert,
    AlertLevel,
    AlertStatus,
    PerformanceAlert,
    RegressionResult,
    ThresholdRule,
)


# ---------------------------------------------------------------------------
# ThresholdRule
# ---------------------------------------------------------------------------

class TestThresholdRule:
    def test_above_warning(self) -> None:
        rule = ThresholdRule("high_mem", "memory_pct", warning_threshold=70.0, critical_threshold=90.0, direction="above")
        assert rule.evaluate(75.0) == AlertLevel.WARNING

    def test_above_critical(self) -> None:
        rule = ThresholdRule("high_mem", "memory_pct", warning_threshold=70.0, critical_threshold=90.0, direction="above")
        assert rule.evaluate(95.0) == AlertLevel.CRITICAL

    def test_above_ok(self) -> None:
        rule = ThresholdRule("high_mem", "memory_pct", warning_threshold=70.0, critical_threshold=90.0, direction="above")
        assert rule.evaluate(50.0) is None

    def test_below_warning(self) -> None:
        rule = ThresholdRule("low_fps", "fps", warning_threshold=60.0, critical_threshold=30.0, direction="below")
        assert rule.evaluate(45.0) == AlertLevel.WARNING

    def test_below_critical(self) -> None:
        rule = ThresholdRule("low_fps", "fps", warning_threshold=60.0, critical_threshold=30.0, direction="below")
        assert rule.evaluate(20.0) == AlertLevel.CRITICAL

    def test_below_ok(self) -> None:
        rule = ThresholdRule("low_fps", "fps", warning_threshold=60.0, critical_threshold=30.0, direction="below")
        assert rule.evaluate(80.0) is None

    def test_exact_threshold(self) -> None:
        rule = ThresholdRule("t", "x", warning_threshold=50.0, critical_threshold=80.0, direction="above")
        assert rule.evaluate(50.0) == AlertLevel.WARNING
        assert rule.evaluate(80.0) == AlertLevel.CRITICAL


# ---------------------------------------------------------------------------
# PerformanceAlert — threshold checking
# ---------------------------------------------------------------------------

class TestCheckMetrics:
    def test_triggers_alert(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("low_fps", "avg_fps", 60.0, 30.0, direction="below"))
        alerts = pa.check_metrics({"avg_fps": 25.0}, timestamp=100.0)
        assert len(alerts) == 1
        assert alerts[0].level == AlertLevel.CRITICAL
        assert alerts[0].rule_name == "low_fps"

    def test_no_alert_when_ok(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("low_fps", "avg_fps", 60.0, 30.0, direction="below"))
        alerts = pa.check_metrics({"avg_fps": 90.0}, timestamp=100.0)
        assert len(alerts) == 0

    def test_missing_metric_skipped(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("low_fps", "avg_fps", 60.0, 30.0, direction="below"))
        alerts = pa.check_metrics({"other_metric": 5.0}, timestamp=100.0)
        assert len(alerts) == 0

    def test_cooldown(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("low_fps", "avg_fps", 60.0, 30.0, direction="below", cooldown_seconds=10.0))
        a1 = pa.check_metrics({"avg_fps": 20.0}, timestamp=100.0)
        assert len(a1) == 1
        # Within cooldown — should not re-trigger
        a2 = pa.check_metrics({"avg_fps": 20.0}, timestamp=105.0)
        assert len(a2) == 0
        # After cooldown — triggers again
        a3 = pa.check_metrics({"avg_fps": 20.0}, timestamp=111.0)
        assert len(a3) == 1

    def test_multiple_rules(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("low_fps", "fps", 60.0, 30.0, direction="below"))
        pa.add_threshold_rule(ThresholdRule("high_mem", "mem_pct", 70.0, 90.0, direction="above"))
        alerts = pa.check_metrics({"fps": 25.0, "mem_pct": 85.0}, timestamp=100.0)
        assert len(alerts) == 2

    def test_alert_history(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("r", "x", 50.0, 80.0, direction="above", cooldown_seconds=0.0))
        pa.check_metrics({"x": 60.0}, timestamp=1.0)
        pa.check_metrics({"x": 90.0}, timestamp=2.0)
        assert len(pa.alerts) == 2

    def test_clear_alerts(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("r", "x", 50.0, 80.0, direction="above"))
        pa.check_metrics({"x": 60.0}, timestamp=1.0)
        pa.clear_alerts()
        assert len(pa.alerts) == 0


# ---------------------------------------------------------------------------
# Rule management
# ---------------------------------------------------------------------------

class TestRuleManagement:
    def test_add_and_list(self) -> None:
        pa = PerformanceAlert()
        rule = ThresholdRule("r1", "k1", 10.0, 20.0)
        pa.add_threshold_rule(rule)
        assert len(pa.rules) == 1
        assert pa.rules[0].name == "r1"

    def test_remove(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("r1", "k1", 10.0, 20.0))
        pa.remove_threshold_rule("r1")
        assert len(pa.rules) == 0

    def test_remove_nonexistent(self) -> None:
        pa = PerformanceAlert()
        pa.remove_threshold_rule("ghost")  # should not raise


# ---------------------------------------------------------------------------
# Baselines
# ---------------------------------------------------------------------------

class TestBaselines:
    def test_set_baseline(self) -> None:
        pa = PerformanceAlert()
        pa.set_baseline("fps", [60.0, 62.0, 58.0])
        assert pa.get_baseline("fps") == [60.0, 62.0, 58.0]

    def test_add_sample(self) -> None:
        pa = PerformanceAlert()
        pa.add_baseline_sample("fps", 60.0)
        pa.add_baseline_sample("fps", 62.0)
        assert pa.get_baseline("fps") == [60.0, 62.0]

    def test_missing_baseline(self) -> None:
        pa = PerformanceAlert()
        assert pa.get_baseline("nope") == []


# ---------------------------------------------------------------------------
# Regression detection
# ---------------------------------------------------------------------------

class TestRegression:
    def _make_baseline(self) -> PerformanceAlert:
        pa = PerformanceAlert()
        # Baseline: stable around 60 fps
        pa.set_baseline("fps", [60.0, 61.0, 59.0, 60.5, 59.5, 60.2, 61.0, 59.8, 60.0, 60.3])
        return pa

    def test_no_regression_when_similar(self) -> None:
        pa = self._make_baseline()
        current = [60.1, 59.9, 60.0, 60.2, 59.8, 60.0, 60.1, 59.9]
        result = pa.detect_regression("fps", current, higher_is_better=True)
        assert result is None

    def test_regression_detected(self) -> None:
        pa = self._make_baseline()
        # Current: dropped to ~40 fps (significant regression)
        current = [40.0, 41.0, 39.5, 40.5, 42.0, 38.0, 41.0, 39.0]
        result = pa.detect_regression("fps", current, higher_is_better=True)
        assert result is not None
        assert result.is_regression is True
        assert result.metric_key == "fps"
        assert result.change_percent < -20  # big drop

    def test_regression_not_triggered_for_improvement(self) -> None:
        pa = self._make_baseline()
        # Current: improved to ~80 fps
        current = [80.0, 81.0, 79.0, 82.0, 78.0, 80.5, 81.0, 79.5]
        result = pa.detect_regression("fps", current, higher_is_better=True)
        # Higher is better, so improvement is NOT a regression
        assert result is None

    def test_regression_for_higher_is_worse(self) -> None:
        pa = PerformanceAlert()
        pa.set_baseline("frame_time", [16.0, 16.5, 15.8, 16.2, 16.0, 15.9, 16.3, 16.1])
        # Current: frame time went up (worse)
        current = [25.0, 26.0, 24.5, 25.5, 27.0, 24.0, 26.0, 25.0]
        result = pa.detect_regression("frame_time", current, higher_is_better=False)
        assert result is not None
        assert result.is_regression is True

    def test_no_regression_insufficient_samples(self) -> None:
        pa = PerformanceAlert()
        pa.set_baseline("x", [10.0])
        result = pa.detect_regression("x", [20.0])
        assert result is None

    def test_no_baseline(self) -> None:
        pa = PerformanceAlert()
        result = pa.detect_regression("missing", [10.0, 20.0])
        assert result is None

    def test_min_change_percent(self) -> None:
        pa = self._make_baseline()
        # Small change (~3%) — below default 5% threshold
        current = [58.0, 58.5, 57.5, 58.0, 59.0, 57.0, 58.0, 58.5]
        result = pa.detect_regression("fps", current, min_change_percent=5.0)
        # With only ~3% change, no regression even if statistically significant
        assert result is None

    def test_severity_levels(self) -> None:
        pa = PerformanceAlert()
        # Add slight variance so Welch's t-test works
        pa.set_baseline("fps", [60.0, 60.1, 59.9, 60.0, 60.1, 59.9, 60.0, 60.1, 59.9, 60.0,
                                 60.0, 60.1, 59.9, 60.0, 60.1, 59.9, 60.0, 60.1, 59.9, 60.0])
        # ~33% drop → CRITICAL
        current = [40.0, 40.1, 39.9, 40.0, 40.1, 39.9, 40.0, 40.1, 39.9, 40.0,
                   40.0, 40.1, 39.9, 40.0, 40.1, 39.9, 40.0, 40.1, 39.9, 40.0]
        result = pa.detect_regression("fps", current, higher_is_better=True)
        assert result is not None
        assert result.level == AlertLevel.CRITICAL


class TestDetectRegressions:
    def test_multiple_metrics(self) -> None:
        pa = PerformanceAlert()
        pa.set_baseline("fps", [60.0, 60.1, 59.9, 60.0, 60.1, 59.9, 60.0, 60.1, 59.9, 60.0])
        pa.set_baseline("mem", [50.0, 50.1, 49.9, 50.0, 50.1, 49.9, 50.0, 50.1, 49.9, 50.0])

        results = pa.detect_regressions(
            {"fps": [40.0, 40.1, 39.9, 40.0, 40.1, 39.9, 40.0, 40.1, 39.9, 40.0],
             "mem": [55.0, 55.1, 54.9, 55.0, 55.1, 54.9, 55.0, 55.1, 54.9, 55.0]},
            higher_is_better={"fps": True, "mem": False},
        )
        fps_results = [r for r in results if r.metric_key == "fps"]
        assert len(fps_results) == 1

    def test_empty_current(self) -> None:
        pa = PerformanceAlert()
        pa.set_baseline("x", [10.0] * 5)
        results = pa.detect_regressions({})
        assert results == []


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

class TestReset:
    def test_reset_clears_everything(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("r", "k", 50.0, 80.0))
        pa.set_baseline("k", [1.0, 2.0])
        pa.check_metrics({"k": 90.0}, timestamp=1.0)
        pa.reset()
        assert len(pa.rules) == 0
        assert len(pa.alerts) == 0
        assert pa.get_baseline("k") == []


# ---------------------------------------------------------------------------
# Alert dataclass
# ---------------------------------------------------------------------------

class TestAlert:
    def test_fields(self) -> None:
        a = Alert(
            rule_name="r",
            level=AlertLevel.WARNING,
            message="msg",
            metric_key="k",
            metric_value=42.0,
            threshold=50.0,
            timestamp=1.0,
        )
        assert a.rule_name == "r"
        assert a.level == AlertLevel.WARNING
        assert a.metric_value == 42.0


class TestAlertLevel:
    def test_values(self) -> None:
        assert AlertLevel.INFO.value == "info"
        assert AlertLevel.WARNING.value == "warning"
        assert AlertLevel.CRITICAL.value == "critical"


class TestAlertStatus:
    def test_values(self) -> None:
        assert AlertStatus.IDLE.value == "idle"
        assert AlertStatus.ACTIVE.value == "active"
        assert AlertStatus.SUPPRESSED.value == "suppressed"
        assert AlertStatus.ACKNOWLEDGED.value == "acknowledged"


class TestRegressionResult:
    def test_fields(self) -> None:
        r = RegressionResult(
            metric_key="fps",
            baseline_mean=60.0,
            current_mean=40.0,
            change_percent=-33.3,
            is_regression=True,
            confidence=0.95,
            level=AlertLevel.CRITICAL,
        )
        assert r.is_regression is True
        assert r.confidence == 0.95


# ---------------------------------------------------------------------------
# Acknowledge
# ---------------------------------------------------------------------------

class TestAcknowledge:
    def test_acknowledge(self) -> None:
        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule("r", "k", 50.0, 80.0, direction="above"))
        pa.acknowledge_alert("r")
        assert pa._suppressed.get("r") is True
