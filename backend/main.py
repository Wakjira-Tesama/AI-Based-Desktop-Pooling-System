from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import crud, models, schemas, database, auth
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from io import BytesIO
import os
import re
import shutil

import pytesseract
from PIL import Image, ImageOps, ImageFilter

models.Base.metadata.create_all(bind=database.engine)
database.ensure_schema()

app = FastAPI(title="SDPMS API", description="Smart AI Desktop Pooling & Usage Management System")

ALLOWED_DESKTOP_STATUSES = {"offline", "available", "busy", "maintenance"}
STUDENT_ID_PATTERN = re.compile(r"^ugr/\d{4,6}/\d{2}$", re.IGNORECASE)
OCR_WHITELIST = "UGRugr0123456789/"

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5479",
        "http://localhost:5480",
        "http://localhost:5481",
        "http://localhost:5482",
        "http://localhost:5483",
    ], # Frontend URLs
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

@app.get("/me", response_model=schemas.Student)
async def get_current_user_info(current_user: models.Student = Depends(auth.get_current_user)):
    return current_user

# ========== STUDENT ENDPOINTS ==========

@app.post("/students/", response_model=schemas.Student)
def create_student(
    student_id: str = Form(...),
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    id_image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not STUDENT_ID_PATTERN.match(student_id.strip()):
        raise HTTPException(status_code=400, detail="Invalid student ID format")
    extracted_id = extract_id_from_image(id_image)
    if not extracted_id:
        raise HTTPException(status_code=400, detail="University ID not found in image")
    if extracted_id.lower() != student_id.strip().lower():
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

@app.post("/students/verify-id")
def verify_student_id(
    student_id: str = Form(...),
    id_image: UploadFile = File(...),
):
    if not STUDENT_ID_PATTERN.match(student_id.strip()):
        raise HTTPException(status_code=400, detail="Invalid student ID format")
    extracted_id = extract_id_from_image(id_image)
    if not extracted_id:
        raise HTTPException(status_code=400, detail="University ID not found in image")
    match = extracted_id.lower() == student_id.strip().lower()
    return {
        "extracted_id": extracted_id,
        "matches": match,
    }

def extract_id_from_image(upload: UploadFile) -> str | None:
    contents = upload.file.read()
    if not contents:
        return None
    try:
        image = Image.open(BytesIO(contents))
        image = ImageOps.exif_transpose(image)
        if image.mode not in ("RGB", "L"):
            image = image.convert("RGB")
    except Exception:
        return None

    tesseract_cmd = resolve_tesseract_cmd()
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
    else:
        raise HTTPException(status_code=503, detail="OCR engine not available")

    ocr_configs = [
        f"--oem 3 --psm 6 -c tessedit_char_whitelist={OCR_WHITELIST}",
        f"--oem 3 --psm 7 -c tessedit_char_whitelist={OCR_WHITELIST}",
        f"--oem 3 --psm 11 -c tessedit_char_whitelist={OCR_WHITELIST}",
        f"--oem 3 --psm 12 -c tessedit_char_whitelist={OCR_WHITELIST}",
    ]
    candidates = []

    try:
        variants = generate_image_variants(image)
        for variant in variants:
            for config in ocr_configs:
                candidates.append(
                    pytesseract.image_to_string(variant, config=config)
                )
    except Exception:
        return None

    for text in candidates:
        normalized = normalize_ocr_text(text)
        match = re.search(r"ugr/\d{4,6}/\d{2}", normalized)
        if match:
            return match.group(0)
    return None

def preprocess_id_image(image: Image.Image) -> Image.Image:
    gray = ImageOps.grayscale(image)
    gray = ImageOps.autocontrast(gray)
    gray = gray.filter(ImageFilter.MedianFilter(size=3))
    gray = gray.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    gray = gray.resize((gray.width * 2, gray.height * 2), Image.LANCZOS)
    gray = gray.point(lambda x: 0 if x < 160 else 255, mode="1")
    return gray

def generate_image_variants(image: Image.Image) -> list[Image.Image]:
    variants = []
    for angle in (0, 90, 180, 270):
        rotated = image.rotate(angle, expand=True)
        variants.append(rotated)
        variants.append(preprocess_id_image(rotated))
    return variants

def normalize_ocr_text(text: str) -> str:
    cleaned = text.lower()
    cleaned = cleaned.replace(" ", "")
    cleaned = cleaned.replace("\n", "")
    cleaned = cleaned.replace("\r", "")
    cleaned = cleaned.replace("-", "/")
    cleaned = cleaned.replace("\\", "/")
    cleaned = cleaned.replace("|", "")
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
def read_desktops(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    desktops = crud.get_desktops(db, skip=skip, limit=limit)
    return desktops

@app.post("/desktops/", response_model=schemas.Desktop)
def create_desktop(desktop: schemas.DesktopCreate, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return crud.create_desktop(db=db, desktop=desktop)

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
    desktop = crud.update_desktop_status(db, desktop_id, payload.status)
    if not desktop:
        raise HTTPException(status_code=404, detail="Desktop not found")
    return desktop

@app.delete("/desktops/{desktop_id}")
def delete_desktop(desktop_id: int, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    success = crud.delete_desktop(db, desktop_id)
    if not success:
        raise HTTPException(status_code=404, detail="Desktop not found")
    return {"message": "Desktop deleted successfully"}

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
    return crud.get_active_sessions(db)

@app.post("/sessions/start", response_model=schemas.Session)
def start_session_endpoint(
    desktop_id: int,
    duration_minutes: int = 60,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(auth.get_current_user),
    device_id: str | None = Header(default=None, alias="X-Device-Id")
):
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

# ========== PAIRING ENDPOINTS ==========

@app.post("/pairings/register", response_model=schemas.DesktopPairing)
def register_pairing(payload: schemas.DesktopPairingCreate, db: Session = Depends(get_db)):
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

@app.post("/sessions/{session_id}/end", response_model=schemas.Session)
def end_session_endpoint(session_id: int, db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    session = crud.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.student_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to end this session")
    return crud.end_session(db, session_id)

# ========== ANALYTICS ENDPOINTS ==========

@app.get("/analytics/stats")
def get_stats(db: Session = Depends(get_db), current_user: models.Student = Depends(auth.get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    desktop_stats = crud.get_desktop_stats(db)
    total_sessions = crud.get_session_count(db)
    active_sessions = crud.get_active_session_count(db)
    
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
    # Update desktop status
    crud.update_desktop_status(db, status_update.desktop_id, "available" if status_update.network_status == "connected" else "offline")
    return {"status": "received"}

