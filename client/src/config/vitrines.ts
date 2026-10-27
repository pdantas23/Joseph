/**
 * Seções em bento grid da página inicial (depois dos destaques).
 * Edite aqui. A ordem do array é a ordem na página.
 *
 * Hoje há só uma: Conjuntos (8 das 9 peças). Vestidos tem 1 peça, não
 * enche um bento. Uma seção só aparece se a categoria tiver pelo menos
 * ITENS_POR_VITRINE peças; senão as peças voltam para os destaques.
 *
 * slugs: peças escolhidas à mão, na ordem (slug ou id). A 1ª vira o bloco
 *        grande. Vazio = automático, da mais cara para a mais barata.
 */
import type { ProductCategory } from "@/features/catalog/catalogTypes";

export type Vitrine = {
  categoria: ProductCategory;
  rotulo: string;      // texto pequeno acima do título
  titulo: string;
  linkTexto: string;   // link do fim da seção
  slugs: string[];
};

export const VITRINES: Vitrine[] = [
  { categoria: "conjuntos", rotulo: "Coleção", titulo: "Conjuntos", linkTexto: "Ver todos os conjuntos", slugs: [] },
];

/** Peças por bento: 1 grande + 4 pequenas. */
export const ITENS_POR_VITRINE = 5;

/**
 * Banner de slides do topo: mostra as peças em promoção; sem nenhuma em
 * promoção, mostra até TOTAL_BANNER peças ativas (pode repetir as das
 * outras seções). Sem nenhuma peça, ficam os slides de texto.
 */
export const TOTAL_BANNER = 4;

/**
 * Carrossel de destaques, logo abaixo de "Coleção atual".
 *
 * slugs: peças escolhidas à mão, na ordem. Vazio = automático.
 * Automático: alterna as categorias abaixo (uma peça de cada por vez), da
 * mais cara para a mais barata dentro de cada uma, sem repetir as peças do
 * bento.
 */
export const DESTAQUES = {
  slugs: [] as string[],
  total: 8,
  /** Mínimo de cards; se faltar, repete peças do bento. */
  minimo: 4,
  categorias: ["vestidos", "conjuntos", "blusas", "calças", "saias", "acessórios", "outros"] as ProductCategory[],
};
