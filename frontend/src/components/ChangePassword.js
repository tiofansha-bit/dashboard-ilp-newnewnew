import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Lock, X, KeyRound } from "lucide-react";

export default function ChangePassword({ onClose }) {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (nw.length < 6) { toast.error("Kata sandi baru minimal 6 karakter"); return; }
    if (nw !== cf) { toast.error("Konfirmasi kata sandi tidak cocok"); return; }
    setLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: cur, new_password: nw });
      toast.success("Kata sandi berhasil diperbarui");
      onClose();
    } catch (e) {
      toast.error(errMsg(e, "Gagal mengubah kata sandi"));
    } finally {
      setLoading(false);
    }
  };

  const FIELDS = [
    ["Kata Sandi Saat Ini", cur, setCur, "change-password-current"],
    ["Kata Sandi Baru", nw, setNw, "change-password-new"],
    ["Konfirmasi Kata Sandi Baru", cf, setCf, "change-password-confirm"],
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div data-testid="change-password-modal" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><KeyRound className="h-5 w-5 text-teal-600" /> Ganti Kata Sandi</h3>
          <button data-testid="change-password-close" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {FIELDS.map(([l, val, set, tid]) => (
            <div key={tid}>
              <label className="mb-1 block text-xs font-semibold text-slate-600">{l}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input data-testid={tid} type="password" value={val} onChange={(e) => set(e.target.value)} required
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
              </div>
            </div>
          ))}
          <button data-testid="change-password-submit" disabled={loading} type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Simpan Kata Sandi"}
          </button>
        </form>
      </div>
    </div>
  );
}
