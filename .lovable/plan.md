
# Plano: Corrigir Tela Branca - Conflito Tailwind v4

## Problema Identificado

O screenshot mostra o erro:
```
`@layer base` is used but no matching `@tailwind base` directive is present
```

Isso acontece porque:

1. O arquivo `postcss.config.js` ainda existe com sintaxe do Tailwind v3
2. Esse arquivo está conflitando com o plugin `@tailwindcss/vite` no `vite.config.ts`
3. O PostCSS carrega o `postcss.config.js` do disco ANTES de considerar a config inline

```text
CONFLITO ATUAL:
┌─────────────────────────────────────────────────────────────┐
│ vite.config.ts                                              │
│   ├── @tailwindcss/vite plugin (v4) ✓                      │
│   └── css.postcss.plugins: [] (tentativa de override)      │
└─────────────────────────────────────────────────────────────┘
         ↓ CONFLITO
┌─────────────────────────────────────────────────────────────┐
│ postcss.config.js (arquivo no disco)                       │
│   ├── tailwindcss: {} (v3 syntax) ✗                        │
│   └── autoprefixer: {}                                     │
└─────────────────────────────────────────────────────────────┘
         ↓ RESULTADO
┌─────────────────────────────────────────────────────────────┐
│ PostCSS tenta usar tailwindcss como plugin v3              │
│ Falha ao processar @layer base sem @tailwind base          │
└─────────────────────────────────────────────────────────────┘
```

## Solucao

Preciso remover o `postcss.config.js` e ajustar o `index.css` para usar a sintaxe correta do Tailwind v4.

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `postcss.config.js` | Remover | Elimina conflito com @tailwindcss/vite |
| `src/index.css` | Modificar | Remover `@layer base` incompativel |
| `vite.config.ts` | Modificar | Remover config postcss inline (desnecessaria) |

## Implementacao Detalhada

### 1. Remover postcss.config.js

O arquivo precisa ser deletado porque:
- O plugin `@tailwindcss/vite` ja inclui processamento PostCSS
- Ter ambos causa conflito de versoes

### 2. Ajustar src/index.css

Remover o bloco `@layer base` e mover os estilos para CSS regular:

```css
/* ANTES (incompativel) */
@layer base {
  * {
    border-color: var(--border);
  }
  body {
    background-color: var(--background);
    color: var(--foreground);
    overflow-x: hidden;
  }
}

/* DEPOIS (compativel v4) */
* {
  border-color: var(--border);
}

body {
  background-color: var(--background);
  color: var(--foreground);
  overflow-x: hidden;
}
```

### 3. Limpar vite.config.ts

Remover a configuracao `css.postcss.plugins` que foi adicionada como workaround:

```typescript
// REMOVER este bloco
css: {
  postcss: {
    plugins: [],
  },
},
```

## Ordem de Execucao

1. Deletar `postcss.config.js`
2. Atualizar `src/index.css` removendo `@layer base`
3. Limpar `vite.config.ts` removendo config postcss inline

## Resultado Esperado

- Build compila sem erros
- CSS do Tailwind v4 processa corretamente
- Aplicacao renderiza com o novo design system
