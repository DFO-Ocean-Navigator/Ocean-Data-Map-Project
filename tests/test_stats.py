#!/usr/bin/env python3


import unittest as ut

from oceannavigator.backend.stats import calculate_stats


class TestStats(ut.TestCase):
    

    def setup(self):
        return


    def calculate_stats_returns_correct_stats(self):

        expected_stats = {
            "sampled_points": "0",
            "votemper": {
                "units": "degC",
            }
        }

        actual_stats = calculate_stats(
                                        "",
                                        [],
                                        0,
                                        0,
                                        [])

        self.assertDictEqual(actual_stats, expected_stats)
