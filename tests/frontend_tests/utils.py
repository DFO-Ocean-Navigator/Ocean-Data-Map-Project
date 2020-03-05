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
from dimension_config import open_config


config = open_config()
dimension = config['location']
paths = config['paths']
address = config['web_addresses']

# Set default sleep time
sleep = 5
plot_render_sleep = 10
box_timeout = 2500


def navigator_webpage():
    """

    Function to access the navigator web page
    *reduce duplicated codes. 
    
    """
    # Find the firefox pin in task bar
    gui.moveTo(dimension['firefox_icon'])
    #Right click for a new window
    gui.click(button='right')
    gui.moveTo(dimension['new_firefox_window'])
    gui.click()
    time.sleep(sleep)
    # Go to Firefox search
    gui.moveTo(dimension['firefox_search'])
    gui.typewrite(address['ocean_navigator'], interval=0.08)
    gui.press('enter')
    time.sleep(sleep) 


def move_et_click(position):
    """

    Function to move to a postion and click
    *reduce duplicated codes. 
    
    """
    gui.moveTo(position)
    gui.click()


def retry_location_test(test_index, ui_test):
    """

    Function retries image location. There could
    be cases where there is a slow internet connection
    
    Assumption, user ran the temperature bar test
    so firefox and the navigator page are open.
    """
    gui.alert('Retry test...', 'Wait', timeout=box_timeout)
    # Additional 5 seconds
    time.sleep(5)
    # Find expected plot
    image_loc = gui.locateCenterOnScreen(
        test_index, confidence=0.3, grayscale=True)

    if image_loc is None:
        gui.alert(text='Index not found!', title='{}'.format(ui_test), button='OK', timeout=box_timeout)
    else:
        time.sleep(0)
        gui.alert(text='UI test complete!', title='{}'.format(ui_test), button='Close', timeout=box_timeout)

    # Close index sub-tab
    time.sleep(.30)
    gui.click(dimension['close_index'])
    time.sleep(.30)

def test_profile(test_index, ui_test, location):
    """

    Function retries image location. There could
    be cases where there is a slow internet connection
    
    Assumption, user ran the temperature bar test
    so firefox and the navigator page are open.
    """
    result = None
    gui.alert('Moving on...', 'Test', timeout=box_timeout)
    time.sleep(.30)
    move_et_click(location)
    # Additional 5 seconds
    time.sleep(10)
    # Find expected plot
    image_loc = gui.locateCenterOnScreen(
        test_index, confidence=0.3, grayscale=True)

    if image_loc is None:
        gui.alert(text='Index failed time test!', title='{}'.format(ui_test), button='OK', timeout=box_timeout)
        result = 'Test Failed'
    else:
        time.sleep(0)
        gui.alert(text='UI test complete!', title='{}'.format(ui_test), button='Close', timeout=box_timeout)
        result = 'Test Completed'
    # Close index sub-tab
    
    return result

def main():
    navigator_webpage()

if __name__ == '__main__':
    main()