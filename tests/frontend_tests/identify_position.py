"""
Print x and y location of mouse position
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

# Identify mouse postion
def identifyloc():
    """
    Locate and return current x and y mouse postion
    """
    while True:
        MouseX, MouseY = gui.position()
        print(MouseX, MouseY)
        time.sleep(1.6)


def main():
    identifyloc()

if '__main__' == __name__:
    main()