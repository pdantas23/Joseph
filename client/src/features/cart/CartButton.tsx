import { ShoppingBag } from "lucide-react";
import { useCart } from "./CartContext";
import { C } from "@/lib/josephTheme";

export default function CartButton({ className = "" }: { className?: string }) {
  const { quantidadeTotal, abrir } = useCart();
  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={quantidadeTotal > 0 ? `Abrir sacola, ${quantidadeTotal} ${quantidadeTotal === 1 ? "item" : "itens"}` : "Abrir sacola"}
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:opacity-70 ${className}`}
      style={{ color: C.brown, background: "transparent", border: "none", cursor: "pointer" }}
    >
      <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
      {quantidadeTotal > 0 && (
        <span
          data-testid="cart-count"
          className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums"
          style={{ background: C.brown, color: C.white }}
        >
          {quantidadeTotal > 99 ? "99+" : quantidadeTotal}
        </span>
      )}
    </button>
  );
}
