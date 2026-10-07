import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Loader2, Search, Users, MapPin } from "lucide-react";

export default function KeluargaAdmin() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [kel, setKel] = useState("");
  const load = useCallback(() => api.get("/keluarga", { params: { search, kelurahan: kel, limit: 100 } }).then((r) => setData(r.data)), [search, kel]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input data-testid="admin-search-keluarga" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari keluarga…" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" />
        </div>
        <select value={kel} onChange={(e) => setKel(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {["", "Selat Tengah", "Selat Hulu", "Selat Dalam", "Selat Utara"].map((k) => <option key={k} value={k}>{k || "Semua Kelurahan"}</option>)}
        </select>
      </div>
      {!data ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500">{data.total} keluarga terdaftar</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr>{["Kepala Keluarga", "Alamat", "Kelurahan", "Anggota", "Status Kunjungan", "Kader"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{k.nama_kk}</td>
                    <td className="px-4 py-3 text-slate-500">{k.alamat} RT {k.rt}/{k.rw}</td>
                    <td className="px-4 py-3 text-slate-500">{k.kelurahan}</td>
                    <td className="px-4 py-3 text-slate-500">{k.jumlah_anggota_aktual}</td>
                    <td className="px-4 py-3">{k.sudah_dikunjungi ? <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Sudah</span> : <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">Belum</span>}</td>
                    <td className="px-4 py-3 text-slate-500">{k.created_by_nama}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
