// Helper para comunicação com a extensão Chrome

export interface ExtensionResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

// Rastreia se a extensão sinalizou estar pronta
let extensionReady = false;

// Escutar o evento de ready do content script
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.data?.target === 'SFMC_PROXY_READY') {
      extensionReady = true;
    }
  });
}

export async function sendToExtension(action: string, payload?: any): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const message = {
      target: 'SFMC_PROXY',
      requestId,
      action,
      payload,
    };

    window.postMessage(message, '*');

    const handleResponse = (event: MessageEvent) => {
      if (event.data?.target === 'SFMC_PROXY_RESPONSE' && event.data?.requestId === requestId) {
        window.removeEventListener('message', handleResponse);
        extensionReady = true; // Marca como pronta se respondeu
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
  // Se já recebeu o evento de ready, extensão está disponível
  if (extensionReady) {
    return true;
  }
  
  // Tenta enviar mensagem com timeout curto para feedback rápido
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

    // Timeout curto de 3 segundos
    setTimeout(() => {
      window.removeEventListener('message', handleResponse);
      resolve(extensionReady);
    }, 3000);
  });
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

// Cloud Pages types and functions
export interface CloudPage {
  id: number;
  name: string;
  assetType?: { id: number; name: string; displayName?: string };
  modifiedDate?: string;
  status?: { id: number; name: string };
  customerKey?: string;
  category?: { id: number; name: string; parentId?: number };
}

export async function listCloudPages(
  page = 1, 
  pageSize = 25, 
  search = '', 
  categoryId: number | null = null
): Promise<{
  success: boolean;
  items?: CloudPage[];
  count?: number;
  page?: number;
  pageSize?: number;
  error?: string;
}> {
  return sendToExtension('LIST_CLOUDPAGES', { page, pageSize, search, categoryId });
}

export async function getCloudPage(assetId: number): Promise<{
  success: boolean;
  id?: number;
  name?: string;
  content?: string;
  views?: any;
  assetType?: { id: number; name: string };
  status?: { id: number; name: string };
  category?: { id: number; name: string };
  error?: string;
}> {
  return sendToExtension('GET_CLOUDPAGE', { assetId });
}

export async function deleteCloudPage(assetId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  return sendToExtension('DELETE_CLOUDPAGE', { assetId });
}
