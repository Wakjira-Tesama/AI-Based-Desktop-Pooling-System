# AI-Based Desktop Pooling System (SDPMS)

SDPMS is a FastAPI + React system for managing shared library desktops. It supports student registration with ID verification, desktop booking, live session tracking, and admin monitoring. The AI/ML component uses OCR to verify student IDs from uploaded or camera-captured images.

## Table of Contents

- Overview
- Features
- Actors
- System Architecture
- Use Cases
- Data Model and ER Diagram
- Sequence Diagrams
- AI/ML Component
- Key API Capabilities
- Getting Started
- Security and Access Control
- Deployment Notes
- Scope and Limitations

## Overview

- Reduce queueing and manual desktop allocation.
- Ensure only verified students can reserve and use desktops.
- Provide admins with real-time visibility of usage and issues.
- Keep booking and session workflows simple and auditable.

## Features

- Student registration with ID OCR verification
- Desktop pairing to a device for trusted session start
- Time-slot booking with conflict checks
- Live session tracking and admin monitoring
- Issue reporting linked to valid bookings

## Actors

- Student
- Admin/Librarian
- Desktop Agent (heartbeat sender)

## System Architecture

```mermaid
graph LR
  Student[Student] -->|Web UI| FE[React/Vite Frontend]
  Admin[Admin/Librarian] -->|Web UI| FE
  FE -->|REST + JWT| API[FastAPI API]
  API --> DB[(SQL DB: SQLite or Postgres)]
  Agent[Desktop Agent] -->|Heartbeat| API
  API --> OCR[OCR Engine (Tesseract)]
```

## Use Cases

```mermaid
graph TD
  Student((Student)) --> UC1[Register account with ID OCR]
  Student --> UC2[Login (student)]
  Student --> UC3[Pair device to desktop]
  Student --> UC4[Book a time slot]
  Student --> UC5[Start desktop session]
  Student --> UC6[End session]
  Student --> UC7[Report issue]

  Admin((Admin)) --> UA1[Login (admin)]
  Admin --> UA2[Manage desktops]
  Admin --> UA3[Monitor sessions]
  Admin --> UA4[View issue reports]
  Admin --> UA5[View analytics]

  Agent((Desktop Agent)) --> UH1[Send heartbeat]
```

## Data Model and ER Diagram

- Student: id, student_id, name, email, hashed_password, is_admin
- Desktop: id, desktop_id, ip_address, mac_address, status, last_heartbeat
- Session: id, student_id, desktop_id, start_time, end_time, is_active, duration_minutes
- DesktopPairing: device_uuid, desktop_id, paired_at
- ScheduleEntry: desktop_id, date, start_time, end_time, student_id, mark
- IssueReport: desktop_id, student_id, date, time range, category, description, status

```mermaid
erDiagram
  STUDENTS ||--o{ SESSIONS : has
  DESKTOPS ||--o{ SESSIONS : hosts
  DESKTOPS ||--o{ HEALTH_LOGS : reports
  DESKTOPS ||--o{ DESKTOP_PAIRINGS : pairs
  DESKTOPS ||--o{ SCHEDULE_ENTRIES : schedules
  STUDENTS ||--o{ ISSUE_REPORTS : submits
  DESKTOPS ||--o{ ISSUE_REPORTS : affected_by

  STUDENTS {
    int id
    string student_id
    string name
    string email
    string hashed_password
    bool is_admin
  }

  DESKTOPS {
    int id
    string desktop_id
    string ip_address
    string mac_address
    string status
    datetime last_heartbeat
  }

  SESSIONS {
    int id
    int student_id
    int desktop_id
    datetime start_time
    datetime end_time
    bool is_active
    int duration_minutes
  }

  HEALTH_LOGS {
    int id
    int desktop_id
    datetime timestamp
    float cpu_usage
    float ram_usage
    string network_status
  }

  DESKTOP_PAIRINGS {
    int id
    string device_uuid
    int desktop_id
    datetime paired_at
  }

  SCHEDULE_ENTRIES {
    int id
    int desktop_id
    date date
    string start_time
    string end_time
    string student_id
    string mark
    datetime updated_at
  }

  ISSUE_REPORTS {
    int id
    int student_id
    int desktop_id
    date date
    string start_time
    string end_time
    string category
    string description
    string status
    datetime created_at
  }
```

## AI/ML Component (OCR Verification)

- Purpose: Confirm the student ID on an uploaded or camera-captured university ID.
- Engine: Tesseract OCR via `pytesseract`.
- Flow:
  - Normalize image orientation.
  - Preprocess (grayscale, contrast, median filter, thresholding).
  - Run OCR with whitelist (`UGRugr0123456789/`).
  - Normalize and extract candidate IDs using a regex pattern.
  - Match against expected `ugr/NNNNN/NN` format.

