from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Student Schemas
class StudentBase(BaseModel):
    student_id: str
    name: str
    email: str

class StudentCreate(StudentBase):
    password: str

class StudentLogin(BaseModel):
    student_id: str
    password: str

class Student(StudentBase):
    id: int
    is_admin: bool
    class Config:
        from_attributes = True

# Desktop Schemas
class DesktopBase(BaseModel):
    desktop_id: str
    ip_address: str
    mac_address: Optional[str] = None
    status: str = "offline"

class DesktopCreate(DesktopBase):
    pass

class DesktopStatusUpdate(BaseModel):
    status: str

class Desktop(DesktopBase):
    id: int
    last_heartbeat: Optional[datetime]
    class Config:
        from_attributes = True

# Session Schemas
class SessionBase(BaseModel):
    student_id: int
    desktop_id: int
    duration_minutes: int = 60

class SessionCreate(SessionBase):
    pass

class Session(SessionBase):
    id: int
    start_time: datetime
    end_time: Optional[datetime]
    is_active: bool
    class Config:
        from_attributes = True

# HealthLog Schema
class HealthLogCreate(BaseModel):
    desktop_id: int
    cpu_usage: float
    ram_usage: float
    network_status: str

class HealthLog(HealthLogCreate):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True
