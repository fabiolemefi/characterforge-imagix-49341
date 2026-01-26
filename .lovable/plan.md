
# Plano: Aplicar CSS Global no Editor do Efi Code

## Problema

O CSS Global configurado em `/admin/efi-code-blocks` está sendo carregado corretamente, mas **não é aplicado visualmente** enquanto o usuário está construindo a página no editor (`/efi-code/:id`).

O usuário define classes como `.minha-classe { color: red; }` no admin, mas ao usar essas classes nos blocos HTML, elas não têm efeito visual no editor - apenas na prévia e exportação.

## Causa

O CSS Global só é injetado:
- Na exportação HTML (`generateFullHtml`)
- Na página de preview (`EfiCodePreview.tsx`)

Mas **não é injetado no DOM** do editor visual.

## Solução

Injetar o CSS Global dinamicamente no `<head>` do documento durante a edição, usando um `useEffect` no componente `EfiCodeEditor.tsx`.

## Implementação

### Arquivo: `src/pages/EfiCodeEditor.tsx`

Adicionar um `useEffect` que:
1. Cria uma tag `<style>` com id único (`efi-code-global-css`)
2. Insere o conteúdo do `globalCss` nessa tag
3. Remove a tag quando o componente é desmontado (cleanup)

```typescript
// Após a linha 66 (depois dos estados)
useEffect(() => {
  // Cria ou atualiza a tag de estilo global
  const styleId = 'efi-code-global-css';
  let styleTag = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  
  styleTag.textContent = globalCss;
  
  // Cleanup: remove a tag quando o componente é desmontado
  return () => {
    const tag = document.getElementById(styleId);
    if (tag) {
      tag.remove();
    }
  };
}, [globalCss]);
```

## Fluxo Após Implementação

```text
Usuário abre /efi-code/:id
         │
         ▼
useEfiCodeConfig() carrega CSS do banco
         │
         ▼
useEffect injeta CSS no <head>
         │
         ▼
Classes CSS ficam ativas no editor
         │
         ▼
Ao sair da página, CSS é removido
```

## Benefícios

- **WYSIWYG real**: O que o usuário vê no editor é exatamente o que será exportado
- **Feedback imediato**: Ao salvar CSS no admin e recarregar o editor, as classes funcionam
- **Sem conflitos**: A tag é removida ao sair do editor, evitando vazamento de estilos

## Nota Técnica

O CSS será aplicado globalmente na página durante a edição. Isso é intencional pois permite que os blocos HTML usem qualquer classe definida no CSS Global. O cleanup garante que esses estilos não persistam em outras partes da aplicação.
