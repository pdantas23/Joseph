import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/features/catalog/catalogTypes";
import { carregarCatalogoPublico } from "@/features/catalog/catalogApi";
import { CATEGORY_LABELS } from "@/features/catalog/catalogTypes";
import { descricaoEfetiva, faixaDePreco, formatarPreco, variacoesVisiveis } from "@/features/catalog/variantUtils";
import { vitrinesVisiveis, type LayoutVitrine } from "@/features/catalog/vitrine";
import ProductModal from "@/features/catalog/components/ProductModal";
import { ITENS_POR_VITRINE, VITRINES, type Vitrine } from "@/config/vitrines";
import { C, FONT_SERIF } from "@/lib/josephTheme";
import { FOCO_CARD, propsCardClicavel } from "@/lib/cardClicavel";

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

function Bloco({ product, indice, onOpen, classe }: { product: Product; indice: number; onOpen: (p: Product) => void; classe?: string }) {
  // Na grade (2 a 4 peças) todos os blocos são do mesmo tamanho (classe própria).
  const grande = indice === 0 && classe === undefined;
  const opcoes = variacoesVisiveis(product).length;
  const faixa = faixaDePreco(product);

  return (
    <button
      type="button"
      data-testid="bento-item"
      onClick={() => onOpen(product)}
      aria-label={`Ver ${product.nome}`}
      className={`group relative h-full w-full overflow-hidden rounded-[18px] text-left transition-[transform,box-shadow] duration-500 ease-out motion-safe:hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(51,51,51,0.12)] sm:rounded-[22px] ${FOCO_CARD} ${classe ?? POSICAO[indice] ?? "aspect-[3/4]"}`}
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

/** 1 peça: foto grande de um lado; nome, preço e botão do outro (empilhado no celular). */
function Destaque({ product, onOpen }: { product: Product; onOpen: (p: Product) => void }) {
  const faixa = faixaDePreco(product);
  const opcoes = variacoesVisiveis(product).length;
  const descricao = descricaoEfetiva(product, null);
  return (
    <div
      {...propsCardClicavel(() => onOpen(product), `Ver ${product.nome}`)}
      data-testid="vitrine-destaque"
      className={`group mx-auto grid w-full max-w-5xl cursor-pointer overflow-hidden rounded-[22px] text-left transition-[transform,box-shadow] duration-500 ease-out motion-safe:hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(51,51,51,0.12)] md:grid-cols-2 ${FOCO_CARD}`}
      style={{
        background: `linear-gradient(180deg, ${C.white} 0%, ${C.warmSurface} 100%)`,
        border: `1px solid ${C.warmBeige}`,
        boxShadow: "0 10px 28px rgba(51,51,51,0.06)",
      }}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden md:aspect-auto md:h-[min(78vh,620px)]" style={{ background: C.warmBeige }}>
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
      </div>
      <div className="flex flex-col justify-center gap-3 p-6 sm:p-10 lg:p-14">
        {product.categoria && (
          <p className="text-[9px] font-light uppercase tracking-[0.4em]" style={{ color: C.roseDark }}>
            {CATEGORY_LABELS[product.categoria]}
          </p>
        )}
        <p className="text-2xl font-light leading-tight sm:text-4xl" style={{ color: C.brown, fontFamily: FONT_SERIF, letterSpacing: "-0.01em" }}>
          {product.nome}
        </p>
        <p className="text-lg font-light tabular-nums" style={{ color: "#6F6762", fontFamily: FONT_SERIF }}>
          {faixa.min !== faixa.max && <span className="mr-1 text-xs" style={{ color: C.muted, fontFamily: "inherit" }}>a partir de</span>}
          {formatarPreco(faixa.min)}
          {opcoes > 1 && <span className="ml-3 text-xs" style={{ color: C.muted }}>{opcoes} opções</span>}
        </p>
        {descricao && (
          <p className="line-clamp-4 whitespace-pre-line text-sm font-light leading-relaxed" style={{ color: "#7E756F" }}>
            {descricao}
          </p>
        )}
        <span
          aria-hidden="true"
          className="mt-3 inline-flex items-center gap-2 self-start rounded-full px-7 py-3 text-[10px] font-medium uppercase tracking-[0.35em] transition-opacity group-hover:opacity-85"
          style={{ background: `linear-gradient(135deg, ${C.brown} 0%, #4B403D 100%)`, color: C.white }}
        >
          Ver peça <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}

// Grade (2 a 4 peças): cards do mesmo tamanho, em uma linha no desktop.
const COLUNAS_GRADE: Record<number, string> = {
  2: "grid-cols-2 max-w-3xl",
  3: "grid-cols-2 sm:grid-cols-3 max-w-5xl",
  4: "grid-cols-2 sm:grid-cols-4",
};

function Corpo({ layout, itens, onOpen }: { layout: LayoutVitrine; itens: Product[]; onOpen: (p: Product) => void }) {
  if (layout === "destaque") return <Destaque product={itens[0]} onOpen={onOpen} />;
  if (layout === "grade") {
    return (
      <div data-testid="vitrine-grade" className={`mx-auto grid w-full gap-2.5 sm:gap-3 lg:gap-4 ${COLUNAS_GRADE[itens.length] ?? COLUNAS_GRADE[4]}`}>
        {itens.map((p, i) => (
          <Bloco key={p.id} product={p} indice={i} onOpen={onOpen} classe="aspect-[3/4]" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:gap-4">
      {itens.map((p, i) => (
        <Bloco key={p.id} product={p} indice={i} onOpen={onOpen} />
      ))}
    </div>
  );
}

function Secao({ vitrine, itens, layout, onOpen }: { vitrine: Vitrine; itens: Product[]; layout: LayoutVitrine; onOpen: (p: Product) => void }) {
  return (
    <section
      data-testid={`vitrine-${vitrine.categoria}`}
      data-layout={layout}
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

      <Corpo layout={layout} itens={itens} onOpen={onOpen} />

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
        <Secao key={s.vitrine.categoria} vitrine={s.vitrine} itens={s.itens} layout={s.layout} onOpen={setAberto} />
      ))}
      {aberto && <ProductModal key={aberto.id} product={aberto} onClose={() => setAberto(null)} />}
    </>
  );
}
