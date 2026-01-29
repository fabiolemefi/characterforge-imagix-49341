
# Plano: Estabilizar Iframes - Eliminar Flickering ao Clicar

## Problema Identificado

O flickering ocorre por causa de re-renders que recriam o iframe. Analisando o código:

### Causa 1: Renderização Condicional (HtmlBlock.tsx linhas 405-421)
```tsx
{isEditing ? (
  <IframePreview editable={true} ... />  // Componente A
) : (
  <IframePreview editable={false} ... /> // Componente B
)}
```
Quando `isEditing` muda, React **desmonta** o IframePreview antigo e **monta** um novo. Isso causa a piscada.

### Causa 2: Recriação do srcdoc (IframePreview.tsx linha 155)
```tsx
const srcdoc = useMemo(() => `...`, [globalCss, stableHtml, editable]);
```
Quando `editable` muda, o `srcdoc` é recalculado e o iframe é completamente recriado.

### Causa 3: Altura inicial incorreta
O iframe inicia com `height: 100px` (minHeight) e depois ajusta, causando um "salto" visual.

## Solução

### Estratégia: Único IframePreview + Estado Interno

Em vez de renderizar dois componentes diferentes, manter um único IframePreview e controlar o modo de edição internamente via postMessage, sem recriar o srcdoc.

### Arquivo 1: `src/components/eficode/user-components/HtmlBlock.tsx`

| Linhas | Alteração |
|--------|-----------|
| 405-421 | Remover renderização condicional - usar apenas 1 IframePreview |

**Antes:**
```tsx
{isEditing ? (
  <IframePreview
    html={template}
    editable={true}
    onHtmlChange={handleIframeHtmlChange}
    onEditEnd={handleIframeEditEnd}
    minHeight={0}
  />
) : (
  <IframePreview
    html={template}
    onClick={handleContainerClick}
    minHeight={0}
  />
)}
```

**Depois:**
```tsx
<IframePreview
  html={template}
  editable={isEditing}
  onClick={handleContainerClick}
  onHtmlChange={handleIframeHtmlChange}
  onEditEnd={handleIframeEditEnd}
  minHeight={0}
/>
```

### Arquivo 2: `src/components/eficode/user-components/IframePreview.tsx`

A estratégia é:
1. **Remover `editable` do useMemo do srcdoc** - o modo de edição será controlado via postMessage
2. **Enviar mensagem para ativar/desativar edição** em vez de recriar o iframe
3. **Manter altura estável** usando useRef para evitar saltos

| Linhas | Alteração |
|--------|-----------|
| 50-155 | Separar lógica de edição do srcdoc - mover para controle via postMessage |
| 92-93 | Remover `editable` das dependências do useMemo |
| 179-184 | Enviar mensagem para ativar/desativar edição sem recriar iframe |

**Mudanças no srcdoc (linhas 50-155):**

O script interno do iframe deve:
1. Iniciar sempre em modo não-editável
2. Escutar mensagens do parent para ativar/desativar edição
3. Não depender de variável `EDITABLE_MODE` definida no build

**Antes (linha 93):**
```javascript
const EDITABLE_MODE = ${editable};
```

**Depois:**
```javascript
let editMode = false;

// Escutar mensagens do parent para controlar edição
window.addEventListener('message', (e) => {
  if (e.data?.type === 'eficode-set-editable') {
    editMode = e.data.editable;
    document.body.contentEditable = editMode ? 'true' : 'false';
    if (editMode) document.body.focus();
  }
});
```

**Novo useEffect para controlar edição (após linha 184):**
```tsx
// Enviar mensagem para ativar/desativar edição (sem recriar iframe)
useEffect(() => {
  if (iframeRef.current?.contentWindow) {
    iframeRef.current.contentWindow.postMessage(
      { type: 'eficode-set-editable', editable },
      '*'
    );
  }
}, [editable]);
```

**Remover `editable` das dependências do useMemo (linha 155):**
```tsx
// Antes
}, [globalCss, stableHtml, editable]);

// Depois
}, [globalCss, stableHtml]); // editable removido - controlado via postMessage
```

**Manter altura estável com useRef (linha 25):**
```tsx
const [height, setHeight] = useState(minHeight);
const lastHeightRef = useRef(minHeight);

// Na mensagem de altura:
const newHeight = Math.max(event.data.height, minHeight);
if (newHeight !== lastHeightRef.current) {
  lastHeightRef.current = newHeight;
  setHeight(newHeight);
}
```

## Código Final Resumido

### IframePreview.tsx - Script interno do srcdoc:
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

// Escutar comandos do parent
window.addEventListener('message', (e) => {
  if (e.data?.type === 'eficode-set-editable') {
    editMode = e.data.editable;
    document.body.contentEditable = editMode ? 'true' : 'false';
    if (editMode) document.body.focus();
  }
});

// Input handling (sempre configurado, só funciona quando editMode=true)
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

document.body.addEventListener('blur', () => {
  if (!editMode) return;
  clearTimeout(debounceTimer);
  window.parent.postMessage({ 
    type: 'eficode-edit-end',
    html: document.body.innerHTML 
  }, '*');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && editMode) {
    clearTimeout(debounceTimer);
    window.parent.postMessage({ 
      type: 'eficode-edit-end',
      html: document.body.innerHTML 
    }, '*');
  }
});

// Cliques (só propaga quando não está editando)
document.body.addEventListener('click', (e) => {
  if (!editMode) {
    window.parent.postMessage({ type: 'eficode-iframe-click' }, '*');
  }
});
```

## Resultado Esperado

```text
Antes (com flickering):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Bloco A    │ --> │  (pisca)    │ --> │  Bloco A    │
│  Preview    │     │             │     │  Edição     │
└─────────────┘     └─────────────┘     └─────────────┘
    click             iframe            novo iframe
                     desmontado          montado

Depois (estável):
┌─────────────┐     ┌─────────────┐
│  Bloco A    │ --> │  Bloco A    │
│  Preview    │     │  Edição     │
└─────────────┘     └─────────────┘
    click           mesmo iframe
                   contentEditable
                     ativado
```

## Resumo de Alterações

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `HtmlBlock.tsx` | 405-421 | Unificar para 1 único IframePreview |
| `IframePreview.tsx` | 25 | Adicionar `lastHeightRef` para estabilidade |
| `IframePreview.tsx` | 92-151 | Refatorar script para controle via postMessage |
| `IframePreview.tsx` | 155 | Remover `editable` das dependências do useMemo |
| `IframePreview.tsx` | 179-184 | Novo useEffect para enviar mensagem de edição |
