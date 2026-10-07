"""Backend tests for admin Tindak Lanjut Pustu endpoints and universal TB screening group."""
import os
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


# ---------- TBC master group (universal TB screening) ----------
class TestTBCMasterGroup:
    def test_tbc_group_has_questions(self, kader_token):
        r = requests.get(f"{API}/master/questions?group=tbc", headers=H(kader_token))
        assert r.status_code == 200
        rows = r.json()
        # Spec says 8 questions
        assert len(rows) >= 5, f"tbc group has only {len(rows)} questions"
        codes = {q["kode"] for q in rows}
        # Expect at least these codes per spec
        for expected in ["TBC_BATUK", "TBC_DEMAM", "TBC_KONTAK"]:
            assert expected in codes, f"Missing expected TB code {expected}. Got: {codes}"

    def test_tbc_group_listed_in_groups(self, kader_token):
        r = requests.get(f"{API}/master/groups", headers=H(kader_token))
        assert r.status_code == 200
        codes = [g["code"] for g in r.json()]
        assert "tbc" in codes


# ---------- Auth guards on TL Pustu ----------
class TestTLAuth:
    def test_sumber_requires_admin(self, kader_token):
        r = requests.get(f"{API}/admin/tindak-lanjut/sumber", headers=H(kader_token))
        assert r.status_code == 403

    def test_list_requires_admin(self, kader_token):
        r = requests.get(f"{API}/admin/tindak-lanjut", headers=H(kader_token))
        assert r.status_code == 403

    def test_create_requires_admin(self, kader_token):
        r = requests.post(f"{API}/admin/tindak-lanjut",
                          json={"nama": "x", "posyandu": "y", "tindak_lanjut": "z"},
                          headers=H(kader_token))
        assert r.status_code == 403

    def test_no_auth(self):
        r = requests.get(f"{API}/admin/tindak-lanjut")
        assert r.status_code == 401


# ---------- TL Pustu CRUD ----------
class TestTLCRUD:
    def test_get_sumber_shape(self, admin_token):
        r = requests.get(f"{API}/admin/tindak-lanjut/sumber", headers=H(admin_token))
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        if rows:
            row = rows[0]
            for k in ("kasus_id", "posyandu", "nama", "masalah", "sudah_ada_tl"):
                assert k in row, f"Missing field {k} in sumber row"

    def test_list_initial(self, admin_token):
        r = requests.get(f"{API}/admin/tindak-lanjut", headers=H(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_validation_missing_fields(self, admin_token):
        # Missing tindak_lanjut
        r = requests.post(f"{API}/admin/tindak-lanjut",
                          json={"nama": "TEST_QA", "posyandu": "Melati 1"},
                          headers=H(admin_token))
        assert r.status_code == 400
        # Missing nama
        r = requests.post(f"{API}/admin/tindak-lanjut",
                          json={"posyandu": "Melati 1", "tindak_lanjut": "x"},
                          headers=H(admin_token))
        assert r.status_code == 400
        # Missing posyandu
        r = requests.post(f"{API}/admin/tindak-lanjut",
                          json={"nama": "TEST_QA", "tindak_lanjut": "x"},
                          headers=H(admin_token))
        assert r.status_code == 400

    def test_full_crud_manual(self, admin_token):
        payload = {
            "nama": "TEST_TL_QA",
            "posyandu": "Melati QA",
            "tindak_lanjut": "Kunjungan rumah + edukasi (QA)",
            "nik": "9999999999999999",
            "alamat": "Jl Uji QA",
            "no_telp": "0800000",
            "masalah": "QA masalah",
            "kelurahan": "Selat Tengah",
            "petugas": "QA Bot",
        }
        # Create
        r = requests.post(f"{API}/admin/tindak-lanjut", json=payload, headers=H(admin_token))
        assert r.status_code == 200, r.text
        created = r.json()
        tid = created["id"]
        assert created["nama"] == payload["nama"]
        assert created["posyandu"] == payload["posyandu"]
        assert created["tindak_lanjut"] == payload["tindak_lanjut"]
        assert "_id" not in created

        # Appears in list
        lst = requests.get(f"{API}/admin/tindak-lanjut", headers=H(admin_token)).json()
        assert any(x["id"] == tid for x in lst)

        # Update
        upd = requests.put(f"{API}/admin/tindak-lanjut/{tid}",
                           json={"tindak_lanjut": "Diperbarui QA"},
                           headers=H(admin_token))
        assert upd.status_code == 200, upd.text
        assert upd.json()["tindak_lanjut"] == "Diperbarui QA"
        # Persist
        lst2 = requests.get(f"{API}/admin/tindak-lanjut", headers=H(admin_token)).json()
        found = next(x for x in lst2 if x["id"] == tid)
        assert found["tindak_lanjut"] == "Diperbarui QA"

        # Delete
        d = requests.delete(f"{API}/admin/tindak-lanjut/{tid}", headers=H(admin_token))
        assert d.status_code == 200
        # Gone
        lst3 = requests.get(f"{API}/admin/tindak-lanjut", headers=H(admin_token)).json()
        assert not any(x["id"] == tid for x in lst3)

    def test_create_from_kasus_marks_sudah_ada_tl(self, admin_token):
        # find any kasus id
        kasus = requests.get(f"{API}/kasus", headers=H(admin_token)).json()
        if not kasus:
            pytest.skip("No kasus available")
        k = kasus[0]
        payload = {
            "kasus_id": k["id"],
            "nama": k.get("sasaran_nama") or "TEST_QA",
            "posyandu": k.get("posyandu") or "Melati QA",
            "masalah": k.get("masalah") or "QA",
            "tindak_lanjut": "QA follow-up from kasus",
        }
        r = requests.post(f"{API}/admin/tindak-lanjut", json=payload, headers=H(admin_token))
        assert r.status_code == 200, r.text
        tid = r.json()["id"]
        try:
            # Verify sumber marks it done
            sumber = requests.get(f"{API}/admin/tindak-lanjut/sumber", headers=H(admin_token)).json()
            row = next((x for x in sumber if x["kasus_id"] == k["id"]), None)
            assert row is not None
            assert row["sudah_ada_tl"] is True
        finally:
            requests.delete(f"{API}/admin/tindak-lanjut/{tid}", headers=H(admin_token))

    def test_delete_nonexistent_404(self, admin_token):
        r = requests.delete(f"{API}/admin/tindak-lanjut/does-not-exist-xyz", headers=H(admin_token))
        assert r.status_code == 404
