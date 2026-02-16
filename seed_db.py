"""Seed script to create initial accounts and desktops"""
import os

from backend.database import SessionLocal, engine
from backend import models, crud, schemas

# Create tables
models.Base.metadata.create_all(bind=engine)

def seed() -> None:
    student_id = os.getenv("SEED_STUDENT_ID", "STU001")
    student_name = os.getenv("SEED_STUDENT_NAME", "Test Student")
    student_email = os.getenv("SEED_STUDENT_EMAIL", "student@test.com")
    student_password = os.getenv("SEED_STUDENT_PASSWORD", "password123")

    admin_id = os.getenv("SEED_ADMIN_ID", "MGR001")
    admin_name = os.getenv("SEED_ADMIN_NAME", "Library Manager")
    admin_email = os.getenv("SEED_ADMIN_EMAIL", "manager@test.com")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "admin123")

    db = SessionLocal()

    try:
        # Create student account
        student_data = schemas.StudentCreate(
            student_id=student_id,
            name=student_name,
            email=student_email,
            password=student_password,
        )

        student_created = False
        student_existing_by_email = crud.get_student_by_email(db, student_email)
        student_existing_by_id = crud.get_student_by_student_id(db, student_id)
        student_existing = student_existing_by_id or student_existing_by_email
        if not student_existing:
            student = crud.create_student(db, student_data)
            student_created = True
            print(f"Created student: {student.name} ({student.email})")
        else:
            print(f"Student already exists: {student_existing.email}")

        # Create manager account (with is_admin = True)
        manager_data = schemas.StudentCreate(
            student_id=admin_id,
            name=admin_name,
            email=admin_email,
            password=admin_password,
        )

        manager_created = False
        manager_existing_by_email = crud.get_student_by_email(db, admin_email)
        manager_existing_by_id = crud.get_student_by_student_id(db, admin_id)
        manager_existing = manager_existing_by_id or manager_existing_by_email
        if not manager_existing:
            manager = crud.create_student(db, manager_data)
            manager_created = True
            manager.is_admin = True
            db.commit()
            print(f"Created manager: {manager.name} ({manager.email}) - ADMIN")
        else:
            print(f"Manager already exists: {manager_existing.email}")
            manager_existing.is_admin = True
            db.commit()
            print(f"Updated {manager_existing.email} to admin")

        desktops = [
            {"desktop_id": "LIB-001", "ip_address": "192.168.1.101", "status": "available"},
            {"desktop_id": "LIB-002", "ip_address": "192.168.1.102", "status": "available"},
            {"desktop_id": "LIB-003", "ip_address": "192.168.1.103", "status": "available"},
            {"desktop_id": "LIB-004", "ip_address": "192.168.1.104", "status": "offline"},
            {"desktop_id": "LIB-005", "ip_address": "192.168.1.105", "status": "available"},
        ]

        for desktop_data in desktops:
            existing_desktop = db.query(models.Desktop).filter(
                models.Desktop.desktop_id == desktop_data["desktop_id"]
            ).first()
            if not existing_desktop:
                desktop = models.Desktop(**desktop_data)
                db.add(desktop)
                db.commit()
                print(f"Created desktop: {desktop_data['desktop_id']} - {desktop_data['status']}")
            else:
                print(f"Desktop already exists: {desktop_data['desktop_id']}")

        student_login = student_email if student_created else student_existing.email
        manager_login = admin_email if manager_created else manager_existing.email

        print("\n=== SETUP COMPLETE ===")
        print("\nSeed Accounts:")
        if student_created:
            print(f"  Student: {student_login} / {student_password}")
        else:
            print(f"  Student: {student_login} (existing account, password unchanged)")

        if manager_created:
            print(f"  Manager: {manager_login} / {admin_password} (has admin access)")
        else:
            print(f"  Manager: {manager_login} (existing account, password unchanged, has admin access)")
        print("\nDesktops: 5 desktops ensured")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
