BETA-TEST REPORT — webgpu-profiler (Python analytics toolkit)
Branch: production-round2-2026-07-09
Date:   2026-07-10
Tester: automated beta pass (goose)
Scope:  hands-on use of webgpu_profiler/ via the real public API, NOT a static read.

This is a usage report, not a hardening pass. I installed/ran the toolkit as a
real user would, fed it realistic synthetic data end-to-end, probed edge cases,
and read several TS examples.

TL;DR
-----
The Python *analytics* features (frame-spike detection, bottleneck heuristics,
ASCII flamegraph, Welch's-t-test regression alerts) genuinely work and produce
sensible output. I found one real, reproducible bug in the headline
Profiler.sample()/performance_stats() path (now fixed + pushed) and one honest
known limitation (no packaging). Verdict: yes, someone could use this today to
catch a frame-time regression or spot a jank spike — but only via the
FrameAnalysis/PerformanceAlert path; the Profiler.sample() path needs the
frame_time override I added (or a real render loop) to be trustworthy.


1. INSTALL / IMPORT
-------------------
* There is NO Python packaging — no pyproject.toml, setup.py, or setup.cfg.
  `pip install -e .` fails:
     ERROR: ... does not appear to be a Python project:
     neither 'setup.py' nor 'pyproject.toml' found.
  The README is HONEST about this ("Not on PyPI yet... use directly from
  source"), so this is a documented limitation, not a hidden defect. A real
  user still cannot `pip install` it; they must clone-and-PYTHONPATH.
* Import is otherwise clean: `python -c "from webgpu_profiler import Profiler"`
  works from the repo dir AND from outside via PYTHONPATH (i.e. as an installed
  package would behave). v1.1.0, 26 exported names, zero third-party deps
  (pure stdlib). This is a genuine plus — no numpy/scipy required, the Welch
  t-test is hand-rolled.
* pytest baseline before any changes: 119 passed in 0.29s (matches README).


2. END-TO-END THROUGH THE REAL PUBLIC API (the core of the test)
---------------------------------------------------------------
I built a realistic 120-frame session: ~60fps with gaussian jitter, two
injected jank spikes (frames 40 @52ms, 90 @61ms), a slow memory leak
(+150KB/frame), 4 GPU allocations, and 3 shaders of varying cost (cheap VS,
moderate FS, a hot compute shader). I ran every feature a user is told to use.

What worked exactly as expected:
* Frame-spike detection (FrameAnalysis.detect_spikes, 2σ): CORRECTLY flagged
  exactly the two injected jank frames (40 and 90), no false positives.
* Regression alert (Welch's t-test, PerformanceAlert.detect_regressions): I
  fed a "baseline ~60fps" vs "current ~46fps" (and 16.7ms -> 21.5ms) build.
  It flagged BOTH metrics CRITICAL: avg_fps 60.0 -> 46.1 (-23.1%, conf=1.000),
  frame_time 16.65 -> 21.51 (+29.2%, conf=1.000). It also correctly returned
  None for an *improvement* (higher-is-better fps going UP is not a
  regression) and for a sub-5% change. This is the toolkit's strongest
  feature — it would actually catch a real perf regression in CI.
* ASCII flamegraph (FlamegraphRenderer): both tree view (└─/├─ connectors with
  ms values) and bar view (█ bars proportional to value) rendered correctly;
  hottest_path() returned the right dominant section; self_time math correct.
* Bottleneck detection (ProfileReport.detect_bottlenecks): surfaced shader
  execution variance and the frame-spike count with sensible severities and
  suggestions. Memory %-of-4GB and GPU-bound heuristics fire at the right
  thresholds.
* BenchmarkRunner: the 4 builtin CPU-stub benchmarks run and produce numbers
  (these are framework/timing stubs, not real GPU work — fine for testing the
  plumbing, clearly labelled as stubs in source).
* Edge cases (see §3): all handled gracefully.

What surprised me:
* There are TWO parallel frame-time systems that can silently disagree (see
  the bug in §4): FrameAnalysis (explicit FrameMetrics) vs Profiler's
  Metrics-history (wall-clock derived). The former is solid; the latter lies
  unless you feed it a real loop or a frame_time override.
* The "high execution variance" bottleneck heuristic flags every shader as
  soon as there's any realistic run-to-run jitter (variance > 0.5*avg). With
  real-world noise this will be noisy/low-signal — not wrong, but it'll cry
  wolf a lot. Worth tuning in a future pass, but not a blocker.


3. EDGE / MALFORMED INPUT
-------------------------
I tried: empty FrameAnalysis, single frame, all-zero frame times, empty
ProfileReport, all-zero baseline for regression, sample() while idle, and a
zero-value flamegraph root. ALL behaved gracefully:
* empty dataset  -> empty summary {} / [] / 0.0 / None as appropriate; no crash.
* single frame   -> sensible percentiles (p50=p95=p99 = that frame); no spike
                    (needs >=3 frames — correct guard).
* all-zero frames-> fps 0.0, no spikes (std==0 short-circuit), no div-by-zero.
* sample() idle  -> RuntimeError "Profiler is not running" (documented & correct).
* zero flame root-> render_bar still draws a 1-char bar, no ZeroDivisionError.
The defensive `if len < 2` / `if std == 0` / `if frame_time > 0` guards are
real and do their job. This part is genuinely well-built.


4. BUG FOUND (exact repro) + FIX (committed & pushed)
-----------------------------------------------------
BUG: Profiler.sample() derives frame_time exclusively from the
perf_counter() wall-clock delta. The README's VERBATIM analytics example calls
sample() in a tight loop with no real frames between calls:

    p = Profiler(); p.start()
    for _ in range(120): p.sample()
    p.stop()
    print(p.performance_stats())   # => avg_fps=315,226.0  avg_frame_time=0.003ms

That is physically impossible (avg_compute_time > avg_frame_time; >300k FPS).
Root cause: tight loop => microsecond "frames". There was also NO way to
override frame_time, so the headline sample()/performance_stats() path could
NOT ingest pre-recorded or replay data — which is exactly the analytics use
case this toolkit exists for. (Note: FrameAnalysis.record_frame, which takes
explicit frame_time, always worked — that's the path I used for the good §2
results. The Profiler.metrics path was the broken one.)

FIX (commit 9400c91, pushed to this branch): sample() now accepts optional
`frame_time` and `fps` overrides. When omitted, behavior is byte-for-byte
unchanged (live-capture wall-clock path). When `frame_time` is given, it's
used directly and fps derived from it, enabling the replay/analytics path.
  Demo after fix: sample(frame_time=16.7, compute_time=12.0) x120
    => avg_fps=59.88, avg_frame_time=16.7ms, compute<=frame (consistent).
Added a focused regression test (test_sample_frame_time_override).
Suite: 119 -> 120 passed. Existing tests untouched/unchanged behavior.

This is a small, clearly-scoped fix: one method, backward-compatible, no API
break. I deliberately did NOT touch the misleading README example prose or the
parallel-systems design — that's a design discussion, out of scope for a
beta-test fix.


5. TS EXAMPLES (read 3-4 of 12)
-------------------------------
Honest split — they are a mix.
* examples/basic-usage.ts — REALISTIC & runnable-if-you-had-a-browser. Uses the
  real public API correctly (createGPUProfiler/initialize/getDeviceInfo/start/
  getCurrentMetrics/getDevice/createBuffer/trackBuffer/trackShader/export) with
  proper await, GPUBufferUsage, try/catch, and cleanup. This is the gold
  standard example.
* examples/game-profiler.ts — REALISTIC. A well-structured GameProfiler wrapper
  class (frame pacing, draw-call/triangle tracking, bottleneck heuristics) on
  the real API, with a simulated game loop. Runnable. Minor nit: gpuTime is a
  `frameTime * 0.8` "estimate", honestly commented.
* examples/ml-model-performance.ts — STRUCTURALLY VALID BUT ASPIRATIONAL. It
  will run in a browser without crashing and uses real WebGPU, BUT its headline
  "GPU vs CPU benchmark" is faked: simulateGPUWork/simulateCPUWork just
  `setTimeout` with predetermined constants (GPU baseTime 0.1/0.5/2ms vs CPU
  1/5/15ms), so the GPU "wins" ~10x by construction. It compiles a compute
  shader module but never dispatches it. The comparison tables look real but
  measure nothing. I'd call this a convincing demo, not a measurement tool.

Net: the examples are more than stubs (they compile against the real API and
follow correct patterns), but a prospective user should not trust the numeric
results from ml-model-performance.ts.


6. BOTTOM LINE — can someone use this to find a REAL perf problem today?
-----------------------------------------------------------------------
Yes, conditionally.
* For regression detection ("did this commit drop FPS?") via
  PerformanceAlert.detect_regressions + baseline samples: YES, today, and it's
  good (statistically grounded, sensible thresholds, graceful on edge input).
* For jank/spike hunting via FrameAnalysis + the ASCII flamegraph: YES, today.
* For bottleneck heuristics: YES as a first-pass triage (some heuristics are
  noisy, e.g. the variance one).
* For the Profiler.sample()/performance_stats() headline path: only after my
  fix (or only with a real render loop). Before the fix it produced garbage on
  the documented usage.

Recommended (out-of-scope, for maintainers): add pyproject.toml so it's
`pip install`-able; reconcile the two frame-time systems; tune the
shader-variance heuristic; and relabel ml-model-performance.ts results as
illustrative. None of these block using the analytics toolkit for its core job
today.
