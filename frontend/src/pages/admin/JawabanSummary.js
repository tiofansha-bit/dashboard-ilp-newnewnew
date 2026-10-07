import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, AlertTriangle, Lightbulb, Info } from "lucide-react";
import { TopSelect, usePref } from "@/components/TopSelect";

const tone = (p) => (p === "merah" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-amber-200 bg-amber-50 text-amber-700");
const barColor = (masalah, i) => (masalah ? ["#F43F5E", "#FB923C", "#F59E0B"][i % 3] : ["#0D9488", "#14B8A6", "#0EA5E9", "#64748B"][i % 4]);

const SEL = "rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600";

function KesimpulanUtama({ all, groups }) {
  const [topN, setTopN] = usePref("kesimpulan_top", 10);
  const [grp, setGrp] = usePref("kesimpulan_group", "");
  const [prio, setPrio] = usePref("kesimpulan_prio", "");
  const [sort, setSort] = usePref("kesimpulan_sort", "bahaya");
  const [minR, setMinR] = usePref("kesimpulan_min", 3);
  let items = all.filter((i) => (!grp || i.group === grp) && (!prio || i.priority === prio) && i.responden >= minR);
  const by = { persen: (a, b) => b.persen - a.persen, jumlah: (a, b) => b.masalah - a.masalah,
    bahaya: (a, b) => (a.priority === "merah") === (b.priority === "merah") ? b.persen - a.persen : a.priority === "merah" ? -1 : 1 };
  items = [...items].sort(by[sort]);
  const total = items.length;
  if (topN) items = items.slice(0, topN);
  return (
    <div data-testid="kesimpulan-utama" className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800"><Lightbulb className="h-4 w-4 text-amber-500" /> {topN ? `${topN} ` : ""}Masalah Kesehatan Utama</p>
          <p className="text-xs text-slate-500">Menampilkan {items.length} dari {total} masalah · berdasarkan jawaban kunjungan terakhir tiap sasaran.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TopSelect testid="kesimpulan-top-select" value={topN} onChange={setTopN} />
          <select data-testid="kesimpulan-group-select" value={grp} onChange={(e) => setGrp(e.target.value)} className={SEL}>
            <option value="">Semua kelompok</option>
            {groups.map((g) => <option key={g.group} value={g.group}>{g.label}</option>)}
          </select>
          <select data-testid="kesimpulan-prio-select" value={prio} onChange={(e) => setPrio(e.target.value)} className={SEL}>
            <option value="">Semua prioritas</option><option value="merah">Merah (tanda bahaya)</option><option value="kuning">Kuning</option>
          </select>
          <select data-testid="kesimpulan-sort-select" value={sort} onChange={(e) => setSort(e.target.value)} className={SEL}>
            <option value="bahaya">Urut: tanda bahaya dulu</option><option value="persen">Urut: % tertinggi</option><option value="jumlah">Urut: jumlah sasaran</option>
          </select>
          <select data-testid="kesimpulan-min-select" value={minR} onChange={(e) => setMinR(Number(e.target.value))} className={SEL}>
            {[1, 3, 5, 10, 20].map((n) => <option key={n} value={n}>Min. {n} responden</option>)}
          </select>
        </div>
      </div>
      {items.length === 0 ? <p className="text-sm text-slate-400">Belum ada masalah terdeteksi.</p> : (
        <ol className="space-y-2">
          {items.map((it, i) => (
            <li key={i} data-testid={`kesimpulan-item-${i}`} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${tone(it.priority)}`}>
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-bold">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{it.text} <span className="font-normal opacity-75">· {it.group_label}</span></p>
                <p className="text-xs">{it.kesimpulan}</p>
              </div>
              <span className="shrink-0 text-lg font-extrabold">{it.persen}%</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AnswerBar({ q }) {
  if (q.jenis === "number") {
    return <p className="text-xs text-slate-600">Rata-rata <b>{q.rata2}</b> {q.satuan || ""} · min {q.min} · maks {q.max}</p>;
  }
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {q.jawaban.map((j, i) => <div key={j.label} title={`${j.label}: ${j.jumlah}`} style={{ width: `${j.persen}%`, background: barColor(j.masalah, i) }} />)}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {q.jawaban.map((j, i) => (
          <span key={j.label} className={`flex items-center gap-1 text-[11px] ${j.masalah ? "font-semibold text-rose-600" : "text-slate-500"}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: barColor(j.masalah, i) }} />{j.label}: {j.jumlah} ({j.persen}%)
          </span>
        ))}
      </div>
    </div>
  );
}

function QuestionRow({ q }) {
  const bad = q.masalah > 0;
  return (
    <div data-testid={`jawaban-row-${q.kode}`} className="grid gap-3 border-b border-slate-100 py-3 last:border-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div>
        <p className="text-sm font-medium text-slate-800">{q.section === "tanda_bahaya" && <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-rose-500" />}{q.text}</p>
        <p className="text-[11px] text-slate-400">{q.responden} sasaran{q.kondisi && <> · <Info className="inline h-3 w-3" /> {q.kondisi}</>}</p>
      </div>
      <div className="space-y-1.5">
        <AnswerBar q={q} />
        <p className={`text-xs ${bad ? "text-rose-600" : "text-slate-500"}`}>{q.kesimpulan}</p>
      </div>
    </div>
  );
}

export default function JawabanSummary({ flt, reloadKey }) {
  const [data, setData] = useState(null);
  const [group, setGroup] = useState("");
  useEffect(() => {
    setData(null);
    api.get("/dashboard/jawaban", { params: flt }).then((r) => { setData(r.data); setGroup((g) => g || r.data.groups[0]?.group || ""); });
  }, [reloadKey]); // eslint-disable-line

  if (!data) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>;
  const g = data.groups.find((x) => x.group === group) || data.groups[0];
  return (
    <div className="space-y-5">
      <KesimpulanUtama all={data.kesimpulan_utama} groups={data.groups} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-slate-800">Rekap Jawaban per Kelompok Sasaran <span className="font-normal text-slate-400">({data.total_sasaran} sasaran dikunjungi)</span></p>
        <div className="mb-4 flex flex-wrap gap-2">
          {data.groups.map((x) => (
            <button key={x.group} data-testid={`jawaban-group-${x.group}`} onClick={() => setGroup(x.group)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${g?.group === x.group ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {x.label} <span className="opacity-60">({x.responden})</span>
            </button>
          ))}
        </div>
        {g ? g.questions.map((q) => <QuestionRow key={q.kode} q={q} />) : <p className="text-sm text-slate-400">Belum ada data jawaban.</p>}
      </div>
    </div>
  );
}
