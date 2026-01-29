
# Plano: Corrigir Substituição de Imagem no Bloco

## Diagnóstico do Problema

O fluxo atual de substituição de imagem está falhando silenciosamente. Após análise do código, identifiquei múltiplos pontos potenciais de falha:

### 1. Problema Principal: Sincronização HTML/Template

Quando usamos `template.innerHTML` para parsear o HTML e depois serializamos com `container.innerHTML`, o DOM pode:
- Normalizar atributos HTML (reordenar, adicionar aspas)
- Modificar URLs relativas
- Alterar a estrutura de elementos self-closing como `<img>`

### 2. Problema de Re-renderização

O `UnifiedIframe` usa `useMemo` baseado em `blocks` para gerar o `srcDoc`. Se a referência do array não mudar corretamente, o iframe pode não re-renderizar.

### 3. Problema de Debug

Não há logs para verificar se o `updateBlockHtml` está sendo chamado e com quais valores.

## Solução Proposta

### Parte 1: Adicionar Logs de Debug

Adicionar `console.log` temporários para rastrear o fluxo:
```typescript
const handleImageSelect = (image: { url: string; name?: string }) => {
  console.log('[SettingsPanel] handleImageSelect called', { 
    image, 
    selectedBlockId: selectedBlock?.id,
    editingImageIndex 
  });
  
  if (selectedBlock && editingImageIndex !== null) {
    console.log('[SettingsPanel] Original HTML:', selectedBlock.html);
    const newHtml = replaceImage(selectedBlock.html, editingImageIndex, image.url);
    console.log('[SettingsPanel] New HTML:', newHtml);
    updateBlockHtml(selectedBlock.id, newHtml);
  }
};
```

### Parte 2: Forçar Re-renderização do Iframe

O problema pode estar no `useMemo` do `UnifiedIframe` que não detecta mudanças profundas no array de blocos. Precisamos garantir que uma nova referência seja criada.

No `efiCodeEditorStore`, a função `updateBlockHtml` já cria um novo array:
```typescript
updateBlockHtml: (id, html) => {
  const { blocks } = get();
  const newBlocks = blocks.map(b => 
    b.id === id ? { ...b, html } : b  // Cria novo objeto
  );
  set({ blocks: newBlocks });  // Novo array
};
```

Isso parece correto, mas o problema pode estar no `useMemo` do `srcDoc` não reagindo.

### Parte 3: Usar Key Única para Forçar Re-render do Iframe

Adicionar uma key baseada em hash do conteúdo:
```typescript
// No EfiCodeEditor
const blocksHash = useMemo(() => {
  return blocks.map(b => `${b.id}:${b.html.length}`).join('|');
}, [blocks]);

<UnifiedIframe
  key={blocksHash}  // Forçar re-mount quando blocos mudam
  blocks={blocks}
  ...
/>
```

### Parte 4: Alternativa - Usar Regex para Substituição

Em vez de manipular DOM, usar regex direto na string HTML:
```typescript
const replaceImage = (html: string, index: number, newSrc: string): string => {
  let count = 0;
  return html.replace(/<img([^>]*)\ssrc=["']([^"']*)["']([^>]*)>/gi, (match, before, src, after) => {
    if (count === index) {
      count++;
      return `<img${before} src="${newSrc}"${after}>`;
    }
    count++;
    return match;
  });
};
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/SettingsPanel.tsx` | Substituir `replaceImage` por versão com regex, adicionar logs |
| `src/pages/EfiCodeEditor.tsx` | Adicionar key dinâmica no `UnifiedIframe` |

## Implementação Detalhada

### SettingsPanel.tsx

```typescript
// Nova versão de replaceImage usando regex (mais segura)
const replaceImage = (html: string, index: number, newSrc: string): string => {
  let currentIndex = 0;
  
  // Regex que captura <img ... src="..." ...>
  return html.replace(
    /<img\s+([^>]*?)src=(["'])([^"']*)\2([^>]*)>/gi,
    (match, before, quote, currentSrc, after) => {
      if (currentIndex === index) {
        currentIndex++;
        return `<img ${before}src=${quote}${newSrc}${quote}${after}>`;
      }
      currentIndex++;
      return match;
    }
  );
};

// Atualizar handleImageSelect com logs
const handleImageSelect = (image: { url: string; name?: string }) => {
  console.log('[SettingsPanel] Selecionando imagem:', image.url);
  
  if (selectedBlock && editingImageIndex !== null) {
    const originalHtml = selectedBlock.html;
    const newHtml = replaceImage(originalHtml, editingImageIndex, image.url);
    
    console.log('[SettingsPanel] Index:', editingImageIndex);
    console.log('[SettingsPanel] Original HTML length:', originalHtml.length);
    console.log('[SettingsPanel] New HTML length:', newHtml.length);
    console.log('[SettingsPanel] HTML changed:', originalHtml !== newHtml);
    
    if (originalHtml !== newHtml) {
      updateBlockHtml(selectedBlock.id, newHtml);
      toast.success('Imagem atualizada!');
    } else {
      console.error('[SettingsPanel] ERRO: HTML não foi modificado!');
      toast.error('Erro ao atualizar imagem');
    }
  }
  
  setImagePickerOpen(false);
  setEditingImageIndex(null);
};
```

### EfiCodeEditor.tsx

```typescript
// Adicionar key para forçar re-render
const blocksKey = useMemo(() => {
  return blocks.reduce((acc, b) => acc + b.html.length, 0);
}, [blocks]);

// No JSX
<UnifiedIframe
  key={`iframe-${blocksKey}`}
  blocks={blocks}
  globalCss={globalCss}
  selectedBlockId={selectedBlockId}
  viewportWidth={viewportWidths[viewportSize]}
  onBlockClick={handleBlockClick}
  onBlockDoubleClick={handleBlockDoubleClick}
  onBlockEdit={handleBlockEdit}
/>
```

## Teste de Validação

1. Abrir o editor com um site que tem blocos com imagens
2. Selecionar um bloco
3. Clicar em "Trocar" em uma imagem
4. Verificar console para os logs
5. Selecionar nova imagem
6. Verificar nos logs se:
   - `HTML changed: true`
   - O novo HTML contém a nova URL
7. Verificar se a imagem aparece atualizada no preview

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Substituição | Via DOM (pode corromper) | Via Regex (preserva) |
| Debug | Sem visibilidade | Logs claros |
| Re-render | Pode falhar silenciosamente | Forçado via key |
| Toast | Sempre "sucesso" | Só se realmente mudou |
