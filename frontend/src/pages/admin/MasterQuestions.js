import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, ListChecks, Edit2, X, ShieldAlert, Eye, Plus, Trash2, Check } from "lucide-react";

const GROUPS = [
  ["ibu_hamil", "Ibu Hamil"], ["nifas", "Ibu Nifas"], ["bayi", "Bayi 0-6 bln"], ["balita", "Balita & Apras"],
  ["remaja", "Usia Sekolah & Remaja"], ["dewasa", "Usia Dewasa"], ["lansia", "Lansia"], ["tbc", "Skrining TBC"],
];
const SECTIONS = [["ceklis", "Ceklis Sasaran"], ["tanda_bahaya", "Tanda Bahaya"]];
const JENIS = [
  ["yesno", "Ya / Tidak"], ["single", "Pilihan (satu jawaban)"], ["number", "Angka / Ukuran"],
  ["pemeriksaan", "Pemeriksaan"], ["imunisasi", "Imunisasi"], ["danger", "Tanda Bahaya"],
];

export default function MasterQuestions() {
  const [group, setGroup] = useState("ibu_hamil");
  const [rows, setRows] = useState(null);
  const [edit, setEdit] = useState(null);
  const [adding, setAdding] = useState(false);
  const load = () => { setRows(null); api.get("/master/questions", { params: { group } }).then((r) => setRows(r.data)); };
  useEffect(load, [group]); // eslint-disable-line

  const remove = async (q) => {
    if (!window.confirm(`Hapus pertanyaan "${q.text}"?`)) return;
    try { await api.delete(`/master/questions/${q.kode}`); toast.success("Pertanyaan dihapus"); load(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 sm:flex-1">Master pertanyaan &amp; definisi operasional dapat dikelola tanpa mengubah kode. Ubah teks, definisi, jawaban bermasalah, dan prioritas — atau tambahkan pertanyaan baru.</div>
        <button data-testid="mq-add-button" onClick={() => setAdding(true)} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Tambah Pertanyaan
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {GROUPS.map(([k, l]) => <button key={k} data-testid={`mq-group-${k}`} onClick={() => setGroup(k)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${group === k ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{l}</button>)}
      </div>
      {!rows ? <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div> : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">Belum ada pertanyaan untuk kelompok ini. Klik "Tambah Pertanyaan".</div>
      ) : (
        <div className="space-y-2">
          {rows.map((q) => (
            <div key={q.kode} data-testid={`mq-row-${q.kode}`} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
              <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${q.section === "tanda_bahaya" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>{q.section === "tanda_bahaya" ? <ShieldAlert className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{q.text}{q.custom && <span className="ml-1.5 rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-700">baru</span>}</p>
                <p className="text-xs text-slate-400">{q.kode} · {q.jenis}{q.satuan ? ` (${q.satuan})` : ""} {q.priority && <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${q.priority === "merah" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{q.priority}</span>}</p>
                {q.definisi && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{q.definisi}</p>}
                {q.jenis === "single" && q.opsi?.length > 0 && <p className="mt-1 text-xs text-slate-400">Opsi: {q.opsi.join(" · ")}</p>}
              </div>
              <button data-testid={`mq-edit-${q.kode}`} onClick={() => setEdit(q)} className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-teal-600"><Edit2 className="h-4 w-4" /></button>
              {q.custom && <button data-testid={`mq-delete-${q.kode}`} onClick={() => remove(q)} className="shrink-0 rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
            </div>
          ))}
        </div>
      )}
      {edit && <EditModal q={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
      {adding && <AddModal defaultGroup={group} onClose={() => setAdding(false)} onSaved={(g) => { setAdding(false); if (g && g !== group) setGroup(g); else load(); }} />}
    </div>
  );
}

const cls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none";
const lbl = "mb-1 block text-xs font-semibold text-slate-500";

function AddModal({ defaultGroup, onClose, onSaved }) {
  const [f, setF] = useState({
    group: defaultGroup, section: "ceklis", jenis: "yesno", text: "", definisi: "",
    satuan: "", opsi: "", wajib: false, priority: "", problem_when: "", report_required: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.text.trim()) { toast.error("Teks pertanyaan wajib diisi"); return; }
    if (f.jenis === "single" && !f.opsi.trim()) { toast.error("Isi pilihan jawaban (pisah koma) untuk jenis Pilihan"); return; }
    setSaving(true);
    try {
      await api.post("/master/questions", {
        group: f.group, section: f.section, jenis: f.jenis, text: f.text.trim(), definisi: f.definisi.trim(),
        satuan: f.satuan.trim() || null,
        opsi: f.opsi.split(",").map((s) => s.trim()).filter(Boolean),
        wajib: f.wajib, priority: f.priority || null,
        problem_when: f.problem_when.split(",").map((s) => s.trim()).filter(Boolean),
        report_required: f.report_required,
      });
      toast.success("Pertanyaan ditambahkan");
      onSaved(f.group);
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div data-testid="mq-add-modal" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ListChecks className="h-5 w-5 text-teal-600" /> Tambah Pertanyaan</h3><button data-testid="mq-add-close" onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Kelompok Sasaran</label><select data-testid="mq-add-group" className={cls} value={f.group} onChange={(e) => set("group", e.target.value)}>{GROUPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><label className={lbl}>Bagian</label><select data-testid="mq-add-section" className={cls} value={f.section} onChange={(e) => set("section", e.target.value)}>{SECTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          </div>
          <div><label className={lbl}>Teks Pertanyaan</label><input data-testid="mq-add-text" className={cls} value={f.text} onChange={(e) => set("text", e.target.value)} placeholder="mis. Apakah ibu rutin minum tablet tambah darah?" /></div>
          <div><label className={lbl}>Definisi Operasional (opsional)</label><textarea data-testid="mq-add-definisi" rows={2} className={cls} value={f.definisi} onChange={(e) => set("definisi", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Jenis Jawaban</label><select data-testid="mq-add-jenis" className={cls} value={f.jenis} onChange={(e) => set("jenis", e.target.value)}>{JENIS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            {f.jenis === "number" && <div><label className={lbl}>Satuan (opsional)</label><input data-testid="mq-add-satuan" className={cls} value={f.satuan} onChange={(e) => set("satuan", e.target.value)} placeholder="mis. °C, kg, cm" /></div>}
          </div>
          {f.jenis === "single" && <div><label className={lbl}>Pilihan Jawaban (pisah koma)</label><input data-testid="mq-add-opsi" className={cls} value={f.opsi} onChange={(e) => set("opsi", e.target.value)} placeholder="Ya, Tidak, Tidak tahu" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Prioritas jika bermasalah</label><select data-testid="mq-add-priority" className={cls} value={f.priority} onChange={(e) => set("priority", e.target.value)}><option value="">- tidak ada -</option><option value="kuning">Kuning</option><option value="merah">Merah</option></select></div>
            <div><label className={lbl}>Wajib diisi?</label><select data-testid="mq-add-wajib" className={cls} value={f.wajib ? "1" : "0"} onChange={(e) => set("wajib", e.target.value === "1")}><option value="0">Opsional</option><option value="1">Wajib</option></select></div>
          </div>
          <div><label className={lbl}>Jawaban penanda masalah (pisah koma)</label><input data-testid="mq-add-problem" className={cls} value={f.problem_when} onChange={(e) => set("problem_when", e.target.value)} placeholder="mis. Tidak, Tidak tahu" /></div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={f.report_required} onChange={(e) => set("report_required", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600" /> Wajib dilaporkan ke petugas jika bermasalah</label>
        </div>
        <button data-testid="mq-add-save" onClick={save} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-5 w-5" /> Simpan Pertanyaan</>}</button>
      </div>
    </div>
  );
}

function EditModal({ q, onClose, onSaved }) {
  const isCustom = !!q.custom;
  const [f, setF] = useState({
    text: q.text, definisi: q.definisi || "", priority: q.priority || "", wajib: q.wajib,
    problem_when: (q.problem_when || []).join(", "),
    section: q.section || "ceklis", jenis: q.jenis || "yesno", satuan: q.satuan || "",
    opsi: (q.opsi || []).join(", "), report_required: !!q.report_required,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const save = async () => {
    if (!f.text.trim()) { toast.error("Teks pertanyaan wajib diisi"); return; }
    if (isCustom && f.jenis === "single" && !f.opsi.trim()) { toast.error("Isi pilihan jawaban untuk jenis Pilihan"); return; }
    setSaving(true);
    try {
      const payload = {
        text: f.text.trim(), definisi: f.definisi.trim(), priority: f.priority || null, wajib: f.wajib,
        problem_when: f.problem_when.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (isCustom) {
        payload.section = f.section;
        payload.jenis = f.jenis;
        payload.satuan = f.satuan.trim() || null;
        payload.opsi = f.opsi.split(",").map((s) => s.trim()).filter(Boolean);
        payload.report_required = f.report_required;
      }
      await api.put(`/master/questions/${q.kode}`, payload);
      toast.success("Pertanyaan diperbarui"); onSaved();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div data-testid="mq-edit-modal" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><ListChecks className="h-5 w-5 text-teal-600" /> Edit Pertanyaan{isCustom && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-700">custom</span>}</h3><button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>
        <div className="space-y-3">
          {isCustom && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Bagian</label><select data-testid="mq-edit-section" className={cls} value={f.section} onChange={(e) => set("section", e.target.value)}>{SECTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div><label className={lbl}>Jenis Jawaban</label><select data-testid="mq-edit-jenis" className={cls} value={f.jenis} onChange={(e) => set("jenis", e.target.value)}>{JENIS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            </div>
          )}
          <div><label className={lbl}>Teks Pertanyaan</label><input data-testid="mq-edit-text" className={cls} value={f.text} onChange={(e) => set("text", e.target.value)} /></div>
          <div><label className={lbl}>Definisi Operasional</label><textarea rows={2} className={cls} value={f.definisi} onChange={(e) => set("definisi", e.target.value)} /></div>
          {isCustom && f.jenis === "number" && <div><label className={lbl}>Satuan (opsional)</label><input data-testid="mq-edit-satuan" className={cls} value={f.satuan} onChange={(e) => set("satuan", e.target.value)} placeholder="mis. °C, kg, cm" /></div>}
          {isCustom && f.jenis === "single" && <div><label className={lbl}>Pilihan Jawaban (pisah koma)</label><input data-testid="mq-edit-opsi" className={cls} value={f.opsi} onChange={(e) => set("opsi", e.target.value)} placeholder="Ya, Tidak, Tidak tahu" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Prioritas jika bermasalah</label><select className={cls} value={f.priority} onChange={(e) => set("priority", e.target.value)}><option value="">- tidak ada -</option><option value="kuning">Kuning</option><option value="merah">Merah</option></select></div>
            <div><label className={lbl}>Wajib?</label><select className={cls} value={f.wajib ? "1" : "0"} onChange={(e) => set("wajib", e.target.value === "1")}><option value="1">Wajib</option><option value="0">Opsional</option></select></div>
          </div>
          <div><label className={lbl}>Jawaban penanda masalah (pisah koma)</label><input className={cls} value={f.problem_when} onChange={(e) => set("problem_when", e.target.value)} placeholder="Tidak, Ya" /></div>
          {isCustom && <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={f.report_required} onChange={(e) => set("report_required", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600" /> Wajib dilaporkan ke petugas jika bermasalah</label>}
        </div>
        <button data-testid="mq-save" onClick={save} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Simpan"}</button>
      </div>
    </div>
  );
}
