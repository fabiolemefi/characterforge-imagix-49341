
# Plano: Suporte a Picture/Source para Múltiplos Breakpoints

## Problema Identificado

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

## Solução

### Opção 1: Substituir Todas as Fontes do Picture (Recomendada)

Quando o usuário troca a imagem, substituir TODAS as `<source srcset>` e o `<img src>` dentro do mesmo `<picture>`. Uma imagem para todos os breakpoints.

### Opção 2: Campos Separados por Breakpoint

Mostrar campos separados para cada breakpoint (360px, 992px, 1366px, 1920px, fallback). Mais controle, mas interface mais complexa.

## Implementação Escolhida: Opção 1

A maioria dos usuários quer usar a mesma imagem em todos os tamanhos. A interface ficará simples.

### Mudanças no Código

**Arquivo:** `src/components/eficode/editor/SettingsPanel.tsx`

#### 1. Nova Interface para Picture Groups

```typescript
interface PictureGroup {
  id: string;
  type: 'picture' | 'img';
  sources: Array<{
    src: string;
    media?: string;  // Ex: "(max-width: 360px)"
    tagType: 'source' | 'img';
  }>;
  previewSrc: string;
  alt: string;
}
```

#### 2. Nova Função de Extração

```typescript
const extractPictureGroups = (html: string): PictureGroup[] => {
  const groups: PictureGroup[] = [];
  
  // 1. Extrair elementos <picture> completos
  const pictureRegex = /<picture[^>]*>([\s\S]*?)<\/picture>/gi;
  let pictureMatch;
  let pictureIndex = 0;
  
  while ((pictureMatch = pictureRegex.exec(html)) !== null) {
    const pictureContent = pictureMatch[1];
    const sources: PictureGroup['sources'] = [];
    
    // Extrair todas as <source srcset="...">
    const sourceRegex = /<source[^>]*srcset=(["'])([^"']*)\1[^>]*(?:media=(["'])([^"']*)\3)?[^>]*>/gi;
    let sourceMatch;
    while ((sourceMatch = sourceRegex.exec(pictureContent)) !== null) {
      sources.push({
        src: sourceMatch[2],
        media: sourceMatch[4] || undefined,
        tagType: 'source'
      });
    }
    
    // Extrair o <img> fallback
    const imgMatch = pictureContent.match(/<img[^>]*src=(["'])([^"']*)\1[^>]*>/i);
    if (imgMatch) {
      sources.push({
        src: imgMatch[2],
        media: undefined,
        tagType: 'img'
      });
    }
    
    // Pegar alt do img
    const altMatch = pictureContent.match(/alt=(["'])([^"']*)\1/i);
    
    if (sources.length > 0) {
      groups.push({
        id: `picture-${pictureIndex}`,
        type: 'picture',
        sources,
        previewSrc: sources.find(s => s.tagType === 'img')?.src || sources[0].src,
        alt: altMatch ? altMatch[2] : ''
      });
    }
    pictureIndex++;
  }
  
  // 2. Extrair <img> órfãos (não dentro de <picture>)
  // Remover pictures do HTML para buscar imgs órfãos
  const htmlWithoutPictures = html.replace(/<picture[^>]*>[\s\S]*?<\/picture>/gi, '');
  // ... lógica existente de extractResponsiveGroups para imgs órfãos
  
  return groups;
};
```

#### 3. Nova Função de Substituição

```typescript
const replacePictureGroup = (html: string, group: PictureGroup, newSrc: string): string => {
  let result = html;
  
  for (const source of group.sources) {
    const escapedSrc = source.src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    if (source.tagType === 'source') {
      // Substituir srcset em <source>
      const regex = new RegExp(`(<source[^>]*srcset=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
      result = result.replace(regex, `$1${newSrc}$2`);
    } else {
      // Substituir src em <img>
      const regex = new RegExp(`(<img[^>]*src=["'])${escapedSrc}(["'][^>]*>)`, 'gi');
      result = result.replace(regex, `$1${newSrc}$2`);
    }
  }
  
  return result;
};
```

#### 4. UI Atualizada

```tsx
{/* Badge para picture com múltiplos breakpoints */}
{group.type === 'picture' && group.sources.length > 1 && (
  <span className="absolute top-1 right-1 z-10 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
    {group.sources.length} tamanhos
  </span>
)}

{/* Botão de ação */}
<Button onClick={() => openImagePicker(group)}>
  <RefreshCw className="h-4 w-4 mr-1" />
  Trocar {group.type === 'picture' ? 'todos' : ''}
</Button>
```

## Fluxo Atualizado

```
1. Usuário seleciona bloco com <picture> (5 breakpoints)
2. Painel mostra UMA imagem com badge "5 tamanhos"
3. Usuário clica "Trocar todos"
4. Seleciona nova imagem
5. Sistema substitui TODAS as sources + img fallback
6. Preview mostra nova imagem em TODOS os viewports
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/SettingsPanel.tsx` | Refatorar extração para suportar `<picture>/<source>` |

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Detecção | Apenas `<img>` | `<picture>` + `<source>` + `<img>` |
| Substituição | 1 URL | Todas as URLs do picture |
| UX | Confuso (só funciona em 1 breakpoint) | Claro (todos os tamanhos) |
| Badge visual | Nenhum | "5 tamanhos" |
