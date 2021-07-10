"""Integration tests for API v1.0 endpoint /generatescript
"""
import unittest

from oceannavigator import create_app

app = create_app(testing=True)

class TestApiv10GenerateScript(unittest.TestCase):

    def setUp(self) -> None:
        self.app = app.test_client()

        self.langs: list = ['python', 'r']

    def test_generatescript_endpoint_for_plot_script_type(self) -> None:

        for l in self.langs:
            res = self.app.get(
                '/api/v1.0/generatescript/',
                query_string= {
                    "query": {"dataset":"giops_day","names":[],"plotTitle":"","quantum":"day","showmap":False,"station":[[48.26684109261785,-45.12499928474428]],"time":2257761600,"type":"profile","variable":["votemper"]},
                    "lang": l,
                    "scriptType": "PLOT"
                }
            )
        
            self.assertEqual(res.status_code, 200)

    @unittest.skip('Missing CSV template for R...')
    def test_generatescript_endpoint_for_csv_script_type(self) -> None:

        for l in self.langs:
            res = self.app.get(
                '/api/v1.0/generatescript/',
                query_string= {
                    "query": {"dataset":"giops_day","names":[],"plotTitle":"","quantum":"day","showmap":False,"station":[[48.26684109261785,-45.12499928474428]],"time":2257761600,"type":"profile","variable":["votemper"]},
                    "lang": l,
                    "scriptType": "CSV"
                }
            )
        
            self.assertEqual(res.status_code, 200)
