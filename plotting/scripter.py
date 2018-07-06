import time
from flask import Flask, send_file
import io

def constructScript(query):

  strIO = io.StringIO()
  strIO.write("HELLO WORLD")
  strIO.seek(0)

  return strIO
