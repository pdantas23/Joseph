import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { LINKS_NAVEGACAO, TEXTO_FAIXA_AVISO, hrefDoLink } from "@/config/navegacao";
import CartButton from "@/features/cart/CartButton";
import { C, FONT_SANS } from "@/lib/josephTheme";

/** Altura da barra, em px. A Home usa para puxar o hero para baixo dela. */
export const ALTURA_NAV = 44;

/**
 * Barra fina de categorias (fixa no topo ao rolar) + faixa de aviso.
 * No celular os links rolam na horizontal, sem barra de rolagem visível,
 * e a sacola fica sempre à direita.
 *
 * sobreHero: na Home, a barra fica transparente por cima do fundo do hero
 * (acima da logo) e só ganha fundo depois de rolar.
 *
 * Logo à esquerda: aparece quando a barra passa do fim do elemento marcado
 * com data-nav-hero (o hero da Home, o cabeçalho do catálogo) e some ao
 * voltar. Tudo com IntersectionObserver, sem ouvir o evento de rolagem.
 */
export default function SiteNav({ sobreHero = false }: { sobreHero?: boolean }) {
  const sentinela = useRef<HTMLDivElement>(null);
  const [rolou, setRolou] = useState(false);
  const [passouHero, setPassouHero] = useState(false);

  // Transparência: um marcador de 8 px no topo da página; fora da tela = rolou.
  useEffect(() => {
    if (!sobreHero || !sentinela.current) return;
    const io = new IntersectionObserver(([e]) => setRolou(!e.isIntersecting));
    io.observe(sentinela.current);
    return () => io.disconnect();
  }, [sobreHero]);

  // Logo: o hero deixou de aparecer abaixo da barra.
  useEffect(() => {
    const hero = document.querySelector("[data-nav-hero]");
    if (!hero) return;
    const io = new IntersectionObserver(
      ([e]) => setPassouHero(!e.isIntersecting && e.boundingClientRect.top < ALTURA_NAV),
      { rootMargin: `-${ALTURA_NAV}px 0px 0px 0px` }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  const transparente = sobreHero && !rolou;
  const [location, navegar] = useLocation();
  const search = useSearch();
  const categoriaAtual = location === "/catalogo" ? new URLSearchParams(search).get("categoria") ?? "" : null;

  function irParaOTopo() {
    if (window.location.pathname === "/") {
      const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduzir ? "auto" : "smooth" });
    } else {
      navegar("/");
      window.scrollTo({ top: 0 });
    }
  }

  return (
    <>
      {sobreHero && (
        <div ref={sentinela} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-2 w-px" />
      )}
      <nav
        aria-label="Categorias"
        data-transparente={transparente ? "1" : "0"}
        className="sticky top-0 z-40 w-full transition-[background-color,border-color,backdrop-filter] duration-300"
        style={{
          fontFamily: FONT_SANS,
          background: transparente ? "transparent" : "rgba(246,241,236,0.92)",
          backdropFilter: transparente ? "none" : "blur(10px)",
          WebkitBackdropFilter: transparente ? "none" : "blur(10px)",
          borderBottom: `1px solid ${transparente ? "rgba(51,51,51,0.08)" : C.warmBeige}`,
        }}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center pl-2 pr-2 sm:px-6" style={{ height: ALTURA_NAV - 1 }}>
          {/* Logo: no desktop o espaço é fixo (os links não saem do centro);
              no celular o espaço abre junto com o logo e os links ficam com o resto. */}
          <div
            data-on={passouHero ? "1" : "0"}
            className="flex h-full w-0 shrink-0 items-center overflow-hidden transition-[width] duration-300 ease-out data-[on=1]:w-[44px] motion-reduce:transition-none sm:w-28 sm:data-[on=1]:w-28"
          >
            <button
              type="button"
              onClick={irParaOTopo}
              aria-label="Joseph Atelier, voltar ao início"
              tabIndex={passouHero ? 0 : -1}
              data-testid="nav-logo"
              className="flex h-full items-center transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none"
              style={{
                opacity: passouHero ? 1 : 0,
                transform: passouHero ? "translateX(0)" : "translateX(-8px)",
                pointerEvents: passouHero ? "auto" : "none",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <img src="/logo_joseph.png" alt="Joseph Atelier" className="h-[30px] w-auto" />
            </button>
          </div>
          <ul
            className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto px-2 sm:justify-center sm:gap-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {LINKS_NAVEGACAO.map((link) => {
              const ativo = categoriaAtual !== null && (link.categoria ?? "") === categoriaAtual;
              return (
                <li key={link.rotulo} className="shrink-0">
                  <Link
                    href={hrefDoLink(link)}
                    className="block whitespace-nowrap py-1 text-[10px] font-light uppercase tracking-[0.35em] transition hover:opacity-60"
                    style={{
                      color: C.brown,
                      borderBottom: `1px solid ${ativo ? C.brown : "transparent"}`,
                    }}
                  >
                    {link.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex shrink-0 justify-end sm:w-28">
            <CartButton />
          </div>
        </div>
      </nav>

      {TEXTO_FAIXA_AVISO.trim() && (
        <div
          className="w-full px-4 py-2 text-center text-[11px] font-light tracking-[0.04em]"
          style={{ fontFamily: FONT_SANS, background: C.rose, color: C.brown, borderBottom: `1px solid ${C.warmBeige}` }}
        >
          {TEXTO_FAIXA_AVISO}
        </div>
      )}
    </>
  );
}
