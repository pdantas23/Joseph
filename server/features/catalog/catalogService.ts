import { createSupabaseAdminClient } from "../../lib/supabase";
import { comRetentativa } from "../../lib/retentativa";
import { slugify } from "../../../shared/slug";
import type {
  Product,
  ProductImage,
  ProductVariation,
  CreateProductPayload,
  UpdateProductPayload,
  ListProductsParams,
  ListProductsResponse,
  VariationPayload,
  UpdateVariationPayload,
} from "./catalogTypes";

const STORAGE_BUCKET = "images-joseph";
const TABLE          = "produtos_joseph";
const TABLE_IMGS     = "produtos_imagens_joseph";
const TABLE_VARS     = "produtos_variacoes_joseph";

type Supa = ReturnType<typeof createSupabaseAdminClient>;

// ─── Helper: URL pública ──────────────────────────────────────────────────────
export function getPublicImageUrl(supabaseUrl: string, path: string | null): string | null {
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

// ─── Upload de imagem ─────────────────────────────────────────────────────────
export async function uploadProductImageService(file: Express.Multer.File): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const ext      = file.originalname.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = `produtos/${filename}`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file.buffer, { contentType: file.mimetype, upsert: false });

  if (error) throw new Error(`Erro no upload: ${error.message}`);
  return filePath;
}

// Erro de "coluna/tabela não existe" (migration 003 ainda não aplicada).
// Com ele, a API segue como antes: produto sem variação e sem os campos novos.
function isMissingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||           // undefined_table
    error.code === "42703" ||           // undefined_column
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    /does not exist|could not find/i.test(error.message ?? "")
  );
}

const SEM_MIGRATION_VARIACOES =
  "As variações ainda não estão ativas no banco (falta aplicar a migration 003_variacoes_joseph.sql).";

/** Erro de escrita em variação: sem a migration, mensagem clara para o painel. */
function erroVariacao(error: { code?: string; message?: string }): Error {
  return new Error(isMissingSchemaError(error) ? SEM_MIGRATION_VARIACOES : error.message ?? "Erro na variação.");
}

type ImgRow = { id: string; produto_id: string; variacao_id?: string | null; path: string; ordem: number };

// ─── Helper: buscar imagens (do produto e das variações) ─────────────────────
async function fetchImagens(
  supabase: Supa,
  supabaseUrl: string,
  produtoIds: string[]
): Promise<{ porProduto: Record<string, ProductImage[]>; porVariacao: Record<string, ProductImage[]> }> {
  const porProduto: Record<string, ProductImage[]> = {};
  const porVariacao: Record<string, ProductImage[]> = {};
  if (produtoIds.length === 0) return { porProduto, porVariacao };

  let rows: ImgRow[] = [];
  const withVar = await supabase
    .from(TABLE_IMGS)
    .select("id, produto_id, variacao_id, path, ordem")
    .in("produto_id", produtoIds)
    .order("ordem", { ascending: true });

  if (withVar.error && isMissingSchemaError(withVar.error)) {
    // Banco ainda sem a coluna variacao_id: tudo é imagem do produto.
    const legacy = await supabase
      .from(TABLE_IMGS)
      .select("id, produto_id, path, ordem")
      .in("produto_id", produtoIds)
      .order("ordem", { ascending: true });
    if (legacy.error) throw new Error(legacy.error.message);
    rows = (legacy.data ?? []) as ImgRow[];
  } else if (withVar.error) {
    throw new Error(withVar.error.message);
  } else {
    rows = (withVar.data ?? []) as ImgRow[];
  }

  for (const row of rows) {
    const img: ProductImage = {
      id:          row.id,
      produto_id:  row.produto_id,
      variacao_id: row.variacao_id ?? null,
      url:         getPublicImageUrl(supabaseUrl, row.path)!,
      ordem:       row.ordem,
    };
    if (row.variacao_id) {
      (porVariacao[row.variacao_id] ??= []).push(img);
    } else {
      (porProduto[row.produto_id] ??= []).push(img);
    }
  }
  return { porProduto, porVariacao };
}

