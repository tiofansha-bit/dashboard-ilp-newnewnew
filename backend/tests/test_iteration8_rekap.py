"""Iteration 8: Rekap report (masalah_sasaran, masalah_kolektif) tests.

Covers:
- Admin login
- GET /api/laporan/preview/{jenis} for new jenis + existing jenis
- 400 for unknown jenis
- Admin-only
- GET /api/export/{jenis}?fmt=csv/excel/pdf for 6 jenis
- GET/PUT /api/admin/laporan-settings persistence
- Kop lines + signature appear in CSV & PDF after setting fields
- Restores settings to defaults after
"""
import io
import os
import re
import requests
import pytest

def _load_url():
    v = os.environ.get("REACT_APP_BACKEND_URL")
    if v:
        return v.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_url()
API = f"{BASE_URL}/api"

JENIS_ALL = ["masalah_sasaran", "masalah_kolektif", "kasus", "kunjungan", "keluarga", "tindak_lanjut"]

DEFAULT_SETTINGS = {
    "instansi": "", "dinas": "", "puskesmas": "UPT Puskesmas Melati", "alamat": "",
    "kota": "", "jabatan_kepala": "", "kepala_nama": "", "kepala_nip": "",
}


@pytest.fixture(scope="session")
def admin():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok, r.text
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="session")
def kader():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"username": "kader1", "password": "kader123"}, timeout=30)
    if r.status_code != 200:
        return None
    tok = r.json().get("access_token") or r.json().get("token")
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


