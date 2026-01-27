
# Plano: Migrar para Tailwind CSS v4 com Novo Theme

## Visão Geral

Vou migrar o projeto de Tailwind CSS v3 para v4, aplicando o theme que você forneceu. O Tailwind v4 traz uma nova arquitetura baseada em CSS nativo, removendo a necessidade de `tailwind.config.ts` e usando `@theme` diretamente no CSS.

## Mudanças Principais do Tailwind v4

```text
Tailwind v3                          Tailwind v4
─────────────────────────────────    ─────────────────────────────────
tailwind.config.ts (JS)         →    @theme no CSS (nativo)
postcss.config.js + plugins     →    @tailwindcss/vite plugin
@tailwind base/components/utils →    @import "tailwindcss"
hsl(var(--color))               →    var(--color-*) direto
```

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `package.json` | Modificar | Atualizar dependências do Tailwind |
| `vite.config.ts` | Modificar | Adicionar plugin @tailwindcss/vite |
| `postcss.config.js` | Remover | Não é mais necessário com Vite plugin |
| `tailwind.config.ts` | Remover | Configuração migra para CSS |
| `src/index.css` | Reescrever | Aplicar @theme com novo design system |
| `src/lib/utils.ts` | Manter | tailwind-merge continua funcionando |

## Implementação Detalhada

### 1. Atualizar Dependências (package.json)

Remover:
- `tailwindcss` v3
- `autoprefixer`
- `tailwindcss-animate`

Adicionar:
- `tailwindcss` v4 (^4.0.0)
- `@tailwindcss/vite` (plugin para Vite)

### 2. Configurar Vite Plugin (vite.config.ts)

```typescript
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Novo plugin
    // ...
  ],
})
```

### 3. Remover Arquivos Obsoletos

- `postcss.config.js` - Não é necessário com @tailwindcss/vite
- `tailwind.config.ts` - Configuração migra para CSS

### 4. Reescrever src/index.css

O novo arquivo vai conter:
- `@import "tailwindcss"` (substitui @tailwind directives)
- Seu `@theme inline` completo com todas as variáveis
- Mapeamento de variáveis semânticas para shadcn/ui
- Estilos customizados existentes (.feature-card, .efi-editor-viewport, etc.)

```css
@import "tailwindcss";

@theme inline {
  /* Seu theme completo aqui */
  --font-family-sans: 'Red Hat Display';
  --font-family-mono: 'Red Hat Mono';
  
  --color-orange-500: rgb(243 112 33);
  --color-blue-500: rgb(11 161 194);
  /* ... todas as outras variáveis ... */
}

/* Variáveis semânticas para shadcn/ui (compatibilidade) */
:root {
  --background: var(--color-elevation-0);
  --foreground: var(--color-white);
  --card: var(--color-card-state-default);
  --primary: var(--color-blue-500);
  /* ... mapeamento completo ... */
}
```

### 5. Mapeamento de Cores para shadcn/ui

Os componentes shadcn/ui usam variáveis como `bg-card`, `text-primary`, etc. Vou mapear seu theme para essas variáveis semânticas:

| shadcn Variable | Seu Theme Variable |
|-----------------|-------------------|
| `--background` | `--color-elevation-0` (dark) / `--color-gray-100` (light) |
| `--foreground` | `--color-white` (dark) / `--color-black` (light) |
| `--card` | `--color-card-state-default` |
| `--primary` | `--color-blue-500` |
| `--secondary` | `--color-orange-500` |
| `--destructive` | `--color-red-500` |
| `--muted` | `--color-gray-800` |
| `--accent` | `--color-blue-600` |
| `--border` | `--color-overlay-1` |

### 6. Breakpoints Customizados

Seu theme define breakpoints diferentes:
```css
--breakpoint-sm: 360px;
--breakpoint-md: 992px;
--breakpoint-lg: 1366px;
--breakpoint-xl: 1920px;
```

Estes substituirão os breakpoints padrão do Tailwind.

### 7. Escala de Tamanhos

Seu theme tem uma escala de sizes customizada que será aplicada:
```css
--size-4: 0.25rem;
--size-8: 0.5rem;
/* ... até --size-120: 7.5rem */
```

### 8. Manter Funcionalidades Existentes

- Animações customizadas (accordion, fade, slide)
- Estilos .efi-editor-viewport para isolamento CSS
- Classes utilitárias (.feature-card, .run-button)
- Modo escuro via classe `.dark`

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Classes Tailwind podem ter mudado | v4 mantém maioria das classes; testar componentes principais |
| tailwind-merge pode ter incompatibilidades | v4 é compatível; atualizar se necessário |
| Animações podem precisar de ajuste | Recriar keyframes no novo formato |
| Cores HSL vs RGB | Converter variáveis shadcn para usar RGB direto |

## Resultado Esperado

- Theme dark aplicado por padrão (conforme --tema-name: 'dark')
- Cores da marca Efi Bank consistentes em todo o app
- Typography com Red Hat Display/Mono
- Breakpoints customizados funcionando
- Todos os componentes shadcn/ui funcionando normalmente
- Escala de espaçamento e tamanhos customizada

## Ordem de Execução

1. Atualizar package.json com novas dependências
2. Atualizar vite.config.ts com plugin
3. Reescrever src/index.css com @theme
4. Remover arquivos obsoletos (postcss.config.js, tailwind.config.ts)
5. Testar componentes principais

## Seção Técnica

### Diferenças de Sintaxe Importantes

**Cores no v4:**
```css
/* v3: hsl(var(--primary)) */
/* v4: var(--color-primary) ou rgb direto */
```

**Classes de cor customizadas:**
```css
/* v3: bg-primary → hsl(var(--primary)) */
/* v4: bg-primary → usa cor definida em @theme automaticamente */
```

**Dark mode:**
```css
/* v3: .dark { --background: ... } */
/* v4: @variant dark { ... } ou seletor .dark normal */
```
