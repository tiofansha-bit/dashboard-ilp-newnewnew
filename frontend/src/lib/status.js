import { CheckCircle2, Eye, ShieldAlert, Info } from "lucide-react";

export const STATUS = {
  hijau: { label: "Baik / Selesai", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
  kuning: { label: "Perlu Pemantauan", bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 border-amber-300", icon: Eye },
  merah: { label: "Prioritas / Tanda Bahaya", bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-800", dot: "bg-rose-500", badge: "bg-rose-100 text-rose-800 border-rose-300", icon: ShieldAlert },
  biru: { label: "Informasi", bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-800", dot: "bg-sky-500", badge: "bg-sky-100 text-sky-800 border-sky-300", icon: Info },
};

export const CASE_STATUS_LABEL = {
  baru: "Baru", sudah_dibaca: "Sudah Dibaca", ditugaskan: "Ditugaskan", dihubungi: "Dihubungi",
  dijadwalkan: "Dijadwalkan", sudah_dikunjungi: "Dikunjungi Petugas", dirujuk: "Dirujuk",
  menunggu_hasil: "Menunggu Hasil", selesai: "Selesai", tidak_dapat_ditindaklanjuti: "Tidak Dapat Ditindaklanjuti",
};

export const KELOMPOK_ICON = {
  ibu_hamil: "HeartHandshake", nifas: "Baby", bayi: "Smile", balita: "Activity",
  remaja: "UserCheck", dewasa: "ShieldCheck", lansia: "HeartPulse", tbc: "Stethoscope",
};

export function StatusBadge({ level, className = "" }) {
  const s = STATUS[level] || STATUS.biru;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${s.badge} ${className}`}>
      <Icon className="h-3.5 w-3.5" /> {s.label}
    </span>
  );
}
