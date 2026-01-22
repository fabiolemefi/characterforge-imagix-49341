

## Plano: Adaptar Parser de Importação para Formato HTML + JSON

### Objetivo

Adaptar o parser do `BlockImportModal` para reconhecer o formato:
```
<!-- BLOCO X: NOME DO BLOCO -->
<section>...HTML com [placeholders]...</section>
{ "prop": "valor" }
```

---

### 1. Estrutura do Formato Esperado

```text
<!-- ===== BLOCO 1: HERO SECTION ===== -->
<section class="[sectionClass]">
  <h1>[title]</h1>
  <p>[description]</p>
</section>
{
  "sectionClass": "bg-white",
  "title": "Título Principal",
  "description": "Descrição aqui"
}

<!-- ===== BLOCO 2: FEATURE GRID ===== -->
<section>...</section>
{ "prop": "valor" }
```

---

### 2. Lógica de Parsing Atualizada

```typescript
const parseContent = (raw: string): BlockImportData[] => {
  const trimmed = raw.trim();
  
  // 1. Tentar JSON puro primeiro (mantém compatibilidade)
  try {
    const parsed = JSON.parse(trimmed);
    // ... lógica atual para JSON
  } catch {}
  
  // 2. Novo: Detectar formato HTML + JSON com comentários
  const blockPattern = /<!--\s*=*\s*BLOCO\s+\d+:\s*(.+?)\s*=*\s*-->/gi;
  const hasBlockComments = blockPattern.test(trimmed);
  
  if (hasBlockComments) {
    return parseMultipleBlocks(trimmed);
  }
  
  // 3. HTML puro sem JSON (mantém compatibilidade)
  if (trimmed.startsWith('<')) {
    return [{ name: 'Bloco HTML Importado', html_content: trimmed, ... }];
  }
  
  // 4. Tentar HTML + JSON único (sem comentário)
  return parseSingleHtmlWithJson(trimmed);
};
```

---

### 3. Função: parseMultipleBlocks

Divide o conteúdo em blocos individuais baseado nos comentários:

```typescript
const parseMultipleBlocks = (content: string): BlockImportData[] => {
  const blocks: BlockImportData[] = [];
  
  // Regex para encontrar cada bloco
  const blockRegex = /<!--\s*=*\s*BLOCO\s+\d+:\s*(.+?)\s*=*\s*-->([\s\S]*?)(?=<!--\s*=*\s*BLOCO|$)/gi;
  
  let match;
  while ((match = blockRegex.exec(content)) !== null) {
    const blockName = match[1].trim(); // "HERO SECTION"
    const blockContent = match[2].trim();
    
    // Separar HTML e JSON
    const { html, props } = extractHtmlAndJson(blockContent);
    
    // Substituir placeholders [key] pelos valores do JSON
    const finalHtml = replacePlaceholders(html, props);
    
    blocks.push({
      name: formatBlockName(blockName), // "Hero Section"
      category: detectCategory(blockName),
      icon_name: detectIcon(blockName),
      html_content: finalHtml,
    });
  }
  
  return blocks;
};
```

---

### 4. Função: extractHtmlAndJson

Separa o HTML do JSON no conteúdo de cada bloco:

```typescript
const extractHtmlAndJson = (content: string): { html: string; props: Record<string, any> } => {
  // Encontrar o último JSON no conteúdo
  // O JSON geralmente vem após o HTML, começando com {
  
  const jsonMatch = content.match(/\{[\s\S]*\}$/);
  
  if (jsonMatch) {
    const jsonStr = jsonMatch[0];
    const html = content.slice(0, content.lastIndexOf(jsonStr)).trim();
    
    try {
      const props = JSON.parse(jsonStr);
      return { html, props };
    } catch {
      // JSON inválido, retorna HTML completo
      return { html: content, props: {} };
    }
  }
  
  return { html: content, props: {} };
};
```

---

### 5. Função: replacePlaceholders

Substitui `[key]` pelos valores do JSON:

```typescript
const replacePlaceholders = (html: string, props: Record<string, any>): string => {
  let result = html;
  
  for (const [key, value] of Object.entries(props)) {
    // Substituir [key] pelo valor
    const placeholder = new RegExp(`\\[${key}\\]`, 'g');
    result = result.replace(placeholder, String(value || ''));
  }
  
  // Limpar placeholders não substituídos (opcional)
  // result = result.replace(/\[[a-zA-Z_]+\]/g, '');
  
  return result;
};
```

---

### 6. Funções Auxiliares

```typescript
// Formatar nome do bloco: "HERO SECTION" → "Hero Section"
const formatBlockName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/[()]/g, '')
    .trim();
};

// Detectar categoria baseado no nome
const detectCategory = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('hero') || lower.includes('header')) return 'layout';
  if (lower.includes('text') || lower.includes('title')) return 'text';
  if (lower.includes('image') || lower.includes('gallery')) return 'media';
  if (lower.includes('button') || lower.includes('form')) return 'interactive';
  return 'layout';
};

// Detectar ícone baseado no nome
const detectIcon = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('hero')) return 'LayoutTemplate';
  if (lower.includes('text')) return 'Type';
  if (lower.includes('image')) return 'Image';
  if (lower.includes('button')) return 'MousePointer';
  if (lower.includes('grid')) return 'Grid3x3';
  if (lower.includes('section')) return 'Layers';
  return 'Code';
};
```

---

### 7. Prévia da Importação

Adicionar contagem de blocos detectados antes de importar:

```text
┌────────────────────────────────────────────────────────────────┐
│  Importar Bloco                                          [X]  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Textarea com código colado...]                              │
│                                                                │
│  ─────────────────────────────────────────────────────────────  │
│  📦 Detectados: 2 blocos                                       │
│     • Hero Section (layout)                                    │
│     • Content Split (layout)                                   │
│                                                                │
│                              [Cancelar] [Importar 2 blocos]   │
└────────────────────────────────────────────────────────────────┘
```

---

### 8. Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/BlockImportModal.tsx` | Atualizar `parseContent` com nova lógica |

---

### 9. Fluxo de Importação Atualizado

```text
┌─────────────────────────────────────────────────────────────────┐
│  1. Usuário cola conteúdo com múltiplos blocos                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Parser detecta padrão de comentários                        │
│     <!-- BLOCO X: NOME -->                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Para cada bloco:                                            │
│     a. Extrai nome do comentário                               │
│     b. Separa HTML do JSON                                     │
│     c. Substitui [placeholders] pelos valores                   │
│     d. Detecta categoria e ícone pelo nome                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Exibe prévia dos blocos detectados                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. Usuário confirma → Salva todos os blocos no banco          │
└─────────────────────────────────────────────────────────────────┘
```

---

### 10. Resultado Final

1. **Parser inteligente** que detecta o formato HTML + JSON com comentários
2. **Extração automática** do nome do bloco do comentário
3. **Substituição de placeholders** `[key]` pelos valores do JSON
4. **Detecção automática** de categoria e ícone baseado no nome
5. **Prévia visual** dos blocos antes de importar
6. **Retrocompatibilidade** com JSON puro e HTML simples

