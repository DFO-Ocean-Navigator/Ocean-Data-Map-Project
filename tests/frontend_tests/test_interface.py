"""
User-friendly interactive UI test interface
==========================
:Author: Samuel Babalola
:Created: 2020-02-11

This goal is to create an interface where users 
can select which test they you'd prefer rather 
than all. (There will be an option to run all the
tests as well).
"""


import pyautogui as gui
import time
import yaml
import utils

from dimension_config import (open_config, exempt_tests, write_to_config)
from test_area_index import draw_area
from test_line_index import draw_map
from test_point_index import draw_point
from test_temperature import find_temperature_bar

# Open result log configuration file
config_file = open_config('test_results.yaml')
test = config_file['Test results']

def construct_interface():
    """

    Function to construct user interface for tests
    certain options will be available for user. 
    
    """
    sleep = 2
    screenWidth, screenHeight = gui.size()
    # Go to ocean navigator web page
    utils.navigator_webpage()
    #Contruct option box for available tests
    option = gui.confirm("Select prefered UI test", 'UI test options', 
                        ['All', 'Temperature bar', 'Point Index', 'Line Index', 'Area Index'])

    def all():
        temp_test = find_temperature_bar()
        point_test = draw_point()
        map_test = draw_map()
        area_test = draw_area()
        test['Temperature bar test'] = temp_test
        test['Point Index test'] = point_test
        test['Area Index test'] = area_test
        test['Line Index test'] = map_test
        write_to_config(config_file, 'test_results.yaml')

    if option == 'All':
        all()
    elif option == 'Temperature bar':
        time.sleep(sleep)
        result = find_temperature_bar()
        exempt_tests(option, result)
    elif option == 'Point Index':
        time.sleep(sleep)
        result = draw_point()
        exempt_tests(option, result)
    elif option == 'Line Index':
        time.sleep(sleep)
        result = draw_map()
        exempt_tests(option, result)  
    elif option == 'Area Index':
        time.sleep(sleep)
        result = draw_area()
        exempt_tests(option, result)     


def main():
    construct_interface()

if __name__ == '__main__':
    main()