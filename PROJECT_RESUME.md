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
