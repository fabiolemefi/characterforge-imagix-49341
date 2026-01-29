
# Plano: Corrigir Problemas Após Edição de Texto e Remover Borda Azul

## Problemas Identificados

### 1. Reload da Página / Bloco Desaparecendo / Duplicação

O problema está no fluxo de `handleIframeEditEnd` combinado com o `templateKey`:

```text
┌─────────────────────────────────────────────────────────────┐
│ Usuário clica fora → blur no iframe (150ms delay)          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ postMessage: 'eficode-edit-end' com HTML editado            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ handleIframeEditEnd → setProp → htmlTemplate atualizado     │
│ → templateKey MUDA → IframePreview RECRIA com nova key      │
│ → MAS: o blur do iframe antigo ainda está processando       │
│ → MÚLTIPLOS 'eficode-edit-end' são disparados               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ PROBLEMA: Race condition causa comportamento errático       │
│ - Craft.js pode estar em estado inconsistente               │
│ - A re-criação do iframe durante o processamento causa bugs │
└─────────────────────────────────────────────────────────────┘
```

**Causa Raiz**: Quando `handleIframeEditEnd` chama `setProp`, isso muda o `template`, que muda o `templateKey`, que força a recriação do `IframePreview`. Durante este processo, o listener de mensagens ainda está ativo e pode receber eventos duplicados, ou o estado do Craft.js pode ficar corrompido.

### 2. Borda Azul de Seleção

A linha 446 no `HtmlBlock.tsx` aplica um `boxShadow` quando o bloco está selecionado:
```tsx
style={{ boxShadow: enabled && selected ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none' }}
```

O usuário quer remover isso completamente.

## Solução

### Parte 1: Evitar Recriação do Iframe Durante Edição

Não podemos usar `templateKey` que recria o iframe sempre que o template muda, pois isso causa a race condition. Em vez disso:

1. **Remover `templateKey`** do IframePreview - não forçar recriação via key
2. **Controlar atualização via postMessage** em vez de recriar o componente
3. **Adicionar flag para ignorar eventos duplicados** após edição

### Parte 2: Remover Borda Azul

Simplesmente remover o `style={{ boxShadow: ... }}` da div container.

## Alterações Detalhadas

### Arquivo 1: `src/components/eficode/user-components/HtmlBlock.tsx`

| Linhas | Alteração |
|--------|-----------|
| 327-336 | Remover o `templateKey` (não é mais necessário) |
| 434 | Adicionar flag para evitar processamento duplo de `edit-end` |
| 446 | Remover o `boxShadow` da seleção (borda azul) |
| 448 | Remover `key={templateKey}` do IframePreview |

**Código Atual (com bugs):**
```tsx
// Linhas 327-336 - templateKey que causa recriação problemática
const templateKey = useMemo(() => {
  let hash = 0;
  for (let i = 0; i < template.length; i++) {
    const char = template.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}, [template]);

// Linha 446 - borda azul
style={{ boxShadow: enabled && selected ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none' }}

// Linha 448 - key que força recriação
<IframePreview
  key={templateKey}
  ...
/>
```

**Código Corrigido:**
```tsx
// REMOVER templateKey (não usar mais)

// Adicionar ref para controlar processamento de edit-end
const processingEditEnd = useRef(false);

// Handler atualizado com proteção contra duplicatas
const handleIframeEditEnd = useCallback((newHtml: string) => {
  // Ignorar se já estamos processando ou se não estamos editando
  if (processingEditEnd.current || !isEditing) return;
  
  processingEditEnd.current = true;
  
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
  
  // Reset flag após um tempo seguro
  setTimeout(() => {
    processingEditEnd.current = false;
  }, 200);
}, [template, setProp, isEditing]);

// Linha 446 - REMOVER boxShadow (sem borda azul)
<div
  ref={(ref) => {
    containerRef.current = ref;
    if (ref && enabled) {
      connect(drag(ref));
    }
  }}
  className={`relative w-full ${className}`}
  // SEM style={{ boxShadow: ... }}
>

// Linha 448 - REMOVER key (não forçar recriação)
<IframePreview
  html={template}
  editable={isEditing}
  ...
/>
```

### Arquivo 2: `src/components/eficode/user-components/IframePreview.tsx`

| Linhas | Alteração |
|--------|-----------|
| 113-125 | Adicionar proteção para não enviar edit-end múltiplas vezes |

**Código Atual:**
```javascript
// Blur com delay (pode disparar múltiplas vezes)
document.body.addEventListener('blur', () => {
  if (!editMode) return;
  clearTimeout(debounceTimer);
  clearTimeout(blurTimer);
  
  blurTimer = setTimeout(() => {
    window.parent.postMessage({ 
      type: 'eficode-edit-end',
      html: document.body.innerHTML 
    }, '*');
  }, 150);
});
```

**Código Corrigido:**
```javascript
// Blur com delay e proteção contra duplicatas
let editEndSent = false;

document.body.addEventListener('blur', () => {
  if (!editMode || editEndSent) return;
  clearTimeout(debounceTimer);
  clearTimeout(blurTimer);
  
  blurTimer = setTimeout(() => {
    if (!editEndSent) {
      editEndSent = true;
      editMode = false; // Desativar editMode imediatamente
      document.body.contentEditable = 'false';
      window.parent.postMessage({ 
        type: 'eficode-edit-end',
        html: document.body.innerHTML 
      }, '*');
    }
  }, 150);
});

// Reset editEndSent quando ativar edição
window.addEventListener('message', (e) => {
  if (e.data?.type === 'eficode-set-editable') {
    editMode = e.data.editable;
    if (editMode) {
      editEndSent = false; // Reset para permitir novo edit-end
    }
    document.body.contentEditable = editMode ? 'true' : 'false';
    if (editMode) document.body.focus({ preventScroll: true });
  }
});
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────┐
│ Usuário clica fora → blur no iframe                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ editEndSent = false? Sim → continua                         │
│ editEndSent = true, editMode = false                        │
│ postMessage: 'eficode-edit-end' (apenas UMA VEZ)            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ handleIframeEditEnd recebe mensagem                         │
│ processingEditEnd = true? Não → processa                    │
│ setProp → template atualizado                               │
│ setIsEditing(false)                                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ IframePreview NÃO é recriado (sem key={templateKey})        │
│ O HTML já foi atualizado pelo contentEditable               │
│ Apenas o estado do Craft.js é sincronizado                  │
└─────────────────────────────────────────────────────────────┘
```

## Resumo de Alterações

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `HtmlBlock.tsx` | 327-336 | Remover `templateKey` useMemo |
| `HtmlBlock.tsx` | 319+ | Adicionar `processingEditEnd` ref |
| `HtmlBlock.tsx` | 421-435 | Atualizar `handleIframeEditEnd` com proteção |
| `HtmlBlock.tsx` | 446 | Remover `boxShadow` (borda azul) |
| `HtmlBlock.tsx` | 448 | Remover `key={templateKey}` |
| `IframePreview.tsx` | 72-96 | Adicionar `editEndSent` flag e proteção |

## Benefícios

1. **Sem recarga/duplicação**: O iframe não é recriado a cada mudança de template
2. **Sem race condition**: Flags de controle garantem processamento único
3. **Sem borda azul**: Visual limpo sem indicador de seleção
4. **Estabilidade**: Estado do Craft.js permanece consistente
