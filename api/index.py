"""
Vercel Python Function entry point.
Wraps the FastAPI app from ui/backend/main.py with mangum so it can run as a
Vercel serverless function. All /api/* requests are rewritten to this handler.
"""
import os
import sys
from pathlib import Path

# Project root = parent of the api/ directory
PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)

# Ensure scripts and backend are on the Python path
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "ui", "backend"))

# Set env defaults for the Vercel environment
os.environ.setdefault("PROJECT_ROOT", PROJECT_ROOT)
os.environ.setdefault("JOB_DIR", "/tmp/jobs")

from mangum import Mangum  # noqa: E402
from main import app  # noqa: E402  (ui/backend/main.py)

handler = Mangum(app, lifespan="off")
