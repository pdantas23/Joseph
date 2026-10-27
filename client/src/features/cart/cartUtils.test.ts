import { describe, expect, it } from "vitest";
import {
  adicionarItem,
  alterarQuantidade,
  lerCarrinhoSalvo,
  montarMensagemCarrinho,
  removerItem,
  subtotal,
  totalDeItens,
  type NovoItem,
} from "./cartUtils";

const linho: NovoItem = {
  produtoId: "p1",
  variacaoId: "v-m-off",
  nome: "Conjunto linho 100%",
  variacaoNome: "M · Off-white",
  codigo: "JA-101-M",
  precoUnitario: 1994,
  imagem: null,
};
const vestido: NovoItem = {
  produtoId: "p2",
  variacaoId: null,
  nome: "Vestido Tricoline Acetinada",
  variacaoNome: null,
  codigo: null,
  precoUnitario: 898,
  imagem: null,
};

describe("sacola", () => {
  it("soma quantidade do mesmo produto e variação, separa variações diferentes", () => {
    let c = adicionarItem([], linho, 1);
    c = adicionarItem(c, linho, 2);
    c = adicionarItem(c, { ...linho, variacaoId: "v-g-off", variacaoNome: "G · Off-white", precoUnitario: 2050 }, 1);
    expect(c).toHaveLength(2);
    expect(c[0].quantidade).toBe(3);
    expect(totalDeItens(c)).toBe(4);
    expect(subtotal(c)).toBe(1994 * 3 + 2050);
  });

  it("alterar para 0 remove; remover tira o item; quantidade tem teto", () => {
    let c = adicionarItem([], linho, 1);
    c = alterarQuantidade(c, c[0].chave, 500);
    expect(c[0].quantidade).toBe(99);
    expect(alterarQuantidade(c, c[0].chave, 0)).toHaveLength(0);
    expect(removerItem(c, c[0].chave)).toHaveLength(0);
  });

  it("ignora lixo no localStorage", () => {
    expect(lerCarrinhoSalvo(null)).toEqual([]);
    expect(lerCarrinhoSalvo("{quebrado")).toEqual([]);
    expect(lerCarrinhoSalvo(JSON.stringify([{ nome: "sem id" }, { ...linho, quantidade: 2 }]))).toHaveLength(1);
  });
});

describe("mensagem do WhatsApp", () => {
  it("lista nome, variação, código, quantidade, preço e total", () => {
    let c = adicionarItem([], linho, 2);
    c = adicionarItem(c, vestido, 1);
    expect(montarMensagemCarrinho(c)).toBe(
      [
        "Olá! Tenho interesse nas peças abaixo. Pode me passar mais informações?",
        "",
        "1. *Conjunto linho 100%*",
        "Variação: M · Off-white",
        "Código: JA-101-M",
        "Quantidade: 2",
        "Preço: R$ 1.994,00 cada, R$ 3.988,00 no total",
        "",
        "2. *Vestido Tricoline Acetinada*",
        "Quantidade: 1",
        "Preço: R$ 898,00",
        "",
        "*Total: R$ 4.886,00*",
      ].join("\n")
    );
  });

  it("peça única e sem travessão", () => {
    const msg = montarMensagemCarrinho(adicionarItem([], vestido, 1));
    expect(msg).not.toMatch(/[–—]/);
    expect(msg.startsWith("Olá! Tenho interesse na peça abaixo.")).toBe(true);
  });
});
