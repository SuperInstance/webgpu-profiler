//! # Eisenstein Spatial Renderer
//!
//! Hexagonal spatial rendering for GPU compute workloads using the Eisenstein lattice.
//!
//! Key insight: GPU warps/wavefronts execute 32-64 threads in lockstep.
//! Mapping 2D work to a hex grid (6 neighbors) better matches spatial locality
//! of pixel-based workloads than row-major square grids (4 neighbors + diagonals).
//!
//! ## Architecture
//!
//! - [`hex_dispatch`] — Hexagonal work dispatch: tasks → Eisenstein cells → GPU warps
//! - [`memory_layout`] — Eisenstein-aware memory layout for cache-friendly texture access
//! - [`report`] — Performance reports comparing hex vs square grid dispatch

pub mod hex_dispatch;
pub mod memory_layout;
pub mod report;

pub use hex_dispatch::{HexDispatcher, WorkItem, WorkGroup};
pub use memory_layout::{EisensteinLayout, TileCoord};
pub use report::RenderReport;
