# Plano: Redesenho da tela Meu Perfil

Reestruturar `src/pages/Perfil.tsx` para seguir fielmente o mockup enviado, mantendo toda a lógica existente (upload de avatar, edição, peso, configs, logout, badges).

## Mudanças no header

- Topo com `< @username` à esquerda (handle gerado a partir do email/nome, ex: `@mari.port`), ícone `selo.svg` ao lado e texto `Seu Perfil`.
- Botão `...` (três pontos) à direita em pill cinza claro — abre o Sheet de Configurações (substitui o ícone Settings atual).

## Bloco do avatar

- Avatar grande quadrado-arredondado (~140px, `rounded-3xl`) com borda lima grossa (`border-4 border-primary`).
- Selo (`selo.svg`) sobreposto no canto inferior direito do avatar.
- Nome completo em destaque (`font-display text-2xl font-bold`) centralizado.
- Subtítulo "Membra Fundadora" (badge textual cinza). Por enquanto fixo; pode virar campo dinâmico depois.

## Card de pesos + gráfico de barras

Card branco (`bg-card`) único, arredondado, com:

1. **Linha superior** com 3 colunas separadas por divisor vertical:
   - Peso inicial / Peso Atual / Meta — labels pequenos cinza acima, valor em bold grande, "kg" pequeno.
   - Na coluna Meta, ícone `alvo.svg` à esquerda do valor.

2. **Gráfico de barras customizado** (substitui o LineChart atual nesta tela):
   - Usar Recharts `BarChart` com 6 últimos registros de `pesos_historico`.
   - Cada barra dupla: barra sólida lima (peso real) + barra "fantasma" tracejada/listrada atrás (representando meta/referência) — implementar com duas `<Bar>` sobrepostas, a de fundo com padrão SVG listrado em rosa claro.
   - Labels embaixo: peso em bold + data `dd/MM` em cinza menor.
   - Sem eixos, sem grid, sem tooltip — visual limpo conforme mockup.

## Card "Sua Jornada" (streak)

Card largo verde claro (`bg-primary/10`):
- Esquerda: ícone `fogo-simples.svg` + "Sua Jornada" / "{streak_atual} Dias Seguidos" / "Recorde: {streak_recorde} dias".
- Direita: ícone `selo.svg` (ou troféu) + "Meta" / "15 Dias".

Substitui os dois cards atuais de Sequência/Recorde.

## Card "Calorias do dia"

Novo card branco abaixo:
- Esquerda: "Calorias do dia" + ícone `fogo-simples.svg` + valor `{kcal_hoje} kcal` + timestamp "DD de Mês, HHhMM".
- Direita: ícone `fogo-duplo.svg` grande + "Meta do dia" + "1.600 kcal".

Buscar kcal do dia em `checkins`/`refeicoes` se existir, senão exibir `0 kcal` por enquanto (verificar schema antes de implementar — se não houver campo, deixar valor placeholder configurável e nota TODO).

## Conquistas

Manter grid de badges existente abaixo dos novos blocos (já está alinhado ao estilo).

## Tema / paleta

Tudo na paleta lima `--primary` + marrom/rosa apoio já definidos em `index.css`. Sem cores fora do design system. Bordas suaves, sombras sutis, fundo `bg-background` (claro).

## Detalhes técnicos

- Arquivo único editado: `src/pages/Perfil.tsx`.
- Importar SVGs: `selo`, `alvo`, `fogo-simples`, `fogo-duplo` de `@/assets/icons/`.
- Handle `@username`: derivar de `profile.email.split('@')[0]` truncado, fallback ao primeiro nome.
- Gráfico: criar componente local `WeightBarChart` dentro do arquivo para encapsular a lógica de barras duplas com padrão listrado (definir `<defs><pattern>` SVG).
- Manter Sheet de configurações intacto, apenas trocar o trigger (botão `...`).
- Remover ícone `Settings` import; usar `MoreHorizontal` do lucide.
- Todo CSS via Tailwind tokens semânticos — nada hardcoded.

## Fora de escopo

- Edição do "Membra Fundadora" (texto fixo nesta iteração).
- Cálculo real de calorias do dia se não houver dados — usar 0/placeholder.
