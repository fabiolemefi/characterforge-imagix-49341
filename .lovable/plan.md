
# Plano: Prevenir Scroll Jump ao Clicar nos Iframes

## Problema Identificado

Quando o usuário clica em qualquer ponto dentro de um iframe, a área do editor rola para o topo. Isso acontece por dois motivos:

1. **Focus automático no body**: Quando `editMode` é ativado, o script interno chama `document.body.focus()` (linha 94), o que pode disparar scroll no navegador
2. **Comportamento padrão de focus**: O navegador automaticamente faz scroll para garantir que o elemento focado esteja visível

## Arquitetura do Problema

```text
EfiCodeEditor.tsx
  └── <main className="flex-1 overflow-auto">  ← ScrollArea pai
       └── .efi-editor-viewport
            └── EditorFrame
                 └── Frame (Craft.js)
                      └── Container
                           └── HtmlBlock #1
                           │    └── IframePreview
                           │         └── iframe (body.focus() → scroll jump)
                           └── HtmlBlock #2
                                └── IframePreview
                                     └── iframe
```

Quando `body.focus()` é chamado dentro do iframe, o navegador pode tentar fazer scroll para garantir que o iframe inteiro esteja visível, causando o jump para o topo.

## Solução

### Arquivo: `src/components/eficode/user-components/IframePreview.tsx`

#### Alteração 1: Usar `preventScroll: true` no focus (linha 94)

Adicionar a opção `preventScroll: true` ao chamar `focus()` para evitar que o navegador faça scroll automático:

```javascript
// Antes
if (editMode) document.body.focus();

// Depois
if (editMode) document.body.focus({ preventScroll: true });
```

#### Alteração 2: Salvar e restaurar posição de scroll no parent (robusto)

Caso o `preventScroll` não funcione em todos os navegadores, adicionar lógica para:
1. Capturar a posição de scroll antes de receber foco
2. Restaurar após o focus se houver mudança

Script interno do iframe - adicionar ao handler de `eficode-set-editable`:

```javascript
window.addEventListener('message', (e) => {
  if (e.data?.type === 'eficode-set-editable') {
    editMode = e.data.editable;
    document.body.contentEditable = editMode ? 'true' : 'false';
    if (editMode) {
      // Prevenir scroll ao focar
      document.body.focus({ preventScroll: true });
    }
  }
});
```

### Consideração Adicional: Click Handler no Parent

Se houver qualquer lógica no parent que cause re-render ao clicar, isso também pode causar scroll. Verificar se o `handleContainerClick` no HtmlBlock.tsx pode estar causando isso através do `editorActions.selectNode(id)`.

O Craft.js ao selecionar um nó pode disparar scroll para garantir que o elemento selecionado esteja visível. Para resolver isso de forma completa, também precisamos ajustar o HtmlBlock:

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

#### Alteração 3: Prevenir scroll ao selecionar nó (linha 322-334)

Salvar e restaurar posição de scroll no container scrollável do editor ao selecionar um nó:

```tsx
const handleContainerClick = useCallback((e?: React.MouseEvent) => {
  e?.stopPropagation();
  
  // Capturar scroll antes de qualquer ação
  const scrollContainer = document.querySelector('main.overflow-auto');
  const scrollTop = scrollContainer?.scrollTop || 0;
  
  if (enabled && !selected) {
    editorActions.selectNode(id);
  }
  
  if (enabled && selected && !isEditing) {
    originalTemplateRef.current = template;
    setIsEditing(true);
  }
  
  // Restaurar scroll após micro-tarefa (após React processar)
  requestAnimationFrame(() => {
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollTop;
    }
  });
}, [enabled, selected, isEditing, template, editorActions, id]);
```

## Resumo de Alterações

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `IframePreview.tsx` | 94 | Adicionar `{ preventScroll: true }` ao `focus()` |
| `HtmlBlock.tsx` | 322-334 | Capturar e restaurar scroll position ao clicar |

## Resultado Esperado

```text
Antes:
┌─────────────────────────┐
│ Bloco 1                 │ ← Scroll automático para cá
├─────────────────────────┤
│                         │
│ Bloco 2                 │
│    └─ clique aqui ──────│──── usuário clica
├─────────────────────────┤
│ Bloco 3                 │
└─────────────────────────┘

Depois:
┌─────────────────────────┐
│ Bloco 1                 │
├─────────────────────────┤
│                         │
│ Bloco 2                 │
│    └─ clique aqui ──────│──── scroll mantido na posição
├─────────────────────────┤
│ Bloco 3                 │
└─────────────────────────┘
```
