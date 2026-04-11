import requests

BASE_URL = "http://localhost:8000"

def get_token():
    # Login as Central Library Manager (MGR002)
    response = requests.post(
        f"{BASE_URL}/token",
        data={"username": "MGR002", "password": "password123"}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def add_desktop(token):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "desktop_id": "NEW-PC-01",
        "ip_address": "192.168.1.200",
        "status": "available",
        "library": "central"
    }
    response = requests.post(f"{BASE_URL}/desktops/", json=payload, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    # Start the server in the background first if not running
    # but for now I'll just assume it might be running or I can test the CRUD directly.
    # Actually, testing CRUD directly is safer and faster.
    pass
