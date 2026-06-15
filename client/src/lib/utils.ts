import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge de classes Tailwind — base para todos os componentes */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata uma data ISO para pt-BR — ex: "12/03/2025 às 14:30" */
export function formatDate(iso: string, withTime = false): string {
  const date = new Date(iso);
  const dateStr = date.toLocaleDateString("pt-BR");
  if (!withTime) return dateStr;
  const timeStr = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} às ${timeStr}`;
}

/** Formata um valor numérico como preço pt-BR (sem símbolo) — ex: 1890.9 → "1.890,90" */
export function formatPrice(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Remove caracteres não numéricos de uma string */
export function onlyNumbers(value: string): string {
  return value.replace(/\D/g, "");
}

/** Trunca um texto longo com reticências */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}
