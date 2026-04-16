"""Gitvise CLI – administrative commands.

Usage:
    python -m cli reset-password
"""
import sys


def cmd_reset_password() -> None:
    """Interactively set a new admin password directly in the database."""
    import getpass
    from sqlalchemy import select
    from core.db import SessionLocal
    from core.auth import hash_password
    from models.settings import AppConfig

    print("Gitvise – Reset admin password")
    print("──────────────────────────────")

    password = getpass.getpass("New password (min 8 chars): ")
    if len(password) < 8:
        print("Error: password must be at least 8 characters.", file=sys.stderr)
        sys.exit(1)

    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        print("Error: passwords do not match.", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        hashed = hash_password(password)
        existing = db.execute(
            select(AppConfig).where(AppConfig.key == "admin_password_hash")
        ).scalar_one_or_none()

        if existing:
            existing.value = hashed
            existing.encrypted = False
        else:
            db.add(AppConfig(key="admin_password_hash", value=hashed, encrypted=False))

        db.commit()
        print("Password updated successfully. You can now log in at /login.")
    finally:
        db.close()


COMMANDS = {
    "reset-password": cmd_reset_password,
}


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(f"Usage: python -m cli <command>")
        print(f"Commands: {', '.join(COMMANDS)}")
        sys.exit(1)
    COMMANDS[sys.argv[1]]()


if __name__ == "__main__":
    main()
