import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { User, MapPin, LogOut, ShieldCheck, Info, KeyRound } from "lucide-react";
import ChangePassword from "@/components/ChangePassword";

export default function Profil() {
  const { user, logout } = useAuth();
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="animate-slide-up">
      <header className="rounded-b-3xl bg-teal-700 px-5 pb-8 pt-8 text-center text-white">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-white/15 text-3xl font-extrabold">{user.nama[0]}</div>
        <h1 className="mt-3 text-xl font-extrabold tracking-tight">{user.nama}</h1>
        <p className="text-sm text-teal-100">Kader Kesehatan</p>
      </header>
      <div className="space-y-3 px-4 py-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          {[["Username", user.username, User], ["Posyandu", user.posyandu || "-", ShieldCheck], ["Wilayah Tugas", (user.wilayah || []).join(", "), MapPin]].map(([l, v, Icon]) => (
            <div key={l} className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-600"><Icon className="h-5 w-5" /></div>
              <div><p className="text-xs text-slate-400">{l}</p><p className="text-sm font-semibold text-slate-800">{v}</p></div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-sky-800"><Info className="h-4 w-4" /> Tentang Aplikasi</p>
          <p className="mt-1 text-sm text-sky-700">PWS ILP MELATI membantu kader mendata kunjungan rumah. Aplikasi tidak membuat diagnosis; keputusan klinis dilakukan tenaga kesehatan. Data demo bersifat fiktif.</p>
        </div>
        <button data-testid="change-password-btn" onClick={() => setShowPw(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-700 hover:bg-slate-50">
          <KeyRound className="h-5 w-5 text-teal-600" /> Ganti Kata Sandi
        </button>
        <button data-testid="logout-btn" onClick={() => { logout(); toast.success("Berhasil keluar"); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 font-semibold text-rose-600 hover:bg-rose-100">
          <LogOut className="h-5 w-5" /> Keluar
        </button>
      </div>
      {showPw && <ChangePassword onClose={() => setShowPw(false)} />}
    </div>
  );
}
