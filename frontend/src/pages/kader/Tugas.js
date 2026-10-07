import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CASE_STATUS_LABEL } from "@/lib/status";
import { Loader2, ListTodo, Clock, MapPin } from "lucide-react";

const PRIO = { merah: "bg-rose-100 text-rose-700", kuning: "bg-amber-100 text-amber-700", hijau: "bg-emerald-100 text-emerald-700" };
const STAT_TONE = (s) => (s === "selesai" ? "bg-emerald-100 text-emerald-700" : s === "baru" ? "bg-slate-100 text-slate-600" : "bg-sky-100 text-sky-700");

export default function Tugas() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get("/kader/laporan-status").then((r) => setRows(r.data)); }, []);
  if (!rows) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>;

  return (
    <div className="animate-slide-up">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-md">
        <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900"><ListTodo className="h-5 w-5 text-teal-600" /> Tugas & Status Laporan</h1>
        <p className="text-xs text-slate-400">Pantau tindak lanjut laporan yang Anda kirim</p>
      </header>
      <div className="space-y-2.5 px-4 py-4">
        {rows.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Belum ada laporan.</p>}
        {rows.map((c) => (
          <div key={c.id} data-testid={`laporan-${c.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1 text-sm font-bold text-slate-800">{c.masalah}</p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${PRIO[c.priority]}`}>{c.priority}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">{c.sasaran_nama} · {c.keluarga_nama}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="h-3.5 w-3.5" /> {c.kelurahan} RT {c.rt}
              <Clock className="ml-1 h-3.5 w-3.5" /> {String(c.waktu_lapor).slice(0, 10)}
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${STAT_TONE(c.status)}`}>{CASE_STATUS_LABEL[c.status] || c.status}</span>
              {c.penanggung_jawab && <span className="text-[11px] text-slate-400">PJ: {c.penanggung_jawab}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
