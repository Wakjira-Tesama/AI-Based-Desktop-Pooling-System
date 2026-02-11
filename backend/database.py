from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import sqlite3
from pathlib import Path

SQLITE_DATABASE_URL = "sqlite:///./sql_app.db"

engine = create_engine(
    SQLITE_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema():
    db_path = Path("./sql_app.db")
    if not db_path.exists():
        return
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(sessions)")
    columns = {row[1] for row in cur.fetchall()}
    if "duration_minutes" not in columns:
        cur.execute("ALTER TABLE sessions ADD COLUMN duration_minutes INTEGER DEFAULT 60")
        conn.commit()
    conn.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
