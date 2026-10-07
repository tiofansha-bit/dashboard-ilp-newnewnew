"""Demo data seeder for PWS ILP MELATI. Idempotent - runs on startup.
ALL DATA IS FICTIONAL (data fiktif untuk demonstrasi)."""
import json, os, random, uuid
from datetime import datetime, timezone, timedelta

BASE = os.path.dirname(__file__)

def iso(dt=None):
    return (dt or datetime.now(timezone.utc)).isoformat()

def nid():
    return str(uuid.uuid4())

KELURAHAN = ["Selat Tengah", "Selat Hulu", "Selat Dalam", "Selat Utara"]
POSYANDU = ["Melati 1", "Melati 2", "Mawar", "Anggrek", "Kenanga", "Dahlia"]

KADER_NAMA = ["Siti Aminah", "Rina Wati", "Dewi Lestari", "Nur Hayati", "Sri Wahyuni",
              "Endang Sari", "Yuli Astuti", "Maryam", "Fitri Handayani", "Lestari Ningsih"]

NAMA_KK = ["Budi Santoso", "Ahmad Fauzi", "Joko Susilo", "Bambang W", "Slamet Riyadi",
           "Hendra Gunawan", "Agus Salim", "Dedi Kurniawan", "Eko Prasetyo", "Rudi Hartono",
           "Wahyu Nugroho", "Iwan Setiawan", "Teguh Santoso", "Rizki Ramadhan", "Fajar Sidik"]

async def seed_all(db, hash_password):
    # ---- users ----
    admin_email = os.environ.get("ADMIN_EMAIL", "tiofansha@gmail.com")
    admin_user = admin_email.split("@")[0]
    existing_admin = await db.users.find_one({"role": "admin"})
    if not existing_admin:
        await db.users.insert_one({
            "id": nid(), "username": "admin", "email": admin_email,
            "nama": "Petugas Puskesmas Melati", "role": "admin",
            "wilayah": KELURAHAN, "posyandu": "", "aktif": True,
            "password_hash": hash_password(os.environ.get("ADMIN_PASSWORD", "admin123")),
            "created_at": iso()})
    # kader
    if await db.users.count_documents({"role": "kader"}) == 0:
        for i, nama in enumerate(KADER_NAMA):
            await db.users.insert_one({
                "id": nid(), "username": f"kader{i+1}", "nama": nama, "role": "kader",
                "wilayah": [KELURAHAN[i % 4]], "posyandu": POSYANDU[i % len(POSYANDU)],
                "target_keluarga": 30, "aktif": True,
                "password_hash": hash_password("kader123"), "created_at": iso()})

    # ---- wilayah & posyandu ----
    if await db.wilayah.count_documents({}) == 0:
        for k in KELURAHAN:
            await db.wilayah.insert_one({"id": nid(), "nama": k, "tipe": "kelurahan",
                "parent": "Kecamatan Selat", "deleted": False, "created_at": iso()})
    if await db.posyandu.count_documents({}) == 0:
        for i, p in enumerate(POSYANDU):
            await db.posyandu.insert_one({"id": nid(), "nama": p, "kelurahan": KELURAHAN[i % 4],
                "deleted": False, "created_at": iso()})

    # ---- master questions ----
    if await db.master_questions.count_documents({}) == 0:
        with open(os.path.join(BASE, "master_questions.json"), encoding="utf-8") as f:
            qs = json.load(f)
        for q in qs:
            q["deleted"] = False
        if qs:
            await db.master_questions.insert_many(qs)

    # ---- detailed checklist questions (K1-K6, KF, KN, immunization) — idempotent ----
    await seed_detail_questions(db)

    # ---- demo families, members, visits, cases ----
    if await db.keluarga.count_documents({}) == 0:
        await _seed_families(db)

    # ---- akreditasi dashboard ----
    if await db.akreditasi.count_documents({}) == 0:
        d = default_akreditasi()
        d["id"] = nid(); d["created_at"] = iso(); d["updated_at"] = iso()
        d["updated_by"] = "system"; d["versions"] = []
        await db.akreditasi.insert_one(d)

    # ---- test credentials file ----
    _write_creds(admin_email)


