
# Plano: Fazer Blocos Ocuparem Toda a Área do Editor

## Problema Identificado

Analisando a estrutura do editor, identifiquei que a cadeia de altura está quebrada:

```text
main.flex-1.overflow-auto           ← OK: altura 100% do layout
  └── div.efi-editor-viewport       ← PROBLEMA: só tem minHeight: 600px, não height: 100%
       └── Frame (Craft.js)
            └── Container ROOT      ← height: 100%, mas 100% de nada definido!
                 └── HtmlBlock      ← flex-1 (tentando expandir, mas não tem espaço)
```

O viewport container não tem `height: 100%` ou `h-full`, então quando um bloco é arrastado, ele não expande para ocupar toda a área visível porque o Container ROOT não tem uma altura real para herdar.

## Solução

Adicionar `h-full` (ou altura 100%) à div `efi-editor-viewport` para que a cadeia de altura funcione corretamente do topo até o HtmlBlock.

## Alterações

### Arquivo: `src/pages/EfiCodeEditor.tsx`

| Linha | De | Para |
|-------|-----|------|
| ~346 | `className="mx-auto overflow-hidden transition-all duration-300 efi-editor-viewport"` | `className="mx-auto overflow-hidden transition-all duration-300 efi-editor-viewport h-full"` |

### Código Específico

```tsx
// Antes (linha ~345-356)
<div 
  className={`mx-auto overflow-hidden transition-all duration-300 efi-editor-viewport ${pageSettings.containerClasses || ''}`}
  style={{
    minHeight: '600px',
    maxWidth: ...
  }}
>

// Depois
<div 
  className={`mx-auto overflow-hidden transition-all duration-300 efi-editor-viewport h-full ${pageSettings.containerClasses || ''}`}
  style={{
    minHeight: '600px',
    maxWidth: ...
  }}
>
```

## Resultado Esperado

Após a alteração, a cadeia de altura funcionará corretamente:

```text
main.flex-1.overflow-auto           ← altura do viewport
  └── div.efi-editor-viewport.h-full ← AGORA: herda altura do pai
       └── Frame (Craft.js)
            └── Container ROOT      ← height: 100% funciona!
                 └── HtmlBlock      ← flex-1 expande para preencher!
```

## Resumo

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `EfiCodeEditor.tsx` | ~346 | Adicionar `h-full` à classe da div viewport |
