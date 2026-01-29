

# Plano: Fazer o Conteúdo do Iframe Ocupar Toda a Área do Editor

## Problema Identificado

Analisando a imagem e o código, identifiquei a cadeia de elementos que precisa ser ajustada:

```text
main.flex-1.overflow-auto           ← Área principal do editor
  └── div.efi-editor-viewport       ← Container com maxWidth
       └── Frame (Craft.js)
            └── Element/Container   ← minHeight: 400, display: flex, flexDirection: column
                 └── HtmlBlock      ← w-full (largura OK, mas altura não)
                      └── IframePreview ← height baseada no conteúdo interno
                           └── iframe   ← Só ocupa a altura do HTML
```

O problema é que o HtmlBlock/IframePreview não está expandindo para ocupar toda a altura disponível do Container pai.

## Solução

Modificar a cadeia de componentes para que os elementos filhos ocupem 100% do espaço disponível:

### 1. Container.tsx - Adicionar `flex-1` e `min-height`
O Container ROOT precisa permitir que seus filhos expandam verticalmente.

### 2. HtmlBlock.tsx - Adicionar `h-full` ao wrapper
O wrapper do HtmlBlock precisa ocupar toda a altura disponível.

### 3. IframePreview.tsx - Adicionar `h-full` e ajustar altura do iframe
O wrapper do IframePreview precisa herdar a altura do pai, e o iframe precisa ocupar essa altura.

### 4. EditorFrame - Ajustar Container ROOT
O Container ROOT no EditorFrame precisa ter `alignItems: 'stretch'` e `min-height` adequado.

## Alterações Detalhadas

### Arquivo: `src/components/eficode/user-components/IframePreview.tsx`

| Linha | Alteração |
|-------|-----------|
| 186 | Adicionar `h-full` à div wrapper e `flex flex-col` |
| 191-192 | Mudar altura do iframe para `flex-1` ou `100%` |

```tsx
// Antes
<div className={`relative ${className}`} style={{ minHeight: `${minHeight}px` }}>
  <iframe ... style={{ height: `${height}px`, ... }} />

// Depois  
<div className={`relative h-full flex flex-col ${className}`} style={{ minHeight: `${minHeight}px` }}>
  <iframe ... style={{ flex: 1, minHeight: `${height}px`, ... }} />
```

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

| Linha | Alteração |
|-------|-----------|
| 393 | Adicionar `h-full flex-1` ao wrapper |

```tsx
// Antes
className={`relative w-full ${className}`}

// Depois
className={`relative w-full h-full flex-1 flex flex-col ${className}`}
```

### Arquivo: `src/pages/EfiCodeEditor.tsx`

| Linha | Alteração |
|-------|-----------|
| 500 | Adicionar props para forçar filhos a esticarem |

```tsx
// Antes
<Element is={Container} canvas background="transparent" padding={0} minHeight={400} />

// Depois
<Element 
  is={Container} 
  canvas 
  background="transparent" 
  padding={0} 
  minHeight={400}
  alignItems="stretch"
/>
```

### Arquivo: `src/components/eficode/user-components/Container.tsx`

| Linha | Alteração |
|-------|-----------|
| 34-48 | Adicionar `height: '100%'` quando for ROOT ou canvas |

```tsx
// Antes
style={{
  minHeight,
  display: 'flex',
  ...
}}

// Depois
style={{
  minHeight,
  height: '100%',
  display: 'flex',
  ...
}}
```

## Resultado Esperado

Após as alterações:
- O Container ROOT ocupará toda a altura disponível do viewport
- O HtmlBlock se expandirá para preencher o Container
- O IframePreview ocupará toda a área do HtmlBlock
- O iframe interno mostrará o conteúdo ocupando toda a área visível

## Resumo de Arquivos

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `IframePreview.tsx` | 186, 191 | Adicionar `h-full flex flex-col`, `flex: 1` no iframe |
| `HtmlBlock.tsx` | 393 | Adicionar `h-full flex-1 flex flex-col` |
| `EfiCodeEditor.tsx` | 500 | Adicionar `alignItems="stretch"` |
| `Container.tsx` | 34-48 | Adicionar `height: '100%'` |

