#!/usr/bin/env python3
"""Standalone MongoDB Atlas seeder for SI SANTRI (SMP NEGERI 2 PANJI).

Seeds classes, teachers, students, parents, and users collections from
seed_data_santri.json into the MongoDB Atlas database configured via the
MONGO_URL / DB_NAME environment variables in backend/.env.

Usage:
    python seed_mongo.py            # seeds only if `users` collection is empty
    python seed_mongo.py --force    # wipes and re-seeds all collections
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from database import db  # noqa: E402
from seed_logic import seed_if_needed  # noqa: E402


async def main(force: bool = False):
    if force:
        for coll in ["classes", "teachers", "students", "parents", "users", "daily_reports"]:
            await db[coll].delete_many({})
        print("Existing collections cleared.")
    await seed_if_needed()
    counts = {
        name: await db[name].count_documents({})
        for name in ["classes", "teachers", "students", "parents", "users", "daily_reports"]
    }
    print("Seed finished. Current document counts:")
    for name, count in counts.items():
        print(f"  - {name}: {count}")


if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    asyncio.run(main(force_flag))
