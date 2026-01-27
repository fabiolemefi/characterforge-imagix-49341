
# Plano: Botão "Enviar para Content Builder" no Painel de Imagens do HtmlBlock

## Objetivo

Adicionar um botão "Enviar para Content Builder" no painel de propriedades do HtmlBlock (seção de imagens). Ao clicar:
1. A imagem atual é enviada para o Marketing Cloud Content Builder
2. O sistema recebe a URL hospedada no SFMC
3. O src da imagem no HTML é automaticamente atualizado com a nova URL

## Análise Técnica

### Fluxo Atual
O componente `ImageItem` dentro de `HtmlBlockSettings` já possui botões para:
- Upload local (envia para Supabase bucket `efi-code-assets`)
- Biblioteca (seleciona imagem da biblioteca interna)

### Fluxo do SFMC (referência: EmailBuilder.tsx)
O Email Builder já implementa o envio de imagens para o Content Builder usando:
```typescript
// 1. Buscar imagem e converter para base64
const blob = await fetch(imageUrl).then(r => r.blob());
const base64 = await blobToBase64(blob);

// 2. Montar payload
const imagePayload = {
  assetType: { name: 'png', id: 28 },  // 22=jpeg, 28=png, 23=gif
  name: 'nome-da-imagem.png',
  file: base64,
  category: { id: 93941 },  // Categoria padrão para imagens
  customerKey: 'img_xxx',
  fileProperties: { fileName: 'nome.png', extension: 'png' }
};

// 3. Enviar via extensão
const result = await sendToExtension('UPLOAD_ASSET', imagePayload);
// result.assetUrl = URL hospedada no SFMC
```

## Arquivo a Modificar

**`src/components/eficode/user-components/HtmlBlock.tsx`**

### Alterações no componente `ImageItem`:

1. Adicionar import do `sendToExtension` e `checkExtensionInstalled`:
```typescript
import { sendToExtension, checkExtensionInstalled } from '@/lib/extensionProxy';
import { Cloud } from 'lucide-react';
```

2. Adicionar estado para controle de upload:
```typescript
const [uploadingToMC, setUploadingToMC] = useState(false);
```

3. Adicionar função helper `blobToBase64`:
```typescript
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove prefixo data:xxx;base64,
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
```

4. Adicionar função de envio para Content Builder:
```typescript
const handleSendToContentBuilder = async () => {
  setUploadingToMC(true);
  try {
    // Verificar se extensão está conectada
    const isConnected = await checkExtensionInstalled();
    if (!isConnected) {
      toast.error('Extensão SFMC não conectada');
      return;
    }

    // Buscar imagem e converter para base64
    const response = await fetch(src);
    if (!response.ok) throw new Error('Não foi possível carregar a imagem');
    
    const blob = await response.blob();
    const base64 = await blobToBase64(blob);
    
    // Detectar extensão
    const extension = src.split('.').pop()?.toLowerCase() || 'png';
    let assetTypeId = 28; // png
    if (extension === 'jpg' || extension === 'jpeg') assetTypeId = 22;
    else if (extension === 'gif') assetTypeId = 23;
    
    // Gerar nome único
    const timestamp = Date.now();
    const fileName = `eficode_${timestamp}.${extension}`;
    const customerKey = `img_${timestamp.toString(36)}`;
    
    const imagePayload = {
      assetType: { name: extension, id: assetTypeId },
      name: fileName,
      file: base64,
      category: { id: 93941 }, // Categoria padrão de imagens
      customerKey,
      fileProperties: { fileName, extension }
    };
    
    // Enviar para SFMC
    const result = await sendToExtension('UPLOAD_ASSET', imagePayload);
    
    if (!result.success) {
      throw new Error(result.error || 'Falha ao enviar para Content Builder');
    }
    
    // Obter URL do SFMC
    const sfmcUrl = result.assetUrl || result.data?.fileProperties?.publishedURL;
    
    if (sfmcUrl) {
      onReplace(sfmcUrl);
      toast.success('Imagem enviada para o Content Builder!');
    } else {
      toast.warning('Upload realizado, mas URL não retornada');
    }
  } catch (error: any) {
    console.error('Erro ao enviar para Content Builder:', error);
    toast.error(error.message || 'Erro ao enviar para Content Builder');
  } finally {
    setUploadingToMC(false);
  }
};
```

5. Adicionar botão na interface:
```tsx
<div className="flex gap-1 mt-1">
  <Button variant="outline" size="sm" ...>
    <Upload className="h-3 w-3" />
  </Button>
  <Button variant="outline" size="sm" ...>
    <Library className="h-3 w-3" />
  </Button>
  {/* Novo botão */}
  <Button
    variant="outline"
    size="sm"
    className="h-6 px-2 text-xs"
    onClick={handleSendToContentBuilder}
    disabled={uploading || uploadingToMC || hasError}
    title="Enviar para Content Builder"
  >
    {uploadingToMC ? (
      <Loader2 className="h-3 w-3 animate-spin" />
    ) : (
      <Cloud className="h-3 w-3" />
    )}
  </Button>
</div>
```

## Interface Visual

O painel de imagens terá 3 botões:

| Botão | Ícone | Função |
|-------|-------|--------|
| Upload | ⬆️ | Upload de arquivo local (Supabase) |
| Biblioteca | 📚 | Selecionar da biblioteca Efi Code |
| **Novo** Content Builder | ☁️ | Enviar para SFMC e atualizar URL |

## Fluxo de Uso

1. Usuário seleciona um HtmlBlock com imagens
2. No painel lateral, vê a seção "Imagens do Bloco"
3. Ao lado dos botões existentes, clica no ícone de nuvem (☁️)
4. Sistema mostra loading enquanto:
   - Busca a imagem atual
   - Converte para base64
   - Envia via extensão para o Content Builder
5. Ao concluir:
   - Recebe a URL hospedada no SFMC
   - Atualiza automaticamente o HTML do bloco
   - Toast de sucesso é exibido

## Observações

- A categoria 93941 é a mesma usada pelo Email Builder para imagens
- O customerKey segue o padrão curto (máx 36 chars) para compatibilidade
- Se a extensão não estiver conectada, exibe mensagem de erro
- O botão é desabilitado se a imagem estiver com erro de carregamento
