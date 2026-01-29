
# Plano: Vincular Imagens Responsivas (Desktop + Mobile)

## Problema Identificado

Os blocos HTML usam imagens **diferentes** para versões responsivas:

```html
<!-- Desktop - URL A -->
<img src="https://...sede/imagem-A.png" class="hidden md:block">

<!-- Mobile - URL B (diferente!) -->
<img src="https://...sys/imagem-B.png" class="block md:hidden">
```

A lógica atual agrupa apenas por URL idêntica. Como as URLs são diferentes, cada uma aparece como uma imagem separada no painel.

## Solução Proposta

Detectar imagens que são "pares responsivos" analisando suas classes CSS (ex: `hidden md:block` / `block md:hidden`) e agrupá-las juntas.

### 1. Detectar Pares Responsivos

Analisar as classes de cada `<img>` para identificar padrões responsivos:

```typescript
interface ImageWithContext {
  src: string;
  alt: string;
  responsiveType: 'desktop' | 'mobile' | 'both';
  fullMatch: string; // Tag completa para substituição
}

const isDesktopOnly = (classes: string) => 
  /hidden\s+(sm|md|lg|xl):block/.test(classes) || 
  /(sm|md|lg|xl):block\s+hidden/.test(classes);

const isMobileOnly = (classes: string) => 
  /block\s+(sm|md|lg|xl):hidden/.test(classes) || 
  /(sm|md|lg|xl):hidden\s+block/.test(classes);
```

### 2. Agrupar Imagens por Contexto

Quando duas imagens consecutivas têm padrões complementares (uma desktop, outra mobile), agrupá-las:

```typescript
interface ResponsiveImageGroup {
  desktopSrc: string | null;
  mobileSrc: string | null;
  alt: string;
  previewSrc: string; // Usar desktop ou mobile para preview
}
```

### 3. Substituir Ambas ao Mesmo Tempo

Quando usuário troca uma imagem do grupo, substituir TODAS as URLs do grupo:

```typescript
const replaceResponsiveGroup = (
  html: string, 
  group: ResponsiveImageGroup, 
  newSrc: string
): string => {
  let result = html;
  
  if (group.desktopSrc) {
    result = replaceAllImageOccurrences(result, group.desktopSrc, newSrc);
  }
  if (group.mobileSrc) {
    result = replaceAllImageOccurrences(result, group.mobileSrc, newSrc);
  }
  
  return result;
};
```

### 4. Interface Atualizada

Mostrar grupos responsivos com indicador visual:

```
┌─────────────────────────────────┐
│  [Imagem Preview]               │
│  📱💻 Desktop + Mobile          │
│        [Trocar]                 │
└─────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/SettingsPanel.tsx` | Refatorar extração para detectar pares responsivos e substituir ambos |

## Implementação Detalhada

### Nova Interface

```typescript
interface ResponsiveImageGroup {
  id: string;
  sources: Array<{
    src: string;
    type: 'desktop' | 'mobile' | 'universal';
  }>;
  previewSrc: string;
  alt: string;
}
```

### Nova Extração

```typescript
const extractResponsiveGroups = (html: string): ResponsiveImageGroup[] => {
  const groups: ResponsiveImageGroup[] = [];
  const imgRegex = /<img\s+([^>]*?)src=(["'])([^"']*)\2([^>]*)>/gi;
  const images: Array<{ src: string; classes: string; alt: string; type: 'desktop' | 'mobile' | 'universal' }> = [];
  
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const src = match[3];
    const classMatch = fullTag.match(/class=(["'])([^"']*)\1/i);
    const classes = classMatch ? classMatch[2] : '';
    const altMatch = fullTag.match(/alt=(["'])([^"']*)\1/i);
    const alt = altMatch ? altMatch[2] : '';
    
    let type: 'desktop' | 'mobile' | 'universal' = 'universal';
    if (/hidden\s+(sm|md|lg|xl):block|(sm|md|lg|xl):block.*hidden/.test(classes)) {
      type = 'desktop';
    } else if (/block\s+(sm|md|lg|xl):hidden|(sm|md|lg|xl):hidden.*block/.test(classes)) {
      type = 'mobile';
    }
    
    images.push({ src, classes, alt, type });
  }
  
  // Agrupar imagens consecutivas desktop+mobile como um par
  const processed = new Set<number>();
  
  for (let i = 0; i < images.length; i++) {
    if (processed.has(i)) continue;
    
    const current = images[i];
    const next = images[i + 1];
    
    // Verificar se é um par responsivo
    if (next && 
        ((current.type === 'desktop' && next.type === 'mobile') ||
         (current.type === 'mobile' && next.type === 'desktop'))) {
      // Criar grupo com ambas
      groups.push({
        id: `group-${i}`,
        sources: [
          { src: current.src, type: current.type },
          { src: next.src, type: next.type }
        ],
        previewSrc: current.type === 'desktop' ? current.src : next.src,
        alt: current.alt || next.alt
      });
      processed.add(i);
      processed.add(i + 1);
    } else {
      // Imagem individual
      groups.push({
        id: `group-${i}`,
        sources: [{ src: current.src, type: current.type }],
        previewSrc: current.src,
        alt: current.alt
      });
      processed.add(i);
    }
  }
  
  return groups;
};
```

### Nova Substituição

```typescript
const replaceImageGroup = (
  html: string, 
  group: ResponsiveImageGroup, 
  newSrc: string
): string => {
  let result = html;
  
  for (const source of group.sources) {
    result = replaceAllImageOccurrences(result, source.src, newSrc);
  }
  
  return result;
};
```

### UI com Indicador Responsivo

```tsx
{imageGroups.map((group) => (
  <div key={group.id} className="relative group border rounded-md overflow-hidden">
    {/* Badge indicando tipo */}
    <span className="absolute top-1 right-1 z-10 bg-primary/90 text-xs px-1.5 py-0.5 rounded">
      {group.sources.length > 1 ? '📱💻' : group.sources[0].type === 'desktop' ? '💻' : '📱'}
    </span>
    
    <img src={group.previewSrc} ... />
    
    <Button onClick={() => openImagePicker(group)}>
      Trocar {group.sources.length > 1 ? 'ambas' : ''}
    </Button>
  </div>
))}
```

## Fluxo Atualizado

```
1. Bloco tem 2 imagens: desktop (URL A) e mobile (URL B)
2. Sistema detecta que são par responsivo (classes complementares)
3. Painel mostra UM thumbnail com badge "📱💻"
4. Usuário clica "Trocar"
5. Seleciona nova imagem
6. Sistema substitui AMBAS as URLs (A → nova, B → nova)
7. Preview mostra imagem atualizada em qualquer viewport
```

## Benefícios

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Imagens responsivas | Mostradas separadamente | Agrupadas como par |
| Substituição | Uma URL por vez | Todas do grupo |
| UX | Confuso | Intuitivo |
| Indicador visual | Nenhum | Badge 📱💻 |
