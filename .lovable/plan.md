
# Plano: Corrigir Substituição de Imagem no Painel de Propriedades

## Problema Identificado

A função `replaceImage` no `SettingsPanel.tsx` usa `DOMParser` para parsear o HTML do bloco, mas ao retornar `doc.body.innerHTML`, a estrutura do HTML pode ser corrompida:

```typescript
// Código atual problemático
const replaceImage = (html: string, index: number, newSrc: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const imgs = doc.querySelectorAll('img');
  if (imgs[index]) {
    imgs[index].src = newSrc;
  }
  return doc.body.innerHTML;  // Problema: pode perder estrutura
};
```

### Motivos do Problema:
1. `DOMParser` cria um documento HTML completo (com `<html>`, `<head>`, `<body>`)
2. `doc.body.innerHTML` retorna apenas o conteúdo do body, perdendo possíveis wrappers
3. O parser pode reorganizar elementos, quebrando a estrutura original do bloco

## Solução Proposta

Usar um `<template>` element ou um `div` temporário que preserve melhor a estrutura original, ou usar uma abordagem com regex que modifica apenas o atributo `src` específico.

### Abordagem: Template Element (Recomendada)

```typescript
const replaceImage = (html: string, index: number, newSrc: string): string => {
  // Usar um template element que não modifica a estrutura
  const template = document.createElement('template');
  template.innerHTML = html;
  
  const imgs = template.content.querySelectorAll('img');
  if (imgs[index]) {
    imgs[index].setAttribute('src', newSrc);
  }
  
  // Converter de volta para string - preserva a estrutura original
  const div = document.createElement('div');
  div.appendChild(template.content.cloneNode(true));
  return div.innerHTML;
};
```

### Também aplicar a mesma correção para `extractImages`:

```typescript
const extractImages = (html: string): BlockImage[] => {
  const template = document.createElement('template');
  template.innerHTML = html;
  
  const imgs = template.content.querySelectorAll('img');
  return Array.from(imgs).map((img, i) => ({
    index: i,
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || ''
  }));
};
```

## Arquivo a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/SettingsPanel.tsx` | Refatorar `extractImages` e `replaceImage` para usar `template` element |

## Teste de Validação

Após a correção:
1. Selecionar um bloco com imagens
2. Clicar em "Trocar" em uma imagem
3. Selecionar nova imagem da biblioteca
4. Verificar que a imagem é atualizada no preview do iframe
5. Verificar que o HTML do bloco mantém sua estrutura original

## Código Final

```typescript
// Extract images from HTML (preservando estrutura)
const extractImages = (html: string): BlockImage[] => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  
  const imgs = template.content.querySelectorAll('img');
  return Array.from(imgs).map((img, i) => ({
    index: i,
    src: img.getAttribute('src') || '',
    alt: img.getAttribute('alt') || ''
  }));
};

// Replace image in HTML at specific index (preservando estrutura)
const replaceImage = (html: string, index: number, newSrc: string): string => {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  
  const imgs = template.content.querySelectorAll('img');
  if (imgs[index]) {
    imgs[index].setAttribute('src', newSrc);
  }
  
  // Converter de volta para HTML string
  const container = document.createElement('div');
  container.appendChild(template.content.cloneNode(true));
  return container.innerHTML;
};
```

## Benefícios da Solução

| Aspecto | Antes (DOMParser) | Depois (Template) |
|---------|-------------------|-------------------|
| Estrutura HTML | Pode ser modificada | Preservada fielmente |
| Elementos especiais | Podem ser perdidos | Mantidos intactos |
| Performance | Similar | Similar |
| Compatibilidade | Boa | Excelente |
