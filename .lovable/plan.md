
# Plano: Corrigir Navegação do Fubá Explorer - Remover align: pathD

## Problema Identificado

O erro no runtime mostra claramente a causa:
```
Failed to execute 'querySelectorAll' on 'Document': 'M165,2165 C377.91...' is not a valid selector.
```

O GSAP MotionPathPlugin está tentando usar a string do path SVG (`pathD`) como um **seletor CSS**, mas `pathD` contém uma string como `"M165,2165 C377..."` que não é um seletor válido.

### Causa Raiz
Na última correção, adicionamos `align: pathD` na linha 421:
```typescript
motionPath: {
  path: pathD,
  align: pathD,  // ← ERRO: pathD é uma string, não um elemento!
  alignOrigin: [0.5, 0.5],
  autoRotate: false
}
```

### O que o HTML Original Faz
Verificando o HTML original fornecido pelo usuário:
```javascript
tl.to(fuba, {
    motionPath: { path: pathD, alignOrigin: [0.5, 0.5], autoRotate: false },
    // NÃO TEM align: pathD!
});
```

O HTML original **NÃO usa `align`** - ele usa apenas `path`, `alignOrigin` e `autoRotate`.

## Solução

### 1. Remover `align: pathD` do motionPath
O `align` deve ser **removido completamente** porque:
- O HTML original não o usa
- Quando passamos uma string de path, o GSAP tenta tratá-la como seletor CSS
- Isso causa o erro que quebra toda a navegação

### 2. Ajustar posicionamento inicial (se necessário)
O posicionamento inicial com `-35` pode precisar de ajuste dependendo do comportamento após remover o align. Vamos manter por enquanto e testar.

## Alterações no Arquivo `src/pages/FubaExplorer.tsx`

| Linha | Antes | Depois |
|-------|-------|--------|
| 419-424 | `motionPath: { path: pathD, align: pathD, alignOrigin: [0.5, 0.5], autoRotate: false }` | `motionPath: { path: pathD, alignOrigin: [0.5, 0.5], autoRotate: false }` |

### Código Corrigido
```typescript
// Linha 418-424
tl.to(fuba, {
  motionPath: {
    path: pathD,
    // REMOVER: align: pathD, 
    alignOrigin: [0.5, 0.5],
    autoRotate: false
  },
  duration: 2.2, 
  ease: "power2.inOut",
  onUpdate: function () {
    // ... resto do código
  }
}, "fubaRun");
```

## Resumo

O bug acontece porque `align` espera um elemento DOM ou seletor CSS, não uma string de path SVG. Removendo essa propriedade, o motionPath funcionará corretamente usando apenas a propriedade `path` para definir o caminho, e `alignOrigin: [0.5, 0.5]` para centralizar o elemento no caminho.

Isso deve restaurar:
1. A movimentação do GIF até o ponto B
2. O painel e mapa interno abrindo após a chegada (timeout de 1500ms após onComplete)
3. O funcionamento do botão "Traçar Rota"
