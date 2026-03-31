import type { UserProfile } from "./authTypes";

type SessionUser = {
  id: string;
  email: string | null;
};

type LoginResponse = {
  user?: SessionUser;
  profile?: UserProfile | null;
  error?: string;
};

type MeResponse = {
  authenticated?: boolean;
  user?: SessionUser;
  profile?: UserProfile | null;
  error?: string;
};

type ServiceError = {
  message: string;
};

const API_URL = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL;

async function safeReadJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(
      `Resposta inválida do servidor: esperado JSON, recebido "${text.slice(0, 80)}"`
    );
  }

  return response.json();
}

export async function signInWithPassword(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data: LoginResponse = await safeReadJson(response);

  return {
    user: data.user ?? null,
    profile: data.profile ?? null,
    error: response.ok
      ? null
      : {
          message: data.error || "Erro ao fazer login.",
        },
  };
}

export async function signOutLocal() {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });

  let data: { error?: string } = {};

  try {
    data = await safeReadJson(response);
  } catch {
    if (!response.ok) {
      return {
        error: {
          message: "Erro ao sair.",
        } satisfies ServiceError,
      };
    }
  }

  return {
    error: response.ok
      ? null
      : {
          message: data.error || "Erro ao sair.",
        },
  };
}

export async function getCurrentSession() {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  const data: MeResponse = await safeReadJson(response);

  if (!response.ok || !data.authenticated || !data.user) {
    return {
      session: null,
      error: data.error
        ? {
            message: data.error,
          }
        : null,
    };
  }

  return {
    session: {
      user: data.user,
      profile: data.profile ?? null,
    },
    error: null,
  };
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  const data: MeResponse = await safeReadJson(response);

  if (!response.ok || !data.authenticated) {
    return null;
  }

  return data.profile ?? null;
}