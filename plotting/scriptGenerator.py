import json
from io import BytesIO, StringIO
import re
import base64
import pytz
import hashlib
import routes.routes_impl
from data import open_dataset
from oceannavigator import DatasetConfig

def time_query_conversion(dataset, index):
    """
    API Format: /api/timestamps/?dataset=' '

    dataset : Dataset to extract data - Can be found using /api/datasets

    Finds all data timestamps available for a specific dataset
    """

    
    config = DatasetConfig(dataset)
    with open_dataset(config) as ds:
        try:
            date = ds.timestamps[index]
            return date.replace(tzinfo=pytz.UTC).isoformat()
        except IndexError:
            return ClientError("Timestamp does not exist")

def generatePython(url, scriptType):
    if "class4id" in url:
        var = "class4id"
    elif "drifter" in url:
        var = "drifter"
    else:
        var = "variable"
    query = url

    # format query for python, could do with regular expressions
    query = query.replace(',"', ',\n"')
    if "true" in query:
        query = query.replace("true", "1")
    if "false" in query:
        query = query.replace("false", "0")
    if "null"  in query:
        query = query.replace("null", "None")
    
    with open("plotting/templates/python" + scriptType + "template.txt", 'r') as f:
        template = str(f.read())

        if scriptType == "PLOT":
            template = template.format(q = query, var = var)
        else:
            template = template.format(q = query)

        finalScript = BytesIO()
        finalScript.write(bytes(template,'utf-8'))
        finalScript.seek(0)
        return finalScript


def generateR(url, scriptType):

    isClass4 = False
    notPlot = False
    netcdf = False
    data_type = "plot"
    if "class4id" in url:
        isClass4 = True
    try:
        url = json.loads(url)
        fileExtension = ".png"
    except:
        notPlot = True
        url_tail = "&" + re.findall("&(.*)", url)[0]
        url = re.sub("&(.*)", "", url)
        url = json.loads(url)
        fileExtension = ".csv"
    if 'output_format' in url:
        netcdf = True
        fileExtension = ".nc"
        data_type = "subset"
    #setup file
    script = StringIO()
    
    #FILE CONTENTS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    script.write("#Assigns Base Url\n\n")
    if not isClass4:
        script.write('base_url <- "http://navigator.oceansdata.ca/api/v1.0/' + data_type + '/"\n\n\n')
    else:
        script.write('base_url <- "http://navigator.oceansdata.ca/' + data_type + '/"\n\n\n')
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
                formatted_date = time_query_conversion(url.get('dataset'),url.get('time'))
                script.write( x + '= ' + "'" + '"' + formatted_date + '"' + "'" + '\n')
            else:
                script.write( x + '= ' + updated_value + '\n')
        else:
            script.write( x + '= ' + "'" + updated_value + "'\n")
    script.write("\n")
    if notPlot == True:
        script.write("url_tail <- '" + url_tail + "'\n")
    
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
    if notPlot == False:
        script.write('full_url <- paste0(base_url, "?query=", URLencode(query, reserved=TRUE))\n')
    else:
        script.write('full_url <- paste0(base_url, "?query=", URLencode(query, reserved=TRUE), url_tail)\n')
    

    
    if old_query.get("type") == "drifter":
        script.write('filename = paste0("script_template_", dataset, "_", drifter, ".png")\n')
    else:
        script.write("#Format time to be used in file name\n")
        script.write("time_ = gsub(':.*','', time)\n")
        script.write("time_ = gsub('\\" + '"' + "'," + '"",' + "time_)\n\n")
        script.write('filename = paste0("script_output_", time_, "' + fileExtension + '")\n')
        
    script.write('download.file(full_url, filename, extra = "curl", mode = "wb")\n')
    # EOF FILE CONTENT ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    b = BytesIO()
    script.seek(0)
    b.write(bytes(script.read(), 'utf-8'))
    b.seek(0)

    #Hash Result (For Testing)
    #data = b.read()
    #m = hashlib.md5()
    #m.update(data)
    #print(m.hexdigest())
    #b.seek(0)

    return b
