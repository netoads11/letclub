## Ajuste do menu inferior (BottomNav)

Refatorar `src/components/BottomNav.tsx` para reproduzir exatamente o padrão da imagem de referência: cada aba é um "tile" arredondado com ícone centralizado dentro e o label abaixo do tile (não dentro). FAB central elevado em verde lima. Usar os SVGs da pasta `src/assets/icons/`.

### Mapeamento de ícones

- Início → `lucide-react` `Home` (não há SVG enviado para casa); ícone marrom (`text-secondary`)
- Cardápio → `src/assets/icons/maca.svg`
- (centro) FAB → ícone `Plus` do `lucide-react`, fundo `bg-primary` (lime)
- Comunidade → `src/assets/icons/comunidade.svg` + badge verde "3"
- Let → `src/assets/icons/chat-let.svg`

Os SVGs serão importados como `?react` (componente) para herdar `currentColor` quando possível; como os arquivos têm `fill` fixo, importaremos como `url` (`import x from '...svg'`) e renderizaremos via `<img>` dentro do tile, mantendo o tom original (marrom/verde) que já bate com a paleta.

### Estrutura visual do tile

```
┌─ tile 56x56 rounded-2xl ─┐
│         [icon 22]        │
└──────────────────────────┘
         Label (11px)
```

- Aba ativa: `bg-secondary/15` (marrom claro), ícone marrom, label `text-secondary font-semibold`
- Aba inativa: `bg-muted/40` (cinza muito claro como na referência), ícone marrom, label `text-secondary/80 font-medium`
- Espaço entre tile e label: `gap-1`
- Label sempre fora/abaixo do tile (na versão atual ele fica dentro)

### FAB central

- Tile 60x60 `rounded-2xl bg-primary` com `Plus` 28px preto
- Elevado `-mt-6` com sombra `shadow-lg` (sem ring branco mais — na referência o FAB se encaixa em linha com os outros tiles, apenas mais alto)
- Sem label abaixo (a referência não mostra label no +)

### Badge "Comunidade"

- Círculo verde `bg-primary` no canto superior direito do tile (não do ícone), `-top-1 -right-1`, `h-5 w-5`, número branco/preto `text-primary-foreground text-[10px] font-bold`

### Container

- Manter `fixed bottom-0`, fundo `bg-card`, borda superior, `pb-[env(safe-area-inset-bottom)]`
- Altura ligeiramente maior (~88px) para acomodar tile + label
- `justify-around` mantido

### Detalhes técnicos

- Arquivo único editado: `src/components/BottomNav.tsx`
- Importar SVGs: `import iconMaca from "@/assets/icons/maca.svg"` etc., usar `<img src={iconMaca} className="h-[22px] w-[22px]" alt="" />`
- Manter lógica de `hide` por rota e navegação `nav("/missoes")` no FAB
- Manter `tabs` array, mas cada item ganha `iconNode` (componente ou img) ao invés de só `icon`

Nenhuma outra mudança em rotas, lógica ou tokens de design.