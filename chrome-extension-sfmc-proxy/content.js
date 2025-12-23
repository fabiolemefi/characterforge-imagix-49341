// EFI SFMC Proxy - Content Script
// Atua como ponte entre a página web e o background script

console.log('[SFMC Proxy] Content script carregado');

// Escuta mensagens da página web
window.addEventListener('message', async (event) => {
  // Ignora mensagens que não são da mesma origem ou não são para o proxy
  if (event.source !== window) return;
  if (!event.data || event.data.target !== 'SFMC_PROXY') return;

  const { requestId, action, payload } = event.data;

  console.log('[SFMC Proxy] Mensagem recebida da página:', action, requestId);

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

    // Retorna erro para a página
    window.postMessage({
      target: 'SFMC_PROXY_RESPONSE',
      requestId: requestId,
      response: { success: false, error: error.message || 'Erro na extensão' }
    }, '*');
  }
});

// Notifica a página que a extensão está disponível
window.postMessage({
  target: 'SFMC_PROXY_READY',
  version: '1.0.0'
}, '*');
