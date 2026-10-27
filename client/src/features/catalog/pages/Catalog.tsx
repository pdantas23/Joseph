import { useEffect, useMemo, useRef, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { useLocation, useSearch } from "wouter";
import { listProducts } from "@/features/catalog/catalogApi";
import type { Product } from "@/features/catalog/catalogTypes";
import { PRODUCT_CATEGORIES, CATEGORY_LABELS } from "@/features/catalog/catalogTypes";
import { X, ChevronLeft, ChevronDown, Search, SlidersHorizontal, Gift, CreditCard, Truck, QrCode } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SiteNav from "@/components/SiteNav";
import ProductModal from "@/features/catalog/components/ProductModal";
import { FOCO_CARD, propsCardClicavel } from "@/lib/cardClicavel";
import { useRegistrarOverlay } from "@/contexts/OverlayContext";
import { faixaDePreco, formatarPreco, variacoesVisiveis } from "@/features/catalog/variantUtils";

// ─── Brand palette ────────────────────────────────────────────────────────────
const C = {
  brown: "#333333",
  bege1: "#B3B3B3",
  bege2: "#CCCCCC",
  bege3: "#E6E6E6",
  offwhite: "#F2F2F2",
  white: "#FFFFFF",
  rose: "#E8D5D0",
  roseDark: "#C9A89E",
} as const;

// ─── Banner promocional ─────────────────────────────────────────────────────────
const PROMO_ITEMS = [
  { icon: Gift, title: "10% OFF na primeira compra" },
  { icon: CreditCard, title: "Parcele em até 4x sem juros" },
  { icon: Truck, title: "Envios para todo o Brasil" },
  { icon: QrCode, title: "5% OFF no Pix" },
] as const;

// ─── Slider de faixa de preço (dual-thumb, paleta da marca) ─────────────────────
function PriceRangeSlider({
  lo,
  hi,
  ceil,
  step,
  onChange,
}: {
  lo: number;
  hi: number;
  ceil: number;
  step: number;
  onChange: (lo: number, hi: number) => void;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-light tabular-nums" style={{ color: C.brown }}>
          {formatarPreco(lo)}
        </span>
        <span className="text-xs font-light tabular-nums" style={{ color: C.brown }}>
          {hi >= ceil ? "Sem limite" : formatarPreco(hi)}
        </span>
      </div>

      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center py-2"
        min={0}
        max={ceil}
        step={step}
        value={[lo, hi]}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => onChange(v[0], v[1])}
      >
        <SliderPrimitive.Track
          className="relative h-1 w-full grow rounded-full"
          style={{ backgroundColor: C.bege3 }}
        >
          <SliderPrimitive.Range
            className="absolute h-full rounded-full"
            style={{ backgroundColor: C.roseDark }}
          />
        </SliderPrimitive.Track>
        {[0, 1].map((i) => (
          <SliderPrimitive.Thumb
            key={i}
            aria-label={i === 0 ? "Preço mínimo" : "Preço máximo"}
            className="block h-4 w-4 rounded-full border-2 bg-white shadow-sm outline-none transition hover:scale-110 focus-visible:ring-2"
            style={{ borderColor: C.roseDark }}
          />
        ))}
      </SliderPrimitive.Root>
    </div>
  );
}

