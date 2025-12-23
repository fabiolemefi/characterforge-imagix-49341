// Mágicas do Fábio - Popup Script

const testBtn = document.getElementById('test-btn');
const statusEl = document.getElementById('status');
const sfmcIndicator = document.getElementById('sfmc-indicator');
const sfmcStatus = document.getElementById('sfmc-status');
const onelinkIndicator = document.getElementById('onelink-indicator');
const onelinkStatus = document.getElementById('onelink-status');
const vpnMessage = document.getElementById('vpn-message');

// Reseta indicadores
function resetIndicators() {
  sfmcIndicator.classList.remove('success', 'error');
  sfmcStatus.textContent = '-';
  onelinkIndicator.classList.remove('success', 'error');
  onelinkStatus.textContent = '-';
}

// Testa conexão com SFMC e Onelink
async function testConnection() {
  testBtn.disabled = true;
  testBtn.textContent = 'Testando...';
  statusEl.classList.remove('hidden');
  vpnMessage.classList.add('hidden');
  resetIndicators();

  let hasError = false;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SFMC_PROXY_REQUEST',
      action: 'TEST_CONNECTION'
    });

    // SFMC
    if (response.sfmc) {
      sfmcIndicator.classList.add('success');
      sfmcStatus.textContent = 'OK';
    } else {
      sfmcIndicator.classList.add('error');
      sfmcStatus.textContent = 'Erro';
      hasError = true;
    }

    // Onelink
    if (response.onelink) {
      onelinkIndicator.classList.add('success');
      onelinkStatus.textContent = 'OK';
    } else {
      onelinkIndicator.classList.add('error');
      onelinkStatus.textContent = 'Erro';
      hasError = true;
    }
  } catch (error) {
    sfmcIndicator.classList.add('error');
    sfmcStatus.textContent = 'Erro';
    onelinkIndicator.classList.add('error');
    onelinkStatus.textContent = 'Erro';
    hasError = true;
  }

  if (hasError) {
    vpnMessage.classList.remove('hidden');
  }

  testBtn.disabled = false;
  testBtn.textContent = 'Testar Conexão';
}

testBtn.addEventListener('click', testConnection);
