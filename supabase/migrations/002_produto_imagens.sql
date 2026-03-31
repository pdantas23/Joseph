-- ================================================================
-- JOSEPH ATELIER — Migration 002
-- Imagens adicionais por produto
-- Bucket utilizado no storage: images-joseph
-- ================================================================

CREATE TABLE IF NOT EXISTS public.produtos_imagens_joseph (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id uuid        NOT NULL
                         REFERENCES public.produtos_joseph(id)
                         ON DELETE CASCADE,
  path       text        NOT NULL,
  ordem      integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prod_imgs_joseph
  ON public.produtos_imagens_joseph (produto_id, ordem);

ALTER TABLE public.produtos_imagens_joseph ENABLE ROW LEVEL SECURITY;

-- leitura pública das imagens adicionais
DROP POLICY IF EXISTS "prod_imgs_publico" ON public.produtos_imagens_joseph;
CREATE POLICY "prod_imgs_publico"
  ON public.produtos_imagens_joseph
  FOR SELECT
  USING (true);

-- insert: qualquer comercial manualmente autorizado
DROP POLICY IF EXISTS "prod_imgs_insert" ON public.produtos_imagens_joseph;
CREATE POLICY "prod_imgs_insert"
  ON public.produtos_imagens_joseph
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
DROP POLICY IF EXISTS "prod_imgs_update" ON public.produtos_imagens_joseph;
CREATE POLICY "prod_imgs_update"
  ON public.produtos_imagens_joseph
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
DROP POLICY IF EXISTS "prod_imgs_delete" ON public.produtos_imagens_joseph;
CREATE POLICY "prod_imgs_delete"
  ON public.produtos_imagens_joseph
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles_joseph p
      WHERE p.id = auth.uid()
        AND p.role = 'comercial'
    )
  );