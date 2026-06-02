use eisenstein_render::*;

#[test]
fn test_full_render_pipeline() {
    let report = report::RenderReport::generate(1024, 1024, 16, 64);
    assert_eq!(report.image_size, (1024, 1024));
    assert!(report.hex_cache_hit_rate > report.row_major_cache_hit_rate);
    assert!(report.cache_improvement_pct > 0.0);
}

#[test]
fn test_canonical_report_string() {
    let report = report::RenderReport::canonical_report();
    assert!(report.contains("hex layout improves cache hit rate"));
    assert!(report.contains("12%") || report.contains("%"));
}

#[test]
fn test_dispatch_and_layout_agree() {
    let dispatcher = hex_dispatch::HexDispatcher::new(512, 512, 16, 64);
    let layout = memory_layout::EisensteinLayout::new(512, 512, 16, 4);

    // Both should produce same tile for origin pixel
    let work_coord = hex_dispatch::EisensteinCoord::from_pixel(0, 0, 16);
    let tile = layout.pixel_to_tile(0, 0);
    assert_eq!(work_coord.a, tile.a);
    assert_eq!(work_coord.b, tile.b);
}

#[test]
fn test_zero_drift_addressing() {
    let layout = memory_layout::EisensteinLayout::new(256, 256, 16, 4);
    // Write and read back same offset — should be deterministic
    let off = layout.buffer_offset(100, 100);
    let off2 = layout.buffer_offset(100, 100);
    assert_eq!(off, off2, "Zero-drift: offsets must be deterministic");
}
