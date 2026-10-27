import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { carregarCatalogoPublico } from "@/features/catalog/catalogApi";
import { CATEGORY_LABELS, type Product } from "@/features/catalog/catalogTypes";
import ProductCard from "@/components/ProductCard";
import { faixaDePreco } from "@/features/catalog/variantUtils";
import { completarAte, selecionarDestaques, vitrinesVisiveis } from "@/features/catalog/vitrine";
import { DESTAQUES, ITENS_POR_VITRINE, VITRINES } from "@/config/vitrines";
import ProductModal from "@/features/catalog/components/ProductModal";
import { C } from "@/lib/josephTheme";

/**
 * Carrossel de destaques da Home: 4 cards em telas grandes, 3 no tablet e
 * 1,25 no celular (arrastando). As setas ficam em colunas próprias, fora
 * dos cards. Não repete as peças do bento logo abaixo.
 */
export default function DestaquesCarousel() {
  const [todos, setTodos] = useState<Product[]>([]);
  const [aberto, setAberto] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    carregarCatalogoPublico()
      .then((res) => setTodos(res.data))
      .catch(() => setTodos([]))
      .finally(() => setLoading(false));
  }, []);

  const products = useMemo(() => {
    const noBento = new Set(
      vitrinesVisiveis(todos, VITRINES, ITENS_POR_VITRINE).flatMap((s) => s.itens.map((p) => p.id))
    );
    const semRepetir = selecionarDestaques(todos, DESTAQUES.slugs, noBento, DESTAQUES.categorias, DESTAQUES.total);
    // Se o bento levou quase tudo, completa com peças dele: o carrossel nunca fica vazio.
    const todasAsPecas = selecionarDestaques(todos, DESTAQUES.slugs, new Set(), DESTAQUES.categorias, DESTAQUES.total);
    return completarAte(semRepetir, todasAsPecas, Math.min(DESTAQUES.minimo, todasAsPecas.length));
  }, [todos]);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    setCanScrollLeft(false);
    const t = setTimeout(updateScrollState, 60);
    window.addEventListener("resize", updateScrollState);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [products.length, updateScrollState]);

  function scrollByCards(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("[data-card]") as HTMLElement | null;
    if (!card) return;
    el.scrollBy({ left: card.offsetWidth * direction, behavior: "smooth" });
  }

  if (loading || products.length === 0) return null;

  // Com tudo cabendo na tela, as setas não aparecem.
  const temSetas = canScrollLeft || canScrollRight;

  const seta = (dir: 1 | -1, ativo: boolean) => (
    <button
      onClick={() => scrollByCards(dir)}
      disabled={!ativo}
      className="hidden h-11 w-11 shrink-0 items-center justify-center self-center rounded-full transition-all duration-200 sm:flex 2xl:h-12 2xl:w-12"
      style={{
        background: C.white,
        border: `1px solid ${C.warmBeige2}`,
        color: C.brown,
        opacity: ativo ? 1 : 0.35,
        cursor: ativo ? "pointer" : "default",
        boxShadow: ativo ? "0 8px 24px rgba(51,51,51,0.10)" : "none",
      }}
      aria-label={dir === -1 ? "Peça anterior" : "Próxima peça"}
    >
      {dir === -1 ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );

  return (
    // Em telas grandes o carrossel sai da coluna de 1024 px da Home e cresce
    // até 1440 px (centralizado), mantendo 4 cards: os cards ficam maiores.
    <section
      data-testid="destaques"
      className="relative left-1/2 w-full -translate-x-1/2 lg:w-[min(calc(100vw-48px),1240px)] 2xl:w-[min(calc(100vw-64px),1440px)]"
    >
      <div className="flex items-stretch gap-2 sm:gap-3 xl:gap-4">
        {temSetas && seta(-1, canScrollLeft)}

        <div
          ref={trackRef}
          onScroll={updateScrollState}
          className="-my-3 flex min-w-0 flex-1 overflow-x-auto scroll-smooth pb-6 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {products.map((product) => {
            const faixa = faixaDePreco(product);
            return (
              <div
                key={product.id}
                data-card
                className="w-4/5 flex-none px-2 sm:w-1/3 lg:w-1/4 2xl:px-2.5"
                style={{ scrollSnapAlign: "start" }}
              >
                <ProductCard
                  image={product.imagem_url || ""}
                  name={product.nome}
                  category={product.categoria ? CATEGORY_LABELS[product.categoria] : ""}
                  price={faixa.min}
                  priceFrom={faixa.min !== faixa.max}
                  isFeatured={product.promocao}
                  onClick={() => setAberto(product)}
                />
              </div>
            );
          })}
        </div>

        {temSetas && seta(1, canScrollRight)}
      </div>

      {aberto && <ProductModal key={aberto.id} product={aberto} onClose={() => setAberto(null)} />}
    </section>
  );
}
