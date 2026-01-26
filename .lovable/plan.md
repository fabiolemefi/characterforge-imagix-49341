
# Plano: Corrigir Edição no Iframe (Evitar Re-render)

## Problema Identificado

O "piscar" ocorre porque a cada digitação:
1. O iframe envia o novo HTML via `postMessage`
2. O `HtmlBlock` chama `setProp` que atualiza o state do Craft.js
3. O React re-renderiza o componente
4. O `srcdoc` é recriado (porque depende do `html`)
5. O iframe recarrega completamente, perdendo foco e causando o "piscar"

```text
Usuário digita → postMessage → setProp → re-render → srcdoc muda → IFRAME RECARREGA → pisca
```

## Solução: Não Recriar o Iframe Durante Edição

A solução é **não atualizar o `srcdoc` enquanto estiver editando**. As mudanças ficam apenas dentro do iframe até que a edição termine.

### Estratégia

1. **Durante edição**: Manter o `srcdoc` estável (não atualizar com o novo HTML)
2. **Ao terminar edição**: Só então sincronizar o HTML final com o Craft.js state
3. **Usar `useMemo`**: Memorizar o `srcdoc` e só recalcular quando `editable` mudar para `false`

## Alterações Propostas

### 1. `IframePreview.tsx` - Estabilizar srcdoc durante edição

```typescript
// Memorizar o HTML inicial quando entra em modo de edição
const [editingStartHtml, setEditingStartHtml] = useState<string | null>(null);

// Quando editable muda para true, salvar o HTML atual
useEffect(() => {
  if (editable) {
    setEditingStartHtml(html);
  } else {
    setEditingStartHtml(null);
  }
}, [editable]);

// Usar o HTML "travado" durante edição para evitar recriação do iframe
const stableHtml = editable && editingStartHtml !== null ? editingStartHtml : html;

// srcdoc agora usa stableHtml em vez de html
const srcdoc = `...${stableHtml}...`;
```

### 2. `HtmlBlock.tsx` - Atualizar state apenas ao final da edição

```typescript
// Não atualizar o state durante a edição (remove handleHtmlChange do onInput)
// Só atualizar quando a edição terminar

const handleEditEnd = useCallback((finalHtml: string) => {
  // Atualiza o state do Craft.js apenas quando termina
  setProp((props: any) => {
    props.htmlTemplate = finalHtml;
    props.html = finalHtml;
  });
  setIsEditing(false);
}, [setProp]);

// Não passar onHtmlChange para evitar updates durante digitação
<IframePreview 
  html={template}
  editable={isEditing}
  onEditEnd={handleEditEnd}  // Recebe HTML final aqui
  onClick={handleIframeClick}
/>
```

### 3. `IframePreview.tsx` - Modificar onEditEnd para enviar HTML

O `onEditEnd` já recebe o HTML no evento, mas precisamos garantir que o callback seja chamado corretamente:

```typescript
if (event.data?.type === 'eficode-edit-end') {
  onEditEnd?.(event.data.html);  // Passa o HTML final
}
```

## Diagrama do Fluxo Corrigido

```text
ANTES (problemático):
┌─────────────────────────────────────────────────────┐
│ Digita → postMessage → setProp → re-render         │
│        → srcdoc muda → IFRAME RECARREGA → PISCA!   │
└─────────────────────────────────────────────────────┘

DEPOIS (corrigido):
┌─────────────────────────────────────────────────────┐
│ Entra em edição:                                    │
│   → Salva HTML inicial em "editingStartHtml"        │
│   → srcdoc usa editingStartHtml (travado)           │
│                                                     │
│ Durante edição:                                     │
│   → Digita livremente no iframe                     │
│   → Mudanças ficam APENAS no DOM do iframe          │
│   → Nenhum update no React, nenhum re-render        │
│                                                     │
│ Sai da edição (blur/Escape):                        │
│   → postMessage com HTML final                      │
│   → onEditEnd(finalHtml)                            │
│   → setProp atualiza Craft.js                       │
│   → editingStartHtml = null                         │
│   → srcdoc atualiza com novo HTML                   │
└─────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/user-components/IframePreview.tsx` | Adicionar `editingStartHtml` state para estabilizar srcdoc durante edição |
| `src/components/eficode/user-components/HtmlBlock.tsx` | Remover `onHtmlChange`, atualizar apenas no `onEditEnd` |

## Considerações

1. **Sem atualização em tempo real**: O Craft.js state só atualiza quando termina a edição
2. **Sem piscar**: O iframe não recarrega durante a digitação
3. **Performance**: Menos re-renders = melhor performance
4. **Desvantagem**: O painel de Settings (código HTML) não atualiza em tempo real, só quando sai do modo de edição
