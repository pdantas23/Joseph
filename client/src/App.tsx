import { Route, Switch } from "wouter";
import ProtectedRoute from "@/features/auth/ProtectedRoute";

import Home     from "@/pages/Home";
import Login    from "@/pages/Login";
import NotFound from "@/pages/NotFound";

import Comercial from "@/features/comercial/pages/Comercial";
import Catalog   from "@/features/catalog/pages/Catalog";
import Marketing from "@/features/marketing/pages/Marketing";

export default function App() {
  return (
    <Switch>
      {/* ── Rotas públicas ─────────────────────────────────────────────── */}
      <Route path="/"         component={Home}    />
      <Route path="/login"    component={Login}   />
      <Route path="/catalogo" component={Catalog} />

      {/* ── Área comercial ─────────────────────────────────────────────── */}
      <Route path="/comercial">
        <ProtectedRoute allowedRoles={["admin", "comercial"]}>
          <Comercial />
        </ProtectedRoute>
      </Route>

      {/* ── Área marketing ─────────────────────────────────────────────── */}
      <Route path="/marketing">
        <ProtectedRoute allowedRoles={["admin", "marketing"]}>
          <Marketing />
        </ProtectedRoute>
      </Route>

      {/* ── Fallback 404 ───────────────────────────────────────────────── */}
      <Route component={NotFound} />
    </Switch>
  );
}
