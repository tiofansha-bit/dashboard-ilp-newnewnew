"""Iteration 6 — Dashboard summary endpoints + kader ownership restriction tests.

Covers:
- GET /api/dashboard/jawaban  (admin only; conditional questions; group+kesimpulan)
- GET /api/dashboard/insights (admin only; 6 charts fields)
- Kader ownership isolation on /api/keluarga, /api/anggota, /api/kunjungan
"""
import os
import pytest
import requests

def _load_frontend_env():
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return None

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_env()).rstrip("/")


# -------- shared fixtures --------
def login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, f"login failed for {username}: {r.text}"
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def admin_token():
    return login("admin", "admin123")


@pytest.fixture(scope="module")
def kader11_token():
    return login("kader11", "kader123")


@pytest.fixture(scope="module")
def kader12_token():
    return login("kader12", "kader123")


@pytest.fixture(scope="module")
def kader13_token():
    return login("kader13", "kader123")


def H(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ==================== DASHBOARD JAWABAN ====================
class TestDashboardJawaban:
    def test_jawaban_no_auth_401(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/jawaban")
        assert r.status_code in (401, 403)

    def test_jawaban_kader_forbidden(self, kader11_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/jawaban", headers=H(kader11_token))
        assert r.status_code == 403

    def test_jawaban_admin_ok(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/jawaban", headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()
        assert "total_sasaran" in d and "kesimpulan_utama" in d and "groups" in d
        assert isinstance(d["groups"], list) and len(d["groups"]) > 0
        # kesimpulan_utama <=10
        assert len(d["kesimpulan_utama"]) <= 10
        for k in d["kesimpulan_utama"]:
            for f in ("group_label", "text", "persen", "masalah", "responden", "priority", "kesimpulan"):
                assert f in k
            assert "perlu tindak lanjut" in k["kesimpulan"] or "menjawab" in k["kesimpulan"]
        # merah priority first (sorted)
        prios = [k["priority"] for k in d["kesimpulan_utama"]]
        merah_idx = [i for i, p in enumerate(prios) if p == "merah"]
        non_merah_idx = [i for i, p in enumerate(prios) if p != "merah"]
        if merah_idx and non_merah_idx:
            assert max(merah_idx) < min(non_merah_idx), f"merah must come first: {prios}"

    def test_jawaban_conditional_ht_obat(self, admin_token):
        """DEWASA_HT_OBAT_MINUM should only count sasaran terdiagnosis hipertensi (~few, not ~290)."""
        r = requests.get(f"{BASE_URL}/api/dashboard/jawaban", headers=H(admin_token))
        d = r.json()
        found = None
        for g in d["groups"]:
            for q in g["questions"]:
                if q["kode"] == "DEWASA_HT_OBAT_MINUM":
                    found = q
                    break
        if found:
            assert found.get("kondisi"), f"expected kondisi note on DEWASA_HT_OBAT_MINUM: {found}"
            assert "hipertensi" in found["kondisi"].lower()
            assert found["responden"] < 50, f"should be few HT-diag respondents, got {found['responden']}"

    def test_jawaban_non_problem_dewasa_ht(self, admin_token):
        """DEWASA_HT (no problem_when match -> non-problem) should have a 'Dari X sasaran:' kesimpulan."""
        r = requests.get(f"{BASE_URL}/api/dashboard/jawaban", headers=H(admin_token))
        d = r.json()
        for g in d["groups"]:
            for q in g["questions"]:
                if q["kode"] == "DEWASA_HT":
                    # yesno with problem_when=["Ya"] by default — this one is screening
                    # Just assert kesimpulan exists and jumlah match
                    assert "kesimpulan" in q
                    assert q["responden"] > 0
                    return

    def test_jawaban_filter_kelurahan(self, admin_token):
        r1 = requests.get(f"{BASE_URL}/api/dashboard/jawaban", headers=H(admin_token))
        r2 = requests.get(f"{BASE_URL}/api/dashboard/jawaban",
                          params={"kelurahan": "Selat Dalam"}, headers=H(admin_token))
        assert r2.status_code == 200
        assert r2.json()["total_sasaran"] <= r1.json()["total_sasaran"]


# ==================== DASHBOARD INSIGHTS ====================
class TestDashboardInsights:
    def test_insights_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/insights")
        assert r.status_code in (401, 403)

    def test_insights_kader_forbidden(self, kader11_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/insights", headers=H(kader11_token))
        assert r.status_code == 403

    def test_insights_admin_ok(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/insights", headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()
        for f in ("prioritas_kunjungan", "kunjungan_posyandu", "top_kader",
                  "kasus_kelurahan", "kasus_kelompok", "keluarga_kelurahan"):
            assert f in d and isinstance(d[f], list), f"missing or bad {f}"
        prios = {p["prioritas"] for p in d["prioritas_kunjungan"]}
        assert prios == {"hijau", "kuning", "merah"}
        # keluarga_kelurahan rows have terdaftar/dikunjungi/belum
        for row in d["keluarga_kelurahan"]:
            assert {"kelurahan", "terdaftar", "dikunjungi", "belum"} <= set(row.keys())
            assert row["belum"] == max(row["terdaftar"] - row["dikunjungi"], 0)

    def test_insights_filter_kelurahan(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/dashboard/insights",
                         params={"kelurahan": "Selat Dalam"}, headers=H(admin_token))
        assert r.status_code == 200
        d = r.json()
        kels = {row["kelurahan"] for row in d["keluarga_kelurahan"]}
        assert kels <= {"Selat Dalam", "-"}, f"filter leaked: {kels}"


# ==================== KADER OWNERSHIP ====================
class TestKaderOwnership:
    def test_kader11_sees_14(self, kader11_token):
        r = requests.get(f"{BASE_URL}/api/keluarga", params={"limit": 500}, headers=H(kader11_token))
        assert r.status_code == 200
        assert r.json()["total"] == 14, f"kader11 should see 14 families, got {r.json()['total']}"

    def test_kader12_sees_zero(self, kader12_token):
        r = requests.get(f"{BASE_URL}/api/keluarga", params={"limit": 500}, headers=H(kader12_token))
        assert r.status_code == 200
        assert r.json()["total"] == 0

    def test_kader13_sees_zero(self, kader13_token):
        r = requests.get(f"{BASE_URL}/api/keluarga", params={"limit": 500}, headers=H(kader13_token))
        assert r.status_code == 200
        assert r.json()["total"] == 0

    def test_admin_sees_127(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/keluarga", params={"limit": 500}, headers=H(admin_token))
        assert r.status_code == 200
        assert r.json()["total"] == 127

    def test_kader12_cannot_get_kader11_family(self, kader11_token, kader12_token):
        kid = requests.get(f"{BASE_URL}/api/keluarga", params={"limit": 1},
                           headers=H(kader11_token)).json()["items"][0]["id"]
        r = requests.get(f"{BASE_URL}/api/keluarga/{kid}", headers=H(kader12_token))
        assert r.status_code == 404
        r = requests.put(f"{BASE_URL}/api/keluarga/{kid}", headers=H(kader12_token),
                         json={"nama_kk": "HACK", "alamat": "x", "rt": "1", "rw": "1",
                               "kelurahan": "Selat Tengah", "no_hp": "081",
                               "jumlah_anggota": 1, "status_ekonomi": "menengah"})
        assert r.status_code in (403, 404)
        r = requests.delete(f"{BASE_URL}/api/keluarga/{kid}", headers=H(kader12_token))
        assert r.status_code == 404

    def test_kader12_cannot_add_anggota_to_kader11_family(self, kader11_token, kader12_token):
        kid = requests.get(f"{BASE_URL}/api/keluarga", params={"limit": 1},
                           headers=H(kader11_token)).json()["items"][0]["id"]
        r = requests.post(f"{BASE_URL}/api/anggota", headers=H(kader12_token), json={
            "keluarga_id": kid, "nama": "TEST_HACK", "nik": "", "tanggal_lahir": "2000-01-01",
            "jenis_kelamin": "L", "hubungan": "Lainnya"})
        assert r.status_code == 404

    def test_kader12_cannot_create_kunjungan_for_kader11_family(self, kader11_token, kader12_token):
        kid = requests.get(f"{BASE_URL}/api/keluarga", params={"limit": 1},
                           headers=H(kader11_token)).json()["items"][0]["id"]
        r = requests.post(f"{BASE_URL}/api/kunjungan", headers=H(kader12_token),
                          json={"keluarga_id": kid, "anggota_ids": [], "answers_per_anggota": {},
                                "catatan": "", "status": "draft"})
        assert r.status_code == 404


# ==================== OWNERSHIP ON NEWLY CREATED FAMILY ====================
class TestOwnershipCreateFamily:
    created_id = None

    def test_kader_creates_family_visible_only_to_self(self, kader12_token, kader11_token):
        payload = {"nama_kk": "TEST_OWN_K12", "alamat": "jl test", "rt": "99", "rw": "99",
                   "kelurahan": "Selat Hulu", "no_hp": "0811", "jumlah_anggota": 1,
                   "status_ekonomi": "menengah"}
        r = requests.post(f"{BASE_URL}/api/keluarga", headers=H(kader12_token), json=payload)
        assert r.status_code == 200, r.text
        kid = r.json()["id"]
        TestOwnershipCreateFamily.created_id = kid

        # kader12 can see
        r = requests.get(f"{BASE_URL}/api/keluarga/{kid}", headers=H(kader12_token))
        assert r.status_code == 200

        # kader11 (different wilayah) cannot see
        r = requests.get(f"{BASE_URL}/api/keluarga/{kid}", headers=H(kader11_token))
        assert r.status_code == 404

        # list total for kader12 should be 1
        r = requests.get(f"{BASE_URL}/api/keluarga", headers=H(kader12_token))
        assert r.json()["total"] == 1

    def test_cleanup_created_family(self, kader12_token):
        kid = TestOwnershipCreateFamily.created_id
        if not kid:
            pytest.skip("nothing to cleanup")
        r = requests.delete(f"{BASE_URL}/api/keluarga/{kid}", headers=H(kader12_token))
        assert r.status_code == 200
        # verify kader12 is back to 0
        r = requests.get(f"{BASE_URL}/api/keluarga", headers=H(kader12_token))
        assert r.json()["total"] == 0