export default function Catalog() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const produtoIdParam = params.get("produto");
  const variacaoParam = params.get("variacao");
  const categoriaParam = params.get("categoria") ?? "";

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  // Filters
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState<string>("");
  const [filterPromo, setFilterPromo] = useState(false);
  const [filterPrecoMin, setFilterPrecoMin] = useState("");
  const [filterPrecoMax, setFilterPrecoMax] = useState("");
  const [categoriaOpen, setCategoriaOpen] = useState(false);

  const [selected, setSelected] = useState<Product | null>(null);
  useRegistrarOverlay(isMobileFiltersOpen); // o modal de filtros cobre a tela

  // A barra do topo leva a /catalogo?categoria=...; o filtro acompanha a URL.
  useEffect(() => {
    const valida = (PRODUCT_CATEGORIES as readonly string[]).includes(categoriaParam);
    setFilterCategoria(valida ? categoriaParam : "");
  }, [categoriaParam]);

  // Banner promocional (popup em dropdown que surge após 1s)
  const [promoVisible, setPromoVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPromoVisible(true), 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const result = await listProducts({ ativo: true });
        setProducts(result.data);
      } catch (err) {
        console.error("Erro ao carregar catálogo:", err);
        setError("Não foi possível carregar os produtos.");
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!produtoIdParam || products.length === 0) return;

    const produto = products.find((p) => String(p.id) === produtoIdParam || p.slug === produtoIdParam);
    if (produto) setSelected(produto);
  }, [produtoIdParam, products]);

  function applyFilters(items: Product[]) {
    return items.filter((p) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const alvo = [p.nome, p.colecao, ...variacoesVisiveis(p).map((v) => v.nome)]
          .filter(Boolean).join(" ").toLowerCase();
        if (!alvo.includes(s)) return false;
      }

      if (filterCategoria && p.categoria !== filterCategoria) return false;
      if (filterPromo && !p.promocao) return false;
      const faixa = faixaDePreco(p);
      if (filterPrecoMin && faixa.max < parseFloat(filterPrecoMin)) return false;
      if (filterPrecoMax && faixa.min > parseFloat(filterPrecoMax)) return false;

      return true;
    });
  }

  const filtered = applyFilters(products);

  // Faixa de preço (slider): teto dinâmico baseado no produto mais caro
  const priceCeil = useMemo(() => {
    const maxP = products.reduce((m, p) => Math.max(m, faixaDePreco(p).max), 0);
    if (maxP <= 0) return 1000;
    const step = maxP > 1000 ? 100 : 50;
    return Math.max(step, Math.ceil(maxP / step) * step);
  }, [products]);

  const priceStep = priceCeil > 1000 ? 10 : 5;
  const precoLo = Math.min(Math.max(filterPrecoMin ? Number(filterPrecoMin) : 0, 0), priceCeil);
  const precoHi = Math.min(filterPrecoMax ? Number(filterPrecoMax) : priceCeil, priceCeil);

  function handlePriceChange(lo: number, hi: number) {
    // lo no mínimo (0) ou hi no teto → limpa o filtro correspondente
    setFilterPrecoMin(lo <= 0 ? "" : String(lo));
    setFilterPrecoMax(hi >= priceCeil ? "" : String(hi));
  }

  function setQuery(next: Record<string, string | null>) {
    const q = new URLSearchParams(searchString);
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v); else q.delete(k);
    }
    const qs = q.toString();
    setLocation(qs ? `/catalogo?${qs}` : "/catalogo", { replace: true });
  }

  function openModal(product: Product) {
    setSelected(product);
    setQuery({ produto: product.slug ?? product.id, variacao: null });
  }

  function closeModal() {
    setSelected(null);
    setQuery({ produto: null, variacao: null });
  }

  // Bloqueia o scroll do fundo enquanto o modal de filtros estiver aberto
  // (o modal do produto trava sozinho).
  useEffect(() => {
    if (!isMobileFiltersOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isMobileFiltersOpen]);

  // Fecha o dropdown de filtros (desktop) ao clicar fora dele
  useEffect(() => {
    if (!showFilters) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Element;
      // Ignora cliques no popover de categoria (renderizado em portal pelo Radix)
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      if (filtersRef.current && !filtersRef.current.contains(target)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showFilters]);

  function clearFilters() {
    if (categoriaParam) setQuery({ categoria: null });
    setFilterCategoria("");
    setFilterPromo(false);
    setFilterPrecoMin("");
    setFilterPrecoMax("");
    setSearch("");
  }

  const hasActiveFilters =
    !!filterCategoria ||
    filterPromo ||
    !!filterPrecoMin ||
    !!filterPrecoMax ||
    !!search.trim();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: C.offwhite,
        fontFamily: "'Fira Sans', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <SiteNav />

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      {/* A barra de categorias acima é que fica fixa; ao passar deste
          cabeçalho, o logo aparece nela (data-nav-hero). */}
      <header
        data-nav-hero
        className="relative z-30"
        style={{
          backgroundColor: "rgba(242,242,242,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.bege3}`,
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-1.5 text-[10px] font-light tracking-[0.3em] uppercase transition hover:opacity-50"
            style={{
              color: C.bege1,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ChevronLeft className="h-3 w-3" /> Início
          </button>

          <div className="flex flex-col items-center">
            <img
              src="/logo_joseph.png"
              alt="Joseph Atelier"
              className="h-12 object-contain"
            />
          </div>

          <div className="w-[72px]" />
        </div>
      </header>

      {/* ── BANNER PROMOCIONAL (dropdown) ───────────────────────────────── */}
      <div
        className="overflow-hidden"
        style={{
          maxHeight: promoVisible ? "240px" : "0px",
          opacity: promoVisible ? 1 : 0,
          transition: "max-height 1000ms ease-out, opacity 1000ms ease-out",
        }}
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-4">
          <div
            className="relative"
            style={{
              backgroundColor: C.rose,
              border: `1px solid ${C.bege3}`,
              borderRadius: "1px",
              transform: promoVisible ? "translateY(0)" : "translateY(-10px)",
              transition: "transform 1000ms ease-out",
              boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
            }}
          >
            <button
              type="button"
              onClick={() => setPromoVisible(false)}
              aria-label="Fechar banner"
              className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center transition hover:opacity-50"
              style={{ color: C.roseDark, background: "none", border: "none", cursor: "pointer" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="grid grid-cols-4">
              {PROMO_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center justify-start gap-2 px-2 py-5 text-center"
                >
                  <item.icon
                    className="h-5 w-5 sm:h-6 sm:w-6 shrink-0"
                    strokeWidth={1.5}
                    style={{ color: C.roseDark }}
                  />
                  <span
                    className="text-[8px] sm:text-[10px] font-light tracking-[0.12em] uppercase leading-tight"
                    style={{ color: C.brown }}
                  >
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 pt-4 pb-10 mx-auto w-full max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex w-full flex-row items-end gap-3">

            <div className="flex-1 min-w-0">
              <label
                className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2"
                style={{ color: C.bege1 }}
              >
                Buscar por nome
              </label>

              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3"
                  style={{ color: C.bege2 }}
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nome da peça"
                  className="w-full h-[38px] pl-8 pr-14 text-xs font-light outline-none transition"
                  style={{
                    border: `1px solid ${C.bege3}`,
                    background: C.white,
                    color: C.brown,
                    borderRadius: "1px",
                  }}
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-light tracking-[0.2em] uppercase transition hover:opacity-50"
                    style={{ color: C.bege1, background: "none", border: "none", cursor: "pointer" }}>
                    Limpar
                  </button>
                )}
              </div>
            </div>

            <div className="relative shrink-0" ref={filtersRef}>
              <button
                onClick={() => {
                  if (window.innerWidth < 768) {
                    setShowFilters(false);
                    setCategoriaOpen(false);
                    setIsMobileFiltersOpen(true);
                  } else {
                    setIsMobileFiltersOpen(false);
                    setShowFilters((f) => !f);
                  }
                }}
                className="flex h-[38px] items-center justify-center gap-2 px-4 text-[10px] font-light tracking-[0.3em] uppercase transition hover:opacity-50"
                style={{
                  color: hasActiveFilters ? C.brown : C.bege1,
                  backgroundColor: C.white,
                  border: `1px solid ${C.bege3}`,
                  cursor: "pointer",
                }}
              >
                <SlidersHorizontal className="h-3 w-3" />
                {hasActiveFilters ? "Filtros ativos" : "Filtros"}
              </button>

              {showFilters && (
                <div
                  className="absolute right-0 top-[calc(100%+10px)] z-30 hidden md:block w-[520px]"
                  style={{
                    backgroundColor: C.white,
                    border: `1px solid ${C.bege3}`,
                    boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
                  }}
                >
                  <div
                    className="px-4 py-3 border-b flex items-center"
                    style={{ borderColor: C.bege3 }}
                  >
                    <span
                      className="text-[9px] tracking-[0.35em] uppercase font-light"
                      style={{ color: C.bege1 }}
                    >
                      Filtros
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
                    <div className="w-full">
                      <label
                        className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2"
                        style={{ color: C.bege1 }}
                      >
                        Categoria
                      </label>

                      <Popover open={categoriaOpen} onOpenChange={setCategoriaOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full h-[38px] px-3 text-xs font-light flex items-center justify-between gap-2 transition outline-none"
                            style={{
                              border: `1px solid ${categoriaOpen ? C.brown : C.bege3}`,
                              background: C.offwhite,
                              color: filterCategoria ? C.brown : C.bege1,
                              borderRadius: "1px",
                              cursor: "pointer",
                            }}
                          >
                            <span className="truncate">
                              {filterCategoria
                                ? CATEGORY_LABELS[filterCategoria as keyof typeof CATEGORY_LABELS]
                                : "Todas"}
                            </span>
                            <ChevronDown
                              className="h-3.5 w-3.5 shrink-0 transition-transform"
                              style={{
                                color: C.bege1,
                                transform: categoriaOpen ? "rotate(180deg)" : "rotate(0deg)",
                              }}
                            />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="p-0 border-none shadow-none bg-transparent"
                          align="start"
                          side="bottom"
                          sideOffset={6}
                          avoidCollisions={false}
                          style={{ zIndex: 9999, width: "230px" }}
                        >
                          <div
                            className="bg-white overflow-hidden"
                            style={{
                              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
                              borderRadius: "1px",
                              border: `1px solid ${C.bege3}`,
                            }}
                          >
                            <div
                              className="px-4 py-2.5 bg-white"
                              style={{ borderBottom: `1px solid ${C.bege3}` }}
                            >
                              <p
                                className="text-[9px] tracking-[0.4em] uppercase font-light"
                                style={{ color: C.bege1 }}
                              >
                                Categoria
                              </p>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterCategoria("");
                                  setQuery({ categoria: null });
                                  setCategoriaOpen(false);
                                }}
                                className="w-full px-4 py-3 text-xs font-light text-left transition hover:opacity-60"
                                style={{
                                  color: filterCategoria === "" ? C.brown : C.bege1,
                                  backgroundColor: filterCategoria === "" ? C.offwhite : C.white,
                                  border: "none",
                                  cursor: "pointer",
                                  borderBottom: `1px solid ${C.bege3}`,
                                }}
                              >
                                Todas
                              </button>
                              {PRODUCT_CATEGORIES.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setFilterCategoria(cat);
                                    setQuery({ categoria: cat });
                                    setCategoriaOpen(false);
                                  }}
                                  className="w-full px-4 py-3 text-xs font-light text-left transition hover:opacity-60"
                                  style={{
                                    color: filterCategoria === cat ? C.brown : C.bege1,
                                    backgroundColor: filterCategoria === cat ? C.offwhite : C.white,
                                    border: "none",
                                    cursor: "pointer",
                                    borderBottom: `1px solid ${C.bege3}`,
                                  }}
                                >
                                  {CATEGORY_LABELS[cat]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="w-full sm:col-span-3">
                      <label
                        className="block text-[9px] tracking-[0.35em] uppercase font-light mb-3"
                        style={{ color: C.bege1 }}
                      >
                        Faixa de preço
                      </label>

                      <PriceRangeSlider
                        lo={precoLo}
                        hi={precoHi}
                        ceil={priceCeil}
                        step={priceStep}
                        onChange={handlePriceChange}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end px-4 pb-4">
                    <button
                      onClick={clearFilters}
                      className="h-[34px] px-4 text-[10px] tracking-[0.3em] uppercase transition hover:opacity-60"
                      style={{
                        border: `1px solid ${C.bege3}`,
                        background: C.white,
                        color: C.brown,
                      }}
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              )}

              {isMobileFiltersOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                  <div
                    className="absolute inset-0 bg-black/35"
                    onClick={() => setIsMobileFiltersOpen(false)}
                  />

                  <div className="absolute left-1/2 top-1/2 w-[90vw] max-w-[360px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <div
                      className="flex items-center justify-between border-b px-4 py-3"
                      style={{ borderColor: C.bege3 }}
                    >
                      <span
                        className="text-[10px] tracking-[0.35em] uppercase font-light"
                        style={{ color: C.bege1 }}
                      >
                        Filtros
                      </span>

                      <button
                        type="button"
                        onClick={() => setIsMobileFiltersOpen(false)}
                        className="text-[10px] font-light tracking-[0.3em] uppercase transition hover:opacity-50"
                        style={{
                          color: C.brown,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="max-h-[55vh] overflow-y-auto px-4 py-4 space-y-4">
                      <div className="w-full relative">
                        <label
                          className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2"
                          style={{ color: C.bege1 }}
                        >
                          Categoria
                        </label>

                        <button
                          type="button"
                          onClick={() => setCategoriaOpen((o) => !o)}
                          className="w-full h-[40px] px-3 text-xs font-light flex items-center justify-between gap-2"
                          style={{
                            border: `1px solid ${categoriaOpen ? C.brown : C.bege3}`,
                            background: C.offwhite,
                            color: filterCategoria ? C.brown : C.bege1,
                            borderRadius: "1px",
                            cursor: "pointer",
                          }}
                        >
                          <span className="truncate">
                            {filterCategoria
                              ? CATEGORY_LABELS[filterCategoria as keyof typeof CATEGORY_LABELS]
                              : "Todas"}
                          </span>

                          <ChevronDown
                            className="h-3.5 w-3.5 shrink-0 transition-transform"
                            style={{
                              color: C.bege1,
                              transform: categoriaOpen ? "rotate(180deg)" : "rotate(0deg)",
                            }}
                          />
                        </button>

                        {categoriaOpen && (
                          <div
                            className="absolute left-0 right-0 top-full z-30 max-h-[132px] overflow-y-auto"
                            style={{
                              border: `1px solid ${C.bege3}`,
                              borderTop: "none",
                              backgroundColor: C.white,
                              boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setFilterCategoria("");
                                setQuery({ categoria: null });
                                setCategoriaOpen(false);
                              }}
                              className="w-full px-3 py-3 text-sm font-light text-left transition hover:opacity-60"
                              style={{
                                color: filterCategoria === "" ? C.brown : C.bege1,
                                backgroundColor: filterCategoria === "" ? C.offwhite : C.white,
                                border: "none",
                                cursor: "pointer",
                                borderBottom: `1px solid ${C.bege3}`,
                              }}
                            >
                              Todas
                            </button>

                            {PRODUCT_CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setFilterCategoria(cat);
                                  setQuery({ categoria: cat });
                                  setCategoriaOpen(false);
                                }}
                                className="w-full px-3 py-3 text-sm font-light text-left transition hover:opacity-60"
                                style={{
                                  color: filterCategoria === cat ? C.brown : C.bege1,
                                  backgroundColor: filterCategoria === cat ? C.offwhite : C.white,
                                  border: "none",
                                  cursor: "pointer",
                                  borderBottom: `1px solid ${C.bege3}`,
                                }}
                              >
                                {CATEGORY_LABELS[cat]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="w-full">
                        <label
                          className="block text-[9px] tracking-[0.35em] uppercase font-light mb-3"
                          style={{ color: C.bege1 }}
                        >
                          Faixa de preço
                        </label>

                        <PriceRangeSlider
                          lo={precoLo}
                          hi={precoHi}
                          ceil={priceCeil}
                          step={priceStep}
                          onChange={handlePriceChange}
                        />
                      </div>
                    </div>

                    <div
                      className="flex justify-center p-4"
                      style={{ borderColor: C.bege3 }}
                    >
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="h-[40px] text-[10px] tracking-[0.3em] uppercase transition hover:opacity-60 p-3"
                        style={{
                          border: `1px solid ${C.bege3}`,
                          background: C.white,
                          color: C.brown,
                        }}
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <div
              className="h-6 w-6 rounded-full border border-t-transparent animate-spin"
              style={{ borderColor: C.bege2, borderTopColor: C.brown }}
            />
            <p
              className="text-[10px] tracking-[0.35em] uppercase font-light"
              style={{ color: C.bege1 }}
            >
              Carregando coleção...
            </p>
          </div>
        ) : error ? (
          <div className="py-32 text-center">
            <p className="text-xs font-light" style={{ color: C.bege1 }}>
              {error}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-32 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-px" style={{ backgroundColor: C.bege3 }} />
            <p className="text-xs font-light" style={{ color: C.bege1 }}>
              {hasActiveFilters
                ? "Nenhuma peça encontrada para esses filtros."
                : "Nenhuma peça disponível no momento."}
            </p>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[9px] tracking-[0.35em] uppercase font-light transition hover:opacity-50"
                style={{
                  color: C.brown,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((product) => {
              const opcoes = variacoesVisiveis(product).length;
              const faixa = faixaDePreco(product);
              return (
              <div
                key={product.id}
                data-testid="product-card"
                {...propsCardClicavel(() => openModal(product), `Ver ${product.nome}`)}
                className={`group relative flex flex-col cursor-pointer ${FOCO_CARD}`}
                style={{ background: C.white }}
              >
                {(product.imagens?.length ?? 0) > 0 && (
                  <div
                    className="absolute top-2 right-2 z-10 text-[9px] font-light"
                    style={{
                      color: C.white,
                      background: "rgba(0,0,0,0.35)",
                      padding: "2px 6px",
                      letterSpacing: "0.1em",
                    }}
                  >
                    +{(product.imagens?.length ?? 0) + 1}
                  </div>
                )}

                {product.promocao && (
                  <div
                    className="absolute top-2 left-2 z-10 text-[9px] font-light tracking-widest uppercase"
                    style={{
                      color: C.roseDark,
                      background: C.rose,
                      padding: "2px 8px",
                    }}
                  >
                    Destaque
                  </div>
                )}

                <div
                  className="overflow-hidden"
                  style={{ aspectRatio: "3/4", backgroundColor: C.offwhite }}
                >
                  {product.imagem_url ? (
                    <img
                      src={product.imagem_url}
                      alt={product.nome}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span
                        className="text-[10px] font-light tracking-widest uppercase"
                        style={{ color: C.bege2 }}
                      >
                        Peça
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t flex flex-col flex-1" style={{ borderColor: C.bege3 }}>
                  <p
                    className="text-xs font-light leading-snug mb-1.5 line-clamp-2"
                    style={{ color: C.brown }}
                  >
                    {product.nome}
                  </p>

                  {product.categoria && (
                    <p
                      className="text-[9px] tracking-[0.3em] uppercase font-light mb-1.5"
                      style={{ color: C.bege1 }}
                    >
                      {CATEGORY_LABELS[product.categoria]}
                    </p>
                  )}

                  <div className="mt-auto flex items-end justify-between gap-2">
                    <p
                      className="text-xs font-light"
                      style={{ color: product.promocao ? C.roseDark : "#7E756F" }}
                    >
                      {faixa.min !== faixa.max && (
                        <span className="block text-[9px]" style={{ color: C.bege1 }}>a partir de</span>
                      )}
                      {formatarPreco(faixa.min)}
                    </p>
                    {opcoes > 1 && (
                      <span data-testid="card-options" className="shrink-0 text-[9px] font-light tracking-[0.04em]" style={{ color: "#7E756F" }}>
                        {opcoes} opções
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  style={{ backgroundColor: C.brown }}
                />
              </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="py-8 text-center border-t mt-4" style={{ borderColor: C.bege3 }}>
        <p
          className="text-[9px] tracking-[0.4em] uppercase font-light"
          style={{ color: C.bege2 }}
        >
          © 2026 Joseph Atelier
        </p>
      </footer>

      {selected && (
        <ProductModal
          key={selected.id}
          product={selected}
          initialVariationId={variacaoParam}
          onClose={closeModal}
          onVariationChange={(id) => setQuery({ variacao: id })}
        />
      )}
    </div>
  );
}