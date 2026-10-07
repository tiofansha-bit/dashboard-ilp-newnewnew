"""One-off migration: copy REAL data from the previous production site into this
preview MongoDB by reading the old app's API (same app/code) and writing docs directly.

Pulls: kader, keluarga (+anggota), kunjungan (+per_anggota detail), kasus, akreditasi.
Kader/admin passwords cannot be read from the API (stored hashed), so accounts are
recreated with default passwords: admin/admin123, kader*/kader123.
"""
import os, sys, requests, bcrypt
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent / ".env")
OLD = "https://melati-health-app.emergent.host"
ADMIN_USER, ADMIN_PASS = "admin", "admin123"

def hash_password(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def log(*a):
    print(*a, flush=True)

def main():
    s = requests.Session()
    r = s.post(f"{OLD}/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=30)
    r.raise_for_status()
    body = r.json()
    token = body["access_token"]
    admin_user = body["user"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    log("Login OK as admin:", admin_user["id"])

    # ---- fetch kaders ----
    kaders = s.get(f"{OLD}/api/admin/kader", timeout=60).json()
    log(f"kaders: {len(kaders)}")

    # ---- fetch keluarga (paginate) + anggota via detail ----
    keluarga, anggota = [], []
    page = 1
    while True:
        d = s.get(f"{OLD}/api/keluarga", params={"page": page, "limit": 100}, timeout=60).json()
        items = d.get("items", [])
        if not items:
            break
        for it in items:
            det = s.get(f"{OLD}/api/keluarga/{it['id']}", timeout=60).json()
            ang = det.pop("anggota", []) or []
            for k in ("jumlah_anggota_aktual", "sudah_dikunjungi"):
                det.pop(k, None)
            keluarga.append(det)
            for a in ang:
                for ck in ("umur", "kelompok", "kelompok_label"):
                    a.pop(ck, None)
                anggota.append(a)
        if len(keluarga) >= d.get("total", 0):
            break
        page += 1
    log(f"keluarga: {len(keluarga)}, anggota: {len(anggota)}")

    # ---- fetch kunjungan detail (per_anggota) ----
    kunj_list = s.get(f"{OLD}/api/kunjungan", timeout=60).json()
    kunjungan = []
    for v in kunj_list:
        kunjungan.append(s.get(f"{OLD}/api/kunjungan/{v['id']}", timeout=60).json())
    log(f"kunjungan: {len(kunjungan)}")

    # ---- fetch kasus ----
    kd = s.get(f"{OLD}/api/kasus", timeout=120).json()
    kasus = kd if isinstance(kd, list) else kd.get("items", [])
    log(f"kasus: {len(kasus)}")

    # ---- fetch akreditasi ----
    try:
        akreditasi = s.get(f"{OLD}/api/akreditasi", timeout=60).json()
        akreditasi = akreditasi if isinstance(akreditasi, list) else []
    except Exception:
        akreditasi = []
    log(f"akreditasi: {len(akreditasi)}")

    # ---- write to local DB ----
    cli = MongoClient(os.environ["MONGO_URL"])
    db = cli[os.environ["DB_NAME"]]

    for col in ["users", "keluarga", "anggota", "kunjungan", "kasus", "notifikasi", "audit_logs", "akreditasi"]:
        db[col].delete_many({})
    log("cleared old preview collections")

    # admin
    admin_doc = dict(admin_user)
    admin_doc.pop("_id", None)
    admin_doc["password_hash"] = hash_password(ADMIN_PASS)
    db.users.insert_one(admin_doc)

    # kaders (recreate with default password)
    for k in kaders:
        k = dict(k); k.pop("_id", None)
        k["password_hash"] = hash_password("kader123")
        db.users.insert_one(k)

    def clean(rows):
        out = []
        for r in rows:
            r = dict(r); r.pop("_id", None)
            out.append(r)
        return out

    if keluarga:
        for r in keluarga:
            r["alamat_norm"] = " ".join(str(r.get("alamat") or "").lower().split())
        db.keluarga.insert_many(clean(keluarga))
    if anggota:
        db.anggota.insert_many(clean(anggota))
    if kunjungan:
        db.kunjungan.insert_many(clean(kunjungan))
    if kasus:
        db.kasus.insert_many(clean(kasus))
    if akreditasi:
        db.akreditasi.insert_many(clean(akreditasi))

    log("=== DONE ===")
    log("users:", db.users.count_documents({}), "(admin+kader)")
    log("keluarga:", db.keluarga.count_documents({}))
    log("anggota:", db.anggota.count_documents({}))
    log("kunjungan:", db.kunjungan.count_documents({}))
    log("kasus:", db.kasus.count_documents({}))
    log("akreditasi:", db.akreditasi.count_documents({}))

if __name__ == "__main__":
    main()
