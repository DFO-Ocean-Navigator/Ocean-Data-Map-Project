import sqlite3
import datetime as dt


def log_query_to_db(request):
    with sqlite3.connect('oceannav.db',
                         detect_types=sqlite3.PARSE_DECLTYPES) as cxn:
        c = cxn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS log (time timestamp,
                                                        host text,
                                                        ip text,
                                                        query text)''')

        print request.headers
        c.execute("INSERT INTO log VALUES (?, ?, ?, ?)",
                  (dt.datetime.now(),
                   request.headers.get('Host'),
                   request.remote_addr,
                   request.args.get('query')
                   )
                  )
        c.close()
