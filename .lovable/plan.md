

## Plano: Corrigir Renderização do HtmlBlock no Canvas

### Problema Identificado

Quando você arrasta um bloco HTML do Toolbox, o Craft.js não consegue renderizá-lo no canvas. O erro indica:

```
Invariant failed: The component type specified for this node (HtmlBlock) does not exist in the resolver
```

**Causa raiz**: No arquivo `Toolbox.tsx`, na linha 183, o `HtmlBlock` é criado diretamente sem o wrapper `Element` do Craft.js:

```typescript
// ❌ PROBLEMA - Linha 183
if (block.html_content) {
  return <HtmlBlock htmlTemplate={block.html_content} {...dynamicProps} />;
}
```

Compare com outros componentes que funcionam corretamente:

```typescript
// ✅ Container usa Element wrapper - funciona
case 'Container':
  return <Element is={Container} canvas {...defaultProps} />;

// ❌ HtmlBlock direto - não funciona
case 'HtmlBlock':
  return <HtmlBlock htmlTemplate="" {...defaultProps} />;
```

O `Element` wrapper é necessário para que o Craft.js consiga resolver o tipo do componente e registrar no editor.

---

### Solução

Envelopar o `HtmlBlock` com o componente `Element` do Craft.js, igual aos outros componentes:

```typescript
// ✅ CORREÇÃO
if (block.html_content) {
  const dynamicProps = (block.default_props as Record<string, any>) || {};
  return <Element is={HtmlBlock} htmlTemplate={block.html_content} {...dynamicProps} />;
}
```

E também corrigir o case 'HtmlBlock' padrão:

```typescript
case 'HtmlBlock':
  return <Element is={HtmlBlock} htmlTemplate="" {...defaultProps} />;
```

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/editor/Toolbox.tsx` | Envelopar HtmlBlock com `<Element is={HtmlBlock}>` |

---

### Código Corrigido

```typescript
// Linha 179-208 - getComponent function
const getComponent = (block: EfiCodeBlock) => {
  // Se tem html_content, usar HtmlBlock com template + props dinâmicas
  if (block.html_content) {
    const dynamicProps = (block.default_props as Record<string, any>) || {};
    // ✅ Usar Element wrapper para registro correto no Craft.js
    return (
      <Element 
        is={HtmlBlock} 
        htmlTemplate={block.html_content} 
        {...dynamicProps} 
      />
    );
  }
  
  // Caso contrário, usar componente padrão (compatibilidade)
  const defaultProps = block.default_props || {};
  switch (block.component_type) {
    case 'Container':
      return <Element is={Container} canvas {...defaultProps} />;
    case 'Heading':
      return <Heading {...defaultProps} />;
    case 'Text':
      return <Text {...defaultProps} />;
    case 'Button':
      return <Button {...defaultProps} />;
    case 'Image':
      return <Image {...defaultProps} />;
    case 'Divider':
      return <Divider {...defaultProps} />;
    case 'Spacer':
      return <Spacer {...defaultProps} />;
    case 'HtmlBlock':
      // ✅ Também corrigir o case padrão
      return <Element is={HtmlBlock} htmlTemplate="" {...defaultProps} />;
    default:
      return <Element is={Container} canvas {...defaultProps} />;
  }
};
```

---

### Por que isso funciona?

1. **`Element` é o wrapper do Craft.js**: Ele registra o componente no sistema interno do editor, permitindo drag-and-drop, seleção e serialização.

2. **`is={HtmlBlock}` vincula ao resolver**: O Craft.js usa isso para encontrar `HtmlBlock` no objeto `resolvers` definido em `EfiCodeEditor.tsx`.

3. **Props são passadas normalmente**: `htmlTemplate` e `dynamicProps` continuam funcionando como antes.

---

### Resultado Esperado

Após a correção:

1. Arrastar blocos HTML do Toolbox funciona igual aos outros componentes
2. O bloco aparece no canvas com a renderização correta do HTML
3. Clicar no bloco abre o painel de Settings com os campos de edição
4. Salvar e exportar funcionam normalmente

