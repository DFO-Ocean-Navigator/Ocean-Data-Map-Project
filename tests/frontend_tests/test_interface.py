"""
Use-friendly interactive UI test interface
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
import ui_tests

def construct_interface():
    """

    Function to construct user interface for tests
    certain options will be available for user. 
    
    """
    sleep = 2
    screenWidth, screenHeight = gui.size()
    # Go to ocean navigator web page
    ui_tests.navigator_webpage()
    #Contruct option box for available tests
    option = gui.confirm("Select prefered UI test", 'UI test options', ['All', 'Temperature bar', 'Point index', 'Line index'])

    if option == 'All':
        ui_tests.main()
    elif option == 'Temperature bar':
        time.sleep(sleep)
        ui_tests.find_temperature_bar()
    elif option == 'Point index':
        time.sleep(sleep)
        ui_tests.draw_point()
    elif option == 'Line index':
        time.sleep(sleep)
        ui_tests.draw_map()     


def main():
    construct_interface()

if __name__ == '__main__':
    main()