// ─── Helper: buscar variações de vários produtos ─────────────────────────────
async function fetchVariacoes(
  supabase: Supa,
  produtoIds: string[],
  porVariacao: Record<string, ProductImage[]>,
  apenasAtivas: boolean
): Promise<Record<string, ProductVariation[]>> {
  const map: Record<string, ProductVariation[]> = {};
  if (produtoIds.length === 0) return map;

  let query = supabase
    .from(TABLE_VARS)
    .select("*")
    .in("produto_id", produtoIds)
    .order("ordem", { ascending: true });
  if (apenasAtivas) query = query.eq("ativo", true);

  const { data, error } = await query;
  if (error) {
    if (isMissingSchemaError(error)) return map; // migration não aplicada: sem variações
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    (map[row.produto_id] ??= []).push({
      ...row,
      preco:   row.preco === null || row.preco === undefined ? null : Number(row.preco),
      imagens: porVariacao[row.id] ?? [],
    } as ProductVariation);
  }
  return map;
}

// Monta o produto como a API devolve.
async function hydrate(supabase: Supa, rows: any[], apenasVariacoesAtivas: boolean): Promise<Product[]> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const ids = rows.map((r) => r.id);
  const { porProduto, porVariacao } = await fetchImagens(supabase, supabaseUrl, ids);
  const varMap = await fetchVariacoes(supabase, ids, porVariacao, apenasVariacoesAtivas);

  return rows.map((row) => ({
    ...row,
    preco:             Number(row.preco),
    colecao:           row.colecao ?? null,
    slug:              row.slug ?? null,
    codigo_fornecedor: row.codigo_fornecedor ?? null,
    imagem_url:        row.imagem_url ? getPublicImageUrl(supabaseUrl, row.imagem_url) : null,
    imagens:           porProduto[row.id] ?? [],
    variacoes:         varMap[row.id] ?? [],
  })) as Product[];
}

// ─── Helper: salvar imagens adicionais ───────────────────────────────────────
async function saveImagens(supabase: Supa, produtoId: string, paths: string[], variacaoId: string | null = null): Promise<void> {
  if (paths.length === 0) return;
  const rows = paths.map((path, i) => ({
    produto_id: produtoId,
    path,
    ordem: i,
    ...(variacaoId ? { variacao_id: variacaoId } : {}),
  }));
  const { error } = await supabase.from(TABLE_IMGS).insert(rows);
  if (error) throw new Error(error.message);
}

