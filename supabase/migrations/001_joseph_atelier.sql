-- ================================================================
-- JOSEPH ATELIER — Migration 001
-- Estrutura inicial
-- Controle manual de acesso via profiles_joseph
-- Bucket de imagens: images-joseph
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------
-- Função compartilhada para updated_at
-- ------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------
-- Tabela de perfis
-- Controle manual: só entra quem você inserir
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles_joseph (
  id         uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text        NOT NULL UNIQUE,
  role       text        NOT NULL DEFAULT 'comercial'
                         CHECK (role = 'comercial'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS profiles_joseph_updated_at ON public.profiles_joseph;
CREATE TRIGGER profiles_joseph_updated_at
  BEFORE UPDATE ON public.profiles_joseph
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles_joseph ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_joseph_select_proprio" ON public.profiles_joseph;
CREATE POLICY "profiles_joseph_select_proprio"
  ON public.profiles_joseph
  FOR SELECT
  USING (auth.uid() = id);

-- ------------------------------------------------
-- Tabela de produtos
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.produtos_joseph (
  id         uuid           DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       text           NOT NULL,
  descricao  text           NOT NULL DEFAULT '',
  preco      numeric(10,2)  NOT NULL DEFAULT 0 CHECK (preco >= 0),
  imagem_url text,
  categoria  text           CHECK (categoria IN (
    'vestidos','blusas','calças','saias','conjuntos','acessórios','outros'
  )),
  promocao   boolean        NOT NULL DEFAULT false,
  ativo      boolean        NOT NULL DEFAULT true,
  created_at timestamptz    NOT NULL DEFAULT now(),
  updated_at timestamptz    NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS produtos_joseph_updated_at ON public.produtos_joseph;
CREATE TRIGGER produtos_joseph_updated_at
  BEFORE UPDATE ON public.produtos_joseph
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.produtos_joseph ENABLE ROW LEVEL SECURITY;

-- leitura pública: visitantes só veem produtos ativos
DROP POLICY IF EXISTS "produtos_publico" ON public.produtos_joseph;
CREATE POLICY "produtos_publico"
  ON public.produtos_joseph
  FOR SELECT
  USING (ativo = true);

-- leitura interna: qualquer usuário presente em profiles_joseph com role comercial vê tudo
DROP POLICY IF EXISTS "produtos_comercial_select" ON public.produtos_joseph;
CREATE POLICY "produtos_comercial_select"
  ON public.produtos_joseph
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

-- insert: qualquer comercial manualmente autorizado
DROP POLICY IF EXISTS "produtos_comercial_insert" ON public.produtos_joseph;
CREATE POLICY "produtos_comercial_insert"
  ON public.produtos_joseph
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

-- update: qualquer comercial manualmente autorizado
DROP POLICY IF EXISTS "produtos_comercial_update" ON public.produtos_joseph;
CREATE POLICY "produtos_comercial_update"
  ON public.produtos_joseph
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

-- delete: qualquer comercial manualmente autorizado
DROP POLICY IF EXISTS "produtos_comercial_delete" ON public.produtos_joseph;
CREATE POLICY "produtos_comercial_delete"
  ON public.produtos_joseph
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

-- ------------------------------------------------
-- Storage policies
-- Bucket esperado: images-joseph
-- Crie o bucket antes no painel do Supabase
-- ------------------------------------------------

DROP POLICY IF EXISTS "joseph_imagens_leitura_publica" ON storage.objects;
CREATE POLICY "joseph_imagens_leitura_publica"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'images-joseph'
  );

DROP POLICY IF EXISTS "joseph_imagens_upload" ON storage.objects;
CREATE POLICY "joseph_imagens_upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'images-joseph'
    AND EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

DROP POLICY IF EXISTS "joseph_imagens_update" ON storage.objects;
CREATE POLICY "joseph_imagens_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'images-joseph'
    AND EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  )
  WITH CHECK (
    bucket_id = 'images-joseph'
    AND EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

DROP POLICY IF EXISTS "joseph_imagens_delete" ON storage.objects;
CREATE POLICY "joseph_imagens_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'images-joseph'
    AND EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );

-- ------------------------------------------------
-- Índices
-- ------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_produtos_joseph_ativo
  ON public.produtos_joseph (ativo);

CREATE INDEX IF NOT EXISTS idx_produtos_joseph_promocao
  ON public.produtos_joseph (promocao);

CREATE INDEX IF NOT EXISTS idx_produtos_joseph_created
  ON public.produtos_joseph (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_produtos_joseph_categoria
  ON public.produtos_joseph (categoria);