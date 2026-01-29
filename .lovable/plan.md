
# Plano: Corrigir Salvamento de Edições de Texto

## Problema Identificado

Quando o usuário edita texto no iframe e clica fora, as alterações não estão sendo salvas no banco de dados. Analisando o código e os logs de rede, descobri duas causas raiz:

### Causa 1: Condição `!isEditing` bloqueando o salvamento

O `handleIframeEditEnd` tem a condição:
```tsx
if (processingEditEnd.current || !isEditing) return;
```

O problema é que o `blur` no iframe usa um `setTimeout` de 150ms antes de enviar a mensagem. Durante esse delay:
- O usuário pode clicar em outro lugar
- O componente pode perder seleção (`selected = false`)
- O `useEffect` que observa `selected` chama `setIsEditing(false)` antes da mensagem chegar

Quando a mensagem `eficode-edit-end` finalmente chega, `isEditing` já é `false` e o handler retorna imediatamente sem salvar.

### Causa 2: Iframe não atualiza `srcdoc` dinamicamente

O React atualiza o atributo `srcdoc` do iframe quando o prop `html` muda, **mas iframes não recarregam seu conteúdo quando `srcdoc` é alterado depois do mount inicial**. Isso significa que mesmo que `setProp` funcione, o iframe continua mostrando o conteúdo antigo até ser recriado.

## Solução

### Parte 1: Remover a condição `!isEditing` do handler

A flag `processingEditEnd` já é suficiente para evitar duplicatas. Precisamos aceitar a mensagem mesmo se `isEditing` já foi resetado.

### Parte 2: Adicionar ref para manter a flag de edição

Usar um `useRef` para rastrear se estávamos editando, que não é afetado pelo ciclo de vida do React.

### Parte 3: Forçar atualização do iframe via postMessage

Em vez de depender de `srcdoc` para atualizar o conteúdo, enviar uma mensagem para o iframe atualizar seu próprio `innerHTML` quando o template muda externamente.

---

## Alterações Detalhadas

### Arquivo 1: `src/components/eficode/user-components/HtmlBlock.tsx`

**Alteração 1**: Adicionar ref para rastrear estado de edição

```tsx
const [isEditing, setIsEditing] = useState(false);
const wasEditingRef = useRef(false); // NOVO: Rastrear se estava editando
const processingEditEnd = useRef(false);

// Manter ref sincronizada
useEffect(() => {
  wasEditingRef.current = isEditing;
}, [isEditing]);
```

**Alteração 2**: Modificar handler para usar a ref

```tsx
const handleIframeEditEnd = useCallback((newHtml: string) => {
  // Usar wasEditingRef para verificar (não depender do state que pode estar desatualizado)
  if (processingEditEnd.current) return;
  if (!wasEditingRef.current && !isEditing) return; // Aceitar se estava editando recentemente
  
  processingEditEnd.current = true;
  wasEditingRef.current = false; // Reset
  
  if (newHtml) {
    const normalized = normalizeHtml(newHtml);
    const currentNormalized = normalizeHtml(template);
    
    if (normalized !== currentNormalized) {
      setProp((props: any) => {
        props.htmlTemplate = normalized;
        props.html = normalized;
      });
    }
  }
  setIsEditing(false);
  
  setTimeout(() => {
    processingEditEnd.current = false;
  }, 200);
}, [template, setProp, isEditing]);
```

**Alteração 3**: Marcar `wasEditingRef` quando iniciar edição

```tsx
// Na função handleContainerClick, antes de setIsEditing(true):
wasEditingRef.current = true;
setIsEditing(true);
```

### Arquivo 2: `src/components/eficode/user-components/IframePreview.tsx`

**Alteração 4**: Adicionar listener para atualizar conteúdo via postMessage

No script interno do iframe:
```javascript
window.addEventListener('message', (e) => {
  // ... código existente ...
  
  // NOVO: Atualizar conteúdo quando receber nova versão do parent
  if (e.data?.type === 'eficode-update-content') {
    document.body.innerHTML = e.data.html;
    sendHeight();
  }
});
```

**Alteração 5**: Enviar mensagem de atualização quando html prop muda

No componente pai, adicionar useEffect:
```tsx
// Atualizar conteúdo do iframe quando html muda externamente (sem recriar)
const prevHtmlRef = useRef(html);
useEffect(() => {
  if (html !== prevHtmlRef.current && iframeRef.current?.contentWindow) {
    iframeRef.current.contentWindow.postMessage(
      { type: 'eficode-update-content', html },
      '*'
    );
    prevHtmlRef.current = html;
  }
}, [html]);
```

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────┐
│ Usuário edita texto no iframe                               │
│ wasEditingRef.current = true                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Clica fora → blur dispara                                   │
│ setTimeout 150ms inicia                                     │
│ (Enquanto isso, selected pode mudar e isEditing → false)    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ postMessage('eficode-edit-end', html)                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ handleIframeEditEnd:                                        │
│ - processingEditEnd.current = false ✓                       │
│ - wasEditingRef.current = true ✓ (ainda true!)              │
│ → PROCESSA o HTML e salva via setProp                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Usuário clica em "Salvar"                                   │
│ query.serialize() captura o htmlTemplate atualizado         │
│ → Banco de dados recebe as alterações corretas              │
└─────────────────────────────────────────────────────────────┘
```

---

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `HtmlBlock.tsx` | Adicionar `wasEditingRef` para rastrear estado de edição independente do ciclo React |
| `HtmlBlock.tsx` | Modificar `handleIframeEditEnd` para usar `wasEditingRef` em vez de apenas `isEditing` |
| `HtmlBlock.tsx` | Marcar `wasEditingRef = true` quando iniciar edição |
| `IframePreview.tsx` | Adicionar listener `eficode-update-content` para atualizar conteúdo via postMessage |
| `IframePreview.tsx` | Adicionar useEffect para sincronizar mudanças do prop `html` com o iframe |

## Benefícios

1. **Salvamento confiável**: As edições serão capturadas mesmo com delays de mensagens
2. **Sincronização bidirecional**: Mudanças no painel de settings também atualizam o iframe
3. **Sem recriação de iframe**: Atualizações via postMessage são mais rápidas e suaves
4. **Robustez**: O sistema não depende do timing preciso de estados React
