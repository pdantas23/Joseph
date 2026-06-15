import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { listProducts } from "@/features/catalog/catalogApi";
import type { Product } from "@/features/catalog/catalogTypes";
import { PRODUCT_CATEGORIES, CATEGORY_LABELS } from "@/features/catalog/catalogTypes";
import { X, ChevronLeft, ChevronRight, ChevronDown, Search, SlidersHorizontal, Gift, CreditCard, Truck, QrCode } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatPrice } from "@/lib/utils";

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

export default function Catalog() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const produtoIdParam = new URLSearchParams(searchString).get("produto");

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState<string>("");
  const [filterPromo, setFilterPromo] = useState(false);
  const [filterPrecoMin, setFilterPrecoMin] = useState("");
  const [filterPrecoMax, setFilterPrecoMax] = useState("");
  const [categoriaOpen, setCategoriaOpen] = useState(false);

  const [selected, setSelected] = useState<Product | null>(null);
  const [galleryIdx, setGalleryIdx] = useState(0);

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

    const produto = products.find((p) => String(p.id) === produtoIdParam);
    if (produto) {
      setSelected(produto);
      setGalleryIdx(0);
    }
  }, [produtoIdParam, products]);

  function applyFilters(items: Product[]) {
    return items.filter((p) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!p.nome.toLowerCase().includes(s)) return false;
      }

      if (filterCategoria && p.categoria !== filterCategoria) return false;
      if (filterPromo && !p.promocao) return false;
      if (filterPrecoMin && p.preco < parseFloat(filterPrecoMin)) return false;
      if (filterPrecoMax && p.preco > parseFloat(filterPrecoMax)) return false;

      return true;
    });
  }

  const filtered = applyFilters(products);

  function openModal(product: Product) {
    setSelected(product);
    setGalleryIdx(0);
  }

  function closeModal() {
    setSelected(null);
    setGalleryIdx(0);
  }

  const allImages = selected
    ? [
        ...(selected.imagem_url ? [selected.imagem_url] : []),
        ...(selected.imagens ?? []).map((i) => i.url),
      ]
    : [];

  function prevImg() {
    setGalleryIdx((i) => (i === 0 ? allImages.length - 1 : i - 1));
  }

  function nextImg() {
    setGalleryIdx((i) => (i === allImages.length - 1 ? 0 : i + 1));
  }

  useEffect(() => {
    if (!selected) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") prevImg();
      if (e.key === "ArrowRight") nextImg();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, galleryIdx, allImages.length]);

  function buildWhatsAppUrl(product: Product): string {
    const phone = (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "";
    const number = phone.replace(/\D/g, "");

    let message = `Olá! Tenho interesse na peça *${product.nome}*. Pode me passar mais informações?`;

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function clearFilters() {
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
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30"
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
      <main className="flex-1 px-4 sm:px-6 py-10 mx-auto w-full max-w-6xl">
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

            <div className="relative shrink-0">
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
                    className="px-4 py-3 border-b flex items-center justify-between"
                    style={{ borderColor: C.bege3 }}
                  >
                    <span
                      className="text-[9px] tracking-[0.35em] uppercase font-light"
                      style={{ color: C.bege1 }}
                    >
                      Filtros
                    </span>

                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-[9px] font-light tracking-[0.3em] uppercase transition hover:opacity-50"
                        style={{
                          color: C.brown,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Limpar
                      </button>
                    )}
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

                    <div className="w-full">
                      <label
                        className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2"
                        style={{ color: C.bege1 }}
                      >
                        Preço mín.
                      </label>

                      <input
                        type="number"
                        value={filterPrecoMin}
                        onChange={(e) => setFilterPrecoMin(e.target.value)}
                        placeholder="R$ 0"
                        className="w-full h-[38px] px-3 text-xs font-light outline-none"
                        style={{
                          border: `1px solid ${C.bege3}`,
                          background: C.offwhite,
                          color: C.brown,
                          borderRadius: "1px",
                        }}
                      />
                    </div>

                    <div className="w-full">
                      <label
                        className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2"
                        style={{ color: C.bege1 }}
                      >
                        Preço máx.
                      </label>

                      <input
                        type="number"
                        value={filterPrecoMax}
                        onChange={(e) => setFilterPrecoMax(e.target.value)}
                        placeholder="Sem limite"
                        className="w-full h-[38px] px-3 text-xs font-light outline-none"
                        style={{
                          border: `1px solid ${C.bege3}`,
                          background: C.offwhite,
                          color: C.brown,
                          borderRadius: "1px",
                        }}
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
                          className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2"
                          style={{ color: C.bege1 }}
                        >
                          Preço mín.
                        </label>

                        <input
                          type="number"
                          value={filterPrecoMin}
                          onChange={(e) => setFilterPrecoMin(e.target.value)}
                          placeholder="R$ 0"
                          className="w-full h-[40px] px-3 text-xs font-light outline-none"
                          style={{
                            border: `1px solid ${C.bege3}`,
                            background: C.offwhite,
                            color: C.brown,
                            borderRadius: "1px",
                          }}
                        />
                      </div>

                      <div className="w-full">
                        <label
                          className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2"
                          style={{ color: C.bege1 }}
                        >
                          Preço máx.
                        </label>

                        <input
                          type="number"
                          value={filterPrecoMax}
                          onChange={(e) => setFilterPrecoMax(e.target.value)}
                          placeholder="Sem limite"
                          className="w-full h-[40px] px-3 text-xs font-light outline-none"
                          style={{
                            border: `1px solid ${C.bege3}`,
                            background: C.offwhite,
                            color: C.brown,
                            borderRadius: "1px",
                          }}
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
            {filtered.map((product) => (
              <div
                key={product.id}
                onClick={() => openModal(product)}
                className="group relative flex flex-col cursor-pointer"
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

                <div className="p-3 border-t" style={{ borderColor: C.bege3 }}>
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

                  <p
                    className="text-xs font-light"
                    style={{ color: product.promocao ? C.roseDark : C.bege1 }}
                  >
                    R$ {formatPrice(product.preco)}
                  </p>
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
                  style={{ backgroundColor: C.brown }}
                />
              </div>
            ))}
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

      {/* ── MODAL ───────────────────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-[900px] max-h-[90vh] overflow-y-auto bg-white"
            style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center transition hover:opacity-50"
              style={{
                color: C.brown,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex justify-center pt-3 sm:hidden">
              <div className="h-px w-8" style={{ backgroundColor: C.bege3 }} />
            </div>

            <div
              className="relative overflow-hidden group"
              style={{ aspectRatio: "4/3", backgroundColor: C.offwhite }}
            >
              {allImages.length > 0 ? (
                <img
                  src={allImages[galleryIdx]}
                  alt={selected.nome}
                  className="w-full h-full object-contain transition-opacity duration-200"
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

              {selected.promocao && (
                <div
                  className="absolute top-3 left-3 text-[9px] font-light tracking-widest uppercase"
                  style={{
                    color: C.roseDark,
                    background: C.rose,
                    padding: "2px 8px",
                  }}
                >
                  Destaque
                </div>
              )}

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImg}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center transition opacity-0 group-hover:opacity-100"
                    style={{
                      background: "rgba(255,255,255,0.88)",
                      color: C.brown,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <button
                    onClick={nextImg}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center transition opacity-0 group-hover:opacity-100"
                    style={{
                      background: "rgba(255,255,255,0.88)",
                      color: C.brown,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <div
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-light"
                    style={{
                      color: C.white,
                      background: "rgba(0,0,0,0.35)",
                      padding: "1px 8px",
                    }}
                  >
                    {galleryIdx + 1} / {allImages.length}
                  </div>
                </>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 pt-3 pb-1">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIdx(i)}
                    className="h-14 w-14 shrink-0 overflow-hidden transition"
                    style={{
                      border: `2px solid ${i === galleryIdx ? C.brown : "transparent"}`,
                      cursor: "pointer",
                      background: "none",
                    }}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="px-6 pt-5 pb-7">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div className="flex-1">
                  {selected.categoria && (
                    <p
                      className="text-[9px] tracking-[0.4em] uppercase font-light mb-2"
                      style={{ color: C.bege1 }}
                    >
                      {CATEGORY_LABELS[selected.categoria]}
                    </p>
                  )}

                  <h2
                    className="text-lg font-light leading-tight"
                    style={{ color: C.brown, fontFamily: "'Georgia', serif" }}
                  >
                    {selected.nome}
                  </h2>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className="text-xl font-light tabular-nums"
                    style={{
                      color: selected.promocao ? C.roseDark : C.brown,
                      fontFamily: "'Georgia', serif",
                    }}
                  >
                    R$ {formatPrice(selected.preco)}
                  </span>
                </div>
              </div>

              {selected.descricao && (
                <p className="text-sm font-light leading-relaxed mt-3" style={{ color: C.bege1 }}>
                  {selected.descricao}
                </p>
              )}

              <div className="my-5 h-px" style={{ backgroundColor: C.bege3 }} />

              <a
                href={buildWhatsAppUrl(selected)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2.5 py-3.5 text-[11px] font-medium tracking-[0.3em] uppercase transition hover:opacity-80"
                style={{ backgroundColor: C.brown, color: C.white }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Solicitar informações
              </a>

              <p className="mt-2.5 text-center text-[10px] font-light" style={{ color: C.bege2 }}>
                Você será direcionado ao WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}