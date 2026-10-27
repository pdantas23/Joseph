import { useRef, useState } from "react";
import { useRegistrarOverlay } from "@/contexts/OverlayContext";
import { X, Plus, Trash2, Loader2, ImagePlus, ArrowUp, ArrowDown } from "lucide-react";
import type { Product, ProductVariation } from "@/features/catalog/catalogTypes";
import {
  createVariation,
  deleteVariation,
  updateVariation,
  uploadProductImage,
} from "@/features/catalog/catalogApi";
import { formatarPreco } from "@/features/catalog/variantUtils";
import { C, FONT_SERIF } from "@/lib/josephTheme";

/**
 * CRUD mínimo de variações de um produto (painel comercial).
 * Para roupa, cada variação é uma combinação de tamanho e cor
 * (ex.: "M · Off-white"), com foto, preço e código próprios se precisar.
 * Preço vazio = usa o preço do produto. Descrição vazia = usa a do produto.
 */

type Rascunho = {
  id: string | null;          // null = nova
  nome: string;
  preco: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  imagens: { path: string; url: string }[];
};

const STORAGE_MARKER = "/storage/v1/object/public/images-joseph/";
function pathDaUrl(url: string): string {
  const i = url.indexOf(STORAGE_MARKER);
  return i >= 0 ? url.slice(i + STORAGE_MARKER.length) : url;
}

function deVariacao(v: ProductVariation): Rascunho {
  return {
    id: v.id,
    nome: v.nome,
    preco: v.preco === null ? "" : String(v.preco).replace(".", ","),
    codigo: v.codigo_fornecedor ?? "",
    descricao: v.descricao ?? "",
    ativo: v.ativo,
    imagens: v.imagens.map((i) => ({ path: pathDaUrl(i.url), url: i.url })),
  };
}

const VAZIO: Rascunho = { id: null, nome: "", preco: "", codigo: "", descricao: "", ativo: true, imagens: [] };

type Props = {
  product: Product;
  onClose: () => void;
  onChange: (variacoes: ProductVariation[]) => void;
};

