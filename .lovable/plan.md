
# Plano: Suporte a Picture/Source para Múltiplos Breakpoints

## ✅ IMPLEMENTADO

### Problema Identificado

O bloco usa a estrutura HTML5 `<picture>` com múltiplos breakpoints:

```html
<picture>
  <source srcset="img-360.png" media="(max-width: 360px)">
  <source srcset="img-992.png" media="(max-width: 992px)">
  <source srcset="img-1366.png" media="(max-width: 1366px)">
  <source srcset="img-1920.png" media="(max-width: 1920px)">
  <img src="img-fallback.png" alt="...">  <!-- Acima de 1920px -->
</picture>
```

O código atual só detecta `<img>`, ignorando completamente as tags `<source>`.

## Solução Implementada

### Opção 1: Substituir Todas as Fontes do Picture

Quando o usuário troca a imagem, substituir TODAS as `<source srcset>` e o `<img src>` dentro do mesmo `<picture>`. Uma imagem para todos os breakpoints.

### Mudanças Implementadas

**Arquivo:** `src/components/eficode/editor/SettingsPanel.tsx`

1. **Nova Interface `PictureGroup`**: Suporta `picture`, `responsive-pair` e `single`
2. **Nova Função `extractPictureGroups`**: Detecta `<picture>/<source>` + `<img>` órfãos
3. **Nova Função `replaceImageGroup`**: Substitui `srcset` em `<source>` e `src` em `<img>`
4. **UI com Badge**: Mostra "5 tamanhos" para picture com múltiplos breakpoints

## Fluxo Atualizado

```
1. Usuário seleciona bloco com <picture> (5 breakpoints)
2. Painel mostra UMA imagem com badge "5 tamanhos"
3. Usuário clica "Trocar"
4. Seleciona nova imagem
5. Sistema substitui TODAS as sources + img fallback
6. Preview mostra nova imagem em TODOS os viewports
```

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Detecção | Apenas `<img>` | `<picture>` + `<source>` + `<img>` |
| Substituição | 1 URL | Todas as URLs do picture |
| UX | Confuso (só funciona em 1 breakpoint) | Claro (todos os tamanhos) |
| Badge visual | Nenhum | "5 tamanhos" |
