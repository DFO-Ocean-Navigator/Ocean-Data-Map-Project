
"""
    Base class for errors
"""
class ErrorBase(Exception):
    def __init__(self, message: str, status_code: int=None, link: str = ""):
        super(ErrorBase, self).__init__()

        self.status_code: int = status_code if status_code is not None else 500
        self.message: str = message
        self.link: str = link

    """"
        Converts internal message into dictionary object.
        This is what is sent back to the browser.
    """
    def to_dict(self) -> dict:
        rv = dict()

        rv['message'] = self.message
        if self.link != "":
            rv['link'] = self.link
            
        return rv

"""
    Error class for client-related stuff (bad queries, wrong API usage, etc.)
"""
class ClientError(ErrorBase):
    def __init__(self, message: str):
        super(ClientError, self).__init__(message, status_code=400)

"""
    Error class for server-related stuff
"""
class ServerError(ErrorBase):
    def __init__(self, message: str):
        super(ServerError, self).__init__(message, status_code=500)

"""
    Error class for API-related stuff
"""
class APIError(ErrorBase):
    def __init__(self, message: str):
        super(APIError, self).__init__(message, status_code=400, link = "https://dfo-ocean-navigator.github.io/Ocean-Navigator-API-Tool/")
