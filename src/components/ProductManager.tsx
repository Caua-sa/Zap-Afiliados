import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Link as LinkIcon,
  Plus,
  TrendingUp,
  Percent,
  DollarSign,
  Send,
  Calendar,
  ExternalLink,
  Sparkles,
  Trash2,
  Edit,
  Tag,
  CheckCircle2,
  Copy,
  Layers,
  Settings,
  ArrowRight,
  Clock,
  Download,
  Chrome,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Flame,
  Zap,
} from 'lucide-react';
import { Product, Marketplace, AffiliateSettings, WhatsAppGroup, DailySlot, DailySchedulePlan } from '../types';
import { formatCurrencyBRL, generateAffiliateMessage, formatAchadinhoWhatsApp } from '../services/antiSpam';
import { MARKETPLACE_COMMISSION_RATES } from '../services/affiliateScraper';

interface ProductManagerProps {
  products: Product[];
  groups: WhatsAppGroup[];
  affiliateSettings: AffiliateSettings;
  onAddProduct: (prod: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: string, prod: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onParseLink: (url: string) => Promise<Partial<Product> | null>;
  onSaveAffiliateSettings: (settings: Partial<AffiliateSettings>) => Promise<void>;
  onQuickSend: (productId: string) => Promise<void>;
  onScheduleProduct: (productId: string) => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  products,
  groups,
  affiliateSettings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onParseLink,
  onSaveAffiliateSettings,
  onQuickSend,
  onScheduleProduct,
}) => {
  // Tabs: 'my_products' | 'daily_scheduler' | 'chrome_extension'
  const [activeTab, setActiveTab] = useState<'my_products' | 'daily_scheduler' | 'chrome_extension'>('my_products');

  // Input url state
  const [inputUrl, setInputUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseStepMessage, setParseStepMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Daily Scheduler State
  const [dailyPlan, setDailyPlan] = useState<DailySchedulePlan>({
    date: new Date().toISOString().split('T')[0],
    isActive: true,
    intervalMinutes: 90,
    startHour: '09:00',
    endHour: '21:30',
    slots: [],
  });
  const [isLoadingDailyPlan, setIsLoadingDailyPlan] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [runningSlotId, setRunningSlotId] = useState<string | null>(null);

  // Settings form
  const [meliTag, setMeliTag] = useState(affiliateSettings.mercadoLivreTag || '');
  const [shopeeTag, setShopeeTag] = useState(affiliateSettings.shopeeAffiliateId || '');
  const [amazonTag, setAmazonTag] = useState(affiliateSettings.amazonTag || '');

  // Marketplace filter
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>('all');

  // Fetch daily schedule plan on mount
  const fetchDailyPlan = async () => {
    setIsLoadingDailyPlan(true);
    try {
      const res = await fetch('/api/daily-schedule');
      if (res.ok) {
        const data = await res.json();
        setDailyPlan(data);
      }
    } catch (err) {
      console.error('Error fetching daily plan:', err);
    } finally {
      setIsLoadingDailyPlan(false);
    }
  };

  useEffect(() => {
    fetchDailyPlan();
  }, []);

  useEffect(() => {
    setMeliTag(affiliateSettings.mercadoLivreTag || '');
    setShopeeTag(affiliateSettings.shopeeAffiliateId || '');
    setAmazonTag(affiliateSettings.amazonTag || '');
  }, [affiliateSettings]);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Puxar link real do Mercado Livre ou outros marketplaces
  const handleParseAndOpen = async () => {
    if (!inputUrl.trim()) return;
    setIsParsing(true);
    setParseStepMessage('Extraindo título real e buscando a 1ª imagem de alta resolução...');

    try {
      const extracted = await onParseLink(inputUrl.trim());
      if (extracted) {
        setEditingProduct(extracted);
        setShowModal(true);
        setInputUrl('');
        showToast('Produto real e 1ª imagem puxados com sucesso!', 'success');
      } else {
        showToast('Não foi possível extrair dados desse link.', 'error');
      }
    } catch {
      showToast('Erro ao processar o link do produto.', 'error');
    } finally {
      setIsParsing(false);
      setParseStepMessage('');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (editingProduct.id) {
      await onUpdateProduct(editingProduct.id, editingProduct);
      showToast('Produto atualizado com sucesso!');
    } else {
      await onAddProduct(editingProduct);
      showToast('Produto adicionado à sua lista!');
    }

    setShowModal(false);
    setEditingProduct(null);
  };

  const handleSaveTags = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAffiliateSettings({
      mercadoLivreTag: meliTag,
      shopeeAffiliateId: shopeeTag,
      amazonTag: amazonTag,
    });
    setShowSettingsModal(false);
    showToast('Tags de afiliado salvas com sucesso!');
  };

  // Generate automatic daily schedule
  const handleGenerateDailySchedule = async () => {
    if (products.length === 0) {
      showToast('Adicione pelo menos 1 produto na lista para programar os disparos do dia.', 'error');
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const res = await fetch('/api/daily-schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervalMinutes: dailyPlan.intervalMinutes || 90,
          startHour: dailyPlan.startHour || '09:00',
          endHour: dailyPlan.endHour || '21:30',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar programação');

      setDailyPlan(data.dailySchedulePlan);
      showToast(`⚡ Cronograma gerado: ${data.generatedCount} disparos programados para hoje sem produtos repetidos!`);
    } catch (err: any) {
      showToast(err?.message || 'Falha ao gerar programação do dia', 'error');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Run specific daily slot now
  const handleRunDailySlot = async (slotId: string) => {
    setRunningSlotId(slotId);
    try {
      const res = await fetch(`/api/daily-schedule/run-slot/${slotId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao executar horário');

      showToast(data.message || 'Disparo executado com sucesso!');
      await fetchDailyPlan();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao disparar no WhatsApp', 'error');
    } finally {
      setRunningSlotId(null);
    }
  };

  // Delete daily slot
  const handleDeleteDailySlot = async (slotId: string) => {
    try {
      await fetch(`/api/daily-schedule/slot/${slotId}`, { method: 'DELETE' });
      setDailyPlan((prev) => ({
        ...prev,
        slots: prev.slots.filter((s) => s.id !== slotId),
      }));
      showToast('Horário removido da programação de hoje.');
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle master active status for daily scheduler
  const handleToggleDailyActive = async () => {
    const updated = !dailyPlan.isActive;
    setDailyPlan((prev) => ({ ...prev, isActive: updated }));
    try {
      await fetch('/api/daily-schedule/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: updated }),
      });
      showToast(updated ? 'Programação do dia ATIVADA!' : 'Programação do dia PAUSADA.');
    } catch (err) {
      console.error(err);
    }
  };

  // Add individual product to today's schedule
  const handleAddProductToDaily = async (product: Product) => {
    const nextSlotTime = '11:00';
    const targetGroups = groups.filter((g) => g.isSelected);

    const newSlot: DailySlot = {
      id: `slot_${Date.now()}`,
      time: nextSlotTime,
      productId: product.id,
      product,
      targetGroupIds: targetGroups.length > 0 ? targetGroups.map((g) => g.id) : (groups[0] ? [groups[0].id] : []),
      status: 'pending',
    };

    const updatedSlots = [...dailyPlan.slots, newSlot].sort((a, b) => a.time.localeCompare(b.time));

    setDailyPlan((prev) => ({ ...prev, slots: updatedSlots }));

    try {
      await fetch('/api/daily-schedule/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: updatedSlots }),
      });
      showToast(`"${product.title.substring(0, 30)}..." adicionado ao cronograma do dia!`);
      setActiveTab('daily_scheduler');
    } catch (err) {
      console.error(err);
    }
  };

  const copyMessage = (product: Product) => {
    const message = generateAffiliateMessage(product);
    navigator.clipboard.writeText(message);
    setCopiedId(product.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const [isDownloadingExtension, setIsDownloadingExtension] = useState(false);

  const handleDownloadExtensionZip = async () => {
    setIsDownloadingExtension(true);
    try {
      const res = await fetch('/api/extension/download-zip');
      if (!res.ok) throw new Error('Falha ao obter arquivo do servidor');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'zapafiliados-extensao-chrome.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Extensão baixada com sucesso! O arquivo .zip está pronto para extrair no WinRAR.');
    } catch (err: any) {
      window.location.href = '/api/extension/download-zip';
    } finally {
      setIsDownloadingExtension(false);
    }
  };

  const copyAchadinhoText = (product: Product) => {
    const message = formatAchadinhoWhatsApp(product);
    navigator.clipboard.writeText(message);
    setCopiedId(product.id);
    showToast('🔥 Texto no Estilo Achadinhos WhatsApp copiado para sua área de transferência!');
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (marketplaceFilter === 'all') return true;
    return p.marketplace === marketplaceFilter;
  });

  const totalCatalogProfit = filteredProducts.reduce((sum, p) => sum + (p.estimatedProfit || 0), 0);
  const avgMargin =
    filteredProducts.length > 0
      ? (filteredProducts.reduce((sum, p) => sum + (p.commissionRate || 0), 0) / filteredProducts.length).toFixed(1)
      : '0';

  const pendingSlotsCount = dailyPlan.slots.filter((s) => s.status === 'pending').length;
  const sentSlotsCount = dailyPlan.slots.filter((s) => s.status === 'sent').length;

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-semibold shadow-2xl border animate-in fade-in duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
              : 'bg-slate-900 text-slate-200 border-slate-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-3">
            ✕
          </button>
        </div>
      )}

      {/* Main Top Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('my_products')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 whitespace-nowrap transition-all ${
              activeTab === 'my_products'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Lista de Produtos & Puxador Real</span>
            <span className="text-[10px] bg-slate-950/30 px-2 py-0.5 rounded-full font-extrabold">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('daily_scheduler')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 whitespace-nowrap transition-all ${
              activeTab === 'daily_scheduler'
                ? 'bg-gradient-to-r from-teal-400 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>📅 Programador do Dia (Disparos Diários)</span>
            <span className="text-[10px] bg-slate-950/30 px-2 py-0.5 rounded-full font-extrabold">
              {dailyPlan.slots.length} horários
            </span>
          </button>

          <button
            onClick={() => setActiveTab('chrome_extension')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-2 whitespace-nowrap transition-all ${
              activeTab === 'chrome_extension'
                ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 shadow-lg shadow-yellow-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Chrome className="w-4 h-4" />
            <span>🧩 Extensão Chrome (Anti-Repetição)</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 justify-end">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1.5 transition"
          >
            <Tag className="w-3.5 h-3.5 text-yellow-400" />
            <span>Tags de Afiliado</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: LISTA DE PRODUTOS & PUXADOR DE LINK REAL COM 1ª FOTO */}
      {/* ======================================================== */}
      {activeTab === 'my_products' && (
        <div className="space-y-6">
          {/* Real Link Extractor Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    <span>Puxador Automático de Link Real com 1ª Imagem</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Sem Produto Aleatório
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Cole o link de afiliado do <strong>Mercado Livre</strong>, <strong>Shopee</strong> ou <strong>Amazon</strong>. O sistema busca automaticamente o <strong>nome real do produto</strong> e a <strong>primeira imagem oficial em alta resolução</strong>.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingProduct({
                      title: '',
                      originalPrice: 199.9,
                      promotionalPrice: 129.9,
                      marketplace: 'mercadolivre',
                      category: 'Geral',
                      commissionRate: 10,
                      estimatedProfit: 12.99,
                      imageUrl: '',
                      freeShipping: true,
                    });
                    setShowModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Manual</span>
                </button>
              </div>
            </div>

            {/* Input Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  placeholder="Cole aqui o link do Mercado Livre (ex: mercadolivre.com.br/...) ou Shopee..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleParseAndOpen()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <button
                onClick={handleParseAndOpen}
                disabled={isParsing || !inputUrl.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Buscando 1ª Imagem Real...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Puxar Produto & 1ª Imagem</span>
                  </>
                )}
              </button>
            </div>

            {parseStepMessage && (
              <p className="text-xs text-emerald-400 animate-pulse font-medium flex items-center space-x-1.5">
                <span>🔍 {parseStepMessage}</span>
              </p>
            )}
          </div>

          {/* Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total de Produtos Cadastrados</p>
                <p className="text-xl font-extrabold text-white mt-0.5">{filteredProducts.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-teal-400">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Lucro Estimado por Venda (Total)</p>
                <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
                  {formatCurrencyBRL(totalCatalogProfit)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Margem Média de Comissão</p>
                <p className="text-xl font-extrabold text-teal-300 mt-0.5">{avgMargin}%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <Percent className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Todos os Produtos', count: products.length },
              {
                id: 'mercadolivre',
                label: 'Mercado Livre',
                count: products.filter((p) => p.marketplace === 'mercadolivre').length,
              },
              {
                id: 'shopee',
                label: 'Shopee',
                count: products.filter((p) => p.marketplace === 'shopee').length,
              },
              {
                id: 'amazon',
                label: 'Amazon',
                count: products.filter((p) => p.marketplace === 'amazon').length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMarketplaceFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  marketplaceFilter === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Sua Lista de Produtos está Vazia</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Cole o link de afiliado do Mercado Livre na barra acima para puxar o produto com a 1ª foto real, ou instale a extensão do Chrome para importar com 1 clique direto da página do produto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                return (
                  <div
                    key={product.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image and Badges */}
                      <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60"></div>

                        {/* Marketplace Badge */}
                        <div className="absolute top-3 left-3">
                          <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-md shadow-md bg-yellow-400 text-slate-950">
                            {product.marketplace === 'mercadolivre' ? 'Mercado Livre' : product.marketplace.toUpperCase()}
                          </span>
                        </div>

                        {/* Discount Badge */}
                        <div className="absolute top-3 right-3">
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-lg">
                            {product.discountPercentage}% OFF
                          </span>
                        </div>

                        {/* Extension Imported Pill */}
                        {product.importedViaExtension && (
                          <div className="absolute bottom-3 right-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-500/40">
                              🧩 Extensão Chrome
                            </span>
                          </div>
                        )}

                        {/* Category Pill */}
                        <div className="absolute bottom-3 left-3">
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-slate-300 border border-slate-700">
                            {product.category}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3
                          className="font-bold text-white text-sm line-clamp-2 leading-snug mb-3"
                          title={product.title}
                        >
                          {product.title}
                        </h3>

                        {/* Prices */}
                        <div className="flex items-baseline space-x-2 mb-3">
                          <span className="text-xs text-slate-500 line-through">
                            {formatCurrencyBRL(product.originalPrice)}
                          </span>
                          <span className="text-lg font-extrabold text-white">
                            {formatCurrencyBRL(product.promotionalPrice)}
                          </span>
                        </div>

                        {/* Installments & Shipping */}
                        <div className="space-y-1 mb-4 text-xs text-slate-400">
                          {product.installments && <p>💳 {product.installments}</p>}
                          {product.couponCode && (
                            <p className="text-amber-400 font-medium">🎟️ Cupom: {product.couponCode}</p>
                          )}
                          {product.freeShipping && (
                            <p className="text-emerald-400 font-medium">🚚 Frete Grátis Liberado</p>
                          )}
                        </div>

                        {/* Margem de Lucro Box */}
                        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 mb-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-emerald-300 font-medium flex items-center space-x-1">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Sua Comissão:</span>
                            </span>
                            <span className="font-extrabold text-emerald-400">
                              {product.commissionRate}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-300">Lucro por Venda:</span>
                            <span className="text-sm font-extrabold text-emerald-300">
                              {formatCurrencyBRL(product.estimatedProfit)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="p-5 pt-0 border-t border-slate-800/80 mt-2 space-y-2">
                      <div className="space-y-2 pt-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => copyAchadinhoText(product)}
                            className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black flex items-center justify-center space-x-1.5 shadow-md shadow-yellow-500/20 transition active:scale-95 cursor-pointer"
                            title="Copiar texto estilo Achadinhos WhatsApp com emojis e link de afiliado"
                          >
                            <Flame className="w-3.5 h-3.5 fill-slate-950" />
                            <span>{copiedId === product.id ? '✅ Copiado p/ WhatsApp!' : '🔥 Copiar Achadinho'}</span>
                          </button>

                          <button
                            onClick={() => handleAddProductToDaily(product)}
                            className="py-2 px-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
                            title="Programar para a lista de disparos de hoje"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>+ Disparo do Dia</span>
                          </button>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onQuickSend(product.id)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center justify-center space-x-1 border border-slate-700 transition"
                            title="Disparar agora nos grupos"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Disparar Agora</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setShowModal(true);
                            }}
                            className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs border border-slate-700 transition"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onDeleteProduct(product.id)}
                            className="p-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs border border-slate-700 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: PROGRAMADOR DO DIA (DISPAROS DIÁRIOS PROGRAMADOS)  */}
      {/* ======================================================== */}
      {activeTab === 'daily_scheduler' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider">
                    Cronograma do Dia
                  </span>
                  <span className="text-xs text-slate-400">
                    Data: <strong>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-2">
                  Programação Automática de Disparos de Hoje
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Monte a lista de produtos e os horários em que cada um será divulgado nos grupos. O robô faz a publicação automática no horário exato com anti-spam inteligente.
                </p>
              </div>

              {/* Master Switch & Generator Button */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleToggleDailyActive}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
                    dailyPlan.isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  }`}
                >
                  {dailyPlan.isActive ? (
                    <>
                      <Play className="w-4 h-4 fill-emerald-400" />
                      <span>Programação Ativa (Disparando)</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 fill-amber-400" />
                      <span>Programação Pausada</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleGenerateDailySchedule}
                  disabled={isGeneratingPlan || products.length === 0}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-lg shadow-teal-500/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingPlan ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Gerando Grade...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>Gerar Grade do Dia Automática</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Daily Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <span className="text-[11px] text-slate-400">Total Programados Hoje:</span>
                <p className="text-lg font-black text-white mt-0.5">{dailyPlan.slots.length}</p>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <span className="text-[11px] text-amber-400">Aguardando Envio:</span>
                <p className="text-lg font-black text-amber-300 mt-0.5">{pendingSlotsCount}</p>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <span className="text-[11px] text-emerald-400">Enviados com Sucesso:</span>
                <p className="text-lg font-black text-emerald-300 mt-0.5">{sentSlotsCount}</p>
              </div>

              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <span className="text-[11px] text-teal-400">Intervalo Padrão:</span>
                <p className="text-lg font-black text-teal-300 mt-0.5">{dailyPlan.intervalMinutes || 90} minutos</p>
              </div>
            </div>
          </div>

          {/* Slots List */}
          {dailyPlan.slots.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Nenhum Disparo Programado para Hoje</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Clique no botão <strong>"Gerar Grade do Dia Automática"</strong> acima para distribuir seus produtos ao longo do dia, ou clique em <strong>"+ Disparo do Dia"</strong> em qualquer produto na sua lista.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dailyPlan.slots.map((slot, index) => {
                const prod = slot.product || products.find((p) => p.id === slot.productId);
                const isRunning = runningSlotId === slot.id;

                return (
                  <div
                    key={slot.id}
                    className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition shadow-md ${
                      slot.status === 'sent'
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : slot.status === 'sending'
                        ? 'border-teal-500/50 bg-teal-950/20 animate-pulse'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      {/* Slot Order & Time Box */}
                      <div className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-center shrink-0 min-w-[70px]">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">
                          #{index + 1}
                        </span>
                        <span className="text-base font-black text-white">{slot.time}</span>
                      </div>

                      {/* Product Thumbnail */}
                      {prod?.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-14 h-14 object-cover rounded-xl border border-slate-800 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-400 text-slate-950 uppercase">
                            {prod?.marketplace || 'Produto'}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-400">
                            {prod ? formatCurrencyBRL(prod.promotionalPrice) : ''}
                          </span>
                          {prod && (
                            <span className="text-[11px] text-slate-400">
                              (Lucro: {formatCurrencyBRL(prod.estimatedProfit)})
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white truncate mt-1 max-w-md sm:max-w-lg">
                          {prod ? prod.title : 'Produto não encontrado'}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Destino: {slot.targetGroupIds.length} grupo(s) selecionado(s)
                        </p>
                      </div>
                    </div>

                    {/* Status Pill & Action Buttons */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      {slot.status === 'sent' ? (
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center space-x-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Enviado</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRunDailySlot(slot.id)}
                          disabled={isRunning}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isRunning ? 'Disparando...' : 'Disparar Agora'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteDailySlot(slot.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs border border-slate-700 transition"
                        title="Remover este horário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: EXTENSÃO CHROME COM ANTI-DUPLICAÇÃO              */}
      {/* ======================================================== */}
      {activeTab === 'chrome_extension' && (
        <div className="space-y-6">
          {/* Extension Header Banner */}
          <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-slate-900 border border-yellow-500/30 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider">
                    Extensão Oficial ZapAfiliados
                  </span>
                  <span className="text-xs text-yellow-300 font-semibold">
                    Anti-Repetição de Produtos Ativa
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  Copie links diretamente nas páginas com 1 clique
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Com a extensão no seu Chrome, você não precisa ficar copiando e colando manualmente. Ao navegar no <strong>Mercado Livre</strong>, <strong>Shopee</strong> ou <strong>Amazon</strong>, a extensão captura a <strong>1ª imagem real em alta resolução</strong>, o <strong>preço promocional</strong> e o <strong>link de afiliado</strong>, enviando diretamente para a Lista Diária do ZapAfiliados.
                </p>
              </div>

              {/* Download Zip Button */}
              <div className="shrink-0 flex flex-col items-stretch sm:items-end gap-1.5">
                <button
                  onClick={handleDownloadExtensionZip}
                  disabled={isDownloadingExtension}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-sm inline-flex items-center justify-center space-x-2 shadow-xl shadow-yellow-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isDownloadingExtension ? (
                    <>
                      <RefreshCw className="w-5 h-5 text-slate-950 animate-spin" />
                      <span>Baixando Arquivo...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 text-slate-950" />
                      <span>Baixar Extensão (.zip)</span>
                    </>
                  )}
                </button>
                <a
                  href="/api/extension/download-zip"
                  download="zapafiliados-extensao-chrome.zip"
                  className="text-[11px] text-yellow-400/80 hover:text-yellow-300 underline inline-flex items-center gap-1 self-center sm:self-end"
                >
                  <span>Link de download direto</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Server Connection URL for Extension */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold text-white">Endereço do seu Servidor ZapAfiliados na Nuvem</span>
              </div>
              <p className="text-xs text-emerald-400 font-mono select-all">
                {typeof window !== 'undefined' ? window.location.origin : 'https://ais-dev-qcpu3mytpcrtr2fmdyiv6a-602903723241.us-east1.run.app'}
              </p>
              <p className="text-[11px] text-slate-400">
                A extensão se conecta automaticamente a este endereço para puxar os produtos direto para o robô.
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin);
                showToast('URL do servidor copiada! Se a extensão exibir Offline, cole em ⚙️ Configurações da extensão.');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar URL do Servidor</span>
            </button>
          </div>

          {/* Installation Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-400/20 text-yellow-400 font-black flex items-center justify-center text-base">
                1
              </div>
              <h4 className="text-sm font-bold text-white">Baixe e Extraia a Pasta</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clique no botão <strong>"Baixar Extensão (.zip)"</strong> acima e extraia o conteúdo do arquivo em uma pasta no seu computador.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-400/20 text-teal-400 font-black flex items-center justify-center text-base">
                2
              </div>
              <h4 className="text-sm font-bold text-white">Abra chrome://extensions</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                No seu Google Chrome, acesse <code className="text-teal-400 bg-slate-950 px-1 py-0.5 rounded font-mono">chrome://extensions</code> e ative a chave <strong>"Modo do desenvolvedor"</strong> no canto superior direito.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-400 font-black flex items-center justify-center text-base">
                3
              </div>
              <h4 className="text-sm font-bold text-white">Carregue sem compactação</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clique no botão <strong>"Carregar sem compactação"</strong> e selecione a pasta extraída. O botão flutuante já estará ativo nas suas páginas de afiliados!
              </p>
            </div>
          </div>

          {/* Anti-Duplication Feature Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Como Funciona o Extrator & Sistema Anti-Repetição</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <span className="font-bold text-yellow-400 flex items-center space-x-1.5">
                  <span>⚡ Captura ao Clicar no Link</span>
                </span>
                <p className="text-slate-400">
                  Ao clicar ou abrir o link de afiliado no Mercado Livre, Shopee ou Amazon, a extensão puxa imediatamente a <strong>1ª foto oficial em alta resolução</strong>, o <strong>nome</strong>, o <strong>preço promocional</strong> e o <strong>link de afiliado com sua tag</strong>.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <span className="font-bold text-emerald-400 flex items-center space-x-1.5">
                  <span>🔥 Formato Achadinhos WhatsApp</span>
                </span>
                <p className="text-slate-400">
                  O texto é formatado instantaneamente com emojis virais, preço antigo tachado <code className="text-rose-400 font-mono">~R$ XX~</code>, preço com desconto em negrito <code className="text-emerald-400 font-mono">*R$ YY*</code>, parcelas e link de afiliado.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <span className="font-bold text-teal-400 flex items-center space-x-1.5">
                  <span>🛡️ Anti-Repetição Inteligente</span>
                </span>
                <p className="text-slate-400">
                  A extensão avisa na hora se o produto já foi enviado antes nos seus grupos, garantindo que você nunca publique ofertas repetidas para seus clientes.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Achadinhos WhatsApp Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span>Simulador do Estilo Achadinhos WhatsApp</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Veja exatamente como a extensão copia o produto e como ele aparece para os clientes nos grupos:
                </p>
              </div>
            </div>

            {/* Simulated Phone Screen & WhatsApp Bubble */}
            <div className="max-w-xl mx-auto bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-slate-300">Grupo VIP de Achadinhos • WhatsApp</span>
                </div>
                <span className="text-[10px] text-slate-500">Online</span>
              </div>

              {/* Chat Bubble */}
              <div className="bg-[#054640] border border-[#0d6e64] text-white rounded-2xl p-4 shadow-lg space-y-3 max-w-md ml-auto">
                {/* Photo Preview inside Chat */}
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-emerald-900/60 aspect-video flex items-center justify-center">
                  {products.length > 0 && products[0].imageUrl ? (
                    <img
                      src={products[0].imageUrl}
                      alt="Achadinho"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-10 h-10 text-emerald-400/60 mx-auto mb-1" />
                      <span className="text-[11px] text-emerald-200">1ª Foto em Alta Resolução Extraída</span>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                    {products.length > 0 ? `${products[0].discountPercentage}% OFF` : '45% OFF'}
                  </span>
                </div>

                {/* WhatsApp Text Formatting */}
                <div className="text-xs space-y-2 leading-relaxed font-sans">
                  <p className="font-black text-amber-300 text-sm">🔥 *ACHADINHO DO DIA!* 🔥</p>
                  <p className="font-bold text-white">
                    📦 *{products.length > 0 ? products[0].title : 'Smart TV 50" 4K UHD Conexão Wi-Fi Bluetooth'}*
                  </p>
                  <p className="text-slate-300">
                    ❌ De: ~R$ {products.length > 0 ? products[0].originalPrice.toFixed(2).replace('.', ',') : '2.899,00'}~
                  </p>
                  <p className="font-black text-emerald-300 text-sm">
                    🔥 *Por apenas: R$ {products.length > 0 ? products[0].promotionalPrice.toFixed(2).replace('.', ',') : '1.599,00'}* ({products.length > 0 ? products[0].discountPercentage : '45'}% OFF!)
                  </p>
                  <p className="text-slate-200">💳 Em até 10x sem juros</p>
                  <p className="text-emerald-300 font-bold">🚚 *Frete Grátis Liberado!*</p>
                  <div className="pt-2 border-t border-emerald-800/80">
                    <p className="text-slate-200 font-bold">🛒 *Compre aqui com desconto:*</p>
                    <p className="text-emerald-300 font-mono text-[11px] break-all underline">
                      👉 {products.length > 0 ? products[0].affiliateUrl : 'https://mercadolivre.com/sec/exemplo-afiliado'}
                    </p>
                  </div>
                  <p className="text-[10px] text-slate-400 italic pt-1">
                    ⚠️ _Atenção: Os preços e estoques podem variar a qualquer momento._
                  </p>
                </div>
              </div>

              {/* Copy Sample Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    const sampleProduct: Product = products.length > 0
                      ? products[0]
                      : {
                          id: 'sample',
                          title: 'Smart TV 50" 4K UHD Conexão Wi-Fi Bluetooth',
                          description: 'Smart TV 50 polegadas 4K com Wi-Fi e Bluetooth integrado',
                          originalUrl: 'https://mercadolivre.com.br/exemplo',
                          originalPrice: 2899,
                          promotionalPrice: 1599,
                          discountPercentage: 45,
                          affiliateUrl: 'https://mercadolivre.com/sec/exemplo-afiliado',
                          imageUrl: '',
                          marketplace: 'mercadolivre',
                          category: 'Eletrônicos',
                          commissionRate: 10,
                          estimatedProfit: 159.9,
                          installments: 'Em até 10x sem juros',
                          freeShipping: true,
                          createdAt: new Date().toISOString(),
                        };
                    copyAchadinhoText(sampleProduct);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Testar e Copiar Modelo de Achadinho</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Product */}
      {showModal && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
            <h3 className="text-base font-bold text-white mb-2">
              {editingProduct.id ? 'Editar Produto de Afiliado' : 'Novo Produto para Divulgação'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Revise o título real, a primeira imagem capturada e os valores de comissão.
            </p>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Image Preview Box */}
              {editingProduct.imageUrl && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center space-x-4">
                  <img
                    src={editingProduct.imageUrl}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-emerald-400">1ª Foto Oficial do Produto</p>
                    <p className="text-xs text-white truncate font-medium">{editingProduct.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{editingProduct.imageUrl}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Título Real do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.title || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Marketplace *
                  </label>
                  <select
                    value={editingProduct.marketplace || 'mercadolivre'}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        marketplace: e.target.value as Marketplace,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="mercadolivre">Mercado Livre</option>
                    <option value="shopee">Shopee</option>
                    <option value="amazon">Amazon</option>
                    <option value="magalu">Magazine Luiza</option>
                    <option value="aliexpress">AliExpress</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    value={editingProduct.category || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço Original (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.originalPrice || ''}
                    onChange={(e) => {
                      const orig = parseFloat(e.target.value) || 0;
                      const promo = editingProduct.promotionalPrice || 0;
                      const disc = orig > 0 && promo > 0 ? Math.round(((orig - promo) / orig) * 100) : 0;
                      setEditingProduct({
                        ...editingProduct,
                        originalPrice: orig,
                        discountPercentage: disc,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço Promocional (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.promotionalPrice || ''}
                    onChange={(e) => {
                      const promo = parseFloat(e.target.value) || 0;
                      const orig = editingProduct.originalPrice || 0;
                      const disc = orig > 0 && promo > 0 ? Math.round(((orig - promo) / orig) * 100) : 0;
                      const rate = editingProduct.commissionRate || 10;
                      const profit = Number(((promo * rate) / 100).toFixed(2));
                      setEditingProduct({
                        ...editingProduct,
                        promotionalPrice: promo,
                        discountPercentage: disc,
                        estimatedProfit: profit,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Comissão Estimada (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingProduct.commissionRate || ''}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value) || 0;
                      const promo = editingProduct.promotionalPrice || 0;
                      const profit = Number(((promo * rate) / 100).toFixed(2));
                      setEditingProduct({
                        ...editingProduct,
                        commissionRate: rate,
                        estimatedProfit: profit,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lucro Estimado por Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.estimatedProfit || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        estimatedProfit: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Link de Afiliado (com sua tag de rastreamento) *
                  </label>
                  <input
                    type="url"
                    required
                    value={editingProduct.affiliateUrl || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, affiliateUrl: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    URL da Imagem do Produto
                  </label>
                  <input
                    type="url"
                    value={editingProduct.imageUrl || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cupom de Desconto
                  </label>
                  <input
                    type="text"
                    value={editingProduct.couponCode || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, couponCode: e.target.value })
                    }
                    placeholder="Ex: CUPOM10"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Parcelamento
                  </label>
                  <input
                    type="text"
                    value={editingProduct.installments || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, installments: e.target.value })
                    }
                    placeholder="Ex: Em até 10x sem juros"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="freeShippingCheck"
                    checked={editingProduct.freeShipping ?? true}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, freeShipping: e.target.checked })
                    }
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="freeShippingCheck" className="text-xs text-slate-300 font-medium">
                    Destacar Frete Grátis na mensagem do WhatsApp
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Salvar na Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal (Affiliate IDs) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Tags dos Programas de Afiliados</h3>
            <p className="text-xs text-slate-400 mb-4">
              Defina suas credenciais para que todos os links colados ou importados via extensão sejam gerados com seus códigos de comissão.
            </p>

            <form onSubmit={handleSaveTags} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-yellow-400 mb-1">
                  Tag de Afiliado Mercado Livre (tracking_id)
                </label>
                <input
                  type="text"
                  value={meliTag}
                  onChange={(e) => setMeliTag(e.target.value)}
                  placeholder="Ex: afiliado_zap_vip"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-orange-400 mb-1">
                  Shopee Affiliate ID (aff_id / sub_id)
                </label>
                <input
                  type="text"
                  value={shopeeTag}
                  onChange={(e) => setShopeeTag(e.target.value)}
                  placeholder="Ex: shopee_brasil_vip2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-500 mb-1">
                  Amazon Associate Tag
                </label>
                <input
                  type="text"
                  value={amazonTag}
                  onChange={(e) => setAmazonTag(e.target.value)}
                  placeholder="Ex: achadoszap-20"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                >
                  Salvar Tags
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
