
# Plano: Restaurar Funcionalidade de Clicar para Abrir Painel de Propriedades

## Problema Identificado

Analisando o código, identifiquei que o clique no bloco HTML não está selecionando o componente no Craft.js porque:

1. O wrapper do `HtmlBlock` tem `connect(drag(ref))` que habilita drag-and-drop e deveria habilitar seleção por clique
2. Porém, o `IframePreview` tem um overlay invisível que captura todos os cliques **antes** de chegarem ao wrapper
3. O overlay chama `handleContainerClick`, que apenas ativa o modo de edição interno (`setIsEditing(true)`)
4. **O Craft.js nunca é notificado para selecionar o nó**, então o painel de propriedades não abre

```text
Fluxo atual (quebrado):
Clique no bloco → Overlay captura → handleContainerClick → setIsEditing(true)
                                                         ↳ Craft.js NÃO sabe que precisa selecionar!

Fluxo esperado:
Clique no bloco → Overlay captura → handleContainerClick → selectNode(id) → Painel abre!
                                                         → setIsEditing(true)
```

## Solução

Usar a API do Craft.js para selecionar o nó programaticamente quando o bloco for clicado:

1. Extrair o `id` do nó via `useNode`
2. Extrair `actions` do `useEditor` que contém `selectNode()`
3. Chamar `actions.selectNode(id)` no `handleContainerClick`

## Alterações

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

| Linha | Alteração |
|-------|-----------|
| 304-307 | Adicionar `id` no `useNode` e `actions` no `useEditor` |
| 320-326 | Chamar `actions.selectNode(id)` em `handleContainerClick` |

### Código Detalhado

**Antes (linhas 304-307):**
```tsx
const { connectors: { connect, drag }, selected, actions: { setProp } } = useNode((state) => ({
  selected: state.events.selected,
}));
const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
```

**Depois:**
```tsx
const { connectors: { connect, drag }, selected, actions: { setProp }, id } = useNode((state) => ({
  selected: state.events.selected,
}));
const { enabled, actions: editorActions } = useEditor((state) => ({ 
  enabled: state.options.enabled 
}));
```

---

**Antes (linhas 320-326):**
```tsx
const handleContainerClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (enabled && selected && !isEditing) {
    originalTemplateRef.current = template;
    setIsEditing(true);
  }
}, [enabled, selected, isEditing, template]);
```

**Depois:**
```tsx
const handleContainerClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  
  // Primeiro, selecionar o nó no Craft.js para abrir o painel de propriedades
  if (enabled && !selected) {
    editorActions.selectNode(id);
  }
  
  // Depois, se já estava selecionado, ativar modo de edição
  if (enabled && selected && !isEditing) {
    originalTemplateRef.current = template;
    setIsEditing(true);
  }
}, [enabled, selected, isEditing, template, editorActions, id]);
```

## Comportamento Esperado

Após as alterações:

| Estado Atual | Ação do Clique | Resultado |
|--------------|----------------|-----------|
| Bloco não selecionado | Clicar | Seleciona o bloco, painel de propriedades abre |
| Bloco selecionado | Clicar | Ativa modo de edição de texto inline |
| Bloco em modo edição | Clicar fora | Sai do modo edição, salva alterações |

## Resumo de Arquivos

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `HtmlBlock.tsx` | 304-307 | Adicionar `id` e `editorActions` nas hooks |
| `HtmlBlock.tsx` | 320-326 | Chamar `editorActions.selectNode(id)` no clique |
