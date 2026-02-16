from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import sqlite3
from pathlib import Path

SQLITE_DATABASE_URL = "sqlite:///./sql_app.db"
DATABASE_URL = os.getenv("DATABASE_URL", SQLITE_DATABASE_URL)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def ensure_schema():
    if not DATABASE_URL.startswith("sqlite"):
        return
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
