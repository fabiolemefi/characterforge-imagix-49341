// Mágicas do Fábio - Popup Script

const testBtn = document.getElementById('test-btn');
const statusEl = document.getElementById('status');
const sfmcIndicator = document.getElementById('sfmc-indicator');
const sfmcStatus = document.getElementById('sfmc-status');
const efilinkIndicator = document.getElementById('efilink-indicator');
const efilinkStatus = document.getElementById('efilink-status');
const vpnMessage = document.getElementById('vpn-message');

// Reseta indicadores
function resetIndicators() {
  sfmcIndicator.classList.remove('success', 'error');
  sfmcStatus.textContent = '-';
  efilinkIndicator.classList.remove('success', 'error');
  efilinkStatus.textContent = '-';
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

    // Marketing Cloud
    if (response.sfmc) {
      sfmcIndicator.classList.add('success');
      sfmcStatus.textContent = 'OK';
    } else {
      sfmcIndicator.classList.add('error');
      sfmcStatus.textContent = 'Erro';
      hasError = true;
    }

    // Efí Link
    if (response.efilink) {
      efilinkIndicator.classList.add('success');
      efilinkStatus.textContent = 'OK';
    } else {
      efilinkIndicator.classList.add('error');
      efilinkStatus.textContent = 'Erro';
      hasError = true;
    }
  } catch (error) {
    sfmcIndicator.classList.add('error');
    sfmcStatus.textContent = 'Erro';
    efilinkIndicator.classList.add('error');
    efilinkStatus.textContent = 'Erro';
    hasError = true;
  }

  if (hasError) {
    vpnMessage.classList.remove('hidden');
  }

  testBtn.disabled = false;
  testBtn.textContent = 'Testar Conexão';
}

testBtn.addEventListener('click', testConnection);
