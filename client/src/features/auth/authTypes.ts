// ─── Roles ────────────────────────────────────────────────────────────────────
export type AppRole = "admin" | "comercial" | "marketing";

// ─── Usuário autenticado (retorno do Supabase) ────────────────────────────────
export type AuthUser = {
  id: string;
  email: string | null;
};

// ─── Perfil estendido (tabela profiles_joseph no Supabase) ───────────────────
export type UserProfile = {
  id: string;
  email: string;
  role: AppRole;
};

// ─── Resultado do login ───────────────────────────────────────────────────────
export type LoginResult = {
  error: string | null;
  profile: UserProfile | null;
};

// ─── Contexto global de autenticação ─────────────────────────────────────────
export type AuthContextType = {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};
