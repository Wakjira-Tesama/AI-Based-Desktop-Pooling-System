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

    admin_accounts = [
        {
            "id": os.getenv("SEED_ADMIN_1_ID", "MGR001"),
            "name": os.getenv("SEED_ADMIN_1_NAME", "Applied Library Manager"),
            "email": os.getenv("SEED_ADMIN_1_EMAIL", "admin_applied@astu.edu"),
            "password": os.getenv("SEED_ADMIN_1_PASSWORD", "password123"),
            "library": "applied"
        },
        {
            "id": os.getenv("SEED_ADMIN_2_ID", "MGR002"),
            "name": os.getenv("SEED_ADMIN_2_NAME", "Central Library Manager"),
            "email": os.getenv("SEED_ADMIN_2_EMAIL", "admin_central@astu.edu"),
            "password": os.getenv("SEED_ADMIN_2_PASSWORD", "password123"),
            "library": "central"
        },
    ]

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

        # Create admin accounts
        admin_results = []
        for admin in admin_accounts:
            manager_data = schemas.StudentCreate(
                student_id=admin["id"],
                name=admin["name"],
                email=admin["email"],
                password=admin["password"],
                library=admin["library"],
            )
            manager_existing_by_email = crud.get_student_by_email(db, admin["email"])
            manager_existing_by_id = crud.get_student_by_student_id(db, admin["id"])
            manager_existing = manager_existing_by_id or manager_existing_by_email
            if not manager_existing:
                manager = crud.create_student(db, manager_data)
                manager.is_admin = True
                db.commit()
                admin_results.append((admin["email"], admin["password"], True))
                print(f"Created manager: {manager.name} ({manager.email}) - ADMIN")
            else:
                manager_existing.is_admin = True
                db.commit()
                admin_results.append((manager_existing.email, None, False))
                print(f"Manager already exists: {manager_existing.email}")

        desktops = [
            {"desktop_id": "APL-001", "ip_address": "192.168.2.101", "status": "available", "library": "applied"},
            {"desktop_id": "APL-002", "ip_address": "192.168.2.102", "status": "available", "library": "applied"},
            {"desktop_id": "CEN-001", "ip_address": "192.168.1.101", "status": "available", "library": "central"},
            {"desktop_id": "CEN-002", "ip_address": "192.168.1.102", "status": "offline", "library": "central"},
            {"desktop_id": "CEN-003", "ip_address": "192.168.1.103", "status": "available", "library": "central"},
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
        manager_logins = admin_results

        print("\n=== SETUP COMPLETE ===")
        print("\nSeed Accounts:")
        if student_created:
            print(f"  Student: {student_login} / {student_password}")
        else:
            print(f"  Student: {student_login} (existing account, password unchanged)")

        for email, password, created in manager_logins:
            if created:
                print(f"  Manager: {email} / {password} (has admin access)")
            else:
                print(f"  Manager: {email} (existing account, password unchanged, has admin access)")
        print("\nDesktops: 5 desktops ensured")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
