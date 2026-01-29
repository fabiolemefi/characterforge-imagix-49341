

# Plano: Corrigir Clique para Abrir Painel de Propriedades

## Problema Identificado

O clique não funciona por dois motivos:

### 1. Erro de Runtime (principal)
```text
Erro: Cannot read properties of undefined (reading 'stopPropagation')
```

O clique pode vir de duas fontes:
- **Overlay** (passa o evento MouseEvent)
- **postMessage do iframe** (NÃO passa evento - é `undefined`)

Quando vem do iframe via postMessage, `handleContainerClick(e)` recebe `undefined` e `e.stopPropagation()` falha.

### 2. Fluxo do Clique
```text
Clique no conteúdo do iframe
  → iframe envia postMessage('eficode-iframe-click')
  → IframePreview recebe e chama onClick() SEM argumento
  → handleContainerClick(undefined) 
  → undefined.stopPropagation() ← ERRO!
```

## Solução

Tornar o handler defensivo para aceitar evento opcional:

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

**Alteração (linhas 321-335):**

```tsx
// Antes
const handleContainerClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  
  if (enabled && !selected) {
    editorActions.selectNode(id);
  }
  
  if (enabled && selected && !isEditing) {
    originalTemplateRef.current = template;
    setIsEditing(true);
  }
}, [enabled, selected, isEditing, template, editorActions, id]);

// Depois
const handleContainerClick = useCallback((e?: React.MouseEvent) => {
  // Defensivo: só chamar stopPropagation se evento existir
  e?.stopPropagation();
  
  if (enabled && !selected) {
    editorActions.selectNode(id);
  }
  
  if (enabled && selected && !isEditing) {
    originalTemplateRef.current = template;
    setIsEditing(true);
  }
}, [enabled, selected, isEditing, template, editorActions, id]);
```

A única mudança é:
1. `(e: React.MouseEvent)` → `(e?: React.MouseEvent)` (evento opcional)
2. `e.stopPropagation()` → `e?.stopPropagation()` (optional chaining)

## Sobre os Iframes

Sim, cada bloco é um iframe separado. Isso foi implementado intencionalmente para:
- **Isolar o CSS Tailwind v4** dos blocos do Tailwind v3 da plataforma
- **Evitar conflitos de estilos** entre o editor e o conteúdo dos blocos
- **Permitir que blocos usem qualquer CSS** sem afetar o editor

Esta arquitetura está documentada na memória `css-isolation-strategy`.

## Resumo

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `HtmlBlock.tsx` | 322 | Tornar `e` opcional: `(e?: React.MouseEvent)` |
| `HtmlBlock.tsx` | 323 | Usar optional chaining: `e?.stopPropagation()` |

