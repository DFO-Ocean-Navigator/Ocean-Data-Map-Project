import json
from io import BytesIO, StringIO
import re
import base64
import pytz
import routes.routes_impl

class scriptGenerator():

    def generatePython(url):
        
        notPlot = False
        netcdf = False
        data_type = "plot"
        try:
            url = json.loads(url)
        except:
            notPlot = True
            print(url)
            print(type(url))
            url_tail = "&" + re.findall("&(.*)", url)[0]
            url = re.sub("&(.*)", "", url)
            print("SDFSLDFKJSDLFJSDLFKDSJFl")
            print(url_tail)
            print(url)
            url = json.loads(url)
            fileExtension = "csv"

        if 'output_format' in url:
            netcdf = True
            fileExtension = "nc"
            data_type = "subset"
        
        #setup file
        script = StringIO()

        #FILE CONTENTS~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        #HEADER---------------------

        if notPlot == True or netcdf == True:
            script.write("import requests\n")
            script.write("import os\n")
            script.write("import shutil\n")

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
        script.write('base_url = "http://navigator.oceansdata.ca/api/v1.0/%s/?"\n\n' % (data_type))

        #---------------------------

        
            


        #CREATE JSON OBJECT---------

        script.write("#Create JSON Object\n")
        script.write("query = {\n")
        for x in url:
          #print(type(url.get(x)))
          if isinstance(url.get(x), str):
            script.write('  "' + x + '": "' + str(url.get(x)) + '"' + ",\n" )
          else:
            
            if x == 'time':
                formatted_date = routes.routes_impl.time_query_conversion(url.get('dataset'),url.get('time'))
                script.write('  "' + x + '": ' + "'" + formatted_date + "',\n")
            else:
                script.write('  "' + x + '": ' + str(url.get(x)) + ",\n")

        script.write("}\n")
        #---------------------------



        #Assemble full request
        script.write('\n#Assemble full request - converts json object to url\n')
        if notPlot == False:
            script.write("url = base_url + urlencode(" + '{"query": ' + "json.dumps(query)})" + "\n")
        else:
            script.write("url = base_url + urlencode(" + '{"query": ' + "json.dumps(query)}) + '" + url_tail + "'\n")
        
        script.write("print(url)\n")



        #Open URL and read response

        if notPlot == False and netcdf == False:
            script.write("\n#Open URL and save response\n")
            script.write("with closing(urlopen(url)) as f:\n")
            script.write("  img = Image.open(f)\n")
            if url.get("type") == "drifter":
                script.write('  img.save("script_template_" + str(query["dataset"]) + "_" + str(query["drifter"]) + ".png", "PNG")\n')
            else:
                script.write('  img.save("script_template_" + str(query["dataset"]) + "_" + str(query["variable"]) + ".png" , "PNG")\n')
        else:
            script.write("\n#Open URL and save response\n")
            script.write("data_file = requests.get(url, stream=True)\n")
            script.write("dump = data_file.raw\n")
            script.write("location = os.path.abspath('/home/script_output.%s')\n" % (fileExtension))
            script.write('with open("script_output.%s", "wb") as location:\n' % (fileExtension))
            script.write("  print('Saving File')\n")
            script.write("  shutil.copyfileobj(dump, location)\n")
            script.write("  print('Done')\n")

        #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        #CONVERT TO BytesIO TO SEND
        b = BytesIO()
        script.seek(0)
        b.write(bytes(script.read(),'utf-8'))
        b.seek(0)
        b.seek(0)
        
        return b

    def generateR(url):
        
        url = json.loads(url)

        #setup file
        script = StringIO()
        
        #FILE CONTENTS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        script.write("#Assigns Base Url\n\n")
        script.write('base_url <- "http://navigator.oceansdata.ca/api/v1.0/plot/"\n\n\n')
        old_query = dict(url)
        #Assign Query Variables
        script.write("#Assignes Query Variables\n")
        for x in url:
            updated_value = re.sub("'", '"', str(url.get(x)))
            updated_value = re.sub("True", "true", updated_value)
            updated_value = re.sub("False", "false", updated_value)
            if isinstance(url.get(x), str):
                script.write( x + '= ' "'" + '"' + updated_value + '"' + "'\n")
            elif isinstance(url.get(x), bool):
               
                script.write( x + '= "' + updated_value + '"\n')
            elif isinstance(url.get(x), int):
                if x == 'time':
                    formatted_date = routes.routes_impl.time_query_conversion(url.get('dataset'),url.get('time'))
                    script.write( x + '= ' + "'" + '"' + formatted_date + '"' + "'" + '\n')
                else:
                    script.write( x + '= ' + updated_value + '\n')

            else:
                script.write( x + '= ' + "'" + updated_value + "'\n")
        script.write("\n\n\n")
        #Assemble Query
        queryVariables = ''
        query_template = url
        script.write("#Assembles Query Using the Assigned Values\n")
        script.write("query = sprintf('")
        for x in url:
            url[x] = '%s'
            #query_template = re.sub(str(url.get(x)), '%s', str(query_template), 1)
            queryVariables += ', ' + x
        
        query_template = str(query_template)
        query_template = re.sub("'%s'","%s", query_template)
        query_template = re.sub("'", '"', query_template)   #Replace signle quotes with double quotes
        
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
            script.write("#Format time to be used in file name\n")
            script.write("time_ = gsub(':.*','', time)\n")
            script.write("time_ = gsub('\\" + '"' + "'," + '"",' + "time_)\n\n")
            script.write('filename = paste0("script_template_image_", time_, ".png")\n')
        
        script.write('download.file(full_url, filename, extra = "curl", mode = "wb")\n')
        #~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

        b = BytesIO()
        script.seek(0)
        b.write(bytes(script.read(), 'utf-8'))
        b.seek(0)
        b.seek(0)

        return b