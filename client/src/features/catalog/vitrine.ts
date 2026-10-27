/**
 * Escolha das peças das seções da Home. Pura e estável: a mesma lista de
 * produtos sempre gera as mesmas seções.
 *
 * Critério automático: da mais cara para a mais barata. Preço considerado
 * = o maior entre o do produto e o das variações ativas. Empate: nome.
 * Os slugs da configuração (config/vitrines.ts) vêm antes, na ordem dada.
 */
import type { Product, ProductCategory } from "./catalogTypes";
import type { Vitrine } from "@/config/vitrines";
import { faixaDePreco } from "./variantUtils";

export function maiorPreco(p: Product): number {
  return Math.max(Number(p.preco), faixaDePreco(p).max);
}

function comparar(a: Product, b: Product): number {
  const d = maiorPreco(b) - maiorPreco(a);
  if (d !== 0) return d;
  return a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
}

function porSlug(lista: Product[], slug: string): Product | undefined {
  return lista.find((x) => x.slug === slug || x.id === slug);
}

export function selecionarVitrine(
  produtos: Product[],
  categoria: ProductCategory,
  slugsFixos: string[],
  total: number
): Product[] {
  const daCategoria = produtos.filter((p) => p.ativo !== false && p.categoria === categoria);
  const escolhidos: Product[] = [];
  for (const slug of slugsFixos) {
    const p = porSlug(daCategoria, slug);
    if (p && !escolhidos.includes(p)) escolhidos.push(p);
  }
  const resto = daCategoria.filter((p) => !escolhidos.includes(p)).sort(comparar);
  return [...escolhidos, ...resto].slice(0, total);
}

export type LayoutVitrine = "destaque" | "grade" | "bento";

/** 1 peça: destaque; 2 até (bento - 1): grade; bento ou mais: bento. */
export function layoutDaVitrine(quantidade: number, itensDoBento: number): LayoutVitrine {
  if (quantidade >= itensDoBento) return "bento";
  if (quantidade <= 1) return "destaque";
  return "grade";
}

/**
 * Seções que aparecem: as categorias com pelo menos `vitrine.minimo` peças
 * (nunca com 0). Cada uma leva no máximo `itensDoBento` peças.
 */
export function vitrinesVisiveis(
  produtos: Product[],
  vitrines: Vitrine[],
  itensDoBento: number
): { vitrine: Vitrine; itens: Product[]; layout: LayoutVitrine }[] {
  return vitrines
    .map((vitrine) => {
      const itens = selecionarVitrine(produtos, vitrine.categoria, vitrine.slugs, itensDoBento);
      return { vitrine, itens, layout: layoutDaVitrine(itens.length, itensDoBento) };
    })
    .filter((s) => s.itens.length > 0 && s.itens.length >= Math.max(1, s.vitrine.minimo));
}

/**
 * Destaques do carrossel: slugs fixos primeiro; depois alterna as
 * categorias (uma peça de cada por rodada), da mais cara para a mais
 * barata, sem os ids em `excluir` (os que já estão no bento).
 */
export function selecionarDestaques(
  produtos: Product[],
  slugsFixos: string[],
  excluir: Set<string>,
  categorias: ProductCategory[],
  total: number
): Product[] {
  const ativos = produtos.filter((p) => p.ativo !== false && !excluir.has(p.id));
  const escolhidos: Product[] = [];
  for (const slug of slugsFixos) {
    const p = porSlug(ativos, slug);
    if (p && !escolhidos.includes(p)) escolhidos.push(p);
  }
  const filas = categorias.map((c) =>
    ativos.filter((p) => p.categoria === c && !escolhidos.includes(p)).sort(comparar)
  );
  while (escolhidos.length < total && filas.some((f) => f.length > 0)) {
    for (const fila of filas) {
      const p = fila.shift();
      if (p) escolhidos.push(p);
      if (escolhidos.length >= total) break;
    }
  }
  return escolhidos.slice(0, total);
}

/**
 * Completa uma lista até `minimo` com peças de `reserva` (sem repetir dentro
 * da lista). Usado para o carrossel nunca ficar vazio quando o bento leva
 * quase tudo: aí ele pode repetir peças do bento.
 */
export function completarAte(lista: Product[], reserva: Product[], minimo: number): Product[] {
  const saida = [...lista];
  for (const p of reserva) {
    if (saida.length >= minimo) break;
    if (!saida.some((x) => x.id === p.id)) saida.push(p);
  }
  return saida;
}

/**
 * Peças do banner de slides do topo da Home: as em promoção; se nenhuma
 * estiver em promoção, as peças ativas alternando categorias, da mais cara
 * para a mais barata (pode repetir as das outras seções).
 */
export function pecasDoBanner(produtos: Product[], categorias: ProductCategory[], total: number): Product[] {
  const ativos = produtos.filter((p) => p.ativo !== false);
  const promos = ativos.filter((p) => p.promocao);
  if (promos.length > 0) return promos;
  return selecionarDestaques(ativos, [], new Set(), categorias, total);
}
