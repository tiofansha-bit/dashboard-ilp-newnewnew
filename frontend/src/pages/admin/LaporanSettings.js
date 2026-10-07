import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Settings2, Save, ChevronDown } from "lucide-react";

const FIELDS = [
  ["instansi", "Instansi (baris 1 kop)", "cth. PEMERINTAH KABUPATEN ..."],
  ["dinas", "Dinas (baris 2 kop)", "cth. DINAS KESEHATAN"],
  ["puskesmas", "Nama Puskesmas (baris 3 kop)", "UPT Puskesmas Melati"],
  ["alamat", "Alamat / Kontak", "Jl. ... Telp. ... Email ..."],
  ["kota", "Kota Penandatanganan", "cth. Kuala Kapuas"],
  ["jabatan_kepala", "Jabatan Penandatangan", "Kepala UPT Puskesmas Melati"],
  ["kepala_nama", "Nama Kepala Puskesmas", "Nama lengkap & gelar"],
  ["kepala_nip", "NIP Kepala Puskesmas", "19xxxxxxxxxxxxxxxx"],
];

export default function LaporanSettings() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get("/admin/laporan-settings").then((r) => setForm(r.data)); }, []);

  const save = async () => {
    setSaving(true);
    try { const r = await api.put("/admin/laporan-settings", form); setForm(r.data); toast.success("Kop & tanda tangan laporan disimpan"); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <button data-testid="laporan-settings-toggle" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Settings2 className="h-5 w-5 text-teal-600" /> Pengaturan Kop Surat & Tanda Tangan</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && form && (
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([k, label, ph]) => (
              <div key={k}>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
                <input data-testid={`laporan-setting-${k}`} value={form[k] || ""} placeholder={ph} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Dipakai di semua laporan CSV, Excel & PDF (kop, kota/tanggal, nama & NIP penandatangan).</p>
            <button data-testid="laporan-settings-save" onClick={save} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"><Save className="h-4 w-4" /> Simpan</button>
          </div>
        </div>
      )}
    </div>
  );
}
