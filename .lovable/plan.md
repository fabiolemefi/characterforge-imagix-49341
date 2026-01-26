
# Plano: Gerenciamento de Imagens no Painel de Props do HtmlBlock

## Problema Atual

Quando um `HtmlBlock` contém tags `<img>`, as imagens aparecem quebradas no painel de configurações à direita. O usuário não tem uma forma prática de:
1. Visualizar quais imagens existem no bloco
2. Fazer upload de novas imagens para substituir as existentes
3. Ver um placeholder quando a URL da imagem é inválida

## Solução

Adicionar uma seção "Imagens do Bloco" no `HtmlBlockSettings` que:
1. Detecta automaticamente todas as tags `<img>` no HTML
2. Exibe cada imagem com preview (ou placeholder se quebrada)
3. Permite upload ou seleção da biblioteca para substituir cada imagem
4. Atualiza o HTML do bloco automaticamente com a nova URL

## Implementação

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

**Alterações no `HtmlBlockSettings`:**

1. **Extrair imagens do HTML** usando regex ou DOMParser
2. **Exibir lista de imagens** encontradas com:
   - Thumbnail com tratamento de erro (placeholder se quebrada)
   - Botão de upload
   - Botão para selecionar da biblioteca
3. **Substituir URL no HTML** quando nova imagem for selecionada/uploaded

### Fluxo Visual

```text
┌─────────────────────────────────────────────┐
│  Configurações do HtmlBlock                 │
├─────────────────────────────────────────────┤
│                                             │
│  📷 Imagens do Bloco (3 encontradas)        │
│  ┌─────────────────────────────────────────┐│
│  │ ┌──────┐  imagem-hero.jpg              ││
│  │ │ 🖼️  │  [Upload] [Biblioteca]        ││
│  │ └──────┘                               ││
│  ├─────────────────────────────────────────┤│
│  │ ┌──────┐  selo-qualidade.png           ││
│  │ │ ❌  │  [Upload] [Biblioteca]        ││
│  │ └──────┘  (imagem não encontrada)      ││
│  ├─────────────────────────────────────────┤│
│  │ ┌──────┐  banner-cta.webp              ││
│  │ │ 🖼️  │  [Upload] [Biblioteca]        ││
│  │ └──────┘                               ││
│  └─────────────────────────────────────────┘│
│                                             │
│  Código HTML                                │
│  ┌─────────────────────────────────────────┐│
│  │ <div>...</div>                         ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### Lógica de Extração de Imagens

```typescript
const extractImages = (html: string): { src: string; index: number }[] => {
  const images: { src: string; index: number }[] = [];
  const regex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  let index = 0;
  
  while ((match = regex.exec(html)) !== null) {
    images.push({ src: match[1], index });
    index++;
  }
  
  return images;
};
```

### Componente ImageItem com Placeholder

```typescript
const ImageItem = ({ 
  src, 
  index, 
  onReplace 
}: { 
  src: string; 
  index: number; 
  onReplace: (newUrl: string) => void;
}) => {
  const [hasError, setHasError] = useState(false);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
      <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
        {hasError ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={src}
            alt={`Imagem ${index + 1}`}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">
          {src.split('/').pop() || `Imagem ${index + 1}`}
        </p>
        {hasError && (
          <p className="text-xs text-destructive">Imagem não encontrada</p>
        )}
        <div className="flex gap-1 mt-1">
          {/* Botões de Upload e Biblioteca */}
        </div>
      </div>
    </div>
  );
};
```

### Função de Substituição no HTML

```typescript
const replaceImageSrc = (html: string, oldSrc: string, newSrc: string): string => {
  // Escapa caracteres especiais para regex
  const escapedOldSrc = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(src=["'])${escapedOldSrc}(["'])`, 'g');
  return html.replace(regex, `$1${newSrc}$2`);
};
```

## Estrutura Final do HtmlBlockSettings

```typescript
export const HtmlBlockSettings = () => {
  // ... hooks existentes
  
  // Extrair imagens do template
  const images = React.useMemo(() => extractImages(template), [template]);
  
  // Handler para substituir imagem
  const handleReplaceImage = (oldSrc: string, newSrc: string) => {
    const newTemplate = replaceImageSrc(template, oldSrc, newSrc);
    setProp((props: any) => {
      props.htmlTemplate = newTemplate;
      props.html = newTemplate;
    });
  };

  return (
    <div className="space-y-4">
      {/* Seção de Imagens */}
      {images.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Imagens do Bloco ({images.length})
          </Label>
          <div className="space-y-2">
            {images.map((img, idx) => (
              <ImageItem
                key={`${img.src}-${idx}`}
                src={img.src}
                index={idx}
                onReplace={(newUrl) => handleReplaceImage(img.src, newUrl)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* ... resto do componente existente */}
    </div>
  );
};
```

## Benefícios

| Antes | Depois |
|-------|--------|
| Imagens quebradas sem indicação visual | Placeholder claro quando URL inválida |
| Sem forma de editar imagens inline | Upload e biblioteca disponíveis |
| Precisa editar HTML manualmente | Substituição automática da URL |
| Não sabe quais imagens existem | Lista visual de todas as imagens |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/eficode/user-components/HtmlBlock.tsx` | Adicionar seção de gerenciamento de imagens no `HtmlBlockSettings` |

## Dependências Utilizadas

- `ImagePickerModal` - Já existe para seleção da biblioteca
- `supabase` - Já configurado para upload no bucket `efi-code-assets`
- `lucide-react` - Ícones já utilizados no projeto
