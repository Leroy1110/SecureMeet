import os
import sys
from pathlib import Path

os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret")

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))
