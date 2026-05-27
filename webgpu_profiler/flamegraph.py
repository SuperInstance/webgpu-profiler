"""FlamegraphRenderer — ASCII flamegraph charts for GPU profiling data."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class FlameNode:
    """A single node in the flamegraph call tree."""

    name: str
    value: float  # typically time in ms or µs
    children: Tuple["FlameNode", ...] = ()
    depth: int = 0


@dataclass
class FlamegraphConfig:
    """Configuration for flamegraph rendering."""

    width: int = 80  # characters per line
    show_values: bool = True
    value_unit: str = "ms"
    max_depth: int = 50
    color: bool = False  # placeholder for future ANSI color support


class FlamegraphRenderer:
    """Render ASCII flamegraph charts from hierarchical profiling data.

    A flamegraph shows nested call stacks with width proportional to
    execution time.  Each row is a level in the call stack; wider bars
    mean more time spent.

    Example output::

        main                                                          | 12.50 ms
        ├─ render_scene                                               | 10.00 ms
        │  ├─ draw_opaque                                             |  5.00 ms
        │  ├─ draw_transparent                                        |  3.00 ms
        │  └─ post_process                                            |  2.00 ms
        └─ ui_overlay                                                 |  2.50 ms
    """

    def __init__(self, config: Optional[FlamegraphConfig] = None) -> None:
        self._config = config or FlamegraphConfig()

    # -- construction helpers ---------------------------------------------

    @staticmethod
    def from_shader_metrics(
        shader_data: List[Dict[str, float]],
        total_time: Optional[float] = None,
    ) -> FlameNode:
        """Build a flame tree from a flat list of shader timing dicts.

        Each dict should have keys ``name`` (str) and ``time`` (float).
        Optional keys: ``parent`` (str) for nesting.

        If *total_time* is given, a synthetic root node ``"total"`` is
        created; otherwise the shaders are placed under ``"gpu_frame"``.
        """
        total = total_time if total_time is not None else sum(
            d.get("time", 0.0) for d in shader_data
        )
        children: List[FlameNode] = []
        for d in shader_data:
            children.append(FlameNode(name=str(d.get("name", "unknown")), value=d.get("time", 0.0)))
        return FlameNode(name="gpu_frame", value=total, children=tuple(children))

    @staticmethod
    def from_frame_breakdown(
        frame_time: float,
        sections: Dict[str, float],
    ) -> FlameNode:
        """Build a flame tree from a dict of ``{section_name: time_ms}``."""
        children = tuple(
            FlameNode(name=name, value=time)
            for name, time in sections.items()
        )
        return FlameNode(name="frame", value=frame_time, children=children)

    @staticmethod
    def from_nested_dict(data: Dict[str, object], parent_value: Optional[float] = None) -> FlameNode:
        """Build a flame tree from a nested dict structure.

        Format::

            {
                "name": "root",
                "value": 100.0,
                "children": [
                    {"name": "child1", "value": 60.0},
                    {"name": "child2", "value": 40.0, "children": [...]},
                ]
            }

        If ``value`` is missing it defaults to the sum of children's values
        (or 0 for leaf nodes).
        """
        name = str(data.get("name", "root"))
        children_raw: List[Dict[str, object]] = data.get("children", [])  # type: ignore[assignment]
        children = tuple(
            FlamegraphRenderer.from_nested_dict(c) for c in children_raw
        )
        value = data.get("value")
        if value is None:
            value = sum(c.value for c in children) if children else 0.0
        return FlameNode(name=name, value=float(value), children=children)

    # -- rendering --------------------------------------------------------

    def render(self, root: FlameNode) -> str:
        """Render an ASCII flamegraph from *root*."""
        lines: List[str] = []
        self._render_node(root, "", True, lines)
        return "\n".join(lines)

    def render_bar(self, root: FlameNode) -> str:
        """Render a horizontal bar-chart style flamegraph.

        Each level shows a bar proportional to its value relative to the root.
        """
        lines: List[str] = []
        self._render_bar_node(root, root.value, lines)
        return "\n".join(lines)

    def _render_node(
        self,
        node: FlameNode,
        prefix: str,
        is_last: bool,
        lines: List[str],
    ) -> None:
        connector = "└─ " if is_last else "├─ "
        val_str = ""
        if self._config.show_values:
            val_str = f" | {node.value:6.2f} {self._config.value_unit}"
        lines.append(f"{prefix}{connector}{node.name}{val_str}")

        child_prefix = prefix + ("   " if is_last else "│  ")
        children = list(node.children)
        for i, child in enumerate(children):
            last = i == len(children) - 1
            self._render_node(child, child_prefix, last, lines)

    def _render_bar_node(
        self,
        node: FlameNode,
        root_value: float,
        lines: List[str],
        depth: int = 0,
    ) -> None:
        width = self._config.width
        if root_value <= 0:
            frac = 0.0
        else:
            frac = node.value / root_value
        bar_len = max(1, int(frac * (width - 30)))
        bar = "█" * bar_len
        indent = "  " * depth
        val_str = f"{node.value:.2f}" if self._config.show_values else ""
        lines.append(f"{indent}{node.name:<20s} {bar} {val_str}")
        for child in node.children:
            self._render_bar_node(child, root_value, lines, depth + 1)

    # -- statistics -------------------------------------------------------

    @staticmethod
    def total_time(node: FlameNode) -> float:
        """Return the value of the root (total profiled time)."""
        return node.value

    @staticmethod
    def self_time(node: FlameNode) -> float:
        """Time spent in *node* itself (excluding children)."""
        children_total = sum(c.value for c in node.children)
        return max(0.0, node.value - children_total)

    @staticmethod
    def flatten(node: FlameNode) -> List[FlameNode]:
        """Flatten the tree into a breadth-first list of nodes."""
        result: List[FlameNode] = []
        queue: List[FlameNode] = [node]
        while queue:
            current = queue.pop(0)
            result.append(current)
            queue.extend(current.children)
        return result

    @staticmethod
    def hottest_path(node: FlameNode) -> List[str]:
        """Return the path of names from root to the deepest hottest child."""
        path = [node.name]
        current = node
        while current.children:
            hottest = max(current.children, key=lambda c: c.value)
            path.append(hottest.name)
            current = hottest
        return path