async def _seed_families(db):
    rnd = random.Random(42)
    kaders = await db.users.find({"role": "kader"}).to_list(20)
    now = datetime.now(timezone.utc)
    fam_count = 0
    for i in range(34):
        kader = kaders[i % len(kaders)]
        kel = kader["wilayah"][0]
        kid = nid()
        rt = str(rnd.randint(1, 8)).zfill(2); rw = str(rnd.randint(1, 4)).zfill(2)
        await db.keluarga.insert_one({
            "id": kid, "nama_kk": f"{NAMA_KK[i % len(NAMA_KK)]} {i+1}", "jumlah_anggota": rnd.randint(2, 5),
            "alamat": f"Jl. Contoh No. {i+1}", "rt": rt, "rw": rw, "kelurahan": kel,
            "posyandu": kader["posyandu"], "no_hp": f"08123456{str(i).zfill(3)}", "catatan_lokasi": "",
            "puskesmas": "UPT Puskesmas Melati", "punya_jkn": rnd.choice([True, True, False]),
            "air_bersih": True, "jamban": True, "ventilasi": rnd.choice([True, False]),
            "ada_gangguan_jiwa": False, "ada_tbc": rnd.random() < 0.1,
            "ada_hipertensi": rnd.random() < 0.2, "ada_dm": rnd.random() < 0.15,
            "deleted": False, "data_lengkap": True, "created_by": kader["id"],
            "created_by_nama": kader["nama"], "created_at": iso(now - timedelta(days=rnd.randint(1, 120)))})
        fam_count += 1
        # members
        members = []
        force_red = (i % 6 == 0)
        # kepala keluarga (dewasa/lansia)
        specs = [("dewasa", 30, 55, "L"), ("dewasa", 28, 50, "P")]
        r = rnd.random()
        if force_red or r < 0.35:
            specs.insert(0, ("balita", 0, 0, rnd.choice(["L", "P"])))
        if force_red or r < 0.2:
            specs.append(("ibu_hamil", 25, 35, "P"))
        if 0.5 < r < 0.7:
            specs.append(("lansia", 62, 78, rnd.choice(["L", "P"])))
        if r > 0.6:
            specs.append(("remaja", 12, 17, rnd.choice(["L", "P"])))
        for gi, (grp, amin, amax, jk) in enumerate(specs):
            aid = nid()
            if grp == "balita":
                bl = now - timedelta(days=rnd.randint(60, 1800)); tgl = bl.date().isoformat()
            elif grp == "ibu_hamil":
                tgl = (now - timedelta(days=rnd.randint(amin, amax)*365)).date().isoformat()
            else:
                tgl = (now - timedelta(days=rnd.randint(amin, amax)*365)).date().isoformat()
            m = {"id": aid, "keluarga_id": kid, "nama": f"Anggota {i+1}-{gi+1}",
                 "nik": ("32710" + str(rnd.randint(10**10, 10**11-1))) if rnd.random() > 0.15 else "",
                 "tempat_lahir": "Kuala Kapuas", "tanggal_lahir": tgl,
                 "jenis_kelamin": jk, "hubungan_kk": "Kepala Keluarga" if gi == 0 else "Anggota",
                 "status_kawin": "Kawin", "pendidikan": "SMA", "pekerjaan": "Wiraswasta", "no_hp": "",
                 "kondisi_hamil": grp == "ibu_hamil", "kondisi_nifas": False,
                 "kelompok_override": None, "deleted": False,
                 "data_lengkap": rnd.random() > 0.15, "created_at": iso()}
            await db.anggota.insert_one(m)
            members.append((aid, grp, m["nama"]))
        # always visit for forced-red families, else ~70%
        if force_red or rnd.random() < 0.7:
            if members:
                await _seed_visit(db, kader, kid, f"{NAMA_KK[i % len(NAMA_KK)]} {i+1}", kel, rt, rw,
                                  kader["posyandu"], members, rnd, now, force_red)


