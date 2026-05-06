## Ajustes de design, formatação e dados de exemplo

### 1. Botão secundário (verde-limão 50% + texto cinza escuro)
Atualizar `src/components/ui/button.tsx`, variante `secondary`:
- `bg-primary/50 text-neutral-800 hover:bg-primary/60`
- Mantém o token `--secondary` (marrom) para outros usos (Splash, avatar fallback, badges) para não quebrar a identidade.

### 2. Botões de fechar (X) visíveis
Em `src/components/ui/sheet.tsx` e `src/components/ui/dialog.tsx`, o `X` está `opacity-70` sem fundo nem padding — fica praticamente invisível sobre cards claros.

Novo estilo:
```
absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center
rounded-full bg-muted text-foreground hover:bg-muted/80
focus:outline-none focus:ring-2 focus:ring-ring
```
E aumentar o ícone para `h-5 w-5`.

Aplicar o mesmo padrão em close buttons "manuais" usados em `Dieta.tsx`, `Comunidade.tsx`, `Admin.tsx` (botões com `<X />` próprios) — padronizar para `h-9 w-9 rounded-full bg-muted`.

### 3. Verificação geral de design por tela
Passar nas telas e padronizar:
- **Home**: card secundário usa `bg-secondary` (marrom) — ok, é card de marca, manter.
- **Audios**: header já tem botão voltar; ajustar contraste do badge "Episódio" (já ok).
- **Comunidade**: garantir que os botões circulares de ação (Heart/Message/Send) tenham `border-border` e `text-foreground` (não usar `text-secondary` que ficou marrom).
- **Dieta**: o botão "Adicionar refeição" no Sheet usa `variant="secondary"` em lugar errado — revisar para usar `default` (lima sólido) no CTA principal e `secondary` (lima 50%) só em ações auxiliares (cancelar, voltar).
- **Missões / MissaoDetalhe / Notificações / Perfil / Chat**: revisar headers (espaçamento, tamanho do título), estados vazios e qualquer `shadow-*` remanescente.
- **Onboarding / Auth / ResetPassword**: revisar contraste de botões secundários após a mudança.

### 4. Dados de exemplo (placeholders) via migração SQL
Criar uma migração `seed` com inserts idempotentes (`ON CONFLICT DO NOTHING` ou `WHERE NOT EXISTS`):

- **audios_diarios** (3 episódios): "Bem-vinda ao desafio", "Quando bater a vontade", "Mente leve, corpo leve" — usando URLs de áudio públicos de placeholder (e.g. `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`) e capas via `https://images.unsplash.com/...`.
- **posts_comunidade** (4 posts) atrelados ao primeiro perfil admin existente (ou um post "fixado" da Let). Texto curto + imagem opcional.
- **missions** (3 missões para `dia_numero = 1`, se ainda vazias): "Beber 2L de água", "Caminhar 20 min", "Áudio diário da Let".
- **receitas** (3 receitas, café/almoço/jantar) com imagem placeholder, ingredientes e modo_preparo.

Os posts e refeições do usuário (`refeicoes_log`) não recebem seed porque dependem do `auth.uid()` real. Em vez disso, na **UI do Cardápio** mostrar um estado vazio mais convidativo quando não há refeições registradas no dia.

### 5. Arquivos editados
- `src/components/ui/button.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/dialog.tsx`
- `src/pages/Dieta.tsx` (revisão de variantes + estado vazio)
- `src/pages/Comunidade.tsx` (cores dos botões de ação)
- `src/pages/Audios.tsx` / `src/pages/Missoes.tsx` / `src/pages/Perfil.tsx` (revisão visual leve)
- Nova migração `supabase/migrations/<timestamp>_seed_placeholders.sql`

Sem mudanças de schema — apenas insert de dados e ajustes de CSS/JSX.
