# webgpu-profiler

**GPU profiling for WebGPU** — measure compute pass timing, memory usage, and pipeline performance in the browser.

## What This Gives You

- **Compute pass timing** — precise GPU timestamps for WebGPU compute passes
- **Memory tracking** — buffer allocation and usage monitoring
- **Pipeline analysis** — compare shader performance across configurations
- **Browser-native** — runs entirely in WebGPU, no native dependencies

## Quick Start

```bash
# Serve the profiler
python -m http.server 8000
# Open in a WebGPU-capable browser
```

## How It Fits

Performance tooling for the SuperInstance `conservation-spectral-webgpu` pipeline. Profiles the GPU-accelerated spectral computations that run in the browser.

## License

MIT
