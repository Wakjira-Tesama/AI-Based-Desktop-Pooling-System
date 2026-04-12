from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from . import crud, models, schemas, database, auth
from seed_db import seed
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, date, datetime
from io import BytesIO
import logging
import os
import re
import shutil

import pytesseract
from PIL import Image, ImageOps, ImageFilter

import time
from sqlalchemy.exc import OperationalError

max_retries = 5
for attempt in range(max_retries):
    try:
        models.Base.metadata.create_all(bind=database.engine)
        database.ensure_schema()
        break
    except OperationalError as e:
        # Retry for transient errors like "SSL connection has been closed unexpectedly"
        if attempt < max_retries - 1:
            time.sleep(5)
        else:
            raise

seed() # Auto-seed on startup

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sdpms")

def _guard_db_operation(
    db: Session,
    operation: str,
    op,
    conflict_detail: str = "Conflict while saving data",
    failure_detail: str = "Request failed",
):
    try:
        return op()
    except HTTPException:
        raise
    except IntegrityError:
        db.rollback()
        logger.exception("%s integrity error", operation)
        raise HTTPException(status_code=409, detail=conflict_detail)
    except Exception:
        db.rollback()
        logger.exception("%s failed", operation)
        raise HTTPException(status_code=500, detail=failure_detail)

app = FastAPI(title="SDPMS API", description="Smart AI Desktop Pooling & Usage Management System")

ALLOWED_DESKTOP_STATUSES = {"offline", "available", "busy", "maintenance"}
STUDENT_ID_PATTERN = re.compile(r"^ugr/\d{4,6}/\d{2}$", re.IGNORECASE)
OCR_WHITELIST = "UGRugr0123456789/"

DEFAULT_CORS_ORIGINS = [
    "https://astudesktop.netlify.app",
    "http://localhost:5173",
    "http://localhost:5479",
    "http://localhost:5480",
]

cors_env = os.getenv("CORS_ORIGINS", "")
ALLOWED_CORS_ORIGINS = [
    origin.strip()
    for origin in cors_env.split(",")
    if origin.strip()
] or DEFAULT_CORS_ORIGINS

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
get_db = database.get_db

# ========== AUTH ENDPOINTS ==========

@app.get("/")
def read_root():
    return {"message": "Welcome to SDPMS API - Smart Desktop Pooling Management System"}

@app.post("/token", response_model=dict)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Try to find user by email first, then by student_id
    user = crud.get_student_by_email(db, form_data.username)
    if not user:
        user = crud.get_student_by_student_id(db, form_data.username)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not crud.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/students/login", response_model=dict)
