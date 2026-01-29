
# Plano: Substituir Todas as Ocorrências da Mesma Imagem

## Problema Identificado

O HTML dos blocos frequentemente contém a mesma imagem duplicada para versões responsivas (desktop/mobile):

```html
<!-- Mesmo placeholder em ambas as versões -->
<img src="https://placehold.co/600x400" class="hidden md:block">
<img src="https://placehold.co/600x400" class="block md:hidden">
```

O sistema atual:
- Extrai cada `<img>` separadamente (mostrando 2 thumbnails iguais)
- Substitui apenas por índice (uma imagem de cada vez)

## Solução Proposta

### 1. Agrupar Imagens por URL

Em vez de listar cada `<img>` individualmente, agrupar por URL única:

```typescript
interface UniqueBlockImage {
  src: string;
  alt: string;
  count: number;  // Quantas vezes aparece
  indices: number[];  // Quais índices no HTML
}
```

### 2. Substituir Todas as Ocorrências da Mesma URL

Quando o usuário troca uma imagem, substituir TODAS as `<img>` que tinham a mesma URL original:

```typescript
const replaceAllOccurrences = (html: string, oldSrc: string, newSrc: string): string => {
  // Escapa caracteres especiais da URL para usar no regex
  const escapedOldSrc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Substitui todas as ocorrências da URL antiga pela nova
  const regex = new RegExp(`(src=["'])${escapedOldSrc}(["'])`, 'gi');
  return html.replace(regex, `$1${newSrc}$2`);
};
```

### 3. Interface Melhorada

- Mostrar apenas imagens únicas (não duplicadas)
- Indicar quantas vezes cada imagem aparece (ex: "2x")
- Ao trocar, substituir todas de uma vez

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/SettingsPanel.tsx` | Refatorar extração e substituição de imagens |

## Implementação Detalhada

### Nova Extração (Agrupada por URL)

```typescript
interface UniqueBlockImage {
  src: string;
  alt: string;
  count: number;
}

const extractUniqueImages = (html: string): UniqueBlockImage[] => {
  const imageMap = new Map<string, UniqueBlockImage>();
  const imgRegex = /<img\s+[^>]*?src=(["'])([^"']*)\1[^>]*>/gi;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[2];
    const altMatch = match[0].match(/alt=(["'])([^"']*)\1/i);
    const alt = altMatch ? altMatch[2] : '';
    
    if (imageMap.has(src)) {
      imageMap.get(src)!.count++;
    } else {
      imageMap.set(src, { src, alt, count: 1 });
    }
  }
  
  return Array.from(imageMap.values());
};
```

### Nova Substituição (Todas as Ocorrências)

```typescript
const replaceAllImageOccurrences = (html: string, oldSrc: string, newSrc: string): string => {
  // Escapa caracteres especiais para regex
  const escapedSrc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Substitui todas as ocorrências do src
  const regex = new RegExp(`(<img\\s+[^>]*?src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
  return html.replace(regex, `$1${newSrc}$2`);
};
```

### Atualização do handleImageSelect

```typescript
const handleImageSelect = (image: { url: string; name?: string }) => {
  if (selectedBlock && editingSrc !== null) {
    const originalHtml = selectedBlock.html;
    // Substitui TODAS as ocorrências da imagem antiga
    const newHtml = replaceAllImageOccurrences(originalHtml, editingSrc, image.url);
    
    if (originalHtml !== newHtml) {
      updateBlockHtml(selectedBlock.id, newHtml);
      toast.success('Imagem atualizada em todas as ocorrências!');
    }
  }
};
```

### Interface Atualizada

```tsx
{blockImages.map((img) => (
  <div key={img.src} className="relative group ...">
    {/* Mostrar badge se imagem aparece mais de uma vez */}
    {img.count > 1 && (
      <span className="absolute top-1 right-1 bg-primary text-xs px-1 rounded">
        {img.count}x
      </span>
    )}
    <img src={img.src} ... />
    <Button onClick={() => openImagePicker(img.src)}>
      Trocar
    </Button>
  </div>
))}
```

## Fluxo Atualizado

```
1. Usuário seleciona bloco com imagens duplicadas
2. Painel mostra imagens ÚNICAS (agrupadas por URL)
   - Badge "2x" indica duplicatas
3. Usuário clica "Trocar" em uma imagem
4. Seleciona nova imagem da biblioteca
5. TODAS as ocorrências da URL antiga são substituídas
6. Preview atualiza mostrando nova imagem em desktop E mobile
```

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Listagem | Duplicatas visíveis | Imagens únicas |
| Substituição | Uma por vez | Todas de uma vez |
| UX | Confuso | Claro e eficiente |
