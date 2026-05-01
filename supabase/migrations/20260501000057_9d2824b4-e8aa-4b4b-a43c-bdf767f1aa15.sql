ALTER TABLE public.posts_comunidade
ADD COLUMN IF NOT EXISTS fixado BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_posts_fixado ON public.posts_comunidade(fixado) WHERE fixado = true;