import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import JawabanSummary from "./JawabanSummary";
import DashboardInsights from "./DashboardInsights";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Users, CheckCircle2, TrendingUp, Activity, ShieldAlert, Eye, Clock, FileWarning, Loader2, Filter,
} from "lucide-react";

const COLORS = ["#0D9488", "#14B8A6", "#0EA5E9", "#F59E0B", "#F43F5E", "#8B5CF6", "#10B981"];
const KELURAHAN = ["", "Selat Tengah", "Selat Hulu", "Selat Dalam", "Selat Utara"];

function Kpi({ icon: Icon, label, value, suffix, tone }) {
  const tones = { teal: "bg-teal-50 text-teal-600", green: "bg-emerald-50 text-emerald-600", sky: "bg-sky-50 text-sky-600", amber: "bg-amber-50 text-amber-600", rose: "bg-rose-50 text-rose-600", slate: "bg-slate-100 text-slate-500" };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}{suffix}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="mb-4 text-sm font-bold text-slate-800">{title}</p>
      <div className="h-64">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [kpi, setKpi] = useState(null);
  const [charts, setCharts] = useState(null);
  const [flt, setFlt] = useState({ start: "", end: "", kelurahan: "" });
  const [view, setView] = useState("ringkasan");
  const [reloadKey, setReloadKey] = useState(0);

  const load = () => {
    api.get("/dashboard/kpi", { params: flt }).then((r) => setKpi(r.data));
    api.get("/dashboard/charts", { params: flt }).then((r) => setCharts(r.data));
    setReloadKey((k) => k + 1);
  };
  useEffect(load, []); // eslint-disable-line

  return (
    <div className="animate-slide-up space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Filter className="h-5 w-5 text-slate-400" />
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Dari</label><input type="date" data-testid="filter-start" value={flt.start} onChange={(e) => setFlt({ ...flt, start: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" /></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Sampai</label><input type="date" data-testid="filter-end" value={flt.end} onChange={(e) => setFlt({ ...flt, end: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm" /></div>
        <div><label className="mb-1 block text-xs font-semibold text-slate-500">Kelurahan</label>
          <select data-testid="filter-kelurahan" value={flt.kelurahan} onChange={(e) => setFlt({ ...flt, kelurahan: e.target.value })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
            {KELURAHAN.map((k) => <option key={k} value={k}>{k || "Semua Kelurahan"}</option>)}
          </select>
        </div>
        <button data-testid="apply-filter" onClick={load} className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal-700">Terapkan</button>
      </div>

      <div className="flex gap-2">
        {[["ringkasan", "Ringkasan & Grafik"], ["jawaban", "Hasil Jawaban & Kesimpulan"]].map(([k, l]) => (
          <button key={k} data-testid={`dashboard-tab-${k}`} onClick={() => setView(k)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${view === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{l}</button>
        ))}
      </div>

      {view === "jawaban" ? <JawabanSummary flt={flt} reloadKey={reloadKey} /> : !kpi ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi icon={Users} label="Keluarga Terdaftar" value={kpi.keluarga_terdaftar} tone="teal" />
            <Kpi icon={CheckCircle2} label="Keluarga Dikunjungi" value={kpi.keluarga_dikunjungi} tone="green" />
            <Kpi icon={TrendingUp} label="Cakupan Kunjungan" value={kpi.cakupan} suffix="%" tone="sky" />
            <Kpi icon={Activity} label="Sasaran Dikunjungi" value={kpi.sasaran_dikunjungi} tone="teal" />
            <Kpi icon={ShieldAlert} label="Kasus Merah" value={kpi.kasus_merah} tone="rose" />
            <Kpi icon={Eye} label="Kasus Kuning" value={kpi.kasus_kuning} tone="amber" />
            <Kpi icon={Clock} label="Belum Ditindaklanjuti" value={kpi.belum_ditindaklanjuti} tone="rose" />
            <Kpi icon={Activity} label="Sedang Proses" value={kpi.sedang_ditindaklanjuti} tone="sky" />
            <Kpi icon={CheckCircle2} label="Selesai" value={kpi.selesai} tone="green" />
            <Kpi icon={Clock} label="Median Respons" value={kpi.median_respons_jam} suffix=" jam" tone="slate" />
            <Kpi icon={FileWarning} label="Data Belum Lengkap" value={kpi.data_belum_lengkap} tone="amber" />
            <Kpi icon={Activity} label="Total Kunjungan" value={kpi.total_kunjungan} tone="teal" />
          </div>

          {charts && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Tren Kunjungan Bulanan">
                <ResponsiveContainer><LineChart data={charts.tren_bulanan}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="bulan" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Line type="monotone" dataKey="jumlah" stroke="#0D9488" strokeWidth={2.5} dot={{ r: 4 }} /></LineChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Cakupan per Kelurahan">
                <ResponsiveContainer><BarChart data={charts.cakupan_kelurahan}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="kelurahan" fontSize={11} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="kunjungan" fill="#14B8A6" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="10 Masalah Terbanyak">
                <ResponsiveContainer><BarChart layout="vertical" data={charts.top_masalah} margin={{ left: 0 }}><XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="masalah" width={220} fontSize={10} interval={0} tickFormatter={(t) => (t.length > 38 ? t.slice(0, 36) + "…" : t)} /><Tooltip /><Bar dataKey="jumlah" fill="#F59E0B" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Distribusi Kelompok Sasaran">
                <ResponsiveContainer><PieChart><Pie data={charts.distribusi_kelompok} dataKey="jumlah" nameKey="kelompok" innerRadius={50} outerRadius={90} paddingAngle={2}>{charts.distribusi_kelompok.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-2">{charts.distribusi_kelompok.map((e, i) => <span key={i} className="flex items-center gap-1 text-[11px] text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{e.kelompok}</span>)}</div>
              </ChartCard>
            </div>
          )}
          <DashboardInsights flt={flt} reloadKey={reloadKey} />
        </>
      )}
    </div>
  );
}
