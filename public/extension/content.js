// ZapAfiliados - Chrome Extension Content Script
// Captura automatizada na Central de Afiliados (mercadolivre.com.br/afiliados/hub) e páginas de produtos
// Encurta links longos, extrai 1ª foto em alta resolução, formata estilo Achadinhos WhatsApp e envia ao robô.

(function () {
  if (window.__zapAfiliadosInjected) return;
  window.__zapAfiliadosInjected = true;

  const CLOUD_APP_URL = 'https://ais-dev-qcpu3mytpcrtr2fmdyiv6a-602903723241.us-east1.run.app';
  const DEFAULT_SERVER_URL = CLOUD_APP_URL;

  function getSettings(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['zapServerUrl', 'meliTag', 'shopeeTag', 'amazonTag', 'autoCopyOnOpen'], function (res) {
        let activeServer = res.zapServerUrl;
        // Se for localhost ou estiver vazio ou apontar para o próprio mercadolivre, usa o servidor real da nuvem
        if (!activeServer || activeServer.includes('localhost') || activeServer.includes('mercadolivre')) {
          activeServer = CLOUD_APP_URL;
        }

        callback({
          serverUrl: activeServer.replace(/\/+$/, ''),
          meliTag: res.meliTag || 'afiliado_zap_vip',
          shopeeTag: res.shopeeTag || 'shopee_vip_123',
          amazonTag: res.amazonTag || 'achadoszap-20',
          autoCopyOnOpen: res.autoCopyOnOpen !== false,
        });
      });
    } else {
      callback({
        serverUrl: CLOUD_APP_URL,
        meliTag: 'afiliado_zap_vip',
        shopeeTag: 'shopee_vip_123',
        amazonTag: 'achadoszap-20',
        autoCopyOnOpen: true,
      });
    }
  }

  function detectMarketplace(url = window.location.href) {
    const lower = url.toLowerCase();
    if (lower.includes('mercadolivre') || lower.includes('mercadolibre')) return 'mercadolivre';
    if (lower.includes('shopee')) return 'shopee';
    if (lower.includes('amazon')) return 'amazon';
    return 'other';
  }

  // Encurtador inteligente: limpa mais de 200 caracteres de parâmetros inúteis e gera link curto e limpo
  function cleanAndShortenLink(rawUrl, marketplace, tags = {}) {
    if (!rawUrl) return '';

    // Se já for link encurtado oficial (/sec/, amzn.to, s.shopee.com, tinyurl), preserva diretamente
    if (
      rawUrl.includes('/sec/') ||
      rawUrl.includes('amzn.to') ||
      rawUrl.includes('s.shopee.com') ||
      rawUrl.includes('tinyurl.com')
    ) {
      return rawUrl;
    }

    // Mercado Livre: extrai MLB ID e gera link curto canônico
    if (marketplace === 'mercadolivre' || rawUrl.includes('mercadolivre') || rawUrl.includes('mercadolibre')) {
      const mlbMatch = rawUrl.match(/(MLB-?\d+)/i) || rawUrl.match(/\/p\/(MLB\d+)/i);
      if (mlbMatch) {
        const mlbId = mlbMatch[1].replace('-', '').toUpperCase();
        const tagParam = tags.meliTag ? `?tracking_id=${encodeURIComponent(tags.meliTag)}` : '';
        // Link limpo e encurtado de apenas ~38 caracteres
        return `https://mercadolivre.com.br/p/${mlbId}${tagParam}`;
      }
    }

    // Amazon: extrai ASIN
    if (marketplace === 'amazon' || rawUrl.includes('amazon')) {
      const asinMatch = rawUrl.match(/\/dp\/([A-Z0-9]{10})/i) || rawUrl.match(/\/gp\/product\/([A-Z0-9]{10})/i);
      if (asinMatch) {
        const asin = asinMatch[1];
        const tagParam = tags.amazonTag ? `?tag=${encodeURIComponent(tags.amazonTag)}` : '';
        return `https://amazon.com.br/dp/${asin}${tagParam}`;
      }
    }

    // Shopee
    if (marketplace === 'shopee' || rawUrl.includes('shopee')) {
      const idMatch = rawUrl.match(/-i\.(\d+\.\d+)/);
      if (idMatch) {
        const aff = tags.shopeeTag ? `?aff_id=${encodeURIComponent(tags.shopeeTag)}` : '';
        return `https://shopee.com.br/product/${idMatch[1].replace('.', '/')}${aff}`;
      }
    }

    // Remove parâmetros gigantes de rastreamento do Mercado Livre (pdp_filters, polycard_client, extra_comm, wid, sid)
    try {
      const u = new URL(rawUrl);
      u.hash = '';
      ['pdp_filters', 'polycard_client', 'extra_comm', 'brand_comm', 'wid', 'sid', 'matt_tool'].forEach((p) =>
        u.searchParams.delete(p)
      );
      return u.toString();
    } catch {
      return rawUrl;
    }
  }

  // Formata no padrão dos ACHADINHOS MAIS VIRAIS DO WHATSAPP
  function formatAchadinhoWhatsApp(prod) {
    const promoStr = (prod.promotionalPrice || 0).toFixed(2).replace('.', ',');
    const origStr = (prod.originalPrice || 0).toFixed(2).replace('.', ',');

    const origLine =
      prod.originalPrice > prod.promotionalPrice && prod.originalPrice > 0
        ? `❌ De: ~R$ ${origStr}~\n`
        : '';

    const discountBadge = prod.discountPercentage > 0 ? ` (${prod.discountPercentage}% OFF!)` : '';
    const installmentsLine = prod.installments ? `💳 ${prod.installments}\n` : '';
    const shippingLine = prod.freeShipping ? '🚚 *Frete Grátis Liberado!*\n' : '';
    const couponLine = prod.couponCode ? `🎟️ Cupom de Desconto: *${prod.couponCode}*\n` : '';

    return (
      `🔥 *ACHADINHO DO DIA!* 🔥\n\n` +
      `📦 *${prod.title}*\n\n` +
      origLine +
      `🔥 *Por apenas: R$ ${promoStr}*${discountBadge}\n` +
      installmentsLine +
      shippingLine +
      couponLine +
      `\n🛒 *Compre aqui com desconto:* \n👉 ${prod.affiliateUrl}\n\n` +
      `⚠️ _Atenção: Os preços e estoques podem variar a qualquer momento._`
    );
  }

  // Notificação no topo da tela estilo Toast
  function showTopNotification(text, isSuccess = true) {
    const existing = document.getElementById('zapafiliados-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'zapafiliados-toast';
    toast.style.cssText = `
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999999;
      background: ${isSuccess ? '#064e3b' : '#1e293b'};
      color: #fff;
      border: 2px solid ${isSuccess ? '#10b981' : '#334155'};
      padding: 12px 24px;
      border-radius: 9999px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 800;
      box-shadow: 0 10px 30px rgba(0,0,0,0.7), 0 0 25px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      animation: zapFadeIn 0.3s ease;
    `;

    toast.innerHTML = `
      <span style="font-size: 18px;">🔥</span>
      <span>${text}</span>
      <span style="font-size: 12px; opacity: 0.7; margin-left: 8px;">✕</span>
    `;

    toast.onclick = () => toast.remove();
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 4500);
  }

  // Envia o produto de forma automática ao servidor ZapAfiliados
  async function sendProductToZapAfiliados(serverUrl, productData) {
    try {
      const res = await fetch(`${serverUrl}/api/extension/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...productData,
          addToDailySchedule: true,
        }),
      });
      return await res.json();
    } catch (err) {
      console.warn('[ZapAfiliados] Erro ao enviar ao servidor:', err);
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  }

  // Extrai dados diretamente da página de produto
  function extractProductPageData(tags) {
    const marketplace = detectMarketplace();
    const rawUrl = window.location.href;
    const affiliateUrl = cleanAndShortenLink(rawUrl, marketplace, tags);

    let title = '';
    let imageUrl = '';
    let originalPrice = 0;
    let promotionalPrice = 0;
    let externalId = '';
    let installments = '';
    let freeShipping = false;
    let couponCode = '';
    let commissionRate = 10;

    if (marketplace === 'mercadolivre') {
      const titleEl = document.querySelector('h1.ui-pdp-title') || document.querySelector('h1');
      title = titleEl ? titleEl.innerText.trim() : document.title.replace(' | Mercado Livre', '').trim();

      const ogImg = document.querySelector('meta[property="og:image"]');
      const figureImg =
        document.querySelector('.ui-pdp-gallery__figure img') ||
        document.querySelector('img.ui-pdp-image') ||
        document.querySelector('figure img') ||
        document.querySelector('.ui-pdp-gallery img');
      imageUrl = (ogImg && ogImg.content) || (figureImg && figureImg.src) || '';

      if (imageUrl && imageUrl.includes('-I.webp')) {
        imageUrl = imageUrl.replace('-I.webp', '-O.webp');
      } else if (imageUrl && imageUrl.includes('-V.webp')) {
        imageUrl = imageUrl.replace('-V.webp', '-O.webp');
      }

      const mlbMatch =
        window.location.pathname.match(/(MLB-?\d+)/i) ||
        window.location.pathname.match(/\/p\/(MLB\d+)/i) ||
        window.location.href.match(/(MLB\d+)/i);
      externalId = mlbMatch ? mlbMatch[1].replace('-', '').toUpperCase() : '';

      const promoFraction = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__fraction');
      const promoCents = document.querySelector('.ui-pdp-price__second-line .andes-money-amount__cents');
      if (promoFraction) {
        const val = promoFraction.innerText.replace(/\./g, '') + '.' + (promoCents ? promoCents.innerText : '00');
        promotionalPrice = parseFloat(val) || 0;
      }

      const origFraction = document.querySelector('.ui-pdp-price__original-value .andes-money-amount__fraction');
      if (origFraction) {
        originalPrice = parseFloat(origFraction.innerText.replace(/\./g, '')) || 0;
      } else {
        originalPrice = promotionalPrice > 0 ? Number((promotionalPrice * 1.3).toFixed(2)) : 0;
      }

      const instEl = document.querySelector('.ui-pdp-media--installments') || document.querySelector('.ui-pdp-installments');
      installments = instEl ? instEl.innerText.replace(/\s+/g, ' ').trim() : 'Em até 10x sem juros';

      const shippingEl = document.querySelector('.ui-pdp-media--shipping') || document.querySelector('.ui-pdp-shipping');
      freeShipping = !!(shippingEl && shippingEl.innerText.toLowerCase().includes('grátis'));

      const couponEl = document.querySelector('.ui-pdp-promotions__coupon, .ui-pdp-coupons');
      if (couponEl) {
        const match = couponEl.innerText.match(/([A-Z0-9]{4,15})/);
        if (match) couponCode = match[1];
      }
    } else if (marketplace === 'shopee') {
      const titleEl = document.querySelector('h1') || document.querySelector('._44qnta');
      title = titleEl ? titleEl.innerText.trim() : document.title;

      const ogImg = document.querySelector('meta[property="og:image"]');
      const shopeeImg = document.querySelector('._39_Twn img') || document.querySelector('picture img');
      imageUrl = (ogImg && ogImg.content) || (shopeeImg && shopeeImg.src) || '';

      const priceEl = document.querySelector('.pqTWkA') || document.querySelector('.G27FPf');
      if (priceEl) {
        const num = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
        promotionalPrice = parseFloat(num) || 0;
        originalPrice = Number((promotionalPrice * 1.25).toFixed(2));
      }

      const idMatch = window.location.pathname.match(/-i\.(\d+\.\d+)/);
      externalId = idMatch ? `shopee_${idMatch[1]}` : '';
      installments = 'Até 6x sem juros';
      freeShipping = true;
    } else if (marketplace === 'amazon') {
      const titleEl = document.querySelector('#productTitle') || document.querySelector('h1#title');
      title = titleEl ? titleEl.innerText.trim() : document.title;

      const landingImg = document.querySelector('#landingImage') || document.querySelector('#imgBlkFront');
      const ogImg = document.querySelector('meta[property="og:image"]');
      imageUrl = (landingImg && landingImg.src) || (ogImg && ogImg.content) || '';

      const asinMatch =
        window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/i) ||
        window.location.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
      externalId = asinMatch ? asinMatch[1] : '';

      const priceEl = document.querySelector('.a-price .a-offscreen');
      if (priceEl) {
        const num = priceEl.innerText.replace(/[^\d,]/g, '').replace(',', '.');
        promotionalPrice = parseFloat(num) || 0;
        originalPrice = Number((promotionalPrice * 1.2).toFixed(2));
      }
      installments = 'Até 10x sem juros';
      freeShipping = true;
    }

    const discountPercentage =
      originalPrice > promotionalPrice && originalPrice > 0
        ? Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100)
        : 0;

    return {
      title,
      imageUrl,
      originalUrl: rawUrl,
      affiliateUrl,
      originalPrice,
      promotionalPrice: promotionalPrice || 99.9,
      discountPercentage,
      marketplace,
      externalId,
      installments,
      freeShipping,
      couponCode,
      commissionRate,
    };
  }

  // =========================================================================
  // PARTE 1: CENTRAL DE AFILIADOS MERCADO LIVRE (mercadolivre.com.br/afiliados/hub)
  // Injeta botão de 1 clique em CADA card para enviar automaticamente e copiar
  // =========================================================================
  function extractHubCardData(cardEl, tags) {
    // 1. Título do produto
    const titleEl =
      cardEl.querySelector('.poly-component__title') ||
      cardEl.querySelector('a[title]') ||
      cardEl.querySelector('h2') ||
      cardEl.querySelector('h3') ||
      cardEl.querySelector('.ui-recommendations-card__title');
    const title = titleEl ? (titleEl.getAttribute('title') || titleEl.innerText).trim() : 'Produto Mercado Livre';

    // 2. Link do produto
    const linkEl =
      cardEl.querySelector('a[href*="/p/MLB"]') ||
      cardEl.querySelector('a[href*="MLB"]') ||
      cardEl.querySelector('a.poly-component__title') ||
      cardEl.querySelector('a');
    const rawHref = linkEl ? linkEl.href : window.location.href;
    const cleanShortLink = cleanAndShortenLink(rawHref, 'mercadolivre', tags);

    // 3. Imagem oficial em alta resolução
    const imgEl = cardEl.querySelector('.poly-component__picture') || cardEl.querySelector('img');
    let imageUrl = imgEl ? (imgEl.src || imgEl.getAttribute('data-src') || '') : '';
    if (imageUrl && imageUrl.includes('-I.webp')) {
      imageUrl = imageUrl.replace('-I.webp', '-O.webp');
    } else if (imageUrl && imageUrl.includes('-V.webp')) {
      imageUrl = imageUrl.replace('-V.webp', '-O.webp');
    }

    // 4. Preços
    let promotionalPrice = 0;
    let originalPrice = 0;

    const promoEl =
      cardEl.querySelector('.poly-price__current .andes-money-amount__fraction') ||
      cardEl.querySelector('.andes-money-amount--cents-superscript .andes-money-amount__fraction') ||
      cardEl.querySelector('.andes-money-amount__fraction');
    const promoCents = cardEl.querySelector('.andes-money-amount__cents');
    if (promoEl) {
      const val = promoEl.innerText.replace(/\./g, '') + '.' + (promoCents ? promoCents.innerText : '00');
      promotionalPrice = parseFloat(val) || 0;
    }

    const origEl = cardEl.querySelector('.andes-money-amount--previous .andes-money-amount__fraction') || cardEl.querySelector('s .andes-money-amount__fraction');
    if (origEl) {
      originalPrice = parseFloat(origEl.innerText.replace(/\./g, '')) || 0;
    } else {
      originalPrice = promotionalPrice > 0 ? Number((promotionalPrice * 1.3).toFixed(2)) : 0;
    }

    // 5. Comissão (ex: "GANHOS 12%", "GANHOS 5%")
    let commissionRate = 10;
    const cardText = cardEl.innerText;
    const ganhosMatch = cardText.match(/GANHOS\s*(\d+)%/i);
    if (ganhosMatch) {
      commissionRate = parseInt(ganhosMatch[1], 10);
    }

    // 6. Desconto
    const discountMatch = cardText.match(/(\d+)%\s*OFF/i);
    const discountPercentage = discountMatch
      ? parseInt(discountMatch[1], 10)
      : (originalPrice > promotionalPrice ? Math.round(((originalPrice - promotionalPrice) / originalPrice) * 100) : 0);

    // 7. Parcelas
    const parcelasMatch = cardText.match(/(\d+x\s*R\$\s*[\d,]+)/i);
    const installments = parcelasMatch ? `Em até ${parcelasMatch[1]} sem juros` : 'Em até 10x sem juros';

    // 8. ID Externo
    const mlbMatch = rawHref.match(/(MLB-?\d+)/i) || rawHref.match(/wid=(MLB\d+)/i);
    const externalId = mlbMatch ? mlbMatch[1].replace('-', '').toUpperCase() : '';

    return {
      title,
      imageUrl,
      originalUrl: rawHref,
      affiliateUrl: cleanShortLink,
      originalPrice,
      promotionalPrice: promotionalPrice || 99.9,
      discountPercentage,
      marketplace: 'mercadolivre',
      externalId,
      installments,
      freeShipping: true,
      couponCode: '',
      commissionRate,
    };
  }

  // Injeta botões inteligentes em todos os cards da Central de Afiliados
  function setupAffiliateHubIntegration() {
    getSettings((settings) => {
      // Localiza todos os cards de produtos no Hub
      const cardSelectors = [
        '.poly-card',
        'div[class*="poly-card"]',
        '.andes-card',
        'div[class*="hub"] div[class*="card"]',
        'article',
      ];

      const cards = document.querySelectorAll(cardSelectors.join(','));

      cards.forEach((card) => {
        // Se já foi injetado, pula
        if (card.querySelector('.zap-hub-auto-btn')) return;

        // Procura onde injetar o botão (perto do botão "Compartilhar")
        const shareBtn = Array.from(card.querySelectorAll('button')).find((b) =>
          b.innerText.toLowerCase().includes('compartilhar')
        );

        const zapBtn = document.createElement('button');
        zapBtn.className = 'zap-hub-auto-btn';
        zapBtn.style.cssText = `
          width: 100%;
          margin-top: 6px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #020617;
          border: none;
          border-radius: 8px;
          padding: 8px 10px;
          font-weight: 800;
          font-size: 11px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          transition: transform 0.15s, background 0.2s;
        `;
        zapBtn.innerHTML = '<span>🚀 Puxar para o ZapAfiliados</span>';

        zapBtn.onclick = async (e) => {
          e.preventDefault();
          e.stopPropagation();

          zapBtn.disabled = true;
          zapBtn.innerHTML = '<span>Puxando...</span>';

          const prod = extractHubCardData(card, settings);

          // Envia direto para a Lista de Produtos do ZapAfiliados
          const result = await sendProductToZapAfiliados(settings.serverUrl, prod);

          if (result.success) {
            zapBtn.style.background = '#059669';
            zapBtn.style.color = '#fff';
            zapBtn.innerHTML = '<span>✅ Puxado p/ ZapAfiliados!</span>';
            showTopNotification(`🚀 "${prod.title.substring(0, 32)}..." puxado com sucesso! O robô ZapAfiliados fará o envio nos grupos.`);
          } else if (result.duplicate) {
            zapBtn.style.background = '#f59e0b';
            zapBtn.style.color = '#000';
            zapBtn.innerHTML = '<span>⚠️ Já Está na Lista</span>';
            showTopNotification(`⚠️ Este produto já está na sua lista do robô!`, false);
          } else {
            zapBtn.disabled = false;
            zapBtn.innerHTML = '<span>Tentar Novamente</span>';
            showTopNotification(`Erro de conexão com o ZapAfiliados. Verifique se o app está aberto.`, false);
          }
        };

        if (shareBtn && shareBtn.parentNode) {
          shareBtn.parentNode.insertBefore(zapBtn, shareBtn.nextSibling);
        } else {
          card.appendChild(zapBtn);
        }
      });
    });
  }

  // Observa modais nativos de "Compartilhar" do Mercado Livre para capturar o link encurtado oficial (/sec/)
  function setupMeliShareModalObserver() {
    getSettings((settings) => {
      const observer = new MutationObserver(() => {
        // Procura inputs ou textos que contenham o link oficial encurtado /sec/
        const inputs = Array.from(document.querySelectorAll('input, textarea, span, p'));
        const secInput = inputs.find((el) => {
          const val = el.value || el.innerText || '';
          return val.includes('mercadolivre.com/sec/') || val.includes('mercadolivre.com.br/sec/');
        });

        if (secInput && !secInput.dataset.zapCaptured) {
          secInput.dataset.zapCaptured = 'true';
          const shortUrl = (secInput.value || secInput.innerText).trim().match(/https?:\/\/[^\s"'<>]+/)[0];

          if (shortUrl) {
            showTopNotification(`🔗 Link Encurtado Oficial Capturado: ${shortUrl}`);
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  // =========================================================================
  // PARTE 2: PÁGINAS DE PRODUTO
  // Auto-cópia + Envio automático para a Lista do ZapAfiliados + Widget Flutuante
  // =========================================================================
  function setupProductPage() {
    const path = window.location.pathname;
    const isProductPage =
      path.includes('/p/MLB') ||
      path.includes('MLB-') ||
      path.includes('MLB') ||
      path.includes('/dp/') ||
      path.includes('/gp/product/') ||
      path.includes('-i.') ||
      path.includes('/produto/');

    if (!isProductPage) return;

    getSettings(async (settings) => {
      const prod = extractProductPageData(settings);
      if (!prod.title) return;

      const achadinhoText = formatAchadinhoWhatsApp(prod);

      // Auto-cópia imediata para a área de transferência
      if (settings.autoCopyOnOpen) {
        try {
          await navigator.clipboard.writeText(achadinhoText);
        } catch {}
      }

      // Envia AUTOMATICAMENTE para a lista de produtos do ZapAfiliados sem precisar fazer manual!
      const importRes = await sendProductToZapAfiliados(settings.serverUrl, prod);
      if (importRes.success) {
        showTopNotification(`🔥 "${prod.title.substring(0, 32)}..." enviado para o ZapAfiliados e copiado para o WhatsApp!`);
      }

      // Injeta widget com botões rápidos
      if (document.getElementById('zapafiliados-achadinho-widget')) return;

      const container = document.createElement('div');
      container.id = 'zapafiliados-achadinho-widget';
      container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999999;
        background: #090d16;
        border: 2px solid #10b981;
        border-radius: 20px;
        box-shadow: 0 25px 50px rgba(0,0,0,0.85), 0 0 25px rgba(16, 185, 129, 0.35);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #fff;
        padding: 16px;
        width: 340px;
        max-width: 90vw;
        backdrop-filter: blur(14px);
        transition: all 0.3s ease;
      `;

      container.innerHTML = `
        <!-- Top bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 7px;">
            <div style="width: 24px; height: 24px; border-radius: 7px; background: linear-gradient(135deg, #10b981, #059669); color: #000; font-weight: 900; font-size: 13px; display: flex; align-items: center; justify-content: center;">🔥</div>
            <span style="font-weight: 900; font-size: 13px; color: #fff;">ZapAfiliados Achadinhos</span>
          </div>
          <button id="zap-close-btn" style="background: transparent; border: none; color: #64748b; font-size: 16px; cursor: pointer; padding: 2px 6px;">✕</button>
        </div>

        <!-- Product Thumbnail & Title -->
        <div style="display: flex; gap: 10px; margin-bottom: 12px; background: #020617; padding: 10px; border-radius: 12px; border: 1px solid #1e293b;">
          ${
            prod.imageUrl
              ? `<img id="zap-prod-img" src="${prod.imageUrl}" style="width: 58px; height: 58px; object-fit: cover; border-radius: 8px; border: 1px solid #334155; shrink-0;" />`
              : `<div style="width: 58px; height: 58px; background: #1e293b; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 22px;">📦</div>`
          }
          <div style="min-width: 0; flex: 1;">
            <div style="font-size: 11px; font-weight: 700; color: #f8fafc; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
              ${prod.title || 'Produto'}
            </div>
            <div style="margin-top: 4px; display: flex; align-items: baseline; gap: 6px;">
              <span style="font-size: 15px; font-weight: 900; color: #10b981;">R$ ${prod.promotionalPrice.toFixed(2).replace('.', ',')}</span>
              ${prod.originalPrice > prod.promotionalPrice ? `<span style="font-size: 11px; color: #64748b; text-decoration: line-through;">R$ ${prod.originalPrice.toFixed(2).replace('.', ',')}</span>` : ''}
              ${prod.discountPercentage > 0 ? `<span style="font-size: 10px; font-weight: 900; background: #f43f5e; color: #fff; padding: 1px 4px; border-radius: 4px;">${prod.discountPercentage}% OFF</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Link Encurtado Status -->
        <div style="font-size: 10px; background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 6px 10px; margin-bottom: 10px; word-break: break-all;">
          <span style="color: #94a3b8;">Link Encurtado:</span> <span style="color: #34d399; font-weight: 700;">${prod.affiliateUrl}</span>
        </div>

        <!-- Action 1: Puxar Direto para o ZapAfiliados (Robô de Envio) -->
        <button id="zap-send-primary-btn" style="
          width: 100%;
          background: linear-gradient(135deg, #10b981, #059669);
          color: #020617;
          font-weight: 900;
          font-size: 13px;
          padding: 12px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 8px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
          transition: transform 0.15s;
        ">
          <span>🚀 Puxar Direto para o ZapAfiliados</span>
        </button>

        <!-- Actions: Send to Bot & Download Photo -->
        <div style="display: flex; gap: 8px;">
          <button id="zap-send-bot-btn" style="
            flex: 1;
            background: #1e293b;
            color: #f1f5f9;
            font-weight: 700;
            font-size: 11px;
            padding: 9px 10px;
            border-radius: 10px;
            border: 1px solid #334155;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          ">
            <span>⚡ Programador do Dia</span>
          </button>

          ${
            prod.imageUrl
              ? `<a href="${prod.imageUrl}" target="_blank" download="achadinho-foto.webp" style="
                  background: #1e293b;
                  color: #94a3b8;
                  font-weight: 600;
                  font-size: 11px;
                  padding: 9px 12px;
                  border-radius: 10px;
                  border: 1px solid #334155;
                  text-decoration: none;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                ">
                  <span>🖼️ 1ª Foto</span>
                </a>`
              : ''
          }
        </div>
      `;

      document.body.appendChild(container);

      const closeBtn = document.getElementById('zap-close-btn');
      if (closeBtn) closeBtn.onclick = () => container.remove();

      const sendPrimaryBtn = document.getElementById('zap-send-primary-btn');
      if (sendPrimaryBtn) {
        sendPrimaryBtn.onclick = async () => {
          sendPrimaryBtn.disabled = true;
          sendPrimaryBtn.innerHTML = '<span>Puxando para o ZapAfiliados...</span>';

          const res = await sendProductToZapAfiliados(settings.serverUrl, prod);

          if (res.success) {
            sendPrimaryBtn.style.background = '#059669';
            sendPrimaryBtn.style.color = '#fff';
            sendPrimaryBtn.innerHTML = '<span>✅ Puxado com Sucesso!</span>';
            showTopNotification(`🚀 "${prod.title.substring(0, 32)}..." puxado direto para a Lista! O robô fará o envio nos grupos.`);
          } else if (res.duplicate) {
            sendPrimaryBtn.style.background = '#f59e0b';
            sendPrimaryBtn.style.color = '#000';
            sendPrimaryBtn.innerHTML = '<span>⚠️ Já Está na Lista</span>';
            showTopNotification(`⚠️ Este produto já está na sua lista do robô!`, false);
          } else {
            sendPrimaryBtn.disabled = false;
            sendPrimaryBtn.innerHTML = '<span>Tentar Novamente</span>';
            showTopNotification(`Erro de conexão com o ZapAfiliados. Verifique se o app está aberto.`, false);
          }
        };
      }

      const sendBotBtn = document.getElementById('zap-send-bot-btn');
      if (sendBotBtn) {
        sendBotBtn.onclick = async () => {
          sendBotBtn.disabled = true;
          sendBotBtn.innerHTML = '<span>Enviando...</span>';
          const res = await sendProductToZapAfiliados(settings.serverUrl, prod);
          if (res.success) {
            sendBotBtn.style.background = '#10b981';
            sendBotBtn.style.color = '#000';
            sendBotBtn.innerHTML = '<span>✅ Agendado Hoje!</span>';
            showTopNotification('⚡ Produto agendado no Programador do Dia!');
          } else {
            sendBotBtn.style.background = '#f59e0b';
            sendBotBtn.style.color = '#000';
            sendBotBtn.innerHTML = '<span>⚠️ Já no Robô</span>';
          }
        };
      }
    });
  }

  // Inicialização com observer para páginas dinâmicas (SPA do Mercado Livre)
  function init() {
    const isAffiliateHub = window.location.href.includes('/afiliados/');
    if (isAffiliateHub) {
      setupAffiliateHubIntegration();
      setupMeliShareModalObserver();

      // Observa scroll infinito ou navegações internas no Hub de Afiliados
      const observer = new MutationObserver(() => {
        setupAffiliateHubIntegration();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      setupProductPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 600);
  }

  // Suporte a mensagens do popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
      if (req.action === 'extract_product') {
        getSettings((settings) => {
          const prod = extractProductPageData(settings);
          const achadinhoText = formatAchadinhoWhatsApp(prod);
          sendResponse({ product: prod, achadinhoText });
        });
        return true;
      }
    });
  }
})();
