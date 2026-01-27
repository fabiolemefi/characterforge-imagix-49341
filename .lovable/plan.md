
# Plano: Corrigir Bug de Transformação e Flickering de Blocos no Editor

## Diagnóstico do Problema

### Causa Raiz Identificada

O bug ocorre devido à forma como o `connectors.create` do Craft.js é utilizado no `Toolbox.tsx`:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ PROBLEMA: connectors.create recria componentes a cada re-render    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 1. Usuário arrasta "Questionário de Avaliação" para o editor       │
│    → Craft.js cria nó com htmlTemplate do Questionário             │
│                                                                     │
│ 2. Usuário clica no componente ou em qualquer lugar                │
│    → Isso causa um re-render do Toolbox                            │
│                                                                     │
│ 3. Durante o re-render, connectors.create é chamado novamente      │
│    → A função getComponent(block) é executada para cada bloco      │
│    → O Craft.js pode "confundir" qual componente está selecionado  │
│                                                                     │
│ 4. O flickering ocorre porque:                                     │
│    → dangerouslySetInnerHTML causa re-render quando props mudam    │
│    → Qualquer clique fora causa o handleBlur que atualiza props    │
│    → O ciclo se repete causando flash visual                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Por que "Hero com Imagem" especificamente?

Analisando o banco de dados, "Hero com Imagem" é o **primeiro bloco** retornado pela query ordenada. Quando há uma dessincronização no Craft.js, ele pode estar usando o primeiro `HtmlBlock` registrado como fallback.

## Solução Proposta

### 1. Memoizar a criação de componentes no Toolbox

Usar `useMemo` para criar os componentes apenas quando os blocos mudarem, não a cada render:

```typescript
// Memoizar componentes para evitar recriação a cada render
const memoizedComponents = useMemo(() => {
  return blocks.reduce((acc, block) => {
    acc[block.id] = getComponent(block);
    return acc;
  }, {} as Record<string, React.ReactElement>);
}, [blocks]);
```

### 2. Usar callback ref estável para connectors.create

Evitar que o `connectors.create` seja chamado múltiplas vezes com diferentes componentes:

```typescript
// Em vez de:
ref={(ref) => ref && connectors.create(ref, getComponent(block))}

// Usar:
ref={(ref) => ref && connectors.create(ref, memoizedComponents[block.id])}
```

### 3. Corrigir o handleBlur no HtmlBlock

O `handleBlur` atual está causando atualizações desnecessárias. Precisamos verificar se realmente houve mudança antes de atualizar:

```typescript
const handleBlur = useCallback((e: React.FocusEvent) => {
  if (containerRef.current?.contains(e.relatedTarget as Node)) {
    return;
  }
  
  if (isEditing && containerRef.current) {
    const newHtml = normalizeHtml(containerRef.current.innerHTML);
    const currentNormalized = normalizeHtml(template);
    
    // Só atualiza se realmente mudou E não é string vazia
    if (newHtml && newHtml !== currentNormalized) {
      setProp((props: any) => {
        props.htmlTemplate = newHtml;
        props.html = newHtml;
      });
    }
  }
  setIsEditing(false);
}, [isEditing, template, setProp]);
```

### 4. Adicionar key único baseado no conteúdo do HtmlBlock

Para garantir que o React identifique corretamente cada instância:

```typescript
// No HtmlBlock, usar uma key derivada do conteúdo
const contentKey = useMemo(() => {
  return template.slice(0, 100).replace(/\s/g, '').substring(0, 20);
}, []);  // Nota: array vazio para fixar na montagem
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/editor/Toolbox.tsx` | Memoizar componentes e usar refs estáveis |
| `src/components/eficode/user-components/HtmlBlock.tsx` | Corrigir handleBlur e adicionar estabilização |

## Implementação Detalhada

### Toolbox.tsx - Mudanças

```typescript
import { useMemo, useCallback } from 'react';

// Dentro do componente Toolbox:

// Memoizar a função getComponent
const getComponent = useCallback((block: EfiCodeBlock) => {
  if (block.html_content) {
    const dynamicProps = (block.default_props as Record<string, any>) || {};
    return (
      <HtmlBlock 
        htmlTemplate={block.html_content} 
        {...dynamicProps} 
      />
    );
  }
  // ... resto da lógica
}, []);

// Memoizar todos os componentes de uma vez
const memoizedComponents = useMemo(() => {
  const components: Record<string, React.ReactElement> = {};
  blocks.forEach(block => {
    components[block.id] = getComponent(block);
  });
  return components;
}, [blocks, getComponent]);

// Na renderização:
<div
  key={block.id}
  ref={(ref) => {
    if (ref && memoizedComponents[block.id]) {
      connectors.create(ref, memoizedComponents[block.id]);
    }
  }}
>
```

### HtmlBlock.tsx - Mudanças

```typescript
// Adicionar ref para o template inicial (montagem)
const initialTemplateRef = useRef(template);

// Modificar handleBlur para ser mais defensivo
const handleBlur = useCallback((e: React.FocusEvent) => {
  // Evitar blur se o foco foi para dentro do mesmo container
  if (containerRef.current?.contains(e.relatedTarget as Node)) {
    return;
  }
  
  if (isEditing && containerRef.current) {
    const rawHtml = containerRef.current.innerHTML;
    // Verificar se não está vazio ou é apenas whitespace
    if (!rawHtml || rawHtml.trim() === '') {
      // Restaurar o template original se vazio
      setIsEditing(false);
      return;
    }
    
    const newHtml = normalizeHtml(rawHtml);
    const currentNormalized = normalizeHtml(originalTemplateRef.current);
    
    if (newHtml !== currentNormalized) {
      setProp((props: any) => {
        props.htmlTemplate = newHtml;
        props.html = newHtml;
      });
    }
  }
  setIsEditing(false);
}, [isEditing, setProp]);

// Evitar que cliques no container pai causem problemas
const handleContainerClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation(); // Impedir propagação que pode causar re-renders
  if (enabled && selected && !isEditing) {
    originalTemplateRef.current = template;
    setIsEditing(true);
  }
}, [enabled, selected, isEditing, template]);
```

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────────┐
│ APÓS CORREÇÃO:                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 1. Toolbox renderiza e memoiza todos os componentes                │
│    → Cada bloco tem seu componente criado uma única vez            │
│                                                                     │
│ 2. connectors.create recebe sempre o mesmo componente memoizado    │
│    → Não há recriação durante re-renders                           │
│                                                                     │
│ 3. Usuário clica no componente                                     │
│    → handleClick ativa edição com template correto                 │
│    → stopPropagation evita re-renders desnecessários               │
│                                                                     │
│ 4. Usuário clica fora                                              │
│    → handleBlur só atualiza se houve mudança real                  │
│    → Sem flickering porque não há ciclo de atualizações            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

- Cada bloco mantém seu próprio `htmlTemplate` após ser arrastado
- Clicar no bloco não causa transformação para outro componente
- Sem flickering ao interagir com blocos
- Edição direta funciona corretamente

