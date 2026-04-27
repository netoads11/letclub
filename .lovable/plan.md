# LET&PONTO — 15-day gamified health challenge platform

A mobile-first web app for Brazilian women running a 15-day nutrition + wellness challenge. Built with React + Tailwind, Lovable Cloud (Supabase) for backend, and Lovable AI for the in-app coach "Let". All UI in Brazilian Portuguese. PWA layer skipped for now — the app is fully mobile-optimized and can be installed later.

---

## Visual identity

- Dark theme — bg `#0A0A0A`, surfaces `#141414`, borders `#1E1E1E`
- Lime accent `#CDFF00` for primary actions, streaks, progress
- Text `#FFFFFF` primary, `#888888` secondary
- Radii: 16px cards, 12px buttons, 24px modals
- Syne (headings) + Inter (body) from Google Fonts
- 390px reference viewport, fixed bottom nav (5 tabs), smooth fade/slide transitions

All tokens defined as HSL CSS variables in `index.css` and mapped through `tailwind.config.ts` so components stay theme-driven.

---

## What gets built

### Auth & onboarding
- Email/password signup + login (Lovable Cloud Auth) with "Esqueci minha senha"
- Auto-create `profiles` row on signup via DB trigger
- 3-step onboarding (welcome → physical data + main difficulty → notification opt-in)
- After onboarding, `challenge_start_date` is set and the 15-day clock starts

### Aluna app — bottom nav
1. **Home** — greeting, day X of 15 progress card, quick-access grid, streak card with flame, "Mensagem da Let" pulled from global config, bell with unread count, avatar → Profile
2. **Missões do Dia** — today's missions from DB, check-in button per mission, padlock for future days, confetti when day is fully complete, "Ver dias anteriores" calendar view, mission detail screen with optional video + free-text note
3. **Dieta** — tabs Café / Almoço / Lanche / Jantar + Chás section, recipes filtered by current day and the user's `restricoes_alimentares`, recipe detail with ingredients + steps + favorite heart
4. **Fale com a Let** (AI chat) — streaming chat with Let persona, suggestion chips from config, 👍/👎 feedback per message, "Nova conversa", fixed medical disclaimer
5. **Comunidade** — feed of posts (280 char + optional image), 3 reactions (coração / força / fogo, one per user per post), share FAB with image upload, report button, pinned rules banner

Plus, accessed from the header avatar:
- **Perfil** — avatar, name, current day, peso inicial vs atual vs meta, weight chart (Recharts), badges grid (unlocked vs locked), streak atual + recorde, settings (edit profile, change email/password, notifications toggle, dietary restrictions, log new weight, logout, support)
- **Notificações** — list with unread highlight, marks read on open

### Let AI chat
- Edge function `chat-with-let` calls Lovable AI Gateway (default model `google/gemini-3-flash-preview`) with streaming SSE
- System prompt stored in `configuracoes_app` and editable from admin
- Persona: empática, informal, pt-BR, escopo nutrição/desafio; valida pergunta antes de responder; redireciona temas fora de escopo com a frase padrão do brief
- Handles 429/402 errors with friendly toasts
- Messages persisted to `chat_messages`; "Nova conversa" soft-deletes by session

### Gamification engine
Implemented as Postgres triggers + a small edge function so logic is server-authoritative and can't be cheated client-side:
- +10 XP per check-in, +50 bonus when all of day's missions done, +30 at 3-day streak, +100 at 7-day streak, +5 per community post
- Streak: increments on any check-in today, breaks if no check-in for 48h, updates `streak_recorde` automatically
- Badge unlocks: Primeiro passo, Começou com tudo, Uma semana forte, Desafio completo, Voz da comunidade — inserted into `user_badges` and trigger an in-app notification

### Access control by day
- Days 1–15: full access
- Days 16–22: Comunidade + Dieta accessible, Missões locked with explainer
- Day 23+: renewal/upsell screen

### Admin panel — `/admin` (route-protected by `has_role(uid, 'admin')`)
- **Dashboard** — total alunas ativas, % conclusão diária, top 10 XP, abandono por dia (Recharts)
- **Gestão de Alunas** — table with status, view details, block/unblock, trigger password reset
- **Gestão de Missões** — CRUD, reorder within a day
- **Gestão de Receitas** — CRUD with image upload to Storage
- **Gestão de Badges** — CRUD + ativo toggle
- **Comunidade (Moderação)** — full feed including reported, remove post, broadcast (notification + pinned post)
- **Chat IA** — edit system prompt + 3 suggestion chips, view anonymized logs with 👍/👎 stats, top questions
- **Configurações Globais** — edit `mensagem_let_home`, daily reminder time

### Seed data (pt-BR)
- 15 missões (uma por dia, variadas: hidratação, movimento, alimentação consciente, autocuidado…)
- 10 receitas cobrindo todos os tipos de refeição + chás
- 5 badges com nomes/descrições
- 3 posts de comunidade de exemplo
- 1 admin (você indica o e-mail no primeiro login e eu te promovo) + 1 usuária teste "Letícia" (dia 7, streak 5, 3 badges)

### Notifications
- In-app only for v1: bell icon + `notificacoes` table + sonner toasts. No browser web push.

---

## Technical notes (for reference)

- **Stack**: React + Vite + TypeScript + Tailwind, Lucide icons, Recharts, sonner toasts, react-router
- **Backend**: Lovable Cloud (Supabase) — Auth, Postgres, Storage, Edge Functions
- **AI**: Lovable AI Gateway via edge function, streaming SSE, default `google/gemini-3-flash-preview`
- **Roles**: separate `user_roles` table + `app_role` enum + `has_role()` security-definer function (no role on profiles, prevents privilege escalation)
- **RLS** on every table — users only read/write their own rows; admins gated via `has_role`
- **Storage buckets**: `avatars` (public), `community-posts` (public), `recipes` (public, admin-write)
- **Gamification**: Postgres triggers on `checkins` and `posts_comunidade` to update XP, streak, badges, notifications atomically
- **Day calc**: derived in SQL from `challenge_start_date` so all clients agree
- **PWA**: skipped — plain mobile-first responsive app; can be added later

---

## Out of scope (per brief)
Payment gateway, native apps, social login, follow system, post comments, photo macro calculation, browser web push, full PWA/offline.

---

## After you approve
I'll enable Lovable Cloud, create the schema + RLS + triggers + seeds, build all aluna screens, the admin panel, and the Let chat edge function in one pass. You'll get a working app you can sign up to immediately — tell me your admin email and I'll promote that account on first login.