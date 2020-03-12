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
from utils import (navigator_webpage, test_profile, 
                   retry_location_test, move_et_click)


#Open configuration file

config = open_config()
dimension = config['location']
paths = config['paths']
address = config['web_addresses']

# Results

line_index_results = {
    'Profile' : None,
    'Hovmoller Diagram test' : None,
}

# Set default sleep time
sleep = 5
plot_render_sleep = 10
box_timeout = 2500

def draw_map():
    """

    Function performs UI test on the draw line
    functionality of the navigator. 
    
    Assumption, user ran the temperature bar test
    so firefox and the navigator page are open.
    """
    sleep = 1.7
    result = None
    # Navigate to Point icon
    time.sleep(sleep)
    move_et_click(dimension['map_icon'])
    time.sleep(sleep)
    # Pick the point dropdown
    move_et_click(dimension['draw_on_map'])
    time.sleep(sleep)
    # Draw a counding box for line test
    start_point = dimension['map_point']
    direction = 80
    move_right = (start_point[0] + direction, start_point[1])
    move_down = (move_right[0], move_right[1] - direction)
    move_left = (move_down[0] - direction, move_down[1])
    move_up = (move_left[0], move_left[1] + direction)
    move_et_click(dimension['map_point'])
    move_et_click(move_right)
    move_et_click(move_down)
    move_et_click(move_left)
    move_et_click(move_up)
    gui.click(move_up)
    time.sleep(plot_render_sleep)
    gui.alert('Conducting test...', 'Wait', timeout=4000)
    # Find expected plot
    image_loc = gui.locateCenterOnScreen(
        paths['line_index'], confidence=0.3, grayscale=True)

    if image_loc is None:
        gui.alert(text='Line index not found!', title='UI test', button='OK', timeout=box_timeout)
        # Retry the test in case of slow network connection
        retry_location_test(paths['line_index'], 'Line Index')
        result = 'Test Failed'
    else:
        gui.alert(text='Line UI test complete!', title='UI test', button='Close', timeout=box_timeout)
        result = 'Test Completed'

    line_index_results['Profile'] = result
    #Hovmoller Diagram test
    point_tests(paths['line_index'], line_index_results)
    # Close index sub-tab
    time.sleep(.30)
    gui.click(dimension['close_index'])
    time.sleep(.30)
    return line_index_results

def point_tests(test_compare, log):
    hovmoller_diagram = test_profile(test_compare, 
                        'Hovmoller Diagram test', dimension['CTD_Profile'], log)


def main():
    navigator_webpage()
    draw_map()

if __name__ == '__main__':
    main()