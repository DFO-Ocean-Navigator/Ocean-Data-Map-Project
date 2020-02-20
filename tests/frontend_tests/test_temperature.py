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
from utils import (navigator_webpage, 
                      retry_location_test, move_et_click)


config = open_config()
dimension = config['location']
paths = config['paths']
address = config['web_addresses']

# Set default sleep time
sleep = 5
plot_render_sleep = 10
box_timeout = 2500


def find_temperature_bar():
    """

    Function to locate the temperature bar on
    the ocean navigator public page. 
    
    """
    time.sleep(2)
    screenWidth, screenHeight = gui.size()
    # Go to the navigator web page
    #navigator_webpage()
    # Locate temperature color bar on public page 
    image_loc = gui.locateCenterOnScreen(
        paths['test_temperature'], confidence=0.7, grayscale=True)

    if image_loc is None:
        gui.alert(text='Temperature bar not found!', title='Temperature bar', button='OK')
    else:
        gui.click(button='right', x=image_loc.x, y=image_loc.y)
        gui.alert(text='Temperature bar check complete!', title='Temperature bar', button='Close', timeout=box_timeout)


def main():
    navigator_webpage()
    find_temperature_bar()

if __name__ == '__main__':
    main()