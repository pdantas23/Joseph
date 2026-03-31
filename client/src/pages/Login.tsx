import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { getDefaultRouteByRole } from "@/lib/roleRoutes";

const C = {
  brown:    "#333333",
  bege1:    "#B3B3B3",
  bege2:    "#CCCCCC",
  bege3:    "#E6E6E6",
  offwhite: "#F2F2F2",
  white:    "#FFFFFF",
  rose:     "#E8D5D0",
} as const;

export default function Login() {
  const { login, isAuthenticated, profile, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectedRef                   = useRef(false);

  useEffect(() => {
    if (redirectedRef.current || loading || !isAuthenticated || !profile?.role) return;
    redirectedRef.current = true;
    setLocation(getDefaultRouteByRole(profile.role));
  }, [loading, isAuthenticated, profile, setLocation]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email || !password) { setError("Email e senha são obrigatórios."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email inválido."); return; }
    if (password.length < 6) { setError("Senha deve ter pelo menos 6 caracteres."); return; }

    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result?.error) { setError("Email ou senha incorretos."); return; }
      const route = getDefaultRouteByRole(result?.profile?.role);
      if (route !== "/") { redirectedRef.current = true; setLocation(route); return; }
      setError("Seu perfil não está configurado. Contate o administrador.");
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isInitialLoading = loading && !isAuthenticated && !isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: C.offwhite, fontFamily: "'Fira Sans', 'Helvetica Neue', Arial, sans-serif" }}>
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="flex flex-col items-center mb-12">
          <span className="text-[9px] font-light tracking-[0.55em] uppercase mb-1" style={{ color: C.bege1 }}>Joseph</span>
          <span className="text-2xl font-light tracking-[0.12em]"
            style={{ color: C.brown, fontFamily: "'Georgia', 'Times New Roman', serif" }}>Atelier</span>
          <div className="mt-4 w-8 h-px" style={{ backgroundColor: C.bege3 }} />
          <p className="mt-4 text-[10px] font-light tracking-[0.3em] uppercase" style={{ color: C.bege1 }}>
            Área restrita
          </p>
        </div>

        <div className="bg-white p-8 sm:p-10" style={{ border: `1px solid ${C.bege3}` }}>
          {error && (
            <div className="mb-6 p-3 text-xs font-light" style={{ backgroundColor: C.rose, color: "#8a5a55", border: `1px solid ${C.bege2}30` }}>
              {error}
            </div>
          )}

          {isInitialLoading && (
            <div className="mb-6 flex items-center gap-2 p-3 text-xs font-light"
              style={{ backgroundColor: C.offwhite, color: C.bege1 }}>
              <Loader2 className="h-3 w-3 animate-spin" />
              Verificando sessão...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2" style={{ color: C.bege1 }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={isSubmitting || isInitialLoading}
                autoComplete="email"
                className="w-full py-2.5 px-3 text-sm font-light outline-none transition"
                style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.offwhite, color: C.brown, borderRadius: "1px" }}
                onFocus={(e) => (e.target.style.borderColor = C.brown)}
                onBlur={(e) => (e.target.style.borderColor = C.bege3)}
              />
            </div>

            <div>
              <label className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2" style={{ color: C.bege1 }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting || isInitialLoading}
                  autoComplete="current-password"
                  className="w-full py-2.5 px-3 pr-10 text-sm font-light outline-none transition"
                  style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.offwhite, color: C.brown, borderRadius: "1px" }}
                  onFocus={(e) => (e.target.style.borderColor = C.brown)}
                  onBlur={(e) => (e.target.style.borderColor = C.bege3)}
                />
                <button type="button" onClick={() => setShowPassword((p) => !p)}
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition hover:opacity-50"
                  style={{ color: C.bege2, background: "none", border: "none", cursor: "pointer" }}>
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting || isInitialLoading}
              className="w-full py-3 text-[11px] font-medium tracking-[0.35em] uppercase transition hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: C.brown, color: C.white, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer", borderRadius: "1px" }}>
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Entrando...
                </span>
              ) : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-[10px] font-light" style={{ color: C.bege2 }}>
            Contate o administrador caso não tenha acesso
          </p>
        </div>
      </div>
    </div>
  );
}
