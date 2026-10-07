"""Iteration 7: flexible Top-N controls backend verification + kader beranda regression."""
import os
import requests
import pytest
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


def _login(username, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"username": username, "password": password}, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def admin_headers():
    return {"Authorization": f"Bearer {_login('admin', 'admin123')}"}


@pytest.fixture(scope="module")
def kader11_headers():
    return {"Authorization": f"Bearer {_login('kader11', 'kader123')}"}


# dashboard/jawaban now returns ALL problem items (>10) each with group
def test_dashboard_jawaban_kesimpulan_has_group_and_more_than_10(admin_headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/jawaban", headers=admin_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "kesimpulan_utama" in data
    items = data["kesimpulan_utama"]
    assert isinstance(items, list)
    print(f"kesimpulan_utama items: {len(items)}")
    # must contain more than 10 items (per spec)
    assert len(items) > 10, f"expected >10 kesimpulan_utama items, got {len(items)}"
    # each item has group field
    for it in items:
        assert "group" in it, f"missing 'group' key in item: {it}"
        assert "priority" in it
        assert "persen" in it
        assert "responden" in it


# dashboard/charts top_masalah returns up to 50
def test_dashboard_charts_top_masalah_up_to_50(admin_headers):
    r = requests.get(f"{BASE_URL}/api/dashboard/charts", headers=admin_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "top_masalah" in data
    top = data["top_masalah"]
    assert isinstance(top, list)
    print(f"top_masalah length: {len(top)}")
    assert len(top) <= 50
    # should be more than 10 given existing data
    assert len(top) > 10, f"expected >10 top_masalah items, got {len(top)}"


# Regression: kader11 beranda sudah_dikunjungi <= total_keluarga
def test_kader_beranda_regression(kader11_headers):
    r = requests.get(f"{BASE_URL}/api/kader/beranda", headers=kader11_headers, timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    print(f"kader11 beranda: {data}")
    total = data.get("total_keluarga")
    done = data.get("sudah_dikunjungi")
    assert total is not None and done is not None
    assert total == 14, f"expected 14 keluarga, got {total}"
    assert done <= total, f"sudah_dikunjungi ({done}) must be <= total_keluarga ({total})"