## Key API Capabilities

- Auth: `/token`, `/students/login`, `/me`
- Student: `/students/`, `/students/verify-id`
- Desktops: `/desktops/`, `/desktops/overview`, `/desktops/{id}/status`
- Sessions: `/sessions/start`, `/sessions/me`, `/sessions/active`, `/sessions/{id}/end`
- Pairing: `/pairings/register`
- Schedule: `/schedule`, `/schedule/register`, `/schedule/entry`
- Issues: `/issues/report`, `/issues`
- Analytics: `/analytics/stats`
- Agent heartbeat: `/agent/heartbeat`

## Sequence Diagrams

### Student Registration with OCR

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as FastAPI
  participant OCR as Tesseract OCR
  participant DB as Database

  S->>FE: Fill registration form + upload/capture ID
  FE->>API: POST /students/verify-id (image + student_id)
  API->>OCR: Extract and match student_id
  OCR-->>API: extracted_id + match result
  API-->>FE: Verification result
  FE->>API: POST /students/ (form + image)
  API->>DB: Create student
  DB-->>API: Student record
  API-->>FE: Student created
  FE->>API: POST /students/login
  API-->>FE: JWT token
```

### Schedule Booking (Student)

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as FastAPI
  participant DB as Database

  S->>FE: Select desktop + time slot
  FE->>API: POST /schedule/register
  API->>DB: Check conflicts + save booking
  DB-->>API: Booking saved
  API-->>FE: Booking confirmation
```

### Start Session (Device Pairing Required)

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as FastAPI
  participant DB as Database

  S->>FE: Start session
  FE->>API: POST /sessions/start (X-Device-Id)
  API->>DB: Validate pairing + availability
  DB-->>API: Session created + desktop busy
  API-->>FE: Session details
```

### Admin Management (Status + End Session)

```mermaid
sequenceDiagram
  participant A as Admin
  participant FE as Frontend
  participant API as FastAPI
  participant DB as Database

  A->>FE: Update desktop status
  FE->>API: PATCH /desktops/{id}/status
  API->>DB: Update status
  DB-->>API: Updated desktop
  API-->>FE: Success

  A->>FE: End a student session
  FE->>API: POST /sessions/{id}/end
  API->>DB: End session + set desktop available
  DB-->>API: Session ended
  API-->>FE: Success
```

### Schedule Booking with Conflict Handling

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as FastAPI
  participant DB as Database

  S->>FE: Choose desktop + time slot
  FE->>API: POST /schedule/register
  API->>DB: Check time slot availability
  alt Slot already booked by another student
    DB-->>API: Conflict
    API-->>FE: 409 Time slot already booked
  else Student already has booking that day
    DB-->>API: Conflict
    API-->>FE: 409 Already have a booking
  else Overlapping booking
    DB-->>API: Conflict
    API-->>FE: 409 Overlapping time slot
  else Slot available
    API->>DB: Save schedule entry
    DB-->>API: Entry saved
    API-->>FE: Booking confirmation
  end
```

### Issue Reporting (Authorized Booking)

```mermaid
sequenceDiagram
  participant S as Student
  participant FE as Frontend
  participant API as FastAPI
  participant DB as Database

  S->>FE: Submit issue report
  FE->>API: POST /issues/report
  API->>DB: Verify booking exists for student
  alt No matching booking
    DB-->>API: Not found or mismatch
    API-->>FE: 403 Not authorized
  else Booking valid
    API->>DB: Create issue report
    DB-->>API: Report saved
    API-->>FE: Issue report created
  end
```

## Getting Started

### Prerequisites

- Python 3.12+ (venv recommended)
- Node.js 18+
- Tesseract OCR installed or `TESSERACT_CMD` set

### Backend

```bash
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

### Environment Variables

- `DATABASE_URL`: Postgres or SQLite connection string
- `SECRET_KEY`: JWT signing key
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT expiration in minutes
- `CORS_ORIGINS`: comma-separated list of allowed origins
- `TESSERACT_CMD`: path to Tesseract binary
- `VITE_API_URL`: frontend API base URL

## Security and Access Control

- JWT-based auth for both student and admin sessions.
- Admin-only endpoints guarded by `is_admin`.
- Student endpoints check ownership of sessions and bookings.
- Desktop pairing enforces device-level trust for session start.

## Deployment Notes

- Backend supports SQLite (default) and Postgres via `DATABASE_URL`.
- CORS is configurable via `CORS_ORIGINS`.
- OCR requires Tesseract installed or `TESSERACT_CMD` set.
- Frontend uses Vite; API URL via `VITE_API_URL`.

## Scope and Limitations

- AI/ML is limited to OCR verification; no predictive allocation model.
- Scheduling is daily and time-slot based.
- Desktop agent only reports heartbeat status (no full telemetry upload).
