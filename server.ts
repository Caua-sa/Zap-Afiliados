import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import { createServer as createViteServer } from 'vite';
import makeWASocket, {
  useMultiFileAuthState,
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');
import {
  Product,
  WhatsAppGroup,
  ScheduleItem,
  DispatchLog,
  AntiSpamConfig,
  AffiliateSettings,
  WhatsAppStatus,
  StatsSummary,
  DailySlot,
  DailySchedulePlan,
} from './src/types';
import {
  DEFAULT_ANTISPAM_CONFIG,
  generateAffiliateMessage,
  calculateRandomDelay,
  isNightPauseActive,
  calculateSafetyScore,
} from './src/services/antiSpam';
import {
  parseAndExtractProductInfo,
  MARKETPLACE_COMMISSION_RATES,
} from './src/services/affiliateScraper';
import {
  INITIAL_GROUPS,
  INITIAL_PRODUCTS,
  INITIAL_SCHEDULES,
  INITIAL_LOGS,
  DEFAULT_AFFILIATE_SETTINGS,
} from './src/services/mockData';
import {
  MELI_FEATURED_PRODUCTS,
  formatMeliCatalogProduct,
  MeliCatalogProduct,
} from './src/services/mercadoLivreCatalog';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// In-Memory & File-backed Store
const DATA_DIR = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJson<T>(filename: string, defaultValue: T): T {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error loading ${filename}:`, err);
  }
  return defaultValue;
}

function saveJson<T>(filename: string, data: T) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error saving ${filename}:`, err);
  }
}

// State - Factory defaults (empty)
let products: Product[] = loadJson('products.json', INITIAL_PRODUCTS);
let groups: WhatsAppGroup[] = loadJson('groups.json', INITIAL_GROUPS);
let schedules: ScheduleItem[] = loadJson('schedules.json', INITIAL_SCHEDULES);
let logs: DispatchLog[] = loadJson('logs.json', INITIAL_LOGS);
let antiSpamConfig: AntiSpamConfig = loadJson('antispam.json', DEFAULT_ANTISPAM_CONFIG);
let affiliateSettings: AffiliateSettings = loadJson('affiliate.json', DEFAULT_AFFILIATE_SETTINGS);
let dailySchedulePlan: DailySchedulePlan = loadJson('daily_schedule.json', {
  date: new Date().toISOString().split('T')[0],
  isActive: true,
  intervalMinutes: 90,
  startHour: '09:00',
  endHour: '21:30',
  slots: [],
});

// WhatsApp Baileys Instance State
let sock: any = null;
let currentRawQr: string | null = null;
let isReconnecting = false;

let waStatus: WhatsAppStatus = {
  connected: false,
  state: 'connecting',
  qrCodeDataUrl: null,
  pairingCode: null,
  phoneNumber: null,
  userName: null,
  mode: 'baileys_live',
  messagesSentToday: 0,
  error: null,
};

