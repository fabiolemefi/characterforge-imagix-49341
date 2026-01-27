
# Plano: Adicionar Classes CSS e CSS Inline no Layout

## Objetivo

Adicionar dois novos campos no accordion "Layout" das configurações:
1. **"Classes CSS adicionais no body"** - Classes para inserir na div container (a que tem largura máxima)
2. **"CSS inline"** - Código CSS que será inserido como `<style>` no documento

## Mudanças Necessárias

### 1. Atualizar Interface PageSettings

**Arquivo:** `src/hooks/useEfiCodeSites.ts`

Adicionar dois novos campos:

```typescript
export interface PageSettings {
  // ... campos existentes ...
  containerClasses: string;   // Classes CSS adicionais para a div container
  inlineStyles: string;       // CSS inline (será injetado como <style>)
}

export const defaultPageSettings: PageSettings = {
  // ... valores existentes ...
  containerClasses: '',
  inlineStyles: '',
};
```

### 2. Adicionar Campos no Toolbox - Accordion Layout

**Arquivo:** `src/components/eficode/editor/Toolbox.tsx`

Adicionar após os campos de padding, dentro do accordion Layout:

```text
┌────────────────────────────────────────────────────────────┐
│ Layout                                                     │
├────────────────────────────────────────────────────────────┤
│ ... (campos existentes: largura, padding, cor)             │
│                                                            │
│ Classes CSS adicionais no body                             │
│ ┌────────────────────────────────────────────────────────┐│
│ │ container-custom my-class                              ││
│ └────────────────────────────────────────────────────────┘│
│ (texto de ajuda: Classes separadas por espaço)            │
│                                                            │
│ CSS inline                                                 │
│ ┌────────────────────────────────────────────────────────┐│
│ │ .size-40 {                                             ││
│ │     width: inherit;                                    ││
│ │     height: inherit;                                   ││
│ │ }                                                      ││
│ │ .h1 { color: red; }                                    ││
│ └────────────────────────────────────────────────────────┘│
│ (texto de ajuda: Estilos CSS que serão injetados)         │
└────────────────────────────────────────────────────────────┘
```

### 3. Aplicar no Preview do Editor

**Arquivo:** `src/pages/EfiCodeEditor.tsx`

A div container já está na linha 317-330. Modificar para incluir as classes e o CSS:

**Classes no container:**
```tsx
<div 
  className={`mx-auto overflow-hidden transition-all duration-300 efi-editor-viewport ${pageSettings.containerClasses || ''}`}
  style={{...}}
>
```

**CSS inline** (já existe o globalCss sendo injetado na linha 314, usar o mesmo mecanismo):
```tsx
// O globalCss já vem de useEfiCodeConfig() - linha 81
// Precisamos combinar com o inlineStyles da pageSettings
const combinedCss = `${globalCss}\n${pageSettings.inlineStyles || ''}`;
<style dangerouslySetInnerHTML={{ __html: combinedCss }} />
```

### 4. Aplicar na Exportação HTML

**Arquivo:** `src/lib/efiCodeHtmlGenerator.ts`

Modificar a função `generateFullHtml` para:

1. Adicionar classes na div container (linha 162):
```typescript
const containerClasses = pageSettings.containerClasses || '';
// ...
<div class="${containerClasses}" style="${containerStyles}">
```

2. Adicionar CSS inline no `<style>` (já existe o globalCss, combinar):
```typescript
const allCss = [globalCss, pageSettings.inlineStyles].filter(Boolean).join('\n');
// ...
${allCss ? `<style>${allCss}</style>` : ''}
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useEfiCodeSites.ts` | Adicionar `containerClasses` e `inlineStyles` ao PageSettings |
| `src/components/eficode/editor/Toolbox.tsx` | Adicionar 2 campos no accordion Layout |
| `src/pages/EfiCodeEditor.tsx` | Aplicar classes e CSS combinado no preview |
| `src/lib/efiCodeHtmlGenerator.ts` | Aplicar classes e CSS na exportação HTML |

## Exemplo de Uso

**Entrada do usuário no campo "CSS inline":**
```css
.size-40 {
    width: inherit;
    height: inherit;
}
.h1 { color: red; }
```

**Entrada do usuário no campo "Classes CSS adicionais no body":**
```
container-fluid bg-pattern
```

**Resultado no HTML exportado:**
```html
<head>
  <!-- ... -->
  <style>
    .size-40 {
        width: inherit;
        height: inherit;
    }
    .h1 { color: red; }
  </style>
</head>
<body style="...">
  <div class="container-fluid bg-pattern" style="max-width: 1200px; margin: 0 auto; ...">
    <!-- conteúdo -->
  </div>
</body>
```

## Resultado Esperado

- Dois novos campos no accordion Layout
- Campo "Classes CSS adicionais no body" (Input simples)
- Campo "CSS inline" (Textarea para múltiplas linhas)
- Classes aplicadas na div container no editor e na exportação
- CSS inline injetado como `<style>` no editor e na exportação
- CSS inline combinado com o globalCss existente da configuração admin
