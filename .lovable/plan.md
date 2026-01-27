
# Plano: Corrigir Detecção da Extensão no EfiLink

## Problema Identificado

O modal de criação de link no plugin EfiLink mostra "Extensão não detectada" mesmo quando a extensão está funcionando. Isso acontece porque:

1. O **popup da extensão** testa as APIs diretamente (background.js)
2. O **modal EfiLink** testa a comunicação via content script (page → content.js → background.js)

Se a página não foi recarregada após instalar/atualizar a extensão, o content script não está injetado e a comunicação falha.

## Solução

Vamos melhorar a detecção da extensão para:
1. Adicionar uma verificação inicial mais robusta que escuta o evento `SFMC_PROXY_READY` enviado pelo content script
2. Reduzir o timeout da verificação inicial para feedback mais rápido
3. Adicionar uma mensagem mais informativa sugerindo recarregar a página

## Arquivos a Modificar

### 1. `src/lib/extensionProxy.ts`

Adicionar uma verificação baseada no evento `SFMC_PROXY_READY` que o content script já envia:

```typescript
// Adicionar variável para rastrear se a extensão sinalizou estar pronta
let extensionReady = false;

// Escutar o evento de ready do content script
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data?.target === 'SFMC_PROXY_READY') {
      extensionReady = true;
    }
  });
}

// Modificar checkExtensionInstalled para:
// 1. Verificar primeiro se já recebeu SFMC_PROXY_READY
// 2. Usar timeout mais curto (3 segundos)
// 3. Retornar true se qualquer um dos métodos funcionar
export async function checkExtensionInstalled(): Promise<boolean> {
  // Se já recebeu o evento de ready, extensão está disponível
  if (extensionReady) {
    return true;
  }
  
  // Tenta enviar mensagem com timeout curto
  return new Promise((resolve) => {
    const requestId = `check-${Date.now()}`;
    
    window.postMessage({
      target: 'SFMC_PROXY',
      requestId,
      action: 'CHECK_EXTENSION',
    }, '*');

    const handleResponse = (event: MessageEvent) => {
      if (event.data?.target === 'SFMC_PROXY_RESPONSE' && event.data?.requestId === requestId) {
        window.removeEventListener('message', handleResponse);
        extensionReady = true;
        resolve(true);
      }
    };

    window.addEventListener('message', handleResponse);

    // Timeout curto de 3 segundos para feedback rápido
    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      resolve(extensionReady);
    }, 3000);
  });
}
```

### 2. `src/components/efilink/EfiLinkFormModal.tsx`

Melhorar a mensagem de erro para sugerir recarregar a página:

```typescript
{extensionAvailable === false && (
  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm space-y-2">
    <p className="text-yellow-600 font-medium">
      Extensão não detectada
    </p>
    <p className="text-yellow-600/80 text-xs">
      Verifique se a extensão "Mágicas do Fábio" está instalada e tente 
      <button 
        onClick={() => window.location.reload()} 
        className="underline font-medium mx-1"
      >
        recarregar a página
      </button>
      para restabelecer a conexão.
    </p>
  </div>
)}
```

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/extensionProxy.ts` | Adicionar detecção via evento SFMC_PROXY_READY + timeout mais curto |
| `src/components/efilink/EfiLinkFormModal.tsx` | Melhorar mensagem de erro com opção de recarregar página |

## Ação Imediata (Sem Código)

Antes de implementar, tente **recarregar a página** (F5 ou Ctrl+R) enquanto está em `/efi-link`. Isso deve resolver o problema se for apenas uma questão de o content script não ter sido injetado após recarregar a extensão.
