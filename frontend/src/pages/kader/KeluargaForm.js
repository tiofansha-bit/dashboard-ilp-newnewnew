import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, User, ClipboardPlus, Loader2, AlertCircle, X, Trash2 } from "lucide-react";

const KELURAHAN = ["Selat Tengah", "Selat Hulu", "Selat Dalam", "Selat Utara"];

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
const inputCls = "w-full rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100";

function MemberModal({ keluargaId, member, onClose, onSaved }) {
  const [f, setF] = useState(member || { keluarga_id: keluargaId, nama: "", nik: "", tanggal_lahir: "", jenis_kelamin: "L", hubungan_kk: "", status_kawin: "", pendidikan: "", pekerjaan: "", no_hp: "", kondisi_hamil: false, kondisi_nifas: false });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.nama) return toast.error("Nama wajib diisi");
    setSaving(true);
    try {
      const r = member?.id ? await api.put(`/anggota/${member.id}`, f) : await api.post("/anggota", { ...f, keluarga_id: keluargaId });
      toast.success("Anggota tersimpan"); onSaved(r.data);
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">{member?.id ? "Edit" : "Tambah"} Anggota</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Nama Lengkap"><input data-testid="anggota-nama" className={inputCls} value={f.nama} onChange={(e) => set("nama", e.target.value)} /></Field>
          <Field label="NIK (16 digit)" hint={f.nik && f.nik.length !== 16 ? "NIK belum 16 digit — akan ditandai data belum lengkap" : "Boleh dikosongkan untuk draf"}>
            <input data-testid="anggota-nik" className={inputCls} value={f.nik} onChange={(e) => set("nik", e.target.value.replace(/\D/g, "").slice(0, 16))} inputMode="numeric" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal Lahir"><input type="date" className={inputCls} value={(f.tanggal_lahir || "").slice(0, 10)} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set("tanggal_lahir", e.target.value)} /></Field>
            <Field label="Jenis Kelamin">
              <select className={inputCls} value={f.jenis_kelamin} onChange={(e) => set("jenis_kelamin", e.target.value)}>
                <option value="L">Laki-laki</option><option value="P">Perempuan</option>
              </select>
            </Field>
          </div>
          <Field label="Hubungan dengan KK"><input className={inputCls} value={f.hubungan_kk} onChange={(e) => set("hubungan_kk", e.target.value)} placeholder="mis. Anak, Istri" /></Field>
          {f.jenis_kelamin === "P" && (
            <div className="rounded-xl bg-teal-50 p-3">
              <p className="mb-2 text-sm font-semibold text-teal-800">Kondisi Khusus (menentukan kelompok sasaran)</p>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.kondisi_hamil} onChange={(e) => set("kondisi_hamil", e.target.checked)} className="h-4 w-4 accent-teal-600" /> Sedang hamil</label>
              <label className="mt-1.5 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.kondisi_nifas} onChange={(e) => set("kondisi_nifas", e.target.checked)} className="h-4 w-4 accent-teal-600" /> Masa nifas (0-42 hari)</label>
            </div>
          )}
        </div>
        <button data-testid="anggota-save" onClick={save} disabled={saving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Simpan Anggota</>}
        </button>
      </div>
    </div>
  );
}

