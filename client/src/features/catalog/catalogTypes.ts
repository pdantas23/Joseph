// ─── Categorias ───────────────────────────────────────────────────────────────

export const PRODUCT_CATEGORIES = [
  "vestidos",
  "blusas",
  "calças",
  "saias",
  "conjuntos",
  "acessórios",
  "outros",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

// Label de exibição para cada categoria
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  vestidos:    "Vestidos",
  blusas:      "Blusas",
  "calças":    "Calças",
  saias:       "Saias",
  conjuntos:   "Conjuntos",
  "acessórios": "Acessórios",
  outros:      "Outros",
};

// ─── Imagem adicional ─────────────────────────────────────────────────────────

export type ProductImage = {
  id: string;
  produto_id: string;
  url: string;       // URL pública montada pelo service
  ordem: number;
};

// ─── Produto ──────────────────────────────────────────────────────────────────

export type Product = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  imagem_url: string | null;
  imagens: ProductImage[];   // imagens adicionais
  categoria: ProductCategory | null;
  promocao: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

// ─── Payloads ─────────────────────────────────────────────────────────────────

export type CreateProductPayload = {
  nome: string;
  descricao: string;
  preco: number;
  imagem_url?: string | null;
  imagens_paths?: string[];   // paths das imagens adicionais
  categoria?: ProductCategory | null;
  promocao?: boolean;
  ativo?: boolean;
};

export type UpdateProductPayload = Partial<CreateProductPayload>;

// ─── Listagem ─────────────────────────────────────────────────────────────────

export type ListProductsParams = {
  search?: string;
  promocao?: boolean;
  ativo?: boolean;
};

export type ListProductsResponse = {
  data: Product[];
  total: number;
};