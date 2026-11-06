import { Product, WhatsAppGroup, ScheduleItem, DispatchLog, AffiliateSettings } from '../types';

// Padrão de fábrica: 100% zerado, sem modelos ou dados falsos pré-carregados
export const INITIAL_GROUPS: WhatsAppGroup[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_SCHEDULES: ScheduleItem[] = [];

export const INITIAL_LOGS: DispatchLog[] = [];

export const DEFAULT_AFFILIATE_SETTINGS: AffiliateSettings = {
  mercadoLivreTag: '',
  shopeeAffiliateId: '',
  amazonTag: '',
  magaluId: '',
  defaultTemplate: `[HEADER_1]
[HEADER_2]

📦 *{PRODUCT_TITLE}*

❌ De: ~{ORIGINAL_PRICE}~
🔥 *Por apenas: {PROMO_PRICE}* ({DISCOUNT}% OFF!)
{INSTALLMENTS}
{COUPON}
{SHIPPING}

{CTA}
🔗 {AFFILIATE_LINK}

{URGENCY}`,
};
