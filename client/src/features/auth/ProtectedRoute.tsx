import { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "./useAuth";
import type { AppRole } from "./authTypes";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { loading, isAuthenticated, profile } = useAuth();

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && (!profile?.role || !allowedRoles.includes(profile.role))) {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}