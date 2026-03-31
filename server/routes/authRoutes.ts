import { Router } from "express";
import {
  getUserFromAccessToken,
  loginWithEmailAndPassword,
} from "../services/authService";
import { AUTH_COOKIE_ACCESS, AUTH_COOKIE_REFRESH } from "../../shared/const";

const router = Router();

const isProduction = process.env.NODE_ENV === "production";

// ─── Helpers de cookie ────────────────────────────────────────────────────────

function setAuthCookies(res: any, session: any) {
  res.cookie(AUTH_COOKIE_ACCESS, session.access_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: session.expires_in * 1000,
  });

  res.cookie(AUTH_COOKIE_REFRESH, session.refresh_token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
  });
}

function clearAuthCookies(res: any) {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
  };
  res.clearCookie(AUTH_COOKIE_ACCESS, cookieOptions);
  res.clearCookie(AUTH_COOKIE_REFRESH, cookieOptions);
}

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    const result = await loginWithEmailAndPassword(email, password);

    if (result.error || !result.session || !result.user) {
      return res.status(401).json({ error: result.error || "Credenciais inválidas." });
    }

    setAuthCookies(res, result.session);

    return res.json({
      user: { id: result.user.id, email: result.user.email ?? null },
      profile: result.profile,
    });
  } catch {
    return res.status(500).json({ error: "Erro interno ao fazer login." });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get("/me", async (req, res) => {
  try {
    const accessToken = req.cookies?.[AUTH_COOKIE_ACCESS];

    if (!accessToken) {
      return res.status(401).json({ authenticated: false, error: "Não autenticado." });
    }

    const result = await getUserFromAccessToken(accessToken);

    if (!result?.user) {
      clearAuthCookies(res);
      return res.status(401).json({ authenticated: false, error: "Sessão inválida ou expirada." });
    }

    return res.json({
      authenticated: true,
      user: { id: result.user.id, email: result.user.email ?? null },
      profile: result.profile,
    });
  } catch {
    return res.status(500).json({ authenticated: false, error: "Erro ao validar sessão." });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

router.post("/logout", async (_req, res) => {
  try {
    clearAuthCookies(res);
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "Erro ao sair." });
  }
});

export default router;
