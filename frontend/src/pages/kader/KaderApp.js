import { useState } from "react";
import { Home, Users, ClipboardCheck, ListTodo, User } from "lucide-react";
import SyncBar from "@/components/SyncBar";
import Beranda from "./Beranda";
import KeluargaList from "./KeluargaList";
import KeluargaForm from "./KeluargaForm";
import Wizard from "./Wizard";
import Tugas from "./Tugas";
import Profil from "./Profil";

const NAV = [
  { key: "beranda", label: "Beranda", icon: Home },
  { key: "keluarga", label: "Keluarga", icon: Users },
  { key: "kunjungan", label: "Kunjungan", icon: ClipboardCheck },
  { key: "tugas", label: "Tugas", icon: ListTodo },
  { key: "profil", label: "Profil", icon: User },
];

export default function KaderApp() {
  const [view, setView] = useState({ tab: "beranda", params: {} });
  const go = (tab, params = {}) => setView({ tab, params });

  return (
    <div className="relative mx-auto min-h-screen max-w-md border-x border-slate-200 bg-slate-50 pb-24 shadow-xl">
      <SyncBar />
      {view.tab === "beranda" && <Beranda go={go} />}
      {view.tab === "keluarga" && <KeluargaList go={go} />}
      {view.tab === "keluarga-form" && <KeluargaForm go={go} params={view.params} />}
      {view.tab === "kunjungan" && <Wizard go={go} params={view.params} />}
      {view.tab === "tugas" && <Tugas go={go} />}
      {view.tab === "profil" && <Profil go={go} />}

      {/* Bottom nav (hidden inside wizard flow) */}
      {!["keluarga-form"].includes(view.tab) && (
        <nav className="fixed bottom-0 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 grid-cols-5 border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-md">
          {NAV.map((n) => {
            const active = view.tab === n.key || (n.key === "kunjungan" && view.tab === "kunjungan");
            const Icon = n.icon;
            return (
              <button key={n.key} data-testid={`nav-${n.key}`} onClick={() => go(n.key)}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${active ? "text-teal-600" : "text-slate-400 hover:text-slate-600"}`}>
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-teal-50" : ""}`}>
                  <Icon className="h-5 w-5" />
                </span>
                {n.label}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
