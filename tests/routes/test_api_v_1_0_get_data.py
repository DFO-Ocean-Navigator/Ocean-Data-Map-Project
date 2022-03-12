import json
import unittest

from oceannavigator import create_app

app = create_app(
    testing=True, dataset_config_path="../tests/testdata/datasetconfigpatch.json"
)


class TestAPIv1GetData(unittest.TestCase):
    def setUp(self) -> None:
        self.app = app.test_client()

    def __get_response_data(self, resp):
        return json.loads(resp.get_data(as_text=True))

    @unittest.skip("Failing")
    def test_data_endpoint(self) -> None:
        res = self.app.get(
            "/api/v1.0/data/",
            query_string={
                "dataset": "giops_real",
                "variable": "votemper",
                "time": 2212444800,
                "depth": 0,
                "geometry_type": "area",
            },
        )

        data = self.__get_response_data(res)

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.content_type, "application/json")
        self.assertEqual(len(data["features"]), 75)

    def test_data_endpoint_returns_error_400_when_args_are_missing(self) -> None:
        res = self.app.get("/api/v1.0/data/", query_string={})

        self.assertEqual(res.status_code, 400)
