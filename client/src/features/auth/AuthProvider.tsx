import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getCurrentSession,
  getUserProfile,
  signInWithPassword,
  signOutLocal,
} from "./authService";
import type {
  AuthContextType,
  AuthUser,
  UserProfile,
  LoginResult,
} from "./authTypes";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface Props {
  children: React.ReactNode;
}

interface SessionPayload {
  user: AuthUser;
  profile: UserProfile | null;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setProfile(null);
  }, []);

  const applySession = useCallback(
    async (session: SessionPayload | null): Promise<UserProfile | null> => {
      if (!session?.user) {
        clearAuthState();
        return null;
      }

      setUser(session.user);
      setProfile(session.profile ?? null);

      return session.profile ?? null;
    },
    [clearAuthState]
  );

  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { session } = await getCurrentSession(); // ← ignora sessionError
      if (!session) {
        clearAuthState();
        return; // sem setar erro — sessão expirada é fluxo normal
      }
      await applySession(session);
    } catch {
      clearAuthState();
      // silencioso — não exibe erro de sessão pro usuário
    } finally {
      setLoading(false);
    }
  }, [applySession, clearAuthState]);

    const refreshProfile = useCallback(async () => {
      try {
        setError(null);
        const userProfile = await getUserProfile();
        setProfile(userProfile);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao atualizar perfil."
        );
      }
    }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      try {
        setLoading(true);
        setError(null);

        const { user, profile, error } = await signInWithPassword(email, password);

        if (error || !user) {
          const message = error?.message || "Erro ao fazer login.";
          setError(message);
          clearAuthState();
          return { error: message, profile: null };
        }

        setUser(user);
        setProfile(profile ?? null);

        return {
          error: null,
          profile: profile ?? null,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao fazer login.";
        setError(message);
        clearAuthState();
        return { error: message, profile: null };
      } finally {
        setLoading(false);
      }
    },
    [clearAuthState]
  );

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await signOutLocal();
      clearAuthState();
      window.location.href = "/"; // ← redireciona e limpa o estado por completo
    } catch (err) {
      clearAuthState();
      setError(err instanceof Error ? err.message : "Erro ao sair.");
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      loading,
      error,
      isAuthenticated: !!user,
      login,
      logout,
      refreshProfile,
    }),
    [user, profile, loading, error, login, logout, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}