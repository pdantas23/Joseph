/**
 * Barra de navegação do topo e faixa de aviso.
 * Edite aqui: a ordem dos links é a ordem da barra.
 *
 * Só as categorias que têm peças hoje (conferido no banco em 27/10/2026:
 * 8 conjuntos e 1 vestido). O banco aceita também blusas, calças, saias,
 * acessórios e outros: quando houver peças nelas, é só acrescentar aqui.
 */
import type { ProductCategory } from "@/features/catalog/catalogTypes";

export type LinkNavegacao = {
  rotulo: string;
  /** categoria do catálogo; ausente = "Ver tudo" */
  categoria?: ProductCategory;
};

export const LINKS_NAVEGACAO: LinkNavegacao[] = [
  { rotulo: "Conjuntos", categoria: "conjuntos" },
  { rotulo: "Vestidos",  categoria: "vestidos" },
  { rotulo: "Ver tudo" },
];

/**
 * Texto da faixa de aviso abaixo da barra (ex.: um cupom).
 * Vazio = a faixa não aparece.
 */
export const TEXTO_FAIXA_AVISO = "";

export function hrefDoLink(link: LinkNavegacao): string {
  return link.categoria ? `/catalogo?categoria=${encodeURIComponent(link.categoria)}` : "/catalogo";
}
