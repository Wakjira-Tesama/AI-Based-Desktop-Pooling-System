"""Seed script to create initial accounts and desktops"""
import sys
import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, '.')

from backend.database import SessionLocal, engine
from backend import models, crud, schemas

# Create tables
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

try:
    # Create student account
    student_data = schemas.StudentCreate(
        student_id="STU001",
        name="Test Student",
        email="student@test.com",
        password="password123"
    )
    
    existing = crud.get_student_by_email(db, "student@test.com")
    if not existing:
        student = crud.create_student(db, student_data)
        print(f"Created student: {student.name} ({student.email})")
    else:
        print(f"Student already exists: {existing.email}")
    
    # Create manager account (with is_admin = True)
    manager_data = schemas.StudentCreate(
        student_id="MGR001",
        name="Library Manager",
        email="manager@test.com",
        password="admin123"
    )
    
    existing = crud.get_student_by_email(db, "manager@test.com")
    if not existing:
        manager = crud.create_student(db, manager_data)
        # Set as admin
        manager.is_admin = True
        db.commit()
        print(f"Created manager: {manager.name} ({manager.email}) - ADMIN")
    else:
        print(f"Manager already exists: {existing.email}")
        # Ensure is_admin is True
        existing.is_admin = True
        db.commit()
        print(f"Updated {existing.email} to admin")
    
    # Create some desktops
    desktops = [
        {"desktop_id": "LIB-001", "ip_address": "192.168.1.101", "status": "available"},
        {"desktop_id": "LIB-002", "ip_address": "192.168.1.102", "status": "available"},
        {"desktop_id": "LIB-003", "ip_address": "192.168.1.103", "status": "available"},
        {"desktop_id": "LIB-004", "ip_address": "192.168.1.104", "status": "offline"},
        {"desktop_id": "LIB-005", "ip_address": "192.168.1.105", "status": "available"},
    ]
    
    for d in desktops:
        existing = db.query(models.Desktop).filter(models.Desktop.desktop_id == d["desktop_id"]).first()
        if not existing:
            desktop = models.Desktop(**d)
            db.add(desktop)
            db.commit()
            print(f"Created desktop: {d['desktop_id']} - {d['status']}")
        else:
            print(f"Desktop already exists: {d['desktop_id']}")
    
    print("\n=== SETUP COMPLETE ===")
    print("\nTest Accounts:")
    print("  Student: student@test.com / password123")
    print("  Manager: manager@test.com / admin123 (has admin access)")
    print("\nDesktops: 5 desktops created (4 available, 1 offline)")

finally:
    db.close()
