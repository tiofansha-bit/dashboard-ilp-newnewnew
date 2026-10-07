import { useEffect, useState, useMemo } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import QuestionField, { DangerGrid } from "./QuestionField";
import { submitKunjungan, cacheSet, cacheGet } from "@/lib/offline";
import {
  ArrowLeft, ArrowRight, Save, Send, Loader2, Check, ShieldAlert, Users,
  Home as HomeIcon, ClipboardList, BookOpen, ListChecks, X, Circle, CheckCircle2,
} from "lucide-react";

const EDU_OPSI = ["Edukasi PHBS", "Gizi seimbang / Isi Piringku", "Pentingnya imunisasi", "ASI eksklusif", "Kepatuhan minum obat", "Bahaya merokok", "Kesehatan jiwa"];
const DRAFT_KEY = (kid) => `pws_draft_${kid || "new"}`;

export default function Wizard({ go, params }) {
  const [step, setStep] = useState(0);
  const [families, setFamilies] = useState([]);
  const [keluarga, setKeluarga] = useState(null);
  const [selMembers, setSelMembers] = useState([]);
  const [answers, setAnswers] = useState({});     // {anggotaId: {kode: val}}
  const [edukasi, setEdukasi] = useState({});     // {anggotaId: [materi]}
  const [questions, setQuestions] = useState({}); // {group: [q]}
  const [reminderOk, setReminderOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // load families for step 0 (if no preselected)
  useEffect(() => {
    if (params.keluarga_id) loadKeluarga(params.keluarga_id);
    else api.get("/keluarga").then((r) => { setFamilies(r.data.items); cacheSet("families", r.data.items); }).catch(() => setFamilies(cacheGet("families") || []));
  }, [params.keluarga_id]);

  const loadKeluarga = async (id) => {
    let data;
    try { const r = await api.get(`/keluarga/${id}`); data = r.data; cacheSet(`kel_${id}`, data); }
    catch (e) { data = cacheGet(`kel_${id}`); if (!data) { toast.error("Data keluarga tidak tersedia offline"); return; } }
    setKeluarga(data);
    // restore draft
    const draft = localStorage.getItem(DRAFT_KEY(id));
    if (draft) { try { const d = JSON.parse(draft); setSelMembers(d.selMembers || []); setAnswers(d.answers || {}); setEdukasi(d.edukasi || {}); } catch (_) {} }
    setStep(1);
  };

  // fetch questions for selected members' groups
  useEffect(() => {
    const groups = [...new Set(keluarga?.anggota?.filter((a) => selMembers.includes(a.id)).map((a) => a.kelompok) || [])];
    groups.forEach((g) => {
      if (g && !questions[g] && g !== "belum_ditentukan")
        api.get("/master/questions", { params: { group: g } })
          .then((r) => { setQuestions((p) => ({ ...p, [g]: r.data })); cacheSet(`q_${g}`, r.data); })
          .catch(() => { const c = cacheGet(`q_${g}`); if (c) setQuestions((p) => ({ ...p, [g]: c })); });
    });
  }, [selMembers, keluarga]); // eslint-disable-line

  // autosave
  useEffect(() => {
    if (!keluarga) return;
    const t = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY(keluarga.id), JSON.stringify({ selMembers, answers, edukasi }));
      setSavedAt(new Date());
    }, 800);
    return () => clearTimeout(t);
  }, [selMembers, answers, edukasi, keluarga]);

  const selectedAnggota = useMemo(() => keluarga?.anggota?.filter((a) => selMembers.includes(a.id)) || [], [keluarga, selMembers]);

  // dynamic steps: 1 confirm, 2 select, then one per member, ringkasan, edukasi, kirim
  const memberSteps = selectedAnggota.map((a) => ({ type: "checklist", anggota: a }));
  const steps = [
    { type: "confirm" }, { type: "select" }, ...memberSteps,
    { type: "ringkasan" }, { type: "edukasi" }, { type: "kirim" },
  ];
  const totalSteps = steps.length;
  const cur = step >= 1 ? steps[step - 1] : { type: "pilih_keluarga" };
  const stepIndex = step; // 0=pilih keluarga

  const setAns = (aid, kode, val) => setAnswers((p) => ({ ...p, [aid]: { ...(p[aid] || {}), [kode]: val } }));

  // compute findings for summary
  const findings = useMemo(() => {
    const out = [];
    selectedAnggota.forEach((a) => {
      (questions[a.kelompok] || []).forEach((q) => {
        if (!q.problem_when?.length) return;
        const v = answers[a.id]?.[q.kode];
        const hit = Array.isArray(v) ? v.some((x) => q.problem_when.includes(x)) : q.problem_when.includes(v);
        if (hit) out.push({ anggota: a.nama, masalah: q.text, priority: q.priority || "kuning" });
      });
    });
    return out;
  }, [answers, selectedAnggota, questions]);
  const hasRed = findings.some((f) => f.priority === "merah");

  const submit = async (asDraft) => {
    if (!asDraft && hasRed && !reminderOk) { toast.error("Konfirmasi tanda bahaya dulu."); return; }
    setSubmitting(true);
    try {
      const res = await submitKunjungan({
        keluarga_id: keluarga.id, keluarga_nama: keluarga.nama_kk, anggota_ids: selMembers, answers, edukasi,
        status: asDraft ? "draf" : "selesai", reminder_confirmed: reminderOk,
      });
      localStorage.removeItem(DRAFT_KEY(keluarga.id));
      if (res.queued) toast.success("Tersimpan di perangkat — akan dikirim otomatis saat online");
      else toast.success(asDraft ? "Draf tersimpan" : "Laporan kunjungan terkirim!");
      go("beranda");
    } catch (e) { toast.error(errMsg(e)); } finally { setSubmitting(false); }
  };

  const progressPct = totalSteps ? Math.round((step / (totalSteps)) * 100) : 0;
  const canNext = cur.type === "select" ? selMembers.length > 0 : true;

  return (
    <div className="animate-slide-up pb-28">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button data-testid="wizard-back-btn" onClick={() => (step <= 1 ? go("beranda") : setStep((s) => s - 1))}><ArrowLeft className="h-5 w-5 text-slate-600" /></button>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">Kunjungan Rumah</p>
            {step >= 1 && <p className="text-xs text-slate-400">Langkah {step} dari {totalSteps}</p>}
          </div>
          {savedAt && <span className="text-[10px] font-medium text-emerald-600">Draf tersimpan</span>}
        </div>
        {step >= 1 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${Math.max(progressPct, 8)}%` }} />
          </div>
        )}
      </header>

      <div className="px-4 py-4">
        {/* Step 0: pilih keluarga */}
        {step === 0 && (
          <div className="space-y-2.5">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-800"><HomeIcon className="h-5 w-5 text-teal-600" /> Pilih Keluarga</h2>
            {families.map((k) => (
              <button key={k.id} data-testid={`wizard-pick-${k.id}`} onClick={() => loadKeluarga(k.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left hover:border-teal-300">
                <Users className="h-5 w-5 text-teal-600" />
                <div><p className="font-bold text-slate-800">{k.nama_kk}</p><p className="text-xs text-slate-500">RT {k.rt}/{k.rw} · {k.kelurahan}</p></div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: confirm */}
        {cur.type === "confirm" && keluarga && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><HomeIcon className="h-5 w-5 text-teal-600" /> Konfirmasi Identitas Keluarga</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
              {[["Kepala Keluarga", keluarga.nama_kk], ["Alamat", keluarga.alamat], ["RT/RW", `${keluarga.rt}/${keluarga.rw}`], ["Kelurahan", keluarga.kelurahan], ["Posyandu", keluarga.posyandu], ["No. HP", keluarga.no_hp]].map(([l, v]) => (
                <div key={l} className="flex justify-between gap-3"><span className="text-slate-500">{l}</span><span className="font-semibold text-slate-800 text-right">{v || "-"}</span></div>
              ))}
            </div>
            <p className="text-sm text-slate-500">Pastikan Anda berada di lokasi keluarga yang benar sebelum melanjutkan.</p>
          </div>
        )}

        {/* Step 2: select members */}
        {cur.type === "select" && keluarga && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><Users className="h-5 w-5 text-teal-600" /> Anggota yang Ditemui</h2>
            {keluarga.anggota.length === 0 && <p className="text-sm text-slate-400">Belum ada anggota. Tambahkan lewat menu Keluarga.</p>}
            {keluarga.anggota.map((a) => {
              const on = selMembers.includes(a.id);
              return (
                <button key={a.id} data-testid={`wizard-member-${a.id}`} onClick={() => setSelMembers((p) => on ? p.filter((x) => x !== a.id) : [...p, a.id])}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-colors ${on ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"}`}>
                  {on ? <CheckCircle2 className="h-6 w-6 text-teal-600" /> : <Circle className="h-6 w-6 text-slate-300" />}
                  <div><p className="font-bold text-slate-800">{a.nama}</p><p className="text-xs text-slate-500">{a.kelompok_label} {a.umur != null ? `· ${a.umur} th` : ""}</p></div>
                </button>
              );
            })}
          </div>
        )}

        {/* Checklist per member */}
        {cur.type === "checklist" && (
          <ChecklistStep anggota={cur.anggota} questions={questions[cur.anggota.kelompok] || []}
            answers={answers[cur.anggota.id] || {}} setAns={(k, v) => setAns(cur.anggota.id, k, v)} />
        )}

        {/* Ringkasan */}
        {cur.type === "ringkasan" && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><ListChecks className="h-5 w-5 text-teal-600" /> Ringkasan Masalah</h2>
            {findings.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="mb-1 h-6 w-6" /><p className="font-semibold">Tidak ditemukan masalah.</p><p className="text-sm">Data tetap dicatat sebagai hasil kunjungan (Hijau).</p></div>
            ) : (
              <div className="space-y-2">
                {hasRed && <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-800"><p className="flex items-center gap-1.5 font-bold"><ShieldAlert className="h-5 w-5" /> Ada Tanda Bahaya!</p><p className="text-sm">Segera ingatkan sasaran memeriksakan diri & laporkan ke petugas.</p></div>}
                {findings.map((f, i) => (
                  <div key={i} className={`rounded-xl border p-3 ${f.priority === "merah" ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}>
                    <p className={`text-sm font-semibold ${f.priority === "merah" ? "text-rose-800" : "text-amber-800"}`}>{f.masalah}</p>
                    <p className="text-xs text-slate-500">{f.anggota}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edukasi */}
        {cur.type === "edukasi" && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><BookOpen className="h-5 w-5 text-sky-600" /> Edukasi & Tindakan Kader</h2>
            {selectedAnggota.map((a) => (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 text-sm font-bold text-slate-800">{a.nama}</p>
                <div className="flex flex-wrap gap-2">
                  {EDU_OPSI.map((e) => {
                    const on = (edukasi[a.id] || []).includes(e);
                    return <button key={e} onClick={() => setEdukasi((p) => { const cur2 = p[a.id] || []; return { ...p, [a.id]: on ? cur2.filter((x) => x !== e) : [...cur2, e] }; })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 text-slate-500"}`}>{e}</button>;
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kirim */}
        {cur.type === "kirim" && (
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800"><Send className="h-5 w-5 text-teal-600" /> Kirim Laporan</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Keluarga</span><span className="font-semibold">{keluarga?.nama_kk}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Anggota dikunjungi</span><span className="font-semibold">{selMembers.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Temuan masalah</span><span className="font-semibold">{findings.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tanda bahaya</span><span className={`font-semibold ${hasRed ? "text-rose-600" : ""}`}>{findings.filter((f) => f.priority === "merah").length}</span></div>
            </div>
            {hasRed && (
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4">
                <input data-testid="reminder-confirm" type="checkbox" checked={reminderOk} onChange={(e) => setReminderOk(e.target.checked)} className="mt-0.5 h-5 w-5 accent-rose-600" />
                <span className="text-sm font-medium text-rose-800">Saya sudah mengingatkan sasaran untuk segera memeriksakan diri, dan laporan ini akan diteruskan ke petugas.</span>
              </label>
            )}
            <p className="text-xs text-slate-400">Aplikasi tidak membuat diagnosis. Keputusan klinis dilakukan tenaga kesehatan.</p>
          </div>
        )}
      </div>

      {/* Footer nav */}
      {step >= 1 && (
        <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white p-3">
          <div className="flex gap-2">
            <button data-testid="btn-save-visit-draft" onClick={() => submit(true)} disabled={submitting}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600">
              <Save className="h-4 w-4" /> Draf
            </button>
            {cur.type !== "kirim" ? (
              <button data-testid="wizard-next-step-btn" disabled={!canNext} onClick={() => setStep((s) => s + 1)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white disabled:opacity-50">
                Lanjut <ArrowRight className="h-5 w-5" />
              </button>
            ) : (
              <button data-testid="btn-submit-visit" disabled={submitting || (hasRed && !reminderOk)} onClick={() => submit(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3 font-bold text-white disabled:opacity-50">
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5" /> Selesai & Kirim</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistStep({ anggota, questions, answers, setAns }) {
  const ceklis = questions.filter((q) => q.section === "ceklis");
  const danger = questions.filter((q) => q.section === "tanda_bahaya");
  if (questions.length === 0) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>;
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-teal-50 p-3">
        <p className="flex items-center gap-2 text-sm font-bold text-teal-800"><ClipboardList className="h-4 w-4" /> Ceklis: {anggota.nama}</p>
        <p className="text-xs text-teal-600">{anggota.kelompok_label}</p>
      </div>
      {ceklis.map((q) => <QuestionField key={q.kode} q={q} value={answers[q.kode]} onChange={(v) => setAns(q.kode, v)} />)}
      {danger.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-4">
          <p className="mb-3 flex items-center gap-2 text-base font-bold text-rose-800"><ShieldAlert className="h-5 w-5" /> Tanda Bahaya</p>
          <p className="mb-3 text-sm text-rose-600">Apakah ada salah satu kondisi berikut? (boleh pilih lebih dari satu)</p>
          <DangerGrid questions={danger} answers={answers} onToggle={setAns} />
        </div>
      )}
    </div>
  );
}
