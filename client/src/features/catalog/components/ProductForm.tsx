import { useState, useEffect, useRef } from "react";
import { PRODUCT_CATEGORIES } from "../catalogTypes";
import { uploadProductImage } from "../catalogApi";
import type { Product, CreateProductPayload } from "../catalogTypes";
import { ImagePlus, X, Loader2 } from "lucide-react";

type ProductFormProps = {
  initial?: Product | null;
  onSubmit: (payload: CreateProductPayload) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error: string;
};

type FormState = {
  nome: string;
  descricao: string;
  preco: number;
  imagem_url: string | null;   // path no bucket (ou URL pública já salva)
  categoria: (typeof PRODUCT_CATEGORIES)[number] | null;
  promocao: boolean;
  ativo: boolean;
};

const EMPTY: FormState = {
  nome: "",
  descricao: "",
  preco: 0,
  imagem_url: null,
  categoria: null,
  promocao: false,
  ativo: true,
};

export default function ProductForm({
  initial,
  onSubmit,
  onCancel,
  loading,
  error,
}: ProductFormProps) {
  const [form, setForm]               = useState<FormState>(EMPTY);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  // Popula o form ao editar
  useEffect(() => {
    if (initial) {
      setForm({
        nome:       initial.nome,
        descricao:  initial.descricao,
        preco:      initial.preco,
        imagem_url: initial.imagem_url ?? null,
        categoria:  initial.categoria  ?? null,
        promocao:   initial.promocao,
        ativo:      initial.ativo,
      });
      // Ao editar, exibe a imagem já salva como preview
      setPreviewUrl(initial.imagem_url ?? null);
    } else {
      setForm(EMPTY);
      setPreviewUrl(null);
    }
    setUploadError("");
  }, [initial]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ─── Selecionar arquivo e fazer upload imediatamente ─────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview local imediato
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
    setUploadError("");
    setUploading(true);

    try {
      const path = await uploadProductImage(file);
      set("imagem_url", path);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
      setPreviewUrl(form.imagem_url); // reverte preview para imagem anterior
    } finally {
      setUploading(false);
      // limpa o input para permitir re-seleção do mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleRemoveImage() {
    setPreviewUrl(null);
    set("imagem_url", null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    await onSubmit({
      nome:       form.nome,
      descricao:  form.descricao,
      preco:      Number(form.preco),
      imagem_url: form.imagem_url,
      categoria:  form.categoria,
      promocao:   form.promocao,
      ativo:      form.ativo,
    });
  }

  const isDisabled = loading || uploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Erro do formulário (vindo do pai) */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Nome */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Nome <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
          required
          placeholder="Ex: Case Premium iPhone 15"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        />
      </div>

      {/* Descrição */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Descrição <span className="text-red-500">*</span>
        </label>
        <textarea
          value={form.descricao}
          onChange={(e) => set("descricao", e.target.value)}
          required
          rows={3}
          placeholder="Descreva o produto..."
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        />
      </div>

      {/* Preço + Categoria */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Preço (R$) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.preco}
            onChange={(e) => set("preco", parseFloat(e.target.value) || 0)}
            required
            placeholder="0.00"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Categoria
          </label>
          <select
            value={form.categoria ?? ""}
            onChange={(e) =>
              set("categoria", e.target.value ? (e.target.value as FormState["categoria"]) : null)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          >
            <option value="">Sem categoria</option>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload de imagem */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          Imagem do produto
        </label>

        <div className="flex items-start gap-4">
          {/* Preview */}
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-stone-50">
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                {!uploading && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Remover imagem"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-stone-300">
                <ImagePlus className="h-8 w-8" />
                <span className="text-[10px] text-stone-400">Sem imagem</span>
              </div>
            )}
          </div>

          {/* Botão de seleção */}
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isDisabled}
              className="hidden"
              id="product-image-input"
            />
            <label
              htmlFor="product-image-input"
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${isDisabled ? "pointer-events-none opacity-50" : ""}`}
            >
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Enviando..." : previewUrl ? "Trocar imagem" : "Selecionar imagem"}
            </label>
            <p className="text-xs text-slate-400">JPG, PNG, WEBP — máx. 5 MB</p>
            {uploadError && (
              <p className="text-xs text-red-600">{uploadError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Promoção + Ativo */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.promocao}
            onChange={(e) => set("promocao", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-amber-500"
          />
          <span className="text-sm font-medium text-slate-700">
            🏷 Marcar como promoção
          </span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => set("ativo", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-slate-700"
          />
          <span className="text-sm font-medium text-slate-700">
            Produto ativo (visível no catálogo)
          </span>
        </label>
      </div>

      {/* Ações */}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isDisabled}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isDisabled}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Salvando..." : uploading ? "Aguardando upload..." : initial ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}
