import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Estado compartilhado de "há um diálogo cobrindo a tela".
 * Cada modal, gaveta ou diálogo chama useRegistrarOverlay(aberto); quem
 * flutua por cima da página (ex.: o botão fixo do WhatsApp) lê
 * useAlgumOverlayAberto() e se esconde.
 *
 * É um contador, para dois diálogos ao mesmo tempo (modal + sacola por
 * cima) funcionarem: só volta a zero quando os dois fecham.
 */
type OverlayContextValue = {
  abertos: number;
  registrar: () => () => void;
};

const OverlayContext = createContext<OverlayContextValue | null>(null);

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [abertos, setAbertos] = useState(0);
  const registrar = useCallback(() => {
    setAbertos((n) => n + 1);
    let feito = false;
    return () => {
      if (feito) return;
      feito = true;
      setAbertos((n) => Math.max(0, n - 1));
    };
  }, []);
  const value = useMemo(() => ({ abertos, registrar }), [abertos, registrar]);
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

/** Registra este diálogo como aberto enquanto `aberto` for true. */
export function useRegistrarOverlay(aberto: boolean) {
  const ctx = useContext(OverlayContext);
  const registrar = ctx?.registrar;
  useEffect(() => {
    if (!aberto || !registrar) return;
    return registrar();
  }, [aberto, registrar]);
}

export function useAlgumOverlayAberto(): boolean {
  return (useContext(OverlayContext)?.abertos ?? 0) > 0;
}
