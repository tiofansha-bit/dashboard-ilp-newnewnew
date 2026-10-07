import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

export default function LaporanPreview({ jenis, flt, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/laporan/preview/${jenis}`, { params: { ...flt, limit: 100 } })
      .then((r) => setData(r.data)).catch((e) => { toast.error(errMsg(e)); onClose(); });
  }, [jenis]); // eslint-disable-line

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div data-testid="laporan-preview-modal" className="relative z-10 flex max-h-[90vh] w-full max-w-7xl flex-col rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-base font-bold text-slate-900">{data?.title || "Memuat..."}</p>
            {data && <p className="text-xs text-slate-500">{data.periode} · {data.total} baris{data.total > data.rows.length ? ` (pratinjau ${data.rows.length} pertama)` : ""}</p>}
          </div>
          <button data-testid="laporan-preview-close" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="overflow-auto px-6 py-4">
          {!data ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div> : (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0">
                <tr>{data.headers.map((h) => <th key={h} className="border border-teal-800 bg-teal-700 px-2 py-2 text-center font-semibold text-white">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={i} data-testid={`laporan-preview-row-${i}`} className={i % 2 ? "bg-slate-50" : ""}>
                    {r.map((c, j) => <td key={j} className={`whitespace-pre-line border border-slate-200 px-2 py-1.5 align-top text-slate-700 ${j === 0 ? "text-center" : ""}`}>{c}</td>)}
                  </tr>
                ))}
                {data.rows.length === 0 && <tr><td colSpan={data.headers.length} className="py-10 text-center text-slate-400">Tidak ada data pada periode ini.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
