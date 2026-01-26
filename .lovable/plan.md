

# Plano: Corrigir Imagens Quebradas e Fontes Invisíveis no HtmlBlock

## Problemas Identificados

1. **Imagens quebradas no viewport**: O HTML é renderizado diretamente e imagens com URLs inválidas mostram o ícone padrão do navegador de imagem quebrada
2. **Imagens duplicadas no painel**: A lista de imagens mostra duplicatas porque não está filtrando URLs repetidas
3. **Fontes brancas invisíveis**: Textos com `color: white` ou classes como `text-white` não aparecem porque o container do viewport tem fundo claro

## Solução

### 1. Placeholder para Imagens Quebradas no Viewport

Processar o HTML antes de renderizar para adicionar tratamento de erro nas imagens:
- Usar um `useEffect` com MutationObserver ou processar o HTML após renderização
- Adicionar `onerror` handler para substituir imagens quebradas por um placeholder SVG inline

### 2. Remover Duplicatas no Painel de Imagens

Modificar `extractImagesFromHtml` para retornar apenas URLs únicas:

```typescript
const extractImagesFromHtml = (html: string): { src: string; index: number }[] => {
  const images: { src: string; index: number }[] = [];
  const seenSrcs = new Set<string>();
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  let index = 0;
  
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    if (!seenSrcs.has(src)) {
      seenSrcs.add(src);
      images.push({ src, index });
      index++;
    }
  }
  
  return images;
};
```

### 3. Tratamento de Imagens Quebradas no Viewport

Adicionar um `useEffect` que monitora as imagens renderizadas e substitui as quebradas:

```typescript
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!containerRef.current) return;
  
  const handleImageError = (e: Event) => {
    const img = e.target as HTMLImageElement;
    if (img.dataset.placeholder) return; // Já processada
    
    img.dataset.placeholder = 'true';
    img.style.backgroundColor = '#f3f4f6';
    img.style.display = 'flex';
    img.style.alignItems = 'center';
    img.style.justifyContent = 'center';
    img.style.minHeight = '100px';
    img.style.minWidth = '100px';
    // Substituir por SVG placeholder
    img.src = 'data:image/svg+xml,...'; // SVG de placeholder
  };
  
  const images = containerRef.current.querySelectorAll('img');
  images.forEach(img => {
    img.addEventListener('error', handleImageError);
  });
  
  return () => {
    images.forEach(img => {
      img.removeEventListener('error', handleImageError);
    });
  };
}, [template]);
```

### 4. Fontes Brancas Invisíveis

O viewport tem fundo branco por padrão. Para textos brancos serem visíveis durante edição, podemos:
- Adicionar um fundo temporário escuro quando há texto branco detectado
- Ou manter o fundo configurável pelo usuário nas page settings (já existe)

O usuário já pode configurar o `backgroundColor` das páginas. A solução ideal é garantir que o CSS Global está sendo aplicado corretamente (já foi feito) e que o fundo da página está correto.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/user-components/HtmlBlock.tsx` | 1. Filtrar duplicatas em `extractImagesFromHtml` |
| | 2. Adicionar tratamento de `onerror` para imagens no viewport |
| | 3. Usar `ref` no container para monitorar imagens |

## Implementação Detalhada

### HtmlBlock.tsx - Mudanças

```typescript
// 1. Atualizar extractImagesFromHtml para remover duplicatas
const extractImagesFromHtml = (html: string): { src: string; index: number }[] => {
  const images: { src: string; index: number }[] = [];
  const seenSrcs = new Set<string>();
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  let index = 0;
  
  while ((match = regex.exec(html)) !== null) {
    const src = match[1];
    if (!seenSrcs.has(src)) {
      seenSrcs.add(src);
      images.push({ src, index });
      index++;
    }
  }
  
  return images;
};

// 2. Placeholder SVG para imagens quebradas
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'/%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'/%3E%3Cpolyline points='21 15 16 10 5 21'/%3E%3C/svg%3E`;

// 3. No componente HtmlBlock, adicionar ref e useEffect
export const HtmlBlock = ({ html, htmlTemplate, className = '', ...dynamicProps }) => {
  // ... existing code ...
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle broken images in the viewport
  useEffect(() => {
    if (!containerRef.current || !enabled) return;
    
    const handleImageError = (e: Event) => {
      const img = e.target as HTMLImageElement;
      if (img.dataset.placeholderApplied) return;
      
      img.dataset.placeholderApplied = 'true';
      img.src = PLACEHOLDER_SVG;
      img.style.backgroundColor = '#f3f4f6';
      img.style.objectFit = 'contain';
      img.style.padding = '20px';
    };
    
    const images = containerRef.current.querySelectorAll('img');
    images.forEach(img => {
      // Check if already broken
      if (!img.complete || img.naturalHeight === 0) {
        handleImageError({ target: img } as Event);
      }
      img.addEventListener('error', handleImageError);
    });
    
    return () => {
      const imgs = containerRef.current?.querySelectorAll('img');
      imgs?.forEach(img => {
        img.removeEventListener('error', handleImageError);
      });
    };
  }, [template, enabled]);

  // Wrap ContentEditable with containerRef
  return (
    <div
      ref={(ref) => {
        containerRef.current = ref;
        if (ref) connect(drag(ref));
      }}
      // ... rest of props
    >
      {/* ... toolbar ... */}
      <ContentEditable ... />
    </div>
  );
};
```

## Fluxo Visual

```text
ANTES:
┌────────────────────────────────────────┐
│ Viewport                               │
│  ┌──────┐  ┌──────┐                   │
│  │  ❌  │  │  ❌  │  (imagens quebradas)│
│  └──────┘  └──────┘                   │
│                                        │
│  Texto branco invisível                │
└────────────────────────────────────────┘

Painel Direito:
├─ img1.jpg [Upload] [Lib]
├─ img1.jpg [Upload] [Lib] ← duplicata
├─ img2.jpg [Upload] [Lib]
├─ img2.jpg [Upload] [Lib] ← duplicata
└─ img3.svg [Quebrada]

DEPOIS:
┌────────────────────────────────────────┐
│ Viewport                               │
│  ┌──────┐  ┌──────┐                   │
│  │  🖼️  │  │  🖼️  │  (placeholders)   │
│  └──────┘  └──────┘                   │
│                                        │
│  Texto branco visível (fundo escuro)  │
└────────────────────────────────────────┘

Painel Direito:
├─ img1.jpg [Upload] [Lib]
├─ img2.jpg [Upload] [Lib]
└─ img3.svg [Quebrada] [Upload] [Lib]
```

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Imagens quebradas | Ícone feio do navegador | Placeholder elegante |
| Lista de imagens | Mostra duplicatas | URLs únicas apenas |
| UX | Confuso | Claro e profissional |

