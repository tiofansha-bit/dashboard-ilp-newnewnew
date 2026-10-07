import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Loader2, Plus, Save, Presentation, X, Edit2, Trash2, History, AlertTriangle,
  TrendingUp, Copy, Maximize2, FileType,
} from "lucide-react";

const COLORS = ["#0D9488", "#0EA5E9", "#F59E0B", "#F43F5E", "#8B5CF6", "#10B981"];
const CARD_COLOR = {
  green: "border-emerald-200 bg-emerald-50 text-emerald-800", blue: "border-sky-200 bg-sky-50 text-sky-800",
  yellow: "border-amber-200 bg-amber-50 text-amber-800", red: "border-rose-200 bg-rose-50 text-rose-800",
};
const STATUS_LBL = { tercapai: "Tercapai", belum_tercapai: "Belum Tercapai", perlu_perhatian: "Perlu Perhatian" };

const SimBanner = () => null;

export default function Akreditasi() {
  const [list, setList] = useState(null);
  const [d, setD] = useState(null);
  const [edit, setEdit] = useState(false);
  const [present, setPresent] = useState(false);
  const [showVer, setShowVer] = useState(false);

  const loadList = () => api.get("/akreditasi").then((r) => { setList(r.data); if (r.data[0] && !d) setD(r.data[0]); });
  useEffect(() => { loadList(); }, []); // eslint-disable-line

  const save = async () => {
    try { const r = await api.put(`/akreditasi/${d.id}`, d); setD(r.data); setEdit(false); toast.success("Dashboard tersimpan"); loadList(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const createNew = async () => { const r = await api.post("/akreditasi", { judul: "Dashboard Akreditasi Baru" }); toast.success("Dashboard dibuat"); setD(r.data); loadList(); };
  const duplicate = async () => { const { id, versions, ...rest } = d; const r = await api.post("/akreditasi", { ...rest, judul: d.judul + " (Salinan)" }); toast.success("Diduplikasi"); setD(r.data); loadList(); };
  const restore = async (idx) => { const r = await api.post(`/akreditasi/${d.id}/restore/${idx}`); setD(r.data); setShowVer(false); toast.success("Versi dipulihkan"); };

  const patch = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const patchCard = (i, k, v) => setD((p) => { const c = [...p.kartu]; c[i] = { ...c[i], [k]: v }; return { ...p, kartu: c }; });
  const addCard = () => setD((p) => ({ ...p, kartu: [...p.kartu, { id: Date.now() + "", nama: "Indikator Baru", nilai: 0, satuan: "", target: 100, warna: "blue", status: "perlu_perhatian", catatan: "" }] }));
  const delCard = (i) => setD((p) => ({ ...p, kartu: p.kartu.filter((_, x) => x !== i) }));
  const patchGraf = (gi, ri, field, v) => setD((p) => { const g = JSON.parse(JSON.stringify(p.grafik)); g[gi].data[ri][field] = field === "value" ? Number(v) : v; return { ...p, grafik: g }; });
  const patchNarasi = (k, v) => setD((p) => ({ ...p, narasi: { ...p.narasi, [k]: v } }));
  const patchPdca = (k, v) => setD((p) => ({ ...p, pdca: { ...p.pdca, [k]: v } }));

  if (!list) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>;
  if (!d) return <div className="space-y-4"><SimBanner /><button onClick={createNew} className="rounded-xl bg-teal-600 px-4 py-2.5 font-semibold text-white">Buat Dashboard Simulasi</button></div>;

  // Presentation mode
  if (present) {
    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900 p-8 text-white">
        <button onClick={() => setPresent(false)} className="fixed right-6 top-6 rounded-xl bg-white/10 p-2 backdrop-blur"><X className="h-6 w-6" /></button>
        <div className="mx-auto max-w-6xl">
          <h1 className="text-4xl font-extrabold tracking-tight">{d.judul}</h1>
          <p className="mt-1 text-xl text-slate-300">{d.subjudul} · {d.puskesmas}</p>
          <p className="text-lg text-teal-400">{d.periode}</p>
          <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
            {d.kartu.map((c) => (
              <div key={c.id} className="rounded-2xl bg-white/5 p-6 backdrop-blur">
                <p className="text-5xl font-extrabold">{c.nilai}<span className="text-2xl text-slate-400">{c.satuan}</span></p>
                <p className="mt-2 text-lg text-slate-300">{c.nama}</p>
                {c.target > 0 && <p className="text-sm text-teal-400">Target: {c.target}{c.satuan}</p>}
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {d.grafik.slice(0, 2).map((g) => (
              <div key={g.id} className="rounded-2xl bg-white/5 p-6"><p className="mb-4 text-xl font-bold">{g.judul}</p><div className="h-72"><GrafRender g={g} light /></div></div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl bg-white/5 p-6"><p className="mb-2 text-xl font-bold">Analisis</p><p className="text-lg text-slate-200">{d.narasi?.capaian}</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up space-y-4">
      <SimBanner />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
        <select value={d.id} onChange={(e) => setD(list.find((x) => x.id === e.target.value))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium">
          {list.map((x) => <option key={x.id} value={x.id}>{x.judul}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <button data-testid="akre-new" onClick={createNew} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600"><Plus className="h-4 w-4" /> Baru</button>
          <button data-testid="akre-duplicate" onClick={duplicate} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600"><Copy className="h-4 w-4" /> Duplikat</button>
          <button data-testid="akre-versions" onClick={() => setShowVer(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600"><History className="h-4 w-4" /> Versi</button>
          <button data-testid="accreditation-presentation-mode-btn" onClick={() => setPresent(true)} className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"><Presentation className="h-4 w-4" /> Mode Presentasi</button>
          {edit ? (
            <button data-testid="akre-save" onClick={save} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white"><Save className="h-4 w-4" /> Simpan</button>
          ) : (
            <button data-testid="accreditation-edit-indicator-btn" onClick={() => setEdit(true)} className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white"><Edit2 className="h-4 w-4" /> Edit</button>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {edit ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[["judul", "Judul"], ["subjudul", "Subjudul"], ["puskesmas", "Puskesmas"], ["periode", "Periode"], ["penanggung_jawab", "Penanggung Jawab"], ["catatan_kaki", "Catatan Kaki"]].map(([k, l]) => (
              <div key={k}><label className="mb-1 block text-xs font-semibold text-slate-500">{l}</label><input data-testid={`akre-${k}`} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={d[k] || ""} onChange={(e) => patch(k, e.target.value)} /></div>
            ))}
          </div>
        ) : (
          <><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{d.judul}</h1><p className="text-slate-500">{d.subjudul} · {d.puskesmas} · {d.periode}</p><p className="mt-1 text-xs text-slate-400">PJ: {d.penanggung_jawab}</p></>
        )}
      </div>

      {/* Indicator cards */}
      <div>
        <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold text-slate-700">Kartu Indikator</p>{edit && <button data-testid="akre-add-card" onClick={addCard} className="flex items-center gap-1 text-sm font-semibold text-teal-600"><Plus className="h-4 w-4" /> Tambah Indikator</button>}</div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {d.kartu.map((c, i) => (
            <div key={c.id} className={`relative rounded-2xl border p-4 ${CARD_COLOR[c.warna] || CARD_COLOR.blue}`}>
              {edit ? (
                <div className="space-y-1.5">
                  <input className="w-full rounded border border-white/60 bg-white/60 px-2 py-1 text-xs font-semibold" value={c.nama} onChange={(e) => patchCard(i, "nama", e.target.value)} />
                  <div className="flex gap-1"><input data-testid={`akre-card-nilai-${i}`} type="number" className="w-2/3 rounded border border-white/60 bg-white/60 px-2 py-1 text-lg font-bold" value={c.nilai} onChange={(e) => patchCard(i, "nilai", Number(e.target.value))} /><input className="w-1/3 rounded border border-white/60 bg-white/60 px-1 py-1 text-xs" value={c.satuan} onChange={(e) => patchCard(i, "satuan", e.target.value)} placeholder="unit" /></div>
                  <div className="flex gap-1">
                    <input type="number" className="w-1/2 rounded border border-white/60 bg-white/60 px-2 py-1 text-xs" value={c.target} onChange={(e) => patchCard(i, "target", Number(e.target.value))} placeholder="target" />
                    <select className="w-1/2 rounded border border-white/60 bg-white/60 px-1 py-1 text-xs" value={c.warna} onChange={(e) => patchCard(i, "warna", e.target.value)}>{["green", "blue", "yellow", "red"].map((x) => <option key={x}>{x}</option>)}</select>
                  </div>
                  <button onClick={() => delCard(i)} className="flex items-center gap-1 text-xs font-semibold text-rose-600"><Trash2 className="h-3 w-3" /> Hapus</button>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-extrabold tracking-tight">{c.nilai}<span className="text-base opacity-60">{c.satuan}</span></p>
                  <p className="mt-1 text-xs font-medium leading-snug">{c.nama}</p>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-semibold opacity-80"><span>Target {c.target}{c.satuan}</span><span>{STATUS_LBL[c.status] || ""}</span></div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {d.grafik.map((g, gi) => (
          <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="mb-3 text-sm font-bold text-slate-800">{g.judul}</p>
            <div className="h-56"><GrafRender g={g} /></div>
            {edit && (
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-400">Edit data grafik:</p>
                {g.data.map((row, ri) => (
                  <div key={ri} className="flex gap-2">
                    <input className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs" value={row.label} onChange={(e) => patchGraf(gi, ri, "label", e.target.value)} />
                    <input type="number" className="w-20 rounded border border-slate-200 px-2 py-1 text-xs" value={row.value} onChange={(e) => patchGraf(gi, ri, "value", e.target.value)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Narasi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-slate-800">Narasi Analisis</p>
        <div className="grid gap-3 md:grid-cols-2">
          {[["capaian", "Analisis Capaian"], ["masalah", "Masalah Prioritas"], ["tindak_lanjut", "Tindak Lanjut"], ["rencana", "Rencana Perbaikan"]].map(([k, l]) => (
            <div key={k}><p className="mb-1 text-xs font-semibold text-slate-500">{l}</p>
              {edit ? <textarea data-testid={`akre-narasi-${k}`} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={d.narasi?.[k] || ""} onChange={(e) => patchNarasi(k, e.target.value)} /> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{d.narasi?.[k]}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* PDCA */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-slate-800">Siklus PDCA/PDSA</p>
        <div className="grid gap-3 md:grid-cols-4">
          {[["plan", "Plan"], ["do", "Do"], ["check", "Check/Study"], ["act", "Act"]].map(([k, l]) => (
            <div key={k} className="rounded-xl border border-teal-100 bg-teal-50/50 p-3"><p className="mb-1 text-xs font-bold text-teal-700">{l}</p>
              {edit ? <textarea rows={4} className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={d.pdca?.[k] || ""} onChange={(e) => patchPdca(k, e.target.value)} /> : <p className="text-xs text-slate-600">{d.pdca?.[k]}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* RTL table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <p className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">Rencana Tindak Lanjut (RTL)</p>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500"><tr>{["Masalah", "Penyebab", "Rencana", "PJ", "Target", "Status"].map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{(d.rtl || []).map((r) => (
            <tr key={r.id}><td className="px-4 py-2.5 text-slate-700">{r.masalah}</td><td className="px-4 py-2.5 text-slate-500">{r.penyebab}</td><td className="px-4 py-2.5 text-slate-500">{r.rencana}</td><td className="px-4 py-2.5 text-slate-500">{r.pj}</td><td className="px-4 py-2.5 text-slate-500">{r.target}</td><td className="px-4 py-2.5"><span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{r.status}</span></td></tr>
          ))}</tbody></table></div>
      </div>
      <p className="text-center text-xs text-slate-400">{d.catatan_kaki} · Diperbarui: {d.tanggal_update}</p>

      {showVer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowVer(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-bold">Riwayat Versi</h3><button onClick={() => setShowVer(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {(d.versions || []).length === 0 && <p className="text-sm text-slate-400">Belum ada versi tersimpan.</p>}
              {(d.versions || []).map((v, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div><p className="text-sm font-semibold text-slate-700">{v.snapshot?.judul}</p><p className="text-xs text-slate-400">{String(v.waktu).slice(0, 16).replace("T", " ")} · {v.oleh}</p></div>
                  <button onClick={() => restore(i)} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white">Pulihkan</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GrafRender({ g, light }) {
  const tick = { fontSize: 11, fill: light ? "#cbd5e1" : "#64748b" };
  if (g.tipe === "line") return <ResponsiveContainer><LineChart data={g.data}><CartesianGrid strokeDasharray="3 3" stroke={light ? "#334155" : "#f1f5f9"} /><XAxis dataKey="label" tick={tick} /><YAxis tick={tick} /><Tooltip /><Line type="monotone" dataKey="value" stroke="#14B8A6" strokeWidth={2.5} dot={{ r: 4 }} /></LineChart></ResponsiveContainer>;
  if (g.tipe === "donut" || g.tipe === "pie") return <ResponsiveContainer><PieChart><Pie data={g.data} dataKey="value" nameKey="label" innerRadius={g.tipe === "donut" ? 45 : 0} outerRadius={80}>{g.data.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>;
  if (g.tipe === "horizontal_bar") return <ResponsiveContainer><BarChart layout="vertical" data={g.data} margin={{ left: 20 }}><XAxis type="number" tick={tick} /><YAxis type="category" dataKey="label" width={120} tick={{ ...tick, fontSize: 10 }} /><Tooltip /><Bar dataKey="value" fill="#F59E0B" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer>;
  return <ResponsiveContainer><BarChart data={g.data}><CartesianGrid strokeDasharray="3 3" stroke={light ? "#334155" : "#f1f5f9"} /><XAxis dataKey="label" tick={tick} /><YAxis tick={tick} /><Tooltip /><Bar dataKey="value" fill="#0D9488" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer>;
}
