

# Plano: Habilitar Edição Visual no HtmlBlock do Efi Code

## Problema Atual

O componente `HtmlBlock` renderiza HTML usando `dangerouslySetInnerHTML`, o que impede qualquer edição visual. O usuário só consegue editar o código HTML através do textarea no painel de configurações, que é pouco prático para alterações rápidas de texto, formatação e reordenação de elementos.

## Solução Proposta

Transformar o `HtmlBlock` em um componente editável inline usando `contentEditable`, similar aos componentes `Heading` e `Text` que já existem no projeto. Quando o bloco estiver selecionado no editor, o usuário poderá:

1. **Editar textos** clicando diretamente neles
2. **Aplicar formatação** (negrito, itálico, etc.) via toolbar flutuante
3. **Reorganizar divs** arrastando ou usando comandos de teclado

## Abordagem Técnica

### Opção Escolhida: ContentEditable com Toolbar Flutuante

Usar `react-contenteditable` (já instalado no projeto) com uma toolbar que aparece quando o bloco está selecionado, permitindo formatação sem sair do contexto visual.

## Implementação

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

**Mudanças principais:**

1. Substituir `dangerouslySetInnerHTML` por `ContentEditable`
2. Adicionar toolbar de formatação flutuante
3. Sincronizar alterações de volta para o estado do Craft.js
4. Manter o modo de visualização para quando o editor estiver desabilitado

```
┌─────────────────────────────────────────────────────────────┐
│  HtmlBlock (selecionado)                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [B] [I] [H1] [H2] [•] [1.] ← Toolbar flutuante        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  ContentEditable (o usuário clica e edita)            │ │
│  │                                                        │ │
│  │  Uma cobrança, três formas de pagar                   │ │
│  │  O Pix Automático, disponível...                      │ │
│  │                                                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Código da Solução

```typescript
import React, { useRef, useState, useCallback } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import ContentEditable from 'react-contenteditable';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading1, Heading2, List, ListOrdered } from 'lucide-react';
// ... outros imports

export const HtmlBlock = ({ html, htmlTemplate, className = '', ...dynamicProps }) => {
  const { connectors: { connect, drag }, selected, actions: { setProp } } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { enabled } = useEditor((state) => ({ enabled: state.options.enabled }));
  const [showToolbar, setShowToolbar] = useState(false);
  
  const template = htmlTemplate || html || '';
  const contentRef = useRef(template);

  // Comandos de formatação
  const executeCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
  }, []);

  const formatBlock = useCallback((tag: string) => {
    document.execCommand('formatBlock', false, tag);
  }, []);

  // Sincronizar alterações
  const handleChange = useCallback((evt: any) => {
    contentRef.current = evt.target.value;
    setProp((props: any) => {
      props.htmlTemplate = evt.target.value;
      props.html = evt.target.value;
    });
  }, [setProp]);

  // Modo visualização (editor desabilitado)
  if (!enabled) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: template }}
      />
    );
  }

  return (
    <div
      ref={(ref) => ref && connect(drag(ref))}
      className={`relative ${className} ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {/* Toolbar flutuante */}
      {showToolbar && (
        <div className="absolute -top-12 left-0 z-50 flex gap-1 rounded-lg border bg-background p-1 shadow-lg">
          <Button variant="ghost" size="sm" onClick={() => executeCommand('bold')}>
            <Bold className="h-4 w-4" />
          </Button>
          {/* ... outros botões */}
        </div>
      )}
      
      <ContentEditable
        html={contentRef.current}
        onChange={handleChange}
        onFocus={() => setShowToolbar(true)}
        onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
        className="outline-none"
        data-no-dnd="true"
      />
    </div>
  );
};
```

## Funcionalidades da Toolbar

| Botão | Comando | Função |
|-------|---------|--------|
| **B** | bold | Negrito |
| *I* | italic | Itálico |
| H1 | formatBlock h1 | Título principal |
| H2 | formatBlock h2 | Subtítulo |
| • | insertUnorderedList | Lista com marcadores |
| 1. | insertOrderedList | Lista numerada |

## Comportamento Esperado

1. **Clique simples** no bloco: seleciona para arrastar
2. **Duplo clique** ou **foco no texto**: ativa modo de edição, mostra toolbar
3. **Blur** (clicar fora): esconde toolbar, salva alterações
4. **Arrastar**: funciona normalmente para reposicionar o bloco

## Considerações

- O atributo `data-no-dnd="true"` impede que o sistema de drag-and-drop interfira na seleção de texto
- O `setTimeout` no onBlur garante que cliques na toolbar sejam processados antes de esconder
- As alterações são salvas automaticamente no estado do Craft.js via `setProp`

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/user-components/HtmlBlock.tsx` | Substituir implementação para usar ContentEditable com toolbar |

