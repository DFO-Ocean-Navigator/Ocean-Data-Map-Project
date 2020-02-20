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

from test_area_index import draw_area
from test_line_index import draw_map
from test_point_index import draw_point
from test_temperature import find_temperature_bar

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
                        ['All', 'Temperature bar', 'Point index', 'Line index', 'Area index'])

    def all():
        find_temperature_bar()
        draw_point()
        draw_map()
        draw_area()

    if option == 'All':
        all()
    elif option == 'Temperature bar':
        time.sleep(sleep)
        find_temperature_bar()
    elif option == 'Point index':
        time.sleep(sleep)
        draw_point()
    elif option == 'Line index':
        time.sleep(sleep)
        draw_map()    
    elif option == 'Area index':
        time.sleep(sleep)
        draw_area()     


def main():
    construct_interface()

if __name__ == '__main__':
    main()