# ---------- preview ----------
class TestLaporanPreview:
    def test_preview_masalah_sasaran(self, admin):
        r = admin.get(f"{API}/laporan/preview/masalah_sasaran", params={"limit": 100}, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "title" in d and "periode" in d and "total" in d and "headers" in d and "rows" in d
        assert d["title"].startswith("REKAP MASALAH KESEHATAN PER SASARAN")
        hs = d["headers"]
        assert hs[0] == "No"
        for col in ["Nama Sasaran", "NIK", "Kelompok", "Kepala Keluarga", "Alamat", "Posyandu",
                    "Kader", "Tgl Kunjungan", "Jml Masalah", "Daftar Masalah Kesehatan",
                    "Prioritas", "Status Tindak Lanjut"]:
            assert col in hs, f"missing header {col}"
        # Row count <= 100 preview
        assert len(d["rows"]) <= 100
        if d["rows"]:
            # Row has correct number of columns
            assert all(len(r) == len(hs) for r in d["rows"])
            # No duplicate name (one row per person) - check by index 1 (Nama Sasaran)
            names = [r[1] for r in d["rows"]]
            # not strictly unique (different people can share name), but test NIK uniqueness
            nik_idx = hs.index("NIK")
            niks = [r[nik_idx] for r in d["rows"] if r[nik_idx] and r[nik_idx] != "-"]
            assert len(niks) == len(set(niks)), "duplicate NIK found"
            # Sort: merah first
            prio_idx = hs.index("Prioritas")
            prios = [r[prio_idx] for r in d["rows"]]
            # merah rows should appear before non-merah
            seen_non_merah = False
            for p in prios:
                is_merah = "Merah" in p
                if seen_non_merah:
                    assert not is_merah, "merah row after non-merah row (sort violated)"
                if not is_merah:
                    seen_non_merah = True
            # Daftar Masalah contains numbered list
            d_idx = hs.index("Daftar Masalah Kesehatan")
            for row in d["rows"]:
                daftar = row[d_idx]
                assert re.match(r"^1\.", daftar), f"not numbered: {daftar[:40]}"

    def test_preview_masalah_kolektif(self, admin):
        r = admin.get(f"{API}/laporan/preview/masalah_kolektif", timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["title"] == "REKAP MASALAH KESEHATAN KOLEKTIF"
        for col in ["Kelompok Sasaran", "Masalah Kesehatan / Indikator", "Prioritas",
                    "Sasaran Bermasalah", "Jml Responden", "Persentase", "Kesimpulan"]:
            assert col in d["headers"]

    def test_preview_all_jenis(self, admin):
        for j in JENIS_ALL:
            r = admin.get(f"{API}/laporan/preview/{j}", timeout=60)
            assert r.status_code == 200, f"{j} => {r.status_code} {r.text[:200]}"
            d = r.json()
            assert d["headers"][0] == "No"
            assert isinstance(d["rows"], list)

    def test_preview_unknown_400(self, admin):
        r = admin.get(f"{API}/laporan/preview/foobar", timeout=20)
        assert r.status_code == 400

    def test_preview_kelurahan_filter(self, admin):
        r_all = admin.get(f"{API}/laporan/preview/masalah_sasaran", timeout=60).json()
        r_sel = admin.get(f"{API}/laporan/preview/masalah_sasaran",
                          params={"kelurahan": "Selat Dalam"}, timeout=60).json()
        # Filter should affect totals (<=) and periode text contains kelurahan
        assert r_sel["total"] <= r_all["total"]
        assert "Selat Dalam" in r_sel["periode"]

    def test_preview_admin_only(self, kader):
        if kader is None:
            pytest.skip("kader1 login failed")
        r = kader.get(f"{API}/laporan/preview/masalah_sasaran", timeout=20)
        assert r.status_code in (401, 403)


# ---------- export ----------
class TestExport:
    @pytest.mark.parametrize("jenis", JENIS_ALL)
    @pytest.mark.parametrize("fmt", ["csv", "excel", "pdf"])
    def test_export(self, admin, jenis, fmt):
        r = admin.get(f"{API}/export/{jenis}", params={"fmt": fmt}, timeout=90)
        assert r.status_code == 200, f"{jenis}/{fmt} => {r.status_code} {r.text[:200]}"
        assert len(r.content) > 50
        if fmt == "csv":
            txt = r.content.decode("utf-8-sig", errors="replace")
            assert "UPT PUSKESMAS MELATI" in txt.upper()
            assert "Total data:" in txt
            assert "Mengetahui," in txt
            assert "Pembuat Laporan," in txt
        elif fmt == "pdf":
            assert r.content.startswith(b"%PDF")
        elif fmt == "excel":
            assert r.content[:2] == b"PK"

    def test_export_unknown_400(self, admin):
        r = admin.get(f"{API}/export/foobar", params={"fmt": "csv"}, timeout=20)
        assert r.status_code == 400


# ---------- settings ----------
class TestLaporanSettings:
    def test_get_default_shape(self, admin):
        r = admin.get(f"{API}/admin/laporan-settings", timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in DEFAULT_SETTINGS:
            assert k in d

    def test_put_then_export_contains_kop_and_signature(self, admin):
        # Save settings
        payload = {
            "instansi": "PEMERINTAH KABUPATEN TEST",
            "dinas": "DINAS KESEHATAN TEST",
            "puskesmas": "UPT Puskesmas Melati",
            "alamat": "Jl. Testing No. 1",
            "kota": "Kuala Kapuas",
            "jabatan_kepala": "Kepala UPT Puskesmas Melati",
            "kepala_nama": "dr. Test",
            "kepala_nip": "1987",
        }
        r = admin.put(f"{API}/admin/laporan-settings", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        got = r.json()
        for k, v in payload.items():
            assert got[k] == v, f"{k}: expected {v} got {got[k]}"

        # GET re-check persistence
        r2 = admin.get(f"{API}/admin/laporan-settings", timeout=20).json()
        assert r2["kepala_nama"] == "dr. Test"
        assert r2["kota"] == "Kuala Kapuas"

        # Export CSV contains kop & signature values
        rc = admin.get(f"{API}/export/masalah_kolektif", params={"fmt": "csv"}, timeout=60)
        assert rc.status_code == 200
        txt = rc.content.decode("utf-8-sig", errors="replace")
        assert "PEMERINTAH KABUPATEN TEST" in txt
        assert "DINAS KESEHATAN TEST" in txt
        assert "Jl. Testing No. 1" in txt
        assert "Kuala Kapuas" in txt
        assert "dr. Test" in txt
        assert "NIP. 1987" in txt

        # Export PDF binary should contain name (fpdf lays text directly)
        rp = admin.get(f"{API}/export/masalah_kolektif", params={"fmt": "pdf"}, timeout=90)
        assert rp.status_code == 200
        assert rp.content.startswith(b"%PDF")
        # try to find text; may be compressed in streams. Try pypdf.
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(rp.content))
            all_text = ""
            for p in reader.pages:
                all_text += p.extract_text() or ""
            assert "PEMERINTAH KABUPATEN TEST" in all_text or "KABUPATEN TEST" in all_text
            assert "dr. Test" in all_text
            assert "Halaman 1 dari" in all_text
        except ImportError:
            # fallback: just assert kota/nip present as raw bytes
            raw = rp.content
            # fpdf uses latin-1; names should be present somewhere
            assert b"dr. Test" in raw or b"Test" in raw

    def test_restore_defaults(self, admin):
        r = admin.put(f"{API}/admin/laporan-settings", json=DEFAULT_SETTINGS, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k, v in DEFAULT_SETTINGS.items():
            assert d[k] == v, f"restore failed {k}={d[k]}"
