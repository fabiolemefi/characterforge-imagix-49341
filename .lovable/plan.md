

# Plano: Substituir Indicador de Seleção por Contorno Azul

## Problema Identificado

Atualmente, quando um bloco é selecionado no editor Efi Code, o indicador visual usa classes `ring-2 ring-primary ring-offset-2` que criam um efeito de "anel" com espaçamento. O `ring-offset` gera linhas horizontais visíveis (as "barras" que você circulou) porque cria um espaço entre o conteúdo e o anel.

## Solução Proposta

Substituir o indicador `ring-*` por um `outline` sólido que contorne o bloco diretamente, sem espaçamento. Isso dará a impressão visual de "bloco selecionado" que você deseja.

```text
ANTES (ring com offset):
┌─────────────────────────────────────┐ ← linha do ring
│                                     │ ← espaço do offset
│ ┌─────────────────────────────────┐ │
│ │       Conteúdo do bloco         │ │
│ └─────────────────────────────────┘ │
│                                     │ ← espaço do offset
└─────────────────────────────────────┘ ← linha do ring

DEPOIS (outline direto):
┌─────────────────────────────────────┐
│       Conteúdo do bloco             │ ← outline azul diretamente
└─────────────────────────────────────┘
```

## Estilo de Seleção Novo

Vou usar `outline` que não afeta o layout e contorna o elemento diretamente:

```css
/* Antes */
ring-2 ring-primary ring-offset-2

/* Depois */
outline outline-2 outline-blue-500 outline-offset-0
/* Ou com box-shadow para efeito mais suave */
box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.8);
```

## Arquivos a Modificar

| Arquivo | Componente | Alteração |
|---------|------------|-----------|
| `src/components/eficode/user-components/HtmlBlock.tsx` | HtmlBlock | Trocar `ring-*` por `outline` ou `box-shadow` |
| `src/components/eficode/user-components/Container.tsx` | Container | Adicionar indicador de seleção (atualmente não tem) |
| `src/components/eficode/user-components/Divider.tsx` | Divider | Trocar `border dashed` por `outline` sólido |
| `src/components/eficode/user-components/Heading.tsx` | Heading | Trocar `border dashed` por `outline` sólido |
| `src/components/eficode/user-components/Text.tsx` | Text | Trocar `border dashed` por `outline` sólido |
| `src/components/eficode/user-components/Button.tsx` | Button | Trocar `border dashed` por `outline` sólido |
| `src/components/eficode/user-components/Image.tsx` | Image | Trocar `border dashed` por `outline` sólido |
| `src/components/eficode/user-components/Spacer.tsx` | Spacer | Trocar `border dashed` por `outline` sólido |

## Implementação Detalhada

### Estilo Padrão de Seleção

Usarei `box-shadow` em vez de `outline` porque funciona melhor com elementos que têm `overflow: hidden` ou bordas arredondadas:

```typescript
// Constante para reutilização
const SELECTION_STYLE = {
  boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.8)', // Azul sólido
  // Ou para efeito mais suave com "glow":
  // boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.8), 0 0 8px rgba(59, 130, 246, 0.4)',
};
```

### HtmlBlock.tsx (Linha 259)

```tsx
// Antes
className={`relative ${className} ${enabled && selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}

// Depois - usando style inline
className={`relative ${className}`}
style={{
  boxShadow: enabled && selected ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none',
}}
```

### Outros Componentes (Divider, Heading, Text, Button, Image, Spacer)

```tsx
// Antes
border: isActive ? '1px dashed #3b82f6' : '1px dashed transparent',

// Depois
boxShadow: isActive ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none',
// Remover a borda tracejada
```

### Container.tsx (Adicionar indicador)

```tsx
// Adicionar isActive ao useNode
const { connectors: { connect, drag }, isActive } = useNode((node) => ({
  isActive: node.events.selected,
}));

// Adicionar style
style={{
  // ... estilos existentes ...
  boxShadow: isActive ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none',
}}
```

## Resultado Visual Esperado

- Bloco selecionado terá um contorno azul sólido de 2px
- Sem espaçamento entre o contorno e o conteúdo
- Visual limpo e moderno, similar a editores como Figma ou Notion
- Cor azul `#3b82f6` (blue-500 do Tailwind) com 80% de opacidade

