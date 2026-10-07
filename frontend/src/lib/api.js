import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((config) => {
  const t = localStorage.getItem("pws_token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function errMsg(e, fallback = "Terjadi kesalahan. Coba lagi.") {
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(" ");
  return d?.msg || e?.message || fallback;
}
