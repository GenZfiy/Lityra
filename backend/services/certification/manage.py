"""CLI: init-db | serve | run."""
from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

from app.config import CertificationConfig  # noqa: E402
from app.factory import build_app  # noqa: E402
from app.service import CertificationService  # noqa: E402
from lare_common.db import Database  # noqa: E402


def cmd_init_db():
    cfg = CertificationConfig()
    import app.models  # noqa: F401
    Database(cfg.DATABASE_URL, echo=cfg.SQL_ECHO, schema=cfg.DB_SCHEMA).create_all()
    print(f"[init-db] tables created on {cfg.DATABASE_URL}")


def cmd_migrate_verify_ids():
    """Rotate enumerable legacy public certificate verification IDs."""
    cfg = CertificationConfig()
    import app.models  # noqa: F401
    db = Database(cfg.DATABASE_URL, echo=False, schema=cfg.DB_SCHEMA)
    with db.session() as s:
        count = CertificationService().rotate_weak_verify_ids(s)
    print(f"[migrate-verify-ids] rotated {count} legacy verification IDs")


def cmd_serve():
    from lare_common.serve import serve
    cmd_migrate_verify_ids()
    serve(build_app(), host="127.0.0.1", port=int(os.getenv("PORT", "8009")))


def cmd_run():
    cmd_migrate_verify_ids()
    build_app().run(host="127.0.0.1", port=int(os.getenv("PORT", "8009")), debug=True)


COMMANDS = {"init-db": cmd_init_db, "migrate-verify-ids": cmd_migrate_verify_ids,
            "serve": cmd_serve, "run": cmd_run}

if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print("Usage: python manage.py [init-db|migrate-verify-ids|serve|run]")
        raise SystemExit(1)
    COMMANDS[sys.argv[1]]()
