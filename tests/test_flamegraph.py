"""Tests for webgpu_profiler.flamegraph module."""

from __future__ import annotations

import pytest

from webgpu_profiler.flamegraph import (
    FlameNode,
    FlamegraphConfig,
    FlamegraphRenderer,
)


# ---------------------------------------------------------------------------
# FlameNode
# ---------------------------------------------------------------------------

class TestFlameNode:
    def test_frozen(self) -> None:
        node = FlameNode(name="root", value=10.0)
        with pytest.raises(AttributeError):
            node.name = "x"  # type: ignore[misc]

    def test_defaults(self) -> None:
        node = FlameNode(name="a", value=5.0)
        assert node.children == ()
        assert node.depth == 0

    def test_with_children(self) -> None:
        child = FlameNode(name="c", value=2.0)
        parent = FlameNode(name="p", value=5.0, children=(child,))
        assert len(parent.children) == 1
        assert parent.children[0].name == "c"


# ---------------------------------------------------------------------------
# FlamegraphConfig
# ---------------------------------------------------------------------------

class TestFlamegraphConfig:
    def test_defaults(self) -> None:
        cfg = FlamegraphConfig()
        assert cfg.width == 80
        assert cfg.show_values is True
        assert cfg.value_unit == "ms"

    def test_custom(self) -> None:
        cfg = FlamegraphConfig(width=120, show_values=False, value_unit="µs")
        assert cfg.width == 120
        assert cfg.show_values is False


# ---------------------------------------------------------------------------
# Construction helpers
# ---------------------------------------------------------------------------

class TestFromShaderMetrics:
    def test_basic(self) -> None:
        data = [
            {"name": "vert_main", "time": 3.0},
            {"name": "frag_main", "time": 5.0},
        ]
        root = FlamegraphRenderer.from_shader_metrics(data)
        assert root.name == "gpu_frame"
        assert root.value == 8.0
        assert len(root.children) == 2

    def test_custom_total(self) -> None:
        data = [{"name": "a", "time": 1.0}]
        root = FlamegraphRenderer.from_shader_metrics(data, total_time=10.0)
        assert root.value == 10.0

    def test_empty(self) -> None:
        root = FlamegraphRenderer.from_shader_metrics([])
        assert root.value == 0.0
        assert root.children == ()


class TestFromFrameBreakdown:
    def test_basic(self) -> None:
        root = FlamegraphRenderer.from_frame_breakdown(
            frame_time=16.67,
            sections={"gpu": 10.0, "cpu": 5.0, "idle": 1.67},
        )
        assert root.name == "frame"
        assert root.value == 16.67
        assert len(root.children) == 3

    def test_empty_sections(self) -> None:
        root = FlamegraphRenderer.from_frame_breakdown(16.0, {})
        assert root.children == ()


class TestFromNestedDict:
    def test_deep_nesting(self) -> None:
        data = {
            "name": "root",
            "value": 100.0,
            "children": [
                {"name": "a", "value": 60.0, "children": [
                    {"name": "a1", "value": 30.0},
                    {"name": "a2", "value": 30.0},
                ]},
                {"name": "b", "value": 40.0},
            ],
        }
        root = FlamegraphRenderer.from_nested_dict(data)
        assert root.name == "root"
        assert len(root.children) == 2
        assert len(root.children[0].children) == 2

    def test_missing_value_sums_children(self) -> None:
        data = {
            "name": "root",
            "children": [
                {"name": "x", "value": 10.0},
                {"name": "y", "value": 20.0},
            ],
        }
        root = FlamegraphRenderer.from_nested_dict(data)
        assert root.value == 30.0

    def test_leaf_no_value(self) -> None:
        data = {"name": "leaf"}
        root = FlamegraphRenderer.from_nested_dict(data)
        assert root.value == 0.0


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

