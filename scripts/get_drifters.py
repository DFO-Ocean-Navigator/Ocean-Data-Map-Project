'''
        This scipt pulls files down from google docs It is intended to be used to pull down the drifter xlsx file. 
        takes in 2 varablies: 
                var[1] is the google doc ID found in it's URL (make sure the doc is public)
                var[2] is the destation location on the computer
        code was sourced from stackoverflow https://stackoverflow.com/questions/25010369/wget-curl-large-file-from-google-drive/39225039#39225039
        Obtained for Ocean Navigator by: Jeffrey Dawson
        fist implemented on: 2017/08/30
	
	This file needs to be run from a cron job (suggested: every day at 3:50 am ) 
'''


import requests


def download_file_from_google_drive(id, destination):
    def get_confirm_token(response):
        print("confirming token")
        for key, value in response.cookies.items():
            if key.startswith('download_warning'):
                return value

        return None

    def save_response_content(response, destination):
        print("saving chunck")
        CHUNK_SIZE = 32768

        with open(destination, "wb") as f:
            for chunk in response.iter_content(CHUNK_SIZE):
                if chunk: # filter out keep-alive new chunks
                    f.write(chunk)

    URL = "https://docs.google.com/uc?export=download"

    session = requests.Session()

    response = session.get(URL, params = { 'id' : id }, stream = True)
    token = get_confirm_token(response)

    if token:
        params = { 'id' : id, 'confirm' : token }
        response = session.get(URL, params = params, stream = True)

    save_response_content(response, destination)    


if __name__ == "__main__":
    import sys
    if len(sys.argv) is not 3:
        print("Usage: python google_drive.py drive_file_id destination_file_path")
    else:
        # TAKE ID FROM SHAREABLE LINK
        file_id = sys.argv[1]
        # DESTINATION FILE ON YOUR DISK
        destination = sys.argv[2]
        download_file_from_google_drive(file_id, destination)
