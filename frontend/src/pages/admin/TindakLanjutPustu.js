import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2, Filter, Stethoscope, ClipboardCheck, Plus, Trash2, Pencil,
  X, Save, ClipboardList, CheckCircle2,
} from "lucide-react";

const EMPTY = {
  kasus_id: null, posyandu: "", nama: "", nik: "", tanggal_lahir: "",
  alamat: "", no_telp: "", masalah: "", petugas: "", waktu: "", tindak_lanjut: "",
};

const prioTone = (p) =>
  p === "merah" ? "bg-rose-100 text-rose-700" : p === "kuning" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";

export default function TindakLanjutPustu() {
  const [posyanduList, setPosyanduList] = useState([]);
  const [posyandu, setPosyandu] = useState("");
  const [tab, setTab] = useState("sumber");
  const [sumber, setSumber] = useState(null);
  const [records, setRecords] = useState(null);
  const [modal, setModal] = useState(null); // form object or null
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/master/posyandu").then((r) => setPosyanduList(r.data)).catch(() => {});
  }, []);

  const loadSumber = () => {
    setSumber(null);
    api.get("/admin/tindak-lanjut/sumber", { params: { posyandu } }).then((r) => setSumber(r.data)).catch((e) => { toast.error(errMsg(e)); setSumber([]); });
  };
  const loadRecords = () => {
    setRecords(null);
    api.get("/admin/tindak-lanjut", { params: { posyandu } }).then((r) => setRecords(r.data)).catch((e) => { toast.error(errMsg(e)); setRecords([]); });
  };
  useEffect(() => { if (tab === "sumber") loadSumber(); else loadRecords(); }, [tab, posyandu]); // eslint-disable-line

  const openFromKasus = (k) => setModal({
    ...EMPTY, kasus_id: k.kasus_id, posyandu: k.posyandu || posyandu, nama: k.nama, nik: k.nik,
    tanggal_lahir: k.tanggal_lahir, alamat: k.alamat, no_telp: k.no_telp, masalah: k.masalah,
    kelurahan: k.kelurahan,
  });
  const openManual = () => setModal({ ...EMPTY, posyandu });
  const openEdit = (r) => setModal({ ...r });

  const save = async () => {
    if (!modal.nama.trim() || !modal.posyandu.trim() || !modal.tindak_lanjut.trim()) {
      toast.error("Nama, posyandu, dan tindak lanjut wajib diisi"); return;
    }
    setSaving(true);
    try {
      if (modal.id) await api.put(`/admin/tindak-lanjut/${modal.id}`, modal);
      else await api.post("/admin/tindak-lanjut", modal);
      toast.success("Tindak lanjut tersimpan");
      setModal(null);
      loadRecords();
      if (tab === "sumber") loadSumber();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const remove = async (r) => {
    if (!window.confirm(`Hapus tindak lanjut untuk ${r.nama}?`)) return;
    try { await api.delete(`/admin/tindak-lanjut/${r.id}`); toast.success("Terhapus"); loadRecords(); if (tab === "sumber") loadSumber(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="tindak-lanjut-pustu-page" className="animate-slide-up space-y-5">
      {/* Header + filter */}
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Filter className="h-5 w-5 text-slate-400" />
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Posyandu</label>
            <select data-testid="tl-filter-posyandu" value={posyandu} onChange={(e) => setPosyandu(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">
              <option value="">Semua Posyandu</option>
              {posyanduList.map((p) => <option key={p.id || p.nama} value={p.nama}>{p.nama}</option>)}
            </select>
          </div>
        </div>
        <button data-testid="tl-add-manual-btn" onClick={openManual}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
          <Plus className="h-4 w-4" /> Tindak Lanjut Manual
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[["sumber", "Kasus Temuan", ClipboardList], ["rekap", "Rekap Tindak Lanjut", ClipboardCheck]].map(([k, l, Icon]) => (
          <button key={k} data-testid={`tl-tab-${k}`} onClick={() => setTab(k)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === k ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            <Icon className="h-4 w-4" /> {l}
          </button>
        ))}
      </div>

      {/* Sumber (kasus temuan) */}
      {tab === "sumber" && (
        sumber === null ? <Spinner /> : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>{["Nama", "Masalah Ditemukan", "Prioritas", "Posyandu", "Kelurahan", "Aksi"].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sumber.map((k) => (
                  <tr key={k.kasus_id} data-testid={`tl-sumber-row-${k.kasus_id}`} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{k.nama || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{k.masalah}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${prioTone(k.priority)}`}>{k.priority || "-"}</span></td>
                    <td className="px-4 py-3 text-slate-500">{k.posyandu || "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{k.kelurahan || "-"}</td>
                    <td className="px-4 py-3">
                      {k.sudah_ada_tl ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Sudah</span>
                      ) : (
                        <button data-testid={`tl-followup-btn-${k.kasus_id}`} onClick={() => openFromKasus(k)}
                          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
                          <Stethoscope className="h-4 w-4" /> Tindak Lanjuti
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {sumber.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Belum ada kasus temuan untuk posyandu ini.</td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Rekap tindak lanjut */}
      {tab === "rekap" && (
        records === null ? <Spinner /> : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>{["Nama", "NIK", "Tgl Lahir", "Alamat", "No Telp", "Masalah", "Tindak Lanjut", "Posyandu", "Waktu", ""].map((h) => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} data-testid={`tl-record-row-${r.id}`} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{r.nama}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.nik || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.tanggal_lahir || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[180px]">{r.alamat || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.no_telp || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px]">{r.masalah || "-"}</td>
                    <td className="px-4 py-3 text-slate-800 max-w-[220px]">{r.tindak_lanjut}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.posyandu}</td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{(r.waktu || "").slice(0, 10)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button data-testid={`tl-edit-btn-${r.id}`} onClick={() => openEdit(r)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                        <button data-testid={`tl-delete-btn-${r.id}`} onClick={() => remove(r)} className="rounded-lg border border-rose-200 p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">Belum ada tindak lanjut tercatat.</td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal form */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !saving && setModal(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div data-testid="tl-modal" className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800"><Stethoscope className="h-5 w-5 text-teal-600" /> {modal.id ? "Edit" : "Tambah"} Tindak Lanjut Pustu</h3>
              <button onClick={() => setModal(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama" testid="tl-input-nama" value={modal.nama} onChange={(v) => setModal({ ...modal, nama: v })} required />
              <Field label="NIK" testid="tl-input-nik" value={modal.nik} onChange={(v) => setModal({ ...modal, nik: v })} />
              <Field label="Tanggal Lahir" type="date" testid="tl-input-tgl" value={modal.tanggal_lahir} onChange={(v) => setModal({ ...modal, tanggal_lahir: v })} />
              <Field label="No Telp" testid="tl-input-telp" value={modal.no_telp} onChange={(v) => setModal({ ...modal, no_telp: v })} />
              <div className="col-span-2"><Field label="Alamat" testid="tl-input-alamat" value={modal.alamat} onChange={(v) => setModal({ ...modal, alamat: v })} /></div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Posyandu <span className="text-rose-500">*</span></label>
                <select data-testid="tl-input-posyandu" value={modal.posyandu} onChange={(e) => setModal({ ...modal, posyandu: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Pilih posyandu</option>
                  {posyanduList.map((p) => <option key={p.id || p.nama} value={p.nama}>{p.nama}</option>)}
                </select>
              </div>
              <Field label="Petugas Pustu" testid="tl-input-petugas" value={modal.petugas} onChange={(v) => setModal({ ...modal, petugas: v })} />
              <div className="col-span-2"><Field label="Masalah Kesehatan Ditemukan" testid="tl-input-masalah" value={modal.masalah} onChange={(v) => setModal({ ...modal, masalah: v })} /></div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-500">Tindak Lanjut yang Diberikan <span className="text-rose-500">*</span></label>
                <textarea data-testid="tl-input-tindaklanjut" rows={3} value={modal.tindak_lanjut} onChange={(e) => setModal({ ...modal, tindak_lanjut: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Uraikan tindakan/rujukan/edukasi yang diberikan petugas Pustu" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Batal</button>
              <button data-testid="tl-save-btn" onClick={save} disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", testid, required }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label} {required && <span className="text-rose-500">*</span>}</label>
      <input data-testid={testid} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
    </div>
  );
}

function Spinner() {
  return <div className="flex h-40 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-teal-600" /></div>;
}
