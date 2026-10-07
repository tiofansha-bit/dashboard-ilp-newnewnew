import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

const PRIO = { hijau: "#10B981", kuning: "#F59E0B", merah: "#F43F5E" };

function Card({ title, sub, children, testid }) {
  return (
    <div data-testid={testid} className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
      <div className="mt-4 h-64">{children}</div>
    </div>
  );
}

export default function DashboardInsights({ flt, reloadKey }) {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/insights", { params: flt }).then((r) => setD(r.data)); }, [reloadKey]); // eslint-disable-line
  if (!d) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card testid="chart-prioritas-kunjungan" title="Hasil Kunjungan per Prioritas" sub="Hijau = normal, kuning = perlu perhatian, merah = tanda bahaya">
        <ResponsiveContainer><PieChart><Pie data={d.prioritas_kunjungan} dataKey="jumlah" nameKey="prioritas" innerRadius={50} outerRadius={90} label>{d.prioritas_kunjungan.map((e) => <Cell key={e.prioritas} fill={PRIO[e.prioritas]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
      </Card>
      <Card testid="chart-keluarga-kelurahan" title="Keluarga Sudah vs Belum Dikunjungi" sub="Per kelurahan — sasaran prioritas kunjungan berikutnya">
        <ResponsiveContainer><BarChart data={d.keluarga_kelurahan}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="kelurahan" fontSize={11} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="dikunjungi" name="Dikunjungi" stackId="a" fill="#0D9488" /><Bar dataKey="belum" name="Belum" stackId="a" fill="#CBD5E1" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
      </Card>
      <Card testid="chart-kasus-kelurahan" title="Kasus per Kelurahan" sub="Jumlah kasus merah & kuning serta yang sudah selesai">
        <ResponsiveContainer><BarChart data={d.kasus_kelurahan}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="kelurahan" fontSize={11} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="merah" name="Merah" fill="#F43F5E" /><Bar dataKey="kuning" name="Kuning" fill="#F59E0B" /><Bar dataKey="selesai" name="Selesai" fill="#10B981" /></BarChart></ResponsiveContainer>
      </Card>
      <Card testid="chart-kasus-kelompok" title="Kasus per Kelompok Sasaran">
        <ResponsiveContainer><BarChart layout="vertical" data={d.kasus_kelompok} margin={{ left: 30 }}><XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="kelompok" width={150} fontSize={10} /><Tooltip /><Bar dataKey="jumlah" fill="#8B5CF6" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
      </Card>
      <Card testid="chart-kunjungan-posyandu" title="Kunjungan per Posyandu">
        <ResponsiveContainer><BarChart data={d.kunjungan_posyandu}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="posyandu" fontSize={10} interval={0} angle={-25} textAnchor="end" height={50} /><YAxis fontSize={12} /><Tooltip /><Bar dataKey="jumlah" fill="#0EA5E9" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
      </Card>
      <Card testid="chart-top-kader" title="10 Kader Paling Aktif" sub="Berdasarkan jumlah kunjungan terkirim">
        <ResponsiveContainer><BarChart layout="vertical" data={d.top_kader} margin={{ left: 10 }}><XAxis type="number" fontSize={12} /><YAxis type="category" dataKey="kader" width={110} fontSize={11} /><Tooltip /><Bar dataKey="jumlah" fill="#14B8A6" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
      </Card>
    </div>
  );
}
