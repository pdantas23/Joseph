import { describe, expect, it } from "vitest";
import type { Product, ProductVariation } from "./catalogTypes";
import {
  codigoEfetivo,
  descricaoEfetiva,
  faixaDePreco,
  formatarPreco,
  galeria,
  nomeComVariacao,
  precoEfetivo,
  variacoesVisiveis,
} from "./variantUtils";
import { formatPrice } from "@/lib/utils";

function variacao(p: Partial<ProductVariation>): ProductVariation {
  return { id: "v", produto_id: "p", nome: "V", descricao: null, preco: null, codigo_fornecedor: null, ordem: 0, ativo: true, imagens: [], ...p };
}

const base: Product = {
  id: "p", nome: "Conjunto linho 100%", descricao: "desc do produto", preco: 1994,
  imagem_url: "capa.jpeg", imagens: [{ id: "i1", produto_id: "p", url: "geral.jpeg", ordem: 0 }],
  categoria: "conjuntos", promocao: false, ativo: true, created_at: "", updated_at: "",
  codigo_fornecedor: "JA-101",
};

describe("preço em pt-BR", () => {
  it("usa ponto de milhar e vírgula nos centavos", () => {
    expect(formatarPreco(1756)).toBe("R$ 1.756,00");
    expect(formatarPreco(898)).toBe("R$ 898,00");
    expect(formatarPreco(12345.5)).toBe("R$ 12.345,50");
    expect(formatarPreco(0)).toBe("R$ 0,00");
  });
  it("formatPrice (sem símbolo) segue o mesmo padrão", () => {
    expect(formatPrice(1890.9)).toBe("1.890,90");
    expect(formatPrice(2198)).toBe("2.198,00");
  });
});

describe("regra de preço da variação", () => {
  it("preço nulo usa o do produto; preço próprio vale", () => {
    expect(precoEfetivo(base, variacao({ preco: null }))).toBe(1994);
    expect(precoEfetivo(base, variacao({ preco: 2100 }))).toBe(2100);
    expect(precoEfetivo(base, variacao({ preco: 0 }))).toBe(0);
    expect(precoEfetivo(base, null)).toBe(1994);
  });

  it("faixa de preço considera só variações ativas", () => {
    const p = { ...base, variacoes: [
      variacao({ id: "a", preco: null, ordem: 0 }),
      variacao({ id: "b", preco: 2100, ordem: 1 }),
      variacao({ id: "c", preco: 9000, ordem: 2, ativo: false }),
    ] };
    expect(faixaDePreco(p)).toEqual({ min: 1994, max: 2100 });
    expect(variacoesVisiveis(p).map((v) => v.id)).toEqual(["a", "b"]);
    expect(faixaDePreco(base)).toEqual({ min: 1994, max: 1994 });
  });

  it("produto sem variação (API antes da migration) continua igual", () => {
    const semCampo = { ...base, variacoes: undefined };
    expect(variacoesVisiveis(semCampo)).toEqual([]);
    expect(galeria(semCampo, null)).toEqual(["capa.jpeg", "geral.jpeg"]);
    expect(codigoEfetivo({ ...base, codigo_fornecedor: undefined }, null)).toBeNull();
  });

  it("código, descrição, nome e galeria seguem a variação", () => {
    const v = variacao({ id: "b", nome: "M · Off-white", codigo_fornecedor: "JA-101-M", descricao: "desc da variação",
      imagens: [{ id: "x", produto_id: "p", variacao_id: "b", url: "var.jpeg", ordem: 0 }] });
    expect(codigoEfetivo(base, v)).toBe("JA-101-M");
    expect(codigoEfetivo(base, null)).toBe("JA-101");
    expect(descricaoEfetiva(base, v)).toBe("desc da variação");
    expect(descricaoEfetiva(base, variacao({}))).toBe("desc do produto");
    expect(descricaoEfetiva({ ...base, descricao: "Conjunto linho 100% " }, null)).toBe("");
    expect(nomeComVariacao(base.nome, v.nome)).toBe("Conjunto linho 100% (M · Off-white)");
    expect(nomeComVariacao(base.nome, null)).toBe("Conjunto linho 100%");
    expect(galeria(base, v)).toEqual(["var.jpeg", "geral.jpeg"]);
    expect(galeria(base, variacao({}))).toEqual(["capa.jpeg", "geral.jpeg"]);
  });
});
