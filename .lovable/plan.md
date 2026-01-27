
# Plano: Corrigir Envio de Imagens para Content Builder

## Problema Identificado

O erro "Imagem não encontrada" para `eficode_1769531515117.jpe` tem **duas causas**:

### 1. Extensão `.jpe` não reconhecida
O código extrai a extensão da URL e verifica se está em `['jpg', 'jpeg', 'png', 'gif']`. A extensão `.jpe` (formato JPEG antigo) não está na lista.

```typescript
// Linha 138 - código atual
const extension = ['jpg', 'jpeg', 'png', 'gif'].includes(urlExtension) ? urlExtension : blobType;
```

### 2. Problema de CORS ou URL inválida
O `fetch(src)` pode falhar se:
- A imagem está em domínio externo sem CORS
- A URL é inválida ou expirada
- A imagem não existe mais

### 3. Botão desabilitado quando imagem não carrega
O botão "Enviar para Content Builder" fica desabilitado quando `hasError = true`, impedindo até a tentativa de envio.

## Solução

### Arquivo: `src/components/eficode/user-components/HtmlBlock.tsx`

### Alteração 1: Adicionar `.jpe` à lista de extensões válidas

```typescript
// Antes (linha 138)
const extension = ['jpg', 'jpeg', 'png', 'gif'].includes(urlExtension) ? urlExtension : blobType;

// Depois - incluir jpe e normalizar para jpg
const validExtensions = ['jpg', 'jpeg', 'jpe', 'png', 'gif'];
let extension = validExtensions.includes(urlExtension) ? urlExtension : blobType;

// Normalizar jpe para jpeg (SFMC espera formato padrão)
if (extension === 'jpe') extension = 'jpeg';
```

### Alteração 2: Melhorar tratamento do assetTypeId

```typescript
// Incluir jpe no mapeamento
let assetTypeId = 28; // png default
if (['jpg', 'jpeg', 'jpe'].includes(extension)) assetTypeId = 22;
else if (extension === 'gif') assetTypeId = 23;
```

### Alteração 3: Melhorar filename para SFMC

```typescript
// Normalizar extensão no filename também
const normalizedExt = extension === 'jpe' ? 'jpg' : (extension === 'jpeg' ? 'jpg' : extension);
const fileName = `eficode_${timestamp}.${normalizedExt}`;
```

### Alteração 4: Adicionar fallback com proxy ou mensagem mais clara

```typescript
// No catch do fetch
const handleSendToContentBuilder = async () => {
  setUploadingToMC(true);
  try {
    const isConnected = await checkExtensionInstalled();
    if (!isConnected) {
      toast.error('Extensão SFMC não conectada');
      return;
    }

    // Tentar fetch com tratamento de erro mais específico
    let blob: Blob;
    try {
      const response = await fetch(src, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      blob = await response.blob();
    } catch (fetchError) {
      // Mensagem mais clara sobre o problema
      toast.error('Não foi possível acessar a imagem. Verifique se a URL é válida e acessível.');
      console.error('Fetch failed for image:', src, fetchError);
      return;
    }

    // Resto do código...
  }
};
```

### Alteração 5: Permitir tentativa mesmo com hasError (opcional)

O botão está desabilitado quando a imagem não carrega no preview. Podemos manter desabilitado mas adicionar um tooltip explicativo:

```tsx
<Button
  variant="outline"
  size="sm"
  className="h-6 px-2 text-xs"
  onClick={handleSendToContentBuilder}
  disabled={uploading || uploadingToMC || hasError}
  title={hasError 
    ? "Imagem não carregou - verifique a URL" 
    : "Enviar para Content Builder"
  }
>
```

## Resumo das Mudanças

| Problema | Solução |
|----------|---------|
| `.jpe` não reconhecido | Adicionar à lista e normalizar para `jpeg`/`jpg` |
| CORS bloqueando fetch | Mensagem de erro mais clara |
| Filename com `.jpe` | Normalizar para `.jpg` no nome enviado ao SFMC |
| Tooltip não informativo | Explicar quando botão está desabilitado |

## Fluxo Corrigido

```text
Usuário clica "Enviar para Content Builder"
    |
    v
Verifica extensão conectada ✓
    |
    v
Extrai extensão da URL (.jpe, .jpg, .png, etc.)
    |
    v
Normaliza: jpe → jpeg, jpeg → jpg (para SFMC)
    |
    v
Define assetTypeId correto (22 para jpe/jpg/jpeg)
    |
    v
Tenta fetch da imagem
    |
    +-- Sucesso → Converte para base64 → Envia para SFMC
    |
    +-- Falha → Mensagem clara "Não foi possível acessar a imagem"
```

## Arquivos Modificados

- `src/components/eficode/user-components/HtmlBlock.tsx` - função `handleSendToContentBuilder`
