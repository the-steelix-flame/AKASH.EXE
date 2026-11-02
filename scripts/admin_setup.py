r"""Create the private analytics-admin credentials. Nothing is stored in the repo.

    backend\.venv\Scripts\python scripts\admin_setup.py

Prints the three environment variables to set on the backend (backend/.env locally, or the
Render dashboard in production). The plain password is shown ONCE; only its bcrypt hash is stored.
"""
import getpass
import secrets
import sys

import bcrypt

pw = getpass.getpass("Choose an admin password (min 12 characters): ") if sys.stdin.isatty() else sys.stdin.readline().strip()
if len(pw) < 12:
    sys.exit("Password must be at least 12 characters.")
hashed = bcrypt.hashpw(pw.encode()[:72], bcrypt.gensalt(rounds=12)).decode()
print("\nAdd these to the backend environment (never to the frontend):\n")
print("ADMIN_USERNAME=admin")
print(f"ADMIN_PASSWORD_HASH={hashed}")
print(f"ADMIN_JWT_SECRET={secrets.token_urlsafe(48)}")
