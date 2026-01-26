
# Plano: Usar Iframe para Visualização em Todos os Modos

## Problema

O `HtmlBlock` só usa o `IframePreview` quando `enabled = false` (modo preview/read-only). No modo de edição (`enabled = true`), ele usa `ContentEditable` diretamente sem isolamento de CSS, causando os problemas visuais que você está vendo (grid quebrado, estilos incorretos).

## Solução

Modificar o `HtmlBlock` para usar o `IframePreview` como visualização padrão mesmo no modo de edição. O `ContentEditable` só será ativado quando o usuário clicar no bloco para editar.

## Fluxo Proposto

```text
ANTES:
enabled=true  → ContentEditable (sem isolamento CSS) ← PROBLEMA
enabled=false → IframePreview (com isolamento CSS)

DEPOIS:
enabled=true, não selecionado → IframePreview (clicável para selecionar)
enabled=true, selecionado     → IframePreview (clicável para editar)
enabled=true, editando        → ContentEditable (para edição inline)
enabled=false                 → IframePreview (read-only)
```

## Alterações no Arquivo

### `src/components/eficode/user-components/HtmlBlock.tsx`

#### Modificar a lógica de renderização (linhas 280-401)

```typescript
// Estado para controlar se está em modo de edição inline
const [isInlineEditing, setIsInlineEditing] = useState(false);

// Handler para quando o iframe é clicado
const handleIframeClick = useCallback(() => {
  if (enabled && selected) {
    // Se já está selecionado, entra em modo de edição inline
    setIsInlineEditing(true);
  }
  // O clique já vai selecionar o componente via Craft.js
}, [enabled, selected]);

// Read-only mode OU modo edição sem estar editando inline
if (!enabled || (enabled && !isInlineEditing)) {
  return (
    <div
      ref={(ref) => {
        if (ref && enabled) {
          connect(drag(ref));
        }
      }}
      className={`relative ${className} ${enabled && selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      <IframePreview 
        html={template} 
        className=""
        minHeight={50}
        onClick={handleIframeClick}
      />
    </div>
  );
}

// Modo de edição inline (quando clicou para editar)
return (
  <div ...>
    <ContentEditable ... />
  </div>
);
```

#### Adicionar handler de blur para sair do modo de edição

```typescript
const handleBlur = useCallback(() => {
  setTimeout(() => {
    setShowToolbar(false);
    setIsEditing(false);
    setIsInlineEditing(false); // Volta para visualização iframe
  }, 200);
}, []);
```

#### Resetar modo de edição quando desseleciona

```typescript
useEffect(() => {
  if (!selected) {
    setIsInlineEditing(false);
  }
}, [selected]);
```

## Diagrama Visual

```text
┌─────────────────────────────────────────────────────────┐
│                    MODO EDIÇÃO                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  IframePreview (CSS isolado - visual perfeito)   │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │  Grid NPS 11 colunas (0-10 em linha) ✓     │  │  │
│  │  │  Botões size-40 corretos ✓                 │  │  │
│  │  │  Cores bg-elevation-* aplicadas ✓          │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                   │  │
│  │  [Clique para selecionar]                        │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓ clique                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  (selecionado - ring azul)                       │  │
│  │  [Clique novamente para editar texto]            │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓ segundo clique              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ContentEditable (edição inline ativa)           │  │
│  │  [Toolbar flutuante para formatação]             │  │
│  └───────────────────────────────────────────────────┘  │
│                          ↓ blur/click fora             │
│  ┌───────────────────────────────────────────────────┐  │
│  │  IframePreview (volta para visualização)         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Considerações

1. **Seleção via Craft.js**: O wrapper div com `connect(drag(ref))` garante que o componente pode ser selecionado e arrastado
2. **Clique duplo para editar**: Primeiro clique seleciona, segundo clique entra em modo de edição inline
3. **Performance**: O iframe é usado a maior parte do tempo, só muda para ContentEditable quando o usuário quer editar
4. **Visual sempre correto**: Como o iframe é a visualização padrão, os estilos sempre renderizam corretamente

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/user-components/HtmlBlock.tsx` | Usar IframePreview como visualização padrão, ContentEditable apenas para edição inline |
