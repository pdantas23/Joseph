import type { Request, Response, NextFunction } from "express";
import { getUserFromAccessToken, type AppRole } from "../services/authService";

// Estende o tipo Request do Express para incluir dados do usuário autenticado
declare global {
  namespace Express {
    interface Request {
      authUser?: {
        id: string;
        email: string | null;
      };
      authProfile?: {
        id: string;
        email: string | null;
        role: AppRole | null;
      } | null;
    }
  }
}

/**
 * Middleware de autenticação reutilizável.
 *
 * Uso básico (qualquer usuário autenticado):
 *   router.get("/rota", requireAuth(), handler)
 *
 * Uso com controle de roles:
 *   router.get("/admin", requireAuth(["admin"]), handler)
 *   router.get("/team",  requireAuth(["admin", "comercial"]), handler)
 */
export function requireAuth(allowedRoles?: AppRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.cookies?.access_token;

      if (!accessToken) {
        return res.status(401).json({ error: "Não autenticado." });
      }

      const result = await getUserFromAccessToken(accessToken);

      if (!result?.user) {
        return res.status(401).json({ error: "Sessão inválida." });
      }

      req.authUser    = { id: result.user.id, email: result.user.email ?? null };
      req.authProfile = result.profile;

      if (
        allowedRoles &&
        (!result.profile?.role || !allowedRoles.includes(result.profile.role))
      ) {
        return res.status(403).json({ error: "Sem permissão." });
      }

      next();
    } catch {
      return res.status(500).json({ error: "Erro ao validar autenticação." });
    }
  };
}
