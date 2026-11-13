"""Run with the same Python environment used for data:prepare."""

import importlib.util
from pathlib import Path
import unittest

import numpy as np

spec = importlib.util.spec_from_file_location("prepare_data", Path(__file__).resolve().parents[1] / "scripts/prepare_data.py")
data = importlib.util.module_from_spec(spec)
spec.loader.exec_module(data)


class LayoutTests(unittest.TestCase):
    def test_shared_instruments_bridge_genres_and_changing_them_changes_affinity(self):
        features = data.profile_features([
            ("Electronic", ("House",), ("Piano",)),
            ("Pop", ("Indie Pop",), ("Piano",)),
            ("Pop", ("Indie Pop",), ("Guitar",)),
        ])
        self.assertAlmostEqual(float(features[0] @ features[1]), .55)
        self.assertAlmostEqual(float(features[0] @ features[2]), 0)
        self.assertAlmostEqual(float(features[1] @ features[2]), .45)

    def test_more_tags_do_not_increase_a_feature_blocks_total_weight(self):
        features = data.profile_features([
            ("Pop", ("A",), ("Piano",)),
            ("Rock", ("B", "C"), ("Bass", "Drums", "Guitar")),
        ])
        for row in features:
            np.testing.assert_allclose([sum(row[:2] ** 2), sum(row[2:5] ** 2), sum(row[5:] ** 2)], data.FEATURE_WEIGHTS)

    def test_spherical_layout_is_repeatable_and_fills_the_volume(self):
        source = np.random.default_rng(42).normal(size=(1000, 3)) * [1, 4, 8]
        original = source.copy()
        points = data.spherical_layout(source)
        np.testing.assert_array_equal(source, original)
        np.testing.assert_array_equal(points, data.spherical_layout(source))
        radii = np.linalg.norm(points, axis=1)
        self.assertTrue(np.isfinite(points).all())
        self.assertLessEqual(radii.max(), data.RADIUS)
        self.assertEqual(sum(radii < data.RADIUS / 2), 125)
        self.assertGreater(radii.max() - radii.min(), data.RADIUS * .8)
        self.assertLess(points.std(axis=0).max() / points.std(axis=0).min(), 1.2)


if __name__ == "__main__":
    unittest.main()
