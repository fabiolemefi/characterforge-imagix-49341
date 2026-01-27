
# Plano: Restaurar Tailwind CSS v3

## Situação Atual

O projeto está usando Tailwind v4 com sintaxe incompatível:

| Arquivo | Estado Atual |
|---------|-------------|
| `package.json` | Tailwind v4 (`^4.1.18`), `@tailwindcss/vite`, `@tailwindcss/postcss` |
| `vite.config.ts` | Plugin `@tailwindcss/vite` ativo |
| `src/index.css` | Sintaxe v4: `@import "tailwindcss"`, `@theme inline` |
| `tailwind.config.ts` | **NÃO EXISTE** (deletado) |

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `tailwind.config.ts` | **CRIAR** - Configuração completa v3 |
| `src/index.css` | **REESCREVER** - Sintaxe v3 |
| `vite.config.ts` | **MODIFICAR** - Remover plugins v4 |
| `postcss.config.js` | **MANTER** - Já está correto |
| `package.json` | **MODIFICAR** - Downgrade dependências |

## Detalhes Técnicos

### 1. Criar tailwind.config.ts

Configuração completa com todas as cores da marca Efí Bank:

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cores Efí Bank
        orange: { 100-800 },
        blue: { 100-800 },
        // Tokens semânticos
        border, background, foreground,
        primary, secondary, muted, accent,
        destructive, card, popover, sidebar
      },
      // Animações, fontes, etc.
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

### 2. Reescrever src/index.css

Converter de v4 para v3:

```css
/* ANTES (v4) */
@import "tailwindcss";
@theme inline { --color-blue-500: rgb(...); }

/* DEPOIS (v3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 7%;
  --primary: 191 100% 40%;
  /* etc... */
}
```

### 3. Modificar vite.config.ts

Remover plugins v4 e configuração de postcss inline:

```typescript
// REMOVER
import tailwindcss from "@tailwindcss/vite";
tailwindcss() // do plugins
css: { postcss: {...} } // bloco inteiro

// MANTER apenas
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
```

### 4. Modificar package.json

Downgrade das dependências:

```json
// REMOVER de dependencies:
"@tailwindcss/postcss": "^4.1.18"
"@tailwindcss/vite": "^4.1.18"

// MUDAR em devDependencies:
"tailwindcss": "^4.1.18" → "^3.4.0"

// ADICIONAR em devDependencies:
"tailwindcss-animate": "^1.0.7"
```

## Cores a Preservar

As cores do CSS v4 atual serão convertidas para formato HSL do v3:

| Cor | RGB (v4) | HSL (v3) |
|-----|----------|----------|
| `blue-500` | `rgb(11 161 194)` | `191 89% 40%` |
| `orange-500` | `rgb(243 112 33)` | `23 90% 54%` |
| `black` | `rgb(18 18 18)` | `0 0% 7%` |
| `white` | `rgb(255 255 255)` | `0 0% 100%` |

## Resultado Esperado

- Aplicação renderiza normalmente
- Tema escuro funciona corretamente
- Todas as cores da marca Efí preservadas
- Compatibilidade com shadcn/ui
- Animações funcionando