// ─── Helper: remover imagem do storage ───────────────────────────────────────
async function removeImagem(supabase: Supa, path: string): Promise<void> {
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

// ─── Service: remover imagem do produto ──────────────────────────────────────
export async function deleteProductImageService(path: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  await removeImagem(supabase, path);
}

// ─── Helper: substituir imagens adicionais DO PRODUTO ────────────────────────
// Só mexe nas imagens sem variação: as das variações ficam intactas.
async function replaceImagens(supabase: Supa, produtoId: string, paths: string[]): Promise<void> {
  const del = await supabase
    .from(TABLE_IMGS)
    .delete()
    .eq("produto_id", produtoId)
    .is("variacao_id", null);
  if (del.error && isMissingSchemaError(del.error)) {
    await supabase.from(TABLE_IMGS).delete().eq("produto_id", produtoId);
  } else if (del.error) {
    throw new Error(del.error.message);
  }
  await saveImagens(supabase, produtoId, paths);
}

function textoOuNull(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

// ─── Slug único ───────────────────────────────────────────────────────────────
async function slugDisponivel(supabase: Supa, base: string, ignorarId?: string): Promise<string> {
  const raiz = base || "produto";
  for (let i = 1; i < 100; i++) {
    const candidato = i === 1 ? raiz : `${raiz}-${i}`;
    let q = supabase.from(TABLE).select("id").eq("slug", candidato).limit(1);
    if (ignorarId) q = q.neq("id", ignorarId);
    const { data, error } = await q;
    if (error) {
      if (isMissingSchemaError(error)) return candidato;
      throw new Error(error.message);
    }
    if (!data || data.length === 0) return candidato;
  }
  return `${raiz}-${Date.now()}`;
}

// ─── Listar produtos ──────────────────────────────────────────────────────────
export async function listProductsService(params: ListProductsParams = {}): Promise<ListProductsResponse> {
  return comRetentativa(() => listarProdutos(params));
}

async function listarProdutos(params: ListProductsParams): Promise<ListProductsResponse> {
  const supabase = createSupabaseAdminClient();

  let query = supabase.from(TABLE).select("*", { count: "exact" }).order("created_at", { ascending: false });

  if (params.search?.trim()) {
    const s = params.search.trim();
    query = query.or(`nome.ilike.*${s}*,descricao.ilike.*${s}*`);
  }
  if (params.promocao !== undefined) query = query.eq("promocao", params.promocao);
  if (params.ativo    !== undefined) query = query.eq("ativo",    params.ativo);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  // Catálogo público (ativo=true) só recebe variações ativas; o painel recebe todas.
  const products = await hydrate(supabase, data ?? [], params.ativo === true);
  return { data: products, total: count ?? 0 };
}

// ─── Buscar por ID ou slug ────────────────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProductByIdService(idOrSlug: string): Promise<Product> {
  return comRetentativa(() => buscarProduto(idOrSlug));
}

async function buscarProduto(idOrSlug: string): Promise<Product> {
  const supabase = createSupabaseAdminClient();
  const col = UUID_RE.test(idOrSlug) ? "id" : "slug";
  const { data, error } = await supabase.from(TABLE).select("*").eq(col, idOrSlug).single();
  if (error) throw new Error(error.message);

  const [product] = await hydrate(supabase, [data], false);
  return product;
}

// ─── Criar produto ────────────────────────────────────────────────────────────
export async function createProductService(payload: CreateProductPayload): Promise<Product> {
  const supabase = createSupabaseAdminClient();

  const row: Record<string, unknown> = {
    nome:       payload.nome.trim(),
    descricao:  payload.descricao.trim(),
    preco:      payload.preco,
    imagem_url: payload.imagem_url ?? null,
    categoria:  payload.categoria  ?? null,
    promocao:   payload.promocao   ?? false,
    ativo:      payload.ativo      ?? true,
  };

  // Campos novos (migration 003). Se o banco ainda não tiver as colunas,
  // grava só os campos antigos, para o painel seguir funcionando.
  const novos: Record<string, unknown> = {
    colecao:           textoOuNull(payload.colecao),
    codigo_fornecedor: textoOuNull(payload.codigo_fornecedor),
    slug:              await slugDisponivel(supabase, slugify(textoOuNull(payload.slug) ?? payload.nome)),
  };

  let res = await supabase.from(TABLE).insert([{ ...row, ...novos }]).select().single();
  if (res.error && isMissingSchemaError(res.error)) {
    res = await supabase.from(TABLE).insert([row]).select().single();
  }
  const { data, error } = res;
  if (error) throw new Error(error.message);

  if (payload.imagens_paths?.length) {
    await saveImagens(supabase, data.id, payload.imagens_paths);
  }

  const [product] = await hydrate(supabase, [data], false);
  return product;
}

// ─── Excluir produto ──────────────────────────────────────────────────────────
export async function deleteProductService(id: string): Promise<void> {
  const supabase = createSupabaseAdminClient();

  // 1. Verificar existência e obter path da imagem de capa
  const { data: product, error: fetchError } = await supabase
    .from(TABLE).select("imagem_url").eq("id", id).single();
  if (fetchError) throw new Error("Produto não encontrado.");

  // 2. Buscar paths das imagens adicionais (inclui as das variações)
  const { data: extraImgs } = await supabase
    .from(TABLE_IMGS).select("path").eq("produto_id", id);

  // 3. Excluir registros de imagens adicionais (filhos primeiro)
  await supabase.from(TABLE_IMGS).delete().eq("produto_id", id);

  // 4. Excluir o produto (as variações saem junto pelo ON DELETE CASCADE)
  const { error: deleteError } = await supabase.from(TABLE).delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);

  // 5. Remover arquivos do storage (best-effort: falha não bloqueia a resposta)
  const paths = new Set<string>();
  if ((product as any).imagem_url) paths.add((product as any).imagem_url);
  for (const img of extraImgs ?? []) if ((img as any).path) paths.add((img as any).path);
  if (paths.size > 0) {
    await Promise.allSettled([...paths].map((p) => removeImagem(supabase, p)));
  }
}