async def _seed_visit(db, kader, kid, kk_nama, kel, rt, rw, posyandu, members, rnd, now, force_red=False):
    vid = nid()
    scenario = 0.05 if force_red else rnd.random()  # decide green/yellow/red
    per_anggota = []; all_temuan = []; anggota_ids = []
    qcache = {}
    async def get_qs(group):
        if group not in qcache:
            qcache[group] = await db.master_questions.find({"group": group}).to_list(100)
        return qcache[group]
    for aid, grp, nama in members[:3]:
        if grp in ("belum_ditentukan",):
            continue
        anggota_ids.append(aid)
        qs = await get_qs(grp)
        answers = {}; temuan = []
        for q in qs:
            if q["section"] == "tanda_bahaya":
                # red scenario: flag one danger sign
                if scenario < 0.15 and grp in ("ibu_hamil", "bayi", "nifas", "balita") and not any(t["priority"] == "merah" for t in temuan):
                    answers[q["kode"]] = "Ya"
                    temuan.append({"kode": q["kode"], "masalah": q["text"], "definisi": q.get("definisi", ""),
                                   "priority": "merah", "group": grp, "report_required": True,
                                   "anggota_id": aid, "anggota_nama": nama})
                else:
                    answers[q["kode"]] = "Tidak"
            elif q["jenis"] == "yesno":
                # yellow scenario: some negatives
                if scenario < 0.45 and q.get("problem_when") and rnd.random() < 0.4:
                    val = q["problem_when"][0]; answers[q["kode"]] = val
                    temuan.append({"kode": q["kode"], "masalah": q["text"], "definisi": q.get("definisi", ""),
                                   "priority": q.get("priority") or "kuning", "group": grp,
                                   "report_required": q.get("report_required", False),
                                   "anggota_id": aid, "anggota_nama": nama})
                else:
                    answers[q["kode"]] = "Ya" if "Tidak" in (q.get("problem_when") or ["x"]) else "Tidak"
            elif q["jenis"] == "number":
                answers[q["kode"]] = round(rnd.uniform(36, 37.4), 1) if "SUHU" in q["kode"] else rnd.randint(3, 60)
            elif q["jenis"] == "single" and q.get("opsi"):
                answers[q["kode"]] = q["opsi"][0]
        all_temuan.extend(temuan)
        per_anggota.append({"anggota_id": aid, "nama": nama, "kelompok": grp, "answers": answers,
                            "edukasi": ["Edukasi PHBS"] if rnd.random() < 0.6 else [], "temuan": temuan})
    has_red = any(t["priority"] == "merah" for t in all_temuan)
    overall = "merah" if has_red else ("kuning" if all_temuan else "hijau")
    vt = now - timedelta(days=rnd.randint(0, 30))
    visit = {"id": vid, "keluarga_id": kid, "keluarga_nama": kk_nama, "kelurahan": kel, "rt": rt, "rw": rw,
             "posyandu": posyandu, "anggota_ids": anggota_ids, "kader_id": kader["id"], "kader_nama": kader["nama"],
             "tanggal": iso(vt), "catatan": "", "gps": None, "per_anggota": per_anggota,
             "status": "terkirim", "sync_status": "tersinkron", "prioritas": overall,
             "reminder_confirmed": True, "created_at": iso(vt)}
    await db.kunjungan.insert_one(visit)
    # cases
    for t in all_temuan:
        cid = nid()
        target_h = 24 if t["priority"] == "merah" else 72
        resolved = rnd.random() < 0.5
        riwayat = [{"waktu": iso(vt), "aksi": "Kasus dibuat dari kunjungan", "oleh": kader["nama"], "status": "baru"}]
        status = "baru"
        pj = None
        if resolved:
            pj = "Bidan Desa " + kel
            riwayat.append({"waktu": iso(vt + timedelta(hours=2)), "aksi": "Ditugaskan", "oleh": "Petugas Puskesmas Melati", "status": "ditugaskan"})
            riwayat.append({"waktu": iso(vt + timedelta(hours=target_h//2)), "aksi": "Selesai ditindaklanjuti", "oleh": pj, "status": "selesai", "hasil": "Sasaran telah diperiksa dan mendapat penanganan."})
            status = "selesai"
        elif rnd.random() < 0.5:
            pj = "Bidan Desa " + kel
            riwayat.append({"waktu": iso(vt + timedelta(hours=1)), "aksi": "Ditugaskan", "oleh": "Petugas Puskesmas Melati", "status": "ditugaskan"})
            status = "ditugaskan"
        await db.kasus.insert_one({
            "id": cid, "kunjungan_id": vid, "keluarga_id": kid, "keluarga_nama": kk_nama,
            "anggota_id": t.get("anggota_id"), "sasaran_nama": t.get("anggota_nama", ""),
            "group": t["group"], "masalah": t["masalah"], "definisi": t["definisi"], "priority": t["priority"],
            "kelurahan": kel, "rt": rt, "rw": rw, "posyandu": posyandu, "kader_nama": kader["nama"],
            "waktu_lapor": iso(vt), "status": status, "penanggung_jawab": pj,
            "target_selesai": iso(vt + timedelta(hours=target_h)), "riwayat": riwayat, "created_at": iso(vt)})
        if status in ("baru",):
            await db.notifikasi.insert_one({
                "id": nid(), "tipe": "prioritas_merah" if t["priority"] == "merah" else "kasus_baru",
                "priority": t["priority"], "judul": f"Laporan {t['priority'].upper()}: {t['masalah']}",
                "pesan": f"Dari kader {kader['nama']} di {kel} RT {rt}", "kasus_id": cid,
                "dibaca": False, "untuk_role": "admin", "waktu": iso(vt)})


BAYI_JADWAL = [
    {"usia": "Usia 0 bulan", "vaksin": ["Hepatitis B (<24 jam)", "BCG", "Polio Tetes 1"]},
    {"usia": "Usia 1 bulan", "vaksin": ["BCG", "Polio Tetes 1"]},
    {"usia": "Usia 2 bulan", "vaksin": ["DPT-HB-Hib 1", "Polio Tetes 2", "PCV 1", "RV 1"]},
    {"usia": "Usia 3 bulan", "vaksin": ["DPT-HB-Hib 2", "Polio Tetes 3", "PCV 2", "RV 2"]},
    {"usia": "Usia 4 bulan", "vaksin": ["DPT-HB-Hib 3", "Polio Tetes 4", "Polio Suntik (IPV) 1", "RV 3"]},
]
BALITA_JADWAL = BAYI_JADWAL + [
    {"usia": "Usia 9 bulan", "vaksin": ["Campak-Rubella", "Polio Suntik (IPV) 2"]},
    {"usia": "Usia 10 bulan", "vaksin": ["Japanese Encephalitis (JE)"]},
    {"usia": "Usia 12 bulan", "vaksin": ["PCV 3"]},
    {"usia": "Usia 18 bulan", "vaksin": ["DPT-HB-Hib Lanjutan", "Campak-Rubella Lanjutan"]},
]


def _detail_defs():
    """Detailed records exactly like the Excel card (informational, no priority)."""
    out = []
    triwulan = {"K1": "trimester I (usia kehamilan hingga 12 minggu)", "K2": "trimester II (12-24 minggu)",
                "K3": "trimester II (12-24 minggu)", "K4": "trimester III (24-40 minggu)",
                "K5": "trimester III (24-40 minggu)", "K6": "trimester III (24-40 minggu)"}
    for i, k in enumerate(["K1", "K2", "K3", "K4", "K5", "K6"], 1):
        out.append({"kode": f"BUMIL_{k}", "group": "ibu_hamil", "section": "ceklis",
                    "text": f"Pemeriksaan kehamilan {k}",
                    "definisi": f"Diisi tanggal, tempat periksa, dan nama petugas pemeriksaan {k} pada {triwulan[k]}.",
                    "jenis": "pemeriksaan", "fields": ["tanggal", "tempat", "petugas"], "satuan": None,
                    "opsi": [], "wajib": False, "problem_when": [], "priority": None,
                    "report_required": False, "urutan": 3 + i / 10})
    kf = {"KF1": "6-48 jam", "KF2": "3-7 hari", "KF3": "8-28 hari", "KF4": "29-42 hari"}
    for i, (k, w) in enumerate(kf.items(), 1):
        out.append({"kode": f"NIFAS_{k}", "group": "nifas", "section": "ceklis",
                    "text": f"Kunjungan nifas {k} ({w})",
                    "definisi": f"Diisi tanggal dan tempat ibu memeriksakan kesehatannya (Fasyankes) {w} setelah bersalin.",
                    "jenis": "pemeriksaan", "fields": ["tanggal", "tempat"], "satuan": None,
                    "opsi": [], "wajib": False, "problem_when": [], "priority": None,
                    "report_required": False, "urutan": 3 + i / 10})
    kn = {"KN1": "6-48 jam", "KN2": "3-7 hari", "KN3": "8-28 hari"}
    for i, (k, w) in enumerate(kn.items(), 1):
        out.append({"kode": f"BAYI_{k}", "group": "bayi", "section": "ceklis",
                    "text": f"Kunjungan neonatal {k} ({w})",
                    "definisi": f"Diisi tanggal, tempat, dan petugas pemeriksaan bayi {w} setelah dilahirkan.",
                    "jenis": "pemeriksaan", "fields": ["tanggal", "tempat", "petugas"], "satuan": None,
                    "opsi": [], "wajib": False, "problem_when": [], "priority": None,
                    "report_required": False, "urutan": 7 + i / 10})
    out.append({"kode": "BAYI_IMUN_DETAIL", "group": "bayi", "section": "ceklis",
                "text": "Imunisasi per usia (centang yang sudah diberikan)",
                "definisi": "Status imunisasi bayi 0-6 bulan sesuai jadwal usia.",
                "jenis": "imunisasi", "jadwal": BAYI_JADWAL, "satuan": None, "opsi": [],
                "wajib": False, "problem_when": [], "priority": None, "report_required": False, "urutan": 8.1})
    out.append({"kode": "BALITA_IMUN_DETAIL", "group": "balita", "section": "ceklis",
                "text": "Imunisasi per usia (centang yang sudah diberikan)",
                "definisi": "Status imunisasi anak sesuai jadwal usia (0 bulan s.d. 18 bulan).",
                "jenis": "imunisasi", "jadwal": BALITA_JADWAL, "satuan": None, "opsi": [],
                "wajib": False, "problem_when": [], "priority": None, "report_required": False, "urutan": 6.1})
    out.append({"kode": "DEWASA_RIWAYAT_KELUARGA", "group": "dewasa", "section": "ceklis",
                "text": "Riwayat penyakit keluarga",
                "definisi": "Riwayat penyakit yang pernah/sedang diderita anggota keluarga (boleh pilih lebih dari satu).",
                "jenis": "multi", "satuan": None,
                "opsi": ["Hipertensi", "Diabetes Melitus", "Stroke", "Jantung", "Asma", "Kanker", "Kolesterol Tinggi"],
                "wajib": False, "problem_when": [], "priority": None, "report_required": False, "urutan": 12.5})
    out.append({"kode": "DEWASA_KB", "group": "dewasa", "section": "ceklis",
                "text": "Jenis kontrasepsi yang digunakan",
                "definisi": "Metode kontrasepsi yang sedang digunakan (khusus perempuan usia subur). Pilih 'Tidak menggunakan' bila tidak memakai KB.",
                "jenis": "single", "satuan": None,
                "opsi": ["Tidak menggunakan", "Pil", "Kondom", "Suntik", "Implan/Susuk", "Lainnya"],
                "wajib": False, "problem_when": [], "priority": None, "report_required": False, "urutan": 12.6})
    return out


async def seed_detail_questions(db):
    for q in _detail_defs():
        q["deleted"] = False
        await db.master_questions.update_one({"kode": q["kode"]}, {"$setOnInsert": q}, upsert=True)



def default_akreditasi():
    return {
        "judul": "Dashboard Simulasi Akreditasi PWS ILP", "subjudul": "Kunjungan Rumah Terintegrasi",
        "puskesmas": "UPT Puskesmas Melati", "periode": "Januari - Juni 2026",
        "penanggung_jawab": "Kepala UPT Puskesmas Melati", "catatan_kaki": "Data simulasi untuk keperluan akreditasi.",
        "is_simulasi": True, "template": "Akreditasi Puskesmas", "tanggal_update": iso()[:10],
        "kartu": [
            {"id": nid(), "nama": "Keluarga Terdaftar", "nilai": 2500, "satuan": "KK", "target": 2500, "warna": "blue", "ikon": "Users", "status": "tercapai", "catatan": ""},
            {"id": nid(), "nama": "Target Keluarga Dikunjungi", "nilai": 2000, "satuan": "KK", "target": 2000, "warna": "blue", "ikon": "Target", "status": "tercapai", "catatan": ""},
            {"id": nid(), "nama": "Keluarga Telah Dikunjungi", "nilai": 1720, "satuan": "KK", "target": 2000, "warna": "green", "ikon": "CheckCircle", "status": "belum_tercapai", "catatan": ""},
            {"id": nid(), "nama": "Cakupan Kunjungan", "nilai": 86, "satuan": "%", "target": 100, "warna": "green", "ikon": "TrendingUp", "status": "perlu_perhatian", "catatan": ""},
            {"id": nid(), "nama": "Sasaran Diperiksa", "nilai": 4350, "satuan": "org", "target": 4350, "warna": "blue", "ikon": "Activity", "status": "tercapai", "catatan": ""},
            {"id": nid(), "nama": "Masalah Kesehatan Ditemukan", "nilai": 286, "satuan": "kasus", "target": 0, "warna": "yellow", "ikon": "AlertTriangle", "status": "perlu_perhatian", "catatan": ""},
            {"id": nid(), "nama": "Tanda Bahaya", "nilai": 24, "satuan": "kasus", "target": 0, "warna": "red", "ikon": "ShieldAlert", "status": "perlu_perhatian", "catatan": ""},
            {"id": nid(), "nama": "Laporan ke Nakes", "nilai": 214, "satuan": "kasus", "target": 0, "warna": "blue", "ikon": "Send", "status": "tercapai", "catatan": ""},
            {"id": nid(), "nama": "Sudah Ditindaklanjuti", "nilai": 188, "satuan": "kasus", "target": 214, "warna": "green", "ikon": "CheckCheck", "status": "belum_tercapai", "catatan": ""},
            {"id": nid(), "nama": "Penyelesaian Tindak Lanjut", "nilai": 87.9, "satuan": "%", "target": 100, "warna": "green", "ikon": "TrendingUp", "status": "perlu_perhatian", "catatan": ""},
            {"id": nid(), "nama": "Edukasi Diberikan", "nilai": 1540, "satuan": "kali", "target": 0, "warna": "blue", "ikon": "BookOpen", "status": "tercapai", "catatan": ""},
            {"id": nid(), "nama": "Data Belum Lengkap", "nilai": 42, "satuan": "data", "target": 0, "warna": "yellow", "ikon": "FileWarning", "status": "perlu_perhatian", "catatan": ""},
        ],
        "grafik": [
            {"id": nid(), "judul": "Cakupan per Kelurahan", "tipe": "bar", "data": [
                {"label": "Selat Tengah", "value": 91}, {"label": "Selat Hulu", "value": 87},
                {"label": "Selat Dalam", "value": 84}, {"label": "Selat Utara", "value": 80}]},
            {"id": nid(), "judul": "10 Masalah Terbanyak", "tipe": "horizontal_bar", "data": [
                {"label": "Tidak akses pelayanan", "value": 78}, {"label": "Tidak minum obat teratur", "value": 54},
                {"label": "Imunisasi belum lengkap", "value": 43}, {"label": "Belum skrining PTM", "value": 38},
                {"label": "Terduga TBC", "value": 27}, {"label": "Belum skrining jiwa", "value": 24},
                {"label": "Tanda bahaya ibu & anak", "value": 22}]},
            {"id": nid(), "judul": "Tren Kunjungan Bulanan", "tipe": "line", "data": [
                {"label": "Jan", "value": 240}, {"label": "Feb", "value": 290}, {"label": "Mar", "value": 310},
                {"label": "Apr", "value": 280}, {"label": "Mei", "value": 320}, {"label": "Jun", "value": 280}]},
            {"id": nid(), "judul": "Status Tindak Lanjut", "tipe": "donut", "data": [
                {"label": "Selesai", "value": 188}, {"label": "Proses", "value": 18}, {"label": "Baru", "value": 8}]},
        ],
        "narasi": {
            "capaian": "Cakupan kunjungan rumah pada periode ini mencapai 86% dari target 2.000 keluarga. Capaian tertinggi terdapat di Selat Tengah (91%), sedangkan kesenjangan terbesar ditemukan di Selat Utara (80%).",
            "masalah": "Masalah kesehatan yang paling banyak ditemukan adalah tidak mengakses pelayanan, dengan jumlah 78 sasaran.",
            "tindak_lanjut": "Sebanyak 87,9% temuan telah ditindaklanjuti oleh petugas. Masih terdapat 26 kasus yang memerlukan penyelesaian.",
            "rencana": "Puskesmas merencanakan sweeping kunjungan di Selat Utara dengan penanggung jawab Koordinator Promkes dan target penyelesaian 31 Juli 2026.",
        },
        "pdca": {
            "plan": "Meningkatkan cakupan kunjungan rumah di Selat Utara dari 80% menjadi 90%.",
            "do": "Penjadwalan ulang kunjungan, penambahan kader, dan sosialisasi lintas sektor.",
            "check": "Evaluasi mingguan capaian kunjungan dan jumlah tanda bahaya yang ditemukan.",
            "act": "Standarisasi jadwal kunjungan dan replikasi ke kelurahan lain.",
        },
        "rtl": [
            {"id": nid(), "masalah": "Cakupan rendah di Selat Utara", "penyebab": "Kekurangan kader aktif",
             "rencana": "Rekrut & latih 2 kader baru", "pj": "Koordinator Promkes", "target": "31 Jul 2026",
             "status": "dalam_proses", "hasil": ""},
            {"id": nid(), "masalah": "Ketidakpatuhan minum obat HT/DM", "penyebab": "Kurang edukasi keluarga",
             "rencana": "Edukasi rutin & pendampingan PMO", "pj": "PJ PTM", "target": "30 Jun 2026",
             "status": "dalam_proses", "hasil": ""},
        ],
    }


def _write_creds(admin_email):
    try:
        with open("/app/memory/test_credentials.md", "w", encoding="utf-8") as f:
            f.write(f"""# Test Credentials - PWS ILP MELATI

## Admin / Petugas Puskesmas
- Username: `admin`
- Password: `admin123`
- Owner email: {admin_email}
- Role: admin

## Kader (10 akun, kader1 s.d. kader10)
- Username: `kader1` ... `kader10`
- Password: `kader123`
- Role: kader
- kader1 wilayah: Selat Tengah, kader2: Selat Hulu, kader3: Selat Dalam, kader4: Selat Utara (siklus)

## Auth endpoints
- POST /api/auth/login  (body: {{"username","password"}})
- POST /api/auth/logout
- GET  /api/auth/me
""")
    except Exception:
        pass
