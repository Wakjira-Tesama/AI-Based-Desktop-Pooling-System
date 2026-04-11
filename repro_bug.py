import requests

BASE_URL = "http://localhost:8000"

def test_repro():
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
    
    # Attempt to create desktop without library
    new_desktop = {
        "desktop_id": "TEST-REPRO-01",
        "ip_address": "192.168.1.50",
        "status": "available"
    }
    resp = requests.post(f"{BASE_URL}/desktops/", json=new_desktop, headers=headers)
    if resp.status_code == 200:
        print("Desktop created successfully (on backend)")
        created_desktop = resp.json()
        print(f"Created desktop library: {created_desktop.get('library')}")
    else:
        print(f"Creation failed: {resp.text}")
        return

    # Check desktops again
    resp = requests.get(f"{BASE_URL}/desktops/", headers=headers)
    final_count = len(resp.json())
    print(f"Final desktops for MGR001: {final_count}")
    
    if final_count == initial_count:
        print("REPRODUCED: Desktop was created but is not visible to the admin who created it!")
    else:
        print("Desktop is visible.")

if __name__ == "__main__":
    test_repro()
