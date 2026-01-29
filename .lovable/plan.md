
# Plano: Trocar Imagens Clicando Diretamente no Preview

## Objetivo

Permitir que o usuário clique diretamente em uma imagem no preview do iframe para abrir o seletor de imagens, em vez de precisar usar apenas o painel lateral.

## Abordagem Técnica

### Fluxo Proposto

```text
1. Usuário clica em uma imagem no iframe
2. Iframe detecta que é uma <img> ou <picture>
3. Envia mensagem postMessage com dados da imagem (src, blockId)
4. EfiCodeEditor recebe a mensagem
5. Abre o ImagePickerModal diretamente
6. Ao selecionar nova imagem, substitui no HTML do bloco
```

## Mudanças Necessárias

### 1. UnifiedIframe.tsx - Detectar cliques em imagens

Adicionar lógica no script do iframe para detectar cliques especificamente em elementos `<img>`:

```typescript
// Dentro do script do iframe
document.addEventListener('click', function(e) {
  // Verificar se clicou em uma imagem
  const img = e.target.closest('img');
  const picture = e.target.closest('picture');
  
  if (img) {
    e.stopPropagation(); // Evitar propagação para o bloco
    
    const block = img.closest('[data-block-id]');
    if (!block) return;
    
    const blockId = block.dataset.blockId;
    const imgSrc = img.getAttribute('src');
    
    // Se está dentro de um picture, enviar info do picture completo
    if (picture) {
      const sources = Array.from(picture.querySelectorAll('source')).map(s => ({
        src: s.getAttribute('srcset'),
        media: s.getAttribute('media'),
        tagType: 'source'
      }));
      sources.push({ src: imgSrc, tagType: 'img' });
      
      window.parent.postMessage({
        type: 'eficode-image-click',
        blockId: blockId,
        imageSrc: imgSrc,
        isPicture: true,
        sources: sources
      }, '*');
    } else {
      // Imagem simples
      window.parent.postMessage({
        type: 'eficode-image-click',
        blockId: blockId,
        imageSrc: imgSrc,
        isPicture: false
      }, '*');
    }
    
    return;
  }
  
  // ... resto da lógica de clique em blocos
});
```

Adicionar estilos para feedback visual nas imagens:

```css
/* Indicador de que imagens são clicáveis */
.efi-block img {
  cursor: pointer;
  transition: outline 0.15s ease, opacity 0.15s ease;
}

.efi-block img:hover {
  outline: 2px solid #8b5cf6;
  outline-offset: 2px;
  opacity: 0.9;
}
```

### 2. UnifiedIframe.tsx - Nova prop para callback de imagem

Adicionar nova prop para notificar cliques em imagens:

```typescript
interface UnifiedIframeProps {
  blocks: Block[];
  globalCss: string;
  selectedBlockId: string | null;
  viewportWidth: string;
  onBlockClick: (blockId: string) => void;
  onBlockDoubleClick: (blockId: string) => void;
  onBlockEdit: (blockId: string, newHtml: string) => void;
  onImageClick?: (blockId: string, imageSrc: string, isPicture: boolean, sources?: ImageSource[]) => void; // NOVO
}
```

### 3. EfiCodeEditor.tsx - Handler para clique em imagem

Adicionar estado e handlers para gerenciar a abertura do modal:

```typescript
// Novos estados
const [imagePickerOpen, setImagePickerOpen] = useState(false);
const [editingImageContext, setEditingImageContext] = useState<{
  blockId: string;
  imageSrc: string;
  isPicture: boolean;
  sources?: ImageSource[];
} | null>(null);

// Handler para clique em imagem no iframe
const handleImageClick = useCallback((
  blockId: string, 
  imageSrc: string, 
  isPicture: boolean, 
  sources?: ImageSource[]
) => {
  selectBlock(blockId);
  setEditingImageContext({ blockId, imageSrc, isPicture, sources });
  setImagePickerOpen(true);
}, [selectBlock]);

// Handler para seleção de imagem
const handleImageSelect = useCallback((image: { url: string }) => {
  if (!editingImageContext) return;
  
  const block = blocks.find(b => b.id === editingImageContext.blockId);
  if (!block) return;
  
  let newHtml = block.html;
  
  if (editingImageContext.sources) {
    // Substituir todas as sources do picture
    for (const source of editingImageContext.sources) {
      const escapedSrc = source.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const attr = source.tagType === 'source' ? 'srcset' : 'src';
      const regex = new RegExp(`(<${source.tagType}[^>]*${attr}=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
      newHtml = newHtml.replace(regex, `$1${image.url}$2`);
    }
  } else {
    // Substituir imagem simples
    const escapedSrc = editingImageContext.imageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(<img[^>]*src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
    newHtml = newHtml.replace(regex, `$1${image.url}$2`);
  }
  
  updateBlockHtml(editingImageContext.blockId, newHtml);
  setImagePickerOpen(false);
  setEditingImageContext(null);
  toast.success('Imagem atualizada!');
}, [editingImageContext, blocks, updateBlockHtml]);
```

### 4. EfiCodeEditor.tsx - Adicionar ImagePickerModal

Importar e renderizar o modal:

```tsx
import { ImagePickerModal } from '@/components/eficode/ImagePickerModal';

// No JSX, no final do componente:
<ImagePickerModal
  open={imagePickerOpen}
  onOpenChange={(open) => {
    setImagePickerOpen(open);
    if (!open) setEditingImageContext(null);
  }}
  onSelect={handleImageSelect}
/>
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/UnifiedIframe.tsx` | Adicionar detecção de clique em imagens, estilos hover, nova mensagem postMessage |
| `src/pages/EfiCodeEditor.tsx` | Adicionar estados, handler, importar e renderizar ImagePickerModal |

## Experiência do Usuário

### Antes
- Clicar na imagem = seleciona o bloco
- Trocar imagem = precisa ir no painel lateral

### Depois  
- Clicar na imagem = abre seletor de imagens diretamente
- Imagem tem outline roxo no hover indicando que é clicável
- Trocar imagem = ainda funciona no painel lateral (duas opções)

## Considerações

### Conflito com Seleção de Bloco

O clique na imagem vai usar `stopPropagation()` para não propagar para o bloco. Isso significa que:
- Clicar em uma imagem = abre seletor de imagens
- Clicar em outra área do bloco = seleciona o bloco

### Indicador Visual

Adicionar outline roxo no hover das imagens para indicar que são clicáveis, diferenciando do outline azul de seleção de blocos.
