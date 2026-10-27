import { API_BASE_URL } from "@/lib/api";
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ListProductsParams,
  ListProductsResponse,
  ProductVariation,
  VariationPayload,
} from "./catalogTypes";

// ─── Upload de imagem ─────────────────────────────────────────────────────────
export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE_URL}/api/products/upload-image`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao fazer upload da imagem.");
  return data.path as string;
}

// ─── Remover imagem ───────────────────────────────────────────────────────────
export async function deleteProductImage(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/products/delete-image`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao remover a imagem.");
}

// ─── Listar produtos ──────────────────────────────────────────────────────────
export async function listProducts(params: ListProductsParams = {}): Promise<ListProductsResponse> {
  const query = new URLSearchParams();
  if (params.search)                 query.set("search",   params.search);
  if (params.promocao !== undefined) query.set("promocao", String(params.promocao));
  if (params.ativo    !== undefined) query.set("ativo",    String(params.ativo));

  const response = await fetch(`${API_BASE_URL}/api/products?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error("Erro ao carregar produtos.");
  return response.json();
}

// ─── Criar produto ────────────────────────────────────────────────────────────
export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao criar produto.");
  return data as Product;
}

// ─── Atualizar produto ────────────────────────────────────────────────────────
export async function updateProduct(id: string, payload: UpdateProductPayload): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Erro ao atualizar produto.");
  return data as Product;
}

// ─── Excluir produto ──────────────────────────────────────────────────────────
export async function deleteProduct(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "Erro ao excluir produto.");
  }
}

// ─── Variações (painel) ─────────────────────────────────────────────────────
async function lerJson(response: Response, padrao: string) {
  let data: any = null;
  try { data = await response.json(); } catch { /* sem corpo */ }
  if (!response.ok) throw new Error(data?.message || padrao);
  return data;
}

export async function createVariation(produtoId: string, payload: VariationPayload): Promise<ProductVariation> {
  const response = await fetch(`${API_BASE_URL}/api/products/${produtoId}/variacoes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return lerJson(response, "Erro ao criar variação.");
}

export async function updateVariation(
  produtoId: string,
  variacaoId: string,
  payload: Partial<VariationPayload>
): Promise<ProductVariation> {
  const response = await fetch(`${API_BASE_URL}/api/products/${produtoId}/variacoes/${variacaoId}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return lerJson(response, "Erro ao atualizar variação.");
}

export async function deleteVariation(produtoId: string, variacaoId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/products/${produtoId}/variacoes/${variacaoId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await lerJson(response, "Erro ao excluir variação.");
}

// ─── Catálogo público compartilhado ─────────────────────────────────────────
// A Home tem várias seções lendo os mesmos produtos ativos: uma requisição só
// por carregamento de página. Em erro, a próxima chamada tenta de novo.
let catalogoPublico: Promise<ListProductsResponse> | null = null;

export function carregarCatalogoPublico(): Promise<ListProductsResponse> {
  if (!catalogoPublico) {
    catalogoPublico = listProducts({ ativo: true }).catch((err) => {
      catalogoPublico = null;
      throw err;
    });
  }
  return catalogoPublico;
}