export default function VariationsManager({ product, onClose, onChange }: Props) {
  const [lista, setLista] = useState<ProductVariation[]>(
    [...(product.variacoes ?? [])].sort((a, b) => a.ordem - b.ordem)
  );
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useRegistrarOverlay(true); // montado = aberto

  function atualizar(nova: ProductVariation[]) {
    const ord = [...nova].sort((a, b) => a.ordem - b.ordem);
    setLista(ord);
    onChange(ord);
  }

  async function salvar() {
    if (!editando) return;
    setErro("");
    if (!editando.nome.trim()) { setErro("Informe o nome da variação."); return; }
    let preco: number | null = null;
    if (editando.preco.trim()) {
      const t = editando.preco.trim();
      preco = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
      if (Number.isNaN(preco) || preco < 0) { setErro("Preço inválido."); return; }
    }
    const payload = {
      nome: editando.nome.trim(),
      preco,
      codigo_fornecedor: editando.codigo.trim() || null,
      descricao: editando.descricao.trim() || null,
      ativo: editando.ativo,
      imagens_paths: editando.imagens.map((i) => i.path),
    };
    setSalvando(true);
    try {
      if (editando.id) {
        const v = await updateVariation(product.id, editando.id, payload);
        atualizar(lista.map((x) => (x.id === v.id ? v : x)));
      } else {
        const v = await createVariation(product.id, payload);
        atualizar([...lista, v]);
      }
      setEditando(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar variação.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(v: ProductVariation) {
    if (!window.confirm(`Excluir a variação "${v.nome}"? As fotos dela também saem.`)) return;
    setErro("");
    try {
      await deleteVariation(product.id, v.id);
      atualizar(lista.filter((x) => x.id !== v.id));
      if (editando?.id === v.id) setEditando(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao excluir variação.");
    }
  }

  async function mover(v: ProductVariation, dir: -1 | 1) {
    const i = lista.findIndex((x) => x.id === v.id);
    const j = i + dir;
    if (j < 0 || j >= lista.length) return;
    const outro = lista[j];
    setErro("");
    try {
      const [a, b] = await Promise.all([
        updateVariation(product.id, v.id, { ordem: outro.ordem === v.ordem ? j : outro.ordem }),
        updateVariation(product.id, outro.id, { ordem: outro.ordem === v.ordem ? i : v.ordem }),
      ]);
      atualizar(lista.map((x) => (x.id === a.id ? a : x.id === b.id ? b : x)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao reordenar.");
    }
  }

  async function enviarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (!files.length || !editando) return;
    setEnviando(true);
    setErro("");
    try {
      const novas: { path: string; url: string }[] = [];
      for (const f of files) {
        const path = await uploadProductImage(f);
        novas.push({ path, url: URL.createObjectURL(f) });
      }
      setEditando((r) => (r ? { ...r, imagens: [...r.imagens, ...novas] } : r));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro no upload.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = "w-full rounded-sm px-3 py-2 text-xs font-light outline-none";
  const estiloCampo = { border: `1px solid ${C.bege2}`, backgroundColor: C.offwhite, color: C.brown };
  const rotulo = "mb-1 block text-[9px] font-light uppercase tracking-[0.3em]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: "rgba(51,51,51,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white"
        style={{ boxShadow: "0 30px 80px rgba(51,51,51,0.20)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${C.bege3}` }}>
          <div className="min-w-0">
            <p className="text-[9px] font-light uppercase tracking-[0.4em]" style={{ color: C.muted }}>Variações</p>
            <p className="truncate text-base font-light" style={{ color: C.brown, fontFamily: FONT_SERIF }}>{product.nome}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: C.bege3, color: C.brown, border: "none", cursor: "pointer" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {erro && (
            <div className="mb-3 rounded-sm px-3 py-2 text-xs" style={{ background: "#F6ECEA", color: "#8a5a55", border: `1px solid ${"#E3C7C1"}` }}>
              {erro}
            </div>
          )}

          {lista.length === 0 && !editando && (
            <p className="py-6 text-center text-xs font-light" style={{ color: C.muted }}>
              Sem variações. O produto aparece no site com um preço e uma galeria só.
            </p>
          )}

          <ul className="space-y-2">
            {lista.map((v, i) => (
              <li key={v.id} className="flex items-center gap-3 rounded-md p-2" style={{ border: `1px solid ${C.bege2}` }}>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded" style={{ background: C.bege3 }}>
                  {v.imagens[0] && <img src={v.imagens[0].url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium" style={{ color: C.brown }}>{v.nome}</p>
                  <p className="text-[10px] font-light" style={{ color: C.muted }}>
                    {v.preco === null ? `Preço do produto (${formatarPreco(product.preco)})` : formatarPreco(v.preco)}
                    {v.codigo_fornecedor ? `  ·  ${v.codigo_fornecedor}` : ""}
                    {`  ·  ${v.imagens.length} foto(s)`}
                    {!v.ativo ? "  ·  inativa" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => mover(v, -1)}
                    className="flex h-7 w-7 items-center justify-center rounded disabled:opacity-30"
                    style={{ border: `1px solid ${C.bege2}`, background: "none", cursor: "pointer", color: C.brown }}>
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button type="button" aria-label="Descer" disabled={i === lista.length - 1} onClick={() => mover(v, 1)}
                    className="flex h-7 w-7 items-center justify-center rounded disabled:opacity-30"
                    style={{ border: `1px solid ${C.bege2}`, background: "none", cursor: "pointer", color: C.brown }}>
                    <ArrowDown className="h-3 w-3" />
                  </button>
                  <button type="button" onClick={() => setEditando(deVariacao(v))}
                    className="rounded px-2.5 py-1.5 text-[10px] uppercase tracking-[0.15em]"
                    style={{ border: `1px solid ${C.bege2}`, background: "none", cursor: "pointer", color: C.brown }}>
                    Editar
                  </button>
                  <button type="button" aria-label="Excluir" onClick={() => excluir(v)}
                    className="flex h-7 w-7 items-center justify-center rounded"
                    style={{ border: `1px solid ${"#E3C7C1"}`, background: "#F6ECEA", cursor: "pointer", color: "#8a5a55" }}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {editando ? (
            <div className="mt-4 space-y-3 rounded-md p-3" style={{ border: `1px dashed ${C.brown}` }}>
              <p className="text-[10px] font-medium uppercase tracking-[0.25em]" style={{ color: C.brown }}>
                {editando.id ? "Editar variação" : "Nova variação"}
              </p>
              <div>
                <label className={rotulo} style={{ color: C.muted }}>Nome *</label>
                <input className={campo} style={estiloCampo} value={editando.nome} placeholder="Ex.: M · Off-white"
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={rotulo} style={{ color: C.muted }}>Preço (vazio = do produto)</label>
                  <input className={campo} style={estiloCampo} value={editando.preco} inputMode="decimal"
                    placeholder={String(product.preco).replace(".", ",")}
                    onChange={(e) => setEditando({ ...editando, preco: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo} style={{ color: C.muted }}>Código (referência)</label>
                  <input className={campo} style={estiloCampo} value={editando.codigo}
                    onChange={(e) => setEditando({ ...editando, codigo: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={rotulo} style={{ color: C.muted }}>Descrição (vazio = do produto)</label>
                <textarea className={`${campo} resize-y`} style={estiloCampo} rows={3} value={editando.descricao}
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} />
              </div>
              <div>
                <label className={rotulo} style={{ color: C.muted }}>Fotos da variação</label>
                <div className="flex flex-wrap gap-2">
                  {editando.imagens.map((img, k) => (
                    <div key={img.path + k} className="relative h-16 w-16 overflow-hidden rounded" style={{ border: `1px solid ${k === 0 ? C.brown : C.bege2}` }}>
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      <button type="button" aria-label="Tirar foto"
                        onClick={() => setEditando({ ...editando, imagens: editando.imagens.filter((_, x) => x !== k) })}
                        className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full"
                        style={{ background: "rgba(0,0,0,0.55)", color: C.white, border: "none", cursor: "pointer" }}>
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded" style={{ border: `1px dashed ${C.bege2}`, background: C.bege3 }}>
                    {enviando ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: C.muted }} /> : <ImagePlus className="h-4 w-4" style={{ color: C.muted }} />}
                    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={enviarFotos} disabled={enviando} />
                  </label>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs" style={{ color: C.brown }}>
                <input type="checkbox" checked={editando.ativo} style={{ accentColor: C.brown }}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })} />
                Ativa (aparece no site)
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditando(null)}
                  className="rounded-sm px-4 py-2 text-[10px] uppercase tracking-[0.2em]"
                  style={{ border: `1px solid ${C.bege2}`, background: "none", color: C.brown, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button type="button" onClick={salvar} disabled={salvando || enviando}
                  className="rounded-sm px-4 py-2 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40"
                  style={{ background: C.brown, color: C.white, border: "none", cursor: "pointer" }}>
                  {salvando ? "Salvando..." : "Salvar variação"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setEditando({ ...VAZIO })}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-sm py-2.5 text-[10px] uppercase tracking-[0.25em]"
              style={{ border: `1px dashed ${C.bege2}`, background: C.offwhite, color: C.brown, cursor: "pointer" }}>
              <Plus className="h-3 w-3" /> Nova variação
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
