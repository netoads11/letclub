
# Rebranding LET&PONTO → LETClub

Mudança puramente visual baseada nos prints enviados (Home light, Home dark, Cardápio, Splash light, Splash dark). Lógica, rotas, banco e edge functions permanecem intactos.

---

## Referência visual (prints enviados)

- **image.png** — Home tema **claro**: hero marrom com progresso branco, grid 2×2 de quick-actions com tile verde lima e seta ↗, card "Sua Jornada / Pontuação" verde pastel, card "Mensagem do Dia" branco, BottomNav claro com FAB central verde.
- **image-4.png** — Home tema **escuro**: mesma composição, fundo `#1A1A1A`, cards `#252525`, hero marrom mantido, card "Sua Jornada" verde pastel translúcido sobre fundo escuro.
- **image-2.png** — **Cardápio** tema claro: título grande "Histórico de alimentação", botões redondos no header (calendário cinza + `+` verde), cards brancos com refeição, ícone-chama marrom, kcal grande, miniatura quadrada da foto à direita, agrupamento "Hoje / Ontem".
- **image-3.png** — **Splash** claro: fundo marrom `#B07664` com blobs orgânicos mais escuros, logo **LETClub** preta com balão verde lima e sublinhado ondulado lima, dots de paginação.
- **image-5.png** — **Splash** escuro: fundo `#252525`, logo **LETClub** branca, mesmo balão lima e sublinhado ondulado.

---

## 1. Fonte Intelo

- Copiar os 10 `.woff2` enviados para `src/assets/fonts/intelo/`.
- Em `src/index.css`: remover `@import` Syne/Inter. Adicionar 10 `@font-face` (400/400i, 500/500i, 600/600i, 700/700i, 800/800i).
- `tailwind.config.ts`: `fontFamily.sans` e `fontFamily.display` = `['Intelo', 'system-ui', 'sans-serif']`.

## 2. Paleta (tokens HSL — light é o padrão)

Reescrever em `src/index.css`:

```text
:root (LIGHT — padrão)
  --background: 0 0% 97%        /* #F8F8F8 */
  --card:       0 0% 99%        /* #FCFCFC */
  --foreground: 0 0% 10%        /* #1A1A1A */
  --muted-foreground: 0 0% 53%  /* #888 */
  --primary:    71 75% 49%      /* #BFDB1E lima */
  --primary-foreground: 0 0% 10%
  --secondary:  13 33% 54%      /* #B07664 marrom */
  --secondary-foreground: 0 0% 100%
  --border:     0 0% 92%
  --ring:       71 75% 49%
  --radius:     1rem

.dark
  --background: 0 0% 10%        /* #1A1A1A */
  --card:       0 0% 14%        /* #252525 */
  --foreground: 0 0% 100%
  --muted-foreground: 0 0% 60%
  --border:     0 0% 18%
  /* primary e secondary inalterados */
```

Sombra utilitária: `--shadow-card: 0 1px 2px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04)`.

## 3. Logo LETClub

- Criar `src/assets/letclub-logo-light.svg` e `letclub-logo-dark.svg` reproduzindo a logo dos prints: wordmark "LETClub" + balão lima com ícone (ok/like) + sublinhado ondulado lima. Versão "dark" = letras brancas, versão "light" = letras `#1A1A1A`.
- Componente `src/components/Logo.tsx` que troca a imagem conforme tema (classe `.dark` no `<html>`) e aceita `size` prop.
- Substituir o texto "LET&PONTO" pelo `<Logo />` em: `Splash.tsx`, `Auth.tsx`, `AdminLogin.tsx`, `Onboarding.tsx`, `Home.tsx` (greeting/Mensagem da Let), `Perfil.tsx`.
- `index.html`: `<title>LETClub — 15 dias para sua transformação</title>`, atualizar OG/description, remover `class="dark"` do `<html>`, `theme-color` = `#F8F8F8`.
- `App.tsx`: Sonner `theme="light"`.
- README: trocar nome.
- Trocar referências textuais "LET&PONTO" / "Let&Ponto" remanescentes por "LETClub". Na **Mensagem do Dia** o avatar/nome aparece como **"LETClub"** com selo verde lima (ver image.png).

## 4. Splash redesign (image-3 / image-5)

