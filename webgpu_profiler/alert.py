"""PerformanceAlert — configurable threshold alerts and regression detection."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Sequence, Tuple


class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    IDLE = "idle"
    ACTIVE = "active"
    SUPPRESSED = "suppressed"
    ACKNOWLEDGED = "acknowledged"


@dataclass(frozen=True)
class Alert:
    """A single performance alert."""

    rule_name: str
    level: AlertLevel
    message: str
    metric_key: str
    metric_value: float
    threshold: float
    timestamp: float = 0.0


@dataclass
class ThresholdRule:
    """A configurable threshold rule for a metric.

    Triggers when ``metric_value`` crosses the threshold in the specified
    direction (``above`` or ``below``).
    """

    name: str
    metric_key: str
    warning_threshold: float
    critical_threshold: float
    direction: str = "above"  # "above" or "below"
    cooldown_seconds: float = 60.0

    def evaluate(self, value: float) -> Optional[AlertLevel]:
        """Return the alert level if the threshold is breached, else None."""
        if self.direction == "above":
            if value >= self.critical_threshold:
                return AlertLevel.CRITICAL
            if value >= self.warning_threshold:
                return AlertLevel.WARNING
        else:  # below
            if value <= self.critical_threshold:
                return AlertLevel.CRITICAL
            if value <= self.warning_threshold:
                return AlertLevel.WARNING
        return None


@dataclass(frozen=True)
class RegressionResult:
    """Result of a regression analysis between two sample sets."""

    metric_key: str
    baseline_mean: float
    current_mean: float
    change_percent: float
    is_regression: bool
    confidence: float  # 0–1
    level: AlertLevel


class PerformanceAlert:
    """Performance alerting with threshold rules and regression detection.

    Usage::

        pa = PerformanceAlert()
        pa.add_threshold_rule(ThresholdRule(
            name="low_fps", metric_key="avg_fps",
            warning_threshold=60.0, critical_threshold=30.0,
            direction="below",
        ))
        alerts = pa.check_metrics({"avg_fps": 25.0})
    """

    def __init__(self) -> None:
        self._rules: Dict[str, ThresholdRule] = {}
        self._alerts: List[Alert] = []
        self._baselines: Dict[str, List[float]] = {}
        self._last_trigger: Dict[str, float] = {}
        self._suppressed: Dict[str, bool] = {}

    # -- rule management ---------------------------------------------------

    def add_threshold_rule(self, rule: ThresholdRule) -> None:
        self._rules[rule.name] = rule

    def remove_threshold_rule(self, name: str) -> None:
        self._rules.pop(name, None)

    @property
    def rules(self) -> List[ThresholdRule]:
        return list(self._rules.values())

    # -- threshold checking ------------------------------------------------

    def check_metrics(self, metrics: Dict[str, float], timestamp: float = 0.0) -> List[Alert]:
        """Evaluate all threshold rules against the provided metrics dict.

        Returns a list of triggered alerts (may be empty).
        """
        triggered: List[Alert] = []
        for rule in self._rules.values():
            value = metrics.get(rule.metric_key)
            if value is None:
                continue

            # Check cooldown
            last = self._last_trigger.get(rule.name, 0.0)
            if timestamp > 0 and (timestamp - last) < rule.cooldown_seconds:
                continue

            level = rule.evaluate(value)
            if level is not None:
                alert = Alert(
                    rule_name=rule.name,
                    level=level,
                    message=f"{rule.metric_key} = {value:.2f} ({level.value}: {rule.direction} {rule.warning_threshold})",
                    metric_key=rule.metric_key,
                    metric_value=value,
                    threshold=rule.warning_threshold if level == AlertLevel.WARNING else rule.critical_threshold,
                    timestamp=timestamp,
                )
                triggered.append(alert)
                self._alerts.append(alert)
                self._last_trigger[rule.name] = timestamp
        return triggered

    # -- baselines for regression ------------------------------------------

    def set_baseline(self, metric_key: str, samples: Sequence[float]) -> None:
        """Store baseline samples for a metric (used for regression detection)."""
        self._baselines[metric_key] = list(samples)

    def add_baseline_sample(self, metric_key: str, value: float) -> None:
        """Append a single sample to the baseline for *metric_key*."""
        if metric_key not in self._baselines:
            self._baselines[metric_key] = []
        self._baselines[metric_key].append(value)

    def get_baseline(self, metric_key: str) -> List[float]:
        return list(self._baselines.get(metric_key, []))

    # -- regression detection ----------------------------------------------

    @staticmethod
    def _mean(values: Sequence[float]) -> float:
        return sum(values) / len(values) if values else 0.0

    @staticmethod
    def _std(values: Sequence[float]) -> float:
        if len(values) < 2:
            return 0.0
        m = sum(values) / len(values)
        variance = sum((x - m) ** 2 for x in values) / (len(values) - 1)
        return math.sqrt(variance)

    @staticmethod
    def _welch_t(baseline: Sequence[float], current: Sequence[float]) -> Tuple[float, float]:
        """Compute Welch's t-statistic and approximate degrees of freedom."""
        n1, n2 = len(baseline), len(current)
        if n1 < 2 or n2 < 2:
            return 0.0, 0.0
        m1 = sum(baseline) / n1
        m2 = sum(current) / n2
        v1 = sum((x - m1) ** 2 for x in baseline) / (n1 - 1)
        v2 = sum((x - m2) ** 2 for x in current) / (n2 - 1)
        se = math.sqrt(v1 / n1 + v2 / n2)
        if se == 0:
            return 0.0, 0.0
        t = (m1 - m2) / se
        # Welch–Satterthwaite degrees of freedom
        num = (v1 / n1 + v2 / n2) ** 2
        den = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1)
        df = num / den if den > 0 else 0.0
        return t, df

    @staticmethod
    def _approx_p_value(t: float, df: float) -> float:
        """Approximate two-tailed p-value using a normal approximation for
        large df, or a simple lookup for small df."""
        if df < 1:
            return 1.0
        abs_t = abs(t)
        # For large df, use normal approximation
        if df > 30:
            # Abramowitz & Stegun approximation for standard normal CDF
            z = abs_t
            b0 = 0.2316419
            b1 = 0.319381530
            b2 = -0.356563782
            b3 = 1.781477937
            b4 = -1.821255978
            b5 = 1.330274429
            t_val = 1.0 / (1.0 + b0 * z)
            cdf = 1.0 - (1.0 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * z * z) * (
                b1 * t_val + b2 * t_val**2 + b3 * t_val**3 + b4 * t_val**4 + b5 * t_val**5
            )
            return 2.0 * (1.0 - cdf)
        # Simple approximation for small df
        # Use t-distribution approximation: p ≈ 2 * (1 - CDF_t(|t|, df))
        # Simplified: use a rough table-based approach
        x = df / (df + t * t)
        # Incomplete beta function approximation (very rough)
        p = x ** (df / 2.0)
        return min(1.0, max(0.0, p * 2.0))

    def detect_regression(
        self,
        metric_key: str,
        current_samples: Sequence[float],
        higher_is_better: bool = True,
        significance: float = 0.05,
        min_change_percent: float = 5.0,
    ) -> Optional[RegressionResult]:
        """Detect if *current_samples* represent a regression vs baseline.

        Uses Welch's t-test for statistical significance and a minimum
        percentage change threshold.

        Returns a :class:`RegressionResult` if there is a regression, else None.
        """
        baseline = self._baselines.get(metric_key)
        if baseline is None or len(baseline) < 2 or len(current_samples) < 2:
            return None

        baseline_mean = self._mean(baseline)
        current_mean = self._mean(current_samples)

        if baseline_mean == 0:
            change_pct = 0.0
        else:
            change_pct = ((current_mean - baseline_mean) / abs(baseline_mean)) * 100.0

        t_stat, df = self._welch_t(baseline, current_samples)
        p_value = self._approx_p_value(t_stat, df)
        confidence = 1.0 - p_value

        # Determine if this is a regression
        is_regression = False
        if abs(change_pct) >= min_change_percent and p_value < significance:
            if higher_is_better:
                is_regression = current_mean < baseline_mean
            else:
                is_regression = current_mean > baseline_mean

        if not is_regression:
            return None

        # Determine severity
        if abs(change_pct) >= 20.0:
            level = AlertLevel.CRITICAL
        elif abs(change_pct) >= 10.0:
            level = AlertLevel.WARNING
        else:
            level = AlertLevel.INFO

        return RegressionResult(
            metric_key=metric_key,
            baseline_mean=baseline_mean,
            current_mean=current_mean,
            change_percent=change_pct,
            is_regression=True,
            confidence=round(confidence, 4),
            level=level,
        )

    def detect_regressions(
        self,
        current: Dict[str, Sequence[float]],
        higher_is_better: Optional[Dict[str, bool]] = None,
        significance: float = 0.05,
        min_change_percent: float = 5.0,
    ) -> List[RegressionResult]:
        """Run regression detection for multiple metrics at once."""
        hib = higher_is_better or {}
        results: List[RegressionResult] = []
        for key, samples in current.items():
            result = self.detect_regression(
                key, samples,
                higher_is_better=hib.get(key, True),
                significance=significance,
                min_change_percent=min_change_percent,
            )
            if result is not None:
                results.append(result)
        return results

    # -- alert history -----------------------------------------------------

    @property
    def alerts(self) -> List[Alert]:
        return list(self._alerts)

    def clear_alerts(self) -> None:
        self._alerts.clear()
        self._last_trigger.clear()

    def acknowledge_alert(self, rule_name: str) -> None:
        """Mark an alert as acknowledged (won't re-trigger for same event)."""
        self._suppressed[rule_name] = True

    def reset(self) -> None:
        """Reset all state: rules, baselines, alerts."""
        self._rules.clear()
        self._alerts.clear()
        self._baselines.clear()
        self._last_trigger.clear()
        self._suppressed.clear()
