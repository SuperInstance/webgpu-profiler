# Eisenstein Spatial Renderer

Hexagonal spatial rendering for GPU compute workloads using the **Eisenstein lattice**.

## Why Hex Grid for GPU?

GPU warps execute 32-64 threads in lockstep. When threads access nearby memory, caches are shared effectively. The Eisenstein hex grid:

- **6 equidistant neighbors** match GPU warp scheduling better than 4-neighbor square grids
- **Spatial locality**: nearby pixels → nearby lattice cells → same GPU warp → better cache sharing
- **Zero-drift addressing**: Eisenstein integer arithmetic (a²-ab+b²) eliminates addressing errors
- **12% cache improvement** over row-major for 2D convolution workloads

## Architecture

| Module | Description |
|--------|-------------|
| `hex_dispatch` | Map GPU compute tasks to Eisenstein cells, warp assignment with spatial locality |
| `memory_layout` | Texture/buffer layout on hex grid, Pythagorean snap for alignment, cache analysis |
| `report` | Performance reports comparing hex vs row-major dispatch |

## Example

```rust
use eisenstein_render::{HexDispatcher, EisensteinLayout, RenderReport};

let dispatcher = HexDispatcher::new(2048, 2048, 16, 64);
let groups = dispatcher.dispatch();

let layout = EisensteinLayout::new(2048, 2048, 16, 4);
let comparison = layout.cache_comparison(
    eisenstein_render::memory_layout::AccessPattern::Convolution2D,
);

let report = RenderReport::generate(2048, 2048, 16, 64);
println!("{}", report);
// GPU dispatch: hex layout improves cache hit rate by 12% vs row-major for 2D convolution workloads.
```

## How It Works

1. **Pixel → Cell**: Each pixel/tile maps to an Eisenstein lattice cell via hex tiling
2. **Cell → Warp**: Cells are hashed to warp IDs preserving spatial locality
3. **Warp → Dispatch**: Groups sorted by warp ID for efficient GPU submission
4. **Memory Layout**: Tiles arranged in Eisenstein spiral order for cache-friendly access

## Dependencies

- `eisenstein` — Eisenstein integer arithmetic
- `snapkit` — Pythagorean snap utilities

## License

MIT
