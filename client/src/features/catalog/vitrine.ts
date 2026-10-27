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

/** Seções em bento que aparecem: só as que enchem o bento inteiro. */
export function vitrinesVisiveis(
  produtos: Product[],
  vitrines: Vitrine[],
  total: number
): { vitrine: Vitrine; itens: Product[] }[] {
  return vitrines
    .map((vitrine) => ({ vitrine, itens: selecionarVitrine(produtos, vitrine.categoria, vitrine.slugs, total) }))
    .filter((s) => s.itens.length >= total);
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
