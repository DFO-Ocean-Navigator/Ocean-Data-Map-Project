from flask import Response, Blueprint, request, redirect, send_file, send_from_directory, jsonify, current_app
from flask_babel import gettext, format_date
import json
import datetime
from io import BytesIO
from PIL import Image
import io

from oceannavigator.dataset_config import (
    get_variable_name, get_datasets,
    get_dataset_url, get_dataset_climatology, get_variable_scale,
    is_variable_hidden, get_dataset_cache, get_dataset_help,
    get_dataset_name, get_dataset_quantum, get_dataset_attribution
)
from utils.errors import ErrorBase, ClientError, APIError
import utils.misc


import plotting.colormap
import plotting.tile
import plotting.scale
import numpy as np
import re
import os
import netCDF4
import base64
import pytz
from data import open_dataset
import routes.routes_impl

class scriptGenerator():

    def generatePython(url):
        
        print("CONSTRUCTING PYTHON SCRIPT: ")

        #setup file
        script = io.StringIO()

        #FILE CONTENTS~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        #HEADER---------------------

        script.write("from urllib.request import urlopen\n")
        script.write("from urllib.parse import urlencode\n")
        script.write("from contextlib import closing\n")
        script.write("try:\n")
        script.write("   from PIL import Image\n")
        script.write("except:\n")   
        script.write('   print("If you are on a Windows machine, please install PIL (imaging library) using' + " 'python -m pip install Pillow'" + ' in the Anaconda Prompt")\n')
        script.write("   exit()\n")
        script.write("import json\n")
        script.write("\n\n")

        #Set Navigators URL
        script.write("#Set Navigator URL\n")
        script.write('base_url = "http://navigator.oceansdata.ca/api/v1.0/plot/?"\n\n')

        #---------------------------

        #CREATE JSON OBJECT---------

        script.write("#Create JSON Object\n")
        script.write("query = {\n")
        for x in url:
          print(x)
          #print(type(url.get(x)))
          if isinstance(url.get(x), str):
            script.write('  "' + x + '": "' + str(url.get(x)) + '"' + ",\n" )
          else:
            
            if x == 'time':
                formatted_date = routes.routes_impl.time_query_conversion(url.get('dataset'),url.get('time'))
                script.write('  "' + x + '": ' + "'" + formatted_date + "',\n")
            else:
                script.write('  "' + x + '": ' + str(url.get(x)) + ",\n")

          print(url.get(x))
        script.write("}\n")
        #---------------------------



        #Assemble full request
        script.write('\n#Assemble full request - converts json object to url\n')
        script.write("url = base_url + urlencode(" + '{"query": ' + "json.dumps(query)})" + "\n")
        script.write("print(url)")



        #Open URL and read response
        script.write("\n#Open URL and save response\n")
        script.write("with closing(urlopen(url)) as f:\n")
        script.write("  img = Image.open(f)\n")
        if url.get("type") == "drifter":
            script.write('  img.save("script_template_" + str(query["dataset"]) + "_" + str(query["drifter"]) + ".png", "PNG")\n')
        else:
            script.write('  img.save("script_template_" + str(query["dataset"]) + "_" + str(query["variable"]) + ".png" , "PNG")\n')


        #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        #CONVERT TO BytesIO TO SEND
        b = io.BytesIO()
        script.seek(0)
        b.write(bytes(script.read(),'utf-8'))
        b.seek(0)
        print("B: ")
        print(b.read())
        b.seek(0)
        
        return b

    def generateR(url):
        
        print("CONSTRUCTING R SCRIPT: ")

        #setup file
        script = io.StringIO()
        
        #FILE CONTENTS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        script.write("#Assigns Base Url\n\n")
        script.write('base_url <- "http://navigator.oceansdata.ca/api/v1.0/plot/"\n\n\n')
        old_query = dict(url)
        print("OLD QUERY: ")
        print(old_query)
        #Assign Query Variables
        script.write("#Assignes Query Variables\n")
        print("ASSIGNING VARIABLES: ")
        for x in url:
            print(x)
            updated_value = re.sub("'", '"', str(url.get(x)))
            updated_value = re.sub("True", "true", updated_value)
            updated_value = re.sub("False", "false", updated_value)
            print("Original Value: ")
            print(str(url.get(x)))
            print("Updated Value: ")
            print(updated_value)
            if isinstance(url.get(x), str):
                print(url.get(x) + "!!!!")
                script.write( x + '= ' "'" + '"' + updated_value + '"' + "'\n")
            elif isinstance(url.get(x), bool):
                print(str(url.get(x)) + "IN BOOL")
                
                script.write( x + '= "' + updated_value + '"\n')
            elif isinstance(url.get(x), int):
                if x == 'time':
                    formatted_date = routes.routes_impl.time_query_conversion(url.get('dataset'),url.get('time'))
                    script.write( x + '= ' + "'" + '"' + formatted_date + '"' + "'" + '\n')
                else:
                    script.write( x + '= ' + updated_value + '\n')

            else:
                print("SOMETHING ELSE")
                script.write( x + '= ' + "'" + updated_value + "'\n")
        script.write("\n\n\n")
        #Assemble Query
        print("")
        print("")
        print("CONSTRUCTING QUERY: ")
        queryVariables = ''
        query_template = url
        print("ORIGINAL URL: ")
        print(url)
        script.write("#Assembles Query Using the Assigned Values\n")
        script.write("query = sprintf('")
        for x in url:
            print("REMOVING: ")
            print(url.get(x))
            print("RESULT:" )
            url[x] = '%s'
            #query_template = re.sub(str(url.get(x)), '%s', str(query_template), 1)
            print("QUERY TEMPLATE: ")
            print(query_template)
            print("NEXT: \n\n\n" )
            queryVariables += ', ' + x
        
        query_template = str(query_template)
        query_template = re.sub("'%s'","%s", query_template)
        query_template = re.sub("'", '"', query_template)   #Replace signle quotes with double quotes
        

            #if isinstance(url.get(x), str):
            #    script.write( x + "= '" + '"' + str(url.get(x)) + '"' + "'")
            #elif isinstance(url.get(x), int):
            #    script.write( x + "= " + str(url.get(x)) + "")
            #else:
            #    script.write( x + "= '" + str(url.get(x)) + "'" )

        
        script.write(query_template)
        #queryVariables = re.sub(',', '', queryVariables, 1)
        script.write("'")
        script.write(queryVariables)
        script.write(')\n\n')


        #Request and Save Image
        script.write("#Request and Save Image\n")
        script.write('full_url <- paste0(base_url, "?query=", query)\n')
        
        if old_query.get("type") == "drifter":
            script.write('filename = paste0("script_template_", dataset, "_", drifter, ".png")\n')
        else:
            script.write('filename = paste0("script_template_image_", time, ".png")\n')
        
        script.write('download.file(full_url, filename, extra = "curl", mode = "wb")\n')
        #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        b = io.BytesIO()
        script.seek(0)
        b.write(bytes(script.read(), 'utf-8'))
        b.seek(0)
        print("B: ")
        print(b.read())
        b.seek(0)

        return b