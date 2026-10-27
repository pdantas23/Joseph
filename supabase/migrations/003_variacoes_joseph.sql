-- =====================================================================
-- JOSEPH ATELIER: Migration 003
-- Variações de produto (ex.: tamanho e cor) + campos coleção, slug e
-- código de referência.
--
-- Escopo: SOMENTE tabelas *_joseph. Não cria nem altera função
-- compartilhada (public.set_updated_at() já existe e já é usada por
-- produtos_joseph; aqui só é referenciada num trigger novo).
--
-- Sem a coluna "marca": a Joseph vende peças da própria marca.
--
-- Idempotente: pode rodar mais de uma vez sem erro e sem duplicar nada.
-- Padrão de RLS e grants copiado do que está hoje no banco para
-- produtos_joseph / produtos_imagens_joseph (conferido em 27/10/2026,
-- só leitura):
--   * RLS ligado, sem policy para service_role (a API usa service_role,
--     que ignora RLS);
--   * leitura pública (role public): produtos só ativos, imagens todas;
--   * leitura, insert, update e delete para quem tem
--     profiles_joseph.role = 'comercial';
--   * grants padrão do Supabase (ALL para anon/authenticated/service_role);
--     a proteção é a RLS.
--
-- A API e o site funcionam com ou sem esta migration (sem ela, nenhum
-- produto tem variação e os campos novos ficam vazios).
-- =====================================================================

BEGIN;

-- ─── 1. produtos_joseph: campos novos ────────────────────────────────
ALTER TABLE public.produtos_joseph ADD COLUMN IF NOT EXISTS colecao           text;
ALTER TABLE public.produtos_joseph ADD COLUMN IF NOT EXISTS slug              text;
ALTER TABLE public.produtos_joseph ADD COLUMN IF NOT EXISTS codigo_fornecedor text;

-- slug NULL pode repetir (as 9 peças de hoje ficam sem slug até alguém
-- editar; o site usa o id enquanto isso).
CREATE UNIQUE INDEX IF NOT EXISTS produtos_joseph_slug_key
  ON public.produtos_joseph (slug);

CREATE INDEX IF NOT EXISTS produtos_joseph_codigo_fornecedor_idx
  ON public.produtos_joseph (codigo_fornecedor);

-- ─── 2. produtos_variacoes_joseph ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.produtos_variacoes_joseph (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id        uuid        NOT NULL
                                REFERENCES public.produtos_joseph(id) ON DELETE CASCADE,
  nome              text        NOT NULL CHECK (char_length(btrim(nome)) > 0), -- ex.: 'M · Off-white'
  descricao         text,                       -- NULL = usa a do produto
  preco             numeric(10,2) CHECK (preco IS NULL OR preco >= 0), -- NULL = usa o do produto
  codigo_fornecedor text,
  ordem             integer     NOT NULL DEFAULT 0 CHECK (ordem >= 0),
  ativo             boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS produtos_variacoes_joseph_produto_idx
  ON public.produtos_variacoes_joseph (produto_id, ordem);

-- O mesmo código não se repete dentro do mesmo produto.
CREATE UNIQUE INDEX IF NOT EXISTS produtos_variacoes_joseph_produto_codigo_key
  ON public.produtos_variacoes_joseph (produto_id, codigo_fornecedor)
  WHERE codigo_fornecedor IS NOT NULL;

DROP TRIGGER IF EXISTS produtos_variacoes_joseph_updated_at ON public.produtos_variacoes_joseph;
CREATE TRIGGER produtos_variacoes_joseph_updated_at
  BEFORE UPDATE ON public.produtos_variacoes_joseph
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. Imagens por variação: coluna em produtos_imagens_joseph ──────
-- variacao_id NULL  = imagem do produto (comportamento de hoje);
-- variacao_id <id>  = imagem daquela variação.
ALTER TABLE public.produtos_imagens_joseph
  ADD COLUMN IF NOT EXISTS variacao_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'produtos_imagens_joseph_variacao_id_fkey'
      AND conrelid = 'public.produtos_imagens_joseph'::regclass
  ) THEN
    ALTER TABLE public.produtos_imagens_joseph
      ADD CONSTRAINT produtos_imagens_joseph_variacao_id_fkey
      FOREIGN KEY (variacao_id)
      REFERENCES public.produtos_variacoes_joseph(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS produtos_imagens_joseph_variacao_idx
  ON public.produtos_imagens_joseph (variacao_id, ordem);

-- ─── 4. RLS de produtos_variacoes_joseph (mesmo padrão de produtos_joseph) ─
ALTER TABLE public.produtos_variacoes_joseph ENABLE ROW LEVEL SECURITY;

-- leitura pública: visitantes só veem variações ativas
DROP POLICY IF EXISTS "prod_vars_joseph_publico" ON public.produtos_variacoes_joseph;
CREATE POLICY "prod_vars_joseph_publico"
  ON public.produtos_variacoes_joseph
  FOR SELECT
  USING (ativo = true);

-- leitura interna: comercial vê todas (inclusive inativas)
DROP POLICY IF EXISTS "prod_vars_joseph_comercial_select" ON public.produtos_variacoes_joseph;
CREATE POLICY "prod_vars_joseph_comercial_select"
  ON public.produtos_variacoes_joseph
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

DROP POLICY IF EXISTS "prod_vars_joseph_comercial_insert" ON public.produtos_variacoes_joseph;
CREATE POLICY "prod_vars_joseph_comercial_insert"
  ON public.produtos_variacoes_joseph
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

DROP POLICY IF EXISTS "prod_vars_joseph_comercial_update" ON public.produtos_variacoes_joseph;
CREATE POLICY "prod_vars_joseph_comercial_update"
  ON public.produtos_variacoes_joseph
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

DROP POLICY IF EXISTS "prod_vars_joseph_comercial_delete" ON public.produtos_variacoes_joseph;
CREATE POLICY "prod_vars_joseph_comercial_delete"
  ON public.produtos_variacoes_joseph
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

-- ─── 5. Grants (iguais aos de produtos_joseph hoje; a proteção é a RLS) ─
GRANT ALL ON TABLE public.produtos_variacoes_joseph TO anon, authenticated, service_role;

COMMIT;

-- ─── Conferência (só leitura, rodar depois) ──────────────────────────
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='produtos_joseph'
--    AND column_name IN ('colecao','slug','codigo_fornecedor');
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='produtos_imagens_joseph'
--    AND column_name = 'variacao_id';
-- SELECT policyname, cmd, roles FROM pg_policies
--  WHERE tablename = 'produtos_variacoes_joseph';
-- SELECT conname FROM pg_constraint
--  WHERE conname = 'produtos_imagens_joseph_variacao_id_fkey';
-- NOTIFY pgrst, 'reload schema';  -- se a API não enxergar as colunas novas na hora
