import requests
import os
import shutil
from urllib.request import urlopen
from urllib.parse import urlencode
from contextlib import closing
from PIL import Image
import json


# Set Navigator URL
base_url = "http://navigator.oceansdata.ca/api/v1.0/%s/?"


# JSON object:
query = %s


# Assemble full request - converts json object to url
url = base_url + urlencode({"query": json.dumps(query)})
print(url)


# Open URL and save response
if plot_url:
	with closing(urlopen(url)) as f:
		img = Image.open(f)
		img.save("script_template_" + str(query["dataset"]) + "_" + str(query["%s"]) + ".png" , "PNG")

else:
	data_file = requests.get(url, stream=True)
	dump = data_file.raw
	location = os.path.abspath('/home/script_output.%s')
	with open("script_output.%s", "wb") as location:
		print('Saving File')
		shutil.copyfileobj(dump, location)
		print('Done')
