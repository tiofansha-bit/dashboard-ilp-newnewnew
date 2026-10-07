import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import Dashboard from "./Dashboard";
import Prioritas from "./Prioritas";
import KeluargaAdmin from "./KeluargaAdmin";
import KaderMgmt from "./KaderMgmt";
import MasterQuestions from "./MasterQuestions";
import Akreditasi from "./Akreditasi";
import AuditLog from "./AuditLog";
import Laporan from "./Laporan";
import RekapKader from "./RekapKader";
import ImportData from "./ImportData";
import TindakLanjutPustu from "./TindakLanjutPustu";
import logo from "@/assets/logo.png";
import {
  LayoutDashboard, AlertOctagon, Users, UserCog, ListChecks, PresentationIcon, ClipboardCheck,
  ScrollText, FileDown, HeartPulse, LogOut, Bell, Menu, X, Presentation, KeyRound, Upload, Stethoscope,
  SlidersHorizontal, Lock,
} from "lucide-react";
import ChangePassword from "@/components/ChangePassword";

const MENU = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "prioritas", label: "Daftar Prioritas", icon: AlertOctagon },
  { key: "tindak-lanjut-pustu", label: "Tindak Lanjut Pustu", icon: Stethoscope },
  { key: "keluarga", label: "Keluarga & Sasaran", icon: Users },
  { key: "laporan", label: "Laporan & Rekap", icon: FileDown },
  { key: "kader", label: "Manajemen Kader", icon: UserCog },
  { key: "rekap-kader", label: "Rekap per Kader", icon: ClipboardCheck },
  { key: "import", label: "Import Data", icon: Upload },
  { key: "master", label: "Master Pertanyaan", icon: ListChecks },
  { key: "audit", label: "Audit Log", icon: ScrollText },
];

