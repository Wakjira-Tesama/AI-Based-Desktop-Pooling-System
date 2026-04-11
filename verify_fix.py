import requests

BASE_URL = "http://localhost:8000"

def test_verify():
    # Login as Applied Manager
    login_data = {
        "username": "MGR001", # Admin ID
        "password": "password123"
    }
    resp = requests.post(f"{BASE_URL}/token", data=login_data)
    if resp.status_code != 200:
        print(f"Login failed: {resp.text}")
        return
    
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check current desktops
    resp = requests.get(f"{BASE_URL}/desktops/", headers=headers)
    initial_count = len(resp.json())
    print(f"Initial desktops for MGR001: {initial_count}")
    
    # Attempt to create desktop without library (backend should now fix it)
    new_desktop = {
        "desktop_id": "TEST-FIX-02",
        "ip_address": "192.168.2.151",
        "status": "available"
    }
    resp = requests.post(f"{BASE_URL}/desktops/", json=new_desktop, headers=headers)
    if resp.status_code == 200:
        print("Desktop created successfully")
        created_desktop = resp.json()
        print(f"Created desktop library: {created_desktop.get('library')}")
    else:
        print(f"Creation failed: {resp.text}")
        return

    # Check desktops again
    resp = requests.get(f"{BASE_URL}/desktops/", headers=headers)
    final_count = len(resp.json())
    print(f"Final desktops for MGR001: {final_count}")
    
    if final_count == initial_count + 1:
        print("VERIFIED: Desktop was created and is now visible to the admin!")
    else:
        print("FIX FAILED: Desktop is still not visible.")

if __name__ == "__main__":
    test_verify()
