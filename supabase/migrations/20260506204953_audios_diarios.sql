CREATE TABLE public.audios_diarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  audio_url TEXT NOT NULL,
  capa_url TEXT,
  duracao_segundos INTEGER,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audios_diarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read audios" ON public.audios_diarios
  FOR SELECT TO authenticated USING (ativo = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage audios" ON public.audios_diarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public) VALUES ('audios', 'audios', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Audios publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'audios');
CREATE POLICY "Admins upload audios" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audios' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update audios" ON storage.objects
  FOR UPDATE USING (bucket_id = 'audios' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete audios" ON storage.objects
  FOR DELETE USING (bucket_id = 'audios' AND has_role(auth.uid(), 'admin'::app_role));
