import { describe, expect, it } from "vitest";
import type { Product, ProductVariation } from "./catalogTypes";
import { completarAte, layoutDaVitrine, maiorPreco, pecasDoBanner, selecionarDestaques, selecionarVitrine, vitrinesVisiveis } from "./vitrine";
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
const conjuntos: Vitrine = { categoria: "conjuntos", rotulo: "", titulo: "", linkTexto: "", slugs: [], minimo: 5 };
const vestidos: Vitrine = { ...conjuntos, categoria: "vestidos", minimo: 1 };

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
  it("Conjuntos em bento e Vestidos (1 peça) em destaque, nessa ordem", () => {
    const s = vitrinesVisiveis(hoje, [conjuntos, vestidos], 5);
    expect(s.map((x) => [x.vitrine.categoria, x.layout, x.itens.length])).toEqual([
      ["conjuntos", "bento", 5],
      ["vestidos", "destaque", 1],
    ]);
  });
  it("seção abaixo do mínimo ou sem peças some", () => {
    expect(vitrinesVisiveis(hoje, [{ ...vestidos, minimo: 2 }], 5)).toHaveLength(0);
    expect(vitrinesVisiveis(hoje.filter((x) => x.categoria !== "vestidos"), [{ ...vestidos, minimo: 0 }], 5)).toHaveLength(0);
  });
  it("layout cresce com a quantidade", () => {
    expect([1, 2, 4, 5, 9].map((n) => layoutDaVitrine(n, 5))).toEqual(["destaque", "grade", "grade", "bento", "bento"]);
  });
});

describe("destaques do carrossel", () => {
  it("com o banco de hoje: os 3 conjuntos fora das seções (o vestido já está na seção dele)", () => {
    const noBento = new Set(vitrinesVisiveis(hoje, [conjuntos, vestidos], 5).flatMap((s) => s.itens.map((x) => x.id)));
    const r = selecionarDestaques(hoje, [], noBento, ["vestidos", "conjuntos"], 8).map((x) => x.id);
    expect(r).toEqual(["c5", "c4", "c3"]);
    expect(r.some((id) => noBento.has(id))).toBe(false);
  });
  it("respeita o total e os slugs fixos", () => {
    expect(selecionarDestaques(hoje, ["c3"], new Set(), ["vestidos", "conjuntos"], 3).map((x) => x.id))
      .toEqual(["c3", "vest", "c6"]);
  });
});

describe("nada vazio na Home", () => {
  it("banner sem promoção usa as peças ativas (o banco de hoje não tem promoção)", () => {
    expect(pecasDoBanner(hoje, ["vestidos", "conjuntos"], 4).map((x) => x.id)).toEqual(["vest", "c6", "c8", "c7"]);
  });
  it("banner com promoção mostra só as promoções", () => {
    const comPromo = hoje.map((x) => (x.id === "c3" ? { ...x, promocao: true } : x));
    expect(pecasDoBanner(comPromo, ["vestidos", "conjuntos"], 4).map((x) => x.id)).toEqual(["c3"]);
  });
  it("destaques completam com peças do bento quando sobra pouco", () => {
    const so5 = hoje.filter((x) => x.categoria === "conjuntos").slice(0, 5);
    const noBento = new Set(so5.map((x) => x.id));
    const vazio = selecionarDestaques(so5, [], noBento, ["vestidos", "conjuntos"], 8);
    expect(vazio).toHaveLength(0);
    const cheio = completarAte(vazio, selecionarDestaques(so5, [], new Set(), ["vestidos", "conjuntos"], 8), 4);
    expect(cheio).toHaveLength(4);
  });
});
