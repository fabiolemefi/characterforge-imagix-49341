

## Plano: Adicionar Botão "Repetir" na Tela de Resultado

### Objetivo

Após gerar uma imagem no `/gerar/selo-estrategia`, adicionar um botão "Repetir" ao lado esquerdo do botão "Baixar", permitindo que o usuário volte para a tela de seleção de imagens para gerar uma nova imagem.

---

### Localização do Código

**Arquivo:** `src/pages/ImageCampaignPublic.tsx`

**Código atual (linhas 544-554):**

```tsx
) : (
  <>
    {/* Resultado final */}
    <div className="border border-white/20 rounded-lg p-2 bg-white/5">
      <img src={generatedImage} alt="Resultado" className="w-full rounded" />
    </div>
    <Button onClick={handleDownload} className="w-full">
      <Download className="h-4 w-4 mr-2" />
      Baixar
    </Button>
  </>
)}
```

---

### Solução

1. Criar função `handleRepeat` que limpa os estados e volta para a tela inicial
2. Adicionar container `grid` com 2 colunas para os botões
3. Botão "Repetir" à esquerda com ícone de refresh
4. Botão "Baixar" à direita

---

### Código Atualizado

```tsx
) : (
  <>
    {/* Resultado final */}
    <div className="border border-white/20 rounded-lg p-2 bg-white/5">
      <img src={generatedImage} alt="Resultado" className="w-full rounded" />
    </div>
    
    {/* Botões: Repetir | Baixar */}
    <div className="grid grid-cols-2 gap-3">
      <Button 
        variant="outline" 
        onClick={handleRepeat}
        className="w-full border-white/30 text-white hover:bg-white/10"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Repetir
      </Button>
      <Button onClick={handleDownload} className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Baixar
      </Button>
    </div>
  </>
)}
```

---

### Função handleRepeat

Adicionar junto às outras funções handlers (após `handleDownload`):

```tsx
const handleRepeat = () => {
  setGeneratedImage(null);
  setUploadedImage(null);
  setSelectedAsset(null);
};
```

---

### Import do Ícone

Adicionar `RotateCcw` na linha 18:

```tsx
import { Loader2, CloudUpload, Download, ArrowLeft, Sparkles, ImageIcon, RotateCcw } from "lucide-react";
```

---

### Resultado Esperado

| Estado | Layout |
|--------|--------|
| Antes de gerar | Upload + Selos + Botão "Gerar" |
| Após gerar | Imagem gerada + **[Repetir] [Baixar]** em 2 colunas |

O botão "Repetir":
- Limpa a imagem gerada
- Limpa a imagem enviada
- Limpa o selo selecionado
- Volta para a tela de upload inicial

