import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, User, Lock, Stethoscope, Home } from "lucide-react";
import logo from "@/assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(username.trim(), password);
      toast.success(`Selamat datang, ${u.nama}`);
    } catch (e) {
      toast.error(errMsg(e, "Login gagal"));
    } finally {
      setLoading(false);
    }
  };

  const quick = (un, pw) => { setUsername(un); setPassword(pw); };

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-teal-700 p-12 text-white overflow-hidden">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-teal-600/50" />
        <div className="absolute -bottom-24 -left-16 h-96 w-96 rounded-full bg-emerald-500/20" />
        <div className="relative z-10">
          <div className="inline-flex rounded-2xl bg-white px-5 py-3.5 shadow-lg">
            <img src={logo} alt="PWS ILP MELATI" className="h-12 w-auto" />
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Digitalisasi Ceklis<br />Kunjungan Rumah</h1>
          <p className="max-w-md text-teal-100">Pantau kunjungan kader, temukan masalah kesehatan, dan tindak lanjuti kasus prioritas secara terintegrasi.</p>
          <div className="flex gap-3 pt-2">
            {[["Home", "Data Keluarga"], ["Stethoscope", "Ceklis Sasaran"], ["HeartPulse", "Tindak Lanjut"]].map(([, l]) => (
              <div key={l} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-medium backdrop-blur">{l}</div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-teal-200">Data demonstrasi bersifat fiktif.</p>
      </div>

      {/* Right form */}
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 lg:hidden">
            <img src={logo} alt="PWS ILP MELATI" className="h-14 w-auto" />
            <p className="mt-2 text-sm text-slate-500">UPT Puskesmas Melati</p>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Masuk ke Akun</h2>
          <p className="mb-6 text-sm text-slate-500">Gunakan akun kader atau petugas puskesmas.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input data-testid="login-username-input" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="mis. admin / kader1" required />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">Kata Sandi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input data-testid="login-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  placeholder="••••••••" required />
              </div>
            </div>
            <button data-testid="login-submit-button" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-base font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Masuk"}
            </button>
          </form>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-xs font-semibold text-slate-500">Akun demo (klik untuk isi):</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => quick("admin", "admin123")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-400">
                <Stethoscope className="h-3.5 w-3.5 text-teal-600" /> Petugas: admin
              </button>
              <button onClick={() => quick("kader1", "kader123")} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-teal-400">
                <Home className="h-3.5 w-3.5 text-teal-600" /> Kader: kader1
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
