import { useState } from "react";

export const TOP_OPTIONS = [5, 10, 15, 20, 30, 0];
export function TopSelect({ value, onChange, testid }) {
  return (
    <select data-testid={testid} value={value} onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">
      {TOP_OPTIONS.map((n) => <option key={n} value={n}>{n ? `Top ${n}` : "Semua"}</option>)}
    </select>
  );
}

export function usePref(key, init) {
  const [v, setV] = useState(() => { try { const x = localStorage.getItem(key); return x === null ? init : JSON.parse(x); } catch { return init; } });
  const set = (x) => { setV(x); localStorage.setItem(key, JSON.stringify(x)); };
  return [v, set];
}
