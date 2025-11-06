import os, csv
from datetime import datetime
from typing import Optional
import pymysql

DB_HOST=os.getenv("DB_HOST")
DB_USER=os.getenv("DB_USER")
DB_PASS=os.getenv("DB_PASS")
DB_NAME=os.getenv("DB_NAME")

def get_conn() -> Optional[pymysql.connections.Connection]:
    if not all([DB_HOST, DB_USER, DB_PASS, DB_NAME]):
        return None
    return pymysql.connect(host=DB_HOST, user=DB_USER, password=DB_PASS,
                           database=DB_NAME, autocommit=True, charset="utf8mb4")

def ensure_tables():
    conn=get_conn()
    if not conn: return
    cur=conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS devices(
      cone_id VARCHAR(32) PRIMARY KEY,
      ip VARCHAR(64), rssi INT, last_seen DATETIME(3),
      mode ENUM('centralized','decentralized') DEFAULT 'centralized'
    )""")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS events(
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      ts DATETIME(3), cone_id VARCHAR(32),
      severity ENUM('success','info','warning','error') DEFAULT 'info',
      msg VARCHAR(255)
    )""")
    cur.close(); conn.close()

def save_heartbeat(cone_id:str, ip:str, rssi:int, mode:str, ts_iso:str):
    conn=get_conn()
    if conn:
        cur=conn.cursor()
        cur.execute("""INSERT INTO devices(cone_id,ip,rssi,last_seen,mode)
                       VALUES(%s,%s,%s,%s,%s)
          ON DUPLICATE KEY UPDATE ip=VALUES(ip),rssi=VALUES(rssi),
                                   last_seen=VALUES(last_seen),mode=VALUES(mode)""",
                    (cone_id,ip,rssi,ts_iso,mode))
        cur.close(); conn.close()
        return
    os.makedirs("logs",exist_ok=True)
    with open("logs/devices.csv","a",newline="") as f:
        csv.writer(f).writerow([ts_iso,cone_id,ip,rssi,mode])

def save_event(ts_iso:str, cone_id:str, severity:str, msg:str):
    conn=get_conn()
    if conn:
        cur=conn.cursor()
        cur.execute("""INSERT INTO events(ts,cone_id,severity,msg)
                       VALUES(%s,%s,%s,%s)""",
                    (ts_iso,cone_id,severity,msg))
        cur.close(); conn.close()
        return
    os.makedirs("logs",exist_ok=True)
    with open("logs/events.csv","a",newline="") as f:
        csv.writer(f).writerow([ts_iso,cone_id,severity,msg])