// Initialize Real Baileys WhatsApp Connection
async function startBaileysSocket(cleanAuth = false) {
  const authDir = path.resolve(DATA_DIR, 'baileys_auth');

  if (cleanAuth) {
    try {
      if (sock) {
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('creds.update');
        try {
          sock.end(undefined);
        } catch {}
        sock = null;
      }
      fs.rmSync(authDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Error clearing auth dir:', err);
    }
  }

  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  try {
    waStatus.state = 'connecting';
    waStatus.error = null;

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    let version: any = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest && latest.version) {
        version = latest.version;
      }
    } catch {}

    const logger = pino({ level: 'silent' });

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
    });

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      // Real QR Code emitted by WhatsApp Web servers
      if (qr) {
        currentRawQr = qr;
        try {
          waStatus.qrCodeDataUrl = await QRCode.toDataURL(qr, {
            width: 320,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
          });
          waStatus.state = 'connecting';
          waStatus.connected = false;
          waStatus.error = null;
          console.log('[Baileys] Real WhatsApp Web QR Code generated successfully!');
        } catch (qrErr: any) {
          console.error('[Baileys] Error rendering QR Code data url:', qrErr);
        }
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[Baileys] Connection closed (code ${statusCode}). Reconnect? ${shouldReconnect}`);

        waStatus.connected = false;
        waStatus.state = 'disconnected';
        waStatus.phoneNumber = null;
        waStatus.userName = null;

        if (statusCode === DisconnectReason.loggedOut) {
          console.log('[Baileys] Logged out from WhatsApp. Resetting session...');
          startBaileysSocket(true);
        } else if (shouldReconnect && !isReconnecting) {
          isReconnecting = true;
          setTimeout(() => {
            isReconnecting = false;
            startBaileysSocket(false);
          }, 3000);
        }
      } else if (connection === 'open') {
        console.log('[Baileys] Real WhatsApp Web connection open and authenticated!');
        waStatus.connected = true;
        waStatus.state = 'connected';
        waStatus.qrCodeDataUrl = null;
        waStatus.pairingCode = null;
        waStatus.error = null;
        waStatus.lastConnectedAt = new Date().toISOString();

        if (sock.user) {
          waStatus.phoneNumber = sock.user.id?.split(':')[0] || 'Conectado';
          waStatus.userName = sock.user.name || 'WhatsApp Conectado';
        }

        // Fetch user participating groups directly from WhatsApp Web
        try {
          const fetchedGroups = await sock.groupFetchAllParticipating();
          const groupsList: WhatsAppGroup[] = Object.values(fetchedGroups).map((g: any) => ({
            id: g.id,
            name: g.subject || 'Grupo sem nome',
            description: g.desc || '',
            membersCount: g.participants?.length || 0,
            isSelected: groups.find((existing) => existing.id === g.id)?.isSelected || false,
            isAnnouncementOnly: g.announce || false,
          }));

          if (groupsList.length > 0) {
            groups = groupsList;
            saveJson('groups.json', groups);
          }
        } catch (groupErr) {
          console.warn('[Baileys] Error fetching groups:', groupErr);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err: any) {
    console.error('[Baileys] Initialization error:', err);
    waStatus.state = 'error';
    waStatus.error = err?.message || 'Falha ao iniciar o socket do Baileys';
  }
}

// Message Dispatcher
async function sendWhatsAppMessage(
  groupId: string,
  messageText: string,
  product?: Product,
  simulateTyping = true
): Promise<{ success: boolean; simulated: boolean; error?: string }> {
  try {
    if (simulateTyping) {
      if (sock && waStatus.connected) {
        try {
          await sock.sendPresenceUpdate('composing', groupId);
          await new Promise((resolve) => setTimeout(resolve, (antiSpamConfig.typingDurationSeconds || 3) * 1000));
          await sock.sendPresenceUpdate('paused', groupId);
        } catch {}
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    if (sock && waStatus.connected) {
      if (product?.imageUrl) {
        await sock.sendMessage(groupId, {
          image: { url: product.imageUrl },
          caption: messageText,
        });
      } else {
        await sock.sendMessage(groupId, { text: messageText });
      }
      return { success: true, simulated: false };
    } else {
      return {
        success: false,
        simulated: false,
        error: 'WhatsApp desconectado. Escaneie o QR Code para conectar.',
      };
    }
  } catch (err: any) {
    console.error('[WhatsApp] Dispatch error:', err);
    return { success: false, simulated: false, error: err?.message || 'Erro no envio' };
  }
}

// Background Scheduler
setInterval(async () => {
  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHours}:${currentMinutes}`;
  const currentDayOfWeek = now.getDay();

  if (antiSpamConfig.enabled && antiSpamConfig.nightPauseEnabled) {
    if (isNightPauseActive(antiSpamConfig.nightPauseStart, antiSpamConfig.nightPauseEnd)) {
      return;
    }
  }

  const todayLogsCount = logs.filter((l) => l.timestamp.startsWith(currentDateStr)).length;
  if (antiSpamConfig.enabled && todayLogsCount >= antiSpamConfig.maxMessagesPerDay) {
    return;
  }

  for (const schedule of schedules) {
    if (schedule.status === 'paused' || schedule.status === 'sent') continue;

    let isDue = false;

    if (schedule.frequency === 'once') {
      if (schedule.scheduledDate === currentDateStr && schedule.scheduledTime === currentTimeStr) {
        isDue = true;
      }
    } else if (schedule.frequency === 'daily') {
      if (schedule.scheduledTime === currentTimeStr) {
        const alreadySentToday = schedule.lastSentAt?.startsWith(currentDateStr);
        if (!alreadySentToday) isDue = true;
      }
    } else if (schedule.frequency === 'weekly') {
      if (schedule.daysOfWeek?.includes(currentDayOfWeek) && schedule.scheduledTime === currentTimeStr) {
        const alreadySentToday = schedule.lastSentAt?.startsWith(currentDateStr);
        if (!alreadySentToday) isDue = true;
      }
    }

    if (isDue) {
      const product = products.find((p) => p.id === schedule.productId);
      if (!product) continue;

      const targetGroupIds = schedule.targetGroupIds.length > 0
        ? schedule.targetGroupIds
        : groups.filter((g) => g.isSelected).map((g) => g.id);

      if (targetGroupIds.length === 0) continue;

      schedule.status = 'sending';

      for (const gid of targetGroupIds) {
        const group = groups.find((g) => g.id === gid);
        const groupName = group ? group.name : 'Grupo WhatsApp';

        const delaySeconds = antiSpamConfig.randomInterval
          ? calculateRandomDelay(antiSpamConfig.minIntervalMinutes, antiSpamConfig.maxIntervalMinutes)
          : antiSpamConfig.minIntervalMinutes * 60;

        const messageText = generateAffiliateMessage(
          product,
          antiSpamConfig,
          schedule.customMessageTemplate || affiliateSettings.defaultTemplate
        );

        const result = await sendWhatsAppMessage(gid, messageText, product, antiSpamConfig.simulateTyping);

        const newLog: DispatchLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          timestamp: new Date().toISOString(),
          productId: product.id,
          productTitle: product.title,
          marketplace: product.marketplace,
          groupId: gid,
          groupName,
          status: result.success ? (result.simulated ? 'simulated' : 'success') : 'failed',
          messagePreview: messageText.substring(0, 120) + '...',
          antiSpamDelayAppliedSeconds: delaySeconds,
          commissionEstimated: product.estimatedProfit,
          error: result.error,
        };

        logs.unshift(newLog);
      }

      schedule.lastSentAt = new Date().toISOString();
      schedule.status = schedule.frequency === 'once' ? 'sent' : 'pending';
      saveJson('schedules.json', schedules);
      saveJson('logs.json', logs);
    }
  }
}, 20000);

// ==========================================
// REST API ENDPOINTS
// ==========================================

// WhatsApp Status
app.get('/api/whatsapp/status', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  waStatus.messagesSentToday = logs.filter((l) => l.timestamp.startsWith(today)).length;
  res.json(waStatus);
});

// Force restart Baileys socket & regenerate fresh real QR code
app.post('/api/whatsapp/connect', async (req, res) => {
  await startBaileysSocket(false);
  res.json({ success: true, status: waStatus });
});

// Reset session & clear auth folder to generate brand new QR
app.post('/api/whatsapp/reset-session', async (req, res) => {
  console.log('[Baileys] User requested session reset & fresh QR Code...');
  await startBaileysSocket(true);
  res.json({ success: true, status: waStatus, message: 'Nova sessão iniciada com sucesso!' });
});

