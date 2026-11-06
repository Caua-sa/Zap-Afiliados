// ZapAfiliados - Chrome Extension Popup Script
// Puxa as informações diretamente para o ZapAfiliados para envio automatizado via robô

const CLOUD_APP_URL = 'https://ais-dev-qcpu3mytpcrtr2fmdyiv6a-602903723241.us-east1.run.app';

document.addEventListener('DOMContentLoaded', async () => {
  const popupImg = document.getElementById('popup-img');
  const popupTitle = document.getElementById('popup-title');
  const popupPromo = document.getElementById('popup-promo');
  const popupOrig = document.getElementById('popup-orig');
  const popupDisc = document.getElementById('popup-disc');
  const previewBox = document.getElementById('popup-achadinho-preview');
  const sendZapBtn = document.getElementById('send-zap-btn');
  const openAppBtn = document.getElementById('open-app-btn');
  const downloadImgBtn = document.getElementById('download-img-btn');
  const statusMsg = document.getElementById('status-msg');
  const connBadge = document.getElementById('conn-badge');

  // Settings elements
  const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const meliInput = document.getElementById('meli-tag-input');
  const shopeeInput = document.getElementById('shopee-tag-input');
  const amazonInput = document.getElementById('amazon-tag-input');
  const serverInput = document.getElementById('server-url-input');
  const detectedInfo = document.getElementById('detected-server-info');
  const autoDetectBtn = document.getElementById('auto-detect-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const openDashboardLink = document.getElementById('open-dashboard-link');

  let currentProduct = null;
  let currentAchadinhoText = '';
  let serverUrl = CLOUD_APP_URL;

  // Alternar painel de configurações
  toggleSettingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
  });

  // Localiza automaticamente a aba aberta do ZapAfiliados no navegador do usuário
  async function findZapAfiliadosTabUrl() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({}, (tabs) => {
          if (!tabs) return resolve(CLOUD_APP_URL);

          const zapTab = tabs.find(
            (t) =>
              (t.title && t.title.toLowerCase().includes('zapafiliados')) ||
              (t.url && (t.url.includes('.run.app') || t.url.includes('localhost:3000')))
          );

          if (zapTab && zapTab.url) {
            try {
              const origin = new URL(zapTab.url).origin;
              return resolve(origin);
            } catch {}
          }
          resolve(CLOUD_APP_URL);
        });
      } else {
        resolve(CLOUD_APP_URL);
      }
    });
  }

  // Testa conexão com o servidor e atualiza o badge
  async function testConnection(url) {
    connBadge.innerText = 'Verificando...';
    connBadge.className = 'badge';

    try {
      const r = await fetch(`${url}/api/extension/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      const d = await r.json();

      if (d.online) {
        serverUrl = url;
        connBadge.innerText = 'Online';
        connBadge.className = 'badge';
        connBadge.style.color = '#10b981';
        connBadge.title = `Conectado ao ZapAfiliados em ${url}`;
        if (detectedInfo) {
          detectedInfo.innerHTML = `Conectado: <strong style="color: #10b981;">${url}</strong>`;
        }
        return true;
      }
    } catch (err) {
      // Se falhar e a URL tentada for localhost, tenta conectar na nuvem automaticamente!
      if (url.includes('localhost') && CLOUD_APP_URL !== url) {
        return testConnection(CLOUD_APP_URL);
      }
    }

    connBadge.innerText = 'Offline';
    connBadge.className = 'badge badge-offline';
    connBadge.style.color = '#f59e0b';
    if (detectedInfo) {
      detectedInfo.innerHTML = `Não conectado. Abra o ZapAfiliados em uma aba ou clique em Auto-detectar.`;
    }
    return false;
  }

  // Inicialização das configurações
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['zapServerUrl', 'meliTag', 'shopeeTag', 'amazonTag'], async (res) => {
      let candidateUrl = res.zapServerUrl;

      // Se não houver URL salva ou for localhost (que falha na máquina do usuário), detecta a aba aberta!
      if (!candidateUrl || candidateUrl.includes('localhost')) {
        candidateUrl = await findZapAfiliadosTabUrl();
        chrome.storage.sync.set({ zapServerUrl: candidateUrl });
      }

      serverUrl = candidateUrl;
      serverInput.value = serverUrl;
      meliInput.value = res.meliTag || 'afiliado_zap_vip';
      shopeeInput.value = res.shopeeTag || 'shopee_vip_123';
      amazonInput.value = res.amazonTag || 'achadoszap-20';

      openDashboardLink.href = serverUrl;
      testConnection(serverUrl);
    });

    connBadge.addEventListener('click', () => {
      testConnection(serverUrl);
    });

    autoDetectBtn.addEventListener('click', async () => {
      autoDetectBtn.disabled = true;
      autoDetectBtn.innerText = 'Detectando...';
      const detected = await findZapAfiliadosTabUrl();
      serverInput.value = detected;
      serverUrl = detected;
      chrome.storage.sync.set({ zapServerUrl: detected });
      await testConnection(detected);
      autoDetectBtn.disabled = false;
      autoDetectBtn.innerText = '🔍 Auto-detectar Aba';
    });
  }

  openDashboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: serverUrl });
    } else {
      window.open(serverUrl, '_blank');
    }
  });

  if (openAppBtn) {
    openAppBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: serverUrl });
      } else {
        window.open(serverUrl, '_blank');
      }
    });
  }

  // Salvar configurações
  saveSettingsBtn.addEventListener('click', () => {
    const newServer = serverInput.value.trim().replace(/\/+$/, '') || CLOUD_APP_URL;
    chrome.storage.sync.set(
      {
        zapServerUrl: newServer,
        meliTag: meliInput.value.trim() || 'afiliado_zap_vip',
        shopeeTag: shopeeInput.value.trim() || 'shopee_vip_123',
        amazonTag: amazonInput.value.trim() || 'achadoszap-20',
      },
      () => {
        serverUrl = newServer;
        statusMsg.style.color = '#10b981';
        statusMsg.innerText = 'Configurações salvas!';
        settingsPanel.style.display = 'none';
        testConnection(newServer);
        setTimeout(() => (statusMsg.innerText = ''), 3000);
      }
    );
  });

  // Extrai produto da aba ativa
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      previewBox.innerText = 'Nenhuma aba ativa detectada.';
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extract_product' }, (response) => {
      if (chrome.runtime.lastError || !response || !response.product) {
        popupTitle.innerText = 'Navegue no Mercado Livre, Shopee ou Amazon';
        previewBox.innerText =
          'Abra qualquer produto ou a Central de Afiliados do Mercado Livre para puxar com 1 clique direto para o ZapAfiliados.';
        sendZapBtn.disabled = true;
        return;
      }

      currentProduct = response.product;
      currentAchadinhoText = response.achadinhoText;

      popupTitle.innerText = currentProduct.title;
      popupPromo.innerText = `R$ ${currentProduct.promotionalPrice.toFixed(2).replace('.', ',')}`;
      if (currentProduct.originalPrice > currentProduct.promotionalPrice) {
        popupOrig.innerText = `R$ ${currentProduct.originalPrice.toFixed(2).replace('.', ',')}`;
      }
      if (currentProduct.discountPercentage > 0 && popupDisc) {
        popupDisc.innerText = `${currentProduct.discountPercentage}% OFF`;
        popupDisc.style.display = 'inline-block';
      }

      if (currentProduct.imageUrl) {
        popupImg.src = currentProduct.imageUrl;
        popupImg.style.display = 'block';
      }

      previewBox.innerText = currentAchadinhoText;
      sendZapBtn.disabled = false;

      // Verifica se já existe na lista
      fetch(
        `${serverUrl}/api/extension/check?url=${encodeURIComponent(currentProduct.originalUrl)}&externalId=${encodeURIComponent(currentProduct.externalId || '')}&title=${encodeURIComponent(currentProduct.title || '')}`
      )
        .then((r) => r.json())
        .then((res) => {
          if (res.exists) {
            statusMsg.style.color = '#f59e0b';
            statusMsg.innerText = '⚠️ Este produto já está na sua lista do robô';
          } else {
            statusMsg.style.color = '#10b981';
            statusMsg.innerText = '✨ Produto pronto para ser puxado para o robô!';
          }
        })
        .catch(() => {});
    });
  }

  // Baixar foto
  downloadImgBtn.addEventListener('click', () => {
    if (!currentProduct || !currentProduct.imageUrl) {
      statusMsg.style.color = '#f59e0b';
      statusMsg.innerText = 'Nenhuma imagem encontrada.';
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: currentProduct.imageUrl });
    } else {
      window.open(currentProduct.imageUrl, '_blank');
    }
  });

  // AÇÃO PRINCIPAL: PUXAR DIRETO PARA O ZAPAFILIADOS (SEM COPIAR E COLAR NO WHATSAPP)
  sendZapBtn.addEventListener('click', async () => {
    if (!currentProduct) {
      statusMsg.style.color = '#f59e0b';
      statusMsg.innerText = 'Nenhum produto detectado nesta aba.';
      return;
    }

    sendZapBtn.disabled = true;
    sendZapBtn.innerHTML = '<span>Puxando para o ZapAfiliados...</span>';
    statusMsg.innerText = '';

    // Garante que a URL esteja resolvida
    let targetUrl = serverUrl;
    if (!targetUrl || targetUrl.includes('localhost')) {
      targetUrl = await findZapAfiliadosTabUrl();
    }

    try {
      const res = await fetch(`${targetUrl}/api/extension/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentProduct,
          addToDailySchedule: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        sendZapBtn.style.background = '#059669';
        sendZapBtn.style.color = '#fff';
        sendZapBtn.innerHTML = '<span>✅ Puxado com Sucesso!</span>';
        statusMsg.style.color = '#10b981';
        statusMsg.innerText = '🚀 Produto enviado para a Lista! O robô fará o envio nos grupos.';
        connBadge.innerText = 'Online';
        connBadge.className = 'badge';
        connBadge.style.color = '#10b981';
      } else if (data.duplicate) {
        sendZapBtn.style.background = '#f59e0b';
        sendZapBtn.style.color = '#000';
        sendZapBtn.innerHTML = '<span>⚠️ Já Está na Lista</span>';
        statusMsg.style.color = '#f59e0b';
        statusMsg.innerText = 'Anti-repetição: este produto já foi puxado para o robô.';
      } else {
        throw new Error(data.error || 'Erro no servidor');
      }
    } catch (err) {
      sendZapBtn.disabled = false;
      sendZapBtn.innerHTML = '<span>Tentar Novamente</span>';
      statusMsg.style.color = '#ef4444';
      statusMsg.innerHTML = `
        Erro de conexão com o ZapAfiliados.<br>
        <span style="font-size: 10px; color: #94a3b8;">Verifique se a aba do ZapAfiliados está aberta ou clique em ⚙️ Configurações.</span>
      `;
    }
  });
});
