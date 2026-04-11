from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime, timedelta, date
from passlib.context import CryptContext
import secrets

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
    raw_password = student.password or secrets.token_urlsafe(16)
    hashed_password = get_password_hash(raw_password)
    db_student = models.Student(
        student_id=student.student_id, 
        name=student.name, 
        email=student.email, 
        hashed_password=hashed_password,
        library=student.library
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

# Desktop CRUD
def get_desktops(db: Session, skip: int = 0, limit: int = 100, library: str = None):
    query = db.query(models.Desktop)
    if library:
        query = query.filter(models.Desktop.library == library)
    return query.offset(skip).limit(limit).all()

def get_desktop_overview(db: Session, skip: int = 0, limit: int = 100, library: str = None):
    desktops = get_desktops(db, skip=skip, limit=limit, library=library)
    active_sessions = get_active_sessions(db, library=library)
    active_by_desktop = {session.desktop_id: session for session in active_sessions}
    now = datetime.utcnow()
    overview = []

    for desktop in desktops:
        session = active_by_desktop.get(desktop.id)
        busy_until = None
        busy_remaining = None
        available_since = None

        if session:
            duration = session.duration_minutes or 60
            busy_until = session.start_time + timedelta(minutes=duration)
            remaining_seconds = max(0, (busy_until - now).total_seconds())
            busy_remaining = int((remaining_seconds + 59) // 60)
        elif desktop.status == "available" and desktop.last_heartbeat:
            available_since = desktop.last_heartbeat

        overview.append(
            {
                "id": desktop.id,
                "desktop_id": desktop.desktop_id,
                "ip_address": desktop.ip_address,
                "status": desktop.status,
                "library": desktop.library,
                "last_heartbeat": desktop.last_heartbeat,
                "busy_until": busy_until,
                "busy_remaining_minutes": busy_remaining,
                "available_since": available_since,
            }
        )

    return overview

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

def get_active_sessions(db: Session, library: str = None):
    query = db.query(models.Session).filter(models.Session.is_active == True)
    if library:
        query = query.join(models.Desktop).filter(models.Desktop.library == library)
    sessions = query.all()
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
def get_session_count(db: Session, library: str = None):
    query = db.query(models.Session)
    if library:
        query = query.join(models.Desktop).filter(models.Desktop.library == library)
    return query.count()

def get_active_session_count(db: Session, library: str = None):
    return len(get_active_sessions(db, library=library))

def get_desktop_stats(db: Session, library: str = None):
    query = db.query(models.Desktop)
    if library:
        query = query.filter(models.Desktop.library == library)
        
    total = query.count()
    available = query.filter(models.Desktop.status == "available").count()
    busy = query.filter(models.Desktop.status == "busy").count()
    offline = query.filter(models.Desktop.status == "offline").count()
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

# Schedule CRUD
def get_schedule_entries(db: Session, day: date, library: str = None):
    query = db.query(models.ScheduleEntry).filter(models.ScheduleEntry.date == day)
    if library:
        query = query.join(models.Desktop).filter(models.Desktop.library == library)
    return query.all()

def get_schedule_entry(
    db: Session,
    desktop_id: int,
    day: date,
    start_time: str,
    end_time: str,
):
    return db.query(models.ScheduleEntry).filter(
        models.ScheduleEntry.desktop_id == desktop_id,
        models.ScheduleEntry.date == day,
        models.ScheduleEntry.start_time == start_time,
        models.ScheduleEntry.end_time == end_time,
    ).first()

def get_student_schedule_entries(
    db: Session,
    desktop_id: int,
    day: date,
    student_id: str,
):
    return db.query(models.ScheduleEntry).filter(
        models.ScheduleEntry.desktop_id == desktop_id,
        models.ScheduleEntry.date == day,
        models.ScheduleEntry.student_id == student_id,
    ).all()

def get_student_schedule_entries_for_day(
    db: Session,
    day: date,
    student_id: str,
):
    return db.query(models.ScheduleEntry).filter(
        models.ScheduleEntry.date == day,
        models.ScheduleEntry.student_id == student_id,
    ).all()

def upsert_schedule_entry(db: Session, entry: schemas.ScheduleEntryCreate):
    existing = db.query(models.ScheduleEntry).filter(
        models.ScheduleEntry.desktop_id == entry.desktop_id,
        models.ScheduleEntry.date == entry.date,
        models.ScheduleEntry.start_time == entry.start_time,
        models.ScheduleEntry.end_time == entry.end_time,
    ).first()

    if (not entry.student_id) and (not entry.mark):
        if existing:
            db.delete(existing)
            db.commit()
        return None

    if existing:
        existing.student_id = entry.student_id
        existing.mark = entry.mark
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    new_entry = models.ScheduleEntry(
        desktop_id=entry.desktop_id,
        date=entry.date,
        start_time=entry.start_time,
        end_time=entry.end_time,
        student_id=entry.student_id,
        mark=entry.mark,
        updated_at=datetime.utcnow(),
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

# Issue Reports
def create_issue_report(
    db: Session,
    report: schemas.IssueReportCreate,
    student_id: int,
):
    db_report = models.IssueReport(
        student_id=student_id,
        desktop_id=report.desktop_id,
        date=report.date,
        start_time=report.start_time,
        end_time=report.end_time,
        category=report.category,
        description=report.description,
        status="open",
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

def get_issue_reports(db: Session, library: str = None):
    query = db.query(models.IssueReport)
    if library:
        query = query.join(models.Desktop).filter(models.Desktop.library == library)
    return query.order_by(models.IssueReport.created_at.desc()).all()

