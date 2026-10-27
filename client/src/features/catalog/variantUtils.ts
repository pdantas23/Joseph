/**
 * Regras de variação usadas pelo site (catálogo, modal e sacola).
 * Puras, sem React, para serem testadas.
 */
import type { Product, ProductVariation } from "./catalogTypes";

/** Variações que aparecem no site (ativas, na ordem). */
export function variacoesVisiveis(product: Product): ProductVariation[] {
  return [...(product.variacoes ?? [])]
    .filter((v) => v.ativo !== false)
    .sort((a, b) => a.ordem - b.ordem);
}

/** Regra de preço: preço da variação; se for nulo, o do produto. */
export function precoEfetivo(product: Pick<Product, "preco">, variacao?: Pick<ProductVariation, "preco"> | null): number {
  if (variacao && variacao.preco !== null && variacao.preco !== undefined) return Number(variacao.preco);
  return Number(product.preco);
}

/** Menor e maior preço entre as variações visíveis (ou o preço do produto). */
export function faixaDePreco(product: Product): { min: number; max: number } {
  const vs = variacoesVisiveis(product);
  if (vs.length === 0) return { min: Number(product.preco), max: Number(product.preco) };
  const precos = vs.map((v) => precoEfetivo(product, v));
  return { min: Math.min(...precos), max: Math.max(...precos) };
}

export function descricaoEfetiva(product: Product, variacao?: ProductVariation | null): string {
  const texto = variacao?.descricao?.trim() ? variacao.descricao : product.descricao;
  return (texto ?? "").trim();
}

export function codigoEfetivo(product: Product, variacao?: ProductVariation | null): string | null {
  return variacao?.codigo_fornecedor ?? product.codigo_fornecedor ?? null;
}

/** Nome do item com a variação: "Conjunto linho 100% (M · Off-white)". */
export function nomeComVariacao(nome: string, variacaoNome?: string | null): string {
  return variacaoNome ? `${nome} (${variacaoNome})` : nome;
}

/**
 * Galeria: fotos da variação primeiro, depois as gerais do produto.
 * Sem variação (ou variação sem foto): capa + fotos gerais.
 */
export function galeria(product: Product, variacao?: ProductVariation | null): string[] {
  const gerais = (product.imagens ?? []).filter((i) => !i.variacao_id).map((i) => i.url);
  const daVariacao = (variacao?.imagens ?? []).map((i) => i.url);
  const lista = daVariacao.length > 0
    ? [...daVariacao, ...gerais]
    : [...(product.imagem_url ? [product.imagem_url] : []), ...gerais];
  return [...new Set(lista.filter(Boolean))];
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.756,00". Troca o espaço não separável do Intl por espaço comum (WhatsApp e testes). */
export function formatarPreco(valor: number): string {
  return BRL.format(Number(valor)).replace(/ /g, " ");
}
