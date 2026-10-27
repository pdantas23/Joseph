import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CART_STORAGE_KEY,
  adicionarItem,
  alterarQuantidade,
  lerCarrinhoSalvo,
  removerItem,
  subtotal,
  totalDeItens,
  type CartItem,
  type NovoItem,
} from "./cartUtils";

type CartContextValue = {
  itens: CartItem[];
  quantidadeTotal: number;
  subtotal: number;
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
  adicionar: (item: NovoItem, quantidade?: number) => void;
  alterar: (chave: string, quantidade: number) => void;
  remover: (chave: string) => void;
  limpar: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function lerStorage(): CartItem[] {
  try {
    return lerCarrinhoSalvo(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>(lerStorage);
  const [aberto, setAberto] = useState(false);

  // Guarda no navegador a cada mudança.
  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(itens));
    } catch {
      /* navegador sem storage: o carrinho vale só nesta aba */
    }
  }, [itens]);

  // Mantém abas abertas em sincronia.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === CART_STORAGE_KEY) setItens(lerCarrinhoSalvo(e.newValue));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const adicionar = useCallback((item: NovoItem, quantidade = 1) => {
    setItens((prev) => adicionarItem(prev, item, quantidade));
  }, []);
  const alterar = useCallback((chave: string, q: number) => setItens((prev) => alterarQuantidade(prev, chave, q)), []);
  const remover = useCallback((chave: string) => setItens((prev) => removerItem(prev, chave)), []);
  const limpar = useCallback(() => setItens([]), []);

  const value = useMemo<CartContextValue>(() => ({
    itens,
    quantidadeTotal: totalDeItens(itens),
    subtotal: subtotal(itens),
    aberto,
    abrir: () => setAberto(true),
    fechar: () => setAberto(false),
    adicionar,
    alterar,
    remover,
    limpar,
  }), [itens, aberto, adicionar, alterar, remover, limpar]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
