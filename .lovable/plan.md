
# Plano: Corrigir Persistência do HtmlBlock no Efi Code

## Problema Identificado

O componente `HtmlBlock` desaparece após salvar ou mudar de aba porque o Craft.js não está conseguindo deserializar o componente corretamente. 

### Análise do Problema

Ao analisar o JSON salvo no banco de dados, identifiquei que:

1. **Componentes que funcionam** (Button, Heading, etc.) têm:
   - `type: { resolvedName: "Button" }` - corresponde à chave no resolver

2. **HtmlBlock** está sendo serializado de forma diferente porque é criado através do wrapper `<Element is={HtmlBlock}>` no Toolbox.tsx

3. O `resolvedName` do HtmlBlock pode estar sendo serializado como "HtmlBlock" mas o componente pode não estar sendo encontrado no `resolver` durante a deserialização, possivelmente devido a uma incompatibilidade entre como o `Element` wrapper afeta a serialização.

### Causa Raiz

No arquivo `Toolbox.tsx` (linhas 184-190), o HtmlBlock é criado assim:

```typescript
return (
  <Element 
    is={HtmlBlock} 
    htmlTemplate={block.html_content} 
    {...dynamicProps} 
  />
);
```

Enquanto outros componentes simples são criados diretamente:
```typescript
return <Heading {...defaultProps} />;
return <Button {...defaultProps} />;
```

O uso do `Element` wrapper está causando um problema de resolução durante a deserialização.

## Solução

### Modificação 1: Toolbox.tsx

Mudar a forma como o `HtmlBlock` é criado para usar o componente diretamente ao invés do wrapper `Element`:

```typescript
// ANTES (problemático)
if (block.html_content) {
  const dynamicProps = (block.default_props as Record<string, any>) || {};
  return (
    <Element 
      is={HtmlBlock} 
      htmlTemplate={block.html_content} 
      {...dynamicProps} 
    />
  );
}

// DEPOIS (corrigido)
if (block.html_content) {
  const dynamicProps = (block.default_props as Record<string, any>) || {};
  return (
    <HtmlBlock 
      htmlTemplate={block.html_content} 
      {...dynamicProps} 
    />
  );
}
```

Isso garante que o `resolvedName` seja serializado corretamente como "HtmlBlock".

### Modificação 2: EfiCodeEditor.tsx - Adicionar logging de debug

Adicionar um log no momento da deserialização para identificar problemas:

```typescript
useEffect(() => {
  if (editorState) {
    try {
      console.log('[EfiCode] Deserializando estado:', JSON.parse(editorState));
      actions.deserialize(editorState);
    } catch (error) {
      console.error('Erro ao restaurar estado:', error);
    }
  }
}, [editorState, actions]);
```

### Modificação 3: Verificar resolver aliases

Garantir que o `resolver` tenha todos os aliases necessários:

```typescript
const resolvers = {
  Container,
  Text,
  Heading,
  Button: CraftButton,
  Image,
  Divider,
  Spacer,
  HtmlBlock,
  'Bloco HTML': HtmlBlock,
  'Element': Container, // Fallback para Elements genéricos
};
```

## Fluxo de Correção

```text
Antes:
┌─────────────────────────────────────────────────────────────┐
│  1. Usuário arrasta HtmlBlock da Toolbox                    │
│  2. Craft.js cria nó com <Element is={HtmlBlock}>          │
│  3. Serializa com resolvedName incorreto/problemático       │
│  4. Salva no banco de dados                                 │
│  5. Ao recarregar, Craft.js não encontra no resolver       │
│  6. Bloco some! ❌                                          │
└─────────────────────────────────────────────────────────────┘

Depois:
┌─────────────────────────────────────────────────────────────┐
│  1. Usuário arrasta HtmlBlock da Toolbox                    │
│  2. Craft.js cria nó com <HtmlBlock> diretamente           │
│  3. Serializa com resolvedName: "HtmlBlock"                │
│  4. Salva no banco de dados                                 │
│  5. Ao recarregar, encontra "HtmlBlock" no resolver        │
│  6. Bloco aparece normalmente! ✅                           │
└─────────────────────────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/editor/Toolbox.tsx` | Remover wrapper `Element` do HtmlBlock e usar o componente diretamente |
| `src/pages/EfiCodeEditor.tsx` | Adicionar logs de debug e verificar resolver |

## Considerações Adicionais

1. **Dados existentes**: Os blocos já salvos no banco podem precisar de uma correção manual ou um script de migração para atualizar o `resolvedName` nos nós HtmlBlock existentes.

2. **Teste**: Após a correção, será necessário:
   - Criar um novo site
   - Adicionar um HtmlBlock
   - Salvar
   - Recarregar a página
   - Verificar se o bloco persiste

## Seção Técnica

### Por que o `Element` wrapper causa problemas?

O componente `Element` do Craft.js é um wrapper especial que cria nós na árvore. Quando você usa `<Element is={ComponentX}>`, o Craft.js pode:
1. Serializar usando o nome da função/componente passada em `is`
2. Se esse nome não corresponder exatamente à chave no resolver, falha silenciosamente

### Solução alternativa (caso a primeira não funcione)

Se a modificação do Toolbox não resolver, pode ser necessário:
1. Definir explicitamente o `name` no craft config:
```typescript
HtmlBlock.craft = {
  displayName: 'HtmlBlock',
  name: 'HtmlBlock', // Força o resolvedName
  props: { ... },
};
```

2. Ou usar o método `createElement` do connectors com o nome explícito.
