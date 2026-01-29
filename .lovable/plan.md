# Plano: Remover Craft.js e Implementar Editor com Iframe Único

## ✅ Status: IMPLEMENTADO

A migração foi concluída com sucesso. O editor agora usa:
- **Zustand** para gerenciamento de estado (`src/stores/efiCodeEditorStore.ts`)
- **UnifiedIframe** para renderização única (`src/components/eficode/editor/UnifiedIframe.tsx`)
- **BlockList** com drag-and-drop via @dnd-kit (`src/components/eficode/editor/BlockList.tsx`)

## Visão Geral

Substituir o Craft.js por uma arquitetura simplificada com:
- **Estado centralizado** via Zustand para gerenciar blocos
- **Único iframe** para renderizar todos os blocos
- **@dnd-kit** para reordenação drag-and-drop
- **Sistema de mensagens** para edição inline

## Arquitetura Atual vs Nova

```text
ATUAL (Craft.js + N iframes)
┌─────────────────────────────────────────────────────────────┐
│ Editor (Craft.js)                                           │
│   ├── Frame (Canvas)                                        │
│   │   ├── HtmlBlock → IframePreview #1 (CSS + HTML)        │
│   │   ├── HtmlBlock → IframePreview #2 (CSS + HTML)        │
│   │   └── HtmlBlock → IframePreview #3 (CSS + HTML)        │
│   └── Serialização/Deserialização complexa                  │
└─────────────────────────────────────────────────────────────┘

NOVA (Zustand + 1 iframe)
┌─────────────────────────────────────────────────────────────┐
│ Editor (Zustand)                                            │
│   ├── BlocksList (React) ← drag-and-drop aqui              │
│   │   ├── BlockHandle #1 (bordas + controles)              │
│   │   ├── BlockHandle #2 (bordas + controles)              │
│   │   └── BlockHandle #3 (bordas + controles)              │
│   └── UnifiedIframe (1 iframe com todo HTML)               │
│       └── CSS carregado 1x + todos os blocos concatenados  │
└─────────────────────────────────────────────────────────────┘
```

## Estrutura de Dados

### Modelo Simplificado

```typescript
// src/stores/efiCodeEditorStore.ts
interface Block {
  id: string;
  html: string;
  order: number;
}

interface EditorState {
  blocks: Block[];
  selectedBlockId: string | null;
  history: Block[][];
  historyIndex: number;
  
  // Actions
  addBlock: (html: string) => void;
  removeBlock: (id: string) => void;
  updateBlockHtml: (id: string, html: string) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  selectBlock: (id: string | null) => void;
  undo: () => void;
  redo: () => void;
  
  // Serialização (compatível com formato atual)
  serialize: () => Record<string, any>;
  deserialize: (content: Record<string, any>) => void;
}
```

### Compatibilidade com Banco de Dados

O formato salvo no banco continua o mesmo para manter compatibilidade:

```typescript
// Converter de novo formato para formato do banco
serialize(): Record<string, any> {
  const nodes: Record<string, any> = {
    ROOT: {
      type: { resolvedName: 'Container' },
      props: { background: 'transparent' },
      nodes: this.blocks.map(b => b.id),
      parent: null
    }
  };
  
  this.blocks.forEach(block => {
    nodes[block.id] = {
      type: { resolvedName: 'Bloco HTML' },
      props: { htmlTemplate: block.html, html: '' },
      parent: 'ROOT',
      nodes: []
    };
  });
  
  return nodes;
}

// Converter de formato do banco para novo formato
deserialize(content: Record<string, any>) {
  const root = content.ROOT;
  if (!root?.nodes) return;
  
  this.blocks = root.nodes.map((id: string, index: number) => ({
    id,
    html: content[id]?.props?.htmlTemplate || '',
    order: index
  }));
}
```

## Componentes a Criar

### 1. Store Zustand

**Arquivo:** `src/stores/efiCodeEditorStore.ts`

- Estado dos blocos como array simples
- Histórico para undo/redo (máximo 50 estados)
- Serialização/deserialização compatível com banco

