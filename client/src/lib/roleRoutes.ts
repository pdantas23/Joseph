import type { AppRole } from "@/features/auth/authTypes";

/**
 * Mapeamento de role → rota padrão após login.
 */
const ROLE_DEFAULT_ROUTES: Record<AppRole, string> = {
  admin:     "/comercial",
  comercial: "/comercial",
};

/**
 * Retorna a rota padrão para uma role.
 * Retorna "/" como fallback seguro se a role não estiver mapeada.
 */
export function getDefaultRouteByRole(role: AppRole | null | undefined): string {
  if (!role) return "/";
  return ROLE_DEFAULT_ROUTES[role] ?? "/";
}
