
# Plano: Corrigir Bugs do Fubá Explorer - Animação e Caminho

## Problemas Identificados

Comparando o HTML original funcionando com a implementação React atual, encontrei as seguintes diferenças críticas:

### 1. Tipo de Elemento do Fubá (Problema Principal)
| HTML Original | React Atual |
|---------------|-------------|
| `<text id="fuba">🐕</text>` | `<foreignObject>` com `<img>` (GIF) |

O HTML usa um elemento `<text>` SVG simples, enquanto o React usa `<foreignObject>` com uma imagem GIF. O `motionPath` do GSAP se comporta de forma diferente com esses dois tipos de elementos.

### 2. Propriedades do motionPath Incorretas
| HTML Original | React Atual |
|---------------|-------------|
| `path: pathD` | `path: pathD, align: pathD, alignOrigin: [0.5, 0.5]` |

No HTML original, o `motionPath` usa apenas a propriedade `path`. Na versão React, foi adicionado `align: pathD` e `alignOrigin`, o que causa comportamento incorreto.

### 3. Posicionamento Inicial do Fubá
| HTML Original | React Atual |
|---------------|-------------|
| `gsap.set(fuba, { x: startNode.x, y: startNode.y })` | `gsap.set(fuba, { x: startNode.x - 35, y: startNode.y - 35 })` |

O offset de -35 foi adicionado na versão React para compensar o tamanho do foreignObject, mas isso interfere com o cálculo do motionPath.

### 4. Cálculo de Posição Durante Animação
| HTML Original | React Atual |
|---------------|-------------|
| `const cx = gsap.getProperty(fuba, "x")` | `const cx = (gsap.getProperty(fuba, "x") as number) + 35` |

O +35 adicional no React tenta compensar o offset inicial, mas causa imprecisão no tracking.

### 5. Orientação/Flip do Personagem (scaleX)
| HTML Original | React Atual |
|---------------|-------------|
| Movimento para direita: `scaleX: -1` | Movimento para direita: `scaleX: 1` |
| Movimento para esquerda: `scaleX: 1` | Movimento para esquerda: `scaleX: -1` |

A lógica de flip está invertida! No HTML original, quando o personagem vai para a direita, ele recebe `scaleX: -1`.

## Solução Proposta

### Mudanças no `src/pages/FubaExplorer.tsx`:

#### 1. Reverter para elemento `<text>` ou corrigir o foreignObject
Opção A: Usar `<text>` como no original (mais compatível com GSAP):
```tsx
<text ref={fubaRef} id="fuba" x="0" y="0">🐕</text>
```

Opção B: Manter o GIF mas corrigir o posicionamento:
- Remover offsets (-35) do posicionamento inicial
- Usar transform-origin correto

#### 2. Corrigir a configuração do motionPath
```tsx
tl.to(fuba, {
  motionPath: {
    path: pathD,
    // REMOVER: align: pathD,
    alignOrigin: [0.5, 0.5],
    autoRotate: false
  },
  // ...
});
```

#### 3. Corrigir a lógica de flip (scaleX)
```tsx
// ATUAL (incorreto):
if (cx > lastFubaXRef.current + 0.5) gsap.set(fuba, { scaleX: 1 });
else if (cx < lastFubaXRef.current - 0.5) gsap.set(fuba, { scaleX: -1 });

// CORRETO (como no HTML):
if (cx > lastFubaXRef.current + 0.5) gsap.set(fuba, { scaleX: -1 });
else if (cx < lastFubaXRef.current - 0.5) gsap.set(fuba, { scaleX: 1 });
```

#### 4. Remover offsets do posicionamento inicial e cálculos
```tsx
// ATUAL:
gsap.set(fuba, { x: startNode.x - 35, y: startNode.y - 35 });
// CORRETO:
gsap.set(fuba, { x: startNode.x, y: startNode.y });

// ATUAL:
const cx = (gsap.getProperty(fuba, "x") as number) + 35;
// CORRETO:
const cx = gsap.getProperty(fuba, "x") as number;
```

#### 5. Adicionar estilos faltantes para o elemento text (se usar text)
```css
#fuba { 
  font-size: 70px; 
  pointer-events: none; 
  z-index: 999; 
  filter: drop-shadow(0 10px 10px rgba(0,0,0,0.5));
  transform-origin: center center; 
  text-anchor: middle; 
  dominant-baseline: middle;
}
```

## Resumo das Alterações

| Linha | Alteração | Motivo |
|-------|-----------|--------|
| ~153 | Remover offset `-35` do posicionamento inicial | Compatibilidade com motionPath |
| ~419-424 | Remover `align: pathD` do motionPath | Configuração incorreta |
| ~430-431 | Inverter lógica de scaleX | Estava ao contrário |
| ~427-428 | Remover `+35` do cálculo de posição | Não necessário após correção |
| ~570-579 | Corrigir backToMap para usar posição correta | Consistência |
| ~704-711 | Atualizar estilos do #fuba | Suporte a text ou foreignObject corrigido |

## Decisão de Design: GIF vs Emoji

**Recomendação**: Manter o GIF mas corrigir o posicionamento usando `transform-origin: center` no CSS e removendo os offsets manuais. Isso preserva a intenção de ter uma animação visual rica enquanto corrige o comportamento do caminho.

Se o GIF continuar problemático, podemos fazer fallback para emoji `🐕` como no HTML original.

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/FubaExplorer.tsx` | Corrigir bugs listados acima |

