"""Copy all data from the production site via its API into local MongoDB. Passwords reset to defaults."""
import os
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import bcrypt
import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent / ".env")
OLD = os.environ.get("OLD_URL", "https://home-visit-portal-1.emergent.host")
ADMIN_USER, ADMIN_PASS = "admin", "admin123"
s = requests.Session()


def get(path, **params):
    r = s.get(f"{OLD}/api{path}", params=params, timeout=120)
    r.raise_for_status()
    return r.json()


def hp(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def fill_from_kunjungan(kasus, kunjungan):
    # /kasus caps at 500 per query; rebuild uncaptured cases from visit findings (same logic as create_cases)
    have = {}
    for c in kasus.values():
        key = (c.get("kunjungan_id"), c.get("anggota_id"), c.get("masalah"))
        have[key] = have.get(key, 0) + 1
    added = 0
    for v in kunjungan:
        if v.get("status") not in ("terkirim", "selesai"):
            continue
        t0 = v.get("created_at")
        for pa in v.get("per_anggota", []):
            for t in pa.get("temuan", []):
                key = (v["id"], pa["anggota_id"], t["masalah"])
                if have.get(key, 0) > 0:
                    have[key] -= 1
                    continue
                hours = 24 if t["priority"] == "merah" else 72
                cid = str(uuid.uuid4())
                kasus[cid] = {
                    "id": cid, "kunjungan_id": v["id"], "keluarga_id": v["keluarga_id"],
                    "keluarga_nama": v["keluarga_nama"], "anggota_id": pa["anggota_id"],
                    "sasaran_nama": pa.get("nama", ""), "group": t["group"], "masalah": t["masalah"],
                    "definisi": t.get("definisi"), "priority": t["priority"], "kelurahan": v["kelurahan"],
                    "rt": v.get("rt"), "rw": v.get("rw"), "posyandu": v.get("posyandu"),
                    "kader_nama": v["kader_nama"], "waktu_lapor": t0, "status": "baru",
                    "penanggung_jawab": None,
                    "target_selesai": (datetime.fromisoformat(t0) + timedelta(hours=hours)).isoformat(),
                    "riwayat": [{"waktu": t0, "aksi": "Kasus dibuat dari kunjungan", "oleh": v["kader_nama"], "status": "baru"}],
                    "created_at": t0,
                }
                added += 1
    print("kasus rebuilt from kunjungan:", added, flush=True)


def main():
    r = s.post(f"{OLD}/api/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS}, timeout=30)
    r.raise_for_status()
    body = r.json()
    s.headers["Authorization"] = f"Bearer {body['access_token']}"
    admin = body["user"]

    data = {"wilayah": get("/master/wilayah"), "posyandu": get("/master/posyandu"),
            "master_questions": get("/master/questions"), "akreditasi": get("/akreditasi"),
            "audit_logs": get("/audit"), "notifikasi": get("/notifikasi").get("items", [])}
    kaders = get("/admin/kader")

    keluarga, anggota, kunjungan, seen_v = [], [], [], set()
    page = 1
    while True:
        d = get("/keluarga", page=page, limit=100)
        for it in d["items"]:
            det = get(f"/keluarga/{it['id']}")
            for a in det.pop("anggota", []) or []:
                for k in ("umur", "kelompok", "kelompok_label"):
                    a.pop(k, None)
                anggota.append(a)
            for k in ("jumlah_anggota_aktual", "sudah_dikunjungi"):
                det.pop(k, None)
            det["alamat_norm"] = " ".join(str(det.get("alamat") or "").lower().split())
            keluarga.append(det)
            for v in get("/kunjungan", keluarga_id=it["id"]):
                if v["id"] not in seen_v:
                    seen_v.add(v["id"])
                    kunjungan.append(get(f"/kunjungan/{v['id']}"))
        if not d["items"] or len(keluarga) >= d["total"]:
            break
        page += 1
    for v in get("/kunjungan"):
        if v["id"] not in seen_v:
            seen_v.add(v["id"])
            kunjungan.append(get(f"/kunjungan/{v['id']}"))

    kasus = {}
    dims = [("group", sorted({q["group"] for q in data["master_questions"]})),
            ("priority", ["merah", "kuning", "hijau"]),
            ("status", sorted({c.get("status") for c in get("/kasus") if c.get("status")}) + ["belum", "sedang", "selesai"]),
            ("kelurahan", sorted({k.get("kelurahan") for k in keluarga if k.get("kelurahan")}))]

    def fetch_kasus(params, depth):
        rows = get("/kasus", **params)
        if len(rows) >= 500 and depth < len(dims):
            f, vals = dims[depth]
            for v in dict.fromkeys(vals):
                fetch_kasus({**params, f: v}, depth + 1)
        else:
            if len(rows) >= 500:
                print("WARNING still capped:", params, flush=True)
            for c in rows:
                c.pop("nik_masked", None)
                kasus[c["id"]] = c

    fetch_kasus({}, 0)
    fill_from_kunjungan(kasus, kunjungan)
    data.update(keluarga=keluarga, anggota=anggota, kunjungan=kunjungan, kasus=list(kasus.values()))

    db = MongoClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    users = [{**admin, "password_hash": hp(ADMIN_PASS)}] + [{**k, "password_hash": hp("kader123")} for k in kaders]
    data["users"] = users
    for col, rows in data.items():
        db[col].delete_many({})
        rows = [{k: v for k, v in x.items() if k != "_id"} for x in rows]
        if rows:
            db[col].insert_many(rows)
        print(f"{col}: {db[col].count_documents({})}", flush=True)


if __name__ == "__main__":
    main()
