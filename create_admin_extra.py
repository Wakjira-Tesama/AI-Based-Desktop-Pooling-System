
from backend.database import SessionLocal
from backend import models, crud, schemas

def create_admin():
    db = SessionLocal()
    try:
        admin_data = schemas.StudentCreate(
            student_id="ADM/0001/18",
            name="System Administrator",
            email="admin@astu.edu",
            password="AdminPassword@2026"
        )
        
        # Check if already exists
        existing = crud.get_student_by_email(db, admin_data.email)
        if not existing:
            admin = crud.create_student(db, admin_data)
            admin.is_admin = True
            db.commit()
            print(f"Admin account created successfully: {admin_data.email} / {admin_data.password}")
        else:
            existing.is_admin = True
            db.commit()
            print(f"Admin account already exists and is now an admin: {admin_data.email}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
