from routes.api_v1_0 import all_time_query_v1_0
from oceannavigator import create_app
import hashlib
import json
import unittest
from flask import Response, Flask
from unittest import mock
import json
import base64
import os
import data
import requests
from urllib.parse import urlencode

def geturl(query):
    request = "/api/v1.0/plot/?" + urlencode({"query": json.dumps(query)})
    return request

#
# This Class Tests various different point plot requests
#
class TestLinePlot(unittest.TestCase):

    @classmethod
    def setUpClass(self):
        self.app = create_app().test_client()


    #def test_all_timestamps(self):
    #    now = datetime.datetime.now()

    #    response = self.app.get('/api/v1.0/all/timestamps')
        
    #    for year in response:
    #        if type(year) is not int:
    #            raise AssertionError('Malformed Year')
    #        elif (year > now.year):
    #            raise AssertionError('Year out of bounds')
    #        else:
    #            for month in year:
    #                if month < 0 or month > 11:
    #                    raise AssertionError('Month out of bounds')
    #                else:
    #                    for day in month:
    #                        if type(day) is not int or day < 0 or day > 31:
    #                            AssertionError('Invalid Day')



    def test_num2date(self):
        index = 1

        response = self.app.get('/api/v1.0/timeindex/convert/giops_day/1/')
        self.assertEqual(response.status_code, 200)
        response = json.loads(response.data)
        if isinstance(response, dict):
            response = response['date']
            if len(response) > 1:
                raise AssertionError('Invalid number of dates converted')
            elif len(response) < 1:
                raise AssertionError('No Date Returned')
        else:
            raise AssertionError('Invalid Format')

    def test_multiple_num2date(self):
        index = '1,4,5'

        response = self.app.get('/api/v1.0/timeindex/convert/giops_day/1,4,5/')
        self.assertEqual(response.status_code, 200)
        response = json.loads(response.data)
        if isinstance(response, dict): 
            response = response['date']
            if len(response) != 3:
                raise AssertionError("Invalid Number of Dates Converted")
        else:
            raise AssertionError('Invalid Format')