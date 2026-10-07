"""Backend tests for PWS ILP MELATI"""
import os
import pytest
import requests
from datetime import date

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://ilp-digital-1.preview.emergentagent.com"
API = f"{BASE}/api"


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def kader_token():
    r = requests.post(f"{API}/auth/login", json={"username": "kader1", "password": "kader123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ---------- AUTH ----------
class TestAuth:
    def test_admin_login(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
        assert r.status_code == 200
        j = r.json()
        assert j["user"]["role"] == "admin"
        assert j["access_token"]

    def test_kader_login(self):
        r = requests.post(f"{API}/auth/login", json={"username": "kader1", "password": "kader123"})
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "kader"

    def test_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_returns_user(self, admin_token):
        r = requests.get(f"{API}/auth/me", headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------- MASTER ----------
class TestMaster:
    def test_questions(self, kader_token):
        r = requests.get(f"{API}/master/questions", headers=H(kader_token))
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 100
        # Sanity: contain expected fields
        assert "kode" in rows[0] and "group" in rows[0]

    def test_questions_group_filter(self, kader_token):
        r = requests.get(f"{API}/master/questions?group=ibu_hamil", headers=H(kader_token))
        assert r.status_code == 200
        for x in r.json():
            assert x["group"] == "ibu_hamil"

    def test_groups(self, kader_token):
        r = requests.get(f"{API}/master/groups", headers=H(kader_token))
        assert r.status_code == 200
        codes = [g["code"] for g in r.json()]
        assert "ibu_hamil" in codes and "lansia" in codes

    def test_update_question_admin_only(self, kader_token):
        r = requests.put(f"{API}/master/questions/SOMEKODE", json={"priority": "kuning"}, headers=H(kader_token))
        assert r.status_code == 403


# ---------- ROLE ISOLATION ----------
class TestRoleIsolation:
    def test_kader_cannot_kpi(self, kader_token):
        r = requests.get(f"{API}/dashboard/kpi", headers=H(kader_token))
        assert r.status_code == 403

    def test_kader_cannot_kasus(self, kader_token):
        r = requests.get(f"{API}/kasus", headers=H(kader_token))
        assert r.status_code == 403

    def test_kader_cannot_akreditasi(self, kader_token):
        r = requests.get(f"{API}/akreditasi", headers=H(kader_token))
        assert r.status_code == 403

    def test_kader_cannot_audit(self, kader_token):
        r = requests.get(f"{API}/audit", headers=H(kader_token))
        assert r.status_code == 403


# ---------- KELUARGA (KADER) ----------
class TestKeluarga:
    def test_kader_list_scoped(self, kader_token):
        r = requests.get(f"{API}/keluarga", headers=H(kader_token))
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "total" in d

    def test_kader_search(self, kader_token):
        r = requests.get(f"{API}/keluarga?search=a", headers=H(kader_token))
        assert r.status_code == 200

    def test_kader_create_outside_wilayah_forbidden(self, kader_token):
        r = requests.post(f"{API}/keluarga", json={
            "nama_kk": "TEST_INVALID", "kelurahan": "Kelurahan Tidak Ada",
        }, headers=H(kader_token))
        assert r.status_code == 403

    def test_full_kader_flow_create_family_member_visit(self, kader_token):
        # get one wilayah for kader
        me = requests.get(f"{API}/auth/me", headers=H(kader_token)).json()
        wil = me["wilayah"][0]
        # create keluarga
        r = requests.post(f"{API}/keluarga", json={
            "nama_kk": "TEST_KK_PYTEST", "kelurahan": wil, "rt": "01", "rw": "02",
            "alamat": "Jl Uji", "no_hp": "08123"
        }, headers=H(kader_token))
        assert r.status_code == 200, r.text
        kel = r.json()
        assert kel["nama_kk"] == "TEST_KK_PYTEST"
        assert kel["kelurahan"] == wil
        kid = kel["id"]

        # GET verify persistence
        g = requests.get(f"{API}/keluarga/{kid}", headers=H(kader_token))
        assert g.status_code == 200
        assert g.json()["nama_kk"] == "TEST_KK_PYTEST"

        # add anggota - adult (should be dewasa)
        birth = "1990-05-05"
        r = requests.post(f"{API}/anggota", json={
            "keluarga_id": kid, "nama": "TEST_Anggota", "nik": "1234567890123456",
            "tanggal_lahir": birth, "jenis_kelamin": "L", "hubungan_kk": "kepala"
        }, headers=H(kader_token))
        assert r.status_code == 200
        a = r.json()
        assert a["kelompok"] == "dewasa"
        assert a["umur"] and a["umur"] >= 30
        aid = a["id"]

        # add balita
        rb = requests.post(f"{API}/anggota", json={
            "keluarga_id": kid, "nama": "TEST_Balita", "nik": "",
            "tanggal_lahir": f"{date.today().year-2}-01-01", "jenis_kelamin": "P"
        }, headers=H(kader_token))
        assert rb.status_code == 200
        assert rb.json()["kelompok"] == "balita"

        # draft visit
        d = requests.post(f"{API}/kunjungan", json={
            "keluarga_id": kid, "anggota_ids": [aid], "answers": {aid: {}}, "status": "draf"
        }, headers=H(kader_token))
        assert d.status_code == 200
        assert d.json()["status"] == "draf"

        # completed visit
        c = requests.post(f"{API}/kunjungan", json={
            "keluarga_id": kid, "anggota_ids": [aid], "answers": {aid: {}}, "status": "selesai"
        }, headers=H(kader_token))
        assert c.status_code == 200
        assert c.json()["status"] == "terkirim"
        assert c.json()["prioritas"] in ("hijau", "kuning", "merah")


# ---------- DANGER SIGN REMINDER ----------
class TestDangerSign:
    def test_red_visit_requires_reminder(self, kader_token):
        me = requests.get(f"{API}/auth/me", headers=H(kader_token)).json()
        wil = me["wilayah"][0]
        # find a master question with priority merah
        qs = requests.get(f"{API}/master/questions", headers=H(kader_token)).json()
        red_q = next((q for q in qs if q.get("priority") == "merah" and q.get("problem_when")), None)
        assert red_q, "No red master question found"
        # create family
        k = requests.post(f"{API}/keluarga", json={"nama_kk": "TEST_RED", "kelurahan": wil}, headers=H(kader_token)).json()
        # add member matching the question group
        grp = red_q["group"]
        birth = "1990-01-01"
        if grp == "balita":
            birth = f"{date.today().year-2}-01-01"
        elif grp == "bayi":
            birth = f"{date.today().year}-01-01"
        elif grp == "remaja":
            birth = f"{date.today().year-14}-01-01"
        elif grp == "lansia":
            birth = f"{date.today().year-70}-01-01"
        extra = {}
        if grp == "ibu_hamil":
            extra = {"kondisi_hamil": True, "jenis_kelamin": "P"}
        elif grp == "nifas":
            extra = {"kondisi_nifas": True, "jenis_kelamin": "P"}
        a = requests.post(f"{API}/anggota", json={
            "keluarga_id": k["id"], "nama": "TEST_Red_Anggota", "tanggal_lahir": birth, **extra
        }, headers=H(kader_token)).json()
        # Assemble answer that triggers problem
        pw = red_q["problem_when"]
        val = pw[0] if isinstance(pw, list) and pw else "ya"
        answers = {a["id"]: {red_q["kode"]: val}}
        # Submit as selesai WITHOUT reminder -> expect 400
        r = requests.post(f"{API}/kunjungan", json={
            "keluarga_id": k["id"], "anggota_ids": [a["id"]], "answers": answers,
            "status": "selesai", "reminder_confirmed": False
        }, headers=H(kader_token))
        assert r.status_code == 400, f"Expected 400 but got {r.status_code}: {r.text}"
        # With reminder confirmed -> ok
        r2 = requests.post(f"{API}/kunjungan", json={
            "keluarga_id": k["id"], "anggota_ids": [a["id"]], "answers": answers,
            "status": "selesai", "reminder_confirmed": True
        }, headers=H(kader_token))
        assert r2.status_code == 200, r2.text
        assert r2.json()["prioritas"] == "merah"


# ---------- ADMIN DASHBOARD ----------
class TestAdminDashboard:
    def test_kpi(self, admin_token):
        r = requests.get(f"{API}/dashboard/kpi", headers=H(admin_token))
        assert r.status_code == 200
        j = r.json()
        for k in ("keluarga_terdaftar", "cakupan", "kasus_merah", "kasus_kuning"):
            assert k in j

    def test_charts(self, admin_token):
        r = requests.get(f"{API}/dashboard/charts", headers=H(admin_token))
        assert r.status_code == 200
        j = r.json()
        for k in ("cakupan_kelurahan", "distribusi_kelompok", "top_masalah", "tren_bulanan", "status_tindak_lanjut"):
            assert k in j


# ---------- KASUS ----------
class TestKasus:
    def test_list_kasus(self, admin_token):
        r = requests.get(f"{API}/kasus", headers=H(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_filter_by_priority(self, admin_token):
        r = requests.get(f"{API}/kasus?priority=merah", headers=H(admin_token))
        assert r.status_code == 200
        for c in r.json():
            assert c["priority"] == "merah"

    def test_update_case_status_and_reason(self, admin_token):
        rows = requests.get(f"{API}/kasus", headers=H(admin_token)).json()
        assert rows, "No cases exist"
        cid = rows[0]["id"]
        # open (marks read)
        r = requests.get(f"{API}/kasus/{cid}", headers=H(admin_token))
        assert r.status_code == 200
        # try tidak_dapat_ditindaklanjuti without alasan -> 400
        r = requests.put(f"{API}/kasus/{cid}", json={"status": "tidak_dapat_ditindaklanjuti"}, headers=H(admin_token))
        assert r.status_code == 400
        # with alasan
        r = requests.put(f"{API}/kasus/{cid}", json={"status": "ditugaskan",
                                                     "penanggung_jawab": "Bidan A",
                                                     "hasil": "sudah dihubungi"},
                         headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["status"] == "ditugaskan"


# ---------- REKAP + EXPORT ----------
class TestRekapExport:
    def test_rekap(self, admin_token):
        r = requests.get(f"{API}/rekap", headers=H(admin_token))
        assert r.status_code == 200
        assert "keluarga_dikunjungi" in r.json()

    @pytest.mark.parametrize("jenis,fmt", [
        ("kasus", "csv"), ("kasus", "excel"), ("kasus", "pdf"),
        ("kunjungan", "csv"), ("keluarga", "csv"),
    ])
    def test_export(self, admin_token, jenis, fmt):
        r = requests.get(f"{API}/export/{jenis}?fmt={fmt}", headers=H(admin_token))
        assert r.status_code == 200
        assert len(r.content) > 10


# ---------- AKREDITASI ----------
class TestAkreditasi:
    def test_list_and_edit(self, admin_token):
        r = requests.get(f"{API}/akreditasi", headers=H(admin_token))
        assert r.status_code == 200
        rows = r.json()
        assert rows, "No akreditasi dashboard seeded"
        did = rows[0]["id"]
        # get
        g = requests.get(f"{API}/akreditasi/{did}", headers=H(admin_token))
        assert g.status_code == 200
        cur = g.json()
        # update narrative
        payload = dict(cur)
        payload["narasi"] = "TEST narasi update"
        u = requests.put(f"{API}/akreditasi/{did}", json=payload, headers=H(admin_token))
        assert u.status_code == 200
        assert u.json()["narasi"] == "TEST narasi update"
        # verify persisted
        g2 = requests.get(f"{API}/akreditasi/{did}", headers=H(admin_token)).json()
        assert g2["narasi"] == "TEST narasi update"
        assert len(g2.get("versions", [])) >= 1


# ---------- KADER MGMT + AUDIT ----------
class TestKaderMgmt:
    def test_list_kader(self, admin_token):
        r = requests.get(f"{API}/admin/kader", headers=H(admin_token))
        assert r.status_code == 200
        assert len(r.json()) >= 10

    def test_add_kader(self, admin_token):
        uname = f"testk{os.urandom(3).hex()}"
        r = requests.post(f"{API}/admin/kader", json={
            "username": uname, "nama": "TEST_Kader_New", "wilayah": ["Selat Tengah"],
            "password": "test123"
        }, headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["username"] == uname
        # login as new
        lg = requests.post(f"{API}/auth/login", json={"username": uname, "password": "test123"})
        assert lg.status_code == 200


class TestAudit:
    def test_audit(self, admin_token):
        r = requests.get(f"{API}/audit", headers=H(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)


class TestKaderBeranda:
    def test_beranda(self, kader_token):
        r = requests.get(f"{API}/kader/beranda", headers=H(kader_token))
        assert r.status_code == 200
        j = r.json()
        for k in ("total_keluarga", "sudah_dikunjungi", "belum_dikunjungi"):
            assert k in j

    def test_laporan_status(self, kader_token):
        r = requests.get(f"{API}/kader/laporan-status", headers=H(kader_token))
        assert r.status_code == 200
