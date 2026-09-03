# webgpu-profiler

A browser-side profiler for **WebGPU** applications — measure frame timing/FPS,
track GPU memory allocations (buffers + textures), record shader execution
times, and run a GPU capability benchmark suite. The TypeScript package is
published to npm as **[`browser-gpu-profiler`](https://www.npmjs.com/package/browser-gpu-profiler)**.

<p align="center">
  <img src="assets/images/hero.jpg" width="680" alt="A brass stopwatch glowing amber on a dark instrument desk — timing light itself, one frame at a time">
</p>

*iProfiler's law: you cannot tune a frame you cannot time. The stopwatch over the instruments.*

> ### ⚠️ Read this before you `npm install`
> This GitHub repo is **`SuperInstance/webgpu-profiler`**, but the package it
> publishes to npm is named **`browser-gpu-profiler`** (same author). Do **not**
> install `webgpu-profiler` from npm — that name belongs to a **different,
> unrelated project** ([`soaringred/webgpu-profiler`](https://github.com/soaringred/webgpu-profiler),
> a React HUD). Confusing, but they are not the same code.
>
> ```bash
> npm install browser-gpu-profiler   # ✅ this repo's package
> ```

---

## Status

| Area | State | Notes |
|------|-------|-------|
| TypeScript build (`tsup`) | ✅ | Clean, 0 errors. `dist/` generated. |
| TypeScript type-check (`tsc --noEmit`) | ✅ | Passes. |
| `npm install` | ✅ | Works with **no flags** (was broken — see [Changelog](#changelog)). |
| TypeScript tests | ✅ | **97 pass · 5 skipped** (102). Skips are real-GPU-only benchmarks. |
| Python tests (`pytest`) | ✅ | **119 pass · 0 fail.** |
| CI (`.github/workflows`) | ✅ | Real gates — every step fails on error (no more `|| true`). |
| npm publish | ✅ | `browser-gpu-profiler@1.0.0` published by `superinstance`. |
| PyPI publish | 🔮 | `webgpu_profiler/` has **no packaging config** (no `pyproject.toml`/`setup.py`) — not installable from PyPI yet. Run from source. |
| Browser demo (HTML) | 🔮 | **None exists.** The `examples/` are browser-only `.ts` files (see [Examples](#examples)). |
| Real-GPU benchmarks | 🔮 | The benchmark suite issues actual WebGPU compute passes; needs a WebGPU-capable browser, cannot run in CI/Node. |

Legend: ✅ works & verified · ⚠️ works with caveats · 🔮 not yet implemented/verifiable here.

---

## What this actually profiles (and what it can't)

WebGPU deliberately does **not** expose low-level hardware counters. This
profiled measures what WebGPU *does* expose, and **estimates** the rest.
Be honest with yourself about which is which:

| Metric | Real or estimated? | How |
|--------|--------------------|-----|
| GPU **vendor / architecture / features / limits** | ✅ Real | `adapter.requestAdapterInfo()`, `adapter.features`, `adapter.limits` |
| **FPS / frame time** | ✅ Real | `performance.now()` deltas between samples |
| **Memory allocations** (buffers/textures) | ✅ Real* | Tracked via explicit `trackBuffer()`/`trackTexture()` calls. *Reported sizes assume uncompressed footprint from descriptor dims; not OS-level VRAM. |
| **Shader execution time** | ✅ Real* | You supply the timing (`trackShader(id, entry, us)`); it is not auto-instrumented from GPU timestamps unless you wire up `GPUQuerySet` timestamp queries yourself. |
| **GPU utilization %** | ⚠️ Estimate | Derived from compute-time / frame-time ratio — not a hardware counter. |
| **Total GPU memory** | ⚠️ Estimate | Guessed from vendor/architecture strings (defaults to 4 GB). |
| **Power / temperature / clock** | 🔮 Placeholders | Fields exist on the types; WebGPU provides no values, so they stay `undefined`. |

**Bottom line:** use this to catch frame-time regressions, find memory leaks in
your own allocations, compare shader variants, and benchmark relative device
capability. Do **not** treat the utilization % or memory totals as ground truth.

---

## Repository layout — two stacks

This repo contains **two independent implementations** of the same idea:

```
src/                    TypeScript — the npm package "browser-gpu-profiler"
├─ profiler.ts          GPUProfiler: the main façade
├─ device-manager.ts    WebGPU adapter/device bootstrap + device-info parsing
├─ metrics.ts           FPS/frame-time, memory & shader tracking, stats
├─ benchmarks.ts        6-part GPU capability benchmark suite
├─ types.ts             Shared types
└─ webgpu-types.d.ts    Minimal WebGPU ambient declarations

webgpu_profiler/        Python — a richer analytics library (NOT a browser binding)
├─ profiler.py          Profiler session lifecycle + sampling
├─ metrics.py           Dataclasses + percentile/perf-stat math
├─ frame.py             Per-frame analysis: GPU/CPU ratio, spike (jank) detection
├─ report.py            Bottleneck detection + JSON summaries
├─ benchmark.py         Pluggable benchmark runner (CPU stubs for testing)
├─ flamegraph.py        ASCII flamegraph renderer
└─ alert.py             Threshold alerts + Welch's t-test regression detection

tests/                  TypeScript (test_*.ts, vitest) + Python (test_*.py, pytest)
examples/               12 TypeScript usage examples (browser-only)
docs/                   ARCHITECTURE / USER_GUIDE / DEVELOPER_GUIDE / QUICK_START
```

### Which one is "real"?

**Both are real, but they serve different purposes:**

- **TypeScript (`src/`)** is the *shipping browser library* — what you `npm
  install`. It talks to the live WebGPU API. This is the primary deliverable.
- **Python (`webgpu_profiler/`)** is a *pure-Python analytics toolkit*. It has
  **no WebGPU binding** — it cannot drive a real GPU. Its benchmarks are
  CPU-based timing stubs, and it ingests metrics you feed it (or that you
  export from the TS profiler). Its value is the analysis layer: frame
  spike/GPU-bound detection, bottleneck heuristics, ASCII flamegraphs, and
  statistically-grounded regression alerts (Welch's t-test). It is the more
  mature, better-tested codebase (119 passing tests).

> The previous README claimed this repo profiles a "`conservation-spectral-webgpu`
> pipeline". There is no such code in this repository — that line has been removed.

---

## Install

### TypeScript (browser library)

```bash
npm install browser-gpu-profiler
```

Requires a **WebGPU-capable browser** (Chrome/Edge 113+, or behind a flag
elsewhere) at runtime. Node ≥ 18 for development.

### Python (analytics toolkit)

Not on PyPI yet. Clone and use directly from source:

```bash
git clone https://github.com/SuperInstance/webgpu-profiler.git
cd webgpu-profiler
pip install pytest      # only needed to run the tests
python -c "from webgpu_profiler import Profiler; print('ok')"
```

---

## Quick start (TypeScript)

```ts
import { createGPUProfiler } from 'browser-gpu-profiler';

const profiler = createGPUProfiler({
  monitoringInterval: 1000,     // sample every 1s
  enableMemoryTracking: true,
  enableShaderProfiling: true,
  onMetricsUpdate: (m) => console.log(`FPS ${m.fps.toFixed(1)} | util ${m.utilization.toFixed(0)}%`),
});

await profiler.initialize();          // requests adapter + device
const info = profiler.getDeviceInfo();
console.log(info.vendor, info.architecture);

profiler.start();

// Track allocations you create (the profiler instruments nothing automatically):
const buf = profiler.getDevice().createBuffer({ size: 1 << 20, usage: 0x0080 | 0x0008 });
profiler.trackBuffer(buf, 'my-buffer');

// Record a shader's measured execution time (microseconds):
profiler.trackShader('compute-pass', 'main', 1500);

const stats = profiler.getPerformanceStats();   // avg/p50/p95/p99 FPS & frame time
const mem   = profiler.getMemoryMetrics();        // buffer/texture/total bytes
const json  = profiler.exportToString();          // serialize for later analysis

profiler.stop();
profiler.cleanup();
```

### Python analytics example

```python
from webgpu_profiler import Profiler, ProfilerConfig, BenchmarkRunner
from webgpu_profiler.alert import PerformanceAlert, ThresholdRule

p = Profiler()
p.start()
for _ in range(120):
    p.sample()                 # feed it real metrics in practice
p.stop()

print(p.performance_stats())   # avg fps, p50/p95/p99 frame time
print(p.report().summary())    # bottleneck detection + JSON summary
```

---

## API surface (TypeScript)

**Classes:** `GPUProfiler`, `GPUDeviceManager`, `GPUMetricsCollector`, `GPUBenchmarkRunner`
**Functions:** `createGPUProfiler`, `isWebGPUAvailable`, `getGPUFeatures`, `getGPULimits`, `getQuickDeviceInfo`, `exportBenchmarkResults`, `importBenchmarkResults`

Key `GPUProfiler` methods: `initialize() · start() · stop() · pause() · resume() ·
getDeviceInfo() · getCurrentMetrics() · getMetricsHistory() · getMemoryMetrics() ·
getShaderMetrics() · getPerformanceStats() · runBenchmarks() · runBenchmark(type) ·
trackBuffer() · trackTexture() · trackShader() · export() · import() · cleanup()`

Full typed signatures ship in `dist/*.d.ts`. See [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md).

### Benchmark suite

`runBenchmarks()` runs six real-GPU workloads and normalizes a weighted score:

| Benchmark | Unit | What it measures |
|-----------|------|------------------|
| Compute Performance | GFLOPS | Parallel arithmetic throughput |
| Memory Bandwidth | GB/s | Buffer-to-buffer copy speed |
| Texture Transfer | GB/s | Texture-to-texture copy speed |
| Shader Compilation | shaders/s | Shader module compile speed |
| Pipeline Creation | pipelines/s | Compute pipeline build speed |
| Command Latency | ms | Round-trip command latency |

⚠️ These allocate and submit real GPU work (e.g. 256 MB buffers). Run them in a
browser tab, not in your hot path, and call them on a device you control.

---

## Testing

```bash
# TypeScript
npm install
npm run build
npm test            # vitest — 97 passed | 5 skipped (102)

# Python
pytest              # 119 passed
```

The 5 TypeScript skips are the benchmark tests, which require an actual WebGPU
device to execute compute passes — they cannot run under the jsdom test mock or
in CI. They are marked `.skip` with an explanation in `tests/profiler.test.ts`,
not silently dropped.

**CI** (`.github/workflows/`):
- `ci-node.yml` — Node 18/20/22: install → type-check → build → test.
- `ci.yml` — Python 3.10/3.11/3.12: `pytest -v`.

Both fail on any error. (Previously every step was suffixed `|| true`, making
CI fake-green regardless of failures — fixed in this pass.)

---

## Examples

The `examples/` directory holds 12 TypeScript files (`basic-usage.ts`,
`benchmarking.ts`, `real-time-monitoring.ts`, `game-performance-dashboard.ts`,
`shader-optimizer.ts`, `ml-model-performance.ts`, etc.).

🔮 **None of these are wired into a runnable demo.** They `import` from
`'browser-gpu-profiler'` and use browser globals (`navigator`, `document`,
`GPUBufferUsage`), so they need to be bundled and served in a WebGPU-capable
browser. There is **no HTML entry point** in the repo. Treat them as
reference snippets, not a clickable demo.

---

## Known limitations & caveats

- ⚠️ **No auto-instrumentation.** The profiler does not monkey-patch WebGPU.
  You must explicitly `trackBuffer()` / `trackTexture()` / `trackShader()` for
  memory and shader metrics to populate.
- ⚠️ **Utilization % and total memory are estimates**, not hardware counters
  (see the table above).
- ⚠️ **Lint is not enforced in CI.** `eslint@10` (the declared version) cannot
  read the legacy `.eslintrc.js` and dropped the `--ext` flag; `npm run lint`
  is currently broken. `tsc --noEmit` (type-check) is the working static gate.
  Migrating to ESLint flat config is a known gap.
- 🔮 **No browser demo / playground.** A served HTML example would be the most
  useful next addition.
- 🔮 **Python package is not published.** Add `pyproject.toml` to ship it.

---

## Changelog

### Unreleased (this hardening pass)
- **fix(deps):** `npm install` failed with an `ERESOLVE` peer conflict
  (`@vitest/ui` & `@vitest/coverage-v8` pinned at `^4.1.7` vs `vitest ^1.6.1`).
  Aligned all `@vitest/*` to the vitest 1.x line; added the missing `jsdom`
  devDependency (`vitest.config.ts` sets `environment: 'jsdom'` but it was
  never declared, so `npm test` errored).
- **fix(tests+src):** TS suite went from **24 failing → 0** (97 pass · 5 honest
  skips). Fixed a mock `device.lost` that resolved instantly (nulled the device
  during `initialize()`), a `performance.now` mock that returned identical
  values (`frameTime=0`), a `calculateTextureSize` that produced `NaN`, and
  bottleneck detection that skipped the first invocation.
- **ci:** Removed all `|| true` failure-swallowing; CI is now a real gate.
- **chore:** Deleted two AI-generated "completion" reports whose claims
  (e.g. "all tests passing", "comprehensive README") were false.

### 1.0.0 — 2026-01-08
- Initial release of `browser-gpu-profiler`.

---

## License

MIT — see [`LICENSE`](LICENSE).
