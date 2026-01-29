
# Plano: Corrigir Referência do Container e Comunicação com Iframe

## Problema Identificado

O `containerRef` está declarado no componente `HtmlBlock` (linha 319), mas **nunca é atribuído** ao elemento DOM. A div do container usa uma função ref apenas para o Craft.js (`connect(drag(ref))`), deixando `containerRef.current` sempre `null`.

### Consequência

```text
handleContainerClick → containerRef.current?.querySelector('iframe')
                     → null?.querySelector('iframe')
                     → undefined
                     → postMessage NUNCA é enviado
                     → iframe NUNCA recebe 'eficode-set-editable'
                     → contentEditable NUNCA é ativado
```

Isso afeta:
1. **Edição de texto**: O segundo clique não ativa o modo de edição porque o `postMessage` não é enviado
2. **Atualização de imagens**: O iframe não é recriado corretamente porque a key muda mas o HTML interno não é processado

## Solução

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

| Linhas | Alteração |
|--------|-----------|
| 438-443 | Modificar o ref do container para também atribuir ao `containerRef` |
| Opcional | Simplificar usando uma ref única que atende ambos propósitos |

### Código Atual (com bug)

```tsx
// Linha 319
const containerRef = useRef<HTMLDivElement>(null); // ← Nunca usado!

// Linhas 438-443
<div
  ref={(ref) => {
    if (ref && enabled) {
      connect(drag(ref)); // ← Só passa para Craft.js
    }
    // containerRef NUNCA é atribuído!
  }}
  ...
>
```

### Código Corrigido

```tsx
// Linhas 438-443
<div
  ref={(ref) => {
    containerRef.current = ref; // ← Atribuir ao containerRef SEMPRE
    if (ref && enabled) {
      connect(drag(ref)); // ← Também passar para Craft.js
    }
  }}
  ...
>
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────┐
│ 2º clique no bloco                                          │
│ └─ handleContainerClick chamado                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ setIsEditing(true) + requestAnimationFrame                  │
│ └─ containerRef.current = <div>...</div> (AGORA FUNCIONA!)  │
│ └─ querySelector('iframe') encontra o iframe                │
│ └─ postMessage({ type: 'eficode-set-editable', editable })  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Iframe recebe mensagem                                      │
│ └─ editMode = true                                          │
│ └─ document.body.contentEditable = 'true'                   │
│ └─ document.body.focus()                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Usuário pode editar texto diretamente no bloco!             │
└─────────────────────────────────────────────────────────────┘
```

## Resumo de Alterações

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `HtmlBlock.tsx` | 439-442 | Adicionar `containerRef.current = ref` dentro da função ref |

## Código Final do Trecho

```tsx
return (
  <div
    ref={(ref) => {
      containerRef.current = ref; // Manter referência para postMessage
      if (ref && enabled) {
        connect(drag(ref));
      }
    }}
    className={`relative w-full ${className}`}
    style={{ boxShadow: enabled && selected ? '0 0 0 2px rgba(59, 130, 246, 0.8)' : 'none' }}
  >
    <IframePreview
      key={templateKey}
      html={template}
      editable={isEditing}
      onClick={handleContainerClick}
      onHtmlChange={handleIframeHtmlChange}
      onEditEnd={handleIframeEditEnd}
      minHeight={0}
    />
  </div>
);
```

Esta é uma correção simples de uma linha que resolve tanto o problema de edição de texto quanto o de atualização de imagens.
