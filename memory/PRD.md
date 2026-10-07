# ILP Melati — Digitalisasi Ceklis Kunjungan Rumah

## Task (2026-06)
Import existing repo `ILP-Melati-kunjunganrumah`, run it end-to-end in this environment, restore original data, verify admin/kader flow + "Impor Keluarga → Tujukan ke Kader".

## Source
- Repo: https://github.com/tiofansha-bit/ILP-Melati-kunjunganrumah.git
- No `final` branch existed. Selected **`conflict_230926_1944`** — the only branch with `backend/snapshot/` folder AND the "Tujukan ke Kader" feature; scanned clean (no conflict markers).
- Contents copied into /app (backend + frontend), preserving .git/.emergent/memory.

## Stack
- Backend: FastAPI (supervisor, 0.0.0.0:8001, all routes `/api`), MongoDB local `ilp_melati`.
- Frontend: React (CRACO), Tailwind/shadcn.
- Auth: JWT, login by **username**.
- Import: Excel via openpyxl; PDF via fpdf2.

## Setup notes
- `emergentintegrations`/`litellm` pin conflict → installed requirements WITHOUT `emergentintegrations` (server.py does not use it). openpyxl + fpdf2 confirmed installed.
- `.env` created (not in repo). Frontend REACT_APP_BACKEND_URL kept as provided preview URL; backend FRONTEND_URL set to same origin.
- Data restored via `python backend/snapshot_data.py restore`.

## Restored data
users 31 · wilayah 4 · posyandu 6 · master_questions 135 · keluarga 56 · anggota 197 · kunjungan 66 · kasus 496 · audit_logs 2 · akreditasi 1

## Verified (2026-06)
- admin/admin123 ✓ · kader11/kader123 ✓ (curl)
- Frontend login page renders ✓
- E2E: admin imports keluarga with "Tujukan ke Kader"=kader11 → created 1 → kader11 sees the family ✓ (test row cleaned up after)

## Backlog / Next
- Full UI regression via testing agent if deeper coverage needed.

## Re-import (2026-06, latest branch)
- Re-cloned repo; confirmed latest branch by commit date = `conflict_230926_1944` (Sep 24). Re-copied backend+frontend into /app.
- Re-applied env CORS fix (allow_origin_regex for *.emergentagent.com & *.emergentcf.cloud — needed because CDN rewrites browser Origin to *.emergentcf.cloud).
- Recreated backend/.env & frontend/.env (gitignored). Reinstalled deps (backend minus emergentintegrations pin; frontend yarn). Restored snapshot data. Restarted supervisor.
- Verified: preflight 200, admin login 200, kader11 login 200, /auth/me 200.

## Feature: Tambah Ceklis/Pertanyaan (2026-06)
- Verified browser login admin/admin123 -> dashboard + menu 'Import Data' & 'Master Pertanyaan' tampil.
- Backend: POST /api/master/questions (create) + DELETE /api/master/questions/{kode} (soft delete), skema sama dgn master_questions (kode auto-generate unik, urutan=max+1 per group, field 'custom':true).
- Frontend MasterQuestions.js: tombol 'Tambah Pertanyaan' + modal (group, section, jenis, text, definisi, satuan, opsi, wajib, priority, problem_when, report_required) + tombol hapus utk pertanyaan custom + badge 'baru'.
- Pertanyaan ceklis baru otomatis muncul di wizard kunjungan kader untuk group tsb.
- Testing agent: 100% backend & frontend, DB bersih.

## Fix + Features (2026-06, session 4)
- FIX "Network Error di preview": penyebab uvicorn --reload memegang CWD /app/backend yg sudah di-rm-rf saat re-import (FileNotFoundError getcwd) -> backend down intermiten. Solusi: clean supervisor restart. Terverifikasi testing agent 100% (login + semua menu admin, tanpa network error).
- FEATURE Edit Penuh Pertanyaan Custom: EditModal kini menampilkan field jenis, section, satuan, opsi, report_required KHUSUS pertanyaan custom (built-in tetap edit terbatas). Backend PUT /master/questions/{kode} disanitasi utk terima field penuh.
- FEATURE Impor Pertanyaan Excel: GET /admin/import/template/pertanyaan + POST /admin/import/pertanyaan (kolom group,section,text,jenis,satuan,opsi,wajib,priority,problem_when,report_required,definisi; opsi & problem_when dipisah ';'). Card baru 'Impor Pertanyaan' di halaman Import Data. Baris invalid dilewati & dilaporkan.
- Testing agent iteration_4: 100% backend & frontend, DB baseline.

