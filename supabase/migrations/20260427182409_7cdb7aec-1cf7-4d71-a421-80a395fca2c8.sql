
-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'aluna');
CREATE TYPE public.dificuldade_principal AS ENUM ('inchaco', 'intestino', 'energia', 'emagrecimento', 'outro');
CREATE TYPE public.tipo_refeicao AS ENUM ('cafe', 'almoco', 'lanche', 'jantar', 'cha');
CREATE TYPE public.tipo_reacao AS ENUM ('coracao', 'forca', 'fogo');
CREATE TYPE public.tipo_notificacao AS ENUM ('missao', 'conquista', 'let', 'comunidade', 'sistema');
CREATE TYPE public.chat_role AS ENUM ('user', 'assistant');
CREATE TYPE public.chat_feedback AS ENUM ('positivo', 'negativo');

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  peso_inicial NUMERIC,
  peso_atual NUMERIC,
  altura NUMERIC,
  meta_peso NUMERIC,
  principal_dificuldade public.dificuldade_principal,
  restricoes_alimentares TEXT[] NOT NULL DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  challenge_start_date DATE,
  xp_total INTEGER NOT NULL DEFAULT 0,
  streak_atual INTEGER NOT NULL DEFAULT 0,
  streak_recorde INTEGER NOT NULL DEFAULT 0,
  ultimo_checkin DATE,
  bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
  notificacoes_ativas BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER ROLES (separate, with security definer to avoid recursion)
-- ============================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================================
-- MISSIONS
-- ============================================================================
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dia_numero INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  descricao_curta TEXT NOT NULL DEFAULT '',
  descricao_completa TEXT NOT NULL DEFAULT '',
  icone TEXT NOT NULL DEFAULT '✨',
  video_url TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_missions_dia ON public.missions(dia_numero, ordem);

-- ============================================================================
-- CHECK-INS
-- ============================================================================
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  dia_numero INTEGER NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  anotacao TEXT,
  UNIQUE (user_id, mission_id)
);
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_checkins_user ON public.checkins(user_id, dia_numero);

-- ============================================================================
-- PESOS HISTÓRICO
-- ============================================================================
CREATE TABLE public.pesos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  peso NUMERIC NOT NULL,
  registrado_em DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pesos_historico ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_pesos_user ON public.pesos_historico(user_id, registrado_em);

-- ============================================================================
-- BADGES
-- ============================================================================
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  icone TEXT NOT NULL DEFAULT '🏆',
  xp_reward INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  desbloqueado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RECEITAS