def login_student_by_email(
    student_id: str = Form(...),
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    student = crud.get_student_by_student_id(db, student_id.strip())
    if not student or student.email.lower() != email.strip().lower():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect student ID or email",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(student.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=schemas.Student)
async def get_current_user_info(current_user: models.Student = Depends(auth.get_current_user)):
    return current_user

# ========== STUDENT ENDPOINTS ==========

@app.post("/students/", response_model=schemas.Student)
def create_student(
    student_id: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    password: str | None = Form(default=None),
    id_image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    def _op():
        if not STUDENT_ID_PATTERN.match(student_id.strip()):
            raise HTTPException(status_code=400, detail="Invalid student ID format")
        extracted_id, matched = extract_id_match(id_image, student_id)
        if not extracted_id:
            raise HTTPException(status_code=400, detail="University ID not found in image")
        if not matched:
            raise HTTPException(status_code=400, detail="Student ID does not match uploaded ID")
        # Check if email already exists
        db_student = crud.get_student_by_email(db, email=email)
        if db_student:
            raise HTTPException(status_code=400, detail="Email already registered")
        # Check if student_id already exists
        db_student = crud.get_student_by_student_id(db, student_id=student_id)
        if db_student:
            raise HTTPException(status_code=400, detail="Student ID already registered")
        student = schemas.StudentCreate(
            student_id=student_id,
            name=name,
            email=email,
            password=password,
        )
        return crud.create_student(db=db, student=student)

    return _guard_db_operation(
        db,
        "Create student",
        _op,
        conflict_detail="Student already registered",
        failure_detail="Failed to create student",
    )

@app.post("/students/verify-id")
def verify_student_id(
    student_id: str = Form(...),
    id_image: UploadFile = File(...),
):
    if not STUDENT_ID_PATTERN.match(student_id.strip()):
        raise HTTPException(status_code=400, detail="Invalid student ID format")
    extracted_id, matched = extract_id_match(id_image, student_id)
    if not extracted_id:
        raise HTTPException(status_code=400, detail="University ID not found in image")
    return {
        "extracted_id": extracted_id,
        "matches": matched,
    }

def extract_id_match(
    upload: UploadFile,
    expected_id: str | None,
) -> tuple[str | None, bool]:
    contents = upload.file.read()
    if not contents:
        return None, False
    try:
        image = Image.open(BytesIO(contents))
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
    except Exception:
        return None, False

    tesseract_cmd = resolve_tesseract_cmd()
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    else:
        raise HTTPException(status_code=503, detail="OCR engine not available")

    expected = expected_id.strip().lower() if expected_id else None
    fast_candidates = extract_id_candidates(image, fast=True)
    if expected:
        for candidate in fast_candidates:
            if candidate.lower() == expected:
                return candidate, True

    slow_candidates = extract_id_candidates(image, fast=False)
    if expected:
        for candidate in slow_candidates:
            if candidate.lower() == expected:
                return candidate, True

    combined = fast_candidates + [
        candidate for candidate in slow_candidates
        if candidate not in fast_candidates
    ]
    if combined:
        return combined[0], False
    return None, False

def extract_id_candidates(image: Image.Image, fast: bool) -> list[str]:
    candidates = []
    max_width = 800 if fast else 1200
    working = downscale_image(image, max_width=max_width)
    ocr_configs = [
        f"--oem 3 --psm 6 -c tessedit_char_whitelist={OCR_WHITELIST}",
    ]
    if not fast:
        ocr_configs.append(
            f"--oem 3 --psm 7 -c tessedit_char_whitelist={OCR_WHITELIST}"
        )

    try:
        variants = generate_image_variants(working, fast=fast)
        for variant in variants:
            for config in ocr_configs:
                text = pytesseract.image_to_string(variant, config=config)
                normalized = normalize_ocr_text(text)
                match = re.search(r"ugr[^0-9]*?(\d{4,6})[^0-9]*?(\d{2})", normalized)
                if match:
                    candidate = f"ugr/{match.group(1)}/{match.group(2)}"
                    if candidate not in candidates:
                        candidates.append(candidate)
    except Exception:
        return candidates
    return candidates

def downscale_image(image: Image.Image, max_width: int = 800) -> Image.Image:
    if image.width <= max_width:
        return image
    scale = max_width / image.width
    height = int(image.height * scale)
    return image.resize((max_width, height), Image.LANCZOS)

def preprocess_id_image(image: Image.Image, fast: bool) -> Image.Image:
    gray = ImageOps.grayscale(image)
    gray = ImageOps.autocontrast(gray)
    if fast:
        return gray
    gray = gray.filter(ImageFilter.MedianFilter(size=3))
    gray = gray.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    gray = gray.point(lambda x: 0 if x < 160 else 255, mode="1")
    return gray

def generate_image_variants(image: Image.Image, fast: bool) -> list[Image.Image]:
    variants = []
    angles = (0, 180) if fast else (0, 90, 180, 270)
    for angle in angles:
        rotated = image.rotate(angle, expand=True)
        variants.append(rotated)
        variants.append(preprocess_id_image(rotated, fast=fast))
    return variants

def normalize_ocr_text(text: str) -> str:
    cleaned = text.lower()
    cleaned = cleaned.replace(" ", "")
    cleaned = cleaned.replace("\n", "")
    cleaned = cleaned.replace("\r", "")
    cleaned = cleaned.replace("-", "/")
    cleaned = cleaned.replace("\\", "/")
    cleaned = cleaned.replace("|", "")
    cleaned = cleaned.replace("!", "1")
    cleaned = cleaned.replace("l", "1")
    cleaned = cleaned.replace("i", "1")
    cleaned = cleaned.replace("s", "5")
    cleaned = cleaned.replace("o", "0")
    return cleaned

def resolve_tesseract_cmd() -> str | None:
    env_cmd = os.getenv("TESSERACT_CMD")
    if env_cmd:
        return env_cmd

    path_cmd = shutil.which("tesseract")
    if path_cmd:
        return path_cmd

    if os.name != "nt":
        return None

    candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return candidate
    return None

@app.get("/students/", response_model=List[schemas.Student])
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    students = db.query(models.Student).offset(skip).limit(limit).all()
    return students

# ========== DESKTOP ENDPOINTS ==========

@app.get("/desktops/", response_model=List[schemas.Desktop])
def read_desktops(library: str | None = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    target_library = current_user.library if current_user.is_admin else library
    desktops = crud.get_desktops(db, skip=skip, limit=limit, library=target_library)
    return desktops

@app.get("/desktops/overview", response_model=List[schemas.DesktopOverview])
def read_desktops_overview(library: str | None = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_desktop_overview(db, skip=skip, limit=limit, library=library)

@app.post("/desktops/", response_model=schemas.Desktop)
def create_desktop(desktop: schemas.DesktopCreate, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # If library is not provided or is default, but the current admin has a library assigned,
    # use the admin's library to ensure they can see the desktop they just created.
    if current_user.library and (not desktop.library or desktop.library == "central"):
        desktop.library = current_user.library

    return _guard_db_operation(
        db,
        "Create desktop",
        lambda: crud.create_desktop(db=db, desktop=desktop),
        conflict_detail="Desktop already exists",
        failure_detail="Failed to create desktop",
    )

@app.patch("/desktops/{desktop_id}/status", response_model=schemas.Desktop)
def update_desktop_status_endpoint(
    desktop_id: int,
    payload: schemas.DesktopStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(auth.get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    if payload.status not in ALLOWED_DESKTOP_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    def _op():
        desktop = crud.update_desktop_status(db, desktop_id, payload.status)
        if not desktop:
            raise HTTPException(status_code=404, detail="Desktop not found")
        return desktop

    return _guard_db_operation(
        db,
        "Update desktop status",
        _op,
        failure_detail="Failed to update desktop status",
    )

@app.delete("/desktops/{desktop_id}")
def delete_desktop(desktop_id: int, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    def _op():
        success = crud.delete_desktop(db, desktop_id)
        if not success:
            raise HTTPException(status_code=404, detail="Desktop not found")
        return {"message": "Desktop deleted successfully"}

    return _guard_db_operation(
        db,
        "Delete desktop",
        _op,
        failure_detail="Failed to delete desktop",
    )

# ========== SESSION ENDPOINTS ==========

@app.get("/sessions/me", response_model=schemas.Session)
def get_my_active_session(db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    session = crud.get_active_session_by_student(db, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="No active session")
    return session

@app.get("/sessions/active", response_model=List[schemas.Session])
def get_active_sessions(db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return crud.get_active_sessions(db, library=current_user.library)

@app.post("/sessions/start", response_model=schemas.Session)
def start_session_endpoint(
    desktop_id: int,
    duration_minutes: int = 60,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(auth.get_current_user),
    device_id: str | None = Header(default=None, alias="X-Device-Id")
):
    def _op():
        # Check if user already has an active session
        existing_session = crud.get_active_session_by_student(db, current_user.id)
        if existing_session:
            raise HTTPException(status_code=400, detail="You already have an active session")

        # Check if desktop is available
        desktop = crud.get_desktop(db, desktop_id)
        if not desktop:
            raise HTTPException(status_code=404, detail="Desktop not found")
        if not current_user.is_admin:
            if not device_id:
                raise HTTPException(status_code=400, detail="Device ID required")
            pairing = crud.get_pairing_by_device_uuid(db, device_id)
            if not pairing or pairing.desktop_id != desktop.id:
                raise HTTPException(status_code=403, detail="Desktop not paired to this device")
        if desktop.status != "available":
            raise HTTPException(status_code=400, detail="Desktop is not available")

        if duration_minutes < 15 or duration_minutes > 240:
            raise HTTPException(status_code=400, detail="Duration must be between 15 and 240 minutes")

        session_data = schemas.SessionCreate(
            student_id=current_user.id,
            desktop_id=desktop_id,
            duration_minutes=duration_minutes
        )
        return crud.start_session(db=db, session=session_data)

    return _guard_db_operation(
        db,
        "Start session",
        _op,
        failure_detail="Failed to start session",
    )

@app.post("/sessions/register", response_model=schemas.Session)
def register_session_endpoint(
    desktop_id: int = Form(...),
    duration_minutes: int = Form(60),
    student_id: str = Form(...),
    name: str = Form(...),
    id_image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(auth.get_current_user),
):
    def _op():
        if student_id.strip().lower() != current_user.student_id.strip().lower():
            raise HTTPException(status_code=403, detail="Student ID mismatch")
        if name.strip().lower() != current_user.name.strip().lower():
            raise HTTPException(status_code=403, detail="Student name mismatch")

        if not STUDENT_ID_PATTERN.match(student_id.strip()):
            raise HTTPException(status_code=400, detail="Invalid student ID format")

        extracted_id, matched = extract_id_match(id_image, student_id)
        if not extracted_id:
            raise HTTPException(status_code=400, detail="University ID not found in image")
        if not matched:
            raise HTTPException(status_code=400, detail="Student ID does not match uploaded ID")

        existing_session = crud.get_active_session_by_student(db, current_user.id)
        if existing_session:
            raise HTTPException(status_code=400, detail="You already have an active session")

        desktop = crud.get_desktop(db, desktop_id)
        if not desktop:
            raise HTTPException(status_code=404, detail="Desktop not found")
        if desktop.status != "available":
            raise HTTPException(status_code=400, detail="Desktop is not available")

        if duration_minutes < 15 or duration_minutes > 240:
            raise HTTPException(status_code=400, detail="Duration must be between 15 and 240 minutes")

        session_data = schemas.SessionCreate(
            student_id=current_user.id,
            desktop_id=desktop_id,
            duration_minutes=duration_minutes,
        )
        return crud.start_session(db=db, session=session_data)

    return _guard_db_operation(
        db,
        "Register session",
        _op,
        failure_detail="Failed to register session",
    )

# ========== PAIRING ENDPOINTS ==========

@app.post("/pairings/register", response_model=schemas.DesktopPairing)
def register_pairing(payload: schemas.DesktopPairingCreate, db: Session = Depends(get_db)):
    def _op():
        desktop = crud.get_desktop_by_desktop_id(db, payload.desktop_id)
        if not desktop:
            raise HTTPException(status_code=404, detail="Desktop ID not found")

        existing_by_desktop = crud.get_pairing_by_desktop_id(db, desktop.id)
        if existing_by_desktop and existing_by_desktop.device_uuid != payload.device_uuid:
            raise HTTPException(status_code=409, detail="Desktop already paired")

        pairing = crud.upsert_pairing(db, payload.device_uuid, desktop.id)
        return schemas.DesktopPairing(
            id=pairing.id,
            device_uuid=pairing.device_uuid,
            desktop_id=pairing.desktop_id,
            desktop_code=desktop.desktop_id,
            paired_at=pairing.paired_at,
        )

    return _guard_db_operation(
        db,
        "Register pairing",
        _op,
        conflict_detail="Desktop already paired",
        failure_detail="Failed to register pairing",
    )

@app.post("/sessions/{session_id}/end", response_model=schemas.Session)
def end_session_endpoint(session_id: int, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    def _op():
        session = crud.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.student_id != current_user.id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Not authorized to end this session")
        return crud.end_session(db, session_id)

    return _guard_db_operation(
        db,
        "End session",
        _op,
        failure_detail="Failed to end session",
    )

# ========== SCHEDULE ENDPOINTS ==========

def _parse_time_string(value: str):
    try:
        return datetime.strptime(value, "%H:%M").time()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM")

def _ensure_time_order(start_value: str, end_value: str) -> None:
    start_time = _parse_time_string(start_value)
    end_time = _parse_time_string(end_value)
    if start_time >= end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time")

def _times_overlap(start_a, end_a, start_b, end_b) -> bool:
    return start_a < end_b and start_b < end_a

def _assert_slot_not_expired(entry_date: date, end_time_value: str) -> None:
    today = date.today()
    if entry_date < today:
        raise HTTPException(status_code=409, detail="Time slot already ended")
    if entry_date > today:
        return
    end_time = _parse_time_string(end_time_value)
    now_time = datetime.now().time()
    if now_time > end_time:
        raise HTTPException(status_code=409, detail="Time slot already ended")

def _is_schedule_entry_expired(entry_date: date, end_time_value: str) -> bool:
    today = date.today()
    if entry_date < today:
        return True
    if entry_date > today:
        return False
    end_time = _parse_time_string(end_time_value)
    now_time = datetime.now().time()
    return now_time >= end_time

def _assert_schedule_slot_available(
    db: Session,
    desktop_id: int,
    day: date,
    start_time: str,
    end_time: str,
    student_id: str,
) -> None:
    _ensure_time_order(start_time, end_time)
    existing = crud.get_schedule_entry(db, desktop_id, day, start_time, end_time)
    if existing and existing.student_id:
        if existing.student_id.strip().lower() != student_id.strip().lower():
            raise HTTPException(status_code=409, detail="Time slot already booked")

    entries = crud.get_student_schedule_entries_for_day(db, day, student_id)
    for entry in entries:
        if _is_schedule_entry_expired(entry.date, entry.end_time):
            continue
        if (
            entry.desktop_id == desktop_id
            and entry.start_time == start_time
            and entry.end_time == end_time
        ):
            continue
        raise HTTPException(
            status_code=409,
            detail="You already have a booking. Cancel it to register another.",
        )
    start_candidate = _parse_time_string(start_time)
    end_candidate = _parse_time_string(end_time)
    for entry in entries:
        if _is_schedule_entry_expired(entry.date, entry.end_time):
            continue
        if (
            entry.desktop_id == desktop_id
            and entry.start_time == start_time
            and entry.end_time == end_time
        ):
            continue
        start_existing = _parse_time_string(entry.start_time)
        end_existing = _parse_time_string(entry.end_time)
        if _times_overlap(start_candidate, end_candidate, start_existing, end_existing):
            raise HTTPException(
                status_code=409,
                detail="You already booked another time for this slot",
            )

@app.get("/schedule", response_model=List[schemas.ScheduleEntry])
def get_schedule(day: date | None = None, library: str | None = None, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    target_day = day or date.today()
    if current_user.is_admin and current_user.library:
        return crud.get_schedule_entries(db, target_day, library=current_user.library)
    return crud.get_schedule_entries(db, target_day, library=library)

@app.post("/schedule/entry", response_model=schemas.ScheduleEntry | dict)
def upsert_schedule(entry: schemas.ScheduleEntryCreate, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    def _op():
        _ensure_time_order(entry.start_time, entry.end_time)
        if (not entry.student_id) and (not entry.mark):
            existing = crud.get_schedule_entry(
                db,
                entry.desktop_id,
                entry.date,
                entry.start_time,
                entry.end_time,
            )
            if existing and (not current_user.is_admin):
                if existing.student_id.strip().lower() != current_user.student_id.strip().lower():
                    raise HTTPException(status_code=403, detail="Not authorized to clear this booking")
        if entry.student_id:
            if (not current_user.is_admin) and entry.student_id.strip().lower() != current_user.student_id.strip().lower():
                raise HTTPException(status_code=403, detail="Not authorized to book for another student")
            if not current_user.is_admin:
                _assert_slot_not_expired(entry.date, entry.end_time)
            _assert_schedule_slot_available(
                db,
                entry.desktop_id,
                entry.date,
                entry.start_time,
                entry.end_time,
                entry.student_id,
            )
        saved = crud.upsert_schedule_entry(db, entry)
        if not saved:
            return {"message": "Entry cleared"}
        return saved

    return _guard_db_operation(
        db,
        "Upsert schedule entry",
        _op,
        conflict_detail="Time slot already booked",
        failure_detail="Failed to update schedule",
    )

@app.post("/schedule/register", response_model=schemas.ScheduleEntry)
def register_schedule(
    desktop_id: int = Form(...),
    date_value: date = Form(..., alias="date"),
    start_time: str = Form(...),
    end_time: str = Form(...),
    student_id: str = Form(...),
    name: str = Form(...),
    id_image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(auth.get_current_user),
):
    def _op():
        if student_id.strip().lower() != current_user.student_id.strip().lower():
            raise HTTPException(status_code=403, detail="Student ID mismatch")
        if name.strip().lower() != current_user.name.strip().lower():
            raise HTTPException(status_code=403, detail="Student name mismatch")

        if not STUDENT_ID_PATTERN.match(student_id.strip()):
            raise HTTPException(status_code=400, detail="Invalid student ID format")

        if id_image is not None:
            extracted_id, matched = extract_id_match(id_image, student_id)
            if not extracted_id:
                raise HTTPException(status_code=400, detail="University ID not found in image")
            if not matched:
                raise HTTPException(status_code=400, detail="Student ID does not match uploaded ID")

        desktop = crud.get_desktop(db, desktop_id)
        if not desktop:
            raise HTTPException(status_code=404, detail="Desktop not found")

        _assert_slot_not_expired(date_value, end_time)

        _assert_schedule_slot_available(
            db,
            desktop_id,
            date_value,
            start_time,
            end_time,
            student_id,
        )

        entry = schemas.ScheduleEntryCreate(
            desktop_id=desktop_id,
            date=date_value,
            start_time=start_time,
            end_time=end_time,
            student_id=current_user.student_id,
            mark="reserved",
        )
        return crud.upsert_schedule_entry(db, entry)

    return _guard_db_operation(
        db,
        "Register schedule",
        _op,
        conflict_detail="Time slot already booked",
        failure_detail="Failed to register time slot",
    )

# ========== ISSUE REPORTS ==========

@app.post("/issues/report", response_model=schemas.IssueReport)
def report_issue(
    payload: schemas.IssueReportCreate,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(auth.get_current_user),
):
    def _op():
        entry = crud.get_schedule_entry(
            db,
            payload.desktop_id,
            payload.date,
            payload.start_time,
            payload.end_time,
        )
        if not entry or (entry.student_id or "").strip().lower() != current_user.student_id.strip().lower():
            raise HTTPException(status_code=403, detail="Not authorized to report for this booking")

        return crud.create_issue_report(db, payload, current_user.id)

    return _guard_db_operation(
        db,
        "Report issue",
        _op,
        failure_detail="Failed to report issue",
    )

@app.get("/issues", response_model=List[schemas.IssueReport])
def list_issue_reports(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(auth.get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return crud.get_issue_reports(db, library=current_user.library)

# ========== ANALYTICS ENDPOINTS ==========

@app.get("/analytics/stats")
def get_stats(db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    desktop_stats = crud.get_desktop_stats(db, library=current_user.library)
    total_sessions = crud.get_session_count(db, library=current_user.library)
    active_sessions = crud.get_active_session_count(db, library=current_user.library)
    
    return {
        "desktops": desktop_stats,
        "sessions": {
            "total": total_sessions,
            "active": active_sessions
        }
    }

# ========== AGENT HEARTBEAT ==========

@app.post("/agent/heartbeat")
def agent_heartbeat(status_update: schemas.HealthLogCreate, db: Session = Depends(get_db)):
    def _op():
        # Update desktop status
        crud.update_desktop_status(
            db,
            status_update.desktop_id,
            "available" if status_update.network_status == "connected" else "offline",
        )
        return {"status": "received"}

    return _guard_db_operation(
        db,
        "Agent heartbeat",
        _op,
        failure_detail="Failed to process heartbeat",
    )

