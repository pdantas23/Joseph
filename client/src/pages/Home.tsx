import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { listProducts } from "@/features/catalog/catalogApi";
import type { Product } from "@/features/catalog/catalogTypes";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Instagram,
  Phone,
  MapPin,
  MessageCircle,
} from "lucide-react";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER;

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

  // apoio visual mais quente para a home
  warmBeige: "#E4DDD6",
  warmBeige2: "#D8CEC5",
  warmSurface: "#F6F1EC",
} as const;

// ─── Helpers de preload ───────────────────────────────────────────────────────
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (!src) {
      resolve();
      return;
    }

    const img = new Image();
    img.src = src;

    if (img.complete) {
      resolve();
      return;
    }

    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

async function preloadImages(urls: string[]) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  await Promise.all(uniqueUrls.map(preloadImage));
}

// ─── Infinite carousel ────────────────────────────────────────────────────────
const SLIDE_INTERVAL = 5500;
const SLIDE_MS = 600;

function SlideCarousel({
  count,
  renderSlide,
}: {
  count: number;
  renderSlide: (index: number) => React.ReactNode;
}) {
  const [position, setPosition] = useState(0);
  const [animated, setAnimated] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<number | null>(null);

  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);

  const totalCells = count + 1;

  const clearSliderInterval = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const advance = useCallback(() => {
    setAnimated(true);
    setPosition((p) => {
      if (p >= count) return 1;
      return p + 1;
    });
  }, [count]);

  const goBack = useCallback(() => {
    setAnimated(true);
    setPosition((p) => {
      if (p === 0) return count - 1;
      if (p > count) return count - 1;
      return p - 1;
    });
  }, [count]);

  function goTo(index: number) {
    setAnimated(true);
    setPosition(index);
  }

  function handleTransitionEnd() {
    if (position === count) {
      setAnimated(false);
      setPosition(0);
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    deltaX.current = e.touches[0].clientX - startX.current;
  }

  function handleTouchEnd() {
    if (startX.current === null) return;

    const threshold = 50;

    if (deltaX.current > threshold) {
      goBack();
    } else if (deltaX.current < -threshold) {
      advance();
    }

    startX.current = null;
    deltaX.current = 0;
  }

  useEffect(() => {
    if (!animated) {
      const id = requestAnimationFrame(() => setAnimated(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animated]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        setIsPaused(true);
        clearSliderInterval();
      } else {
        setIsPaused(false);
        setAnimated(false);
        setPosition((prev) => (prev >= count ? 0 : prev));
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [count, clearSliderInterval]);

  useEffect(() => {
    clearSliderInterval();

    if (count <= 1 || isPaused) return;

    intervalRef.current = window.setInterval(() => {
      advance();
    }, SLIDE_INTERVAL);

    return () => clearSliderInterval();
  }, [count, isPaused, advance, clearSliderInterval]);

  const activeDot = count > 0 ? position % count : 0;

  return (
    <div
      className="relative group rounded-[22px] w-full h-full"
      style={{
        overflow: "hidden",
        backgroundColor: C.warmSurface,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        onTransitionEnd={handleTransitionEnd}
        className="absolute inset-0 flex h-full"
        style={{
          width: `${totalCells * 100}%`,
          transform: `translateX(-${(position / totalCells) * 100}%)`,
          transition: animated
            ? `transform ${SLIDE_MS}ms cubic-bezier(0.4,0,0.2,1)`
            : "none",
          willChange: "transform",
        }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-full shrink-0"
            style={{ width: `${100 / totalCells}%` }}
          >
            {renderSlide(i)}
          </div>
        ))}

        <div
          className="h-full shrink-0"
          style={{ width: `${100 / totalCells}%` }}
        >
          {count > 0 ? renderSlide(0) : null}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            onClick={goBack}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center w-10 h-10 rounded-full opacity-0 group-hover:opacity-100 transition"
            style={{
              background: "rgba(255,255,255,0.14)",
              color: C.white,
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
            }}
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={advance}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center w-10 h-10 rounded-full opacity-0 group-hover:opacity-100 transition"
            style={{
              background: "rgba(255,255,255,0.14)",
              color: C.white,
              border: "1px solid rgba(255,255,255,0.18)",
              backdropFilter: "blur(8px)",
            }}
            aria-label="Próximo slide"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {Array.from({ length: count }).map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className="h-[3px] rounded-full transition-all duration-300"
                style={{
                  width: activeDot === i ? 26 : 14,
                  backgroundColor:
                    activeDot === i
                      ? "rgba(255,255,255,0.95)"
                      : "rgba(255,255,255,0.38)",
                  border: "none",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Fallback slides ──────────────────────────────────────────────────────────
const FALLBACK_SLIDES = [
  {
    headline: "A elegância\nda forma.",
    sub: "Peças pensadas para a mulher que valoriza o detalhe. Atelier de moda feminina em cada costura.",
    bg: `linear-gradient(135deg, ${C.warmBeige2} 0%, ${C.rose} 100%)`,
    accent: C.brown,
    cta: "Ver coleção",
    dark: false,
  },
  {
    headline: "Sofisticação\nsem exagero.",
    sub: "Edições limitadas, modelagens exclusivas. Cada peça é uma escolha consciente.",
    bg: `linear-gradient(135deg, ${C.brown} 0%, #5c4a46 100%)`,
    accent: C.rose,
    cta: "Explorar catálogo",
    dark: true,
  },
  {
    headline: "O cuidado\nestá no corte.",
    sub: "Joseph Atelier — onde o refinamento encontra o conforto.",
    bg: `linear-gradient(135deg, ${C.warmSurface} 0%, ${C.warmBeige} 100%)`,
    accent: C.brown,
    cta: "Conhecer a marca",
    dark: false,
  },
];

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [, setLocation] = useLocation();

  const [promos, setPromos] = useState<Product[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [homeReady, setHomeReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const loaded = homeReady;

  useEffect(() => {
    let active = true;

    async function loadHome() {
      try {
        const res = await listProducts({ ativo: true });
        const all = res.data;

        const nextPromos = all.filter((p) => p.promocao);
        const nextFeatured = all.slice(0, 4);

        const carouselImages =
          nextPromos.length > 0
            ? nextPromos.map((p) => p.imagem_url || "").filter(Boolean)
            : [];

        const featuredImages = nextFeatured
          .map((p) => p.imagem_url || "")
          .filter(Boolean);

        await preloadImages([...carouselImages, ...featuredImages]);

        if (!active) return;

        setPromos(nextPromos);
        setFeatured(nextFeatured);
        setHomeReady(true);
      } catch {
        if (!active) return;

        setPromos([]);
        setFeatured([]);
        setHomeReady(true);
      }
    }

    loadHome();

    return () => {
      active = false;
    };
  }, []);

  const hasPromos = promos.length > 0;
  const showLoadingOverlay = !loaded;

  function goWhatsApp() {
    const WHATSAPP_MESSAGE = encodeURIComponent(
      "Olá! Gostaria de um atendimento personalizado."
    );

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function renderPromoSlide(i: number) {
    const p = promos[i];

    return (
      <div
        className="relative w-full h-full overflow-hidden flex items-end sm:items-center"
        style={{
          background: `linear-gradient(135deg, ${C.warmBeige2} 0%, ${C.brown} 100%)`,
        }}
      >
        {p?.imagem_url && (
          <>
            {/* Fundo mobile */}
            <img
              src={p.imagem_url}
              alt={p.nome}
              className="absolute inset-0 w-full h-full object-cover sm:hidden"
            />

            {/* Fundo desktop */}
            <img
              src={p.imagem_url}
              alt={p.nome}
              className="absolute inset-0 hidden sm:block w-full h-full object-cover"
              style={{ opacity: 0.22 }}
            />
          </>
        )}

        {/* Overlay mobile */}
        <div
          className="absolute inset-0 sm:hidden"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.50) 100%)",
          }}
        />

        {/* Overlay desktop */}
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background: "linear-gradient(180deg, rgba(51,51,51,0.42) 0%, rgba(51,51,51,0.18) 100%)",
          }}
        />

        <div className="relative z-10 flex h-full w-full items-end sm:items-center px-6 sm:px-10 md:px-14 py-8 sm:py-10">
          <div className="flex flex-col justify-end gap-3 max-w-lg w-full">
            <span
              className="inline-block self-start text-[10px] font-light tracking-[0.35em] uppercase mb-1"
              style={{ color: C.rose }}
            >
              Peça em destaque
            </span>

            <p
              className="text-white font-light text-xl sm:text-3xl leading-snug"
              style={{
                fontFamily: "'Big Caslon', 'Georgia', 'Times New Roman', serif",
                letterSpacing: "-0.01em",
              }}
            >
              {p?.nome}
            </p>

            {p?.descricao && (
              <p className="text-white/80 text-xs sm:text-sm leading-relaxed max-w-xs font-light">
                {p.descricao}
              </p>
            )}

            <p
              className="font-light text-xl sm:text-2xl mt-1"
              style={{
                color: C.rose,
                fontFamily: "'Big Caslon', 'Georgia', serif",
              }}
            >
              R$ {p?.preco.toFixed(2).replace(".", ",")}
            </p>

            <button
              onClick={() => setLocation(`/catalogo?produto=${p?.id}`)}
              className="self-start mt-2 inline-flex items-center gap-2 px-5 py-2.5 text-[10px] font-medium tracking-widest uppercase transition hover:opacity-80 rounded-full"
              style={{
                background: "rgba(232,213,208,0.16)",
                color: C.white,
                border: "1px solid rgba(255,255,255,0.28)",
                backdropFilter: "blur(10px)",
              }}
            >
              Ver no catálogo <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {p?.imagem_url && (
          <div
            className="hidden sm:block absolute right-12 top-1/2 -translate-y-1/2 w-48 h-60 overflow-hidden rounded-[22px]"
            style={{
              backgroundColor: "rgba(255,255,255,0.10)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(8px)",
            }}
          >
            <img
              src={p.imagem_url}
              alt={p.nome}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    );
  }

  function renderFallbackSlide(i: number) {
    const slide = FALLBACK_SLIDES[i];
    const titleColor = slide.dark ? C.white : C.brown;
    const bodyColor = slide.dark ? "rgba(255,255,255,0.75)" : "#6F6762";

    return (
      <div
        className="relative w-full h-full overflow-hidden flex items-center px-6 sm:px-10 md:px-14 py-8"
        style={{ background: slide.bg }}
      >
        <div className="flex flex-col justify-center gap-3 max-w-md h-full">
          <span
            className="text-[10px] font-light tracking-[0.4em] uppercase mb-1"
            style={{ color: slide.accent }}
          >
            Joseph Atelier
          </span>

          <p
            className="font-light text-2xl sm:text-4xl leading-tight whitespace-pre-line"
            style={{
              color: titleColor,
              fontFamily: "'Big Caslon', 'Georgia', 'Times New Roman', serif",
              letterSpacing: "-0.02em",
            }}
          >
            {slide.headline}
          </p>

          <p
            className="text-xs sm:text-sm leading-relaxed max-w-xs font-light"
            style={{ color: bodyColor }}
          >
            {slide.sub}
          </p>

          <button
            onClick={() => setLocation("/catalogo")}
            className="self-start mt-3 inline-flex items-center gap-2 px-5 py-2.5 text-[10px] font-medium tracking-widest uppercase transition hover:opacity-80 rounded-full"
            style={{
              background: slide.dark ? "transparent" : "rgba(255,255,255,0.35)",
              color: titleColor,
              border: slide.dark
                ? `1px solid ${slide.accent}60`
                : `1px solid rgba(51,51,51,0.12)`,
            }}
          >
            {slide.cta} <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showLoadingOverlay && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center"
          style={{
            background: `linear-gradient(180deg, ${C.warmSurface} 0%, ${C.offwhite} 100%)`,
          }}
        >
          <p
            className="text-sm tracking-widest uppercase animate-pulse"
            style={{ color: C.brown }}
          >
            Carregando...
          </p>
        </div>
      )}

      <div
        className="min-h-screen flex flex-col"
        style={{
          background: `linear-gradient(180deg, ${C.warmSurface} 0%, ${C.offwhite} 100%)`,
          fontFamily: "'Fira Sans', 'Helvetica Neue', Arial, sans-serif",
        }}
      >
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <header
          className="w-full flex flex-col items-center py-5 sm:py-5 px-6"
          style={{
            background: `linear-gradient(180deg, ${C.white} 0%, ${C.warmSurface} 100%)`,
            borderBottom: `1px solid ${C.bege3}`,
          }}
        >
          <img
            src="/logo_joseph.png"
            alt="Joseph Atelier"
            className="h-12 w-auto mb-2 object-contain"
          />

          <h1
            className="text-4xl sm:text-6xl md:text-7xl font-light text-center leading-tight mb-6"
            style={{
              color: C.brown,
              fontFamily: "'Big Caslon', 'Georgia', 'Times New Roman', serif",
              letterSpacing: "-0.02em",
              maxWidth: "700px",
            }}
          >
            Elegância é um estado
            <br />
            <span style={{ fontStyle: "italic", color: "#857B74" }}>
              de presença.
            </span>
          </h1>

          <p
            className="text-sm font-light text-center leading-relaxed mb-10 max-w-md"
            style={{ color: "#7D746E" }}
          >
            Peças exclusivas pensadas para a mulher que escolhe com intenção.
            Cada detalhe, cada costura — um gesto de cuidado.
          </p>

          <div className="flex flex-row items-center gap-2 sm:gap-6 justify-center">
            <button
              onClick={() => setLocation("/catalogo")}
              className="flex-1 flex items-center justify-center text-center text-[11px] font-medium tracking-[0.35em] uppercase px-6 py-3.5 transition hover:opacity-85 rounded-full min-h-[52px]"
              style={{
                background: `linear-gradient(135deg, ${C.brown} 0%, #4B403D 100%)`,
                color: C.white,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 12px 28px rgba(51,51,51,0.15)",
              }}
            >
              Ver coleção
            </button>

            <button
              onClick={goWhatsApp}
              className="flex-1 flex items-center justify-center text-center text-[11px] font-medium tracking-[0.35em] uppercase px-6 py-3.5 transition hover:opacity-80 rounded-full min-h-[52px]"
              style={{
                backgroundColor: C.rose,
                color: C.brown,
                border: `1px solid ${C.roseDark}55`,
                cursor: "pointer",
              }}
            >
              Atendimento
            </button>
          </div>
        </header>

        {/* ── MAIN ─────────────────────────────────────────────────────────── */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 flex flex-col gap-16 sm:gap-24">
          {/* Carrossel */}
          <section
            className="
              rounded-[22px] overflow-hidden
              min-h-[420px]
              sm:min-h-[360px]
              md:min-h-0
              aspect-[9/16]
              sm:aspect-[4/3]
              md:aspect-[16/7]
            "
            style={{ boxShadow: "0 18px 44px rgba(51,51,51,0.10)" }}
          >
            {hasPromos ? (
              <SlideCarousel count={promos.length} renderSlide={renderPromoSlide} />
            ) : (
              <SlideCarousel
                count={FALLBACK_SLIDES.length}
                renderSlide={renderFallbackSlide}
              />
            )}
          </section>

          {/* Divider */}
          <div className="flex items-center gap-6">
            <div className="flex-1 h-px" style={{ backgroundColor: C.warmBeige2 }} />
            <span
              className="text-[9px] font-light tracking-[0.45em] uppercase"
              style={{ color: C.roseDark }}
            >
              Coleção atual
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: C.warmBeige2 }} />
          </div>

          {/* Produtos em destaque */}
          {featured.length > 0 && (
            <section>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
                {featured.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setLocation(`/catalogo?produto=${product.id}`)}
                    className="group flex flex-col text-left"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                  >
                    <div
                      className="w-full mb-3 rounded-[18px] overflow-hidden"
                      style={{
                        aspectRatio: "3/4",
                        background: `linear-gradient(180deg, ${C.warmSurface} 0%, ${C.warmBeige} 100%)`,
                        boxShadow: "0 10px 28px rgba(51,51,51,0.06)",
                      }}
                    >
                      {product.imagem_url ? (
                        <img
                          src={product.imagem_url}
                          alt={product.nome}
                          className="block w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span
                            className="text-[10px] font-light tracking-widest uppercase"
                            style={{ color: C.roseDark }}
                          >
                            Peça
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-light leading-snug mb-1" style={{ color: C.brown }}>
                      {product.nome}
                    </p>

                    <p
                      className="text-xs font-light"
                      style={{ color: product.promocao ? C.roseDark : "#8A817B" }}
                    >
                      R$ {product.preco.toFixed(2).replace(".", ",")}
                      {product.promocao && (
                        <span
                          className="ml-1 text-[9px] tracking-widest uppercase"
                          style={{ color: C.roseDark }}
                        >
                          · Destaque
                        </span>
                      )}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setLocation("/catalogo")}
                  className="inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.4em] uppercase transition hover:opacity-60"
                  style={{
                    color: C.brown,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Ver todos os produtos <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </section>
          )}

          {/* Brand statement */}
          <section
            className="flex flex-col items-center text-center py-16 px-6 rounded-[24px]"
            style={{
              background: `linear-gradient(135deg, ${C.brown} 0%, #4C3F3B 100%)`,
            }}
          >
            <p
              className="text-[10px] tracking-[0.5em] uppercase font-light mb-5"
              style={{ color: C.rose }}
            >
              Nossa essência
            </p>

            <p
              className="text-white font-light text-xl sm:text-3xl leading-relaxed max-w-xl mb-3"
              style={{
                fontFamily: "'Big Caslon', 'Georgia', 'Times New Roman', serif",
                letterSpacing: "-0.01em",
              }}
            >
              "Criar é um ato de atenção ao outro."
            </p>

            <p
              className="text-sm font-light leading-relaxed max-w-sm mb-8"
              style={{ color: "rgba(232,213,208,0.88)" }}
            >
              No Joseph Atelier, cada peça nasce de uma intenção clara: vestir
              com elegância, sem abrir mão da identidade.
            </p>

            <button
              onClick={() => setLocation("/catalogo")}
              className="inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.4em] uppercase px-8 py-3 transition hover:opacity-80 rounded-full"
              style={{
                border: `1px solid rgba(232,213,208,0.35)`,
                color: C.white,
                background: "rgba(255,255,255,0.06)",
                cursor: "pointer",
              }}
            >
              Explorar coleção <ArrowRight className="h-3 w-3" />
            </button>
          </section>

          {/* CTAs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className="flex flex-col justify-between p-8 rounded-[22px]"
              style={{
                background: `linear-gradient(180deg, ${C.white} 0%, ${C.warmSurface} 100%)`,
                border: `1px solid ${C.warmBeige}`,
              }}
            >
              <div>
                <p
                  className="text-[9px] tracking-[0.45em] uppercase font-light mb-3"
                  style={{ color: C.roseDark }}
                >
                  Atendimento
                </p>

                <p
                  className="font-light text-lg leading-snug mb-3"
                  style={{
                    color: C.brown,
                    fontFamily: "'Big Caslon', 'Georgia', serif",
                  }}
                >
                  Atendimento personalizado via WhatsApp.
                </p>

                <p className="text-sm font-light leading-relaxed" style={{ color: "#7E756F" }}>
                  Tire dúvidas sobre peças, tamanhos e disponibilidade com nossa equipe.
                </p>
              </div>

              <button
                onClick={goWhatsApp}
                className="mt-6 self-start inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.35em] uppercase transition hover:opacity-60"
                style={{
                  color: C.brown,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Falar conosco <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div
              className="flex flex-col justify-between p-8 rounded-[22px]"
              style={{
                background: `linear-gradient(180deg, ${C.rose} 0%, #F1E3DF 100%)`,
                border: `1px solid rgba(201,168,158,0.28)`,
              }}
            >
              <div>
                <p
                  className="text-[9px] tracking-[0.45em] uppercase font-light mb-3"
                  style={{ color: C.roseDark }}
                >
                  Catálogo
                </p>

                <p
                  className="font-light text-lg leading-snug mb-3"
                  style={{
                    color: C.brown,
                    fontFamily: "'Big Caslon', 'Georgia', serif",
                  }}
                >
                  Explore a coleção completa.
                </p>

                <p className="text-sm font-light leading-relaxed" style={{ color: "#7B6E69" }}>
                  Todas as peças com fotos, descrições e preços. Encontre a escolha certa para você.
                </p>
              </div>

              <button
                onClick={() => setLocation("/catalogo")}
                className="mt-6 self-start inline-flex items-center gap-2 text-[10px] font-medium tracking-[0.35em] uppercase transition hover:opacity-60"
                style={{
                  color: C.brown,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Ver catálogo <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </section>

          {/* ── Localização ───────────────────────────────────────── */}
          <section className="w-full py-20 px-6" style={{ background: C.warmSurface }}>
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
              {/* Texto */}
              <div className="flex flex-col gap-4">
                <span
                  className="text-[10px] tracking-[0.45em] uppercase"
                  style={{ color: C.roseDark }}
                >
                  Localização
                </span>

                <h2
                  className="text-3xl sm:text-4xl"
                  style={{
                    fontFamily: "'Big Caslon', serif",
                    color: C.brown,
                  }}
                >
                  Visite o Atelier
                </h2>

                <p
                  className="text-justify leading-relaxed max-w-sm"
                  style={{ color: "#7E756F" }}
                >
                  Estamos localizados em um espaço pensado para receber você
                  com conforto e atenção. Venha conhecer nossas peças pessoalmente.
                </p>

                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: C.brown }}
                >
                  <MapPin className="w-4 h-4" />
                  Av. Sen. Area Leão, 2185
                </div>

                <a
                  href="https://maps.app.goo.gl/mFMRz4FPXc65hvbL8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase"
                  style={{ color: C.brown }}
                >
                  Ver no mapa <ArrowRight className="w-3 h-3" />
                </a>
              </div>

              <div
                className="w-full h-[320px] rounded-[20px] overflow-hidden relative"
                style={{ boxShadow: "0 16px 40px rgba(0,0,0,0.08)" }}
              >
                {!mapReady && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: C.warmSurface, color: C.brown }}
                  >
                    <p className="text-xs tracking-widest uppercase">Carregando mapa...</p>
                  </div>
                )}

                <iframe
                  src="https://www.google.com/maps?q=Av.+Sen.+Area+Leão,+2185&output=embed"
                  className="w-full h-full border-0"
                  loading="lazy"
                  onLoad={() => setMapReady(true)}
                />
              </div>
            </div>
          </section>
        </main>

        <footer
          className="w-full py-12 px-6"
          style={{
            borderTop: `1px solid ${C.warmBeige}`,
            background: `linear-gradient(180deg, ${C.white} 0%, ${C.warmSurface} 100%)`,
          }}
        >
          <div className="max-w-xl mx-auto gap-1 items-center">
            <div className="flex flex-col items-center text-center gap-3">
              <img
                src="/logo_joseph.png"
                alt="Joseph Atelier"
                className="h-10 w-auto object-contain mb-2"
              />

              <a
                href="tel:+5589999761436"
                className="flex items-center gap-2 text-[11px] font-light tracking-wider hover:opacity-60"
                style={{ color: C.brown }}
              >
                <Phone className="w-4 h-4" />
                (89) 99976-1436
              </a>

              <a
                href="https://instagram.com/josephatelier"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-light tracking-wider hover:opacity-60"
                style={{ color: C.brown }}
              >
                <Instagram className="w-4 h-4" />
                @josephatelier
              </a>

              <a
                href="https://maps.app.goo.gl/mFMRz4FPXc65hvbL8"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[11px] font-light tracking-wider hover:opacity-60"
                style={{ color: C.brown }}
              >
                <MapPin className="w-4 h-4" />
                Av. Sen. Area Leão, 2185
              </a>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-[10px] font-light" style={{ color: "#8A817B" }}>
              © 2026 Joseph Atelier
            </p>
          </div>
        </footer>

        <button
          onClick={goWhatsApp}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition hover:scale-105 cursor-pointer"
          style={{ backgroundColor: "#25D366", color: "white" }}
          aria-label="WhatsApp"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>
    </>
  );
}