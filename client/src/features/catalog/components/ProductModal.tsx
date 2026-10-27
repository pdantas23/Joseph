import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "@/features/catalog/catalogTypes";
import { CATEGORY_LABELS } from "@/features/catalog/catalogTypes";
import {
  codigoEfetivo,
  descricaoEfetiva,
  formatarPreco,
  galeria,
  nomeComVariacao,
  precoEfetivo,
  variacoesVisiveis,
} from "@/features/catalog/variantUtils";
import { useCart } from "@/features/cart/CartContext";
import { useRegistrarOverlay } from "@/contexts/OverlayContext";
import { C, FONT_SANS, FONT_SERIF } from "@/lib/josephTheme";

// Fundo das fotos: a foto aparece inteira (object-contain) sobre este tom.
const FUNDO_FOTO = C.warmSurface;

type Props = {
  product: Product;
  initialVariationId?: string | null;
  onClose: () => void;
  onVariationChange?: (variacaoId: string | null) => void;
};

function prefereMenosMovimento(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/*
 * Layout
 *  - Desktop (md+): até 1160 px ou 90vw de largura e até 88vh de altura.
 *    Foto à esquerda; à direita, cabeçalho, opções em grade compacta,
 *    descrição ocupando todo o espaço que sobra (inteira se couber; se não,
 *    só ela rola, com um esmaecido embaixo) e as ações fixas no rodapé.
 *  - Celular: centralizado com margem de 16 px; foto inteira num quadro
 *    4:5 (no máximo 46% da altura), com arrastar e pontos; as informações
 *    rolam e as ações ficam fixas no rodapé do modal.
 */
export default function ProductModal({ product, initialVariationId, onClose, onVariationChange }: Props) {
  const variacoes = useMemo(() => variacoesVisiveis(product), [product]);
  const [variacaoId, setVariacaoId] = useState<string | null>(
    () => variacoes.find((v) => v.id === initialVariationId)?.id ?? variacoes[0]?.id ?? null
  );
  const variacao = variacoes.find((v) => v.id === variacaoId) ?? null;

  const imagens = useMemo(() => galeria(product, variacao), [product, variacao]);
  const [idx, setIdx] = useState(0);
  const [quantidade, setQuantidade] = useState(1);
  const [temMaisTexto, setTemMaisTexto] = useState(false);
  const trilho = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  useRegistrarOverlay(true); // montado = aberto
  const { adicionar, abrir, aberto: sacolaAberta } = useCart();

  const preco = precoEfetivo(product, variacao);
  const codigo = codigoEfetivo(product, variacao);
  const descricao = descricaoEfetiva(product, variacao);
  const nomeItem = nomeComVariacao(product.nome, variacao?.nome);

  // Trava a rolagem da página enquanto o modal está aberto.
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, []);

  // Trocou a variação: volta para a 1ª foto e para o início do texto.
  useEffect(() => {
    setIdx(0);
    if (trilho.current) trilho.current.scrollLeft = 0;
    if (descRef.current) descRef.current.scrollTop = 0;
  }, [variacaoId]);

  // Esmaecido embaixo da descrição só quando há texto além da área visível
  // (estouro medido de verdade, e reavaliado quando o modal muda de tamanho).
  function medirDescricao() {
    const el = descRef.current;
    if (!el) return;
    setTemMaisTexto(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  }
  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    medirDescricao();
    const ro = new ResizeObserver(medirDescricao);
    ro.observe(el);
    return () => ro.disconnect();
  }, [descricao]);

  function escolher(id: string) {
    setVariacaoId(id);
    onVariationChange?.(id);
  }

  function irPara(i: number) {
    const el = trilho.current;
    const n = imagens.length;
    if (!el || n === 0) return;
    const alvo = (i + n) % n;
    el.scrollTo({ left: alvo * el.clientWidth, behavior: prefereMenosMovimento() ? "auto" : "smooth" });
    setIdx(alvo);
  }

  function aoRolarTrilho() {
    const el = trilho.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sacolaAberta) return; // a sacola por cima trata o próprio Escape
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && imagens.length > 1) irPara(idx - 1);
      if (e.key === "ArrowRight" && imagens.length > 1) irPara(idx + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function adicionarNaSacola() {
    adicionar(
      {
        produtoId: product.id,
        variacaoId: variacao?.id ?? null,
        nome: product.nome,
        variacaoNome: variacao?.nome ?? null,
        codigo,
        precoUnitario: preco,
        imagem: imagens[0] ?? null,
      },
      quantidade
    );
    // Retorno: abre a sacola por cima do modal, com a peça já somada.
    abrir();
  }

  const setaCls = "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100";
  const setaStyle = { background: "rgba(255,255,255,0.92)", color: C.brown, border: "none", cursor: "pointer" } as const;

  const linhaTopo = [
    product.colecao ? `Coleção ${product.colecao}` : null,
    product.categoria ? CATEGORY_LABELS[product.categoria] : null,
  ].filter(Boolean).join("  ·  ");

  // Portal no <body>: o modal não depende de quem o abriu (uma seção com
  // transform, como o carrossel, quebraria o position: fixed).
  return createPortal(
    // Centralizado em todas as larguras, com margem de 16 px (ou a área
    // segura do iPhone, se for maior) em volta. Entra com fade e escala leve.
    <div
      className="joseph-modal-fundo fixed inset-0 z-50 flex items-center justify-center"
      style={{
        fontFamily: FONT_SANS,
        background: "rgba(51,51,51,0.55)",
        backdropFilter: "blur(6px)",
        paddingTop: "max(16px, env(safe-area-inset-top))",
        paddingRight: "max(16px, env(safe-area-inset-right))",
        paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        paddingLeft: "max(16px, env(safe-area-inset-left))",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.nome}
        data-testid="product-modal"
        className="joseph-modal-caixa relative flex max-h-full w-full max-w-[480px] flex-col overflow-hidden rounded-[22px] bg-white md:h-[min(100%,88vh)] md:max-w-[min(90vw,1160px)] md:flex-row md:rounded-[26px]"
        style={{ boxShadow: "0 30px 80px rgba(51,51,51,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full transition hover:opacity-70"
          style={{ color: C.brown, background: "rgba(246,241,236,0.92)", border: "none", cursor: "pointer" }}
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Galeria ───────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-col md:w-[54%] md:shrink" style={{ background: FUNDO_FOTO }}>
          <div
            data-testid="gallery-frame"
            className="group relative mx-auto aspect-[4/5] max-h-[46dvh] w-full md:mx-0 md:aspect-auto md:max-h-none md:min-h-0 md:flex-1"
          >
            {imagens.length > 0 ? (
              <div
                ref={trilho}
                onScroll={aoRolarTrilho}
                className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {imagens.map((url, i) => (
                  <div key={url} className="relative h-full w-full shrink-0 snap-center">
                    <img
                      src={url}
                      alt={i === 0 ? nomeItem : ""}
                      draggable={false}
                      decoding="async"
                      loading={i === 0 ? "eager" : "lazy"}
                      data-testid="gallery-image"
                      className="absolute inset-0 h-full w-full object-contain p-2 md:p-4"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="text-[10px] font-light uppercase tracking-widest" style={{ color: C.roseDark }}>Peça</span>
              </div>
            )}

            {product.promocao && (
              <div className="absolute left-3 top-3 rounded-full px-3 py-1 text-[9px] font-light uppercase tracking-widest"
                style={{ color: C.brown, background: C.rose }}>
                Destaque
              </div>
            )}

            {imagens.length > 1 && (
              <>
                <button onClick={() => irPara(idx - 1)} aria-label="Foto anterior" className={`${setaCls} left-3`} style={setaStyle}>
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => irPara(idx + 1)} aria-label="Próxima foto" className={`${setaCls} right-3`} style={setaStyle}>
                  <ChevronRight className="h-4 w-4" />
                </button>
                {/* pontos (celular) */}
                <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden" data-testid="gallery-dots">
                  {imagens.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      aria-label={`Foto ${i + 1}`}
                      onClick={() => irPara(i)}
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: i === idx ? 16 : 6, background: i === idx ? C.brown : "rgba(51,51,51,0.25)", border: "none", padding: 0 }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* miniaturas (desktop) */}
          {imagens.length > 1 && (
            <div className="hidden shrink-0 gap-2 overflow-x-auto px-4 pb-4 pt-1 md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {imagens.map((url, i) => (
                <button key={url} onClick={() => irPara(i)} aria-label={`Foto ${i + 1}`}
                  className="h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-white transition"
                  style={{ border: `2px solid ${i === idx ? C.brown : "transparent"}`, cursor: "pointer", padding: 0 }}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Informações ───────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col md:w-[46%]">
          {/* celular: tudo rola aqui; desktop: não rola, só a descrição */}
          <div data-testid="info-area" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-3 pt-4 md:overflow-hidden md:px-8 md:pt-8">
            <div className="shrink-0">
              {linhaTopo && (
                <p className="mb-2 pr-10 text-[9px] font-light uppercase tracking-[0.4em]" style={{ color: C.roseDark }}>
                  {linhaTopo}
                </p>
              )}
              <h2 data-testid="product-name" className="pr-8 text-xl font-light leading-tight md:text-[1.7rem]" style={{ color: C.brown, fontFamily: FONT_SERIF, letterSpacing: "-0.01em" }}>
                {nomeItem}
              </h2>

              <div className="mt-2 flex items-baseline gap-3">
                <span data-testid="product-price" className="text-xl font-light tabular-nums" style={{ color: C.brown, fontFamily: FONT_SERIF }}>
                  {formatarPreco(preco)}
                </span>
                {codigo && (
                  <span data-testid="product-code" className="text-[10px] font-light tracking-[0.08em]" style={{ color: C.muted }}>
                    Cód. {codigo}
                  </span>
                )}
              </div>
            </div>

            {variacoes.length > 1 && (
              <div className="mt-5 shrink-0">
                <p className="mb-2 text-[9px] font-light uppercase tracking-[0.35em]" style={{ color: C.muted }}>
                  Opções <span style={{ color: C.brown }}>({variacoes.length})</span>
                </p>
                <div
                  className={`grid gap-1.5 ${variacoes.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 xl:grid-cols-3"}`}
                  role="radiogroup"
                  aria-label="Escolha a opção"
                >
                  {variacoes.map((v) => {
                    const sel = v.id === variacaoId;
                    const precoV = precoEfetivo(product, v);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="radio"
                        aria-checked={sel}
                        title={v.nome}
                        data-testid="variation-option"
                        onClick={() => escolher(v.id)}
                        className="flex h-full min-w-0 items-center gap-2 rounded-xl p-1 pr-2 text-left text-[10.5px] leading-tight transition"
                        style={{
                          border: `1px solid ${sel ? C.brown : C.warmBeige2}`,
                          background: sel ? C.warmSurface : C.white,
                          color: C.brown,
                          cursor: "pointer",
                        }}
                      >
                        <span className="h-9 w-8 shrink-0 overflow-hidden rounded-lg" style={{ background: FUNDO_FOTO }}>
                          {v.imagens[0] && (
                            <img src={v.imagens[0].url} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="line-clamp-3">{v.nome}</span>
                          {precoV !== preco && (
                            <span className="block tabular-nums" style={{ color: C.muted }}>{formatarPreco(precoV)}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {descricao && (
              <div className="relative mt-5 md:min-h-0 md:flex-1">
                <p
                  ref={descRef}
                  onScroll={medirDescricao}
                  data-testid="product-description"
                  tabIndex={temMaisTexto ? 0 : undefined}
                  className="whitespace-pre-line rounded-sm text-sm font-light leading-relaxed md:h-full md:overflow-y-auto md:pr-2 md:[scrollbar-width:thin]"
                  style={{ color: "#6F6762" }}
                >
                  {descricao}
                </p>
                {/* indica que há mais texto para rolar (só no desktop, onde só a descrição rola) */}
                <div
                  aria-hidden="true"
                  data-testid="desc-fade"
                  className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-10 transition-opacity duration-200 md:block"
                  style={{ opacity: temMaisTexto ? 1 : 0, background: "linear-gradient(to bottom, rgba(255,255,255,0), #fff)" }}
                />
              </div>
            )}
          </div>

          {/* ── Ações (sempre visíveis) ── */}
          <div className="shrink-0 px-5 pb-4 pt-3 md:px-8 md:pb-7" style={{ borderTop: `1px solid ${C.bege3}` }}>
            <div className="flex items-stretch gap-2">
              <div className="flex items-center rounded-full" style={{ border: `1px solid ${C.warmBeige2}` }}>
                <button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                  className="flex h-full w-9 items-center justify-center rounded-full transition hover:opacity-60"
                  style={{ color: C.brown, background: "none", border: "none", cursor: "pointer" }}>
                  <Minus className="h-3 w-3" />
                </button>
                <span data-testid="product-qty" className="w-6 text-center text-sm tabular-nums" style={{ color: C.brown }}>{quantidade}</span>
                <button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantidade((q) => Math.min(99, q + 1))}
                  className="flex h-full w-9 items-center justify-center rounded-full transition hover:opacity-60"
                  style={{ color: C.brown, background: "none", border: "none", cursor: "pointer" }}>
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <button
                type="button"
                data-testid="add-to-cart"
                onClick={adicionarNaSacola}
                className="flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-[10px] font-medium uppercase tracking-[0.3em] transition hover:opacity-85"
                style={{ background: `linear-gradient(135deg, ${C.brown} 0%, #4B403D 100%)`, color: C.white, border: "none", cursor: "pointer" }}
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Adicionar à sacola
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