## Import session (2026-06) — dashboard-ilp-new + prod data
- Repo `dashboard-melati-ilp-2` tidak ada/private (404) → user memilih `dashboard-ilp-new` (versi terbaru, superset ILP-Melati-kunjunganrumah), branch main.
- Deps terpasang (backend tanpa emergentintegrations; frontend yarn). .env dibuat (JWT_SECRET, FRONTEND_URL).
- Data diimpor dari https://home-visit-portal-1.emergent.host via API: `backend/migrate_from_portal.py`.
  users 26 · wilayah 4 · posyandu 6 · master_questions 137 · keluarga 127 · anggota 453 · kunjungan 156 · kasus 2528 · notifikasi 50 · audit_logs 200 · akreditasi 1.
  553 kasus (dewasa/kuning/baru/Selat Hulu) dibangun ulang dari temuan kunjungan karena batas 500 baris API (ID baru). KPI dashboard identik dgn produksi.
- Snapshot diperbarui (`python backend/snapshot_data.py restore` untuk memulihkan).
- Password: admin/admin123, kader/kader123 (hash tidak bisa diambil via API).

## Sync dgn kode produksi (2026-06)
- Frontend: diambil persis dari source map produksi (main.18d6458b.js.map): menu Tindak Lanjut Pustu, Mode switch tersembunyi ber-PIN (Data Asli/Akreditasi), edit Akreditasi dikunci PIN, skrining TBC semua usia di wizard, jenis pertanyaan "multi", laporan Rekap Tindak Lanjut Pustu.
- Backend: dari branch `conflict_240926_1146` (dashboard-ilp-new) — tindak-lanjut CRUD + sumber, ekspor format baru (header resmi). Ditambahkan sendiri: POST /api/mode/verify-pin & /api/mode/change-pin (tidak ada di repo; perilaku disamakan dgn respons prod). PIN default MODE_PIN=123456.
- Ekspor CSV lokal vs produksi: isi identik (selisih urutan baris & ±1 menit pada 553 kasus yg dibangun ulang).

## Dashboard jawaban + kepemilikan keluarga (2026-06)
- Kader hanya melihat/mengubah keluarga yang ia input sendiri (created_by) ATAU yang ditujukan ke dirinya (kader_id). Berlaku utk list, detail, edit, hapus, anggota, kunjungan, beranda, duplicate-check; GET /kunjungan/{id} kader hanya miliknya. Keluarga yg diinput admin tanpa kader (15) tidak tampil di kader mana pun.
- GET /api/dashboard/jawaban: rekap jawaban kunjungan terakhir per sasaran per pertanyaan (Ya/Tidak/Sudah/Belum/opsi, angka rata2/min/maks, pemeriksaan Sudah/Belum, imunisasi Lengkap/Belum), % bermasalah, kalimat kesimpulan, top-10 "Kesimpulan Utama". Pertanyaan bersyarat (Jika HT/DM/TBC, Khusus remaja putri, Khusus ≥15 th) hanya dihitung utk sasaran yg memenuhi syarat.
- GET /api/dashboard/insights: prioritas kunjungan, keluarga sudah/belum dikunjungi per kelurahan, kasus per kelurahan (merah/kuning/selesai), kasus per kelompok, kunjungan per posyandu, top 10 kader.
- Frontend Dashboard: tab "Ringkasan & Grafik" (+6 grafik baru) & "Hasil Jawaban & Kesimpulan" (JawabanSummary.js, DashboardInsights.js).

## Top-N masalah fleksibel (2026-06)
- Grafik "N Masalah Terbanyak": pilihan Top 5/10/15/20/30/Semua (tersimpan di localStorage).
- "Masalah Kesehatan Utama": filter jumlah, kelompok, prioritas, urutan (tanda bahaya/%/jumlah), min. responden. Backend kirim semua item.
- Fix: beranda kader sudah_dikunjungi hanya dihitung dari keluarga miliknya.

## Laporan rekap standar administrasi (2026-06)
- Laporan baru: "Rekap Masalah Kesehatan per Sasaran (per Nama)" (export jenis masalah_sasaran: identitas, L/P-umur, KK, alamat, posyandu, kader, tgl kunjungan, jml & daftar bernomor seluruh masalah [TANDA BAHAYA], prioritas, status TL) dan "Rekap Masalah Kesehatan Kolektif" (masalah_kolektif: per indikator jml bermasalah/responden/% + kesimpulan). Pertanyaan bersyarat difilter sama seperti dashboard.
- Semua ekspor (CSV/Excel/PDF): kop surat 3 baris + alamat + garis ganda, judul bergaris bawah, periode, tgl cetak, nomor halaman, blok TTD 2 kolom (Mengetahui Kepala Puskesmas + NIP | Kota, tanggal Indonesia, Pembuat Laporan). Excel: landscape A4 fit-width, header berulang.
- Pengaturan kop & TTD: GET/PUT /api/admin/laporan-settings (db.settings key=laporan), form di halaman Laporan.
- Pratinjau tabel: GET /api/laporan/preview/{jenis} (modal di Laporan). Rekap otomatis kini mengikuti filter tanggal/kelurahan.
