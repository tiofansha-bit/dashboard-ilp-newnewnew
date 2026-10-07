"""Snapshot data DB ke JSON (masuk repo) & restore ke MongoDB.

Tujuan: menyimpan DATA ASLI (hasil migrasi) bersama kode di GitHub, sehingga
di environment mana pun bisa dipulihkan tanpa bergantung situs lama.

Pakai:
  python snapshot_data.py dump      # ekspor DB -> backend/snapshot/*.json
  python snapshot_data.py restore   # hapus koleksi lalu impor dari snapshot
"""
import os, sys, json
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

BASE = Path(__file__).parent
SNAP = BASE / "snapshot"
load_dotenv(BASE / ".env")

COLLECTIONS = ["users", "wilayah", "posyandu", "master_questions",
               "keluarga", "anggota", "kunjungan", "kasus",
               "notifikasi", "audit_logs", "akreditasi"]

def db():
    cli = MongoClient(os.environ["MONGO_URL"])
    return cli[os.environ["DB_NAME"]]

def dump():
    SNAP.mkdir(exist_ok=True)
    d = db()
    total = 0
    for c in COLLECTIONS:
        docs = list(d[c].find({}, {"_id": 0}))
        (SNAP / f"{c}.json").write_text(json.dumps(docs, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"dump {c}: {len(docs)}")
        total += len(docs)
    print("TOTAL:", total, "-> ", SNAP)

def restore():
    d = db()
    for c in COLLECTIONS:
        f = SNAP / f"{c}.json"
        if not f.exists():
            print(f"skip {c}: no snapshot"); continue
        docs = json.loads(f.read_text(encoding="utf-8"))
        d[c].delete_many({})
        if docs:
            d[c].insert_many(docs)
        print(f"restore {c}: {len(docs)}")
    print("=== RESTORE DONE ===")

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "dump"
    (dump if cmd == "dump" else restore)()
