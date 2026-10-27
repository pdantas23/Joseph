import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/features/catalog/catalogTypes";
import { carregarCatalogoPublico } from "@/features/catalog/catalogApi";
import { faixaDePreco, formatarPreco, variacoesVisiveis } from "@/features/catalog/variantUtils";
import { vitrinesVisiveis } from "@/features/catalog/vitrine";
import ProductModal from "@/features/catalog/components/ProductModal";
import { ITENS_POR_VITRINE, VITRINES, type Vitrine } from "@/config/vitrines";
import { C, FONT_SERIF } from "@/lib/josephTheme";
import { FOCO_CARD } from "@/lib/cardClicavel";

/*
 * Composição do bento (5 peças, fotos em pé):
 *   tablet e desktop (sm+, 4 colunas, 2 linhas)
 *     [ 0 grande 2x2 ][ 1 ][ 2 ]
 *     [              ][ 3 ][ 4 ]
 *   celular (2 colunas): o 0 ocupa a largura, depois os 4 em pares.
 * Os blocos pequenos têm proporção 3:4 (a das fotos) e definem a altura
 * das linhas; o grande ocupa as duas.
 */
const POSICAO: string[] = [
  "col-span-2 row-span-2 aspect-[3/4] sm:aspect-auto",
  "aspect-[3/4]",
  "aspect-[3/4]",
  "aspect-[3/4]",
  "aspect-[3/4]",
];

function Bloco({ product, indice, onOpen }: { product: Product; indice: number; onOpen: (p: Product) => void }) {
  const grande = indice === 0;
  const opcoes = variacoesVisiveis(product).length;
  const faixa = faixaDePreco(product);

  return (
    <button
      type="button"
      data-testid="bento-item"
      onClick={() => onOpen(product)}
      aria-label={`Ver ${product.nome}`}
      className={`group relative h-full w-full overflow-hidden rounded-[18px] text-left transition-[transform,box-shadow] duration-500 ease-out motion-safe:hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(51,51,51,0.12)] sm:rounded-[22px] ${FOCO_CARD} ${POSICAO[indice] ?? "aspect-[3/4]"}`}
      style={{
        background: C.warmBeige,
        border: `1px solid ${C.warmBeige}`,
        boxShadow: "0 10px 28px rgba(51,51,51,0.06)",
        cursor: "pointer",
      }}
    >
      {product.imagem_url ? (
        <img
          src={product.imagem_url}
          alt={product.nome}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 ease-out motion-safe:group-hover:scale-105"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest" style={{ color: C.roseDark }}>
          Peça
        </span>
      )}

      {product.promocao && (
        <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-light uppercase tracking-widest"
          style={{ background: C.rose, color: C.brown }}>
          Destaque
        </span>
      )}

      {/* etiqueta com as informações */}
      <span
        className={`absolute bottom-2.5 left-2.5 right-2.5 block rounded-2xl sm:bottom-3 sm:left-3 sm:right-3 ${grande ? "px-4 py-3 sm:px-5 sm:py-4" : "px-3 py-2"}`}
        style={{ background: "rgba(255,255,255,0.86)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      >
        <span
          className={`block truncate font-light leading-snug ${grande ? "text-lg sm:text-2xl" : "text-[12.5px] sm:text-sm xl:text-[15px]"}`}
          style={{ color: C.brown, fontFamily: FONT_SERIF }}
        >
          {product.nome}
        </span>
        <span className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className={`font-light tabular-nums ${grande ? "text-sm sm:text-base" : "text-[11.5px] sm:text-[13px]"}`} style={{ color: "#6F6762" }}>
            {faixa.min !== faixa.max && (
              <span className="mr-1 text-[9px] sm:text-[10px]" style={{ color: C.muted }}>a partir de</span>
            )}
            {formatarPreco(faixa.min)}
          </span>
          {opcoes > 1 && (
            <span data-testid="bento-options" className="shrink-0 text-[9px] font-light sm:text-[10px]" style={{ color: C.muted }}>
              {opcoes} opções
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function Secao({ vitrine, itens, onOpen }: { vitrine: Vitrine; itens: Product[]; onOpen: (p: Product) => void }) {
  return (
    <section
      data-testid={`vitrine-${vitrine.categoria}`}
      // Mesma largura do carrossel de destaques: cresce em telas grandes.
      className="relative left-1/2 w-full -translate-x-1/2 lg:w-[min(calc(100vw-48px),1240px)] 2xl:w-[min(calc(100vw-64px),1440px)]"
    >
      <div className="mb-8 text-center sm:mb-10">
        <p className="mb-3 text-[9px] font-light uppercase tracking-[0.5em]" style={{ color: C.roseDark }}>
          {vitrine.rotulo}
        </p>
        <h2 className="text-3xl font-light leading-tight sm:text-4xl" style={{ color: C.brown, fontFamily: FONT_SERIF, letterSpacing: "-0.02em" }}>
          {vitrine.titulo}
        </h2>
        <div className="mx-auto mt-5 h-px w-8" style={{ backgroundColor: C.warmBeige2 }} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:gap-4">
        {itens.map((p, i) => (
          <Bloco key={p.id} product={p} indice={i} onOpen={onOpen} />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href={`/catalogo?categoria=${encodeURIComponent(vitrine.categoria)}`}
          className="group inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.4em] transition hover:opacity-60"
          style={{ color: C.brown }}
        >
          {vitrine.linkTexto}
          <ArrowRight className="h-3 w-3 transition-transform motion-safe:group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}

export default function VitrinesBento() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [aberto, setAberto] = useState<Product | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarCatalogoPublico()
      .then((r) => { if (ativo) setProdutos(r.data); })
      .catch(() => { if (ativo) setProdutos([]); });
    return () => { ativo = false; };
  }, []);

  const secoes = vitrinesVisiveis(produtos, VITRINES, ITENS_POR_VITRINE);
  if (secoes.length === 0) return null;

  return (
    <>
      {secoes.map((s) => (
        <Secao key={s.vitrine.categoria} vitrine={s.vitrine} itens={s.itens} onOpen={setAberto} />
      ))}
      {aberto && <ProductModal key={aberto.id} product={aberto} onClose={() => setAberto(null)} />}
    </>
  );
}
