

# Plano: Clique Direto em Imagens Dentro de Links

## Problema Identificado

Quando uma imagem está dentro de um link (`<a><img src="..."></a>`), ao clicar na imagem:
1. O código detecta primeiro o link pai via `e.target.closest('a')`
2. Abre o modal de edição de link em vez do modal de troca de imagem
3. O usuário precisa clicar no botão "Trocar Ícone" para acessar a troca de imagem
4. O `occurrenceIndex` usado é do link, não da imagem, causando possíveis erros na substituição

## Solução Proposta

Inverter a ordem de verificação no script do iframe: verificar primeiro se o clique foi diretamente em uma imagem, antes de verificar se está dentro de um link.

### Lógica Atualizada

```text
1. Se e.target é uma <img>:
   → Abrir modal de imagem (independente de estar em link)
   → Calcular occurrenceIndex baseado em todas as imagens do bloco

2. Se e.target NÃO é uma <img> mas está dentro de <a> ou <button>:
   → Abrir modal de link/botão (comportamento atual)
```

Isso permite que:
- Clique direto na imagem = editar imagem
- Clique no texto/área do link = editar link

---

## Mudanças Técnicas

### UnifiedIframe.tsx - Reordenar Verificações

Mover a verificação de imagem ANTES da verificação de link:

```javascript
// PRIMEIRO: Verificar se clicou diretamente em uma imagem
const img = e.target.tagName === 'IMG' ? e.target : null;

if (img && block) {
  e.stopPropagation();
  e.preventDefault();
  
  const blockId = block.dataset.blockId;
  const imgSrc = img.getAttribute('src');
  
  // Verificar se está em um <picture>
  const picture = img.closest('picture');
  
  // Calcular índice de ocorrência para ESTA imagem específica
  const allImgs = Array.from(block.querySelectorAll('img'));
  const sameSourceImgs = allImgs.filter(i => i.getAttribute('src') === imgSrc);
  const occurrenceIndex = sameSourceImgs.indexOf(img);
  
  // Enviar mensagem de clique em imagem
  window.parent.postMessage({
    type: 'eficode-image-click',
    blockId: blockId,
    imageSrc: imgSrc,
    isPicture: !!picture,
    sources: picture ? [...] : undefined,
    occurrenceIndex: occurrenceIndex
  }, '*');
  
  return; // Não continuar para verificação de links
}

// DEPOIS: Verificar links/botões (só se não clicou em imagem)
const link = e.target.closest('a');
const button = e.target.closest('button');
// ... resto do código de links
```

---

## Comportamento Resultante

| Cenário | Comportamento Atual | Comportamento Novo |
|---------|---------------------|-------------------|
| Clique em imagem simples | Modal de imagem | Modal de imagem |
| Clique em imagem dentro de link | Modal de link | Modal de imagem |
| Clique no texto de um link | Modal de link | Modal de link |
| Clique no texto de um botão | Modal de botão | Modal de botão |
| Clique em link sem imagem | Modal de link | Modal de link |

---

## Arquivo a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/eficode/editor/UnifiedIframe.tsx` | Reordenar verificação: imagem primeiro, depois link |

---

## Notas Adicionais

- O botão "Trocar Ícone" no modal de link ainda será útil para casos onde o usuário clica no texto do link e quer trocar um ícone SVG (que não é `<img>`)
- Para links que são apenas imagens (sem texto), o clique na imagem abrirá diretamente o modal de imagem
- Para editar o href/target de um link de imagem, o usuário pode clicar na borda do link ou usar o Settings Panel

