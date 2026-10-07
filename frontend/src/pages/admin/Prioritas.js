import { useEffect, useState, useCallback } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { CASE_STATUS_LABEL } from "@/lib/status";
import { Loader2, X, Clock, MapPin, User, ArrowUpDown, ShieldAlert, Eye } from "lucide-react";

const STATUS_OPTS = Object.keys(CASE_STATUS_LABEL);
const PRIO_DOT = { merah: "bg-rose-500", kuning: "bg-amber-500", hijau: "bg-emerald-500" };

function CaseDetail({ id, onClose, onChange }) {
  const [c, setC] = useState(null);
  const [f, setF] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { api.get(`/kasus/${id}`).then((r) => { setC(r.data); setF({ status: r.data.status, penanggung_jawab: r.data.penanggung_jawab || "", jenis_tindak_lanjut: "", hasil: "", rencana: "", alasan: "" }); }); }, [id]);

  const save = async () => {
    if (f.status === "tidak_dapat_ditindaklanjuti" && !f.alasan) return toast.error("Alasan wajib diisi");
    setSaving(true);
    try { const r = await api.put(`/kasus/${id}`, f); setC(r.data); toast.success("Kasus diperbarui"); onChange?.(); }
    catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        {!c ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div> : (
          <>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase text-white ${PRIO_DOT[c.priority]}`}>{c.priority}</span>
                <h3 className="mt-1.5 text-lg font-bold text-slate-900">{c.masalah}</h3>
              </div>
              <button data-testid="case-close" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
              <div className="flex gap-2"><User className="h-4 w-4 text-slate-400" /> {c.sasaran_nama} · {c.keluarga_nama}</div>
              <div className="flex gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {c.kelurahan} RT {c.rt}/{c.rw} · {c.posyandu}</div>
              <div className="flex gap-2"><Clock className="h-4 w-4 text-slate-400" /> Lapor: {String(c.waktu_lapor).slice(0, 16).replace("T", " ")} · Kader: {c.kader_nama}</div>
              {c.definisi && <p className="pt-1 text-xs text-slate-500">Definisi: {c.definisi}</p>}
            </div>

            {/* Update form */}
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
                  <select data-testid="case-status" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    {STATUS_OPTS.map((s) => <option key={s} value={s}>{CASE_STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-500">Penanggung Jawab</label>
                  <input data-testid="case-pj" value={f.penanggung_jawab} onChange={(e) => setF({ ...f, penanggung_jawab: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Nama petugas" />
                </div>
              </div>
              <div><label className="mb-1 block text-xs font-semibold text-slate-500">Jenis / Hasil Tindak Lanjut</label>
                <input value={f.jenis_tindak_lanjut} onChange={(e) => setF({ ...f, jenis_tindak_lanjut: e.target.value })} className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="mis. Kunjungan petugas / Rujukan" />
                <textarea value={f.hasil} onChange={(e) => setF({ ...f, hasil: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Hasil tindak lanjut" />
              </div>
              {f.status === "tidak_dapat_ditindaklanjuti" && (
                <div><label className="mb-1 block text-xs font-semibold text-rose-600">Alasan (wajib)</label>
                  <textarea data-testid="case-alasan" value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} rows={2} className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm" /></div>
              )}
              <button data-testid="case-save" onClick={save} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Simpan Tindak Lanjut"}
              </button>
            </div>

            {/* Timeline */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-slate-500">Riwayat (Audit Trail)</p>
              <div className="space-y-2">
                {(c.riwayat || []).map((r, i) => (
                  <div key={i} className="flex gap-2 text-xs">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                    <div><p className="font-semibold text-slate-700">{r.aksi} {r.status && `→ ${CASE_STATUS_LABEL[r.status] || r.status}`}</p><p className="text-slate-400">{String(r.waktu).slice(0, 16).replace("T", " ")} · {r.oleh}</p>{r.hasil && <p className="text-slate-500">{r.hasil}</p>}{r.alasan && <p className="text-rose-500">Alasan: {r.alasan}</p>}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Prioritas({ onChange }) {
  const [rows, setRows] = useState(null);
  const [flt, setFlt] = useState({ priority: "", status: "", kelurahan: "", sort: "priority" });
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => { api.get("/kasus", { params: flt }).then((r) => setRows(r.data)); }, [flt]);
  useEffect(load, [load]);

  const waitHours = (c) => Math.max(0, Math.round((Date.now() - new Date(c.waktu_lapor)) / 3.6e6));

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        {[["priority", ["", "merah", "kuning", "hijau"]], ["status", ["", ...STATUS_OPTS]], ["kelurahan", ["", "Selat Tengah", "Selat Hulu", "Selat Dalam", "Selat Utara"]]].map(([key, opts]) => (
          <select key={key} data-testid={`admin-filter-${key}`} value={flt[key]} onChange={(e) => setFlt({ ...flt, [key]: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm capitalize">
            {opts.map((o) => <option key={o} value={o}>{key === "status" ? (CASE_STATUS_LABEL[o] || "Semua Status") : (o || `Semua ${key}`)}</option>)}
          </select>
        ))}
        <button data-testid="sort-toggle" onClick={() => setFlt({ ...flt, sort: flt.sort === "priority" ? "waktu" : "priority" })} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600">
          <ArrowUpDown className="h-4 w-4" /> Urut: {flt.sort === "priority" ? "Prioritas" : "Lama Tunggu"}
        </button>
      </div>

      {!rows ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div> : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>{["Prioritas", "Sasaran", "Masalah", "Lokasi", "Kader", "Menunggu", "PJ", "Status", ""].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 && <tr><td colSpan={9} className="py-10 text-center text-slate-400">Tidak ada kasus.</td></tr>}
                {rows.map((c) => (
                  <tr key={c.id} data-testid={`case-row-${c.id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-bold uppercase text-white ${PRIO_DOT[c.priority]}`}>{c.priority === "merah" ? <ShieldAlert className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{c.priority}</span></td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{c.sasaran_nama}<span className="block text-[11px] text-slate-400">NIK {c.nik_masked}</span></td>
                    <td className="px-4 py-3 text-slate-600">{c.masalah}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{c.kelurahan} RT {c.rt}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{c.kader_nama}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{waitHours(c)} jam</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{c.penanggung_jawab || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3"><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">{CASE_STATUS_LABEL[c.status]}</span></td>
                    <td className="px-4 py-3"><button data-testid={`case-open-${c.id}`} onClick={() => setDetail(c.id)} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">Tindak Lanjut</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {detail && <CaseDetail id={detail} onClose={() => setDetail(null)} onChange={() => { load(); onChange?.(); }} />}
    </div>
  );
}
