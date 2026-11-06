import { AntiSpamConfig, Product } from '../types';

export const DEFAULT_ANTISPAM_CONFIG: AntiSpamConfig = {
  enabled: true,
  minIntervalMinutes: 4,
  maxIntervalMinutes: 12,
  randomInterval: true,
  simulateTyping: true,
  typingDurationSeconds: 4,
  maxMessagesPerDay: 25,
  nightPauseEnabled: true,
  nightPauseStart: '22:00',
  nightPauseEnd: '08:00',
  useSpintax: true,
  warmupMode: true,
  appendRandomHash: true,
};

/**
 * Resolves Spintax strings like {A|B|C} recursively
 */
export function resolveSpintax(text: string): string {
  const spintaxRegex = /\{([^{}]+)\}/g;
  let matches = true;

  while (matches) {
    const newText = text.replace(spintaxRegex, (_, choices) => {
      const options = choices.split('|');
      const randomIndex = Math.floor(Math.random() * options.length);
      return options[randomIndex].trim();
    });

    if (newText === text) {
      matches = false;
    } else {
      text = newText;
    }
  }

  return text;
}

/**
 * Formats Brazilian Real currency
 */
export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formats message in the exact viral Achadinhos do WhatsApp style
 */
export function formatAchadinhoWhatsApp(product: Product): string {
  const origPriceLine =
    product.originalPrice > product.promotionalPrice
      ? `❌ De: ~${formatCurrencyBRL(product.originalPrice)}~\n`
      : '';
  const discountLine = product.discountPercentage > 0 ? ` (${product.discountPercentage}% OFF!)` : '';
  const installmentsLine = product.installments ? `💳 ${product.installments}\n` : '';
  const shippingLine = product.freeShipping ? `🚚 Frete Grátis Liberado!\n` : '';
  const couponLine = product.couponCode ? `🎟️ Cupom: *${product.couponCode}*\n` : '';

  return (
    `🔥 *ACHADINHO DO DIA!* 🔥\n\n` +
    `📦 *${product.title}*\n\n` +
    origPriceLine +
    `🔥 *Por apenas: ${formatCurrencyBRL(product.promotionalPrice)}*${discountLine}\n` +
    installmentsLine +
    shippingLine +
    couponLine +
    `\n🛒 *Compre aqui com desconto:* \n👉 ${product.affiliateUrl}\n\n` +
    `⚠️ _Atenção: Os preços e estoques podem variar a qualquer momento._`
  );
}

/**
 * Generates an optimized, anti-spam message for WhatsApp
 */
export function generateAffiliateMessage(
  product: Product,
  config: AntiSpamConfig = DEFAULT_ANTISPAM_CONFIG,
  customTemplate?: string
): string {
  const headerVariations = [
    '{🔥 MEGA OFERTA!|⚡ OLHA ESSE PREÇO!|🚨 BAIXOU MUITO!|💥 ACHADINHO IMPERDÍVEL!|⭐ OFERTA RELÂMPAGO!}',
    '{😱 Menor preço dos últimos meses!|👀 Acabou de entrar em promoção!|🏷️ Desconto exclusivo liberado!|🛒 Achado top no grupo!}',
  ];

  const ctaVariations = [
    '{👉 Garanta o seu aqui:|👉 Link com desconto aplicado:|👉 Pegue aqui antes que acabe:|👉 Confira no link oficial:}',
  ];

  const urgencyVariations = [
    '{⚠️ Corre antes que o estoque esgote!|⏳ Promoção por tempo limitado!|📦 Estoque promocional acabando!|⚠️ Preço pode subir a qualquer momento!}',
  ];

  let rawTemplate = customTemplate;

  if (!rawTemplate) {
    rawTemplate = `[HEADER_1]
[HEADER_2]

📦 *{PRODUCT_TITLE}*

❌ De: ~{ORIGINAL_PRICE}~
🔥 *Por apenas: {PROMO_PRICE}* ({DISCOUNT}% OFF!)
{INSTALLMENTS}
{COUPON}
{SHIPPING}

{CTA}
🔗 {AFFILIATE_LINK}

{URGENCY}
`;
  }

  // Replace placeholders
  let message = rawTemplate
    .replace('[HEADER_1]', headerVariations[0])
    .replace('[HEADER_2]', headerVariations[1])
    .replace('{PRODUCT_TITLE}', product.title)
    .replace('{ORIGINAL_PRICE}', formatCurrencyBRL(product.originalPrice))
    .replace('{PROMO_PRICE}', formatCurrencyBRL(product.promotionalPrice))
    .replace('{DISCOUNT}', product.discountPercentage.toString())
    .replace('{CTA}', ctaVariations[0])
    .replace('{AFFILIATE_LINK}', product.affiliateUrl)
    .replace('{URGENCY}', urgencyVariations[0]);

  if (product.installments) {
    message = message.replace('{INSTALLMENTS}', `💳 *${product.installments}*`);
  } else {
    message = message.replace('{INSTALLMENTS}\n', '');
  }

  if (product.couponCode) {
    message = message.replace('{COUPON}', `🎟️ Cupom: *${product.couponCode}*`);
  } else {
    message = message.replace('{COUPON}\n', '');
  }

  if (product.freeShipping) {
    message = message.replace('{SHIPPING}', `🚚 *Frete Grátis disponível*`);
  } else {
    message = message.replace('{SHIPPING}\n', '');
  }

  // Resolve spintax variations if enabled
  if (config.useSpintax) {
    message = resolveSpintax(message);
  } else {
    // strip spintax brackets and take first option
    message = message.replace(/\{([^{}]+)\}/g, (_, choices) => choices.split('|')[0]);
  }

  // Anti-spam invisible character or micro-salt so WhatsApp doesn't flag exact SHA256 message duplicates
  if (config.appendRandomHash) {
    const invisibleChars = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
    const randomSalt = Array.from({ length: 3 }, () =>
      invisibleChars[Math.floor(Math.random() * invisibleChars.length)]
    ).join('');
    message += randomSalt;
  }

  return message.trim();
}

