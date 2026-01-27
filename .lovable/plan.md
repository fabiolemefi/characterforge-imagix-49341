
# Plano: Corrigir Erro "sendMessage undefined" no Content Script

## Problema Identificado

O erro `Cannot read properties of undefined (reading 'sendMessage')` ocorre no **content.js** (linha 18) quando o content script tenta chamar `chrome.runtime.sendMessage()`, mas o `chrome.runtime` está `undefined`.

**Causas possíveis:**
1. A extensão foi atualizada/recarregada enquanto a página estava aberta
2. O Service Worker (background.js) foi parado pelo Chrome
3. O contexto da extensão foi invalidado (comum após updates)

Quando isso acontece, o content script ainda está rodando na página, mas perdeu a conexão com a extensão.

## Solução

Adicionar verificação de contexto no content script antes de tentar usar `chrome.runtime.sendMessage()`, retornando um erro claro que indica ao usuário para recarregar a página.

## Arquivo a Modificar

### `chrome-extension-sfmc-proxy/content.js`

```javascript
// EFI SFMC Proxy - Content Script
// Atua como ponte entre a página web e o background script

console.log('[SFMC Proxy] Content script carregado');

// Verifica se o contexto da extensão ainda é válido
function isExtensionContextValid() {
  try {
    // chrome.runtime.id será undefined se o contexto foi invalidado
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// Escuta mensagens da página web
window.addEventListener('message', async (event) => {
  // Ignora mensagens que não são da mesma origem ou não são para o proxy
  if (event.source !== window) return;
  if (!event.data || event.data.target !== 'SFMC_PROXY') return;

  const { requestId, action, payload } = event.data;

  console.log('[SFMC Proxy] Mensagem recebida da página:', action, requestId);

  // Verifica se o contexto da extensão ainda é válido
  if (!isExtensionContextValid()) {
    console.error('[SFMC Proxy] Contexto da extensão invalidado. Recarregue a página.');
    window.postMessage({
      target: 'SFMC_PROXY_RESPONSE',
      requestId: requestId,
      response: { 
        success: false, 
        error: 'Contexto da extensão perdido. Por favor, recarregue a página (F5).' 
      }
    }, '*');
    return;
  }

  try {
    // Envia para o background script
    const response = await chrome.runtime.sendMessage({
      type: 'SFMC_PROXY_REQUEST',
      action: action,
      payload: payload
    });

    // Retorna a resposta para a página
    window.postMessage({
      target: 'SFMC_PROXY_RESPONSE',
      requestId: requestId,
      response: response
    }, '*');

    console.log('[SFMC Proxy] Resposta enviada para a página:', requestId);

  } catch (error) {
    console.error('[SFMC Proxy] Erro:', error);

    // Detecta erros específicos de contexto invalidado
    const isContextError = error.message?.includes('Extension context invalidated') ||
                           error.message?.includes('sendMessage');

    // Retorna erro para a página
    window.postMessage({
      target: 'SFMC_PROXY_RESPONSE',
      requestId: requestId,
      response: { 
        success: false, 
        error: isContextError 
          ? 'Extensão desconectada. Recarregue a página (F5).'
          : (error.message || 'Erro na extensão')
      }
    }, '*');
  }
});

// Notifica a página que a extensão está disponível (apenas se contexto válido)
if (isExtensionContextValid()) {
  window.postMessage({
    target: 'SFMC_PROXY_READY',
    version: '1.0.0'
  }, '*');
}
```

## Resumo das Alterações

| Alteração | Propósito |
|-----------|-----------|
| Função `isExtensionContextValid()` | Verifica se `chrome.runtime.id` existe antes de usar APIs da extensão |
| Verificação antes do `sendMessage` | Retorna erro claro se o contexto foi perdido |
| Catch de erro específico | Detecta erros de contexto invalidado e retorna mensagem amigável |
| Verificação no `SFMC_PROXY_READY` | Só notifica a página se o contexto é válido |

## Resultado Esperado

Após esta correção:
1. O erro JavaScript bruto não vai mais ocorrer
2. O usuário receberá uma mensagem clara: **"Extensão desconectada. Recarregue a página (F5)."**
3. O toast no app vai exibir essa mensagem em vez de um erro técnico

## Instruções Pós-Implementação

Após salvar as alterações no `content.js`:
1. Vá em `chrome://extensions`
2. Clique no botão de **atualizar** na extensão "Mágicas do Fábio"
3. **Recarregue a página** do Efi Link (F5)
4. Teste a criação de um novo link
