"""Script to launch the RepoDetective API backend server reliably."""

import os
import sys
from pathlib import Path

# Ensure backend root is in Python path
backend_root = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_root))
os.chdir(str(backend_root))

if __name__ == "__main__":
    import uvicorn
    # Listen on port 8000 by default (or PORT env var)
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting RepoDetective backend on http://127.0.0.1:{port}...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False)

