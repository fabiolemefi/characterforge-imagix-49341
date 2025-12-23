// Helper para comunicação com a extensão Chrome

export interface ExtensionResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export async function sendToExtension(action: string, payload?: any): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    const message = {
      type: 'SFMC_PROXY_REQUEST',
      action,
      payload,
    };

    window.postMessage(message, '*');

    const handleResponse = (event: MessageEvent) => {
      if (event.data?.type === 'SFMC_PROXY_RESPONSE' && event.data?.action === action) {
        window.removeEventListener('message', handleResponse);
        resolve(event.data.response || { success: false, error: 'Resposta vazia' });
      }
    };

    window.addEventListener('message', handleResponse);

    // Timeout de 30 segundos
    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      resolve({ success: false, error: 'Timeout: extensão não respondeu' });
    }, 30000);
  });
}

export async function checkExtensionInstalled(): Promise<boolean> {
  const response = await sendToExtension('CHECK_EXTENSION');
  return response.success;
}

export async function shortenUrl(url: string): Promise<{ 
  success: boolean; 
  shorted_url?: string; 
  shorted?: string;
  id?: number;
  original_url?: string;
  error?: string;
}> {
  const response = await sendToExtension('SHORTEN_URL', { url });
  return response;
}
