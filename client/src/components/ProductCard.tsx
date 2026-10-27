import { ArrowRight } from "lucide-react";
import { formatarPreco } from "@/features/catalog/variantUtils";
import { FOCO_CARD, propsCardClicavel } from "@/lib/cardClicavel";
import { C, FONT_SERIF } from "@/lib/josephTheme";

interface ProductCardProps {
  image: string;
  name: string;
  category: string;
  price: number;
  /** true quando as variações têm preços diferentes: mostra "a partir de" */
  priceFrom?: boolean;
  isFeatured?: boolean;
  onClick?: () => void;
}

/**
 * Card do carrossel de destaques. O card inteiro é um botão: clicar em
 * qualquer ponto (ou Enter/Espaço com o foco nele) abre a peça. O
 * "Ver peça" é só indicação visual.
 */
export default function ProductCard({
  image,
  name,
  category,
  price,
  priceFrom = false,
  isFeatured = false,
  onClick,
}: ProductCardProps) {
  return (
    <div
      {...propsCardClicavel(() => onClick?.(), `Ver ${name}`)}
      data-testid="highlight-card"
      className={`group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[22px] text-left transition-[transform,box-shadow] duration-500 ease-out motion-safe:hover:-translate-y-1.5 hover:shadow-[0_22px_44px_rgba(51,51,51,0.12)] ${FOCO_CARD}`}
      style={{
        background: `linear-gradient(180deg, ${C.white} 0%, ${C.warmSurface} 100%)`,
        border: `1px solid ${C.warmBeige}`,
        boxShadow: "0 10px 28px rgba(51,51,51,0.06)",
      }}
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4", background: C.warmBeige }}>
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-[10px] font-light uppercase tracking-widest" style={{ color: C.roseDark }}>Peça</span>
          </div>
        )}

        {isFeatured && (
          <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-[9px] font-light uppercase tracking-widest"
            style={{ background: C.rose, color: C.brown }}>
            Destaque
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4 sm:p-5 2xl:p-6">
        {category && (
          <p className="text-[9px] font-light uppercase tracking-[0.35em]" style={{ color: C.roseDark }}>
            {category}
          </p>
        )}
        <p className="line-clamp-2 text-base font-light leading-snug xl:text-lg 2xl:text-xl" style={{ color: C.brown, fontFamily: FONT_SERIF }}>
          {name}
        </p>
        <p className="text-sm font-light tabular-nums" style={{ color: "#6F6762" }}>
          {priceFrom && <span className="mr-1 text-[10px]" style={{ color: C.muted }}>a partir de</span>}
          {formatarPreco(price)}
        </p>
        <div className="flex-1" />
        <span
          aria-hidden="true"
          className="mt-2 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.35em] transition-opacity group-hover:opacity-60"
          style={{ color: C.brown }}
        >
          Ver peça <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
