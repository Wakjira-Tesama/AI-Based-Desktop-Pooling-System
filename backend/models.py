from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True) # University ID
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False)
    
    sessions = relationship("Session", back_populates="student")

class Desktop(Base):
    __tablename__ = "desktops"

    id = Column(Integer, primary_key=True, index=True)
    desktop_id = Column(String, unique=True, index=True) # e.g., "LIB-001"
    ip_address = Column(String)
    mac_address = Column(String, nullable=True)
    status = Column(String, default="offline") # offline, available, busy, maintenance
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    
    sessions = relationship("Session", back_populates="desktop")
    health_logs = relationship("HealthLog", back_populates="desktop")
    pairings = relationship("DesktopPairing", back_populates="desktop")

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    desktop_id = Column(Integer, ForeignKey("desktops.id"))
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    duration_minutes = Column(Integer, default=60)
    
    student = relationship("Student", back_populates="sessions")
    desktop = relationship("Desktop", back_populates="sessions")

class HealthLog(Base):
    __tablename__ = "health_logs"

    id = Column(Integer, primary_key=True, index=True)
    desktop_id = Column(Integer, ForeignKey("desktops.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    cpu_usage = Column(Float)
    ram_usage = Column(Float)
    network_status = Column(String) # connected, disconnected
    
    desktop = relationship("Desktop", back_populates="health_logs")


class DesktopPairing(Base):
    __tablename__ = "desktop_pairings"

    id = Column(Integer, primary_key=True, index=True)
    device_uuid = Column(String, unique=True, index=True)
    desktop_id = Column(Integer, ForeignKey("desktops.id"), unique=True)
    paired_at = Column(DateTime, default=datetime.utcnow)

    desktop = relationship("Desktop", back_populates="pairings")
