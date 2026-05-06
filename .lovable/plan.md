# Ajustes solicitados

## 1. Home — botão de notificações no header
`src/pages/Home.tsx`:
- Substituir o botão `Menu` (ícone hambúrguer) por um botão com ícone `Bell` (lucide-react).
- Ao clicar, navegar para `/notificacoes` via `useNavigate`.
- Manter o mesmo estilo visual (`h-11 w-11 rounded-2xl bg-muted`).
- (Opcional) Mostrar um pontinho vermelho se houver `notificacoes` não lidas para o usuário (consulta simples a `notificacoes` com `lida=false` count).

## 2. BottomNav — proporção e remover badge "3" fixo
`src/components/BottomNav.tsx`:
- Remover o `badge: 3` hardcoded da aba **Comunidade**. O badge passa a ser dinâmico: um `useEffect` consulta `notificacoes` (count `lida=false` para o usuário logado) — só mostra quando > 0. Para começar simples e bater com o pedido, vamos apenas **remover o número fixo** (deixando o componente preparado para badges reais via prop, mas sem mostrar nada por padrão).
- Ajustar proporções para combinar com o print:
  - Reduzir altura para `72px` (em vez de 86px).
  - Ícones em `h-9 w-9` (em vez de 10).
  - Botão `+` central: `h-[60px] w-[60px] rounded-[20px]`, `-mt-7`, mantendo elevação/sombra verde.
  - Labels em `text-[11px]`, espaçamento `gap-1`, padding-top reduzido.
  - Atualizar `style={{ height: "calc(72px + env(safe-area-inset-bottom))" }}` e `h-[72px]` no container.

## 3. Tela de Cardápio (`src/pages/Dieta.tsx`)
Hoje os dois botões do header não fazem nada. Implementar:

### 3a. Botão verde "+" → adicionar refeição com foto
- Abrir um `Sheet` (bottom sheet) com formulário:
  - Tipo de refeição (`Select`: Café da Manhã, Almoço, Lanche, Jantar, Chá)
  - Nome (`Input`, opcional)
  - Calorias (`Input` numérico, opcional)
  - Foto (input file, com preview) — upload para storage bucket `refeicoes` (mesmo padrão do `avatars`).
  - Botão "Salvar refeição".
- Persistir em uma nova tabela `refeicoes_log`:
  ```
  id uuid pk default gen_random_uuid()
  user_id uuid not null references auth.users on delete cascade
  tipo_refeicao text not null
  nome text
  kcal int
  imagem_url text
  registrado_em timestamptz not null default now()
  ```
  RLS: `select/insert/update/delete using (auth.uid() = user_id)`.
- Bucket de storage `refeicoes` público, com policy de upload restrita ao próprio user (`{user_id}/...`).
- Após salvar, refazer a busca e atualizar a lista da data selecionada.

### 3b. Botão de calendário → seletor de data como filtro
- Trocar o ícone por botão que abre um `Popover` com o componente `Calendar` (já em `src/components/ui/calendar.tsx`).
- Estado `selectedDate` (default: hoje).
- A listagem passa a ser:
  - Para a data selecionada: itens de `refeicoes_log` do usuário no dia escolhido.
  - "Hoje" / "Ontem" / "Outra data" como cabeçalho conforme a data.
- Manter a fonte de receitas sugeridas como fallback se ainda não houver registros, ou separar como seção "Sugestões do dia".

## 4. Botão de voltar em Missões e Áudios Diários
Atualmente `Missoes.tsx` (rota `/missoes`) não tem botão de voltar — só um de calendário/histórico.
- Adicionar botão `ChevronLeft` no header (estilo igual ao do Perfil: `nav(-1)` em `<button>` minimalista) à esquerda do título "Missões do dia".
- Em `MissaoDetalhe.tsx` já existe `ChevronLeft` no início; verificar e padronizar caso difira.
- "Áudios Diários" hoje aponta para `/missoes` (mesma página). Se for confirmado o mesmo destino, basta o ajuste em `Missoes.tsx`. Caso o usuário queira uma rota separada futuramente, criamos depois.

## 5. Perfil — editar nome de usuário
`src/pages/Perfil.tsx` já tem campo "Nome" no bottom-sheet de Configurações com `Input` + botão "Salvar perfil" que chama `saveProfile` (atualiza `full_name` em `profiles`).

Para deixar mais visível e atender ao pedido:
- Renomear a label para "Nome de usuário".
- Manter `saveProfile` como está.
- (Confirmação visual) Adicionar `toast` já está. Sem mudanças adicionais necessárias além da label/clareza.

## Resumo de arquivos
- `src/pages/Home.tsx` — botão `Bell` + navegar para `/notificacoes`.
- `src/components/BottomNav.tsx` — remover badge fixo, ajustar tamanhos.
- `src/pages/Dieta.tsx` — sheet de adicionar refeição, popover de calendário, listagem por data.
- `src/pages/Missoes.tsx` — botão `ChevronLeft` no header.
- `src/pages/Perfil.tsx` — label "Nome de usuário".
- Migration SQL: criar tabela `refeicoes_log` + RLS, criar bucket `refeicoes` + policies.

Aprove para eu implementar.