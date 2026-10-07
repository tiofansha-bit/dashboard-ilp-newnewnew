import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null=checking, false=anon, obj=auth
  useEffect(() => {
    const t = localStorage.getItem("pws_token");
    if (!t) { setUser(false); return; }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => { localStorage.removeItem("pws_token"); setUser(false); });
  }, []);

  const login = async (username, password) => {
    const r = await api.post("/auth/login", { username, password });
    localStorage.setItem("pws_token", r.data.access_token);
    setUser(r.data.user);
    return r.data.user;
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    localStorage.removeItem("pws_token");
    setUser(false);
  };
  return <AuthCtx.Provider value={{ user, login, logout, setUser }}>{children}</AuthCtx.Provider>;
}
