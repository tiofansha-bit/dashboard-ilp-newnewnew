import { useEffect, useState, useCallback } from "react";
import { getQueue, flushQueue, isOnline, SYNC_EVENT } from "@/lib/offline";
import { toast } from "sonner";
import { Cloud, CloudOff, RefreshCw, Check } from "lucide-react";

export default function SyncBar() {
  const [online, setOnline] = useState(isOnline());
  const [pending, setPending] = useState(getQueue().length);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => setPending(getQueue().length), []);

  const doFlush = useCallback(async (manual = false) => {
    if (!isOnline() || getQueue().length === 0) { refresh(); return; }
    setSyncing(true);
    const { sent, failed } = await flushQueue();
    setSyncing(false);
    refresh();
    if (sent > 0) toast.success(`${sent} data tersinkron ke server`);
    if (failed > 0) toast.error(`${failed} data ditolak server (cek kembali)`);
    if (manual && sent === 0 && failed === 0) toast.info("Tidak ada data untuk disinkronkan");
  }, [refresh]);

  useEffect(() => {
    const onUp = () => { setOnline(true); doFlush(); };
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    window.addEventListener(SYNC_EVENT, refresh);
    const iv = setInterval(() => doFlush(), 15000);
    doFlush();
    return () => { window.removeEventListener("online", onUp); window.removeEventListener("offline", onDown); window.removeEventListener(SYNC_EVENT, refresh); clearInterval(iv); };
  }, [doFlush, refresh]);

  if (online && pending === 0) return null;

  return (
    <div data-testid="sync-bar" className={`flex items-center justify-between gap-2 px-4 py-2 text-xs font-semibold ${online ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-800"}`}>
      <span className="flex items-center gap-1.5">
        {online ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
        {online ? (pending > 0 ? `${pending} data menunggu sinkronisasi` : "Tersinkron") : "Mode Offline — data disimpan di perangkat"}
      </span>
      {pending > 0 && (
        <button data-testid="sync-now-btn" onClick={() => doFlush(true)} disabled={syncing || !online}
          className="flex items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1 disabled:opacity-50">
          {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sinkronkan
        </button>
      )}
    </div>
  );
}
