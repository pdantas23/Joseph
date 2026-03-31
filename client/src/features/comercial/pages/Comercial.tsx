import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
} from "@/features/catalog/catalogApi";
import { Plus, Pencil, Trash2, X, ImagePlus, Loader2, Star, CheckCircle2, ChevronDown } from "lucide-react";
import type { Product, CreateProductPayload } from "@/features/catalog/catalogTypes";
import { PRODUCT_CATEGORIES, CATEGORY_LABELS } from "@/features/catalog/catalogTypes";

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

const NAV = [{ label: "Produtos", href: "/comercial" }];

// ─── Tipos internos ───────────────────────────────────────────────────────────

type UploadedImage = {
  id: string;
  path: string;
  previewUrl: string;
  uploading: boolean;
  error: string;
  isNew: boolean; // true = uploaded nesta sessão (sem referência no banco ainda)
};

type FormState = {
  nome: string;
  descricao: string;
  preco: string;
  categoria: (typeof PRODUCT_CATEGORIES)[number] | null;
  promocao: boolean;
  ativo: boolean;
};

const EMPTY_FORM: FormState = {
  nome: "", descricao: "", preco: "", categoria: null, promocao: false, ativo: true,
};

function makeId() { return Math.random().toString(36).slice(2); }

function extractPath(url: string): string {
  const marker = "/object/public/images-joseph/";
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : url;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Comercial() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [search, setSearch]       = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const [modalOpen, setModalOpen]             = useState(false);
  const [editingProduct, setEditingProduct]   = useState<Product | null>(null);
  const [formLoading, setFormLoading]         = useState(false);
  const [formError, setFormError]             = useState("");
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);

  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [images, setImages]     = useState<UploadedImage[]>([]);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading]             = useState(false);
  const [categoryOpen, setCategoryOpen]               = useState(false);
  const fileInputRef            = useRef<HTMLInputElement>(null);
  const pendingDeletesRef       = useRef<string[]>([]);
  const categoryRef             = useRef<HTMLDivElement>(null);

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeModal(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  useEffect(() => {
    if (!confirmDeleteTarget) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setConfirmDeleteTarget(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmDeleteTarget]);

  useEffect(() => {
    if (!categoryOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setCategoryOpen(false); }
    function onClickOutside(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [categoryOpen]);

  async function loadProducts() {
    setIsLoading(true); setPageError("");
    try {
      const [activeResult, inactiveResult] = await Promise.all([
        listProducts({ ativo: true }),
        listProducts({ ativo: false }),
      ]);
      const merged = [...activeResult.data, ...inactiveResult.data];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setProducts(merged);
    } catch { setPageError("Não foi possível carregar os produtos."); }
    finally { setIsLoading(false); }
  }

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.nome.toLowerCase().includes(s) || p.descricao.toLowerCase().includes(s);
  });

  function openCreate() {
    setEditingProduct(null); setForm(EMPTY_FORM); setImages([]); setFormError("");
    pendingDeletesRef.current = [];
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product); setFormError("");
    setForm({ nome: product.nome, descricao: product.descricao, preco: String(product.preco),
               categoria: product.categoria ?? null, promocao: product.promocao, ativo: product.ativo });
    const list: UploadedImage[] = [];
    if (product.imagem_url)
      list.push({ id: makeId(), path: extractPath(product.imagem_url), previewUrl: product.imagem_url, uploading: false, error: "", isNew: false });
    for (const img of product.imagens ?? [])
      list.push({ id: makeId(), path: extractPath(img.url), previewUrl: img.url, uploading: false, error: "", isNew: false });
    pendingDeletesRef.current = [];
    setImages(list); setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false); setEditingProduct(null); setForm(EMPTY_FORM);
    setImages([]); setFormError(""); setRemovingImageId(null);
    pendingDeletesRef.current = [];
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (fileInputRef.current) fileInputRef.current.value = "";
    const newImages: UploadedImage[] = files.map((file) => ({
      id: makeId(), path: "", previewUrl: URL.createObjectURL(file), uploading: true, error: "", isNew: true,
    }));
    setImages((prev) => [...prev, ...newImages]);
    await Promise.all(
      newImages.map(async (img, i) => {
        try {
          const path = await uploadProductImage(files[i]);
          setImages((prev) => prev.map((p) => p.id === img.id ? { ...p, path, uploading: false } : p));
        } catch (err) {
          setImages((prev) => prev.map((p) => p.id === img.id
            ? { ...p, uploading: false, error: err instanceof Error ? err.message : "Erro no upload" } : p));
        }
      })
    );
  }

  async function removeImage(id: string) {
    const target = images.find((img) => img.id === id);
    if (!target) return;
    try {
      setRemovingImageId(id);
      if (target.path) {
        if (target.isNew) {
          // Imagem carregada nesta sessão: sem referência no banco, pode deletar do storage imediatamente
          await deleteProductImage(target.path);
        } else {
          // Imagem que veio do produto salvo: adiamos a deleção para após o save com sucesso,
          // evitando imagem quebrada caso o usuário cancele sem salvar
          pendingDeletesRef.current = [...pendingDeletesRef.current, target.path];
        }
      }
      setImages((prev) => prev.filter((img) => img.id !== id));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível remover a imagem.");
    } finally { setRemovingImageId(null); }
  }

  function setCover(id: string) {
    setImages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }

  const anyUploading = images.some((i) => i.uploading);
  const isDisabled   = formLoading || anyUploading;
  const coverImage   = images[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (anyUploading || formLoading) return;

    setFormLoading(true);
    setFormError("");

    const preco = Number(String(form.preco).replace(",", "."));

    if (Number.isNaN(preco) || preco < 0) {
      setFormError("Informe um preço válido.");
      setFormLoading(false);
      return;
    }

    const ready = images.filter((i) => i.path && !i.error);
    const [capa, ...extras] = ready;

    const payload: CreateProductPayload = {
      nome: form.nome,
      descricao: form.descricao,
      preco,
      imagem_url: capa?.path ?? null,
      imagens_paths: extras.map((i) => i.path),
      categoria: form.categoria,
      promocao: form.promocao,
      ativo: form.ativo,
    };

    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, payload);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await createProduct(payload);
        setProducts((prev) => [created, ...prev]);
      }

      // Limpa do storage os arquivos que foram removidos durante a edição (best-effort)
      const toDelete = [...pendingDeletesRef.current];
      pendingDeletesRef.current = [];
      if (toDelete.length > 0) {
        await Promise.allSettled(toDelete.map((path) => deleteProductImage(path)));
      }

      closeModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar produto.");
    } finally {
      setFormLoading(false);
    }
  }

  function handleDeleteProduct(product: Product) {
    setConfirmDeleteTarget(product);
  }

  async function confirmDelete() {
    if (!confirmDeleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(confirmDeleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== confirmDeleteTarget.id));
      setConfirmDeleteTarget(null);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Erro ao excluir produto.");
      setConfirmDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <DashboardLayout navItems={NAV}>
      <div className="space-y-6 sm:space-y-8">

        {/* Cabeçalho */}
        <div className="flex flex-col gap-1">
          <p className="text-[9px] font-light tracking-[0.45em] uppercase" style={{ color: C.bege1 }}>
            Gestão
          </p>
          <h1 className="text-xl font-light" style={{ color: C.brown, fontFamily: "'Georgia', serif" }}>
            Produtos
          </h1>
          <p className="text-xs font-light" style={{ color: C.bege1 }}>
            Cadastre, edite e gerencie as peças da coleção
          </p>
        </div>

        {/* Busca + botão */}
        <div className="flex flex-row items-center justify-between gap-3">
          <div className="relative flex-1 min-w-0">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou descrição..."
              className="w-full py-2.5 pl-3 pr-14 text-xs font-light outline-none transition"
              style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.white, color: C.brown, borderRadius: "1px" }}
              onFocus={(e) => (e.target.style.borderColor = C.brown)}
              onBlur={(e) => (e.target.style.borderColor = C.bege3)} />
            {search && (
              <button type="button" onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-light tracking-[0.2em] uppercase transition hover:opacity-50"
                style={{ color: C.bege1, background: "none", border: "none", cursor: "pointer" }}>
                Limpar
              </button>
            )}
          </div>
          <button type="button" onClick={openCreate}
            className="flex items-center gap-2 py-2.5 px-5 text-[11px] font-medium tracking-[0.3em] uppercase transition hover:opacity-80"
            style={{ backgroundColor: C.brown, color: C.white, border: "none", cursor: "pointer", borderRadius: "1px" }}>
            <Plus className="h-3.5 w-3.5" />
            Nova peça
          </button>
        </div>

        {pageError && (
          <div className="px-4 py-3 text-xs font-light"
            style={{ backgroundColor: C.rose, color: "#8a5a55", border: `1px solid ${C.bege2}30` }}>
            {pageError}
          </div>
        )}

        {/* Lista */}
        <div style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.white }}>
          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <div className="h-5 w-5 rounded-full border border-t-transparent animate-spin"
                style={{ borderColor: C.bege2, borderTopColor: C.brown }} />
              <p className="text-[10px] tracking-[0.35em] uppercase font-light" style={{ color: C.bege1 }}>
                Carregando...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-xs font-light" style={{ color: C.bege1 }}>
                {search ? "Nenhuma peça encontrada." : "Nenhuma peça cadastrada ainda."}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((product, idx) => (
                <div key={product.id}
                  className="flex flex-wrap items-start gap-4 px-5 py-5 sm:items-center"
                  style={{ borderTop: idx === 0 ? "none" : `1px solid ${C.bege3}` }}>

                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden flex items-center justify-center rounded-sm"
                    style={{ backgroundColor: C.offwhite }}>
                    {product.imagem_url
                      ? <img src={product.imagem_url} alt={product.nome} className="h-full w-full object-cover" />
                      : <span className="text-[9px] font-light tracking-widest uppercase" style={{ color: C.bege2 }}>Foto</span>
                    }
                    {(product.imagens?.length ?? 0) > 0 && (
                      <div className="absolute bottom-0 right-0 px-1 text-[9px] font-light"
                        style={{ backgroundColor: "rgba(0,0,0,0.45)", color: C.white }}>
                        +{product.imagens.length + 1}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1" style={{ minWidth: "120px" }}>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <p className="text-sm font-normal truncate" style={{ color: C.brown }}>{product.nome}</p>
                      {product.promocao && (
                        <span className="text-[10px] tracking-widest uppercase font-light px-2 py-0.5"
                          style={{ backgroundColor: C.rose, color: C.roseDark }}>
                          Destaque
                        </span>
                      )}
                      {!product.ativo && (
                        <span className="text-[10px] tracking-widest uppercase font-light px-2 py-0.5"
                          style={{ backgroundColor: C.bege3, color: C.bege1 }}>
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-light mb-0.5" style={{ color: C.brown }}>
                      R$ {product.preco.toFixed(2).replace(".", ",")}
                    </p>
                    {product.categoria && (
                      <p className="text-[11px] font-light tracking-wider uppercase" style={{ color: C.bege1 }}>
                        {CATEGORY_LABELS[product.categoria]}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                    <button type="button" onClick={() => openEdit(product)}
                      className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-light tracking-[0.25em] uppercase transition hover:opacity-60"
                      style={{ color: C.brown, border: `1px solid ${C.bege3}`, background: "none", cursor: "pointer", borderRadius: "1px" }}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDeleteProduct(product)}
                      className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-light tracking-[0.25em] uppercase transition hover:opacity-60"
                      style={{ color: "#8a5a55", border: `1px solid ${C.bege2}`, background: "none", cursor: "pointer", borderRadius: "1px" }}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-right text-[10px] font-light" style={{ color: C.bege2 }}>
          {filtered.length} peça{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── MODAL ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={closeModal}>
          <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-white shadow-2xl"
            style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 bg-white"
              style={{ borderBottom: `1px solid ${C.bege3}` }}>
              <div>
                <p className="text-[9px] font-light tracking-[0.4em] uppercase" style={{ color: C.bege1 }}>
                  {editingProduct ? "Editar" : "Nova peça"}
                </p>
                <h2 className="text-base font-light" style={{ color: C.brown, fontFamily: "'Georgia', serif" }}>
                  {editingProduct ? editingProduct.nome : "Cadastrar produto"}
                </h2>
              </div>
              <button type="button" onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center transition hover:opacity-50"
                style={{ color: C.bege1, background: "none", border: "none", cursor: "pointer" }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Corpo */}
            <form onSubmit={handleSubmit} className="p-6 space-y-7 overflow-y-auto flex-1">
              {formError && (
                <div className="px-4 py-3 text-xs font-light"
                  style={{ backgroundColor: C.rose, color: "#8a5a55", border: `1px solid ${C.bege2}30` }}>
                  {formError}
                </div>
              )}

              {/* ── IMAGENS ──────────────────────────────────────────────── */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] tracking-[0.4em] uppercase font-light mb-1" style={{ color: C.bege1 }}>Imagens</p>
                    <p className="text-xs font-light" style={{ color: C.bege1 }}>
                      A primeira imagem é a capa. Clique em <Star className="inline h-3 w-3" style={{ color: C.roseDark }} /> para alterar.
                    </p>
                  </div>
                  <span className="text-[10px] font-light" style={{ color: C.bege2 }}>
                    {images.filter(i => i.path && !i.error).length} imagem(ns)
                  </span>
                </div>

                <div className="flex gap-4">
                  {/* Preview capa */}
                  <div className="relative h-36 w-36 shrink-0 overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: C.offwhite, border: `2px dashed ${coverImage?.previewUrl ? C.bege2 : C.bege3}` }}>
                    {coverImage?.previewUrl ? (
                      <>
                        <img src={coverImage.previewUrl} alt="Capa" className="h-full w-full object-cover" />
                        {coverImage.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                          </div>
                        )}
                        <div className="absolute top-1.5 left-1.5 px-2 py-0.5 text-[9px] font-light tracking-widest uppercase"
                          style={{ backgroundColor: C.rose, color: C.roseDark }}>Capa</div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <ImagePlus className="h-8 w-8" style={{ color: C.bege2 }} />
                        <span className="text-[10px] font-light" style={{ color: C.bege1 }}>Sem capa</span>
                      </div>
                    )}
                  </div>

                  {/* Grid miniaturas */}
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2">
                      {images.map((img, idx) => (
                        <div key={img.id} className="relative h-20 w-20 shrink-0 overflow-hidden"
                          style={{ border: `2px solid ${idx === 0 ? C.roseDark : C.bege3}`, backgroundColor: C.offwhite }}>
                          <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                          {img.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
                              <Loader2 className="h-5 w-5 animate-spin text-white" />
                            </div>
                          )}
                          {img.error && (
                            <div className="absolute inset-0 flex items-center justify-center p-1" style={{ backgroundColor: "rgba(180,50,50,0.7)" }}>
                              <span className="text-[9px] text-white text-center leading-tight">{img.error}</span>
                            </div>
                          )}
                          {!img.uploading && !img.error && img.path && idx !== 0 && (
                            <div className="absolute bottom-1 right-1">
                              <CheckCircle2 className="h-3.5 w-3.5 drop-shadow" style={{ color: "#6ee7b7" }} />
                            </div>
                          )}
                          {!img.uploading && (
                            <div className="absolute right-1 top-1 flex flex-col gap-1">
                              <button type="button" onClick={() => removeImage(img.id)}
                                disabled={removingImageId === img.id}
                                className="flex h-5 w-5 items-center justify-center transition hover:opacity-70 disabled:opacity-40"
                                style={{ backgroundColor: "rgba(0,0,0,0.55)", color: C.white, border: "none", cursor: "pointer", borderRadius: "50%" }}>
                                {removingImageId === img.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                              </button>
                              {idx !== 0 && img.path && (
                                <button type="button" onClick={() => setCover(img.id)}
                                  className="flex h-5 w-5 items-center justify-center transition hover:opacity-70"
                                  style={{ backgroundColor: "rgba(0,0,0,0.55)", color: C.white, border: "none", cursor: "pointer", borderRadius: "50%" }}>
                                  <Star className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Botão adicionar */}
                      <div>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple
                          onChange={handleFileChange} disabled={isDisabled}
                          className="hidden" id="comercial-images-input" />
                        <label htmlFor="comercial-images-input"
                          className={`flex h-20 w-20 flex-col items-center justify-center gap-1 cursor-pointer transition hover:opacity-70 ${isDisabled ? "pointer-events-none opacity-40" : ""}`}
                          style={{ border: `2px dashed ${C.bege3}`, backgroundColor: C.offwhite }}>
                          <ImagePlus className="h-5 w-5" style={{ color: C.bege2 }} />
                          <span className="text-[9px] font-light text-center" style={{ color: C.bege1 }}>
                            {anyUploading ? "Enviando" : "Adicionar"}
                          </span>
                        </label>
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] font-light" style={{ color: C.bege2 }}>
                      JPG, PNG, WEBP — máx. 5 MB por imagem
                    </p>
                  </div>
                </div>
              </section>

              <div className="h-px" style={{ backgroundColor: C.bege3 }} />

              {/* ── DADOS ───────────────────────────────────────────────── */}
              <section className="space-y-5">
                <p className="text-[9px] tracking-[0.4em] uppercase font-light" style={{ color: C.bege1 }}>Dados da peça</p>

                {/* Nome */}
                <div>
                  <label className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2" style={{ color: C.bege1 }}>
                    Nome *
                  </label>
                  <input type="text" value={form.nome} onChange={(e) => setField("nome", e.target.value)}
                    required placeholder="Ex: Vestido Linho Bege"
                    className="w-full py-2.5 px-3 text-sm font-light outline-none transition"
                    style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.offwhite, color: C.brown, borderRadius: "1px" }}
                    onFocus={(e) => (e.target.style.borderColor = C.brown)}
                    onBlur={(e) => (e.target.style.borderColor = C.bege3)} />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2" style={{ color: C.bege1 }}>
                    Descrição *
                  </label>
                  <textarea value={form.descricao} onChange={(e) => setField("descricao", e.target.value)}
                    required rows={3} placeholder="Descreva a peça..."
                    className="w-full resize-none py-2.5 px-3 text-sm font-light outline-none transition"
                    style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.offwhite, color: C.brown, borderRadius: "1px" }}
                    onFocus={(e) => (e.target.style.borderColor = C.brown)}
                    onBlur={(e) => (e.target.style.borderColor = C.bege3)} />
                </div>

                {/* Preço + Categoria */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2" style={{ color: C.bege1 }}>
                      Preço (R$) *
                    </label>
                    <input type="text" min="0" value={form.preco}
                      onChange={(e) => setField("preco", e.target.value)}
                      required placeholder="0,00"
                      className="w-full py-2.5 px-3 text-sm font-light outline-none transition h-10"
                      style={{ border: `1px solid ${C.bege3}`, backgroundColor: C.offwhite, color: C.brown, borderRadius: "1px" }}
                      onFocus={(e) => (e.target.style.borderColor = C.brown)}
                      onBlur={(e) => (e.target.style.borderColor = C.bege3)} />
                  </div>
                  <div>
                    <label className="block text-[9px] tracking-[0.35em] uppercase font-light mb-2" style={{ color: C.bege1 }}>
                      Categoria
                    </label>
                    <div ref={categoryRef} className="relative">
                      {/* Trigger */}
                      <button
                        type="button"
                        onClick={() => setCategoryOpen((o) => !o)}
                        className="w-full h-10 py-2.5 px-3 text-sm font-light flex items-center justify-between gap-2 transition"
                        style={{ border: `1px solid ${categoryOpen ? C.brown : C.bege3}`, backgroundColor: C.offwhite, color: form.categoria ? C.brown : C.bege1, borderRadius: "1px", cursor: "pointer" }}>
                        <span className="truncate">
                          {form.categoria ? CATEGORY_LABELS[form.categoria] : "Sem categoria"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform"
                          style={{ color: C.bege1, transform: categoryOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                      </button>
                      {/* Dropdown */}
                      {categoryOpen && (
                        <div className="absolute left-0 right-0 top-full z-30 max-h-[132px] overflow-y-auto"
                          style={{ border: `1px solid ${C.bege3}`, borderTop: "none", backgroundColor: C.white, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                          {PRODUCT_CATEGORIES.map((cat) => (
                            <button key={cat} type="button"
                              onClick={() => { setField("categoria", cat); setCategoryOpen(false); }}
                              className="w-full px-3 py-3 text-sm font-light text-left transition hover:opacity-60"
                              style={{
                                color: form.categoria === cat ? C.brown : C.bege1,
                                backgroundColor: form.categoria === cat ? C.offwhite : C.white,
                                border: "none", cursor: "pointer",
                                borderBottom: `1px solid ${C.bege3}`,
                              }}>
                              {CATEGORY_LABELS[cat]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={form.promocao} onChange={(e) => setField("promocao", e.target.checked)}
                      className="h-3.5 w-3.5" style={{ accentColor: C.brown }} />
                    <span className="text-xs font-light" style={{ color: C.brown }}>Marcar como destaque</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={form.ativo} onChange={(e) => setField("ativo", e.target.checked)}
                      className="h-3.5 w-3.5" style={{ accentColor: C.brown }} />
                    <span className="text-xs font-light" style={{ color: C.brown }}>Produto ativo (visível no catálogo)</span>
                  </label>
                </div>
              </section>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3">
                <div className="min-w-[140px]">
                  {!formLoading && (
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={anyUploading}
                      className="flex h-10 w-full items-center justify-center px-6 text-[11px] font-medium tracking-[0.3em] uppercase transition disabled:opacity-40 cursor-pointer"
                      style={{
                        backgroundColor: "transparent",
                        color: C.brown,
                        border: `1px solid ${C.bege3}`,
                        borderRadius: "1px",
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={formLoading || anyUploading}
                  className="relative flex h-10 min-w-[180px] items-center justify-center gap-2 px-6 text-[11px] font-medium uppercase transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    backgroundColor: C.brown,
                    color: C.white,
                    border: "none",
                    borderRadius: "1px",
                    appearance: "none",
                    WebkitAppearance: "none",
                    boxShadow: "none",
                    textTransform: "uppercase",
                    letterSpacing: "0.3em",
                    lineHeight: 1,
                  }}
                >
                  {(formLoading || anyUploading) && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 pointer-events-none" />
                  )}

                  <span
                    style={{
                      display: "inline-block",
                      whiteSpace: "nowrap",
                      lineHeight: 1,
                    }}
                  >
                    {formLoading
                      ? "Salvando..."
                      : anyUploading
                      ? "Aguardando uploads..."
                      : editingProduct
                      ? "Salvar alterações"
                      : "Cadastrar peça"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── MODAL DE CONFIRMAÇÃO DE EXCLUSÃO ────────────────────────────── */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => !deleteLoading && setConfirmDeleteTarget(null)}>
          <div className="w-full max-w-sm bg-white shadow-2xl"
            style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: `1px solid ${C.bege3}` }}>
              <div>
                <p className="text-[9px] font-light tracking-[0.4em] uppercase" style={{ color: C.bege1 }}>
                  Atenção
                </p>
                <h2 className="text-base font-light" style={{ color: C.brown, fontFamily: "'Georgia', serif" }}>
                  Excluir produto
                </h2>
              </div>
              <button type="button" onClick={() => !deleteLoading && setConfirmDeleteTarget(null)}
                className="flex h-8 w-8 items-center justify-center transition hover:opacity-50"
                style={{ color: C.bege1, background: "none", border: "none", cursor: "pointer" }}>
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Corpo */}
            <div className="px-6 py-5 space-y-5">
              <p className="text-sm font-light leading-relaxed" style={{ color: C.brown }}>
                Tem certeza que deseja excluir{" "}
                <span className="font-normal">"{confirmDeleteTarget.nome}"</span>?{" "}
                Esta ação não pode ser desfeita.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button type="button"
                  onClick={() => setConfirmDeleteTarget(null)}
                  disabled={deleteLoading}
                  className="flex h-9 items-center justify-center px-5 text-[11px] font-medium tracking-[0.25em] uppercase transition disabled:opacity-40 cursor-pointer"
                  style={{ backgroundColor: "transparent", color: C.brown, border: `1px solid ${C.bege3}`, borderRadius: "1px" }}>
                  Cancelar
                </button>
                <button type="button"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="flex h-9 items-center justify-center gap-2 px-5 text-[11px] font-medium tracking-[0.25em] uppercase transition disabled:opacity-40 cursor-pointer"
                  style={{ backgroundColor: "#8a5a55", color: C.white, border: "none", borderRadius: "1px" }}>
                  {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {deleteLoading ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
