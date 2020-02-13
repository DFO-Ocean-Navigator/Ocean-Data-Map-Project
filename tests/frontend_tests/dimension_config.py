"""
Write x and y location to a config file
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
    new_firefox_window = (147,43)
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
    # write to config file
    write_to_config(info)


def open_config(config_file='dimension_config.yaml'):
    # Open dimension config
    with open(config_file, 'r') as f:
        config = yaml.load(f, Loader=yaml.FullLoader)
    return config

def write_to_config(file, config_file='dimension_config.yaml'):
    # write to extisting config file
    with open(config_file, 'w') as f:
        yaml.dump(file, f, default_flow_style=False)

def update_config_file(header=None, key=None, value=None):
    """
    Update existing configuration file with new values
    for a given key

    key : str
    """

    with open('dimension_config.yaml', 'r') as f:
        config = yaml.load(f, Loader=yaml.FullLoader)

    config[header][key] = value 
    # write to config file
    write_to_config(config)


# Identify mouse postion
def identifyloc():
    """
    Locate and return current x and y mouse postion
    """
    while True:
        MouseX, MouseY = gui.position()
        print(MouseX, MouseY)
        time.sleep(2.7)


def main():
    #identifyloc()
    update_config_file('paths', 'point_index', os.path.abspath('locate_onscreen/point_index.png'))

if '__main__' == __name__:
    main()
        