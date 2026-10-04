# AutoTrust API (FastAPI). Build from the backend/ folder:
#   docker build -t autotrust-api backend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first, so this layer is cached until requirements.txt changes.
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app ./app

# Uploaded photos (when Cloudinary isn't configured) live in /data: mount a
# volume there. The database is normally Neon, set through DATABASE_URL.
# Settings come from environment variables, not a baked-in .env: see
# docker-compose.yml. /app is writable only so the SQLite fallback works.
RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /data/uploads \
    && chown -R appuser /data /app
USER appuser

ENV AUTOTRUST_UPLOAD_DIR=/data/uploads

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/', timeout=4)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
