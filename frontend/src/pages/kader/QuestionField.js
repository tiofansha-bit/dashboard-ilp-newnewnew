import { useState } from "react";
import { Info, Check, X, ThermometerSun } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

function ApaMaksudnya({ q }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" data-testid={`info-${q.kode}`} className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700">
          <Info className="h-4 w-4" /> Apa maksudnya?
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle className="text-left text-base">{q.text}</DialogTitle></DialogHeader>
        <div className="rounded-xl bg-sky-50 p-4 text-sm leading-relaxed text-sky-900">{q.definisi || "Tidak ada definisi tambahan."}</div>
      </DialogContent>
    </Dialog>
  );
}

/* Single question renderer for the visit checklist */
export default function QuestionField({ q, value, onChange }) {
  const [confirmed, setConfirmed] = useState(true);

  const setNum = (v) => {
    onChange(v);
    // unusual value confirmation, not a diagnosis
    if (q.kode.includes("SUHU")) setConfirmed(!(v && (Number(v) < 34 || Number(v) > 41)));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid={`q-${q.kode}`}>
      <p className="text-base font-semibold text-slate-800">
        {q.text} {q.wajib && <span className="text-rose-500">*</span>}
      </p>
      {q.satuan && <p className="text-xs text-slate-400">Satuan: {q.satuan}</p>}

      {q.jenis === "yesno" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {["Ya", "Tidak"].map((opt) => {
            const active = value === opt;
            const yes = opt === "Ya";
            return (
              <button key={opt} type="button" data-testid={`${q.kode}-${opt === "Ya" ? "yes" : "no"}`}
                onClick={() => onChange(opt)}
                className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 text-base font-semibold transition-colors ${active ? (yes ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-400 bg-slate-100 text-slate-700") : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                {yes ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />} {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.jenis === "single" && (
        <div className="mt-3 grid gap-2">
          {(q.opsi || []).map((opt) => {
            const active = value === opt;
            return (
              <button key={opt} type="button" data-testid={`${q.kode}-opt`}
                onClick={() => onChange(opt)}
                className={`flex min-h-[52px] items-center gap-3 rounded-xl border-2 px-4 text-left text-sm font-medium transition-colors ${active ? "border-teal-500 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
                <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${active ? "border-teal-500 bg-teal-500" : "border-slate-300"}`}>
                  {active && <Check className="h-3 w-3 text-white" />}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.jenis === "multi" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(q.opsi || []).map((opt) => {
            const arr = Array.isArray(value) ? value : [];
            const active = arr.includes(opt);
            return (
              <button key={opt} type="button" data-testid={`${q.kode}-chip`}
                onClick={() => onChange(active ? arr.filter((x) => x !== opt) : [...arr, opt])}
                className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-sm font-medium transition-colors ${active ? "border-teal-500 bg-teal-50 text-teal-800" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                {active && <Check className="h-4 w-4" />} {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.jenis === "number" && (
        <div className="mt-3">
          <div className="relative">
            {q.kode.includes("SUHU") && <ThermometerSun className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500" />}
            <input type="number" inputMode="decimal" data-testid={`${q.kode}-num`}
              value={value ?? ""} onChange={(e) => setNum(e.target.value)}
              className={`w-full rounded-xl border-2 py-3 pr-16 text-base outline-none focus:ring-2 focus:ring-teal-100 ${q.kode.includes("SUHU") ? "pl-11" : "pl-4"} ${confirmed ? "border-slate-200 focus:border-teal-500" : "border-amber-400"}`}
              placeholder="0" />
            {q.satuan && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">{q.satuan}</span>}
          </div>
          {!confirmed && <p className="mt-1.5 text-xs font-medium text-amber-600">Nilai tidak wajar. Mohon cek & konfirmasi ulang.</p>}
        </div>
      )}

      {q.jenis === "text" && (
        <textarea data-testid={`${q.kode}-text`} value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          className="mt-3 w-full rounded-xl border-2 border-slate-200 p-3 text-base outline-none focus:border-teal-500" rows={2} />
      )}

      {q.jenis === "pemeriksaan" && (
        <div className="mt-3 grid gap-2">
          {(q.fields || ["tanggal", "tempat", "petugas"]).map((fld) => (
            <div key={fld}>
              <label className="mb-1 block text-xs font-medium capitalize text-slate-500">{fld === "tempat" ? "Tempat periksa" : fld === "petugas" ? "Nama petugas" : "Tanggal"}</label>
              <input type={fld === "tanggal" ? "date" : "text"} data-testid={`${q.kode}-${fld}`}
                value={(value || {})[fld] || ""} max={fld === "tanggal" ? new Date().toISOString().slice(0, 10) : undefined}
                onChange={(e) => onChange({ ...(value || {}), [fld]: e.target.value })}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-base outline-none focus:border-teal-500"
                placeholder={fld === "tempat" ? "mis. Puskesmas / Posyandu" : fld === "petugas" ? "mis. Bidan Ani" : ""} />
            </div>
          ))}
        </div>
      )}

      {q.jenis === "imunisasi" && (
        <div className="mt-3 space-y-2.5">
          {(q.jadwal || []).map((row, ri) => (
            <div key={ri} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-700">{row.usia}</p>
              <div className="flex flex-wrap gap-2">
                {row.vaksin.map((v) => {
                  const on = ((value || {})[row.usia] || {})[v];
                  return (
                    <button type="button" key={v} data-testid={`${q.kode}-vax`}
                      onClick={() => onChange({ ...(value || {}), [row.usia]: { ...((value || {})[row.usia] || {}), [v]: !on } })}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${on ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300"}`}>
                      {on && <Check className="h-3 w-3" />} {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ApaMaksudnya q={q} />
    </div>
  );
}

/* Danger sign multi-select card grid */
export function DangerGrid({ questions, answers, onToggle }) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {questions.map((q) => {
        const active = answers[q.kode] === "Ya";
        return (
          <button key={q.kode} type="button" data-testid={`danger-${q.kode}`}
            onClick={() => onToggle(q.kode, active ? "Tidak" : "Ya")}
            className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-colors ${active ? "border-rose-500 bg-rose-50" : "border-slate-200 bg-white hover:border-rose-200"}`}>
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${active ? "border-rose-500 bg-rose-500" : "border-slate-300"}`}>
              {active && <Check className="h-4 w-4 text-white" />}
            </span>
            <span className={`text-sm font-medium leading-snug ${active ? "text-rose-800" : "text-slate-600"}`}>{q.text}</span>
          </button>
        );
      })}
    </div>
  );
}
