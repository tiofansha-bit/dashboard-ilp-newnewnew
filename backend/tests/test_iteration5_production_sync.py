"""Iteration 5 tests: production data KPIs, Mode PIN endpoints, Laporan export format,
TBC universal group, Tindak Lanjut Pustu smoke. REACT_APP_BACKEND_URL from env."""
import os
import re
import requests
import pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE}/api"


def H(t):
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def kader_token():
    r = requests.post(f"{API}/auth/login", json={"username": "kader11", "password": "kader123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ---------- Production-imported KPI values ----------
EXPECTED_KPI = {
    "keluarga_terdaftar": 127,
    "keluarga_dikunjungi": 136,
    "cakupan": 107.1,
    "sasaran_dikunjungi": 481,
    "kasus_merah": 8,
    "kasus_kuning": 2520,
    "belum_ditindaklanjuti": 2456,
    "sedang_ditindaklanjuti": 26,
    "selesai": 46,
    "median_respons_jam": 36,
    "data_belum_lengkap": 9,
    "total_kunjungan": 149,
}


class TestKPIProductionData:
    def test_kpi_matches_expected(self, admin_token):
        r = requests.get(f"{API}/dashboard/kpi", headers=H(admin_token))
        assert r.status_code == 200
        j = r.json()
        # Report all mismatches at once
        mismatches = []
        for k, v in EXPECTED_KPI.items():
            if k not in j:
                mismatches.append(f"{k}: MISSING (expected {v})")
                continue
            got = j[k]
            if isinstance(v, float):
                if abs(float(got) - v) > 0.2:
                    mismatches.append(f"{k}: got {got}, expected {v}")
            else:
                if got != v:
                    mismatches.append(f"{k}: got {got}, expected {v}")
        assert not mismatches, "KPI mismatches: " + "; ".join(mismatches)

    def test_charts_render(self, admin_token):
        r = requests.get(f"{API}/dashboard/charts", headers=H(admin_token))
        assert r.status_code == 200
        j = r.json()
        for k in ("cakupan_kelurahan", "distribusi_kelompok", "top_masalah",
                  "tren_bulanan", "status_tindak_lanjut"):
            assert k in j and j[k] is not None


# ---------- Keluarga count = 127 ----------
class TestKeluargaCount:
    def test_total_127(self, admin_token):
        r = requests.get(f"{API}/keluarga?page=1&page_size=1", headers=H(admin_token))
        assert r.status_code == 200
        j = r.json()
        assert j.get("total") == 127, f"Expected 127 keluarga, got {j.get('total')}"


# ---------- Master questions count = 137 ----------
class TestMasterQuestionsCount:
    def test_count_137(self, admin_token):
        r = requests.get(f"{API}/master/questions", headers=H(admin_token))
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) == 137, f"Expected 137 questions, got {len(rows)}"


# ---------- Mode PIN endpoints ----------
class TestModePin:
    def test_verify_pin_no_auth_401(self):
        r = requests.post(f"{API}/mode/verify-pin", json={"pin": "123456"})
        assert r.status_code == 401

    def test_change_pin_no_auth_401(self):
        r = requests.post(f"{API}/mode/change-pin",
                          json={"current_pin": "123456", "new_pin": "654321"})
        assert r.status_code == 401

    def test_verify_pin_requires_admin(self, kader_token):
        r = requests.post(f"{API}/mode/verify-pin", json={"pin": "123456"}, headers=H(kader_token))
        assert r.status_code == 403

    def test_verify_pin_correct(self, admin_token):
        r = requests.post(f"{API}/mode/verify-pin", json={"pin": "123456"}, headers=H(admin_token))
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_verify_pin_wrong_401(self, admin_token):
        r = requests.post(f"{API}/mode/verify-pin", json={"pin": "000000"}, headers=H(admin_token))
        assert r.status_code == 401
        assert "PIN salah" in r.text

    def test_change_pin_wrong_current_400(self, admin_token):
        r = requests.post(f"{API}/mode/change-pin",
                          json={"current_pin": "000000", "new_pin": "4321"},
                          headers=H(admin_token))
        assert r.status_code == 400
        assert "PIN saat ini salah" in r.text

    def test_change_pin_invalid_format_400(self, admin_token):
        # Non-digit new pin
        r = requests.post(f"{API}/mode/change-pin",
                          json={"current_pin": "123456", "new_pin": "abcd"},
                          headers=H(admin_token))
        assert r.status_code == 400
        # Too short
        r2 = requests.post(f"{API}/mode/change-pin",
                           json={"current_pin": "123456", "new_pin": "12"},
                           headers=H(admin_token))
        assert r2.status_code == 400
        # Too long (>8)
        r3 = requests.post(f"{API}/mode/change-pin",
                           json={"current_pin": "123456", "new_pin": "123456789"},
                           headers=H(admin_token))
        assert r3.status_code == 400

    def test_change_pin_roundtrip(self, admin_token):
        """Change to new pin, verify, change back to 123456 — leave DB untouched."""
        temp_pin = "778899"
        # Change 123456 -> temp
        r = requests.post(f"{API}/mode/change-pin",
                          json={"current_pin": "123456", "new_pin": temp_pin},
                          headers=H(admin_token))
        assert r.status_code == 200
        try:
            # Old PIN no longer works
            bad = requests.post(f"{API}/mode/verify-pin", json={"pin": "123456"},
                                headers=H(admin_token))
            assert bad.status_code == 401
            # New PIN works
            good = requests.post(f"{API}/mode/verify-pin", json={"pin": temp_pin},
                                 headers=H(admin_token))
            assert good.status_code == 200
        finally:
            # ALWAYS restore
            back = requests.post(f"{API}/mode/change-pin",
                                 json={"current_pin": temp_pin, "new_pin": "123456"},
                                 headers=H(admin_token))
            assert back.status_code == 200, "FAILED TO RESTORE PIN TO 123456!"


# ---------- Laporan export: header lines + filename ----------
EXPORT_HEADERS = {
    "kasus": "DAFTAR TINDAK LANJUT & SASARAN BERMASALAH",
}


class TestLaporanExport:
    @pytest.mark.parametrize("jenis", ["kasus", "keluarga", "kunjungan", "tindak_lanjut"])
    def test_csv_official_header_and_filename(self, admin_token, jenis):
        r = requests.get(f"{API}/export/{jenis}?fmt=csv", headers=H(admin_token))
        assert r.status_code == 200, f"{jenis} csv: {r.status_code}"
        text = r.content.decode("utf-8", errors="ignore")
        # Must contain the puskesmas and periode lines
        assert "UPT Puskesmas Melati" in text, f"{jenis}: missing 'UPT Puskesmas Melati' header"
        assert "Periode:" in text, f"{jenis}: missing 'Periode:' line"
        assert "Dicetak:" in text, f"{jenis}: missing 'Dicetak:' line"
        # Filename: laporan_<jenis>_YYYYMMDD.csv
        cd = r.headers.get("content-disposition", "")
        m = re.search(r'filename\*?=["\']?(?:UTF-8\'\')?([^"\';\s]+)', cd)
        assert m, f"{jenis}: no filename in content-disposition: {cd}"
        fname = m.group(1)
        assert re.match(rf"laporan_{jenis}_\d{{8}}\.csv$", fname), f"{jenis}: bad filename {fname}"

    @pytest.mark.parametrize("jenis,fmt,ext", [
        ("kasus", "excel", "xlsx"),
        ("keluarga", "excel", "xlsx"),
        ("kunjungan", "pdf", "pdf"),
        ("tindak_lanjut", "pdf", "pdf"),
    ])
    def test_other_formats_download(self, admin_token, jenis, fmt, ext):
        r = requests.get(f"{API}/export/{jenis}?fmt={fmt}", headers=H(admin_token))
        assert r.status_code == 200
        assert len(r.content) > 100
        cd = r.headers.get("content-disposition", "")
        assert re.search(rf"laporan_{jenis}_\d{{8}}\.{ext}", cd), f"bad filename for {jenis}.{ext}: {cd}"


# ---------- TBC universal group ----------
class TestTBCGroup:
    def test_tbc_questions_present(self, kader_token):
        r = requests.get(f"{API}/master/questions?group=tbc", headers=H(kader_token))
        assert r.status_code == 200
        rows = r.json()
        assert len(rows) >= 5
        codes = {q["kode"] for q in rows}
        for exp in ("TBC_BATUK", "TBC_DEMAM", "TBC_KONTAK"):
            assert exp in codes


# ---------- Tindak Lanjut Pustu smoke ----------
class TestTLSumber:
    def test_sumber_up_to_1000(self, admin_token):
        r = requests.get(f"{API}/admin/tindak-lanjut/sumber", headers=H(admin_token))
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        assert len(rows) <= 1000


# ---------- Admin menus smoke ----------
class TestAdminMenus:
    @pytest.mark.parametrize("path", [
        "/dashboard/kpi",
        "/dashboard/charts",
        "/kasus",
        "/admin/tindak-lanjut",
        "/admin/tindak-lanjut/sumber",
        "/keluarga?page=1&page_size=5",
        "/rekap",
        "/admin/kader",
        "/master/questions",
        "/audit",
        "/akreditasi",
    ])
    def test_endpoint_200(self, admin_token, path):
        r = requests.get(f"{API}{path}", headers=H(admin_token))
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"
