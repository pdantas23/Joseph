// catalogApi.ts
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ListProductsParams,
  ListProductsResponse,
} from "./catalogTypes";

// ─── Upload de imagem ─────────────────────────────────────────────────────────
export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/products/upload-image", {
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
  const response = await fetch("/api/products/delete-image", {
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

  const response = await fetch(`/api/products?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error("Erro ao carregar produtos.");
  return response.json();
}

// ─── Criar produto ────────────────────────────────────────────────────────────
export async function createProduct(payload: CreateProductPayload): Promise<Product> {
  const response = await fetch("/api/products", {
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
  const response = await fetch(`/api/products/${id}`, {
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
  const response = await fetch(`/api/products/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message || "Erro ao excluir produto.");
  }
}