/**
 * Calculates a random anti-spam delay in seconds between min and max minutes
 */
export function calculateRandomDelay(minMinutes: number, maxMinutes: number): number {
  const minSeconds = Math.max(1, minMinutes * 60);
  const maxSeconds = Math.max(minSeconds, maxMinutes * 60);
  return Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
}

/**
 * Checks if current time is within night pause window
 */
export function isNightPauseActive(start: string, end: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + (startMin || 0);
  const endTotalMinutes = endHour * 60 + (endMin || 0);

  if (startTotalMinutes > endTotalMinutes) {
    // Over midnight (e.g. 22:00 to 08:00)
    return currentMinutes >= startTotalMinutes || currentMinutes < endTotalMinutes;
  } else {
    return currentMinutes >= startTotalMinutes && currentMinutes < endTotalMinutes;
  }
}

/**
 * Calculates WhatsApp Safety Score (0-100) based on anti-spam configuration
 */
export function calculateSafetyScore(config: AntiSpamConfig, messagesSentToday: number): {
  score: number;
  level: 'Alto' | 'Médio' | 'Baixo';
  color: string;
  recommendations: string[];
} {
  let score = 100;
  const recommendations: string[] = [];

  if (!config.enabled) {
    return {
      score: 15,
      level: 'Alto',
      color: 'text-red-500',
      recommendations: ['Ative o motor anti-spam imediatamente para proteger seu número contra banimentos.'],
    };
  }

  if (config.minIntervalMinutes < 3) {
    score -= 25;
    recommendations.push('Aumente o intervalo mínimo entre mensagens para pelo menos 3 a 5 minutos.');
  }

  if (!config.randomInterval) {
    score -= 15;
    recommendations.push('Ative os intervalos randômicos para evitar detecção de robô por frequência exata.');
  }

  if (!config.useSpintax) {
    score -= 20;
    recommendations.push('Ative as variações Spintax para que cada mensagem enviada tenha texto e emojis diferentes.');
  }

  if (!config.simulateTyping) {
    score -= 10;
    recommendations.push('Ative a simulação de "digitando..." antes do envio para reproduzir comportamento humano.');
  }

  if (!config.nightPauseEnabled) {
    score -= 10;
    recommendations.push('Ative a pausa noturna para não incomodar membros e evitar denúncias de spam.');
  }

  if (messagesSentToday > config.maxMessagesPerDay) {
    score -= 20;
    recommendations.push(`Você já atingiu o limite seguro diário (${messagesSentToday}/${config.maxMessagesPerDay}). Pause os disparos até amanhã.`);
  }

  if (score >= 80) {
    return {
      score,
      level: 'Baixo',
      color: 'text-emerald-500',
      recommendations: ['Configurações excelentes! O bot está operando em padrão de alta segurança contra bloqueios.'],
    };
  } else if (score >= 50) {
    return {
      score,
      level: 'Médio',
      color: 'text-amber-500',
      recommendations,
    };
  } else {
    return {
      score: Math.max(10, score),
      level: 'Alto',
      color: 'text-red-500',
      recommendations,
    };
  }
}