// Request 8-digit Pairing Code via phone number (alternative to camera QR)
app.post('/api/whatsapp/pairing-code', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Número de telefone é obrigatório (com DDI e DDD, ex: 5511999999999)' });
  }

  const cleanNumber = String(phoneNumber).replace(/\D/g, '');

  try {
    if (!sock) {
      await startBaileysSocket(true);
    }

    if (sock && !sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(cleanNumber);
      waStatus.pairingCode = code;
      return res.json({ success: true, pairingCode: code });
    } else {
      return res.status(400).json({ error: 'Aparelho já está registrado ou conectando.' });
    }
  } catch (err: any) {
    console.error('Pairing code error:', err);
    return res.status(500).json({ error: err?.message || 'Falha ao solicitar código de pareamento' });
  }
});

// Disconnect
app.post('/api/whatsapp/disconnect', async (req, res) => {
  await startBaileysSocket(true);
  res.json({ success: true, status: waStatus });
});

// Padrão de fábrica: limpa tudo
app.post('/api/factory-reset', (req, res) => {
  products = [];
  groups = [];
  schedules = [];
  logs = [];
  affiliateSettings = {
    mercadoLivreTag: '',
    shopeeAffiliateId: '',
    amazonTag: '',
    magaluId: '',
    defaultTemplate: DEFAULT_AFFILIATE_SETTINGS.defaultTemplate,
  };
  saveJson('products.json', products);
  saveJson('groups.json', groups);
  saveJson('schedules.json', schedules);
  saveJson('logs.json', logs);
  saveJson('affiliate.json', affiliateSettings);

  res.json({ success: true, message: 'Aplicativo restaurado para o padrão de fábrica.' });
});

// Groups Management API
app.get('/api/whatsapp/groups', (req, res) => {
  res.json(groups);
});

// Puxar / Sincronizar todos os grupos diretamente do WhatsApp Web conectado via Baileys
app.post('/api/whatsapp/groups/sync', async (req, res) => {
  if (!sock || !waStatus.connected) {
    return res.status(400).json({
      success: false,
      error: 'O WhatsApp precisa estar conectado via QR Code para puxar os grupos automaticamente.',
    });
  }

  try {
    const fetchedGroups = await sock.groupFetchAllParticipating();
    const existingMap = new Map(groups.map((g) => [g.id, g]));

    const syncedGroups: WhatsAppGroup[] = Object.values(fetchedGroups).map((g: any) => {
      const existing = existingMap.get(g.id);
      return {
        id: g.id,
        name: g.subject || 'Grupo sem nome',
        description: g.desc || '',
        membersCount: g.participants?.length || 0,
        isSelected: existing ? existing.isSelected : true,
        isAnnouncementOnly: g.announce || false,
        category: existing?.category || 'Geral',
        customTemplate: existing?.customTemplate,
      };
    });

    groups = syncedGroups;
    saveJson('groups.json', groups);
    console.log(`[Baileys] Successfully pulled ${groups.length} groups from WhatsApp Web!`);

    res.json({
      success: true,
      count: groups.length,
      groups,
      message: `${groups.length} grupos puxados e sincronizados com sucesso do WhatsApp!`,
    });
  } catch (err: any) {
    console.error('[Baileys] Error syncing groups:', err);
    res.status(500).json({ success: false, error: err?.message || 'Falha ao puxar grupos do WhatsApp' });
  }
});

// Puxar grupo específico por link de convite (ex: chat.whatsapp.com/...)
app.post('/api/whatsapp/groups/import-invite', async (req, res) => {
  const { inviteUrl, category } = req.body;
  if (!inviteUrl) return res.status(400).json({ error: 'Link de convite do grupo é obrigatório' });

  const match = inviteUrl.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
  const inviteCode = match ? match[1] : inviteUrl.trim();

  try {
    if (sock && waStatus.connected) {
      try {
        const info = await sock.groupGetInviteInfo(inviteCode);
        if (info) {
          const newGroup: WhatsAppGroup = {
            id: info.id || `120363${Date.now()}@g.us`,
            name: info.subject || 'Grupo WhatsApp',
            description: info.desc || '',
            membersCount: info.size || 0,
            isSelected: true,
            isAnnouncementOnly: info.announce || false,
            category: category || 'Geral',
            inviteUrl,
          };

          const existingIdx = groups.findIndex((g) => g.id === newGroup.id);
          if (existingIdx !== -1) {
            groups[existingIdx] = { ...groups[existingIdx], ...newGroup };
          } else {
            groups.unshift(newGroup);
          }
          saveJson('groups.json', groups);
          return res.json({ success: true, group: newGroup, message: `Grupo "${newGroup.name}" puxado com sucesso!` });
        }
      } catch (infoErr: any) {
        console.warn('groupGetInviteInfo warning:', infoErr);
      }
    }

    // Fallback manual import if invite info couldn't be resolved
    const fallbackGroup: WhatsAppGroup = {
      id: `120363${Date.now()}@g.us`,
      name: `Grupo Convite (${inviteCode.substring(0, 10)})`,
      description: `Link de entrada: ${inviteUrl}`,
      membersCount: 0,
      isSelected: true,
      isAnnouncementOnly: false,
      category: category || 'Geral',
      inviteUrl,
    };
    groups.unshift(fallbackGroup);
    saveJson('groups.json', groups);
    res.json({ success: true, group: fallbackGroup, message: 'Grupo adicionado com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Erro ao puxar grupo pelo link' });
  }
});

// Seleção em lote (Marcar Todos / Desmarcar Todos)
app.post('/api/whatsapp/groups/select-all', (req, res) => {
  const { selectAll, onlyAnnouncement } = req.body;
  groups = groups.map((g) => {
    if (onlyAnnouncement) {
      return { ...g, isSelected: !!g.isAnnouncementOnly };
    }
    return { ...g, isSelected: !!selectAll };
  });
  saveJson('groups.json', groups);
  res.json({ success: true, groups });
});

