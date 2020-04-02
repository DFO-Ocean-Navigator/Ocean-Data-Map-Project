"""
Perform UI test on the Ocean Navigator
==========================
:Author: Samuel Babalola
:Created: 2020-02-11

This module contains functions for different tests
of the user interface of the navigator.
"""

from datetime import datetime
import pyautogui as gui
import time
import yaml
from dimension_config import open_config


config = open_config()
dimension = config['location']
paths = config['paths']
address = config['web_addresses']
duration = config['duration']

# Set default sleep time
sleep = duration['sleep']
plot_render_sleep = duration['plot_render']
box_timeout = duration['box_timeout']



def navigator_webpage():
    """

    Function to access the navigator web page
    *reduce duplicated codes. 
    
    """
    # Start firefox
    gui.press('winleft')
    time.sleep(3)
    gui.typewrite('firefox', interval=0.5)
    time.sleep(1)
    gui.press('enter')
    time.sleep(14)
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
        result = 'Test Failed'
    else:
        time.sleep(0)
        gui.alert(text='UI test complete!', title='{}'.format(ui_test), button='Close', timeout=box_timeout)
        result = 'Test Completed'

    # Close index sub-tab
    time.sleep(.30)
    #gui.click(dimension['close_index'])
    time.sleep(.30)
    return result

def test_profile(test_index, ui_test, location, log_result, log_time):
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
        result = 'Index failed time(10 seconds) test'
    else:
        time.sleep(0)
        gui.alert(text='UI test complete!', title='{}'.format(ui_test), button='Close', timeout=box_timeout)
        result = 'Test Completed'
    
    # Log resultd
    test_date = datetime.now()
    test_date = test_date.strftime("%A, %d. %B %Y %H:%M:%S")
    log_result[ui_test] = result
    log_time[ui_test] = test_date
    return result

def get_time():
    test_date = datetime.now()
    test_date = test_date.strftime("%A, %d. %B %Y %H:%M:%S")
    return test_date

def main():
    navigator_webpage()

if __name__ == '__main__':
    main()