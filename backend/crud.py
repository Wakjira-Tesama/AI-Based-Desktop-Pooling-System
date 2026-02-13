from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime, timedelta
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Student CRUD
def get_student(db: Session, student_id: int):
    return db.query(models.Student).filter(models.Student.id == student_id).first()

def get_student_by_email(db: Session, email: str):
    return db.query(models.Student).filter(models.Student.email == email).first()

def get_student_by_student_id(db: Session, student_id: str):
    return db.query(models.Student).filter(models.Student.student_id == student_id).first()

def create_student(db: Session, student: schemas.StudentCreate):
    hashed_password = get_password_hash(student.password)
    db_student = models.Student(
        student_id=student.student_id, 
        name=student.name, 
        email=student.email, 
        hashed_password=hashed_password
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

# Desktop CRUD
def get_desktops(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Desktop).offset(skip).limit(limit).all()

def get_desktop(db: Session, desktop_id: int):
    return db.query(models.Desktop).filter(models.Desktop.id == desktop_id).first()

def get_desktop_by_desktop_id(db: Session, desktop_id: str):
    return db.query(models.Desktop).filter(models.Desktop.desktop_id == desktop_id).first()

def create_desktop(db: Session, desktop: schemas.DesktopCreate):
    db_desktop = models.Desktop(**desktop.model_dump())
    db.add(db_desktop)
    db.commit()
    db.refresh(db_desktop)
    return db_desktop

def delete_desktop(db: Session, desktop_id: int):
    desktop = db.query(models.Desktop).filter(models.Desktop.id == desktop_id).first()
    if desktop:
        db.delete(desktop)
        db.commit()
        return True
    return False

def update_desktop_status(db: Session, desktop_id: int, status: str):
    desktop = db.query(models.Desktop).filter(models.Desktop.id == desktop_id).first()
    if desktop:
        desktop.status = status
        desktop.last_heartbeat = datetime.utcnow()
        db.commit()
        db.refresh(desktop)
    return desktop

def update_desktop_heartbeat(db: Session, desktop_id: int):
    desktop = db.query(models.Desktop).filter(models.Desktop.id == desktop_id).first()
    if desktop:
        desktop.last_heartbeat = datetime.utcnow()
        db.commit()
    return desktop

def _is_session_expired(session: models.Session) -> bool:
    if not session or not session.start_time:
        return False
    if not session.is_active:
        return False
    duration = session.duration_minutes or 60
    return datetime.utcnow() >= (session.start_time + timedelta(minutes=duration))

def _expire_session(db: Session, session: models.Session) -> None:
    session.end_time = datetime.utcnow()
    session.is_active = False
    update_desktop_status(db, session.desktop_id, "available")
    db.commit()
    db.refresh(session)

# Session CRUD
def get_active_session_by_student(db: Session, student_id: int):
    session = db.query(models.Session).filter(
        models.Session.student_id == student_id, 
        models.Session.is_active == True
    ).first()
    if session and _is_session_expired(session):
        _expire_session(db, session)
        return None
    return session

def get_active_sessions(db: Session):
    sessions = db.query(models.Session).filter(models.Session.is_active == True).all()
    active = []
    for session in sessions:
        if _is_session_expired(session):
            _expire_session(db, session)
        else:
            active.append(session)
    return active

def start_session(db: Session, session: schemas.SessionCreate):
    db_session = models.Session(**session.model_dump(), start_time=datetime.utcnow(), is_active=True)
    db.add(db_session)
    # Update desktop status to busy
    update_desktop_status(db, session.desktop_id, "busy")
    db.commit()
    db.refresh(db_session)
    return db_session

def end_session(db: Session, session_id: int):
    session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if session:
        session.end_time = datetime.utcnow()
        session.is_active = False
        # Update desktop status to available
        update_desktop_status(db, session.desktop_id, "available")
        db.commit()
        db.refresh(session)
    return session

def get_session(db: Session, session_id: int):
    return db.query(models.Session).filter(models.Session.id == session_id).first()

# Analytics
def get_session_count(db: Session):
    return db.query(models.Session).count()

def get_active_session_count(db: Session):
    return len(get_active_sessions(db))

def get_desktop_stats(db: Session):
    total = db.query(models.Desktop).count()
    available = db.query(models.Desktop).filter(models.Desktop.status == "available").count()
    busy = db.query(models.Desktop).filter(models.Desktop.status == "busy").count()
    offline = db.query(models.Desktop).filter(models.Desktop.status == "offline").count()
    return {"total": total, "available": available, "busy": busy, "offline": offline}

# Desktop Pairing
def get_pairing_by_device_uuid(db: Session, device_uuid: str):
    return db.query(models.DesktopPairing).filter(models.DesktopPairing.device_uuid == device_uuid).first()

def get_pairing_by_desktop_id(db: Session, desktop_id: int):
    return db.query(models.DesktopPairing).filter(models.DesktopPairing.desktop_id == desktop_id).first()

def upsert_pairing(db: Session, device_uuid: str, desktop_id: int):
    pairing = get_pairing_by_device_uuid(db, device_uuid)
    if pairing:
        pairing.desktop_id = desktop_id
        pairing.paired_at = datetime.utcnow()
    else:
        pairing = models.DesktopPairing(device_uuid=device_uuid, desktop_id=desktop_id)
        db.add(pairing)
    db.commit()
    db.refresh(pairing)
    return pairing

