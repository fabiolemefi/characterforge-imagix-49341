
# Plano: Ajustes de Zoom, Flip, Camada e Balão no Fubá Explorer

## 1. Zoom Padrão Mais Perto

**Problema**: O zoom inicial (`currentScaleRef.current = 1`) está muito afastado.

**Solução**: Aumentar o zoom padrão para 1.3.

| Local | Antes | Depois |
|-------|-------|--------|
| Linha 80 | `currentScaleRef.current = 1` | `currentScaleRef.current = 1.3` |
| Linha 155 | `centerCamera(startNode.x, startNode.y, 0)` | Precisa aplicar o scale inicial também |
| Linha 580 | `currentScaleRef.current = 1` (backToMap) | `currentScaleRef.current = 1.3` |

Também precisamos aplicar o scale inicial no wrapper após carregar.

---

## 2. Flip Invertido ao Mover para Esquerda

**Problema**: Na linha 430-431, a lógica está trocada:
```typescript
// Atual (errado):
if (cx > lastFubaXRef.current + 0.5) gsap.set(fuba, { scaleX: -1 }); // direita = flip
else if (cx < lastFubaXRef.current - 0.5) gsap.set(fuba, { scaleX: 1 }); // esquerda = normal
```

**Solução**: Inverter a lógica - movimento para direita deve manter normal, movimento para esquerda deve flipar:
```typescript
// Correto:
if (cx > lastFubaXRef.current + 0.5) gsap.set(fuba, { scaleX: 1 }); // direita = normal
else if (cx < lastFubaXRef.current - 0.5) gsap.set(fuba, { scaleX: -1 }); // esquerda = flip
```

---

## 3. GIF em Cima da Linha e Ponto Azul

**Problema**: O `foreignObject` do Fubá está dentro do `main-map-group` antes do `nodes-layer`, fazendo com que os pontos azuis fiquem por cima dele.

**Estrutura atual (linha 804-811)**:
```jsx
<g id="main-map-group">
  <g id="paths-layer" />
  <path className="path-preview" />
  <path className="path-active" />
  <g id="obstacles-layer" />
  <g id="paws-layer" />
  <g id="deco-layer" />
  <g id="nodes-layer" />     ← pontos azuis
  <foreignObject id="fuba" />  ← Fubá fica DEPOIS (correto)
</g>
```

O Fubá já está depois do nodes-layer, então deveria estar por cima. O problema pode ser o z-index no CSS ou o posicionamento visual. Vamos verificar:
- O CSS tem `#fuba { z-index: 999 }` mas z-index não funciona em SVG
- Em SVG, a ordem de renderização é determinada pela ordem dos elementos no DOM

O foreignObject já está no final, então está correto. O problema visual pode ser outro fator. Vamos adicionar um estilo explícito para garantir que o foreignObject fique visualmente em cima.

---

## 4. Balão "AuAU" no Lugar Errado

**Problema**: O balão aparece em posição incorreta. Analisando o código da linha 290-316:

```typescript
const bark = (x: number, y: number) => {
  bubble.style.left = (x + 50) + 'px';  // x do destino + 50
  bubble.style.top = (y - 80) + 'px';   // y do destino - 80
  // ...
};

// Chamada (linha 398):
const targetScreenPos = getScreenPosition(target.x, target.y);
bark(targetScreenPos.x, targetScreenPos.y);
```

O problema é que `getScreenPosition` usa:
```typescript
return {
  x: svgX * currentScaleRef.current + wrapperX,
  y: svgY * currentScaleRef.current + wrapperY
};
```

Isso parece correto. Mas a câmera pode ter se movido entre o cálculo e a exibição.

**Solução**: Recalcular a posição do balão no momento da exibição, usando as coordenadas SVG do destino (target.x, target.y) e a posição atual do wrapper.

---

## Alterações no Arquivo `src/pages/FubaExplorer.tsx`

| Linha | Alteração |
|-------|-----------|
| 80 | Mudar zoom inicial: `currentScaleRef.current = 1.3` |
| 153-156 | Aplicar scale inicial no wrapper: `gsap.set(wrapper, { scale: 1.3 })` |
| 430-431 | Inverter lógica de flip: direita = scaleX: 1, esquerda = scaleX: -1 |
| 396-398 | Passar target.x e target.y diretamente para bark e calcular posição na hora |
| 290-302 | Modificar bark() para receber coordenadas SVG e calcular posição de tela internamente |
| 580 | Mudar scale de retorno: `currentScaleRef.current = 1.3` |

---

## Código das Alterações

### 1. Zoom Padrão (linha 80)
```typescript
const currentScaleRef = useRef(1.3);
```

### 2. Aplicar Scale Inicial (após linha 155)
```typescript
const wrapper = wrapperRef.current;
gsap.set(wrapper, { scale: 1.3 });
centerCamera(startNode.x, startNode.y, 0);
```

### 3. Flip Corrigido (linhas 430-431)
```typescript
if (cx > lastFubaXRef.current + 0.5) gsap.set(fuba, { scaleX: 1 });
else if (cx < lastFubaXRef.current - 0.5) gsap.set(fuba, { scaleX: -1 });
```

### 4. Balão no Destino Final (linha 290-326 e 396-398)

Modificar a função `bark` para receber coordenadas SVG e calcular a posição correta:

```typescript
const bark = (targetX: number, targetY: number) => {
  const barkSound = barkSoundRef.current;
  if (barkSound) {
    barkSound.currentTime = 0;
    barkSound.play().catch(() => console.log('Áudio bloqueado pelo navegador'));
  }

  // Calcular posição de tela no momento da exibição
  const screenPos = getScreenPosition(targetX, targetY);

  const bubble = document.createElement('div');
  bubble.className = 'bark-bubble';
  bubble.textContent = 'AU AU! 🐕';
  bubble.style.left = (screenPos.x + 50) + 'px';
  bubble.style.top = (screenPos.y - 80) + 'px';
  document.body.appendChild(bubble);
  // ... resto igual
};

// Na chamada (linha 397-398):
createConfetti(targetScreenPos.x, targetScreenPos.y);
bark(target.x, target.y);  // Passar coordenadas SVG, não de tela
```

### 5. BackToMap Scale (linha 580)
```typescript
currentScaleRef.current = 1.3;
```

---

## Resumo

| Problema | Causa | Solução |
|----------|-------|---------|
| Zoom afastado | currentScaleRef inicial = 1 | Mudar para 1.3 |
| Flip errado | Lógica invertida nas linhas 430-431 | Trocar scaleX: -1 e scaleX: 1 |
| GIF abaixo do ponto | Já está na ordem correta, mas pode precisar de ajuste visual | Verificar se está funcionando após outras correções |
| Balão em lugar errado | Posição calculada antes da câmera parar | Recalcular posição usando coordenadas SVG do destino |
