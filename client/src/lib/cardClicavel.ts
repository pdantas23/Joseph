import type { KeyboardEvent } from "react";

/**
 * Props para um card inteiro clicável que contém blocos (div, p):
 * role="button", foco pelo teclado e Enter/Espaço abrem, como num botão.
 */
export function propsCardClicavel(abrir: () => void, rotulo: string) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": rotulo,
    onClick: abrir,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrir();
      }
    },
  };
}

/**
 * Anel de foco visível no padrão da Joseph (grafite da marca), só pelo teclado.
 * É outline, não ring: os cards têm box-shadow próprio (inline), que
 * esconderia um ring do Tailwind.
 */
export const FOCO_CARD =
  "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#333333]";
