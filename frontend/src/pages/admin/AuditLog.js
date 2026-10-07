import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, ScrollText } from "lucide-react";

const AKSI = { create: "bg-emerald-100 text-emerald-700", update: "bg-sky-100 text-sky-700", export: "bg-amber-100 text-amber-700", delete: "bg-rose-100 text-rose-700" };

export default function AuditLog() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get("/audit").then((r) => setRows(r.data)); }, []);
  return (
    <div className="animate-slide-up">
      {!rows ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700"><ScrollText className="h-5 w-5 text-teal-600" /> Jejak Perubahan Data (Audit Trail)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr>{["Waktu", "Pengguna", "Aksi", "Entitas", "Detail"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">{String(r.waktu).slice(0, 19).replace("T", " ")}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.user_nama}</td>
                    <td className="px-4 py-2.5"><span className={`rounded px-2 py-0.5 text-xs font-semibold ${AKSI[r.aksi] || "bg-slate-100 text-slate-600"}`}>{r.aksi}</span></td>
                    <td className="px-4 py-2.5 text-slate-500">{r.entitas}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-slate-400">{r.detail}</td>
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
