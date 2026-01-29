
# Plano: Remover Rolagem Vertical dos Iframes dos Blocos

## Problema Identificado

Analisando a screenshot e o código, vejo que cada bloco HTML renderiza em um iframe separado e esses iframes mostram scrollbars verticais. O problema está em múltiplos lugares:

1. **Iframe não desabilita scrolling explicitamente**: Falta `scrolling="no"` no elemento `<iframe>`
2. **CSS interno do iframe permite overflow**: O `<body>` dentro do iframe não tem `overflow: hidden`
3. **Altura dinâmica pode ter delay**: A altura é comunicada via `postMessage`, mas o iframe pode mostrar scrollbar antes de receber a altura correta

## Arquitetura Atual

```text
EfiCodeEditor.tsx
  └── EditorFrame (linha 357)
       └── Frame (Craft.js)
            └── Container (canvas)
                 └── HtmlBlock
                      └── IframePreview ← Aqui está o problema
                           └── <iframe srcDoc="...">
                                └── <html>
                                     └── <body> ← overflow não desabilitado
```

## Solução

### Arquivo: `src/components/eficode/user-components/IframePreview.tsx`

#### Alteração 1: Adicionar `scrolling="no"` ao iframe (linha 190)

| Antes | Depois |
|-------|--------|
| `<iframe ... className="w-full border-0 block mx-auto"` | `<iframe ... className="w-full border-0 block mx-auto" scrolling="no"` |

#### Alteração 2: Desabilitar overflow no CSS interno (linhas 61-68)

```css
/* Antes */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100%;
}
body {
  overflow-x: hidden;
}

/* Depois */
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: auto; /* Mudou de 100% para auto */
  overflow: hidden; /* Desabilitar scroll em ambos */
}
body {
  overflow: hidden; /* Garantir que não haja scroll */
}
```

#### Alteração 3: Garantir altura dinâmica (linha 95-97)

Usar `offsetHeight` em vez de `scrollHeight` para calcular altura mais precisa:

```javascript
// Antes
function sendHeight() {
  const height = document.body.scrollHeight;
  window.parent.postMessage({ type: 'eficode-iframe-height', height }, '*');
}

// Depois
function sendHeight() {
  // offsetHeight é mais preciso para altura visível
  const height = Math.max(document.body.scrollHeight, document.body.offsetHeight);
  window.parent.postMessage({ type: 'eficode-iframe-height', height }, '*');
}
```

#### Alteração 4: Adicionar estilo CSS para overflow no iframe (linha 191-195)

```tsx
// Antes
style={{ 
  width: '100%',
  height: `${height}px`,
  pointerEvents: editable ? 'auto' : (onClick ? 'auto' : 'none'),
}}

// Depois
style={{ 
  width: '100%',
  height: `${height}px`,
  overflow: 'hidden',
  pointerEvents: editable ? 'auto' : (onClick ? 'auto' : 'none'),
}}
```

## Código Final Completo

### Linhas 61-69 (CSS interno do srcdoc):
```css
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: auto;
  overflow: hidden;
}
body {
  overflow: hidden;
}
```

### Linhas 94-98 (função sendHeight):
```javascript
function sendHeight() {
  const height = Math.max(document.body.scrollHeight, document.body.offsetHeight);
  window.parent.postMessage({ type: 'eficode-iframe-height', height }, '*');
}
```

### Linhas 187-198 (elemento iframe):
```tsx
<iframe
  ref={iframeRef}
  srcDoc={srcdoc}
  className="w-full border-0 block mx-auto"
  scrolling="no"
  style={{ 
    width: '100%',
    height: `${height}px`,
    overflow: 'hidden',
    pointerEvents: editable ? 'auto' : (onClick ? 'auto' : 'none'),
  }}
  title="HTML Preview"
  sandbox="allow-scripts allow-same-origin"
/>
```

## Resultado Esperado

```text
Antes:
┌─────────────────────────────────┐
│ Conteúdo do bloco               │ ↑
│                                 │ ▓  ← Scrollbar
│                                 │ ↓
└─────────────────────────────────┘

Depois:
┌─────────────────────────────────┐
│ Conteúdo do bloco               │
│                                 │   ← Sem scrollbar
│ (altura expande automaticamente)│
└─────────────────────────────────┘
```

## Resumo de Alterações

| Linha | Alteração |
|-------|-----------|
| 61-68 | CSS: `min-height: auto`, `overflow: hidden` em html e body |
| 95-97 | JS: Usar `Math.max(scrollHeight, offsetHeight)` |
| 190 | Adicionar atributo `scrolling="no"` |
| 191-195 | Adicionar `overflow: 'hidden'` no style do iframe |