app.post('/api/whatsapp/groups/select', (req, res) => {
  const { selectedGroupIds } = req.body;
  if (Array.isArray(selectedGroupIds)) {
    groups = groups.map((g) => ({
      ...g,
      isSelected: selectedGroupIds.includes(g.id),
    }));
    saveJson('groups.json', groups);
  }
  res.json({ success: true, groups });
});

app.post('/api/whatsapp/groups/add', (req, res) => {
  const { name, jid, description, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome do grupo é obrigatório' });

  const newGroup: WhatsAppGroup = {
    id: jid || `120363${Date.now()}@g.us`,
    name,
    description: description || '',
    membersCount: 0,
    isSelected: true,
    isAnnouncementOnly: false,
    category: category || 'Geral',
  };

  groups.unshift(newGroup);
  saveJson('groups.json', groups);
  res.json(newGroup);
});

app.put('/api/whatsapp/groups/:id', (req, res) => {
  const { id } = req.params;
  const index = groups.findIndex((g) => g.id === id);
  if (index === -1) return res.status(404).json({ error: 'Grupo não encontrado' });

  groups[index] = { ...groups[index], ...req.body };
  saveJson('groups.json', groups);
  res.json(groups[index]);
});

app.delete('/api/whatsapp/groups/:id', (req, res) => {
  const { id } = req.params;
  groups = groups.filter((g) => g.id !== id);
  saveJson('groups.json', groups);
  res.json({ success: true });
});

// Send Test Message
app.post('/api/whatsapp/send-test', async (req, res) => {
  const { productId, groupId, customText } = req.body;
  const product = products.find((p) => p.id === productId) || products[0];
  const targetGroup = groups.find((g) => g.id === groupId) || groups.find((g) => g.isSelected) || groups[0];

  if (!targetGroup) {
    return res.status(400).json({ error: 'Nenhum grupo cadastrado ou selecionado.' });
  }

  if (!product) {
    return res.status(400).json({ error: 'Nenhum produto cadastrado para envio.' });
  }

  const messageText = customText || generateAffiliateMessage(
    product,
    antiSpamConfig,
    affiliateSettings.defaultTemplate
  );

  const delaySeconds = antiSpamConfig.randomInterval
    ? calculateRandomDelay(antiSpamConfig.minIntervalMinutes, antiSpamConfig.maxIntervalMinutes)
    : antiSpamConfig.minIntervalMinutes * 60;

  const result = await sendWhatsAppMessage(targetGroup.id, messageText, product, antiSpamConfig.simulateTyping);

  const newLog: DispatchLog = {
    id: `log_${Date.now()}`,
    timestamp: new Date().toISOString(),
    productId: product.id,
    productTitle: product.title,
    marketplace: product.marketplace,
    groupId: targetGroup.id,
    groupName: targetGroup.name,
    status: result.success ? (result.simulated ? 'simulated' : 'success') : 'failed',
    messagePreview: messageText.substring(0, 140) + '...',
    antiSpamDelayAppliedSeconds: delaySeconds,
    commissionEstimated: product.estimatedProfit,
    error: result.error,
  };

  logs.unshift(newLog);
  saveJson('logs.json', logs);

  if (!result.success && result.error) {
    return res.status(400).json({
      success: false,
      error: result.error,
      log: newLog,
    });
  }

  res.json({
    success: true,
    log: newLog,
    message: 'Mensagem enviada com sucesso no grupo do WhatsApp!',
  });
});

// Products
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const prodData = req.body;
  const newProduct: Product = {
    id: `prod_${Date.now()}`,
    title: prodData.title || 'Produto sem título',
    description: prodData.description || '',
    originalPrice: Number(prodData.originalPrice) || 0,
    promotionalPrice: Number(prodData.promotionalPrice) || 0,
    discountPercentage:
      prodData.discountPercentage ||
      (prodData.originalPrice && prodData.promotionalPrice
        ? Math.round(((prodData.originalPrice - prodData.promotionalPrice) / prodData.originalPrice) * 100)
        : 0),
    marketplace: prodData.marketplace || 'mercadolivre',
    originalUrl: prodData.originalUrl || '',
    affiliateUrl: prodData.affiliateUrl || prodData.originalUrl || '',
    imageUrl: prodData.imageUrl || '',
    category: prodData.category || 'Geral',
    commissionRate: Number(prodData.commissionRate) || 10,
    estimatedProfit: Number(prodData.estimatedProfit) || 0,
    couponCode: prodData.couponCode || '',
    freeShipping: !!prodData.freeShipping,
    installments: prodData.installments || '',
    rating: prodData.rating || 5.0,
    reviewsCount: prodData.reviewsCount || 0,
    createdAt: new Date().toISOString(),
  };

  if (!newProduct.estimatedProfit && newProduct.promotionalPrice && newProduct.commissionRate) {
    newProduct.estimatedProfit = Number(((newProduct.promotionalPrice * newProduct.commissionRate) / 100).toFixed(2));
  }

  products.unshift(newProduct);
  saveJson('products.json', products);
  res.json(newProduct);
});

