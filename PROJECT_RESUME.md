# AI-Based Desktop Pooling System - Project Resume

## 1) Project Summary

The AI-Based Desktop Pooling System (SDPMS) is a FastAPI + React application for managing shared library desktops. It supports student registration with ID verification, desktop booking, live session tracking, and admin monitoring. The AI/ML component uses OCR to verify student IDs from uploaded/captured images.

## 2) Goals

- Reduce queueing and manual desktop allocation.
- Ensure only verified students can reserve and use desktops.
- Provide admins with real-time visibility of usage and issues.
- Keep booking and session workflows simple and auditable.

## 3) Actors

- Student
- Admin/Librarian
- Desktop Agent (heartbeat sender)

## 4) System Architecture (High-Level)

```mermaid
graph LR
  Student[Student] -->|Web UI| FE[React/Vite Frontend]
  Admin[Admin/Librarian] -->|Web UI| FE
  FE -->|REST + JWT| API[FastAPI API]
  API --> DB[(SQL DB: SQLite or Postgres)]
  Agent[Desktop Agent] -->|Heartbeat| API
  API --> OCR[OCR Engine (Tesseract)]
```

## 5) Core Use Cases

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