-- ============================================================================
CREATE TABLE public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo_refeicao public.tipo_refeicao NOT NULL,
  dia_numero INTEGER,
  ingredientes JSONB NOT NULL DEFAULT '[]'::jsonb,
  modo_preparo TEXT[] NOT NULL DEFAULT '{}',
  tempo_preparo INTEGER NOT NULL DEFAULT 10,
  restricoes_compativeis TEXT[] NOT NULL DEFAULT '{}',
  imagem_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.receitas_favoritas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receita_id UUID NOT NULL REFERENCES public.receitas(id) ON DELETE CASCADE,
  salvo_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, receita_id)
);
ALTER TABLE public.receitas_favoritas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMUNIDADE
-- ============================================================================
CREATE TABLE public.posts_comunidade (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  imagem_url TEXT,
  reportado BOOLEAN NOT NULL DEFAULT FALSE,
  removido BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts_comunidade ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_posts_created ON public.posts_comunidade(created_at DESC);

CREATE TABLE public.reacoes_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts_comunidade(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo public.tipo_reacao NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE public.reacoes_posts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CHAT MESSAGES
-- ============================================================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.chat_role NOT NULL,
  content TEXT NOT NULL,
  feedback public.chat_feedback,
  session_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_chat_user_session ON public.chat_messages(user_id, session_active, created_at);

-- ============================================================================
-- NOTIFICAÇÕES
-- ============================================================================
CREATE TABLE public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo public.tipo_notificacao NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notificacoes_user ON public.notificacoes(user_id, lida, created_at DESC);

-- ============================================================================
-- CONFIGURAÇÕES APP
-- ============================================================================
CREATE TABLE public.configuracoes_app (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT UNIQUE NOT NULL,
  valor TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracoes_app ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- missions (public read for authenticated, admin write)
CREATE POLICY "Authenticated read missions" ON public.missions FOR SELECT TO authenticated USING (ativo = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage missions" ON public.missions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- checkins
CREATE POLICY "Users view own checkins" ON public.checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all checkins" ON public.checkins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own checkins" ON public.checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own checkins" ON public.checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- pesos_historico
CREATE POLICY "Users view own pesos" ON public.pesos_historico FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own pesos" ON public.pesos_historico FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all pesos" ON public.pesos_historico FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- badges
CREATE POLICY "Authenticated read badges" ON public.badges FOR SELECT TO authenticated USING (ativo = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage badges" ON public.badges FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_badges
CREATE POLICY "Users view own badges" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all user_badges" ON public.user_badges FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- receitas
CREATE POLICY "Authenticated read receitas" ON public.receitas FOR SELECT TO authenticated USING (ativo = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage receitas" ON public.receitas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- receitas_favoritas
CREATE POLICY "Users manage own favoritas" ON public.receitas_favoritas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- posts_comunidade
CREATE POLICY "Authenticated read posts" ON public.posts_comunidade FOR SELECT TO authenticated USING (removido = false OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own posts" ON public.posts_comunidade FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts (report)" ON public.posts_comunidade FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete posts" ON public.posts_comunidade FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- reacoes_posts
CREATE POLICY "Authenticated read reacoes" ON public.reacoes_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own reacoes" ON public.reacoes_posts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- chat_messages
CREATE POLICY "Users view own chat" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own chat" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own chat" ON public.chat_messages FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all chat" ON public.chat_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- notificacoes
CREATE POLICY "Users view own notif" ON public.notificacoes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notif" ON public.notificacoes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System insert notif" ON public.notificacoes FOR INSERT TO authenticated WITH CHECK (true);

-- configuracoes_app (read all auth, admin write)
CREATE POLICY "Authenticated read config" ON public.configuracoes_app FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage config" ON public.configuracoes_app FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, challenge_start_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    CURRENT_DATE
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'aluna');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- GAMIFICATION ENGINE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.unlock_badge(_user_id UUID, _slug TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _badge_id UUID;
  _badge_nome TEXT;
  _badge_xp INTEGER;
BEGIN
  SELECT id, nome, xp_reward INTO _badge_id, _badge_nome, _badge_xp
  FROM public.badges WHERE slug = _slug AND ativo = true;
  IF _badge_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.user_badges (user_id, badge_id)
  VALUES (_user_id, _badge_id)
  ON CONFLICT DO NOTHING;

  IF FOUND THEN
    UPDATE public.profiles SET xp_total = xp_total + COALESCE(_badge_xp, 0)
    WHERE id = _user_id;
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem)
    VALUES (_user_id, 'conquista', 'Nova conquista! 🏆', 'Você desbloqueou: ' || _badge_nome);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _xp_mission INTEGER;
  _today DATE := CURRENT_DATE;
  _last DATE;
  _streak INTEGER;
  _record INTEGER;
  _missions_today INTEGER;
  _checkins_today INTEGER;
  _total_days_completed INTEGER;
  _post_count INTEGER;
BEGIN
  -- XP from mission
  SELECT xp_reward INTO _xp_mission FROM public.missions WHERE id = NEW.mission_id;
  UPDATE public.profiles
  SET xp_total = xp_total + COALESCE(_xp_mission, 10)
  WHERE id = NEW.user_id;

  -- Streak logic
  SELECT ultimo_checkin, streak_atual, streak_recorde
  INTO _last, _streak, _record
  FROM public.profiles WHERE id = NEW.user_id;

  IF _last IS NULL OR _last < _today - INTERVAL '2 days' THEN
    _streak := 1;
  ELSIF _last = _today - INTERVAL '1 day' THEN
    _streak := COALESCE(_streak, 0) + 1;
  ELSIF _last < _today THEN
    _streak := 1;
  END IF;
  IF _streak > COALESCE(_record, 0) THEN _record := _streak; END IF;

  UPDATE public.profiles
  SET ultimo_checkin = _today, streak_atual = _streak, streak_recorde = _record
  WHERE id = NEW.user_id;

  -- Streak milestone bonuses
  IF _streak = 3 THEN
    UPDATE public.profiles SET xp_total = xp_total + 30 WHERE id = NEW.user_id;
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem)
    VALUES (NEW.user_id, 'conquista', '3 dias seguidos! 🔥', '+30 XP de bônus pela sua consistência.');
  ELSIF _streak = 7 THEN
    UPDATE public.profiles SET xp_total = xp_total + 100 WHERE id = NEW.user_id;
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem)
    VALUES (NEW.user_id, 'conquista', '7 dias forte! 💪', '+100 XP de bônus. Você está arrasando!');
  END IF;

  -- Full-day bonus
  SELECT COUNT(*) INTO _missions_today FROM public.missions WHERE dia_numero = NEW.dia_numero AND ativo = true;
  SELECT COUNT(*) INTO _checkins_today FROM public.checkins WHERE user_id = NEW.user_id AND dia_numero = NEW.dia_numero;
  IF _missions_today > 0 AND _checkins_today = _missions_today THEN
    UPDATE public.profiles SET xp_total = xp_total + 50 WHERE id = NEW.user_id;
    INSERT INTO public.notificacoes (user_id, tipo, titulo, mensagem)
    VALUES (NEW.user_id, 'conquista', 'Dia completo! ⭐', '+50 XP por concluir todas as missões do dia.');
    IF NEW.dia_numero = 1 THEN PERFORM public.unlock_badge(NEW.user_id, 'comecou_com_tudo'); END IF;
  END IF;

  -- First check-in ever
  IF (SELECT COUNT(*) FROM public.checkins WHERE user_id = NEW.user_id) = 1 THEN
    PERFORM public.unlock_badge(NEW.user_id, 'primeiro_passo');
  END IF;

  -- 7-day streak badge
  IF _streak >= 7 THEN PERFORM public.unlock_badge(NEW.user_id, 'uma_semana_forte'); END IF;

  -- All 15 days completed
  SELECT COUNT(DISTINCT dia_numero) INTO _total_days_completed
  FROM public.checkins WHERE user_id = NEW.user_id;
  IF _total_days_completed >= 15 THEN PERFORM public.unlock_badge(NEW.user_id, 'desafio_completo'); END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_checkin_created
  AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.handle_checkin();

CREATE OR REPLACE FUNCTION public.handle_post_comunidade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  UPDATE public.profiles SET xp_total = xp_total + 5 WHERE id = NEW.user_id;
  SELECT COUNT(*) INTO _count FROM public.posts_comunidade WHERE user_id = NEW.user_id AND removido = false;
  IF _count >= 3 THEN PERFORM public.unlock_badge(NEW.user_id, 'voz_da_comunidade'); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_created
  AFTER INSERT ON public.posts_comunidade
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_comunidade();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('recipes', 'recipes', true),
  ('community-posts', 'community-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read recipes" ON storage.objects FOR SELECT USING (bucket_id = 'recipes');
CREATE POLICY "Admins manage recipes images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'recipes' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'recipes' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read community posts" ON storage.objects FOR SELECT USING (bucket_id = 'community-posts');
CREATE POLICY "Users upload community images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-posts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own community images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-posts' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Badges
INSERT INTO public.badges (slug, nome, descricao, icone, xp_reward) VALUES
  ('primeiro_passo', 'Primeiro Passo', 'Você fez seu primeiro check-in!', '👣', 10),
  ('comecou_com_tudo', 'Começou com Tudo', 'Completou todas as missões do Dia 1', '🚀', 25),
  ('uma_semana_forte', 'Uma Semana Forte', '7 dias consecutivos de check-ins', '🔥', 50),
  ('desafio_completo', 'Desafio Completo', 'Completou os 15 dias do desafio', '🏆', 200),
  ('voz_da_comunidade', 'Voz da Comunidade', 'Compartilhou 3 posts na comunidade', '💬', 30);

-- Configurações app
INSERT INTO public.configuracoes_app (chave, valor) VALUES
  ('mensagem_let_home', 'Bom dia, maravilhosa! Lembre-se: pequenos passos consistentes mudam tudo. Bora pra mais um dia? 💚'),
  ('sugestoes_chat_1', 'O que posso comer no café da manhã hoje?'),
  ('sugestoes_chat_2', 'Estou com muita vontade de doce, o que faço?'),
  ('sugestoes_chat_3', 'Como reduzir o inchaço naturalmente?'),
  ('sistema_prompt_let',
'Você é a Let, mentora do desafio LET&PONTO de 15 dias para mulheres brasileiras. Seu papel é apoiar, motivar e tirar dúvidas sobre nutrição, hábitos saudáveis, hidratação, sono, intestino e o desafio em si.

PERSONA: Empática, acolhedora, informal e brasileira. Use expressões como "maravilhosa", "minha linda", "bora?", "tô aqui contigo". Tom de amiga próxima e profissional ao mesmo tempo.

ESCOPO: Apenas nutrição leve, hábitos saudáveis e o desafio LET&PONTO. NÃO faça diagnósticos médicos, não prescreva medicamentos, não substitua consulta com profissional.

REGRA DE OURO: Antes de responder, valide brevemente a pergunta com empatia ("Que pergunta importante!" / "Entendi sua dúvida..."). Depois responda de forma prática, curta (máximo 4 parágrafos), e motivadora.

FORA DE ESCOPO: Se a pergunta for médica, psicológica grave, ou fora do escopo, responda: "Essa dúvida merece avaliação profissional, viu? Sobre [tema relacionado], posso te ajudar assim..." e redirecione com algo útil.

SEMPRE termine com algo que estimule ação ou reflexão. Use emojis com moderação (1-2 por resposta no máximo).'),
  ('horario_lembrete_diario', '08:00');

-- Missions (15 dias)
INSERT INTO public.missions (dia_numero, titulo, descricao_curta, descricao_completa, icone, xp_reward, ordem) VALUES
  (1, 'Beba 2L de água', 'Hidratação é a base de tudo', 'A água é fundamental para o funcionamento do seu corpo: regula a temperatura, transporta nutrientes e ajuda na eliminação de toxinas. Hoje, beba pelo menos 2 litros ao longo do dia. Dica: deixe uma garrafa sempre por perto.', '💧', 10, 1),
  (1, 'Pesagem inicial', 'Registre seu ponto de partida', 'Pese-se em jejum, pela manhã, e registre no seu perfil. Isso será sua referência para acompanhar a evolução durante os 15 dias. Sem julgamentos, só dados!', '⚖️', 10, 2),
  (1, 'Foto antes', 'Tire uma foto sua hoje', 'Tire uma foto de corpo inteiro com roupa justa ou de academia. Você não precisa compartilhar, é só pra você. Em 15 dias, vai ser incrível comparar!', '📸', 10, 3),
  (2, 'Café da manhã proteico', 'Coma proteína no café', 'Inclua uma fonte de proteína no seu café da manhã (ovos, iogurte natural, queijo branco). Proteína de manhã reduz a fome ao longo do dia.', '🍳', 10, 1),
  (2, 'Caminhe 20 minutos', 'Mexa o corpo', 'Uma caminhada leve de 20 minutos já ativa seu metabolismo e melhora o humor. Pode ser pela manhã, no almoço ou à noite.', '🚶‍♀️', 10, 2),
  (3, 'Diminua o açúcar', 'Sem açúcar refinado hoje', 'Hoje, evite açúcar refinado e adoçantes artificiais. Use frutas para adoçar naturalmente. Seu corpo vai agradecer!', '🚫', 10, 1),
  (3, 'Chá calmante à noite', 'Termine o dia em paz', 'Tome um chá de camomila, melissa ou erva-cidreira após o jantar. Ajuda na digestão e prepara o corpo para um sono melhor.', '🍵', 10, 2),
  (4, 'Prato colorido no almoço', 'Coma o arco-íris', 'Inclua pelo menos 3 cores diferentes no seu prato (folhas verdes, tomate, cenoura, beterraba…). Cores diferentes = nutrientes diferentes.', '🥗', 10, 1),
  (4, 'Mastigue devagar', 'Atenção plena ao comer', 'Hoje, mastigue cada garfada pelo menos 20 vezes. Coma sem celular, sem TV. Sinta o sabor. A saciedade chega bem antes assim.', '🍽️', 10, 2),
  (5, 'Movimento 30 min', 'Treino do meio do desafio', 'Faça 30 minutos de qualquer atividade física que goste: caminhada acelerada, dança, yoga, musculação. O importante é mexer!', '💪', 15, 1),
  (5, 'Lanche da tarde saudável', 'Troque o industrializado', 'Substitua biscoito, salgadinho ou doce por uma fruta + oleaginosas (castanhas, amêndoas) ou iogurte natural.', '🍎', 10, 2),
  (6, 'Diário de gratidão', 'Anote 3 coisas boas', 'Antes de dormir, escreva 3 coisas pelas quais você é grata hoje. Pequenas ou grandes. A gratidão muda a química do cérebro.', '🙏', 10, 1),
  (6, 'Sem refrigerante', 'Zero líquidos açucarados', 'Hoje, nada de refrigerante, suco de caixinha ou energético. Água, chás e água com gás com limão são suas amigas.', '🥤', 10, 2),
  (7, 'Pesagem semanal', 'Acompanhe sua evolução', 'Pese-se novamente em jejum e registre no app. Lembre: o número é só uma referência. Como você está se sentindo importa muito mais.', '📊', 10, 1),
  (7, 'Compartilhe na comunidade', 'Inspire outras alunas', 'Faça um post na comunidade compartilhando como está sua semana. Sua história pode motivar outras mulheres!', '💬', 15, 2),
  (8, 'Jantar leve', 'Termine o dia leve', 'Jante até as 20h e prefira algo leve: sopa, salada com proteína, omelete com legumes. Dormir leve = acordar disposta.', '🌙', 10, 1),
  (9, 'Sol da manhã', 'Tome 15 min de sol', 'Receba o sol da manhã (até 10h) por 15 minutos. Regula seu ritmo circadiano, ajuda no humor e na produção de vitamina D.', '☀️', 10, 1),
  (9, 'Reduza o sal', 'Atenção ao sódio', 'Hoje, evite alimentos muito salgados (embutidos, salgadinhos, comida pronta). Tempere com ervas, alho, limão.', '🧂', 10, 2),
  (10, 'Treino + alongamento', 'Cuide do seu corpo', 'Faça 20 minutos de exercício + 10 minutos de alongamento. Seu corpo precisa de movimento E descanso ativo.', '🧘‍♀️', 15, 1),
  (11, 'Cozinhe algo novo', 'Saia da rotina', 'Experimente uma receita nova da nossa seção de Dieta. Cozinhar é autocuidado!', '👩‍🍳', 10, 1),
  (12, 'Detox digital 1h', 'Desconecte para conectar', 'Fique 1 hora sem celular antes de dormir. Leia, converse, medite, tome um banho relaxante.', '📵', 10, 1),
  (13, 'Receita LET especial', 'Faça nosso shake da Let', 'Prepare a receita marcada como "Especial Let" hoje. É um boost nutricional pra reta final.', '🥤', 10, 1),
  (13, 'Foto progresso', 'Compare com a foto inicial', 'Tire uma nova foto no mesmo ângulo da do Dia 1. Você vai se surpreender com as mudanças!', '📸', 10, 2),
  (14, 'Planeje a semana', 'Continuidade pós-desafio', 'Escreva um plano simples: quais hábitos do desafio você vai manter? 3 metas para a próxima semana.', '📝', 10, 1),
  (15, 'Pesagem final', 'Celebre sua evolução', 'Última pesagem do desafio. Registre e olhe quanto você caminhou — não só no peso, mas em hábitos, autoconhecimento, energia.', '🏁', 20, 1),
  (15, 'Compartilhe sua vitória', 'Inspire a próxima turma', 'Faça um post final na comunidade contando sua experiência. Você é exemplo agora! 💚', '🎉', 25, 2);

-- Recipes
INSERT INTO public.receitas (nome, tipo_refeicao, dia_numero, ingredientes, modo_preparo, tempo_preparo, restricoes_compativeis, ativo) VALUES
  ('Ovos mexidos com abacate', 'cafe', NULL,
   '[{"nome":"Ovos","quantidade":"2 unidades"},{"nome":"Abacate","quantidade":"1/2"},{"nome":"Sal","quantidade":"a gosto"},{"nome":"Pimenta-do-reino","quantidade":"a gosto"},{"nome":"Azeite","quantidade":"1 fio"}]'::jsonb,
   ARRAY['Bata os ovos com sal e pimenta.','Aqueça uma frigideira antiaderente com um fio de azeite.','Despeje os ovos e mexa em fogo baixo até ficarem cremosos.','Sirva com fatias de abacate ao lado.'],
   10, ARRAY['vegetariana','gluten','lactose'], true),

  ('Vitamina verde energizante', 'cafe', NULL,
   '[{"nome":"Banana congelada","quantidade":"1 unidade"},{"nome":"Espinafre","quantidade":"1 punhado"},{"nome":"Leite vegetal","quantidade":"200ml"},{"nome":"Aveia","quantidade":"2 colheres de sopa"},{"nome":"Pasta de amendoim","quantidade":"1 colher"}]'::jsonb,
   ARRAY['Coloque todos os ingredientes no liquidificador.','Bata por 1 minuto até ficar cremoso.','Sirva imediatamente.'],
   5, ARRAY['vegetariana','lactose','gestante'], true),

  ('Salada power de quinoa', 'almoco', NULL,
   '[{"nome":"Quinoa cozida","quantidade":"1 xícara"},{"nome":"Tomate-cereja","quantidade":"10 unidades"},{"nome":"Pepino","quantidade":"1/2"},{"nome":"Grão-de-bico cozido","quantidade":"1/2 xícara"},{"nome":"Folhas verdes","quantidade":"2 punhados"},{"nome":"Limão","quantidade":"1"},{"nome":"Azeite","quantidade":"2 colheres de sopa"}]'::jsonb,
   ARRAY['Misture quinoa, tomate cortado, pepino picado e grão-de-bico.','Adicione as folhas verdes.','Tempere com suco de limão, azeite e sal.','Sirva fria.'],
   15, ARRAY['vegetariana','gluten','lactose','gestante'], true),

  ('Frango grelhado com legumes', 'almoco', NULL,
   '[{"nome":"Filé de frango","quantidade":"150g"},{"nome":"Brócolis","quantidade":"1 xícara"},{"nome":"Cenoura","quantidade":"1"},{"nome":"Abobrinha","quantidade":"1/2"},{"nome":"Alho","quantidade":"2 dentes"},{"nome":"Azeite","quantidade":"1 colher"}]'::jsonb,
   ARRAY['Tempere o frango com sal, pimenta e alho.','Grelhe em frigideira até dourar dos dois lados (~6 min cada).','Refogue os legumes no azeite com alho até ficarem macios mas firmes.','Sirva o frango com os legumes ao lado.'],
   25, ARRAY['gluten','lactose','gestante'], true),

  ('Mix de castanhas e fruta', 'lanche', NULL,
   '[{"nome":"Castanhas","quantidade":"1 punhado"},{"nome":"Maçã","quantidade":"1 unidade"},{"nome":"Canela","quantidade":"a gosto"}]'::jsonb,
   ARRAY['Corte a maçã em fatias.','Polvilhe canela por cima.','Sirva com as castanhas.'],
   3, ARRAY['vegetariana','gluten','lactose','gestante'], true),

  ('Iogurte com frutas vermelhas', 'lanche', NULL,
   '[{"nome":"Iogurte natural","quantidade":"1 pote"},{"nome":"Mirtilo","quantidade":"1/2 xícara"},{"nome":"Morango","quantidade":"5 unidades"},{"nome":"Mel","quantidade":"1 colher (opcional)"},{"nome":"Granola sem açúcar","quantidade":"2 colheres"}]'::jsonb,
   ARRAY['Coloque o iogurte numa tigela.','Adicione as frutas por cima.','Polvilhe granola e mel a gosto.'],
   3, ARRAY['vegetariana','gestante'], true),

  ('Sopa cremosa de abóbora', 'jantar', NULL,
   '[{"nome":"Abóbora cabotiá","quantidade":"500g"},{"nome":"Cebola","quantidade":"1"},{"nome":"Alho","quantidade":"3 dentes"},{"nome":"Gengibre","quantidade":"1 pedaço pequeno"},{"nome":"Caldo de legumes","quantidade":"500ml"},{"nome":"Azeite","quantidade":"1 colher"}]'::jsonb,
   ARRAY['Refogue cebola, alho e gengibre no azeite.','Adicione a abóbora em cubos e o caldo.','Cozinhe até a abóbora ficar macia (~20 min).','Bata no liquidificador até ficar cremoso.','Sirva quente.'],
   30, ARRAY['vegetariana','gluten','lactose','gestante'], true),

  ('Omelete de espinafre', 'jantar', NULL,
   '[{"nome":"Ovos","quantidade":"3"},{"nome":"Espinafre","quantidade":"1 xícara"},{"nome":"Queijo branco","quantidade":"30g (opcional)"},{"nome":"Sal e pimenta","quantidade":"a gosto"}]'::jsonb,
   ARRAY['Bata os ovos com sal e pimenta.','Refogue rapidamente o espinafre.','Adicione os ovos batidos e cozinhe em fogo baixo.','Quando estiver firme dos lados, dobre ao meio.'],
   12, ARRAY['vegetariana','gluten','gestante'], true),

  ('Chá de camomila relaxante', 'cha', NULL,
   '[{"nome":"Camomila","quantidade":"1 sachê ou 1 colher"},{"nome":"Água","quantidade":"250ml"},{"nome":"Mel","quantidade":"opcional"}]'::jsonb,
   ARRAY['Aqueça a água sem ferver.','Adicione a camomila e abafe por 5 minutos.','Coe e adoce com mel se quiser.','Tome 1h antes de dormir.'],
   7, ARRAY['vegetariana','gluten','lactose','gestante'], true),

  ('Chá de gengibre e limão', 'cha', NULL,
   '[{"nome":"Gengibre","quantidade":"1 pedaço de 2cm"},{"nome":"Limão","quantidade":"1/2"},{"nome":"Água","quantidade":"300ml"},{"nome":"Mel","quantidade":"opcional"}]'::jsonb,
   ARRAY['Ferva a água com o gengibre fatiado por 5 minutos.','Desligue o fogo, adicione suco de limão.','Adoce com mel se desejar.','Ideal pela manhã ou após refeições pesadas.'],
   8, ARRAY['vegetariana','gluten','lactose'], true);
