
# Plano: Corrigir Edição de Textos nos Blocos

## Problema Identificado

O segundo clique não está entrando em modo de edição corretamente. Analisando o fluxo:

```text
1º clique → eficode-iframe-click → handleContainerClick → selectNode(id) → selected=true
2º clique → eficode-iframe-click → handleContainerClick → setIsEditing(true) → isEditing=true
         → IframePreview recebe editable=true
         → useEffect envia postMessage para iframe
         → MAS: o evento de blur pode estar disparando antes
```

### Causa Raiz

1. **Timing do postMessage**: O `useEffect` que envia `eficode-set-editable` só roda após o render, mas o clique já passou
2. **Overlay bloqueando**: O overlay invisível (linhas 199-206) intercepta cliques mesmo quando deveria permitir edição
3. **Blur prematuro**: Quando clicamos no bloco, o `blur` do iframe anterior pode disparar `eficode-edit-end` e desativar a edição

## Diagrama do Fluxo Atual (com bug)

```text
┌─────────────────────────────────────────────────────────────┐
│ Usuário clica 2ª vez no bloco                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Overlay intercepta clique → onClick() → handleContainerClick│
│ setIsEditing(true) → React schedula re-render               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Re-render: IframePreview com editable=true                  │
│ Overlay é removido do DOM                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ useEffect detecta editable=true → postMessage iframe        │
│ Iframe ativa contentEditable=true + focus                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ PROBLEMA: Outro bloco pode ter disparado blur              │
│ ou o clique não foi no iframe (foi no overlay removido)    │
└─────────────────────────────────────────────────────────────┘
```

## Solução

### Estratégia: Comunicação Síncrona + Verificação de Source

1. **Enviar postMessage imediatamente** no handleContainerClick, não esperar useEffect
2. **Não depender do overlay** para segundo clique - deixar o iframe receber o clique diretamente
3. **Identificar source do blur** para não desativar edição quando foco vai para o mesmo bloco

### Arquivo 1: `src/components/eficode/user-components/HtmlBlock.tsx`

| Linhas | Alteração |
|--------|-----------|
| 332-356 | Enviar postMessage diretamente ao ativar edição, sem esperar useEffect |
| Nova | Adicionar ref para o IframePreview e acessar iframe diretamente |

**Mudança no handleContainerClick:**

```tsx
// Adicionar ref para acessar o iframe
const iframeRef = useRef<HTMLIFrameElement | null>(null);

const handleContainerClick = useCallback((e?: React.MouseEvent) => {
  e?.stopPropagation();
  
  const scrollContainer = document.querySelector('main.overflow-auto');
  const scrollTop = scrollContainer?.scrollTop || 0;
  
  if (enabled && !selected) {
    editorActions.selectNode(id);
  }
  
  if (enabled && selected && !isEditing) {
    originalTemplateRef.current = template;
    setIsEditing(true);
    
    // Ativar edição IMEDIATAMENTE via postMessage (não esperar useEffect)
    requestAnimationFrame(() => {
      const iframe = containerRef.current?.querySelector('iframe');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          { type: 'eficode-set-editable', editable: true },
          '*'
        );
      }
    });
  }
  
  requestAnimationFrame(() => {
    if (scrollContainer) scrollContainer.scrollTop = scrollTop;
  });
}, [enabled, selected, isEditing, template, editorActions, id]);
```

### Arquivo 2: `src/components/eficode/user-components/IframePreview.tsx`

| Linhas | Alteração |
|--------|-----------|
| 112-120 | Adicionar delay no blur para evitar desativação prematura |
| 133-138 | Permitir que o primeiro clique em modo não-edição ative edição via parent |
| 199-206 | Remover overlay completamente - deixar iframe receber cliques sempre |

**Mudança 1: Remover overlay e permitir cliques diretos no iframe**

O overlay está causando problemas. Vamos removê-lo e deixar o iframe sempre receber cliques:

```tsx
// Remover linhas 199-206 (overlay)
// Alterar pointerEvents do iframe (linha 194)
style={{ 
  // ...outros estilos...
  pointerEvents: 'auto', // Sempre permitir cliques no iframe
}}
```

**Mudança 2: Adicionar delay no blur para evitar race condition**

