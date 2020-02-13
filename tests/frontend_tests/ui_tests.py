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

def find_temperature_bar():
    """

    Function to locate the temperature bar on
    the ocean navigator public page. 
    
    """
    screenWidth, screenHeight = gui.size()
    # Find the Chrome pin in task bar
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
    image_loc = gui.locateCenterOnScreen(
        paths['test_temperature'], confidence=0.7, grayscale=True)

    if image_loc is None:
        gui.alert(text='Temperature bar not found!', title='Temperature bar', button='OK')
    else:
        gui.click(button='right', x=image_loc.x, y=image_loc.y)
        gui.alert(text='Temperature bar check complete!', title='Temperature bar', button='Close', timeout=box_timeout)


def move_to_et_click(position):
    gui.moveTo(position)
    gui.click()


def draw_point():
    """

    Function performs UI test on the draw point
    functionality of the navigator. 
    
    Assumption, user ran the temperature bar test
    so firefox and the navigator page are open.
    """
    sleep = 1.7
    # Navigate to Point
    move_to_et_click(dimension['point_position'])
    time.sleep(sleep)
    # Pick the point dropdown
    move_to_et_click(dimension['draw_point_icon'])
    time.sleep(sleep)
    # Pick a point on the map
    move_to_et_click(dimension['map_point'])
    time.sleep(plot_render_sleep)
    # Find expected plot
    image_loc = gui.locateCenterOnScreen(
        paths['point_index'], confidence=0.5, grayscale=True)

    if image_loc is None:
        gui.alert(text='Point index not found!', title='Map point', button='OK')
    else:
        gui.click(button='right', x=image_loc.x, y=image_loc.y)
        gui.alert(text='Point UI test complete!', title='Map point', button='Close', timeout=box_timeout)






def main():
    find_temperature_bar()
    draw_point()

if '__main__' == __name__:
    main()