export default function KeluargaForm({ go, params }) {
  const editing = !!params.id;
  const [f, setF] = useState({ nama_kk: "", alamat: "", rt: "", rw: "", kelurahan: KELURAHAN[0], posyandu: "", no_hp: "", catatan_lokasi: "", punya_jkn: null, air_bersih: null, jamban: null, ventilasi: null, ada_tbc: false, ada_hipertensi: false, ada_dm: false, ada_gangguan_jiwa: false });
  const [anggota, setAnggota] = useState([]);
  const [kid, setKid] = useState(params.id || null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [dups, setDups] = useState([]);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const doDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/keluarga/${kid}`);
      toast.success("Keluarga dihapus");
      go("keluarga");
    } catch (e) { toast.error(errMsg(e)); setDeleting(false); }
  };

  useEffect(() => {
    if (editing) api.get(`/keluarga/${params.id}`).then((r) => { setF(r.data); setAnggota(r.data.anggota || []); setLoading(false); });
  }, [editing, params.id]);

  useEffect(() => {
    if (!editing && f.nama_kk.length > 2) api.get("/keluarga/duplicate-check", { params: { nama: f.nama_kk } }).then((r) => setDups(r.data)).catch(() => {});
  }, [f.nama_kk, editing]);

  const saveKeluarga = async () => {
    if (!f.nama_kk || !f.kelurahan) return toast.error("Nama KK dan kelurahan wajib diisi");
    setSaving(true);
    try {
      const r = kid ? await api.put(`/keluarga/${kid}`, f) : await api.post("/keluarga", f);
      setKid(r.data.id); toast.success("Data keluarga tersimpan");
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const onMemberSaved = (m) => {
    setAnggota((p) => { const i = p.findIndex((x) => x.id === m.id); if (i >= 0) { const c = [...p]; c[i] = m; return c; } return [...p, m]; });
    setModal(null);
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>;

  return (
    <div className="animate-slide-up pb-6">
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur-md">
        <button data-testid="back-btn" onClick={() => go("keluarga")}><ArrowLeft className="h-5 w-5 text-slate-600" /></button>
        <h1 className="text-base font-bold text-slate-900">{editing ? "Detail Keluarga" : "Tambah Keluarga"}</h1>
      </header>

      <div className="space-y-4 px-4 py-4">
        {dups.length > 0 && !editing && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800"><AlertCircle className="h-4 w-4" /> Kemungkinan data ganda:</p>
            {dups.map((d) => <p key={d.id} className="mt-1 text-xs text-amber-700">• {d.nama_kk} — RT {d.rt}/{d.rw}</p>)}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm font-bold text-slate-800">Informasi Keluarga</p>
          <Field label="Nama Kepala Keluarga"><input data-testid="kk-nama" className={inputCls} value={f.nama_kk} onChange={(e) => set("nama_kk", e.target.value)} /></Field>
          <Field label="Alamat"><input className={inputCls} value={f.alamat} onChange={(e) => set("alamat", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="RT"><input className={inputCls} value={f.rt} onChange={(e) => set("rt", e.target.value)} /></Field>
            <Field label="RW"><input className={inputCls} value={f.rw} onChange={(e) => set("rw", e.target.value)} /></Field>
          </div>
          <Field label="Kelurahan">
            <select data-testid="kk-kelurahan" className={inputCls} value={f.kelurahan} onChange={(e) => set("kelurahan", e.target.value)}>
              {KELURAHAN.map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Posyandu"><input className={inputCls} value={f.posyandu} onChange={(e) => set("posyandu", e.target.value)} /></Field>
            <Field label="No. HP"><input className={inputCls} value={f.no_hp} onChange={(e) => set("no_hp", e.target.value.replace(/[^\d+]/g, ""))} inputMode="tel" /></Field>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-sm font-bold text-slate-800">Kondisi Rumah & Kesehatan</p>
          {[["punya_jkn", "Memiliki JKN/asuransi"], ["air_bersih", "Sarana air bersih"], ["jamban", "Jamban keluarga"], ["ventilasi", "Ventilasi cukup"]].map(([k, l]) => (
            <div key={k} className="flex items-center justify-between py-1">
              <span className="text-sm text-slate-600">{l}</span>
              <div className="flex gap-1.5">
                {[["Ya", true], ["Tidak", false]].map(([lbl, val]) => (
                  <button key={lbl} onClick={() => set(k, val)} className={`rounded-lg px-3 py-1 text-xs font-semibold ${f[k] === val ? (val ? "bg-emerald-500 text-white" : "bg-slate-400 text-white") : "bg-slate-100 text-slate-500"}`}>{lbl}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button data-testid="save-keluarga-btn" onClick={saveKeluarga} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Simpan Data Keluarga</>}
        </button>

        {/* Members */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">Anggota Keluarga ({anggota.length})</p>
          </div>
          {!kid ? (
            <p className="text-xs text-slate-400">Simpan data keluarga dulu untuk menambah anggota.</p>
          ) : (
            <>
              <div className="space-y-2">
                {anggota.map((a) => (
                  <button key={a.id} data-testid={`anggota-${a.id}`} onClick={() => setModal(a)} className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-left">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-teal-100 text-teal-700"><User className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{a.nama}</p>
                      <p className="text-xs text-slate-500">{a.kelompok_label} {a.umur != null ? `· ${a.umur} th` : ""}</p>
                    </div>
                    {!a.data_lengkap && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Belum lengkap</span>}
                  </button>
                ))}
              </div>
              <button data-testid="btn-tambah-anggota" onClick={() => setModal({})} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50 py-2.5 text-sm font-semibold text-teal-700">
                <Plus className="h-4 w-4" /> Tambah Anggota Keluarga
              </button>
            </>
          )}
        </div>

        {kid && (
          <button data-testid="mulai-kunjungan-kk" onClick={() => go("kunjungan", { keluarga_id: kid })} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3.5 font-bold text-white shadow-md">
            <ClipboardPlus className="h-5 w-5" /> Mulai Kunjungan Keluarga Ini
          </button>
        )}

        {kid && (
          <button data-testid="delete-keluarga-btn" onClick={() => setDelOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-3 font-semibold text-rose-600 hover:bg-rose-100">
            <Trash2 className="h-5 w-5" /> Hapus Keluarga
          </button>
        )}
      </div>

      {modal && <MemberModal keluargaId={kid} member={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={onMemberSaved} />}

      {delOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => !deleting && setDelOpen(false)}>
          <div data-testid="delete-keluarga-modal" className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-600" /><h3 className="text-lg font-bold text-slate-900">Hapus Keluarga?</h3></div>
            <p className="mb-4 text-sm text-slate-600">Keluarga <span className="font-semibold text-slate-800">{f.nama_kk}</span> beserta seluruh anggotanya akan dihapus dari daftar. Tindakan ini tidak bisa dibatalkan.</p>
            <div className="flex gap-2">
              <button onClick={() => setDelOpen(false)} disabled={deleting} className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">Batal</button>
              <button data-testid="confirm-delete-keluarga" onClick={doDelete} disabled={deleting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:opacity-60">{deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Hapus"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
