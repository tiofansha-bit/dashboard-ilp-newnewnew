import { useState, useRef, useEffect } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, Users, UserCog, ListChecks } from "lucide-react";

function ImportCard({ testid, icon: Icon, title, desc, templateUrl, templateName, uploadUrl, panduan, assignKader = false }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const [kaders, setKaders] = useState([]);
  const [kaderId, setKaderId] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!assignKader) return;
    api.get("/admin/kader").then((r) => setKaders(r.data || [])).catch(() => {});
  }, [assignKader]);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const res = await api.get(templateUrl, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = templateName; a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Template diunduh");
    } catch (e) { toast.error(errMsg(e)); } finally { setDownloading(false); }
  };

  const upload = async () => {
    if (!file) return toast.error("Pilih file .xlsx terlebih dahulu");
    setUploading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (assignKader && kaderId) fd.append("kader_id", kaderId);
      const res = await api.post(uploadUrl, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(res.data);
      toast.success(`${res.data.created} data berhasil diimpor${res.data.kader ? ` untuk ${res.data.kader}` : ""}`);
      setFile(null); if (inputRef.current) inputRef.current.value = "";
    } catch (e) { toast.error(errMsg(e)); } finally { setUploading(false); }
  };

  return (
    <div data-testid={testid} className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-600"><Icon className="h-6 w-6" /></div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-slate-50 p-3.5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Panduan Pengisian</p>
        <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-600">
          {panduan.map((p, i) => <li key={i}>{p}</li>)}
        </ol>
      </div>

      <button data-testid={`${testid}-download`} onClick={downloadTemplate} disabled={downloading}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-100 disabled:opacity-60">
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Unduh Template Excel
      </button>

      {assignKader && (
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Tujukan ke Kader (opsional)
          </label>
          <select data-testid={`${testid}-kader-select`} value={kaderId}
            onChange={(e) => setKaderId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100">
            <option value="">— Tidak ditujukan (milik admin) —</option>
            {kaders.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama} ({k.username}){k.wilayah?.length ? ` — ${k.wilayah.join(", ")}` : ""}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">Semua keluarga dari file ini akan ditujukan ke kader terpilih dan tampil di daftar kunjungannya.</p>
        </div>
      )}

      <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 hover:border-teal-400">
        <FileSpreadsheet className="h-5 w-5 text-slate-400" />
        <span className="flex-1 truncate text-sm text-slate-600">{file ? file.name : "Pilih file .xlsx untuk diunggah…"}</span>
        <input ref={inputRef} data-testid={`${testid}-file`} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }} />
      </label>

      <button data-testid={`${testid}-upload`} onClick={upload} disabled={uploading || !file}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Unggah & Impor
      </button>

      {result && (
        <div data-testid={`${testid}-result`} className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" /> {result.created} data berhasil diimpor
            {result.gagal > 0 && <span className="ml-auto text-amber-600">{result.gagal} baris gagal</span>}
          </div>
          {result.digabung > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2.5 text-sm font-semibold text-sky-700">
              <Users className="h-5 w-5" /> {result.digabung} baris digabung karena alamat sama persis
            </div>
          )}
          {result.errors?.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-amber-800"><AlertTriangle className="h-4 w-4" /> Baris yang gagal:</p>
              <ul className="space-y-0.5 text-xs text-amber-700">
                {result.errors.map((er, i) => <li key={i}>• Baris {er.row}: {er.msg}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportData() {
  return (
    <div data-testid="import-data-page" className="animate-slide-up space-y-5">
      <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
        <p className="text-sm text-slate-700">
          Impor data secara massal menggunakan file Excel. Unduh template, isi sesuai panduan, lalu unggah kembali.
          Baris yang tidak valid akan dilewati dan dilaporkan tanpa menghentikan proses.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ImportCard
          testid="import-keluarga"
          icon={Users}
          title="Impor Keluarga"
          desc="Tambah banyak data keluarga sekaligus"
          templateUrl="/admin/import/template/keluarga"
          templateName="template_keluarga.xlsx"
          uploadUrl="/admin/import/keluarga"
          assignKader
          panduan={[
            "Kolom wajib: nama_kk dan kelurahan.",
            "Kelurahan: Selat Tengah, Selat Hulu, Selat Dalam, atau Selat Utara.",
            "Kolom punya_jkn / air_bersih / jamban / ventilasi diisi 'Ya' atau 'Tidak'.",
            "Baris dengan alamat sama persis otomatis digabung menjadi 1 keluarga.",
            "Pilih kader tujuan di atas agar keluarga langsung masuk daftar kunjungan kader tsb.",
            "Isi mulai baris ke-2; jangan ubah nama kolom. Hapus baris contoh sebelum unggah.",
          ]}
        />
        <ImportCard
          testid="import-kader"
          icon={UserCog}
          title="Impor Kader"
          desc="Buat banyak akun kader sekaligus"
          templateUrl="/admin/import/template/kader"
          templateName="template_kader.xlsx"
          uploadUrl="/admin/import/kader"
          panduan={[
            "Kolom wajib: nama, username, wilayah.",
            "Username harus unik. Password kosong = default 'kader123'.",
            "Wilayah diisi satu kelurahan. target_keluarga berupa angka (default 30).",
            "Isi mulai baris ke-2; jangan ubah nama kolom. Hapus baris contoh sebelum unggah.",
          ]}
        />
        <ImportCard
          testid="import-pertanyaan"
          icon={ListChecks}
          title="Impor Pertanyaan"
          desc="Tambah banyak pertanyaan ceklis sekaligus"
          templateUrl="/admin/import/template/pertanyaan"
          templateName="template_pertanyaan.xlsx"
          uploadUrl="/admin/import/pertanyaan"
          panduan={[
            "Kolom wajib: group dan text.",
            "group: ibu_hamil, nifas, bayi, balita, remaja, dewasa, lansia, atau tbc.",
            "jenis: yesno, single, number, pemeriksaan, imunisasi, atau danger (kosong = yesno).",
            "opsi (untuk jenis single) & problem_when dipisah dengan titik-koma (;).",
            "wajib & report_required diisi 'Ya'/'Tidak'. priority: kuning/merah/kosong.",
            "Kode dibuat otomatis. Isi mulai baris ke-2; jangan ubah nama kolom.",
          ]}
        />
      </div>
    </div>
  );
}
