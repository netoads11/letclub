CREATE TABLE IF NOT EXISTS public.audios_diarios (
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

DROP POLICY IF EXISTS "Authenticated read audios" ON public.audios_diarios;
CREATE POLICY "Authenticated read audios" ON public.audios_diarios
  FOR SELECT TO authenticated USING (ativo = true OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins manage audios" ON public.audios_diarios;
CREATE POLICY "Admins manage audios" ON public.audios_diarios
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public) VALUES ('audios', 'audios', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Audios publicly readable" ON storage.objects;
CREATE POLICY "Audios publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'audios');
DROP POLICY IF EXISTS "Admins upload audios" ON storage.objects;
CREATE POLICY "Admins upload audios" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audios' AND has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins update audios" ON storage.objects;
CREATE POLICY "Admins update audios" ON storage.objects
  FOR UPDATE USING (bucket_id = 'audios' AND has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins delete audios" ON storage.objects;
CREATE POLICY "Admins delete audios" ON storage.objects
  FOR DELETE USING (bucket_id = 'audios' AND has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.audios_diarios (titulo, descricao, audio_url, capa_url, duracao_segundos, ordem)
SELECT * FROM (VALUES
  ('Bem-vinda ao desafio', 'Um recado da Let para começar com leveza e foco.', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400', 180, 1),
  ('Quando bater a vontade', 'Estratégias rápidas para passar pela fissura sem culpa.', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400', 210, 2),
  ('Mente leve, corpo leve', 'Respira, alonga, segue. Áudio para o meio do dia.', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', 240, 3)
) AS v(titulo, descricao, audio_url, capa_url, duracao_segundos, ordem)
WHERE NOT EXISTS (SELECT 1 FROM public.audios_diarios);

INSERT INTO public.missions (dia_numero, titulo, descricao_curta, descricao_completa, icone, xp_reward, ordem, ativo)
SELECT * FROM (VALUES
  (1, 'Beber 2L de água', 'Hidratação é o primeiro passo', 'Distribua os 2L ao longo do dia, comece com 1 copo ao acordar.', '💧', 10, 1, true),
  (1, 'Caminhar 20 minutos', 'Movimente o corpo hoje', 'Pode ser na rua, parque ou em casa. O importante é começar.', '🚶‍♀️', 15, 2, true),
  (1, 'Ouvir o áudio diário da Let', 'Mente preparada para o desafio', 'Vá até a aba Áudios diários e escute o episódio do dia.', '🎧', 10, 3, true)
) AS v(dia_numero, titulo, descricao_curta, descricao_completa, icone, xp_reward, ordem, ativo)
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE dia_numero = 1);

INSERT INTO public.receitas (nome, tipo_refeicao, dia_numero, tempo_preparo, ingredientes, modo_preparo, imagem_url, ativo)
SELECT * FROM (VALUES
  ('Tapioca de banana e canela', 'cafe'::tipo_refeicao, 1, 10, '[{"item":"Tapioca","qtd":"2 col"},{"item":"Banana","qtd":"1 un"},{"item":"Canela","qtd":"a gosto"}]'::jsonb, ARRAY['Hidrate a tapioca','Recheie com banana e canela','Dobre e sirva'], 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600', true),
  ('Salada power de frango', 'almoco'::tipo_refeicao, 1, 20, '[{"item":"Frango grelhado","qtd":"120g"},{"item":"Folhas verdes","qtd":"à vontade"},{"item":"Tomate","qtd":"1 un"}]'::jsonb, ARRAY['Grelhe o frango','Monte a salada','Tempere com azeite e limão'], 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600', true),
  ('Omelete de espinafre', 'jantar'::tipo_refeicao, 1, 12, '[{"item":"Ovos","qtd":"2 un"},{"item":"Espinafre","qtd":"1 xíc"},{"item":"Queijo branco","qtd":"30g"}]'::jsonb, ARRAY['Bata os ovos','Refogue o espinafre','Misture e leve à frigideira'], 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600', true)
) AS v(nome, tipo_refeicao, dia_numero, tempo_preparo, ingredientes, modo_preparo, imagem_url, ativo)
WHERE NOT EXISTS (SELECT 1 FROM public.receitas);

INSERT INTO public.posts_comunidade (user_id, texto, fixado)
SELECT ur.user_id, v.texto, v.fixado
FROM (VALUES
  ('Bom dia, time! Hoje é dia de começar com tudo. Lembrem: progresso é melhor que perfeição. 💚', true),
  ('Acabei de fazer minha caminhada matinal. Quem mais já se mexeu hoje? 🚶‍♀️', false),
  ('Receita de tapioca de banana salvou meu café da manhã. Recomendo demais!', false),
  ('Confesso que ontem caí na tentação, mas hoje é dia de retomar. Bora juntas?', false)
) AS v(texto, fixado)
CROSS JOIN LATERAL (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role LIMIT 1
) ur
WHERE NOT EXISTS (SELECT 1 FROM public.posts_comunidade);