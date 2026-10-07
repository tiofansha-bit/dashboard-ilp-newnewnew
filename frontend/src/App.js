import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import KaderApp from "@/pages/kader/KaderApp";
import AdminApp from "@/pages/admin/AdminApp";
import { Loader2 } from "lucide-react";

function Gate() {
  const { user } = useAuth();
  if (user === null)
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>;
  if (!user) return <Login />;
  if (user.role === "admin") return <AdminApp />;
  return <KaderApp />;
}

function App() {
  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<Gate />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
export default App;
