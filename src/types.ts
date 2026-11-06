export type Marketplace = 'mercadolivre' | 'shopee' | 'amazon' | 'magalu' | 'aliexpress' | 'other';

export interface Product {
  id: string;
  title: string;
  description: string;
  originalPrice: number;
  promotionalPrice: number;
  discountPercentage: number;
  marketplace: Marketplace;
  originalUrl: string;
  affiliateUrl: string;
  imageUrl: string;
  category: string;
  commissionRate: number; // e.g. 11 for 11%
  estimatedProfit: number; // In BRL (R$)
  couponCode?: string;
  freeShipping?: boolean;
  installments?: string;
  rating?: number;
  reviewsCount?: number;
  externalId?: string;
  importedViaExtension?: boolean;
  isDispatchedToday?: boolean;
  createdAt: string;
}

export interface DailySlot {
  id: string;
  time: string; // "09:00"
  productId: string;
  product?: Product;
  targetGroupIds: string[];
  status: 'pending' | 'sending' | 'sent' | 'skipped';
  sentAt?: string;
  logId?: string;
}

export interface DailySchedulePlan {
  date: string; // "YYYY-MM-DD"
  isActive: boolean;
  slots: DailySlot[];
  intervalMinutes: number;
  startHour: string;
  endHour: string;
}

export interface ExtensionProductImportPayload {
  title: string;
  originalUrl: string;
  affiliateUrl?: string;
  imageUrl?: string;
  originalPrice?: number;
  promotionalPrice: number;
  marketplace: Marketplace;
  category?: string;
  externalId?: string;
  installments?: string;
  couponCode?: string;
  freeShipping?: boolean;
}

export interface WhatsAppGroup {
  id: string; // JID or unique ID (e.g. 120363023456789@g.us)
  name: string;
  description?: string;
  membersCount: number;
  isSelected: boolean;
  avatarUrl?: string;
  isCommunity?: boolean;
  isAnnouncementOnly?: boolean;
  joinedAt?: string;
  category?: string;
  customTemplate?: string;
  inviteUrl?: string;
}

export interface AntiSpamConfig {
  enabled: boolean;
  minIntervalMinutes: number; // e.g. 5 min
  maxIntervalMinutes: number; // e.g. 15 min
  randomInterval: boolean;
  simulateTyping: boolean;
  typingDurationSeconds: number; // 3-7s
  maxMessagesPerDay: number; // e.g. 20
  nightPauseEnabled: boolean;
  nightPauseStart: string; // "22:00"
  nightPauseEnd: string; // "08:00"
  useSpintax: boolean;
  warmupMode: boolean; // safe gradual sending for newer accounts
  appendRandomHash: boolean; // invisible zero-width or micro-timestamp to ensure unique hash
}

export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'hourly_interval';

export interface ScheduleItem {
  id: string;
  productId: string;
  product?: Product;
  targetGroupIds: string[];
  targetGroupNames?: string[];
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  frequency: ScheduleFrequency;
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday...
  month?: number; // 1-12
  status: 'pending' | 'sending' | 'sent' | 'paused' | 'failed';
  lastSentAt?: string;
  nextRunAt?: string;
  customMessageTemplate?: string;
  notes?: string;
  repeatIntervalHours?: number;
}

export interface DispatchLog {
  id: string;
  timestamp: string;
  productId: string;
  productTitle: string;
  marketplace: Marketplace;
  groupId: string;
  groupName: string;
  status: 'success' | 'failed' | 'simulated';
  messagePreview: string;
  antiSpamDelayAppliedSeconds: number;
  commissionEstimated: number;
  error?: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  state: 'disconnected' | 'connecting' | 'connected' | 'error';
  qrCodeDataUrl: string | null;
  pairingCode?: string | null;
  phoneNumber: string | null;
  userName: string | null;
  batteryLevel?: number;
  lastConnectedAt?: string;
  mode: 'baileys_live' | 'simulator_test';
  messagesSentToday: number;
  error?: string | null;
}

export interface AffiliateSettings {
  mercadoLivreTag: string;
  shopeeAffiliateId: string;
  amazonTag: string;
  magaluId: string;
  defaultTemplate: string;
}

export interface StatsSummary {
  totalProducts: number;
  totalSchedules: number;
  totalDispatchedToday: number;
  totalDispatchedAllTime: number;
  totalEstimatedProfit: number;
  profitByMarketplace: {
    mercadolivre: number;
    shopee: number;
    amazon: number;
    magalu: number;
    other: number;
  };
  topProfitableProducts: Product[];
  safetyScore: number;
}
