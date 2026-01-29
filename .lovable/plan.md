

# Plano: Iframes Sem Limite de Altura e Centralizados

## Problemas Identificados

### 1. Iframes com Rolagem (Limite de Altura)
O `IframePreview` define `minHeight` no wrapper e no iframe, mas o problema é que o iframe precisa expandir para o conteúdo sem limite superior:

```tsx
// Atual (IframePreview.tsx linha 186 e 191-194)
<div style={{ minHeight: `${minHeight}px` }}>
  <iframe style={{ minHeight: `${height}px` }} />
</div>
```

A altura é calculada via `postMessage`, mas o wrapper ainda tem um `minHeight` que pode causar comportamento inconsistente.

### 2. Iframes Alinhados à Esquerda
O wrapper do IframePreview não tem centralização:
```tsx
<div className={`relative h-full flex flex-col ${className}`}>
```

Falta `mx-auto` para centralizar horizontalmente.

## Solução

### Arquivo 1: `src/components/eficode/user-components/IframePreview.tsx`

| Linha | Alteração |
|-------|-----------|
| 186 | Adicionar `mx-auto` e usar `height: auto` em vez de minHeight no wrapper |
| 191-194 | Usar `height` dinâmico sem limite, remover `flex: 1` que força altura |

**Código Antes (linhas 185-198):**
```tsx
return (
  <div className={`relative h-full flex flex-col ${className}`} style={{ minHeight: `${minHeight}px` }}>
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      className="w-full border-0 block"
      style={{ 
        flex: 1,
        width: '100%',
        minHeight: `${height}px`,
        pointerEvents: editable ? 'auto' : (onClick ? 'auto' : 'none'),
      }}
```

**Código Depois:**
```tsx
return (
  <div className={`relative mx-auto w-full ${className}`}>
    <iframe
      ref={iframeRef}
      srcDoc={srcdoc}
      className="w-full border-0 block mx-auto"
      style={{ 
        width: '100%',
        height: `${height}px`,
        pointerEvents: editable ? 'auto' : (onClick ? 'auto' : 'none'),
      }}
```

Principais mudanças:
- **Wrapper**: Remover `h-full flex flex-col` e `minHeight`, adicionar `mx-auto` para centralização
- **Iframe**: Usar `height` (não `minHeight`), remover `flex: 1`, adicionar `mx-auto` na classe

### Arquivo 2: `src/components/eficode/user-components/HtmlBlock.tsx`

| Linha | Alteração |
|-------|-----------|
| 402 | Ajustar wrapper para centralizar conteúdo |
| 412, 419 | Remover `minHeight` fixo dos IframePreview |

**Código Antes (linhas 395-422):**
```tsx
<div
  ref={...}
  className={`relative w-full h-full flex-1 flex flex-col ${className}`}
  style={{ boxShadow: ... }}
>
  {isEditing ? (
    <IframePreview
      ...
      minHeight={50}
    />
  ) : (
    <IframePreview
      ...
      minHeight={50}
    />
  )}
</div>
```

**Código Depois:**
```tsx
<div
  ref={...}
  className={`relative w-full ${className}`}
  style={{ boxShadow: ... }}
>
  {isEditing ? (
    <IframePreview
      ...
      minHeight={0}
    />
  ) : (
    <IframePreview
      ...
      minHeight={0}
    />
  )}
</div>
```

Principais mudanças:
- Wrapper: Remover `h-full flex-1 flex flex-col` que forçam altura fixa
- IframePreview: Usar `minHeight={0}` para permitir altura 100% do conteúdo

## Resultado Esperado

```text
Antes:
┌─────────────────────────────────────────┐
│ ┌───────────────────────────────┐       │
│ │ Bloco com rolagem interna │ ↕ │       │  ← Alinhado à esquerda
│ └───────────────────────────────┘       │
└─────────────────────────────────────────┘

Depois:
┌─────────────────────────────────────────┐
│     ┌───────────────────────────────┐   │
│     │ Bloco expandido sem rolagem   │   │  ← Centralizado
│     │ Conteúdo todo visível         │   │
│     └───────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Resumo de Arquivos

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `IframePreview.tsx` | 186 | Wrapper: remover flex, adicionar `mx-auto w-full` |
| `IframePreview.tsx` | 190-194 | Iframe: usar `height` dinâmico, adicionar `mx-auto` |
| `HtmlBlock.tsx` | 402 | Wrapper: remover `h-full flex-1 flex flex-col` |
| `HtmlBlock.tsx` | 412, 419 | IframePreview: `minHeight={0}` |