class TestRender:
    def test_single_node(self) -> None:
        node = FlameNode(name="root", value=10.0)
        r = FlamegraphRenderer()
        output = r.render(node)
        assert "root" in output
        assert "10.00" in output

    def test_tree_structure(self) -> None:
        tree = FlameNode(name="main", value=12.0, children=(
            FlameNode(name="render", value=8.0, children=(
                FlameNode(name="draw", value=5.0),
                FlameNode(name="sort", value=3.0),
            )),
            FlameNode(name="ui", value=4.0),
        ))
        r = FlamegraphRenderer()
        output = r.render(tree)
        lines = output.strip().split("\n")
        assert len(lines) == 5
        assert "main" in lines[0]
        assert "render" in lines[1]
        assert "draw" in lines[2]
        assert "sort" in lines[3]
        assert "ui" in lines[4]

    def test_hide_values(self) -> None:
        cfg = FlamegraphConfig(show_values=False)
        r = FlamegraphRenderer(cfg)
        output = r.render(FlameNode(name="test", value=42.0))
        assert "42" not in output

    def test_custom_unit(self) -> None:
        cfg = FlamegraphConfig(value_unit="µs")
        r = FlamegraphRenderer(cfg)
        output = r.render(FlameNode(name="test", value=100.0))
        assert "µs" in output


class TestRenderBar:
    def test_basic_bar(self) -> None:
        tree = FlameNode(name="root", value=100.0, children=(
            FlameNode(name="child_a", value=70.0),
            FlameNode(name="child_b", value=30.0),
        ))
        r = FlamegraphRenderer()
        output = r.render_bar(tree)
        lines = output.strip().split("\n")
        assert len(lines) == 3
        assert "root" in lines[0]
        # child_a should have a longer bar than child_b
        bar_a = lines[1].count("█")
        bar_b = lines[2].count("█")
        assert bar_a > bar_b

    def test_zero_root_value(self) -> None:
        tree = FlameNode(name="root", value=0.0, children=(
            FlameNode(name="child", value=0.0),
        ))
        r = FlamegraphRenderer()
        output = r.render_bar(tree)
        assert "root" in output


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

class TestTotalTime:
    def test_returns_root_value(self) -> None:
        root = FlameNode(name="r", value=42.5)
        assert FlamegraphRenderer.total_time(root) == 42.5


class TestSelfTime:
    def test_no_children(self) -> None:
        node = FlameNode(name="a", value=10.0)
        assert FlamegraphRenderer.self_time(node) == 10.0

    def test_with_children(self) -> None:
        node = FlameNode(name="a", value=10.0, children=(
            FlameNode(name="b", value=6.0),
            FlameNode(name="c", value=3.0),
        ))
        assert FlamegraphRenderer.self_time(node) == 1.0

    def test_children_exceed_value(self) -> None:
        node = FlameNode(name="a", value=5.0, children=(
            FlameNode(name="b", value=4.0),
            FlameNode(name="c", value=3.0),
        ))
        assert FlamegraphRenderer.self_time(node) == 0.0


class TestFlatten:
    def test_breadth_first(self) -> None:
        tree = FlameNode(name="root", value=10.0, children=(
            FlameNode(name="a", value=6.0, children=(
                FlameNode(name="a1", value=3.0),
            )),
            FlameNode(name="b", value=4.0),
        ))
        flat = FlamegraphRenderer.flatten(tree)
        names = [n.name for n in flat]
        assert names == ["root", "a", "b", "a1"]

    def test_single_node(self) -> None:
        node = FlameNode(name="solo", value=1.0)
        flat = FlamegraphRenderer.flatten(node)
        assert len(flat) == 1


class TestHottestPath:
    def test_basic(self) -> None:
        tree = FlameNode(name="root", value=100.0, children=(
            FlameNode(name="a", value=60.0, children=(
                FlameNode(name="a1", value=30.0),
                FlameNode(name="a2", value=40.0),
            )),
            FlameNode(name="b", value=30.0),
        ))
        path = FlamegraphRenderer.hottest_path(tree)
        assert path == ["root", "a", "a2"]

    def test_no_children(self) -> None:
        node = FlameNode(name="leaf", value=5.0)
        assert FlamegraphRenderer.hottest_path(node) == ["leaf"]
