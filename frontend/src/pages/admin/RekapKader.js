import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Loader2, Filter, Users, Home, ClipboardList, UserCheck } from "lucide-react";

const KELURAHAN = ["", "Selat Tengah", "Selat Hulu", "Selat Dalam", "Selat Utara"];
const COLORS = ["#0D9488", "#14B8A6", "#0EA5E9", "#F59E0B", "#F43F5E", "#8B5CF6", "#10B981", "#6366F1", "#EC4899", "#84CC16"];

function firstName(n) {
  return (n || "").split(" ")[0];
}

function Kpi({ icon: Icon, label, value, tone }) {
  const tones = { teal: "bg-teal-50 text-teal-600", green: "bg-emerald-50 text-emerald-600", sky: "bg-sky-50 text-sky-600" };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

export default function RekapKader() {
  const [data, setData] = useState(null);
  const [flt, setFlt] = useState({ start: "", end: "", kelurahan: "" });

  const load = () => {
    setData(null);
    api.get("/dashboard/rekap-kader", { params: flt }).then((r) => setData(r.data));
  };
  useEffect(load, []); // eslint-disable-line

  const chartData = (data?.kader || []).map((k) => ({ nama: firstName(k.nama), keluarga: k.keluarga_ditangani }));

  return (
    <div data-testid="rekap-kader-page" className="animate-slide-up space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Filter className="h-5 w-5 text-slate-400" />
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Dari</label><input type="date" data-testid="rekap-filter-start" value={flt.start} onChange={(e) => setFlt({ ...flt, start: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" /></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Sampai</label><input type="date" data-testid="rekap-filter-end" value={flt.end} onChange={(e) => setFlt({ ...flt, end: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" /></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Kelurahan</label>
          <select data-testid="rekap-filter-kelurahan" value={flt.kelurahan} onChange={(e) => setFlt({ ...flt, kelurahan: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            {KELURAHAN.map((k) => <option key={k} value={k}>{k || "Semua Kelurahan"}</option>)}
          </select>
        </div>
        <button data-testid="rekap-apply-filter" onClick={load} className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700">Terapkan</button>
      </div>

      {!data ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Kpi icon={UserCheck} label="Jumlah Kader" value={data.total_kader} tone="teal" />
            <Kpi icon={Home} label="Keluarga Ditangani (unik)" value={data.total_keluarga_ditangani_unik} tone="green" />
            <Kpi icon={ClipboardList} label="Kader Teratas" value={data.kader?.[0]?.keluarga_ditangani ?? 0} tone="sky" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="mb-4 text-sm font-bold text-slate-800">Keluarga Ditangani per Kader</p>
            <div style={{ width: "100%", height: Math.max(240, chartData.length * 38) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData} margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="nama" width={90} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="keluarga" radius={[0, 6, 6, 0]}>
                    {chartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>{["Nama Kader", "Wilayah", "Posyandu", "Keluarga Ditangani", "Target", "Cakupan", "Total Kunjungan", "Draf"].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.kader.map((k) => (
                  <tr key={k.kader_id} data-testid={`rekap-row-${k.kader_id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {k.nama}
                      {!k.aktif && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">Nonaktif</span>}
                      <div className="text-xs text-slate-400">{k.username}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{(k.wilayah || []).join(", ")}</td>
                    <td className="px-4 py-3 text-slate-500">{k.posyandu || "-"}</td>
                    <td className="px-4 py-3">
                      <span data-testid={`rekap-keluarga-${k.kader_id}`} className="text-lg font-extrabold text-teal-600">{k.keluarga_ditangani}</span>
                      <span className="text-xs text-slate-400"> keluarga</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{k.target_keluarga}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${k.cakupan >= 100 ? "bg-emerald-500" : k.cakupan >= 50 ? "bg-teal-500" : "bg-amber-500"}`} style={{ width: `${Math.min(k.cakupan, 100)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-slate-600">{k.cakupan}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{k.total_kunjungan}</td>
                    <td className="px-4 py-3 text-slate-400">{k.draf}</td>
                  </tr>
                ))}
                {data.kader.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Belum ada data kader.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