```javascript
// No script interno do iframe (linha 112-120)
document.body.addEventListener('blur', () => {
  if (!editMode) return;
  clearTimeout(debounceTimer);
  
  // Delay para evitar desativar edição se o usuário só está clicando em outro lugar do mesmo bloco
  setTimeout(() => {
    // Verificar se ainda não está em modo de edição (pode ter sido reativado)
    if (editMode && document.activeElement !== document.body) {
      window.parent.postMessage({ 
        type: 'eficode-edit-end',
        html: document.body.innerHTML 
      }, '*');
    }
  }, 100);
});
```

**Mudança 3: Script interno deve notificar parent sobre clique mesmo quando editável**

Quando o usuário clica em um bloco diferente enquanto está editando outro, precisamos:
1. Finalizar edição do bloco atual
2. Selecionar o novo bloco

```javascript
// No script interno, clique deve verificar se é para selecionar ou editar
document.body.addEventListener('mousedown', (e) => {
  if (!editMode) {
    // Não está editando - notificar parent para selecionar/ativar edição
    window.parent.postMessage({ type: 'eficode-iframe-click' }, '*');
  }
  // Se está editando, o clique é para editar texto - não fazer nada especial
});
```

## Código Final

### IframePreview.tsx - Script interno completo:

```javascript
let editMode = false;

function sendHeight() {
  const height = Math.max(document.body.scrollHeight, document.body.offsetHeight);
  window.parent.postMessage({ type: 'eficode-iframe-height', height }, '*');
}

const observer = new ResizeObserver(sendHeight);
observer.observe(document.body);
window.addEventListener('load', sendHeight);
sendHeight();

// Controle de edição via postMessage
window.addEventListener('message', (e) => {
  if (e.data?.type === 'eficode-set-editable') {
    editMode = e.data.editable;
    document.body.contentEditable = editMode ? 'true' : 'false';
    if (editMode) document.body.focus({ preventScroll: true });
  }
});

// Input handling
let debounceTimer;
document.body.addEventListener('input', () => {
  if (!editMode) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    window.parent.postMessage({ 
      type: 'eficode-html-change', 
      html: document.body.innerHTML 
    }, '*');
  }, 100);
  sendHeight();
});

// Blur com delay para evitar race condition
let blurTimer;
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

// Cancelar blur timer se receber foco novamente
document.body.addEventListener('focus', () => {
  clearTimeout(blurTimer);
});

// Escape para sair
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editMode) {
    clearTimeout(debounceTimer);
    clearTimeout(blurTimer);
    window.parent.postMessage({ 
      type: 'eficode-edit-end',
      html: document.body.innerHTML 
    }, '*');
  }
});

// Mousedown para capturar clique (antes do focus)
document.body.addEventListener('mousedown', (e) => {
  if (!editMode) {
    window.parent.postMessage({ type: 'eficode-iframe-click' }, '*');
  }
});
```

### IframePreview.tsx - Render sem overlay:

```tsx
return (
  <div className={`relative w-full ${className}`}>
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      scrolling="no"
      style={{ 
        display: 'block',
        width: '100%',
        height: `${height}px`,
        border: 'none',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        pointerEvents: 'auto', // Sempre permitir interação
      }}
      title="HTML Preview"
      sandbox="allow-scripts allow-same-origin"
    />
    {/* Overlay removido - cliques vão direto para o iframe */}
  </div>
);
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────┐
│ 1º clique: mousedown no iframe                              │
│ → postMessage: eficode-iframe-click                         │
│ → handleContainerClick: selectNode(id)                      │
│ → selected = true                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2º clique: mousedown no iframe                              │
│ → postMessage: eficode-iframe-click (editMode ainda false)  │
│ → handleContainerClick: já selected, setIsEditing(true)     │
│ → requestAnimationFrame: postMessage eficode-set-editable   │
│ → iframe ativa contentEditable + focus                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Usuário edita texto no iframe                               │
│ → input events → debounced postMessage: eficode-html-change │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Clique fora ou ESC                                          │
│ → blur (com delay) → postMessage: eficode-edit-end          │
│ → handleIframeEditEnd: salva HTML, setIsEditing(false)      │
└─────────────────────────────────────────────────────────────┘
```

## Resumo de Alterações

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `HtmlBlock.tsx` | 332-356 | Enviar postMessage imediatamente ao ativar edição |
| `IframePreview.tsx` | 72-139 | Refatorar script: mousedown em vez de click, blur com delay, focus cancela blur |
| `IframePreview.tsx` | 194 | pointerEvents sempre 'auto' |
| `IframePreview.tsx` | 199-206 | Remover overlay completamente |
