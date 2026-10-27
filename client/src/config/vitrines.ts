/**
 * Seções por categoria da página inicial (depois dos destaques).
 * Edite aqui. A ordem do array é a ordem na página.
 *
 * O layout se adapta à quantidade de peças da categoria:
 *   1 peça           -> bloco de destaque (foto de um lado, nome, preço e
 *                       botão do outro; empilhado no celular);
 *   2 a 4 peças      -> grade simples de cards do mesmo tamanho;
 *   ITENS_POR_VITRINE ou mais -> bento (1 grande + 4 pequenas).
 *
 * minimo: quantas peças a categoria precisa ter para a seção aparecer.
 *         Abaixo disso a seção some e as peças voltam para os destaques.
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
  minimo: number;
};

export const VITRINES: Vitrine[] = [
  { categoria: "conjuntos", rotulo: "Coleção", titulo: "Conjuntos", linkTexto: "Ver todos os conjuntos", slugs: [], minimo: 5 },
  // Aparece com qualquer quantidade (hoje há 1 vestido) e cresce sozinha.
  { categoria: "vestidos",  rotulo: "Coleção", titulo: "Vestidos",  linkTexto: "Ver todos os vestidos",  slugs: [], minimo: 1 },
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
  /**
   * Mínimo de cards; se faltar, completa com peças do bento (repetindo).
   * 3 porque hoje sobram 3 peças fora das seções: assim nada se repete.
   * Com menos cards do que cabem na tela, eles ficam centralizados.
   */
  minimo: 3,
  categorias: ["vestidos", "conjuntos", "blusas", "calças", "saias", "acessórios", "outros"] as ProductCategory[],
};
