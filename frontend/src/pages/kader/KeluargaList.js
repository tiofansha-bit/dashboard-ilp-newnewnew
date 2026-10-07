import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { cacheSet, cacheGet } from "@/lib/offline";
import { Search, Plus, ChevronRight, MapPin, Users, CheckCircle2, Circle, Loader2, ClipboardPlus } from "lucide-react";

export default function KeluargaList({ go }) {
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get("/keluarga", { params: { search } })
      .then((r) => { setData(r.data); if (!search) cacheSet("families_list", r.data); })
      .catch(() => { const c = cacheGet("families_list"); if (c) setData(c); });
  }, [search]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  return (
    <div className="animate-slide-up">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-md">
        <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Keluarga</h1>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input data-testid="input-search-keluarga" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama KK, alamat, RT, no HP…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-base outline-none focus:border-teal-500 focus:bg-white" />
        </div>
      </header>

      <div className="px-4 py-4">
        <button data-testid="btn-tambah-keluarga" onClick={() => go("keluarga-form", {})}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50 py-3 text-base font-semibold text-teal-700 hover:bg-teal-100">
          <Plus className="h-5 w-5" /> Tambah Keluarga Baru
        </button>

        {!data ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
        ) : data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Belum ada keluarga.</p>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-slate-400">{data.total} keluarga</p>
            {data.items.map((k) => (
              <button key={k.id} data-testid={`keluarga-card-${k.id}`} onClick={() => go("keluarga-form", { id: k.id })}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-teal-300">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${k.sudah_dikunjungi ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                  {k.sudah_dikunjungi ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-800">{k.nama_kk}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" /> RT {k.rt}/{k.rw} · {k.kelurahan}
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {k.jumlah_anggota_aktual}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
