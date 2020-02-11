"""
Write x and y location config file
==========================
:Author: Samuel Babalola
:Created: 2020-02-11

This module creates a yaml file containing x and y 
dimensions of the screen for mouse projections.
"""

import os
import pyautogui as gui
import time
import yaml

def create_config():
    """
    Write a configuration file for the x and y
    position of icons and text boxes
    """

    firefox_icon = (27, 60)
    new_firefox_window = (131,103)
    firefox_search = (360, 106)
    info = {}
    location = {
        "firefox_icon" : firefox_icon,
        "new_firefox_window" : new_firefox_window,
        "firefox_search" : firefox_search
    }
    paths = {
        "test_temperature" : os.path.abspath('locate_onscreen/temp.png')
    }
    web_addresses = {
        "ocean_navigator" : 'navigator.oceansdata.ca/public/'
    }
    info['location'] = location
    info['paths'] = paths
    info['web_addresses'] = web_addresses

    with open('dimension_config.yaml', 'w') as f:
        yaml.dump(info, f, default_flow_style=False)


# Identify mouse postion
def identifyloc():
    """
    Locate and return current x and y mouse postion
    """
    while True:
        MouseX, MouseY = gui.position()
        print(MouseX, MouseY)
        time.sleep(5)

def main():
    create_config()

if '__main__' == __name__:
    main()
        