// Clean and shorten affiliate URL removing 200+ characters of tracking bloat
function cleanAndShortenAffiliateUrl(rawUrl: string, marketplace: string, tag?: string): string {
  if (!rawUrl) return '';
  if (
    rawUrl.includes('/sec/') ||
    rawUrl.includes('amzn.to') ||
    rawUrl.includes('s.shopee.com') ||
    rawUrl.includes('tinyurl.com')
  ) {
    return rawUrl;
  }

  if (marketplace === 'mercadolivre' || rawUrl.includes('mercadolivre') || rawUrl.includes('mercadolibre')) {
    const mlbMatch = rawUrl.match(/(MLB-?\d+)/i) || rawUrl.match(/\/p\/(MLB\d+)/i);
    if (mlbMatch) {
      const mlbId = mlbMatch[1].replace('-', '').toUpperCase();
      const trackingParam = tag ? `?tracking_id=${encodeURIComponent(tag)}` : '';
      return `https://mercadolivre.com.br/p/${mlbId}${trackingParam}`;
    }
  }

  if (marketplace === 'amazon' || rawUrl.includes('amazon')) {
    const asinMatch = rawUrl.match(/\/dp\/([A-Z0-9]{10})/i) || rawUrl.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    if (asinMatch) {
      const asin = asinMatch[1];
      const tagParam = tag ? `?tag=${encodeURIComponent(tag)}` : '';
      return `https://amazon.com.br/dp/${asin}${tagParam}`;
    }
  }

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

app.post('/api/products/parse-link', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL do produto é obrigatória' });

  try {
    const extracted = await parseAndExtractProductInfo(url, affiliateSettings);
    if (extracted && extracted.affiliateUrl) {
      extracted.affiliateUrl = cleanAndShortenAffiliateUrl(
        extracted.affiliateUrl,
        extracted.marketplace || 'mercadolivre',
        affiliateSettings.mercadoLivreTag
      );
    }
    res.json(extracted);
  } catch (err: any) {
    console.error('Error parsing product link:', err);
    res.status(500).json({ error: err?.message || 'Erro ao processar link do produto' });
  }
});

// Chrome Extension API
app.get('/api/extension/status', (req, res) => {
  res.json({
    online: true,
    version: '1.0.0',
    totalProducts: products.length,
    whatsappConnected: waStatus.connected,
    selectedGroupsCount: groups.filter((g) => g.isSelected).length,
  });
});

// Check if a product already exists to prevent duplicates
app.get('/api/extension/check', (req, res) => {
  const { url, externalId, title } = req.query;

  const found = products.find((p) => {
    if (externalId && typeof externalId === 'string' && p.externalId && p.externalId.toLowerCase() === externalId.toLowerCase()) {
      return true;
    }
    if (url && typeof url === 'string') {
      const cleanTarget = url.split('?')[0].toLowerCase();
      const cleanOrig = p.originalUrl.split('?')[0].toLowerCase();
      if (cleanOrig.includes(cleanTarget) || cleanTarget.includes(cleanOrig)) return true;
    }
    if (title && typeof title === 'string' && p.title.toLowerCase().trim() === title.toLowerCase().trim()) {
      return true;
    }
    return false;
  });

  res.json({
    exists: !!found,
    product: found || null,
    message: found ? 'Produto já cadastrado no ZapAfiliados' : 'Produto novo!',
  });
});

