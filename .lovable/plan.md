
# Plano: Remover CSS Hardcoded e Corrigir Cache do globalCss

## Problema Identificado

O HTML exportado contém dois tipos de CSS indesejado:

1. **CSS basico hardcoded** (linhas 110-128 do `efiCodeHtmlGenerator.ts`):
   - Reset CSS (`* { box-sizing: border-box; ... }`)
   - Estilos do body (font-family, background-color, etc.)
   - Classe `.page-container`
   - Regra `img { max-width: 100%; }`

2. **CSS do Tailwind no `globalCss`**: O React Query pode ter cacheado o valor antigo antes de limparmos o banco. Precisa de invalidacao ou refetch.

## Solucao

### Parte 1: Remover CSS Hardcoded da Funcao de Exportacao

Modificar `src/lib/efiCodeHtmlGenerator.ts` para:
- Remover o bloco de estilos basicos hardcoded
- Manter apenas o `globalCss` passado como parametro
- Remover tambem a estrutura `.page-container` se o usuario quiser HTML limpo

**Codigo atual (problematico):**
```typescript
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { ... }
  .page-container { ... }
  img { max-width: 100%; }
  
  /* CSS Global do Efi Code */
  ${globalCss}
</style>
```

**Codigo novo (limpo):**
```typescript
// Apenas incluir tag style se houver globalCss
${globalCss ? `<style>
  ${globalCss}
</style>` : ''}
```

### Parte 2: Forcar Refetch do globalCss

Adicionar `staleTime: 0` e `refetchOnMount: true` no hook `useEfiCodeConfig` para garantir que o valor seja sempre buscado do banco.

### Parte 3: Remover Wrapper .page-container do Body

Se o HTML exportado nao deve ter wrapper, modificar o template para exportar apenas o conteudo dos blocos.

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/efiCodeHtmlGenerator.ts` | Remover CSS hardcoded, exportar apenas globalCss se existir |
| `src/hooks/useEfiCodeConfig.ts` | Adicionar `staleTime: 0` para evitar cache |

## Template Exportado Apos Correcao

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nome do Site</title>
  <!-- Meta tags de SEO se definidas -->
  <!-- Scripts de tracking se definidos -->
  <!-- customHeadCode se definido -->
  <!-- Apenas se globalCss existir: -->
  <style>
    /* CSS Global do Efi Code */
    [conteudo do globalCss do banco]
  </style>
</head>
<body>
[conteudo dos blocos HTML]
</body>
</html>
```

## Fluxo Corrigido

```text
ANTES:
┌─────────────────────────────────────────────────────┐
│ generateFullHtml sempre inclui:                     │
│   - CSS reset hardcoded                             │
│   - body { font-family... }                         │
│   - .page-container { max-width... }                │
│   - globalCss (pode estar cacheado com Tailwind)    │
└─────────────────────────────────────────────────────┘

DEPOIS:
┌─────────────────────────────────────────────────────┐
│ generateFullHtml inclui APENAS:                     │
│   - globalCss do banco (se existir)                 │
│   - Sem CSS reset                                   │
│   - Sem estilos de body/container                   │
│   - Sempre busca valor fresco do banco              │
└─────────────────────────────────────────────────────┘
```

## Resultado Esperado

Se o campo `global_css` no banco estiver vazio, o HTML exportado nao tera nenhuma tag `<style>`. Se tiver conteudo customizado, apenas esse conteudo sera incluido.
