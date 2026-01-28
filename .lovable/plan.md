

# Plano: Corrigir Centralização da Câmera no Fubá Explorer

## Problema Identificado

A câmera está centralizando no lugar errado porque o cálculo de posição está usando o elemento `foreignObject` do GIF, que tem comportamento diferente do elemento `<text>` original. Quando o GSAP pega a posição via `gsap.getProperty(fuba, "x")`, ele retorna a posição do canto superior esquerdo do `foreignObject`, não o centro.

## Diferenças entre HTML Original e React

### 1. Posição do Fubá no backToMap
| HTML Original | React Atual |
|---------------|-------------|
| `const fx = gsap.getProperty(fuba, "x")` (retorna centro) | `const fx = gsap.getProperty(fuba, "x")` (retorna canto superior esquerdo) |

O problema é que o `foreignObject` (70x70 pixels) não tem seu centro no ponto de posicionamento como o `<text>` tinha.

### 2. Centralização na Navegação
O `centerCamera` está correto, mas a posição passada durante a animação (`cx`, `cy`) reflete o canto do foreignObject, não o centro do personagem.

### 3. enterSubLevel - Posição do Target
O `enterSubLevel` usa coordenadas corretas (`targetNode.x`, `targetNode.y`), mas o problema é que joga a tela para cima porque o `targetNode` é `nodesTree[0]` que tem `y: cy + (gap * 3)` - um valor muito alto.

## Solução Proposta

### Correção 1: Adicionar offset de centralização (+35) ao calcular posição do Fubá para a câmera

Quando pegamos a posição do Fubá para centralizar a câmera, precisamos adicionar metade do tamanho do foreignObject (35px) para apontar ao centro.

```typescript
// Em centerCamera durante onUpdate:
const cx = gsap.getProperty(fuba, "x") as number;
const cy = gsap.getProperty(fuba, "y") as number;
// ... usar cx + 35 e cy + 35 apenas para centerCamera
centerCamera(cx + 35, cy + 35, 0.05);
```

### Correção 2: backToMap deve usar offset correto

```typescript
const fx = (gsap.getProperty(fuba, "x") as number) + 35;
const fy = (gsap.getProperty(fuba, "y") as number) + 35;
gsap.to(wrapper, {
  x: -fx * 1 + window.innerWidth / 2,
  y: -fy * 1 + window.innerHeight / 2,
  // ...
});
```

### Correção 3: enterSubLevel - Centralizar melhor

O problema aqui é que `targetNode` é o nó mais baixo da árvore (`nodesTree[0]` com `y: cy + gap*3`), mas a câmera deveria centralizar no nó pai (`parentNode`) ou em um ponto médio.

```typescript
// Ao invés de usar targetNode (que está muito abaixo)
// Usar o centro da árvore vertical
const targetNode = nodesTree[3]; // O nó "sr" que é o ponto central/split
// OU calcular o centro médio da árvore
```

## Alterações no Arquivo

### `src/pages/FubaExplorer.tsx`

| Local | Alteração |
|-------|-----------|
| Linha ~442 | `centerCamera(cx + 35, cy + 35, 0.05)` - adicionar offset para centralização |
| Linha ~569-570 | Adicionar +35 ao `fx` e `fy` no backToMap |
| Linha ~528 | Mudar de `nodesTree[0]` para `nodesTree[3]` (ou ponto médio) no enterSubLevel |

## Resumo

O foreignObject de 70x70 tem sua âncora no canto superior esquerdo. Para centralizar corretamente na câmera, precisamos adicionar +35 (metade de 70) às coordenadas quando calculamos a posição para `centerCamera`. Isso NÃO afeta o motionPath (que funciona corretamente), apenas a centralização visual.