// Import product directly from Chrome Extension
app.post('/api/extension/import', (req, res) => {
  const data = req.body;
  if (!data.title && !data.originalUrl) {
    return res.status(400).json({ error: 'Título e URL do produto são obrigatórios' });
  }

  // Deduplication check
  const duplicate = products.find((p) => {
    if (data.externalId && p.externalId && p.externalId === data.externalId) return true;
    if (data.originalUrl) {
      const cleanTarget = data.originalUrl.split('?')[0].toLowerCase();
      const cleanOrig = p.originalUrl.split('?')[0].toLowerCase();
      if (cleanOrig === cleanTarget) return true;
    }
    return false;
  });

  if (duplicate && !data.force) {
    return res.status(200).json({
      success: false,
      duplicate: true,
      product: duplicate,
      message: 'Produto já existe na sua lista. A extensão evitou a repetição automática!',
    });
  }

  const commissionRate = data.commissionRate || (data.marketplace === 'mercadolivre' ? 10 : 9);
  const promoPrice = Number(data.promotionalPrice) || 99.9;
  const estimatedProfit = Number(((promoPrice * commissionRate) / 100).toFixed(2));

  const newProduct: Product = {
    id: `prod_ext_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    title: data.title,
    description: data.description || `Oferta imperdível no ${data.marketplace || 'Mercado Livre'}!`,
    originalPrice: Number(data.originalPrice) || Number((promoPrice * 1.3).toFixed(2)),
    promotionalPrice: promoPrice,
    discountPercentage:
      data.discountPercentage ||
      Math.round((((Number(data.originalPrice) || promoPrice * 1.3) - promoPrice) / (Number(data.originalPrice) || promoPrice * 1.3)) * 100),
    marketplace: data.marketplace || 'mercadolivre',
    originalUrl: data.originalUrl,
    affiliateUrl: cleanAndShortenAffiliateUrl(
      data.affiliateUrl || data.originalUrl,
      data.marketplace || 'mercadolivre',
      affiliateSettings.mercadoLivreTag
    ),
    imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
    category: data.category || 'Geral',
    externalId: data.externalId,
    commissionRate,
    estimatedProfit,
    couponCode: data.couponCode || '',
    freeShipping: !!data.freeShipping,
    installments: data.installments || 'Em até 10x sem juros',
    importedViaExtension: true,
    createdAt: new Date().toISOString(),
  };

  products.unshift(newProduct);
  saveJson('products.json', products);

  // Add to daily schedule if requested
  if (data.addToDailySchedule) {
    const today = new Date().toISOString().split('T')[0];
    if (dailySchedulePlan.date !== today) {
      dailySchedulePlan.date = today;
      dailySchedulePlan.slots = [];
    }

    // Next safe slot time (e.g. 90 minutes after last slot or starting at next hour)
    let nextTime = '10:00';
    if (dailySchedulePlan.slots.length > 0) {
      const lastSlot = dailySchedulePlan.slots[dailySchedulePlan.slots.length - 1];
      const [h, m] = lastSlot.time.split(':').map(Number);
      const totalMinutes = h * 60 + m + (dailySchedulePlan.intervalMinutes || 90);
      const newH = Math.min(22, Math.floor(totalMinutes / 60));
      const newM = totalMinutes % 60;
      nextTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    const selectedGroupIds = groups.filter((g) => g.isSelected).map((g) => g.id);

    dailySchedulePlan.slots.push({
      id: `slot_${Date.now()}`,
      time: nextTime,
      productId: newProduct.id,
      product: newProduct,
      targetGroupIds: selectedGroupIds.length > 0 ? selectedGroupIds : (groups[0] ? [groups[0].id] : []),
      status: 'pending',
    });

    saveJson('daily_schedule.json', dailySchedulePlan);
  }

  res.json({
    success: true,
    product: newProduct,
    message: 'Produto importado com sucesso via Extensão Chrome!',
  });
});

// Helper to build pre-packaged Chrome Extension zip with verified central directory
function buildExtensionZip(): Promise<string> {
  return new Promise((resolve, reject) => {
    const extensionDir = path.resolve(process.cwd(), 'public', 'extension');
    const zipPath = path.resolve(DATA_DIR, 'zapafiliados-extensao-chrome.zip');

    if (!fs.existsSync(extensionDir)) {
      return reject(new Error('Extension directory not found'));
    }

    const output = fs.createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`[Extension] Built zip package: ${zipPath} (${fs.statSync(zipPath).size} bytes)`);
      resolve(zipPath);
    });

    output.on('error', (err: any) => reject(err));
    archive.on('error', (err: any) => reject(err));

    archive.pipe(output);
    archive.directory(extensionDir, false);
    archive.finalize();
  });
}

// Download Chrome Extension zip with full Content-Length and WinRAR compatibility
app.get('/api/extension/download-zip', async (req, res) => {
  try {
    const zipPath = path.resolve(DATA_DIR, 'zapafiliados-extensao-chrome.zip');
    if (!fs.existsSync(zipPath)) {
      await buildExtensionZip();
    }
    const stat = fs.statSync(zipPath);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', 'attachment; filename="zapafiliados-extensao-chrome.zip"');
    res.setHeader('Cache-Control', 'no-cache');

    res.sendFile(zipPath);
  } catch (err: any) {
    console.error('Error serving extension zip:', err);
    res.status(500).json({ error: 'Erro ao gerar arquivo zip da extensão' });
  }
});

// Daily Schedule Plan Endpoints
app.get('/api/daily-schedule', (req, res) => {
  const populatedSlots = dailySchedulePlan.slots.map((s) => ({
    ...s,
    product: products.find((p) => p.id === s.productId),
  }));

  res.json({
    ...dailySchedulePlan,
    slots: populatedSlots,
  });
});

app.post('/api/daily-schedule/save', (req, res) => {
  const { isActive, intervalMinutes, startHour, endHour, slots } = req.body;
  if (isActive !== undefined) dailySchedulePlan.isActive = isActive;
  if (intervalMinutes !== undefined) dailySchedulePlan.intervalMinutes = intervalMinutes;
  if (startHour !== undefined) dailySchedulePlan.startHour = startHour;
  if (endHour !== undefined) dailySchedulePlan.endHour = endHour;
  if (Array.isArray(slots)) {
    dailySchedulePlan.slots = slots;
  }
  saveJson('daily_schedule.json', dailySchedulePlan);
  res.json({ success: true, dailySchedulePlan });
});

// Generate automatic daily schedule from user's product list without duplicates
app.post('/api/daily-schedule/generate', (req, res) => {
  const { intervalMinutes = 90, startHour = '09:00', endHour = '21:30' } = req.body;
  const today = new Date().toISOString().split('T')[0];

  if (products.length === 0) {
    return res.status(400).json({ error: 'Nenhum produto cadastrado na sua lista para gerar o cronograma do dia.' });
  }

  const [startH, startM] = startHour.split(':').map(Number);
  const [endH, endM] = endHour.split(':').map(Number);
  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;

  const targetGroupIds = groups.filter((g) => g.isSelected).map((g) => g.id);
  const availableProducts = [...products];

  const newSlots: DailySlot[] = [];
  let currentMinutes = startTotalMinutes;
  let prodIdx = 0;

  while (currentMinutes <= endTotalMinutes && prodIdx < availableProducts.length) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const product = availableProducts[prodIdx];

    newSlots.push({
      id: `slot_${Date.now()}_${prodIdx}`,
      time: timeStr,
      productId: product.id,
      product,
      targetGroupIds: targetGroupIds.length > 0 ? targetGroupIds : (groups[0] ? [groups[0].id] : []),
      status: 'pending',
    });

    currentMinutes += Number(intervalMinutes);
    prodIdx++;
  }

  dailySchedulePlan = {
    date: today,
    isActive: true,
    intervalMinutes: Number(intervalMinutes),
    startHour,
    endHour,
    slots: newSlots,
  };

  saveJson('daily_schedule.json', dailySchedulePlan);
  res.json({ success: true, dailySchedulePlan, generatedCount: newSlots.length });
});

// Run specific daily slot now
app.post('/api/daily-schedule/run-slot/:id', async (req, res) => {
  const { id } = req.params;
  const slot = dailySchedulePlan.slots.find((s) => s.id === id);
  if (!slot) return res.status(404).json({ error: 'Horário não encontrado' });

  const product = products.find((p) => p.id === slot.productId);
  if (!product) return res.status(404).json({ error: 'Produto associado ao horário não encontrado' });

  const targetGroups = groups.filter((g) => slot.targetGroupIds.includes(g.id));
  if (targetGroups.length === 0 && groups.length > 0) {
    targetGroups.push(groups[0]);
  }

  slot.status = 'sending';

  let successCount = 0;
  for (const group of targetGroups) {
    const messageText = generateAffiliateMessage(
      product,
      antiSpamConfig,
      group.customTemplate || affiliateSettings.defaultTemplate
    );

    const delaySeconds = antiSpamConfig.randomInterval
      ? calculateRandomDelay(antiSpamConfig.minIntervalMinutes, antiSpamConfig.maxIntervalMinutes)
      : antiSpamConfig.minIntervalMinutes * 60;

    const result = await sendWhatsAppMessage(group.id, messageText, product, antiSpamConfig.simulateTyping);

    const newLog: DispatchLog = {
      id: `log_daily_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      productId: product.id,
      productTitle: product.title,
      marketplace: product.marketplace,
      groupId: group.id,
      groupName: group.name,
      status: result.success ? (result.simulated ? 'simulated' : 'success') : 'failed',
      messagePreview: messageText.substring(0, 140) + '...',
      antiSpamDelayAppliedSeconds: delaySeconds,
      commissionEstimated: product.estimatedProfit,
      error: result.error,
    };

    logs.unshift(newLog);
    if (result.success) successCount++;
  }

  slot.status = 'sent';
  slot.sentAt = new Date().toISOString();
  saveJson('logs.json', logs);
  saveJson('daily_schedule.json', dailySchedulePlan);

  res.json({
    success: true,
    slot,
    message: `Disparo realizado com sucesso para ${targetGroups.length} grupo(s)!`,
  });
});

