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


def move_to_et_click(position):
    """

    Function to move to a postion and click
    *reduce duplicated codes. 
    
    """
    gui.moveTo(position)
    gui.click()


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
    gui.alert('Conducting test...', 'Wait', timeout=5000)
    # Find expected plot
    image_loc = gui.locateCenterOnScreen(
        paths['point_index'], confidence=0.5, grayscale=True)

    if image_loc is None:
        gui.alert(text='Point index not found!', title='Map point', button='OK', timeout=box_timeout)
    else:
        time.sleep(0)
        gui.alert(text='Point UI test complete!', title='Map point', button='Close', timeout=box_timeout)

    # Close index sub-tab
    time.sleep(.30)
    gui.click(dimension['close_index'])
    time.sleep(.30)


def draw_map():
    """

    Function performs UI test on the draw line
    functionality of the navigator. 
    
    Assumption, user ran the temperature bar test
    so firefox and the navigator page are open.
    """
    sleep = 1.7
    # Navigate to Point
    move_to_et_click(dimension['map_icon'])
    time.sleep(sleep)
    # Pick the point dropdown
    move_to_et_click(dimension['draw_on_map'])
    time.sleep(sleep)
    # Draw a counding box for line test
    start_point = dimension['map_point']
    direction = 80
    move_right = (start_point[0] + direction, start_point[1])
    move_down = (move_right[0], move_right[1] - direction)
    move_left = (move_down[0] - direction, move_down[1])
    move_up = (move_left[0], move_left[1] + direction)
    move_to_et_click(dimension['map_point'])
    move_to_et_click(move_right)
    move_to_et_click(move_down)
    move_to_et_click(move_left)
    move_to_et_click(move_up)
    gui.click(move_up)
    time.sleep(plot_render_sleep)
    gui.alert('Conducting test...', 'Wait', timeout=4000)
    # Find expected plot
    image_loc = gui.locateCenterOnScreen(
        paths['line_index'], confidence=0.3, grayscale=True)

    if image_loc is None:
        gui.alert(text='Line index not found!', title='UI test', button='OK', timeout=box_timeout)
    else:
        gui.alert(text='Line UI test complete!', title='UI test', button='Close', timeout=box_timeout)

    # Close index sub-tab
    time.sleep(.30)
    gui.click(dimension['close_index'])
    time.sleep(.30)

def main():
    #navigator_webpage()
    find_temperature_bar()
    draw_point()
    draw_map()

if __name__ == '__main__':
    main()