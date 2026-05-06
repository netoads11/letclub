
CREATE TABLE public.refeicoes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo_refeicao TEXT NOT NULL,
  nome TEXT,
  kcal INTEGER,
  imagem_url TEXT,
  registrado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.refeicoes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own refeicoes" ON public.refeicoes_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own refeicoes" ON public.refeicoes_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own refeicoes" ON public.refeicoes_log
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own refeicoes" ON public.refeicoes_log
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_refeicoes_log_user_data ON public.refeicoes_log(user_id, registrado_em DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('refeicoes', 'refeicoes', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Refeicoes publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'refeicoes');
CREATE POLICY "Users upload own refeicoes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'refeicoes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own refeicoes" ON storage.objects
  FOR UPDATE USING (bucket_id = 'refeicoes' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own refeicoes" ON storage.objects
  FOR DELETE USING (bucket_id = 'refeicoes' AND auth.uid()::text = (storage.foldername(name))[1]);
