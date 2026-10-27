/**
 * Sacola: regras puras (sem React), testadas em cartUtils.test.ts.
 */
import { formatarPreco } from "@/features/catalog/variantUtils";

export const CART_STORAGE_KEY = "joseph:sacola:v1";
export const QTD_MAX = 99;

export type CartItem = {
  chave: string;              // produtoId + variacaoId
  produtoId: string;
  variacaoId: string | null;
  nome: string;
  variacaoNome: string | null;
  codigo: string | null;
  precoUnitario: number;
  imagem: string | null;
  quantidade: number;
};

export type NovoItem = Omit<CartItem, "chave" | "quantidade">;

export function chaveDoItem(produtoId: string, variacaoId: string | null): string {
  return `${produtoId}::${variacaoId ?? ""}`;
}

function limitar(q: number): number {
  if (!Number.isFinite(q)) return 1;
  return Math.max(1, Math.min(QTD_MAX, Math.floor(q)));
}

/** Soma ao item igual (mesmo produto e variação) ou cria um novo. */
export function adicionarItem(itens: CartItem[], novo: NovoItem, quantidade = 1): CartItem[] {
  const chave = chaveDoItem(novo.produtoId, novo.variacaoId);
  const existe = itens.find((i) => i.chave === chave);
  if (existe) {
    return itens.map((i) =>
      i.chave === chave ? { ...i, ...novo, chave, quantidade: limitar(i.quantidade + quantidade) } : i
    );
  }
  return [...itens, { ...novo, chave, quantidade: limitar(quantidade) }];
}

export function alterarQuantidade(itens: CartItem[], chave: string, quantidade: number): CartItem[] {
  if (quantidade <= 0) return removerItem(itens, chave);
  return itens.map((i) => (i.chave === chave ? { ...i, quantidade: limitar(quantidade) } : i));
}

export function removerItem(itens: CartItem[], chave: string): CartItem[] {
  return itens.filter((i) => i.chave !== chave);
}

export function totalDeItens(itens: CartItem[]): number {
  return itens.reduce((s, i) => s + i.quantidade, 0);
}

export function subtotal(itens: CartItem[]): number {
  return Math.round(itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0) * 100) / 100;
}

/** Lê o que veio do localStorage, descartando o que não tiver o formato certo. */
export function lerCarrinhoSalvo(raw: string | null): CartItem[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((i) =>
        i && typeof i.produtoId === "string" && typeof i.nome === "string" &&
        typeof i.precoUnitario === "number" && Number.isFinite(i.precoUnitario) &&
        typeof i.quantidade === "number"
      )
      .map((i) => ({
        chave: chaveDoItem(i.produtoId, i.variacaoId ?? null),
        produtoId: i.produtoId,
        variacaoId: i.variacaoId ?? null,
        nome: i.nome,
        variacaoNome: i.variacaoNome ?? null,
        codigo: i.codigo ?? null,
        precoUnitario: i.precoUnitario,
        imagem: i.imagem ?? null,
        quantidade: limitar(i.quantidade),
      }));
  } catch {
    return [];
  }
}

/**
 * Mensagem do pedido pelo WhatsApp. Segue o padrão do botão que o site
 * já tinha ("Olá! Tenho interesse na peça *X*. Pode me passar mais informações?").
 */
export function montarMensagemCarrinho(itens: CartItem[]): string {
  const linhas: string[] = [];
  linhas.push(
    itens.length === 1 && itens[0].quantidade === 1
      ? "Olá! Tenho interesse na peça abaixo. Pode me passar mais informações?"
      : "Olá! Tenho interesse nas peças abaixo. Pode me passar mais informações?"
  );
  linhas.push("");
  itens.forEach((i, idx) => {
    linhas.push(`${idx + 1}. *${i.nome}*`);
    if (i.variacaoNome) linhas.push(`Variação: ${i.variacaoNome}`);
    if (i.codigo) linhas.push(`Código: ${i.codigo}`);
    linhas.push(`Quantidade: ${i.quantidade}`);
    linhas.push(
      i.quantidade > 1
        ? `Preço: ${formatarPreco(i.precoUnitario)} cada, ${formatarPreco(i.precoUnitario * i.quantidade)} no total`
        : `Preço: ${formatarPreco(i.precoUnitario)}`
    );
    linhas.push("");
  });
  linhas.push(`*Total: ${formatarPreco(subtotal(itens))}*`);
  return linhas.join("\n");
}