### 2. Componente UnifiedIframe

**Arquivo:** `src/components/eficode/editor/UnifiedIframe.tsx`

```typescript
interface UnifiedIframeProps {
  blocks: Block[];
  globalCss: string;
  selectedBlockId: string | null;
  viewportWidth: string;
  onBlockClick: (blockId: string) => void;
  onBlockEdit: (blockId: string, newHtml: string) => void;
}
```

Funcionalidades:
- Renderiza todos os blocos em um único iframe
- Cada bloco envolvido em `<div data-block-id="xxx">`
- Destaque visual para bloco selecionado
- Edição inline via contentEditable no bloco clicado
- Comunicação via postMessage para cliques e edições

### 3. Componente BlockList (overlay de controles)

**Arquivo:** `src/components/eficode/editor/BlockList.tsx`

Renderiza divs invisíveis sobrepostos ao iframe para:
- Áreas de drag-and-drop (bordas dos blocos)
- Botões de ação (excluir, duplicar)
- Indicadores de inserção durante drag

### 4. Editor Principal Refatorado

**Arquivo:** `src/pages/EfiCodeEditor.tsx`

- Remove imports do Craft.js
- Usa store Zustand
- Integra UnifiedIframe + BlockList
- Mantém Toolbox existente (com adaptação)

## Fluxo de Interação

### Adicionar Bloco

```text
1. Usuário clica em bloco no Toolbox
2. Store adiciona novo Block ao array
3. UnifiedIframe re-renderiza com novo bloco
4. Scroll automático para novo bloco
```

### Reordenar Blocos

```text
1. Usuário inicia drag na área de grip do bloco
2. @dnd-kit gerencia o drag visualmente
3. onDragEnd chama store.reorderBlocks()
4. UnifiedIframe re-renderiza na nova ordem
```

### Editar Texto Inline

```text
1. Usuário clica em bloco no iframe
2. postMessage envia 'eficode-block-click' com blockId
3. Editor marca bloco como selecionado
4. Segundo clique ativa contentEditable no bloco
5. Blur envia 'eficode-block-edit' com novo HTML
6. Store atualiza block.html
7. UnifiedIframe atualiza apenas o bloco editado
```

### Undo/Redo

```text
1. Cada mutação no store cria snapshot no histórico
2. Ctrl+Z / botão chama store.undo()
3. Store restaura estado anterior
4. UnifiedIframe re-renderiza
```

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/stores/efiCodeEditorStore.ts` | **CRIAR** - Store Zustand |
| `src/components/eficode/editor/UnifiedIframe.tsx` | **CRIAR** - Iframe único |
| `src/components/eficode/editor/BlockList.tsx` | **CRIAR** - Overlay de controles |
| `src/pages/EfiCodeEditor.tsx` | **REFATORAR** - Remover Craft.js |
| `src/components/eficode/editor/Toolbox.tsx` | **MODIFICAR** - Adaptar para nova API |
| `src/components/eficode/editor/SettingsPanel.tsx` | **MODIFICAR** - Usar store |
| `src/lib/efiCodeHtmlGenerator.ts` | **SIMPLIFICAR** - Formato mais direto |
| `src/components/eficode/user-components/HtmlBlock.tsx` | **REMOVER** - Não mais necessário |
| `src/components/eficode/user-components/IframePreview.tsx` | **REMOVER** - Substituído por UnifiedIframe |

## Arquivos que Podem Ser Removidos

Componentes Craft.js que não serão mais usados:
- `src/components/eficode/user-components/Container.tsx`
- `src/components/eficode/user-components/Text.tsx`
- `src/components/eficode/user-components/Heading.tsx`
- `src/components/eficode/user-components/Button.tsx`
- `src/components/eficode/user-components/Image.tsx`
- `src/components/eficode/user-components/Divider.tsx`
- `src/components/eficode/user-components/Spacer.tsx`
- `src/components/eficode/editor/Viewport.tsx`

## Detalhes Técnicos

### UnifiedIframe - Estrutura do srcDoc

```html
<!DOCTYPE html>
<html>
<head>
  <!-- CSS Global (Tailwind v4, fontes, etc.) -->
  <style>${globalCss}</style>
  <style>
    /* Estilos de seleção */
    [data-block-id].selected {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
    }
    [data-block-id]:hover:not(.selected) {
      outline: 1px dashed #9ca3af;
    }
  </style>
