import sqlite3
try:
    conn = sqlite3.connect('sql_app.db')
    cur = conn.cursor()
    cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='desktops'")
    row = cur.fetchone()
    if row:
        print(row[0])
    cur.execute("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='desktops'")
    for row in cur.fetchall():
        print(row[0])
    conn.close()
except Exception as e:
    print(e)
