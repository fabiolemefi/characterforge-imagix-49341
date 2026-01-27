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
