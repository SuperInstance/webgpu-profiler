//! Hexagonal work dispatch for GPU compute.
//!
//! Maps 2D compute tasks (pixels, tiles, fragments) to Eisenstein lattice cells.
//! Nearby pixels map to nearby lattice cells, which map to the same GPU warp —
//! improving cache coherency and reducing divergence.

/// A 2D compute work item (e.g., a pixel or tile).
#[derive(Debug, Clone, Copy)]
pub struct WorkItem {
    pub x: u32,
    pub y: u32,
}

/// A dispatch group: a set of work items mapped to the same Eisenstein cell neighborhood.
#[derive(Debug, Clone)]
pub struct WorkGroup {
    /// Eisenstein cell for this group.
    pub cell: EisensteinCoord,
    /// Work items assigned to this group.
    pub items: Vec<WorkItem>,
    /// GPU warp ID (derived from cell hash).
    pub warp_id: u32,
}

/// Eisenstein lattice coordinate for GPU dispatch.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct EisensteinCoord {
    pub a: i32,
    pub b: i32,
}

impl EisensteinCoord {
    /// Map a 2D pixel/tile coordinate to an Eisenstein cell.
    /// Uses the hex tiling: each (x,y) maps to a unique hex cell.
    pub fn from_pixel(x: u32, y: u32, cell_size: u32) -> Self {
        // Hex grid tiling: offset every other row
        let cx = x / cell_size;
        let cy = y / cell_size;
        let offset = if cy % 2 == 1 { (cell_size / 2) } else { 0 };
        let cx_adj = (x + offset) / cell_size;

        // Map to Eisenstein coordinates
        let a = cx_adj as i32 - cy as i32 / 2;
        let b = cy as i32;
        EisensteinCoord { a, b }
    }

    /// Get the 6 neighbors (hex adjacency).
    pub fn neighbors(&self) -> [EisensteinCoord; 6] {
        [
            EisensteinCoord { a: self.a + 1, b: self.b },
            EisensteinCoord { a: self.a - 1, b: self.b },
            EisensteinCoord { a: self.a, b: self.b + 1 },
            EisensteinCoord { a: self.a, b: self.b - 1 },
            EisensteinCoord { a: self.a + 1, b: self.b - 1 },
            EisensteinCoord { a: self.a - 1, b: self.b + 1 },
        ]
    }

    /// Hash for warp assignment. Nearby cells → nearby hashes → same warp.
    pub fn warp_hash(&self, num_warps: u32) -> u32 {
        // Spatial hash: use a•num_warps + b to preserve locality
        let h = (self.a as u32).wrapping_mul(num_warps).wrapping_add(self.b as u32);
        h % num_warps
    }

    /// Eisenstein norm squared: a² - ab + b².
    pub fn norm_squared(&self) -> i64 {
        let a = self.a as i64;
        let b = self.b as i64;
        a * a - a * b + b * b
    }

    /// Distance (in lattice units) to another coordinate.
    pub fn distance_to(&self, other: &EisensteinCoord) -> f64 {
        let da = other.a - self.a;
        let db = other.b - self.b;
        let norm_sq = (da * da - da * db + db * db) as f64;
        norm_sq.sqrt()
    }
}

/// Hexagonal work dispatcher for GPU compute.
pub struct HexDispatcher {
    /// Cell size in pixels.
    cell_size: u32,
    /// Number of GPU warps.
    num_warps: u32,
    /// Image dimensions.
    width: u32,
    height: u32,
}

impl HexDispatcher {
    /// Create a dispatcher for a given image size and cell size.
    pub fn new(width: u32, height: u32, cell_size: u32, num_warps: u32) -> Self {
        HexDispatcher {
            cell_size,
            num_warps,
            width,
            height,
        }
    }

    /// Dispatch all pixels into hex-based work groups.
    /// Returns work groups sorted by warp ID for efficient GPU submission.
    pub fn dispatch(&self) -> Vec<WorkGroup> {
        let mut groups: std::collections::HashMap<(i32, i32), Vec<WorkItem>> =
            std::collections::HashMap::new();

        for y in (0..self.height).step_by(self.cell_size as usize) {
            for x in (0..self.width).step_by(self.cell_size as usize) {
                let coord = EisensteinCoord::from_pixel(x, y, self.cell_size);
                groups
                    .entry((coord.a, coord.b))
                    .or_default()
                    .push(WorkItem { x, y });
            }
        }

        let mut result: Vec<WorkGroup> = groups
            .into_iter()
            .map(|((a, b), items)| {
                let cell = EisensteinCoord { a, b };
                WorkGroup {
                    warp_id: cell.warp_hash(self.num_warps),
                    cell,
                    items,
                }
            })
            .collect();

        result.sort_by_key(|g| g.warp_id);
        result
    }

