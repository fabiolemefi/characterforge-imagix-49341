

## Plano: Ativar Default Props do Banco de Dados no Toolbox

### Problema Identificado

O `Toolbox.tsx` está usando componentes com props hardcoded em vez de aplicar as `default_props` configuradas no banco de dados. As props que você configura no admin simplesmente não estão sendo usadas.

### Código Atual (Problema)

```typescript
// Componentes criados sem as props do banco
const COMPONENT_MAP: Record<string, React.ReactElement> = {
  Container: <Element is={Container} canvas />,  // ❌ Sem props do banco
  Heading: <Heading />,                           // ❌ Sem props do banco
  // ...
};

const getComponent = (componentType: string) => {
  return COMPONENT_MAP[componentType];  // ❌ Ignora block.default_props
};
```

---

### Solução

Modificar a função `getComponent` para criar componentes dinamicamente com as props do banco:

```typescript
const getComponent = (componentType: string, defaultProps: Record<string, any> = {}) => {
  switch (componentType) {
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
    default:
      return <Element is={Container} canvas {...defaultProps} />;
  }
};
```

E no render, passar as props:

```typescript
{blocks.map((block) => (
  <div
    key={block.id}
    ref={(ref) => ref && connectors.create(
      ref, 
      getComponent(block.component_type, block.default_props || {})  // ✅ Passa as props!
    )}
  >
    <ToolboxItem
      icon={getIcon(block.icon_name)}
      label={block.name}
    />
  </div>
))}
```

---

### Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/editor/Toolbox.tsx` | Modificar `getComponent` para aceitar e aplicar `defaultProps` |

---

### Resultado Esperado

Após a alteração, quando você configurar:

```json
{
  "gap": 16,
  "padding": 24,
  "minHeight": 200,
  "background": "#5e5555",
  "borderRadius": 12
}
```

O container arrastado para o canvas terá essas configurações **desde o início**, em vez dos valores padrão hardcoded (padding: 16, background: transparent, etc.).

---

### Teste de Validação

1. Salvar o bloco Container com as props customizadas no admin
2. Ir para `/efi-code/[hash]`
3. Arrastar o Container para o canvas
4. Verificar no painel de propriedades que os valores correspondem ao JSON configurado