// ─── Atualizar produto ────────────────────────────────────────────────────────
export async function updateProductService(id: string, payload: UpdateProductPayload): Promise<Product> {
  const supabase = createSupabaseAdminClient();

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (payload.nome       !== undefined) updateData.nome       = payload.nome.trim();
  if (payload.descricao  !== undefined) updateData.descricao  = payload.descricao.trim();
  if (payload.preco      !== undefined) updateData.preco      = payload.preco;
  if (payload.imagem_url !== undefined) updateData.imagem_url = payload.imagem_url;
  if (payload.categoria  !== undefined) updateData.categoria  = payload.categoria;
  if (payload.promocao   !== undefined) updateData.promocao   = payload.promocao;
  if (payload.ativo      !== undefined) updateData.ativo      = payload.ativo;

  // Campos novos: só vão no UPDATE se vierem no payload (o painel atual não manda
  // nada disso sem a migration e o update antigo segue igual).
  const novos: Record<string, unknown> = {};
  if (payload.colecao           !== undefined) novos.colecao           = textoOuNull(payload.colecao);
  if (payload.codigo_fornecedor !== undefined) novos.codigo_fornecedor = textoOuNull(payload.codigo_fornecedor);
  if (payload.slug              !== undefined) {
    const s = textoOuNull(payload.slug);
    novos.slug = s ? await slugDisponivel(supabase, slugify(s), id) : null;
  }

  let res = await supabase.from(TABLE).update({ ...updateData, ...novos }).eq("id", id).select().single();
  if (res.error && isMissingSchemaError(res.error) && Object.keys(novos).length > 0) {
    res = await supabase.from(TABLE).update(updateData).eq("id", id).select().single();
  }
  const { data, error } = res;
  if (error) throw new Error(error.message);

  if (payload.imagens_paths !== undefined) {
    await replaceImagens(supabase, id, payload.imagens_paths);
  }

  const [product] = await hydrate(supabase, [data], false);
  return product;
}

// ═══ Variações ════════════════════════════════════════════════════════════════

async function getVariacao(supabase: Supa, produtoId: string, variacaoId: string): Promise<ProductVariation> {
  const { data, error } = await supabase
    .from(TABLE_VARS)
    .select("*")
    .eq("id", variacaoId)
    .eq("produto_id", produtoId)
    .single();
  if (error) throw new Error(error.message);

  const { porVariacao } = await fetchImagens(supabase, process.env.SUPABASE_URL!, [produtoId]);
  return {
    ...data,
    preco:   data.preco === null ? null : Number(data.preco),
    imagens: porVariacao[data.id] ?? [],
  } as ProductVariation;
}

async function replaceImagensVariacao(supabase: Supa, produtoId: string, variacaoId: string, paths: string[]) {
  const { error } = await supabase.from(TABLE_IMGS).delete().eq("variacao_id", variacaoId);
  if (error) throw new Error(error.message);
  await saveImagens(supabase, produtoId, paths, variacaoId);
}

