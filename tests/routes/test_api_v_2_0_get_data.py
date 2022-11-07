import unittest

from fastapi.testclient import TestClient

from oceannavigator import create_app

client = TestClient(create_app())


class TestAPIv2GetData(unittest.TestCase):
    @unittest.skip("Dependent on local resources - fails in GitHub actions.")
    def test_data_endpoint_no_bearing(self) -> None:
        response = client.get(
            "/api/v2.0/data",
            params={
                "dataset": "giops_real",
                "variable": "votemper",
                "time": 2212444800,
                "depth": 0,
                "geometry_type": "area",
            },
        )

        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Type"], "application/json")
        self.assertEqual(len(data["features"]), 265)

    @unittest.skip("Dependent on local resources - fails in GitHub actions.")
    def test_data_endpoint_with_bearing(self) -> None:
        response = client.get(
            "/api/v2.0/data",
            params={
                "dataset": "giops_real",
                "variable": "magwatervel",
                "time": 2212444800,
                "depth": 0,
                "geometry_type": "area",
            },
        )

        data = response.json()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["Content-Type"], "application/json")
        self.assertEqual(len(data["features"]), 265)

    def test_data_endpoint_returns_error_422_when_params_are_missing(self) -> None:
        response = client.get("/api/v2.0/data", params={})

        self.assertEqual(response.status_code, 422)