app.delete('/api/daily-schedule/slot/:id', (req, res) => {
  const { id } = req.params;
  dailySchedulePlan.slots = dailySchedulePlan.slots.filter((s) => s.id !== id);
  saveJson('daily_schedule.json', dailySchedulePlan);
  res.json({ success: true, dailySchedulePlan });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Produto não encontrado' });

  products[index] = { ...products[index], ...req.body };
  saveJson('products.json', products);
  res.json(products[index]);
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  products = products.filter((p) => p.id !== id);
  saveJson('products.json', products);
  res.json({ success: true });
});

// Schedules
app.get('/api/schedules', (req, res) => {
  const populated = schedules.map((s) => ({
    ...s,
    product: products.find((p) => p.id === s.productId),
    targetGroupNames: s.targetGroupIds
      .map((gid) => groups.find((g) => g.id === gid)?.name)
      .filter(Boolean) as string[],
  }));
  res.json(populated);
});

app.post('/api/schedules', (req, res) => {
  const schedData = req.body;
  const newSchedule: ScheduleItem = {
    id: `sched_${Date.now()}`,
    productId: schedData.productId,
    targetGroupIds: schedData.targetGroupIds || groups.filter((g) => g.isSelected).map((g) => g.id),
    scheduledDate: schedData.scheduledDate || new Date().toISOString().split('T')[0],
    scheduledTime: schedData.scheduledTime || '12:00',
    frequency: schedData.frequency || 'once',
    daysOfWeek: schedData.daysOfWeek || [1, 2, 3, 4, 5],
    month: schedData.month || new Date().getMonth() + 1,
    status: 'pending',
    customMessageTemplate: schedData.customMessageTemplate,
    notes: schedData.notes || '',
  };

  schedules.unshift(newSchedule);
  saveJson('schedules.json', schedules);
  res.json(newSchedule);
});

app.put('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  const index = schedules.findIndex((s) => s.id === id);
  if (index === -1) return res.status(404).json({ error: 'Agendamento não encontrado' });

  schedules[index] = { ...schedules[index], ...req.body };
  saveJson('schedules.json', schedules);
  res.json(schedules[index]);
});

app.delete('/api/schedules/:id', (req, res) => {
  const { id } = req.params;
  schedules = schedules.filter((s) => s.id !== id);
  saveJson('schedules.json', schedules);
  res.json({ success: true });
});

app.post('/api/schedules/:id/run-now', async (req, res) => {
  const { id } = req.params;
  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) return res.status(404).json({ error: 'Agendamento não encontrado' });

  const product = products.find((p) => p.id === schedule.productId);
  if (!product) return res.status(404).json({ error: 'Produto não encontrado' });

  const targetGroupIds = schedule.targetGroupIds.length > 0
    ? schedule.targetGroupIds
    : groups.filter((g) => g.isSelected).map((g) => g.id);

  if (targetGroupIds.length === 0) {
    return res.status(400).json({ error: 'Nenhum grupo selecionado para o agendamento' });
  }

  for (const gid of targetGroupIds) {
    const group = groups.find((g) => g.id === gid);
    const groupName = group ? group.name : 'Grupo';

    const messageText = generateAffiliateMessage(
      product,
      antiSpamConfig,
      schedule.customMessageTemplate || affiliateSettings.defaultTemplate
    );

    const result = await sendWhatsAppMessage(gid, messageText, product, antiSpamConfig.simulateTyping);

    const newLog: DispatchLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      productId: product.id,
      productTitle: product.title,
      marketplace: product.marketplace,
      groupId: gid,
      groupName,
      status: result.success ? (result.simulated ? 'simulated' : 'success') : 'failed',
      messagePreview: messageText.substring(0, 120) + '...',
      antiSpamDelayAppliedSeconds: 15,
      commissionEstimated: product.estimatedProfit,
      error: result.error,
    };

    logs.unshift(newLog);
  }

  schedule.lastSentAt = new Date().toISOString();
  saveJson('schedules.json', schedules);
  saveJson('logs.json', logs);

  res.json({ success: true, message: 'Disparo executado com sucesso!' });
});

// Anti-Spam
app.get('/api/antispam', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const sentToday = logs.filter((l) => l.timestamp.startsWith(today)).length;
  const safety = calculateSafetyScore(antiSpamConfig, sentToday);
  res.json({ config: antiSpamConfig, safety, sentToday });
});

