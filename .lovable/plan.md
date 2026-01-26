

# Plano: Área do Editor Transparente - Apenas Blocos HTML

## Problema Atual

A área do editor possui duas camadas de fundo branco:
1. Um container externo com classes `bg-white shadow-lg rounded-lg`
2. O Frame interno do Craft.js com `background="#ffffff"` e conteúdo de boas-vindas

Isso cria uma área branca fixa que não reflete a configuração real da página.

## Solução

Remover os estilos de fundo e conteúdo padrão, deixando a área do editor como uma zona de drop transparente que mostra apenas os blocos arrastados. O fundo será controlado pelas `pageSettings` já configuradas.

## Alterações

### Arquivo: `src/pages/EfiCodeEditor.tsx`

**1. Remover estilos do container externo (linhas 222-233)**

```typescript
// ANTES
<div
  className="mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all duration-300"
  style={{ 
    minHeight: '600px',
    maxWidth: viewportSize === 'desktop' 
      ? `${pageSettings.containerMaxWidth}px` 
      : viewportWidths[viewportSize],
    width: viewportWidths[viewportSize],
  }}
>

// DEPOIS
<div
  className="mx-auto overflow-hidden transition-all duration-300"
  style={{ 
    minHeight: '600px',
    maxWidth: viewportSize === 'desktop' 
      ? `${pageSettings.containerMaxWidth}px` 
      : viewportWidths[viewportSize],
    width: viewportWidths[viewportSize],
  }}
>
```

**2. Modificar EditorFrame para container transparente e vazio (linhas 293-311)**

```typescript
// ANTES
return (
  <Frame>
    <Element
      is={Container}
      canvas
      background="#ffffff"
      padding={24}
      minHeight={600}
    >
      <Heading text="Bem-vindo ao Efi Code" level="h1" textAlign="center" />
      <Spacer height={16} />
      <Text 
        text="Arraste componentes da barra lateral para começar a construir sua página." 
        textAlign="center"
        color="#64748b"
      />
    </Element>
  </Frame>
);

// DEPOIS
return (
  <Frame>
    <Element
      is={Container}
      canvas
      background="transparent"
      padding={0}
      minHeight={400}
    />
  </Frame>
);
```

## Resultado Visual

```text
ANTES:
┌────────────────────────────────────────────┐
│          ÁREA CINZA (page bg)              │
│  ┌──────────────────────────────────────┐  │
│  │     CAIXA BRANCA com shadow          │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │   "Bem-vindo ao Efi Code"      │  │  │
│  │  │   "Arraste componentes..."     │  │  │
│  │  │                                │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘

DEPOIS:
┌────────────────────────────────────────────┐
│          ÁREA (page backgroundColor)        │
│                                            │
│    ┌──────────────────────────────────┐    │
│    │  (zona de drop transparente)     │    │
│    │                                  │    │
│    │   [blocos HTML arrastados]       │    │
│    │                                  │    │
│    └──────────────────────────────────┘    │
│                                            │
└────────────────────────────────────────────┘
```

## Considerações

- O fundo da página é controlado por `pageSettings.backgroundColor` no elemento `<main>`
- Os blocos HTML arrastados terão seus próprios fundos definidos no HTML
- A área de drop fica visualmente integrada com o design da página
- Mantém-se a responsividade com `maxWidth` e `viewportWidths`

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/EfiCodeEditor.tsx` | Remover `bg-white shadow-lg rounded-lg` do container |
| | Mudar background do Container para `transparent` |
| | Remover conteúdo padrão de boas-vindas |
| | Ajustar padding para 0 |

