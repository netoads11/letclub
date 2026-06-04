export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  ResetPassword: undefined;
  Onboarding: undefined;
  Main: undefined;
  Missoes: undefined;
  MissaoDetalhe: { id: string };
  ReceitaDetalhe: { id: string };
  Perfil: undefined;
  Notificacoes: undefined;
  Audios: undefined;
  Admin: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Dieta: undefined;
  Publicar: undefined;
  Comunidade: { openPost?: boolean } | undefined;
  Chat: undefined;
};
