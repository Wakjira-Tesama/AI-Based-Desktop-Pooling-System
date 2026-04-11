from backend.database import SessionLocal
from backend import crud, schemas, models
from datetime import datetime

def test_add_desktop():
    db = SessionLocal()
    try:
        # Check if desktop exists
        desktop_id = "TEST-PC-99"
        existing = crud.get_desktop_by_desktop_id(db, desktop_id)
        if existing:
            print(f"Skipping: {desktop_id} already exists")
            return

        desktop_in = schemas.DesktopCreate(
            desktop_id=desktop_id,
            ip_address="192.168.1.99",
            status="available",
            library="central"
        )
        
        print(f"Attempting to create desktop: {desktop_id}")
        new_desktop = crud.create_desktop(db, desktop_in)
        print(f"Success! Created desktop with ID: {new_desktop.id}")
        
    except Exception as e:
        print(f"Error creating desktop: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_add_desktop()
