import { describe, expect, it } from "vitest";
import type { Product, ProductVariation } from "./catalogTypes";
import { maiorPreco, selecionarDestaques, selecionarVitrine, vitrinesVisiveis } from "./vitrine";
import type { Vitrine } from "@/config/vitrines";

const v = (id: string, preco: number | null = null): ProductVariation =>
  ({ id, produto_id: "x", nome: id, descricao: null, preco, codigo_fornecedor: null, ordem: 0, ativo: true, imagens: [] });
const p = (id: string, preco: number, categoria: Product["categoria"] = "conjuntos", vars: ProductVariation[] = []): Product =>
  ({ id, slug: id, nome: "Conjunto", descricao: "", preco, imagem_url: null, imagens: [], variacoes: vars, categoria,
     promocao: false, ativo: true, created_at: "", updated_at: "" });

// Espelha o banco de hoje: 8 conjuntos e 1 vestido.
const hoje = [
  p("c1", 1756), p("c2", 1788), p("c3", 1598), p("c4", 1637), p("c5", 1718),
  p("c6", 2198), p("c7", 1976), p("c8", 1994), p("vest", 898, "vestidos"),
];
const conjuntos: Vitrine = { categoria: "conjuntos", rotulo: "", titulo: "", linkTexto: "", slugs: [] };
const vestidos: Vitrine = { ...conjuntos, categoria: "vestidos" };

describe("bento", () => {
  it("do mais caro para o mais barato, só da categoria", () => {
    expect(selecionarVitrine(hoje, "conjuntos", [], 5).map((x) => x.id)).toEqual(["c6", "c8", "c7", "c2", "c1"]);
  });
  it("maior preço considera as variações", () => {
    expect(maiorPreco(p("x", 100, "conjuntos", [v("a"), v("b", 950)]))).toBe(950);
  });
  it("slugs fixos vêm primeiro; slug de outra categoria é ignorado", () => {
    expect(selecionarVitrine(hoje, "conjuntos", ["c3", "vest"], 3).map((x) => x.id)).toEqual(["c3", "c6", "c8"]);
  });
  it("só aparece a seção que enche o bento (vestidos, com 1 peça, não aparece)", () => {
    const s = vitrinesVisiveis(hoje, [conjuntos, vestidos], 5);
    expect(s.map((x) => x.vitrine.categoria)).toEqual(["conjuntos"]);
  });
});

describe("destaques do carrossel", () => {
  it("com o banco de hoje: o vestido e os 3 conjuntos que sobraram do bento", () => {
    const noBento = new Set(vitrinesVisiveis(hoje, [conjuntos], 5).flatMap((s) => s.itens.map((x) => x.id)));
    const r = selecionarDestaques(hoje, [], noBento, ["vestidos", "conjuntos"], 8).map((x) => x.id);
    expect(r).toEqual(["vest", "c5", "c4", "c3"]);
    expect(r.some((id) => noBento.has(id))).toBe(false);
  });
  it("respeita o total e os slugs fixos", () => {
    expect(selecionarDestaques(hoje, ["c3"], new Set(), ["vestidos", "conjuntos"], 3).map((x) => x.id))
      .toEqual(["c3", "vest", "c6"]);
  });
});
