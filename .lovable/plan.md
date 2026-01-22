

## Plano: Corrigir displayName do HtmlBlock

### Problema Identificado

O Craft.js usa o `displayName` do componente para identificar nós durante serialização/deserialização. Há uma **inconsistência**:

| Componente | displayName | Chave no Resolver |
|------------|-------------|-------------------|
| Container | `'Container'` | `Container` ✅ |
| Text | `'Text'` | `Text` ✅ |
| **HtmlBlock** | `'Bloco HTML'` | `HtmlBlock` ❌ |

Quando você arrasta ou move um HtmlBlock:
1. O Craft.js serializa o nó com o tipo `'Bloco HTML'`
2. Ao deserializar/mover, procura `resolvers['Bloco HTML']`
3. Não encontra, pois a chave é `HtmlBlock`
4. Lança o erro: "The component type specified for this node (HtmlBlock) does not exist in the resolver"

---

### Solução

Alterar o `displayName` no arquivo `HtmlBlock.tsx` para coincidir com a chave do resolver:

```typescript
HtmlBlock.craft = {
  displayName: 'HtmlBlock',  // Era: 'Bloco HTML'
  props: { ... },
  related: { ... },
};
```

---

### Arquivo a Modificar

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/components/eficode/user-components/HtmlBlock.tsx` | 112 | Mudar `displayName: 'Bloco HTML'` para `displayName: 'HtmlBlock'` |

---

### Código Atual vs Corrigido

```typescript
// ANTES (linha 111-121)
HtmlBlock.craft = {
  displayName: 'Bloco HTML',  // ❌ Não corresponde à chave do resolver
  props: {
    html: '',
    htmlTemplate: '<div class="p-4 bg-gray-100 rounded"><p>Bloco HTML personalizado</p></div>',
    className: '',
  },
  related: {
    settings: HtmlBlockSettings,
  },
};

// DEPOIS
HtmlBlock.craft = {
  displayName: 'HtmlBlock',  // ✅ Corresponde à chave do resolver
  props: {
    html: '',
    htmlTemplate: '<div class="p-4 bg-gray-100 rounded"><p>Bloco HTML personalizado</p></div>',
    className: '',
  },
  related: {
    settings: HtmlBlockSettings,
  },
};
```

---

### Resultado Esperado

1. Arrastar blocos HTML do Toolbox para o canvas funciona
2. Mover blocos HTML dentro do canvas funciona
3. Salvar e recarregar sites com blocos HTML funciona
4. Não há mais erro "does not exist in the resolver"

---

### Nota sobre Sites Existentes

Se houver sites já salvos com o `displayName` antigo (`'Bloco HTML'`), eles podem apresentar o mesmo erro ao serem carregados. Nesse caso, seria necessário:

1. **Opção A**: Adicionar ambos os nomes ao resolver (compatibilidade temporária)
2. **Opção B**: Migrar manualmente os dados salvos

Para a Opção A, o resolver ficaria:

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
  'Bloco HTML': HtmlBlock,  // Alias para compatibilidade
};
```

Recomendo implementar a Opção A junto com a correção do displayName para garantir retrocompatibilidade.

