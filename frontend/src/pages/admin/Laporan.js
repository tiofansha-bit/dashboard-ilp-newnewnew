import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, FileDown, FileSpreadsheet, FileText, FileType, Filter } from "lucide-react";

const JENIS = [
  { key: "kasus", label: "Daftar Tindak Lanjut & Sasaran Bermasalah" },
  { key: "kunjungan", label: "Rekap Kunjungan Rumah Kader" },
  { key: "keluarga", label: "Daftar Keluarga Terdaftar" },
  { key: "tindak_lanjut", label: "Rekap Tindak Lanjut Pustu" },
];
const KELURAHAN = ["Selat Tengah", "Selat Hulu", "Selat Dalam", "Selat Utara"];

export default function Laporan() {
  const [rekap, setRekap] = useState(null);
  const [flt, setFlt] = useState({ start: "", end: "", kelurahan: "" });
  useEffect(() => { api.get("/rekap").then((r) => setRekap(r.data)); }, []);

  const download = async (jenis, fmt) => {
    try {
      const res = await api.get(`/export/${jenis}`, { params: { fmt, start: flt.start, end: flt.end, kelurahan: flt.kelurahan }, responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      const tgl = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.href = url; a.download = `laporan_${jenis}_${tgl}.${fmt === "excel" ? "xlsx" : fmt}`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Laporan ${fmt.toUpperCase()} diunduh`);
    } catch (e) { toast.error("Gagal mengunduh laporan"); }
  };

  return (
    <div className="animate-slide-up space-y-5">
      {/* Rekap otomatis */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-4 text-sm font-bold text-slate-800">Rekapitulasi Otomatis (Bulan Berjalan)</p>
        {!rekap ? <Loader2 className="h-6 w-6 animate-spin text-teal-600" /> : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[["Keluarga Dikunjungi", rekap.keluarga_dikunjungi], ["Sasaran Bermasalah", rekap.sasaran_bermasalah], ["Tanda Bahaya", rekap.tanda_bahaya], ["Edukasi Diberikan", rekap.edukasi], ["Dilaporkan ke Nakes", rekap.dilaporkan], ["Kasus Selesai", rekap.kasus_selesai], ["Kasus Belum Selesai", rekap.kasus_belum_selesai]].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-extrabold text-slate-900">{v}</p><p className="text-xs text-slate-500">{l}</p></div>
            ))}
          </div>
        )}
        {rekap && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-slate-500">Sasaran dikunjungi per kelompok</p>
            <div className="flex flex-wrap gap-2">{rekap.per_kelompok.map((p) => <span key={p.kelompok} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">{p.kelompok}: {p.jumlah}</span>)}</div>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800"><FileDown className="h-5 w-5 text-teal-600" /> Ekspor Laporan</p>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Dari Tanggal</label>
            <input data-testid="export-filter-start" type="date" value={flt.start} onChange={(e) => setFlt({ ...flt, start: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Sampai Tanggal</label>
            <input data-testid="export-filter-end" type="date" value={flt.end} onChange={(e) => setFlt({ ...flt, end: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Kelurahan</label>
            <select data-testid="export-filter-kelurahan" value={flt.kelurahan} onChange={(e) => setFlt({ ...flt, kelurahan: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Semua Kelurahan</option>
              {KELURAHAN.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
        {(flt.start || flt.end || flt.kelurahan) && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-700">
            <Filter className="h-3.5 w-3.5" /> Filter aktif: {flt.start || "…"} s/d {flt.end || "…"}{flt.kelurahan ? ` · ${flt.kelurahan}` : ""}
            <button data-testid="export-filter-reset" onClick={() => setFlt({ start: "", end: "", kelurahan: "" })} className="ml-auto rounded bg-white px-2 py-0.5 font-semibold text-teal-700">Reset</button>
          </div>
        )}
        <div className="space-y-3">
          {JENIS.map((j) => (
            <div key={j.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <span className="text-sm font-medium text-slate-700">{j.label}</span>
              <div className="flex gap-2">
                <button data-testid={`export-${j.key}-csv`} onClick={() => download(j.key, "csv")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-400"><FileText className="h-4 w-4" /> CSV</button>
                <button data-testid={`export-${j.key}-excel`} onClick={() => download(j.key, "excel")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-400"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
                <button data-testid={`export-${j.key}-pdf`} onClick={() => download(j.key, "pdf")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-teal-400"><FileType className="h-4 w-4" /> PDF</button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Laporan mencantumkan tanggal cetak & nama pengguna yang mencetak.</p>
      </div>
    </div>
  );
}
