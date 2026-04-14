FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend /app/backend
COPY seed_db.py /app/seed_db.py

ENV PYTHONPATH=/app

CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
