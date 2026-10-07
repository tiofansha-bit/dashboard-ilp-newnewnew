import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cacheSet, cacheGet } from "@/lib/offline";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Home as HomeIcon, CheckCircle2, Circle, AlertTriangle, CloudOff, ClipboardPlus, Loader2, Bell } from "lucide-react";

function Stat({ icon: Icon, label, value, tone }) {
  const tones = { teal: "bg-teal-50 text-teal-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", slate: "bg-slate-100 text-slate-600" };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <p className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

export default function Beranda({ go }) {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/kader/beranda").then((r) => { setD(r.data); cacheSet("beranda", r.data); }).catch(() => { const c = cacheGet("beranda"); if (c) setD(c); }); }, []);

  if (!d) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>;

  return (
    <div className="animate-slide-up">
      <header className="rounded-b-3xl bg-teal-700 px-5 pb-6 pt-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-teal-100">Selamat datang,</p>
            <h1 className="text-xl font-extrabold tracking-tight">{d.nama}</h1>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-teal-100">
              <MapPin className="h-3.5 w-3.5" /> {d.posyandu} · {d.wilayah.join(", ")}
            </div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 font-bold">{d.nama[0]}</div>
        </div>
      </header>

      <div className="-mt-4 px-4">
        <button data-testid="btn-mulai-kunjungan" onClick={() => go("kunjungan", {})}
          className="pulse-red flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 py-4 text-lg font-bold text-white shadow-lg shadow-teal-600/25 transition-transform active:scale-[0.98]">
          <ClipboardPlus className="h-6 w-6" /> Mulai Kunjungan
        </button>
      </div>

      <div className="mt-5 px-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Ringkasan Bulan Ini</h2>
          <span className="text-xs text-slate-400">Target {d.target} KK</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={HomeIcon} label="Keluarga di wilayah" value={d.total_keluarga} tone="teal" />
          <Stat icon={CheckCircle2} label="Sudah dikunjungi" value={d.sudah_dikunjungi} tone="green" />
          <Stat icon={Circle} label="Belum dikunjungi" value={d.belum_dikunjungi} tone="slate" />
          <Stat icon={AlertTriangle} label="Masalah dilaporkan" value={d.masalah_dilaporkan} tone="amber" />
          <Stat icon={Bell} label="Ditindaklanjuti petugas" value={d.sudah_ditindaklanjuti} tone="teal" />
          <Stat icon={CloudOff} label="Draf belum terkirim" value={d.draf_belum_terkirim} tone="rose" />
        </div>
      </div>

      <div className="mt-5 px-4">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-900">Pengingat</p>
          <p className="mt-1 text-sm text-sky-700">Kunjungi {d.belum_dikunjungi} keluarga yang belum dikunjungi bulan ini. Lihat status laporan Anda di menu Tugas.</p>
          <button onClick={() => go("keluarga")} className="mt-3 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Lihat Daftar Keluarga</button>
        </div>
      </div>
    </div>
  );
}
