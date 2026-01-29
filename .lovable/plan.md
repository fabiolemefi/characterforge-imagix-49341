
# Plano: Substituir Apenas a Imagem Específica Clicada

## Problema Identificado

Quando existem múltiplas imagens com o mesmo `src` no mesmo bloco (ex: 4 ícones laranja idênticos), ao clicar em uma delas e trocar, o código atual substitui **TODAS** porque:

1. O iframe envia apenas o `src` da imagem clicada
2. O `handleImageSelect` usa regex global que substitui todas as ocorrências do mesmo src:
```javascript
const regex = new RegExp(`(<img[^>]*src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
newHtml = newHtml.replace(regex, ...);  // Substitui TODAS
```

## Solução

Enviar um **índice de ocorrência** da imagem clicada, para que a substituição seja direcionada à ocorrência específica.

## Mudanças Técnicas

### 1. UnifiedIframe.tsx - Adicionar índice de ocorrência

Modificar a lógica de clique para identificar qual ocorrência da imagem foi clicada:

```javascript
if (img && block) {
  const blockId = block.dataset.blockId;
  const imgSrc = img.getAttribute('src');
  
  // Encontrar o índice desta imagem entre todas as imagens com o mesmo src
  const allImgs = Array.from(block.querySelectorAll('img'));
  const sameSourceImgs = allImgs.filter(function(i) {
    return i.getAttribute('src') === imgSrc;
  });
  const occurrenceIndex = sameSourceImgs.indexOf(img);
  
  if (picture) {
    // ... código existente para picture ...
    window.parent.postMessage({
      type: 'eficode-image-click',
      blockId: blockId,
      imageSrc: imgSrc,
      isPicture: true,
      sources: sources,
      occurrenceIndex: occurrenceIndex  // NOVO
    }, '*');
  } else {
    window.parent.postMessage({
      type: 'eficode-image-click',
      blockId: blockId,
      imageSrc: imgSrc,
      isPicture: false,
      occurrenceIndex: occurrenceIndex  // NOVO
    }, '*');
  }
}
```

### 2. EfiCodeEditor.tsx - Interface atualizada

Atualizar a interface `editingImageContext` para incluir o índice:

```typescript
const [editingImageContext, setEditingImageContext] = useState<{
  blockId: string;
  imageSrc: string;
  isPicture: boolean;
  sources?: ImageSource[];
  occurrenceIndex?: number;  // NOVO
} | null>(null);
```

### 3. EfiCodeEditor.tsx - Substituição direcionada

Atualizar `handleImageSelect` para substituir apenas a N-ésima ocorrência:

```typescript
const handleImageSelect = useCallback((image: { url: string; name?: string }) => {
  if (!editingImageContext) return;
  
  const block = blocks.find(b => b.id === editingImageContext.blockId);
  if (!block) return;
  
  let newHtml = block.html;
  const occurrenceIndex = editingImageContext.occurrenceIndex ?? 0;
  
  if (editingImageContext.sources && editingImageContext.sources.length > 0) {
    // Picture element - substituir todas as sources do mesmo picture
    for (const source of editingImageContext.sources) {
      if (!source.src) continue;
      const escapedSrc = source.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const attr = source.tagType === 'source' ? 'srcset' : 'src';
      const regex = new RegExp(`(<${source.tagType}[^>]*${attr}=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
      
      // Substituir apenas a N-ésima ocorrência
      let matchIndex = 0;
      newHtml = newHtml.replace(regex, (match, p1, p2) => {
        if (matchIndex === occurrenceIndex) {
          matchIndex++;
          return `${p1}${image.url}${p2}`;
        }
        matchIndex++;
        return match;
      });
    }
  } else {
    // Imagem simples - substituir apenas a N-ésima ocorrência
    const escapedSrc = editingImageContext.imageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(<img[^>]*src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
    
    let matchIndex = 0;
    newHtml = newHtml.replace(regex, (match, p1, p2) => {
      if (matchIndex === occurrenceIndex) {
        matchIndex++;
        return `${p1}${image.url}${p2}`;
      }
      matchIndex++;
      return match;
    });
  }
  
  if (newHtml !== block.html) {
    updateBlockHtml(editingImageContext.blockId, newHtml);
    toast.success('Imagem atualizada!');
  }
  
  setImagePickerOpen(false);
  setEditingImageContext(null);
}, [editingImageContext, blocks, updateBlockHtml]);
```

### 4. EfiCodeEditor.tsx - Atualizar handler

Atualizar `handleImageClick` para receber o índice:

```typescript
const handleImageClick = useCallback((
  blockId: string, 
  imageSrc: string, 
  isPicture: boolean, 
  sources?: ImageSource[],
  occurrenceIndex?: number  // NOVO
) => {
  selectBlock(blockId);
  setEditingImageContext({ blockId, imageSrc, isPicture, sources, occurrenceIndex });
  setImagePickerOpen(true);
}, [selectBlock]);
```

### 5. EfiCodeEditor.tsx - Atualizar listener

Passar o índice na mensagem recebida:

```typescript
if (event.data.type === 'eficode-image-click') {
  handleImageClick(
    event.data.blockId,
    event.data.imageSrc,
    event.data.isPicture,
    event.data.sources,
    event.data.occurrenceIndex  // NOVO
  );
}
```

## Fluxo Atualizado

```text
1. Usuário clica no 3º ícone laranja (4 ícones iguais)
2. Iframe detecta: src="icone.png", occurrenceIndex=2
3. EfiCodeEditor recebe: imageSrc="icone.png", occurrenceIndex=2
4. Usuário seleciona nova imagem
5. Regex encontra 4 ocorrências de "icone.png"
6. Substitui APENAS a 3ª ocorrência (índice 2)
7. Resultado: apenas o ícone clicado é trocado
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/UnifiedIframe.tsx` | Calcular e enviar `occurrenceIndex` na mensagem |
| `src/pages/EfiCodeEditor.tsx` | Receber `occurrenceIndex` e substituir apenas a ocorrência específica |

## Casos de Uso

| Cenário | Comportamento |
|---------|---------------|
| Imagem única | Substitui normalmente (índice 0) |
| 4 ícones iguais, clica no 2º | Substitui apenas o 2º |
| Picture com 5 sources, ícone repetido | Substitui apenas a ocorrência específica |
| Cachorro (único) | Continua funcionando normalmente |
