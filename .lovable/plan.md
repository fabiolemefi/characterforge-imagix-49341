
# Plano: Corrigir Centralização da Câmera - Alinhar com HTML Original

## Problema Identificado

Analisando o screenshot, o GIF do Fubá está no canto superior esquerdo da tela ao invés de estar centralizado. Comparando o HTML original atualizado com a versão React atual, encontrei as seguintes diferenças:

## Diferenças Críticas

| Aspecto | HTML Original | React Atual | Status |
|---------|---------------|-------------|--------|
| Posição inicial do Fubá | `x: startNode.x - 35, y: startNode.y - 35` | `x: startNode.x, y: startNode.y` | Incorreto |
| Cálculo cx/cy na animação | `gsap.getProperty(fuba, "x") + 35` | `gsap.getProperty(fuba, "x")` sem +35 | Incorreto |
| centerCamera na animação | `centerCamera(cx, cy, 0.05)` (cx já inclui +35) | `centerCamera(cx + 35, cy + 35, 0.05)` | Diferente abordagem |
| motionPath align | `align: pathD, alignOrigin: [0.5, 0.5]` | Apenas `alignOrigin: [0.5, 0.5]` | Falta align |

## Análise do Problema

O HTML original faz:
1. Posiciona o foreignObject com offset de -35 (canto superior esquerdo fica deslocado para trás)
2. Usa `align: pathD` no motionPath para alinhar o elemento ao caminho
3. Quando pega a posição com `gsap.getProperty`, adiciona +35 para obter o centro visual
4. Passa esse centro para `centerCamera`

A versão React está inconsistente - removeu o -35 inicial e o align, mas ainda tenta compensar no centerCamera.

## Solução

### 1. Restaurar posicionamento inicial com -35
```typescript
// Linha 153
gsap.set(fuba, { x: startNode.x - 35, y: startNode.y - 35 });
```

### 2. Adicionar `align: pathD` no motionPath
```typescript
// Linhas 418-423
tl.to(fuba, {
  motionPath: {
    path: pathD,
    align: pathD,  // ADICIONAR
    alignOrigin: [0.5, 0.5],
    autoRotate: false
  },
  // ...
});
```

### 3. Adicionar +35 no cálculo de cx/cy e remover do centerCamera
```typescript
// Linhas 426-442
const cx = (gsap.getProperty(fuba, "x") as number) + 35;
const cy = (gsap.getProperty(fuba, "y") as number) + 35;
// ... resto do código ...
centerCamera(cx, cy, 0.05);  // SEM o +35 extra
```

### 4. Remover +35 do backToMap (já que agora fx/fy devem refletir o posicionamento correto)
```typescript
// Linhas 569-570
const fx = gsap.getProperty(fuba, "x") as number;
const fy = gsap.getProperty(fuba, "y") as number;
// backToMap deve centralizar no centro do foreignObject
gsap.to(wrapper, {
  x: -(fx + 35) + window.innerWidth / 2,  // Adiciona 35 para centro
  y: -(fy + 35) + window.innerHeight / 2,
  // ...
});
```

### 5. Atualizar inicialização do centerCamera
```typescript
// Linha 155 - deve usar o centro visual (startNode tem coordenadas do nó)
centerCamera(startNode.x, startNode.y, 0);  // Mantém assim pois representa o centro do nó
```

## Alterações no Arquivo `src/pages/FubaExplorer.tsx`

| Linha | Alteração |
|-------|-----------|
| 153 | Adicionar `-35` ao posicionamento inicial: `gsap.set(fuba, { x: startNode.x - 35, y: startNode.y - 35 });` |
| 420 | Adicionar `align: pathD,` no motionPath |
| 426-427 | Adicionar `+ 35` ao calcular cx e cy |
| 442 | Remover o `+ 35` do centerCamera: `centerCamera(cx, cy, 0.05);` |
| 569-574 | Ajustar backToMap para usar fx + 35 e fy + 35 na fórmula |

## Resumo

A abordagem do HTML original é mais consistente:
1. O foreignObject é posicionado com offset -35 (seu canto está "atrás" do ponto do nó)
2. O `align: pathD` faz o elemento seguir o caminho corretamente
3. Quando precisamos do centro visual, adicionamos +35 à posição atual
4. Esse centro é usado para câmera, poeira, pegadas, etc.