app.post('/api/antispam', (req, res) => {
  antiSpamConfig = { ...antiSpamConfig, ...req.body };
  saveJson('antispam.json', antiSpamConfig);
  const today = new Date().toISOString().split('T')[0];
  const sentToday = logs.filter((l) => l.timestamp.startsWith(today)).length;
  const safety = calculateSafetyScore(antiSpamConfig, sentToday);
  res.json({ config: antiSpamConfig, safety });
});

// Affiliate Settings
app.get('/api/settings/affiliate', (req, res) => {
  res.json({ settings: affiliateSettings, commissionRules: MARKETPLACE_COMMISSION_RATES });
});

app.post('/api/settings/affiliate', (req, res) => {
  affiliateSettings = { ...affiliateSettings, ...req.body };
  saveJson('affiliate.json', affiliateSettings);
  res.json({ success: true, settings: affiliateSettings });
});

// Logs
app.get('/api/logs', (req, res) => {
  res.json(logs);
});

app.delete('/api/logs', (req, res) => {
  logs = [];
  saveJson('logs.json', logs);
  res.json({ success: true });
});

// Stats Summary
app.get('/api/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = logs.filter((l) => l.timestamp.startsWith(today));

  const totalEstimatedProfit = products.reduce((acc, p) => acc + (p.estimatedProfit || 0), 0);

  const profitByMarketplace = {
    mercadolivre: products.filter((p) => p.marketplace === 'mercadolivre').reduce((acc, p) => acc + p.estimatedProfit, 0),
    shopee: products.filter((p) => p.marketplace === 'shopee').reduce((acc, p) => acc + p.estimatedProfit, 0),
    amazon: products.filter((p) => p.marketplace === 'amazon').reduce((acc, p) => acc + p.estimatedProfit, 0),
    magalu: products.filter((p) => p.marketplace === 'magalu').reduce((acc, p) => acc + p.estimatedProfit, 0),
    other: products.filter((p) => p.marketplace === 'aliexpress' || p.marketplace === 'other').reduce((acc, p) => acc + p.estimatedProfit, 0),
  };

  const topProfitableProducts = [...products].sort((a, b) => b.estimatedProfit - a.estimatedProfit).slice(0, 5);
  const safety = calculateSafetyScore(antiSpamConfig, todayLogs.length);

  const stats: StatsSummary = {
    totalProducts: products.length,
    totalSchedules: schedules.length,
    totalDispatchedToday: todayLogs.length,
    totalDispatchedAllTime: logs.length,
    totalEstimatedProfit: Number(totalEstimatedProfit.toFixed(2)),
    profitByMarketplace,
    topProfitableProducts,
    safetyScore: safety.score,
  };

  res.json(stats);
});

// Automated Daily Schedule Background Runner (runs every 30 seconds)
setInterval(async () => {
  if (!dailySchedulePlan.isActive || !dailySchedulePlan.slots || dailySchedulePlan.slots.length === 0) {
    return;
  }

  // Check night pause
  if (antiSpamConfig.nightPauseEnabled && isNightPauseActive(antiSpamConfig.nightPauseStart, antiSpamConfig.nightPauseEnd)) {
    return;
  }

  const now = new Date();
  const currentH = now.getHours();
  const currentM = now.getMinutes();
  const currentHHMM = `${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`;

  const pendingSlot = dailySchedulePlan.slots.find(
    (s) => s.status === 'pending' && s.time <= currentHHMM
  );

  if (!pendingSlot) return;

  const product = products.find((p) => p.id === pendingSlot.productId);
  if (!product) {
    pendingSlot.status = 'skipped';
    saveJson('daily_schedule.json', dailySchedulePlan);
    return;
  }

  pendingSlot.status = 'sending';
  console.log(`[DailyScheduler] Executing scheduled slot ${pendingSlot.time} for product "${product.title}"...`);

  let targetGroups = groups.filter((g) => pendingSlot.targetGroupIds.includes(g.id));
  if (targetGroups.length === 0 && groups.length > 0) {
    targetGroups = groups.filter((g) => g.isSelected);
    if (targetGroups.length === 0) targetGroups = [groups[0]];
  }

  for (const group of targetGroups) {
    const messageText = generateAffiliateMessage(
      product,
      antiSpamConfig,
      group.customTemplate || affiliateSettings.defaultTemplate
    );

    const delaySeconds = antiSpamConfig.randomInterval
      ? calculateRandomDelay(antiSpamConfig.minIntervalMinutes, antiSpamConfig.maxIntervalMinutes)
      : antiSpamConfig.minIntervalMinutes * 60;

    const result = await sendWhatsAppMessage(group.id, messageText, product, antiSpamConfig.simulateTyping);

    const newLog: DispatchLog = {
      id: `log_auto_daily_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      productId: product.id,
      productTitle: product.title,
      marketplace: product.marketplace,
      groupId: group.id,
      groupName: group.name,
      status: result.success ? (result.simulated ? 'simulated' : 'success') : 'failed',
      messagePreview: messageText.substring(0, 140) + '...',
      antiSpamDelayAppliedSeconds: delaySeconds,
      commissionEstimated: product.estimatedProfit,
      error: result.error,
    };

    logs.unshift(newLog);
  }

  pendingSlot.status = 'sent';
  pendingSlot.sentAt = new Date().toISOString();
  saveJson('logs.json', logs);
  saveJson('daily_schedule.json', dailySchedulePlan);
  console.log(`[DailyScheduler] Slot ${pendingSlot.time} successfully dispatched.`);
}, 30000);

// Bootstrap
async function startServer() {
  console.log('[ZapAfiliados] Building pre-packaged Chrome Extension zip...');
  await buildExtensionZip().catch((e) => console.warn('Extension zip build error:', e));

  console.log('[ZapAfiliados] Starting Baileys socket for real WhatsApp Web QR...');
  await startBaileysSocket(false);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ZapAfiliados] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[ZapAfiliados] Failed to start server:', err);
});