// Hidden mode switcher — subtle icon in header, PIN protected. Only admin knows it exists.
function ModeControl({ akreMode, setAkreMode, goDashboard }) {
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [changing, setChanging] = useState(false);
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const verify = async () => {
    setErr("");
    try { await api.post("/mode/verify-pin", { pin }); setUnlocked(true); setPin(""); }
    catch (e) { setErr(errMsg(e)); }
  };
  const changePin = async () => {
    setErr("");
    try { await api.post("/mode/change-pin", { current_pin: cur, new_pin: nw }); toast.success("PIN diperbarui"); setChanging(false); setCur(""); setNw(""); }
    catch (e) { setErr(errMsg(e)); }
  };
  const pick = (v) => { setAkreMode(v); goDashboard(); setOpen(false); toast.success(v ? "Mode Akreditasi aktif" : "Mode Data Asli aktif"); };

  return (
    <div className="relative" ref={ref}>
      <button data-testid="hidden-mode-trigger" onClick={() => { setOpen((o) => !o); setErr(""); }} aria-label="pengaturan"
        className="rounded-xl p-2 text-slate-200 transition-colors hover:text-slate-400">
        <SlidersHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div data-testid="mode-popover" className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          {!unlocked ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Lock className="h-3.5 w-3.5" /> Masukkan PIN</p>
              <input data-testid="mode-pin-input" type="password" inputMode="numeric" autoFocus value={pin}
                onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tracking-widest" placeholder="••••••" />
              {err && <p data-testid="mode-pin-error" className="text-xs text-rose-600">{err}</p>}
              <button data-testid="mode-pin-submit" onClick={verify} className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">Buka</button>
            </div>
          ) : changing ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-600">Ganti PIN</p>
              <input data-testid="mode-pin-current" type="password" inputMode="numeric" value={cur} onChange={(e) => setCur(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="PIN saat ini" />
              <input data-testid="mode-pin-new" type="password" inputMode="numeric" value={nw} onChange={(e) => setNw(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="PIN baru (4-8 digit)" />
              {err && <p className="text-xs text-rose-600">{err}</p>}
              <div className="flex gap-2">
                <button data-testid="mode-pin-save" onClick={changePin} className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-700">Simpan</button>
                <button onClick={() => { setChanging(false); setErr(""); }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Batal</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-600">Mode Tampilan Dashboard</p>
              <div className="grid grid-cols-2 gap-2">
                <button data-testid="mode-select-asli" onClick={() => pick(false)} className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${!akreMode ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:border-teal-400"}`}>Data Asli</button>
                <button data-testid="mode-select-akreditasi" onClick={() => pick(true)} className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${akreMode ? "bg-teal-600 text-white" : "border border-slate-200 text-slate-600 hover:border-teal-400"}`}>Akreditasi</button>
              </div>
              <button data-testid="mode-change-pin" onClick={() => { setChanging(true); setErr(""); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-teal-400">Ganti PIN</button>
              <button data-testid="mode-lock" onClick={() => { setUnlocked(false); setOpen(false); }} className="w-full text-center text-xs text-slate-400 hover:text-slate-600">Kunci</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminApp() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("dashboard");
  const [akreMode, setAkreMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState({ items: [], unread: 0 });
  const [showNotif, setShowNotif] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const loadNotif = () => api.get("/notifikasi").then((r) => setNotif(r.data)).catch(() => {});
  useEffect(() => { loadNotif(); const t = setInterval(loadNotif, 30000); return () => clearInterval(t); }, []);

  const readNotif = async (n) => { await api.post(`/notifikasi/${n.id}/read`); loadNotif(); setTab("prioritas"); setShowNotif(false); };

  const Nav = () => (
    <>
      {MENU.map((m) => {
        const Icon = m.icon; const active = tab === m.key;
        return (
          <button key={m.key} data-testid={`admin-nav-${m.key}`} onClick={() => { setTab(m.key); setOpen(false); }}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${active ? "bg-teal-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
            <Icon className="h-5 w-5" /> {m.label}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 p-4 lg:flex">
        <div className="mb-6 px-1">
          <div className="rounded-xl bg-white p-2.5"><img src={logo} alt="PWS ILP MELATI" className="mx-auto h-9 w-auto" /></div>
        </div>
        <nav className="flex-1 space-y-1"><Nav /></nav>
        <button onClick={() => { logout(); toast.success("Keluar"); }} className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"><LogOut className="h-5 w-5" /> Keluar</button>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-slate-900 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div className="rounded-lg bg-white p-1.5"><img src={logo} alt="PWS ILP MELATI" className="h-7 w-auto" /></div>
              <button onClick={() => setOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <nav className="flex-1 space-y-1"><Nav /></nav>
            <button onClick={() => { logout(); }} className="flex items-center gap-2 px-3.5 py-2.5 text-sm text-slate-300"><LogOut className="h-5 w-5" /> Keluar</button>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-6 w-6 text-slate-600" /></button>
            <div>
              <p className="text-sm font-bold text-slate-800">{MENU.find((m) => m.key === tab)?.label}</p>
              <p className="hidden text-xs text-slate-400 sm:block">{user.nama}</p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <ModeControl akreMode={akreMode} setAkreMode={setAkreMode} goDashboard={() => setTab("dashboard")} />
            <button data-testid="admin-change-password-btn" onClick={() => setShowPw(true)} title="Ganti Kata Sandi" className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
              <KeyRound className="h-5 w-5" />
            </button>
            <button data-testid="notif-bell" onClick={() => setShowNotif((s) => !s)} className="relative rounded-xl border border-slate-200 p-2 hover:bg-slate-50">
              <Bell className="h-5 w-5 text-slate-600" />
              {notif.unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">{notif.unread}</span>}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-12 z-50 max-h-96 w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                <p className="px-2 py-1.5 text-xs font-bold text-slate-500">Notifikasi</p>
                {notif.items.length === 0 && <p className="px-2 py-4 text-center text-sm text-slate-400">Tidak ada notifikasi</p>}
                {notif.items.map((n) => (
                  <button key={n.id} onClick={() => readNotif(n)} className={`mb-1 flex w-full flex-col rounded-xl p-2.5 text-left ${n.dibaca ? "bg-white" : n.priority === "merah" ? "bg-rose-50" : "bg-amber-50"}`}>
                    <span className="text-xs font-semibold text-slate-800">{n.judul}</span>
                    <span className="text-[11px] text-slate-500">{n.pesan}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          {tab === "dashboard" && (akreMode ? <Akreditasi /> : <Dashboard />)}
          {tab === "prioritas" && <Prioritas onChange={loadNotif} />}
          {tab === "tindak-lanjut-pustu" && <TindakLanjutPustu />}
          {tab === "keluarga" && <KeluargaAdmin />}
          {tab === "laporan" && <Laporan />}
          {tab === "kader" && <KaderMgmt />}
          {tab === "rekap-kader" && <RekapKader />}
          {tab === "import" && <ImportData />}
          {tab === "master" && <MasterQuestions />}
          {tab === "audit" && <AuditLog />}
        </main>
      </div>
      {showPw && <ChangePassword onClose={() => setShowPw(false)} />}
    </div>
  );
}
