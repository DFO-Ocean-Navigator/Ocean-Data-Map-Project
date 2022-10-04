import unittest

from fastapi.testclient import TestClient

from oceannavigator import create_app


class TestApiv10GenerateScript(unittest.TestCase):
    def setUp(self) -> None:
        self.app = TestClient(create_app())

        self.langs: list = ["python", "r"]

    def test_generatescript_endpoint_for_plot_script_type(self) -> None:

        for lang in self.langs:
            query_string = {
                "dataset": "giops_day",
                "names": [],
                "plotTitle": "",
                "quantum": "day",
                "showmap": False,
                "station": [[48.26684109261785, -45.12499928474428]],
                "time": 2257761600,
                "variable": ["votemper"],
            }

            res = self.app.get(
                "/api/v1.0/generate_script",
                params={
                    "query": query_string,
                    "plot_type": "profile",
                    "lang": lang,
                    "script_type": "plot",
                },
            )

            self.assertEqual(res.status_code, 200)

    def test_generatescript_endpoint_for_csv_script_type(self) -> None:

        for lang in self.langs:
            query_string = (
                {
                    "dataset": "giops_day",
                    "names": [],
                    "plotTitle": "",
                    "quantum": "day",
                    "showmap": False,
                    "station": [[48.26684109261785, -45.12499928474428]],
                    "time": 2257761600,
                    "variable": ["votemper"],
                },
            )

            res = self.app.get(
                "/api/v1.0/generate_script",
                params={
                    "query": query_string,
                    "plot_type": "profile",
                    "lang": lang,
                    "script_type": "csv",
                },
            )

            self.assertEqual(res.status_code, 200)
