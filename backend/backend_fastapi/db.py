import pymysql
from config import AUTH_DB, PROCESS_DB

_auth_conn = None
_process_conn = None


def get_auth_connection():
    global _auth_conn
    if _auth_conn is None:
        _auth_conn = pymysql.connect(
            host=AUTH_DB["host"],
            port=AUTH_DB["port"],
            user=AUTH_DB["user"],
            password=AUTH_DB["password"],
            database=AUTH_DB["database"],
            cursorclass=pymysql.cursors.DictCursor,
        )
    return _auth_conn


def get_process_connection():
    global _process_conn
    if _process_conn is None:
        _process_conn = pymysql.connect(
            host=PROCESS_DB["host"],
            port=PROCESS_DB["port"],
            user=PROCESS_DB["user"],
            password=PROCESS_DB["password"],
            database=PROCESS_DB["database"],
            cursorclass=pymysql.cursors.DictCursor,
        )
    return _process_conn


def auth_query(sql: str, params=None):
    conn = get_auth_connection()
    with conn.cursor() as cur:
        cur.execute(sql, params or ())
        if sql.strip().upper().startswith("SELECT"):
            return cur.fetchall()
        conn.commit()
    return None