</head>
<body>
  ${blocks.map(b => `
    <div 
      data-block-id="${b.id}" 
      class="${selectedBlockId === b.id ? 'selected' : ''}"
    >
      ${b.html}
    </div>
  `).join('')}
  
  <script>
    // Handler de cliques
    document.addEventListener('click', (e) => {
      const block = e.target.closest('[data-block-id]');
      if (block) {
        parent.postMessage({
          type: 'eficode-block-click',
          blockId: block.dataset.blockId
        }, '*');
      }
    });
    
    // Handler de edição
    document.addEventListener('blur', (e) => {
      const block = e.target.closest('[data-block-id]');
      if (block && block.getAttribute('contenteditable') === 'true') {
        parent.postMessage({
          type: 'eficode-block-edit',
          blockId: block.dataset.blockId,
          html: block.innerHTML
        }, '*');
      }
    }, true);
  </script>
</body>
</html>
```

### Store Zustand - Histórico

```typescript
// Padrão Command para undo/redo
const MAX_HISTORY = 50;

interface EditorState {
  blocks: Block[];
  history: Block[][];
  historyIndex: number;
  
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

// Implementação
pushHistory: () => {
  const snapshot = JSON.parse(JSON.stringify(get().blocks));
  const newHistory = get().history.slice(0, get().historyIndex + 1);
  newHistory.push(snapshot);
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  set({ history: newHistory, historyIndex: newHistory.length - 1 });
}

undo: () => {
  const { historyIndex, history } = get();
  if (historyIndex > 0) {
    set({ 
      blocks: JSON.parse(JSON.stringify(history[historyIndex - 1])),
      historyIndex: historyIndex - 1 
    });
  }
}
```

### Integração com Toolbox

O Toolbox precisa de adaptação mínima:

```typescript
// Antes (Craft.js)
ref={(ref) => {
  if (ref) connectors.create(ref, <HtmlBlock html={block.html_content} />);
}}

// Depois (Store)
onClick={() => {
  useEditorStore.getState().addBlock(block.html_content);
}}
```

## Benefícios

| Aspecto | Antes (Craft.js) | Depois (Zustand) |
|---------|------------------|------------------|
| Performance | N iframes, N contextos | 1 iframe, 1 contexto |
| Complexidade | Alta (árvore, canvas) | Baixa (array simples) |
| Race conditions | Frequentes | Eliminadas |
| Tamanho do bundle | +150KB (Craft.js) | +3KB (Zustand) |
| Undo/Redo | Craft.js history | Customizado, mais controle |
| Debug | Difícil (estado espalhado) | Fácil (estado centralizado) |
| Manutenção | Dependência externa | Código próprio |

## Migração Gradual (Opcional)

Se preferir migração mais segura:

1. **Fase 1**: Criar store + UnifiedIframe lado a lado
2. **Fase 2**: Toggle para alternar entre editores
3. **Fase 3**: Validar em produção
4. **Fase 4**: Remover Craft.js

## Estimativa de Tempo

| Tarefa | Tempo Estimado |
|--------|----------------|
| Store Zustand | 2-3 horas |
| UnifiedIframe | 4-6 horas |
| BlockList (drag-and-drop) | 3-4 horas |
| Refatorar EfiCodeEditor | 4-6 horas |
| Adaptar Toolbox | 1-2 horas |
| Adaptar SettingsPanel | 2-3 horas |
| Testes e ajustes | 4-6 horas |
| **Total** | **20-30 horas** |

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Sites existentes quebram | Deserialização mantém formato antigo |
| Edição inline menos fluida | Usar mesmo sistema de postMessage atual |
| Drag visualmente diferente | @dnd-kit suporta overlays customizados |
| Perda de funcionalidades | Listar funcionalidades usadas antes de remover |