`src/pages/Splash.tsx`:
- Light: fundo `bg-secondary` (#B07664) com 2 blobs SVG orgânicos mais escuros (topo-esquerda e base) em opacidade 25%.
- Dark: fundo `bg-card` (#252525) com mesmos blobs em opacidade 15%.
- Logo central via `<Logo />` (largura ~60% da tela).
- Dots de paginação (4 bolinhas, 1 ativa) abaixo da logo.
- Mantém o redirect lógico atual (sessão→home / sem sessão→auth) após ~1.5s.

## 5. Home redesign (image.png / image-4.png)

Reescrever `src/pages/Home.tsx`:

```text
[avatar redondo] Bom dia!                  [≡ menu]
                  Olá, {Nome} [● selo lima]

HERO MARROM (bg-secondary, rounded-3xl, p-6)
  ⚡ Desafio Diário                       60%
  Dia {N} de 15
  ▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱  (track: white/25, fill: white)
  {X} missões concluídas hoje.

GRID 2×2 (gap-3)
  ┌────────────┐ ↗   ┌────────────┐ ↗
  │ [tile lima]│     │ [tile lima]│
  │  🍎        │     │  💬        │
  │ Meu        │     │ Fale com   │
  │ Cardápio   │     │ a Let      │
  └────────────┘     └────────────┘
  ┌────────────┐ ↗   ┌────────────┐ ↗
  │  🎤 Áudios │     │  🎯 Missões│
  │  Diários   │     │  do dia    │
  └────────────┘     └────────────┘

CARD VERDE PASTEL (bg-primary/15, rounded-2xl)
  🔥 Sua Jornada            🔥 Pontuação
  5 Dias Seguidos              250 XP

CARD BRANCO — Mensagem do Dia
  [avatar Let] LETClub [✓ lima]    [🔖] [⋯]
  💚 Mensagem do Dia · Há 7 horas
  "Bom diaaaa, maravilhosa! ..."
```

Detalhes:
- Quick-action: card `bg-card rounded-2xl shadow-card p-4`, tile do ícone `bg-primary rounded-2xl p-2.5` com ícone preto, seta `ArrowUpRight` em `text-muted-foreground` no canto sup. direito.
- Hero: progresso real (`completedToday / totalToday`), Dia atual derivado de `challenge_start_date`.
- Card jornada: streak vem de `profile.streak_atual`, XP de `profile.xp_total`.
- Mensagem do Dia: texto de `configuracoes_app.mensagem_let_home`, autor = "LETClub".

## 6. Cardápio redesign (image-2.png)

Reescrever `src/pages/Dieta.tsx` (rota `/dieta`, label "Cardápio" no nav):

```text
Meu Cardápio
Histórico de alimentação        [📅] [+ lima]

Hoje                            07 de Maio de 2026
┌──────────────────────────────────────┐
│ Café da Manhã                  [img] │
│ 🔥 406-512 kcal                      │
│ 09h31                                │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ Almoço                         [img] │
│ ...                                  │
└──────────────────────────────────────┘

Ontem                           06 de Maio de 2026
...
```

- Header: título pequeno "Meu Cardápio" (`text-muted-foreground`), título grande "Histórico de alimentação" (Intelo Bold), dois botões circulares: cinza com ícone calendário + verde lima com `+`.
- Cards `bg-card rounded-2xl shadow-card p-4` com nome da refeição, kcal grande com ícone-chama marrom (`text-secondary`), horário, miniatura 64×64 `rounded-xl object-cover` à direita.
- Agrupamento por dia ("Hoje", "Ontem", datas anteriores).
- Como o schema atual de `receitas` é por tipo (café/almoço/lanche/jantar), por dia de desafio: mantemos a lógica existente de listar receitas do dia, exibidas no novo formato. O botão `+` (placeholder) abrirá futuramente um modal de "registrar refeição".

## 7. BottomNav redesign

`src/components/BottomNav.tsx`:
- Container: `bg-card border-t border-border` com sombra suave para cima.
- 5 tabs: **Início, Cardápio, [+], Comunidade, Let**.
- Inativo: ícone+label `text-secondary` (marrom).
- Ativo: chip arredondado `bg-secondary/15 rounded-2xl px-3 py-1.5` envolvendo ícone+label, ainda em `text-secondary`.
- Botão central: círculo `bg-primary` elevado (`-mt-6 shadow-lg rounded-2xl w-14 h-14`), ícone `Plus` preto. Por enquanto navega para `/missoes` (placeholder).
- Badge contador "3" no item Comunidade (lima, top-right do ícone) — ligar a contagem real depois; por ora estático.

## 8. Tema escuro consistente

Toggle de tema fica no Perfil (item futuro). Para esta passada: o `.dark` é totalmente suportado via tokens, e os prints dark (image-4, image-5) servem como referência. O app inicia em **claro** por padrão (sem `class="dark"` no `<html>`).

## 9. Migração de cores hardcoded

Substituir literais (`bg-[#0A0A0A]`, `bg-[#141414]`, `border-[#1E1E1E]`, `text-[#888]`, `text-[#AAA]`, `bg-[#FCFCFC]`, etc.) por tokens semânticos (`bg-background`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, `bg-secondary`) em:

`Auth.tsx`, `AdminLogin.tsx`, `Onboarding.tsx`, `Splash.tsx`, `Home.tsx`, `Missoes.tsx`, `MissaoDetalhe.tsx`, `Dieta.tsx`, `ReceitaDetalhe.tsx`, `Chat.tsx`, `Comunidade.tsx`, `Perfil.tsx`, `Notificacoes.tsx`, `ResetPassword.tsx`, `Admin.tsx`, `BottomNav.tsx`, `AppShell.tsx`.

## 10. Fora do escopo desta passada

- Redesign profundo de Missões, Chat, Comunidade, Perfil, Admin (recebem só a troca de tokens para coerência no tema claro; redesigns dedicados virão em PRs separadas conforme você for enviando referências).
- Mudanças de banco/edge functions/lógica de gamificação.
- Modal "registrar refeição" do botão `+` (apenas placeholder).

## 11. Detalhes técnicos

- Tokens em HSL (obrigatório).
- Componentes shadcn herdam automaticamente.
- Logos como SVG inline para nitidez em qualquer DPR; substituíveis pelos PNGs oficiais quando você enviar.
- Performance: `font-display: swap` em todos os `@font-face` da Intelo.
