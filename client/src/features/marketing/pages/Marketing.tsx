import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { listProducts } from "@/features/catalog/catalogApi";
import type { Product } from "@/features/catalog/catalogTypes";
import { ExternalLink, Copy, CheckCheck, TrendingUp, Package, Tag } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const C = {
  brown:    "#333333",
  bege1:    "#B3B3B3",
  bege2:    "#CCCCCC",
  bege3:    "#E6E6E6",
  offwhite: "#F2F2F2",
  white:    "#FFFFFF",
  rose:     "#E8D5D0",
  roseDark: "#C9A89E",
} as const;

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;

const NAV = [{ label: "Marketing", href: "/marketing" }];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildProductLink(productId: string): string {
  return `${window.location.origin}/catalogo?produto=${productId}`;
}

function buildWhatsAppBlast(products: Product[]): string {
  const number = (WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const destaques = products.filter((p) => p.promocao);
  let text = "✨ *Joseph Atelier — Novidades da coleção*\n\n";
  if (destaques.length > 0) {
    text += "🌸 *Peças em destaque:*\n";
    for (const p of destaques.slice(0, 5)) {
      text += `• ${p.nome} — R$ ${formatPrice(p.preco)}\n`;
    }
    text += "\n";
  }
  text += "Ver coleção completa:\n";
  text += `${window.location.origin}/catalogo`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 p-6" style={{ backgroundColor: C.white, border: `1px solid ${C.bege3}` }}>
      <p className="text-[9px] font-light tracking-[0.45em] uppercase" style={{ color: C.bege1 }}>{label}</p>
      <p className="text-2xl font-light" style={{ color: C.brown, fontFamily: "'Georgia', serif" }}>{value}</p>
      {sub && <p className="text-[10px] font-light" style={{ color: C.bege2 }}>{sub}</p>}
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, label = "Copiar link" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <button type="button" onClick={handleCopy}
      className="flex items-center gap-1.5 text-[10px] font-light tracking-[0.3em] uppercase transition hover:opacity-60"
      style={{ color: copied ? C.roseDark : C.brown, background: "none", border: "none", cursor: "pointer" }}>
      {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

// ─── Marketing ────────────────────────────────────────────────────────────────

export default function Marketing() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    listProducts({ ativo: true })
      .then((res) => setProducts(res.data))
      .catch(() => setError("Não foi possível carregar os produtos."))
      .finally(() => setIsLoading(false));
  }, []);

  const total      = products.length;
  const destaques  = products.filter((p) => p.promocao).length;
  const catalogUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/catalogo`;
  const whatsappUrl = products.length > 0 ? buildWhatsAppBlast(products) : "#";

  return (
    <DashboardLayout navItems={NAV}>
      <div className="space-y-8">

        {/* Cabeçalho */}
        <div>
          <p className="text-[9px] font-light tracking-[0.45em] uppercase mb-1" style={{ color: C.bege1 }}>Área</p>
          <h1 className="text-xl font-light" style={{ color: C.brown, fontFamily: "'Georgia', serif" }}>Marketing</h1>
          <p className="text-xs font-light mt-0.5" style={{ color: C.bege1 }}>
            Visão geral da coleção e ferramentas de divulgação
          </p>
        </div>

        {/* Stats */}
        {!isLoading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total de peças" value={total} sub="publicadas no catálogo" />
            <StatCard label="Destaques" value={destaques} sub="marcadas como promoção" />
            <StatCard label="Catálogo" value="Público" sub="acessível sem login" />
          </div>
        )}

        {/* Ferramentas de divulgação */}
        <section>
          <p className="text-[9px] tracking-[0.45em] uppercase font-light mb-4" style={{ color: C.bege1 }}>
            Divulgação
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Link do catálogo */}
            <div className="p-6 flex flex-col gap-3" style={{ backgroundColor: C.white, border: `1px solid ${C.bege3}` }}>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" style={{ color: C.bege1 }} />
                <p className="text-[9px] tracking-[0.4em] uppercase font-light" style={{ color: C.bege1 }}>
                  Link do catálogo
                </p>
              </div>
              <p className="text-sm font-light" style={{ color: C.brown }}>{catalogUrl}</p>
              <p className="text-xs font-light" style={{ color: C.bege1 }}>
                Compartilhe este link para que clientes acessem a coleção completa.
              </p>
              <div className="flex items-center gap-4 mt-1">
                <CopyButton text={catalogUrl} />
                <a href={catalogUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-light tracking-[0.3em] uppercase transition hover:opacity-60"
                  style={{ color: C.bege1, textDecoration: "none" }}>
                  <ExternalLink className="h-3 w-3" />
                  Abrir
                </a>
              </div>
            </div>

            {/* Mensagem WhatsApp */}
            <div className="p-6 flex flex-col gap-3" style={{ backgroundColor: C.white, border: `1px solid ${C.bege3}` }}>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" style={{ color: C.bege1 }} />
                <p className="text-[9px] tracking-[0.4em] uppercase font-light" style={{ color: C.bege1 }}>
                  Disparo WhatsApp
                </p>
              </div>
              <p className="text-sm font-light" style={{ color: C.brown }}>
                Mensagem pré-formatada com destaques da coleção
              </p>
              <p className="text-xs font-light" style={{ color: C.bege1 }}>
                Abre o WhatsApp com uma mensagem pronta para envio com as peças em destaque.
              </p>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="mt-1 self-start flex items-center gap-1.5 text-[10px] font-medium tracking-[0.3em] uppercase transition hover:opacity-70"
                style={{ color: C.white, backgroundColor: C.brown, padding: "8px 16px", textDecoration: "none", borderRadius: "1px" }}>
                Abrir no WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* Produtos destaques */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[9px] tracking-[0.45em] uppercase font-light" style={{ color: C.bege1 }}>
              Peças em destaque
            </p>
            <span className="text-[9px] font-light" style={{ color: C.bege2 }}>
              {destaques} peça{destaques !== 1 ? "s" : ""}
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="h-5 w-5 rounded-full border border-t-transparent animate-spin"
                style={{ borderColor: C.bege2, borderTopColor: C.brown }} />
              <p className="text-[10px] font-light tracking-widest uppercase" style={{ color: C.bege1 }}>Carregando...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-xs font-light" style={{ color: C.bege1 }}>{error}</p>
            </div>
          ) : products.filter(p => p.promocao).length === 0 ? (
            <div className="py-12 text-center" style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.white }}>
              <Tag className="h-6 w-6 mx-auto mb-3" style={{ color: C.bege2 }} />
              <p className="text-xs font-light" style={{ color: C.bege1 }}>
                Nenhuma peça marcada como destaque.
              </p>
              <p className="text-[10px] font-light mt-1" style={{ color: C.bege2 }}>
                Acesse a área Comercial para marcar peças como destaque.
              </p>
            </div>
          ) : (
            <div style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.white }}>
              {products.filter(p => p.promocao).map((product, idx) => (
                <div key={product.id}
                  className="flex items-center gap-4 px-5 py-4"
                  style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.bege3}` }}>

                  {/* Thumb */}
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden"
                    style={{ backgroundColor: C.offwhite }}>
                    {product.imagem_url
                      ? <img src={product.imagem_url} alt={product.nome} className="h-full w-full object-cover" />
                      : <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-4 w-4" style={{ color: C.bege2 }} />
                        </div>
                    }
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-light truncate" style={{ color: C.brown }}>{product.nome}</p>
                    <p className="text-xs font-light" style={{ color: product.preco ? C.roseDark : C.bege1 }}>
                      R$ {formatPrice(product.preco)}
                    </p>
                  </div>

                  {/* Link */}
                  <div className="flex items-center gap-3 shrink-0">
                    <CopyButton text={buildProductLink(product.id)} label="Copiar link" />
                    <a href={buildProductLink(product.id)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-light tracking-[0.25em] uppercase transition hover:opacity-50"
                      style={{ color: C.bege1, textDecoration: "none" }}>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Todos os produtos — visão de catálogo */}
        {!isLoading && !error && products.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[9px] tracking-[0.45em] uppercase font-light" style={{ color: C.bege1 }}>
                Todos os produtos
              </p>
              <span className="text-[9px] font-light" style={{ color: C.bege2 }}>{total} no catálogo</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((product) => (
                <div key={product.id} className="group flex flex-col" style={{ backgroundColor: C.white, border: `1px solid ${C.bege3}` }}>
                  <div className="overflow-hidden relative" style={{ aspectRatio: "1/1", backgroundColor: C.offwhite }}>
                    {product.imagem_url
                      ? <img src={product.imagem_url} alt={product.nome}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6" style={{ color: C.bege2 }} />
                        </div>
                    }
                    {product.promocao && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[8px] font-light tracking-widest uppercase"
                        style={{ backgroundColor: C.rose, color: C.roseDark }}>Destaque</div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-1.5">
                    <p className="text-xs font-light line-clamp-2 leading-snug" style={{ color: C.brown }}>{product.nome}</p>
                    <p className="text-xs font-light" style={{ color: C.bege1 }}>
                      R$ {formatPrice(product.preco)}
                    </p>
                    <div className="pt-1">
                      <CopyButton text={buildProductLink(product.id)} label="Copiar link" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
