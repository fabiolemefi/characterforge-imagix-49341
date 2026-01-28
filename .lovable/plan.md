
# Plano: Corrigir Centralização e Posição do Balão

## Problema Identificado

Analisando o screenshot e o código, o problema está na inconsistência entre:

1. **Ponto de início do path**: O caminho é gerado de `gsap.getProperty(fuba, "x/y")` que retorna o canto superior esquerdo do foreignObject (ex: `startNode.x - 35`)
2. **Ponto de destino**: O caminho termina em `target.x, target.y` que é o centro do nó
3. **alignOrigin**: O `[0.5, 0.5]` faz o centro visual do foreignObject seguir o caminho

Como resultado:
- O path vai de `(x - 35, y - 35)` para `(target.x, target.y)`
- Com alignOrigin, o centro do GIF (que deveria estar em x, y) acaba em `target.x, target.y`
- Mas a câmera adiciona +35 ao rastrear, causando offset

## Solução

O caminho deve ser gerado entre centros visuais, não entre coordenadas do foreignObject:

| Variável | Antes | Depois |
|----------|-------|--------|
| startX | `gsap.getProperty(fuba, "x")` | `gsap.getProperty(fuba, "x") + 35` |
| startY | `gsap.getProperty(fuba, "y")` | `gsap.getProperty(fuba, "y") + 35` |
| centerCamera | `centerCamera(cx, cy)` onde cx = x + 35 | `centerCamera(cx, cy)` onde cx já é centro |
| bark | `bark(target.x, target.y)` | Manter igual - target já é centro |

### Alteração Principal (linhas 380-381)

```typescript
// ANTES:
const startX = gsap.getProperty(fuba, "x") as number;
const startY = gsap.getProperty(fuba, "y") as number;

// DEPOIS:
const startX = (gsap.getProperty(fuba, "x") as number) + 35;
const startY = (gsap.getProperty(fuba, "y") as number) + 35;
```

Isso faz o caminho ir do centro visual atual do Fubá até o centro do nó destino. Com `alignOrigin: [0.5, 0.5]`, o GSAP vai fazer o centro do foreignObject seguir esse caminho corretamente.

### Verificação da Distância (linha 383)

A verificação de distância também precisa usar o centro:

```typescript
// ANTES (usando coordenadas do foreignObject vs centro do target):
const dist = Math.hypot(startX - target.x, startY - target.y);

// DEPOIS (ambos são centros agora):
const dist = Math.hypot(startX - target.x, startY - target.y);
// Continua igual porque startX/Y agora são centros
```

## Alterações no Arquivo `src/pages/FubaExplorer.tsx`

| Linha | Alteração |
|-------|-----------|
| 380-381 | Adicionar +35 ao startX e startY para usar centro visual |

### Código Final

```typescript
// Linha 380-381
const startX = (gsap.getProperty(fuba, "x") as number) + 35;
const startY = (gsap.getProperty(fuba, "y") as number) + 35;
```

## Resumo

O problema era que o caminho SVG começava no canto do foreignObject mas terminava no centro do nó destino. Com `alignOrigin: [0.5, 0.5]`, o GSAP tenta fazer o centro do elemento seguir esse caminho desalinhado, resultando em:

- GIF terminando ~35px acima e à esquerda do destino
- Câmera tentando compensar com +35 mas causando mais desalinhamento
- Balão aparecendo no centro correto (target.x, target.y) mas GIF em outro lugar

Usando coordenadas de centro consistentes (startX + 35, startY + 35), o caminho vai corretamente de centro a centro, e o alignOrigin funciona como esperado.
