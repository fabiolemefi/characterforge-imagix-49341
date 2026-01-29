
# Plano: Corrigir Responsividade do IframePreview

## Problema Identificado

O iframe está com `w-full` (100% da largura do container), mas o conteúdo dentro do iframe não está ocupando toda a largura disponível. Isso ocorre porque:

1. O `<html>` e `<body>` do iframe não têm estilos de reset (`margin: 0`, `width: 100%`)
2. O navegador aplica estilos padrão (margens, padding) antes do CSS global carregar
3. O conteúdo HTML pode ter larguras fixas que não respondem ao viewport

## Solução

Adicionar estilos de reset essenciais **antes** do CSS global no `srcdoc` do iframe para garantir que o documento ocupe 100% da largura.

## Alterações

### Arquivo: `src/components/eficode/user-components/IframePreview.tsx`

Na construção do `srcdoc` (linhas 50-136), adicionar reset CSS no início:

```typescript
const srcdoc = useMemo(() => `
<!DOCTYPE html>
<html style="width: 100%; height: auto;">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Reset essencial para responsividade */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
    }
    body {
      overflow-x: hidden;
    }
    img, video, iframe {
      max-width: 100%;
      height: auto;
    }
    
    /* Global CSS do admin - controla 100% dos estilos */
    ${globalCss}
    
    /* Estilos para modo de edição */
    body[contenteditable="true"] {
      outline: none;
      cursor: text;
    }
    // ... resto mantido
  </style>
</head>
// ... resto do documento
`, [globalCss, stableHtml, editable]);
```

## Resumo das Alterações

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `IframePreview.tsx` | ~50-70 | Adicionar reset CSS antes do globalCss |

## Resultado Esperado

- O conteúdo do iframe ocupará 100% da largura disponível
- Imagens e mídia serão responsivas (`max-width: 100%`)
- Margens padrão do navegador serão removidas
- O CSS global (Tailwind v4) poderá sobrescrever esses resets se necessário