export async function createVariationService(produtoId: string, payload: VariationPayload): Promise<ProductVariation> {
  const supabase = createSupabaseAdminClient();

  let ordem = payload.ordem;
  if (ordem === undefined) {
    const { data: ult } = await supabase
      .from(TABLE_VARS)
      .select("ordem")
      .eq("produto_id", produtoId)
      .order("ordem", { ascending: false })
      .limit(1);
    ordem = ult && ult.length > 0 ? Number(ult[0].ordem) + 1 : 0;
  }

  const { data, error } = await supabase
    .from(TABLE_VARS)
    .insert([{
      produto_id:        produtoId,
      nome:              payload.nome.trim(),
      descricao:         textoOuNull(payload.descricao),
      preco:             payload.preco ?? null,
      codigo_fornecedor: textoOuNull(payload.codigo_fornecedor),
      ordem,
      ativo:             payload.ativo ?? true,
    }])
    .select()
    .single();
  if (error) throw erroVariacao(error);

  if (payload.imagens_paths?.length) {
    await saveImagens(supabase, produtoId, payload.imagens_paths, data.id);
  }
  return getVariacao(supabase, produtoId, data.id);
}

export async function updateVariationService(
  produtoId: string,
  variacaoId: string,
  payload: UpdateVariationPayload
): Promise<ProductVariation> {
  const supabase = createSupabaseAdminClient();

  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.nome      !== undefined) upd.nome = payload.nome.trim();
  if (payload.descricao !== undefined) upd.descricao = textoOuNull(payload.descricao);
  if (payload.preco     !== undefined) upd.preco = payload.preco;
  if (payload.codigo_fornecedor !== undefined) upd.codigo_fornecedor = textoOuNull(payload.codigo_fornecedor);
  if (payload.ordem     !== undefined) upd.ordem = payload.ordem;
  if (payload.ativo     !== undefined) upd.ativo = payload.ativo;

  const { error } = await supabase
    .from(TABLE_VARS)
    .update(upd)
    .eq("id", variacaoId)
    .eq("produto_id", produtoId);
  if (error) throw erroVariacao(error);

  if (payload.imagens_paths !== undefined) {
    await replaceImagensVariacao(supabase, produtoId, variacaoId, payload.imagens_paths);
  }
  return getVariacao(supabase, produtoId, variacaoId);
}

export async function deleteVariationService(produtoId: string, variacaoId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();

  const { data: imgs, error: imgErr } = await supabase
    .from(TABLE_IMGS)
    .select("path")
    .eq("variacao_id", variacaoId);
  if (imgErr) throw erroVariacao(imgErr);

  // Não apaga do storage um arquivo que ainda é usado pelo produto
  // (a capa pode ser a 1ª foto de uma variação) ou por outra linha.
  const { data: produto } = await supabase.from(TABLE).select("imagem_url").eq("id", produtoId).single();
  const { data: outras } = await supabase
    .from(TABLE_IMGS)
    .select("path, variacao_id")
    .eq("produto_id", produtoId);
  const emUso = new Set<string>();
  if (produto?.imagem_url) emUso.add(produto.imagem_url);
  for (const o of outras ?? []) if (o.variacao_id !== variacaoId) emUso.add(o.path);

  const remover = [...new Set((imgs ?? []).map((i) => i.path))].filter((p) => !emUso.has(p));

  const { error } = await supabase
    .from(TABLE_VARS)
    .delete()
    .eq("id", variacaoId)
    .eq("produto_id", produtoId);
  if (error) throw new Error(error.message);

  // As linhas de imagem saem pelo ON DELETE CASCADE de variacao_id.
  if (remover.length > 0) {
    const { error: storageError } = await supabase.storage.from(STORAGE_BUCKET).remove(remover);
    if (storageError) console.warn("Variação removida, mas falhou limpar o storage:", storageError.message);
  }
}
