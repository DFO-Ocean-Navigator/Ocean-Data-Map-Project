"""
Perform UI test on the Ocean Navigator
==========================
:Author: Samuel Babalola
:Created: 2020-02-11

This module contains functions for different tests
of the user interface of the navigator.
"""


import pyautogui as gui
import time
import yaml

from dimension_config import (open_config, write_to_config)
from utils import (navigator_webpage, 
                      retry_location_test, move_et_click)


#Open configuration file

config = open_config()
dimension = config['location']
paths = config['paths']
address = config['web_addresses']

# Set default sleep time
sleep = 5
plot_render_sleep = 10
box_timeout = 2500

# Open test configuration

test_config = open_config('test_results.yaml')
test = test_config['Test results']

def draw_point():
    """

    Function performs UI test on the draw point
    functionality of the navigator. 
    
    Assumption, user ran the temperature bar test
    so firefox and the navigator page are open.
    """
    sleep = 1.7
    result = None
    # Navigate to Point
    time.sleep(sleep)
    move_et_click(dimension['point_position'])
    time.sleep(sleep)
    # Pick the point dropdown
    move_et_click(dimension['draw_point_icon'])
    time.sleep(sleep)
    # Pick a point on the map
    move_et_click(dimension['map_point'])
    time.sleep(plot_render_sleep)
    gui.alert('Conducting test...', 'Wait', timeout=5000)
    # Find expected plot
    image_loc = gui.locateCenterOnScreen(
        paths['point_index'], confidence=0.5, grayscale=True)

    if image_loc is None:
        gui.alert(text='Point index not found!', title='Map point', button='OK', timeout=box_timeout)
        # Retry the test in case of slow network connection
        retry_location_test(paths['point_index'], 'Map point')
        result = 'Test Failed'
    else:
        time.sleep(0)
        gui.alert(text='Point UI test complete!', title='Map point', button='Close', timeout=box_timeout)
        result = 'Test Completed'
    test['Point Index test'] = result
    write_to_config(test_config, 'test_results.yaml')
    # Close index sub-tab
    time.sleep(.30)
    gui.click(dimension['close_index'])
    time.sleep(.30)
    return result

def main():
    navigator_webpage()
    draw_point()

if __name__ == '__main__':
    main()