// EFI SFMC Proxy - Popup Script

const form = document.getElementById('credentials-form');
const statusEl = document.getElementById('status');
const statusIndicator = statusEl.querySelector('.status-indicator');
const statusText = statusEl.querySelector('.status-text');
const messageEl = document.getElementById('message');
const testBtn = document.getElementById('test-btn');

// Campos do formulário
const clientIdInput = document.getElementById('client_id');
const clientSecretInput = document.getElementById('client_secret');
const authUriInput = document.getElementById('auth_uri');
const subdomainInput = document.getElementById('subdomain');

// Carrega credenciais salvas
async function loadCredentials() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['sfmc_client_id', 'sfmc_client_secret', 'sfmc_auth_uri', 'sfmc_subdomain'], (result) => {
      clientIdInput.value = result.sfmc_client_id || '';
      clientSecretInput.value = result.sfmc_client_secret || '';
      authUriInput.value = result.sfmc_auth_uri || '';
      subdomainInput.value = result.sfmc_subdomain || '';
      
      updateStatus(result.sfmc_client_id && result.sfmc_client_secret && result.sfmc_auth_uri);
      resolve();
    });
  });
}

// Salva credenciais
async function saveCredentials() {
  return new Promise((resolve) => {
    chrome.storage.local.set({
      sfmc_client_id: clientIdInput.value.trim(),
      sfmc_client_secret: clientSecretInput.value.trim(),
      sfmc_auth_uri: authUriInput.value.trim(),
      sfmc_subdomain: subdomainInput.value.trim()
    }, resolve);
  });
}

// Atualiza indicador de status
function updateStatus(configured) {
  statusEl.classList.remove('configured', 'not-configured', 'testing');
  
  if (configured) {
    statusEl.classList.add('configured');
    statusText.textContent = 'Configurado';
  } else {
    statusEl.classList.add('not-configured');
    statusText.textContent = 'Não configurado';
  }
}

// Mostra mensagem
function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message show ${type}`;
  
  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 5000);
}

// Testa a conexão
async function testConnection() {
  statusEl.classList.remove('configured', 'not-configured');
  statusEl.classList.add('testing');
  statusText.textContent = 'Testando...';
  testBtn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SFMC_PROXY_REQUEST',
      action: 'TEST_CONNECTION'
    });

    if (response.success) {
      showMessage('Conexão estabelecida com sucesso!', 'success');
      updateStatus(true);
    } else {
      showMessage(response.error || 'Falha na conexão', 'error');
      updateStatus(true); // Ainda configurado, mas com erro
    }
  } catch (error) {
    showMessage(error.message || 'Erro ao testar conexão', 'error');
    updateStatus(false);
  } finally {
    testBtn.disabled = false;
  }
}

// Event: Salvar formulário
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  await saveCredentials();
  updateStatus(true);
  showMessage('Credenciais salvas com sucesso!', 'success');
});

// Event: Testar conexão
testBtn.addEventListener('click', async () => {
  // Salva antes de testar
  await saveCredentials();
  await testConnection();
});

// Inicialização
loadCredentials();
