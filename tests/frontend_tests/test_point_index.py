"""
Perform UI test on the Ocean Navigator
==========================
:Author: Samuel Babalola
:Created: 2020-02-11

This module contains functions for different tests
of the user interface of the navigator.
"""

import copy
from datetime import datetime
import pyautogui as gui
import time
import yaml

from dimension_config import (open_config, write_to_config)
from utils import (navigator_webpage, test_profile, get_time, 
                   retry_location_test, move_et_click)


#Open configuration file

config = open_config()
dimension = config['location']
paths = config['paths']
address = config['web_addresses']
duration = config['duration']

# Log profile results to a dictionary
point_index_results = {
    'Profile' : None,
    'CTD Profile test' : None,
    'T/S Diagram test' : None,
    'Sound Speed profile' : None,
    'Virtual_Mooring' : None
}
point_index_times = copy.deepcopy(point_index_results)

# Set default sleep time
sleep = duration['sleep']
plot_render_sleep = duration['plot_render']
box_timeout = duration['box_timeout']

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
        result = retry_location_test(paths['point_index'], 'Map point')
    else:
        time.sleep(0)
        gui.alert(text='Point UI test complete!', title='Map point', button='Close', timeout=box_timeout)
        result = 'Test Completed'
    point_index_results['Profile'] = result
    point_index_times['Profile'] = get_time() 
    point_tests(paths['point_index'], point_index_results, point_index_times)
    # Close index sub-tab
    time.sleep(.30)
    gui.click(dimension['close_index'])
    time.sleep(.30)
    return point_index_results, point_index_times


def point_tests(test_compare, log_result, log_time):
    ctd_profile = test_profile(test_compare, 'CTD Profile test', dimension['CTD_Profile'], log_result, log_time)
    ts_diagram = test_profile(test_compare, 'T/S Diagram test', dimension['T/S_Diagram'], log_result, log_time)
    sound_speed = test_profile(test_compare, 'Sound Speed profile', dimension['Sound_Speed'], log_result, log_time)
    virtual_mooring = test_profile(test_compare, 'Virtual_Mooring', dimension['Virtual_Mooring'], log_result, log_time)
    

def main():
    navigator_webpage()
    draw_point()

if __name__ == '__main__':
    main()