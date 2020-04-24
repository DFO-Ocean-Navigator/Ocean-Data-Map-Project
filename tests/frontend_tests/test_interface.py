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

import argparse
from datetime import datetime
import pyautogui as gui
import time
import yaml
import utils

from dimension_config import (open_config, exempt_tests, write_to_config)
from test_area_index import draw_area
from test_line_index import draw_map
from test_point_index import draw_point
from test_temperature import find_temperature_bar
import update_slack

# Open result log configuration file
config_file = open_config('test_results.yaml')
test = config_file['Test results']
config_time = config_file['Test time']


def construct_interface(run_option):
    """

    Function to construct user interface for tests
    certain options will be available for user. 

    """
    sleep = 3
    screenWidth, screenHeight = gui.size()
    # Go to ocean navigator web page
    utils.navigator_webpage()
    time.sleep(15)
    utils.clear_cache()
    time.sleep(10)
    # Contruct option box for available tests
    # option = gui.confirm("Select prefered UI test", 'UI test options',
    #                    ['All', 'Temperature bar', 'Point Index', 'Line Index', 'Area Index'])

    def all():
        time.sleep(sleep)
        temp_test, temp_time = find_temperature_bar()
        time.sleep(sleep)
        point_test, point_times = draw_point()
        time.sleep(sleep)
        map_test, line_times = draw_map()
        time.sleep(sleep)
        area_test, area_time = draw_area()
        test['Temperature bar test'] = temp_test
        config_time['Temperature bar test'] = temp_time
        test['Point Index test'] = point_test
        config_time['Point Index test'] = point_times
        test['Area Index test'] = area_test
        config_time['Area Index test'] = area_time
        test['Line Index test'] = map_test
        config_time['Line Index test'] = line_times
        write_to_config(config_file, 'test_results.yaml')

    if run_option == 'All' or run_option == None:
        all()
    elif run_option == 'Temperature_bar':
        time.sleep(sleep)
        result, times = find_temperature_bar()
        option = split_option(run_option)
        exempt_tests(option, result, times)
    elif run_option == 'Point_Index':
        time.sleep(sleep)
        result, times = draw_point()
        option = split_option(run_option)
        exempt_tests(option, result, times)
    elif run_option == 'Line_Index':
        time.sleep(sleep)
        result, times = draw_map()
        option = split_option(run_option)
        exempt_tests(option, result, times)
    elif run_option == 'Area_Index':
        time.sleep(sleep)
        result, times = draw_area()
        option = split_option(run_option)
        exempt_tests(option, result, times)


def split_option(option):
    option = option.split("_")
    return '{} {}'.format(option[0], option[1])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("run_option", action="store", default=None)
    config = parser.parse_args()
    construct_interface(config.run_option)
    #update_slack.main()


if __name__ == '__main__':
    main()