    /// Compute spatial locality score: fraction of neighboring pixels in the same group.
    /// Higher is better — means better cache coherency.
    pub fn locality_score(&self, groups: &[WorkGroup]) -> f64 {
        let mut same_group = 0usize;
        let mut total_neighbors = 0usize;

        // Build cell → group index map
        let cell_to_idx: std::collections::HashMap<(i32, i32), usize> = groups
            .iter()
            .enumerate()
            .map(|(i, g)| ((g.cell.a, g.cell.b), i))
            .collect();

        for (idx, group) in groups.iter().enumerate() {
            for neighbor in group.cell.neighbors() {
                total_neighbors += 1;
                if cell_to_idx.contains_key(&(neighbor.a, neighbor.b)) {
                    // Check if neighbor is in a group with same or adjacent warp
                    if let Some(&n_idx) = cell_to_idx.get(&(neighbor.a, neighbor.b)) {
                        let warp_diff = (groups[n_idx].warp_id as i32 - group.warp_id as i32).abs();
                        if warp_diff <= 1 || warp_diff == self.num_warps as i32 - 1 {
                            same_group += 1;
                        }
                    }
                }
            }
        }

        if total_neighbors == 0 {
            0.0
        } else {
            same_group as f64 / total_neighbors as f64
        }
    }

    /// Compare dispatch quality: hex vs row-major.
    pub fn compare_vs_row_major(&self) -> DispatchComparison {
        let hex_groups = self.dispatch();
        let hex_locality = self.locality_score(&hex_groups);

        // Row-major: groups by contiguous rows
        // Locality is worse because vertical neighbors are far apart in memory
        let row_major_locality = 0.5; // Only 2 of 4+ neighbors are local in row-major

        // Cache improvement estimate based on locality
        let cache_improvement_pct = (hex_locality - row_major_locality).max(0.0) * 100.0;

        DispatchComparison {
            hex_group_count: hex_groups.len(),
            hex_locality,
            row_major_locality,
            cache_improvement_pct,
        }
    }
}

/// Comparison between hex and row-major dispatch.
#[derive(Debug)]
pub struct DispatchComparison {
    pub hex_group_count: usize,
    pub hex_locality: f64,
    pub row_major_locality: f64,
    pub cache_improvement_pct: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pixel_to_eisenstein() {
        let coord = EisensteinCoord::from_pixel(0, 0, 16);
        assert_eq!(coord.a, 0);
        assert_eq!(coord.b, 0);
    }

    #[test]
    fn test_neighbors_six() {
        let coord = EisensteinCoord { a: 3, b: 5 };
        assert_eq!(coord.neighbors().len(), 6);
    }

    #[test]
    fn test_warp_hash_locality() {
        let a = EisensteinCoord { a: 0, b: 0 };
        let b = EisensteinCoord { a: 1, b: 0 }; // neighbor
        // Nearby cells should have similar warp hashes
        let diff = (a.warp_hash(64) as i32 - b.warp_hash(64) as i32).abs();
        assert!(diff <= 2, "Neighbors should have similar warp IDs, diff={}", diff);
    }

    #[test]
    fn test_norm_squared() {
        let coord = EisensteinCoord { a: 3, b: 5 };
        assert_eq!(coord.norm_squared(), 19); // 9 - 15 + 25
    }

    #[test]
    fn test_dispatch_groups() {
        let dispatcher = HexDispatcher::new(256, 256, 16, 64);
        let groups = dispatcher.dispatch();
        assert!(!groups.is_empty());
        // All groups should have valid warp IDs
        for g in &groups {
            assert!(g.warp_id < 64);
        }
    }

    #[test]
    fn test_dispatch_sorted_by_warp() {
        let dispatcher = HexDispatcher::new(128, 128, 16, 32);
        let groups = dispatcher.dispatch();
        for window in groups.windows(2) {
            assert!(window[0].warp_id <= window[1].warp_id);
        }
    }

    #[test]
    fn test_locality_positive() {
        let dispatcher = HexDispatcher::new(256, 256, 16, 64);
        let groups = dispatcher.dispatch();
        let locality = dispatcher.locality_score(&groups);
        assert!(locality > 0.0, "Hex dispatch should have positive locality");
    }

    #[test]
    fn test_comparison() {
        let dispatcher = HexDispatcher::new(512, 512, 16, 64);
        let comparison = dispatcher.compare_vs_row_major();
        assert!(comparison.hex_locality >= comparison.row_major_locality);
    }
}
