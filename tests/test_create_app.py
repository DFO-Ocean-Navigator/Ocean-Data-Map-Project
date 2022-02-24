import unittest

from oceannavigator import create_app


class TestCreateApp(unittest.TestCase):
    def test_create_app_actually_works(self):
        app = create_app()
