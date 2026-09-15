//! Performance reports for Eisenstein spatial rendering.

use crate::hex_dispatch::HexDispatcher;
use crate::memory_layout::{AccessPattern, EisensteinLayout};

/// Render performance report comparing hex vs square/row-major layouts.
#[derive(Debug)]
pub struct RenderReport {
    pub image_size: (u32, u32),
    pub tile_size: u32,
    pub hex_cache_hit_rate: f64,
    pub row_major_cache_hit_rate: f64,
    pub cache_improvement_pct: f64,
    pub hex_locality: f64,
    pub row_major_locality: f64,
}

impl RenderReport {
    /// Generate a full report from dispatcher and layout.
    pub fn generate(width: u32, height: u32, tile_size: u32, num_warps: u32) -> Self {
        let dispatcher = HexDispatcher::new(width, height, tile_size, num_warps);
        let layout = EisensteinLayout::new(width, height, tile_size, 4);

        let dispatch_cmp = dispatcher.compare_vs_row_major();
        let cache_cmp = layout.cache_comparison(AccessPattern::Convolution2D);

        RenderReport {
            image_size: (width, height),
            tile_size,
            hex_cache_hit_rate: cache_cmp.hex_cache_hit_rate,
            row_major_cache_hit_rate: cache_cmp.row_major_cache_hit_rate,
            cache_improvement_pct: cache_cmp.improvement_pct,
            hex_locality: dispatch_cmp.hex_locality,
            row_major_locality: dispatch_cmp.row_major_locality,
        }
    }

    /// Canonical report string.
    pub fn to_report_string(&self) -> String {
        format!(
            "GPU dispatch: hex layout improves cache hit rate by {:.0}% vs row-major for 2D convolution workloads.",
            self.cache_improvement_pct,
        )
    }

    /// Generate the canonical example report.
    pub fn canonical_report() -> String {
        let report = Self::generate(2048, 2048, 16, 64);
        report.to_report_string()
    }
}

impl std::fmt::Display for RenderReport {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_report_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_canonical_report() {
        let report = RenderReport::canonical_report();
        assert!(report.contains("hex layout improves cache hit rate"));
        assert!(report.contains("row-major"));
        assert!(report.contains("2D convolution"));
    }

    #[test]
    fn test_generate_report() {
        let report = RenderReport::generate(512, 512, 16, 64);
        assert_eq!(report.image_size, (512, 512));
        assert!(report.hex_cache_hit_rate > 0.0);
        assert!(report.cache_improvement_pct > 0.0);
    }

    #[test]
    fn test_display() {
        let report = RenderReport::generate(1024, 1024, 16, 32);
        let s = report.to_string();
        assert!(s.contains("GPU dispatch"));
        assert!(s.contains('%'));
    }
}
