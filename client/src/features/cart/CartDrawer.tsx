import { useEffect } from "react";
import { Minus, Plus, Trash2, X, ShoppingBag } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useCart } from "./CartContext";
import { useRegistrarOverlay } from "@/contexts/OverlayContext";
import { montarMensagemCarrinho } from "./cartUtils";
import { formatarPreco } from "@/features/catalog/variantUtils";
import { linkWhatsApp } from "@/lib/whatsapp";
import { C, FONT_SANS, FONT_SERIF } from "@/lib/josephTheme";

export default function CartDrawer() {
  const { itens, aberto, fechar, alterar, remover, limpar, subtotal, quantidadeTotal } = useCart();
  useRegistrarOverlay(aberto);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") fechar(); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto, fechar]);

  const href = itens.length > 0 ? linkWhatsApp(montarMensagemCarrinho(itens)) : undefined;

  return (
    <div
      className={`fixed inset-0 z-[60] ${aberto ? "" : "pointer-events-none"}`}
      aria-hidden={!aberto}
      style={{ fontFamily: FONT_SANS }}
    >
      {/* fundo */}
      <div
        onClick={fechar}
        className="absolute inset-0 transition-opacity duration-300"
        style={{ background: "rgba(51,51,51,0.45)", backdropFilter: "blur(3px)", opacity: aberto ? 1 : 0 }}
      />

      {/* gaveta */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Sacola"
        className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col"
        style={{
          background: C.warmSurface,
          boxShadow: aberto ? "-20px 0 60px rgba(51,51,51,0.18)" : "none",
          transform: aberto ? "translateX(0)" : "translateX(100%)",
          visibility: aberto ? "visible" : "hidden",
          transition: aberto ? "transform 300ms ease-out" : "transform 300ms ease-out, visibility 0s linear 300ms",
        }}
      >
        <header className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${C.warmBeige}` }}>
          <div>
            <p className="text-[9px] uppercase tracking-[0.4em] font-light" style={{ color: C.roseDark }}>Sua seleção</p>
            <h2 className="text-xl font-light" style={{ color: C.brown, fontFamily: FONT_SERIF }}>
              Sacola {quantidadeTotal > 0 && <span className="text-sm" style={{ color: C.muted }}>({quantidadeTotal})</span>}
            </h2>
          </div>
          <button
            type="button" onClick={fechar} aria-label="Fechar sacola"
            className="flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-70"
            style={{ background: C.warmBeige, color: C.brown, border: "none", cursor: "pointer" }}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {itens.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <ShoppingBag className="h-8 w-8" strokeWidth={1.2} style={{ color: C.roseDark }} />
            <p className="text-sm font-light" style={{ color: C.brown }}>Sua sacola está vazia.</p>
            <p className="text-xs font-light" style={{ color: C.muted }}>Escolha uma peça no catálogo e toque em "Adicionar à sacola".</p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto px-5 py-2">
            {itens.map((i) => (
              <li key={i.chave} data-testid="cart-item" className="flex gap-3 py-4" style={{ borderBottom: `1px solid ${C.warmBeige}` }}>
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-md" style={{ background: C.warmBeige }}>
                  {i.imagem && <img src={i.imagem} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-sm leading-snug" style={{ color: C.brown }}>{i.nome}</p>
                  {i.variacaoNome && (
                    <p className="text-xs font-light leading-snug" style={{ color: C.muted }}>{i.variacaoNome}</p>
                  )}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <div className="flex items-center rounded-full" style={{ border: `1px solid ${C.warmBeige2}`, background: C.white }}>
                      <button
                        type="button" aria-label="Diminuir quantidade"
                        onClick={() => alterar(i.chave, i.quantidade - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition hover:opacity-60"
                        style={{ color: C.brown, background: "none", border: "none", cursor: "pointer" }}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs tabular-nums" style={{ color: C.brown }}>{i.quantidade}</span>
                      <button
                        type="button" aria-label="Aumentar quantidade"
                        onClick={() => alterar(i.chave, i.quantidade + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-full transition hover:opacity-60"
                        style={{ color: C.brown, background: "none", border: "none", cursor: "pointer" }}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-sm tabular-nums" style={{ color: C.brown }}>
                      {formatarPreco(i.precoUnitario * i.quantidade)}
                    </span>
                  </div>
                </div>
                <button
                  type="button" aria-label={`Remover ${i.nome}`}
                  onClick={() => remover(i.chave)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full transition hover:opacity-60"
                  style={{ color: C.muted, background: "none", border: "none", cursor: "pointer" }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {itens.length > 0 && (
          <footer className="px-5 pb-5 pt-4" style={{ borderTop: `1px solid ${C.warmBeige}`, background: C.white }}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-[0.3em] font-light" style={{ color: C.muted }}>Subtotal</span>
              <span data-testid="cart-subtotal" className="text-xl tabular-nums" style={{ color: C.brown, fontFamily: FONT_SERIF }}>
                {formatarPreco(subtotal)}
              </span>
            </div>
            <p className="mb-4 text-[11px] font-light" style={{ color: C.muted }}>
              O pedido é finalizado pelo WhatsApp, com a nossa equipe.
            </p>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="cart-checkout"
              className="flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[11px] font-medium uppercase tracking-[0.25em] transition hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.brown} 0%, #4B403D 100%)`, color: C.white }}
            >
              <WhatsAppIcon className="h-[18px] w-[18px]" />
              Finalizar pelo WhatsApp
            </a>
            <button
              type="button"
              onClick={limpar}
              className="mt-3 w-full text-[10px] uppercase tracking-[0.25em] font-light transition hover:opacity-60"
              style={{ color: C.muted, background: "none", border: "none", cursor: "pointer" }}
            >
              Esvaziar sacola
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
