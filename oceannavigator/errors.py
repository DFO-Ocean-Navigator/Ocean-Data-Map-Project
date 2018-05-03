

"""
    Base class for errors
"""
class ErrorBase(Exception):
    def __init__(self, message, status_code=None):
        super(ErrorBase, self).__init__()

        self.status_code = status_code if status_code is not None else 500
        self.message = message

    """"
        Converts internal message into dictionary object
    """
    def to_dict(self):
        rv = dict()

        rv['message'] = self.message
        return rv

"""
    Error class for client-related stuff (bad queries, wrong API usage, etc.)
"""
class ClientError(ErrorBase):
    def __init__(self, message):
        super(ClientError, self).__init__(message, status_code=400)

"""
    Error class for server related stuff
"""
class ServerError(ErrorBase):
    def __init__(self, message):
        super(ServerError, self).__init__(message, status_code=500)
