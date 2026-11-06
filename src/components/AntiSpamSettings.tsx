import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sparkles,
  Zap,
  Moon,
  Flame,
  CheckCircle2,
  RefreshCw,
  Info,
  Sliders,
  FileText,
  Lock,
} from 'lucide-react';
import { AntiSpamConfig, Product } from '../types';
import { generateAffiliateMessage, resolveSpintax } from '../services/antiSpam';

interface AntiSpamSettingsProps {
  config: AntiSpamConfig;
  safetyScore: {
    score: number;
    level: string;
    color: string;
    recommendations: string[];
  };
  sampleProduct?: Product;
  onSaveConfig: (updated: Partial<AntiSpamConfig>) => Promise<void>;
  isLoading: boolean;
}

const FALLBACK_PREVIEW_PRODUCT: Product = {
  id: 'preview_demo',
  title: 'Exemplo de Produto em Oferta',
  description: 'Exemplo de texto com link de afiliado',
  originalPrice: 199.9,
  promotionalPrice: 99.9,
  discountPercentage: 50,
  marketplace: 'mercadolivre',
  originalUrl: 'https://mercadolivre.com.br/...',
  affiliateUrl: 'https://mercadolivre.com/sec/seu_link_afiliado',
  imageUrl: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
  category: 'Geral',
  commissionRate: 12,
  estimatedProfit: 11.98,
  couponCode: 'CUPOM10',
  freeShipping: true,
  installments: '3x sem juros',
  createdAt: new Date().toISOString(),
};

export const AntiSpamSettings: React.FC<AntiSpamSettingsProps> = ({
  config,
  safetyScore,
  sampleProduct,
  onSaveConfig,
  isLoading,
}) => {
  const activeProduct = sampleProduct || FALLBACK_PREVIEW_PRODUCT;
  const [formData, setFormData] = useState<AntiSpamConfig>(config);
  const [previewMessage, setPreviewMessage] = useState<string>(() =>
    generateAffiliateMessage(activeProduct, config)
  );
  const [isSavedToast, setIsSavedToast] = useState(false);

  const handleToggle = (key: keyof AntiSpamConfig) => {
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: keyof AntiSpamConfig, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig(formData);
    setPreviewMessage(generateAffiliateMessage(activeProduct, formData));
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  const regeneratePreview = () => {
    setPreviewMessage(generateAffiliateMessage(activeProduct, formData));
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast */}
      {isSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-slate-950 px-5 py-3 rounded-xl shadow-2xl font-bold flex items-center space-x-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>Configurações Anti-Spam salvas com sucesso!</span>
        </div>
      )}

      {/* Top Banner: Safety Gauge */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-bold text-white">Escudo Anti-Spam & Anti-Queda do WhatsApp</h2>
                <span
                  className={`text-xs px-3 py-1 rounded-full font-extrabold border ${
                    safetyScore.score >= 80
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : safetyScore.score >= 50
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}
                >
                  Nível de Risco: {safetyScore.level}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
                O algoritmo da Meta monitora envios repetitivos e intervalos fixos. O ZapAfiliados usa
                inteligência de comportamento humano (Spintax, atrasos randômicos e simulação de presença) para
                manter seu número 100% blindado.
              </p>
            </div>
          </div>

          {/* Safety Score Meter */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400"
                  strokeDasharray={`${safetyScore.score}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-sm font-black text-white">{safetyScore.score}%</span>
            </div>
            <div>
              <p className="text-xs text-slate-400">Pontuação de Proteção</p>
              <p className="text-sm font-extrabold text-emerald-400">
                {safetyScore.score >= 80 ? 'Proteção Máxima' : 'Ajustes Recomendados'}
              </p>
              <p className="text-[11px] text-slate-500">Zero bans registrados</p>
            </div>
          </div>
        </div>

        {/* Recommendations list */}
        {safetyScore.recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{safetyScore.recommendations[0]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Settings Form & Live Spintax Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Anti-Spam Controls */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-emerald-400" />
                  <span>Parâmetros de Segurança do Bot</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ajuste fino dos mecanismos de evasão contra detecção do WhatsApp
                </p>
              </div>

              {/* Master Switch */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-300 font-semibold">
                  {formData.enabled ? 'Ativado' : 'Desativado'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggle('enabled')}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    formData.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Feature 1: Random Delay Intervals */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold text-white flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Intervalo Randômico entre Mensagens</span>
                </label>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formData.minIntervalMinutes} a {formData.maxIntervalMinutes} minutos
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Evita disparos em minutos fixos (ex: nunca exatamente de 5 em 5 minutos). O bot sorteia um tempo aleatório entre os dois valores.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Mínimo (Minutos):</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={formData.minIntervalMinutes}
                    onChange={(e) => handleChange('minIntervalMinutes', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Máximo (Minutos):</span>
                  <input
                    type="number"
                    min="2"
                    max="120"
                    value={formData.maxIntervalMinutes}
                    onChange={(e) => handleChange('maxIntervalMinutes', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Feature 2: Spintax Dynamic Variation */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Variações Spintax de Texto e Emojis
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('useSpintax')}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    formData.useSpintax ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      formData.useSpintax ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Altera saudações, chamadas para ação e emojis a cada postagem (ex: <i>🔥 MEGA OFERTA!</i> vs <i>⚡ OLHA ESSE PREÇO!</i>) garantindo que nenhum texto seja repetido.
              </p>
            </div>

            {/* Feature 3: Human Typing Simulation */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Simulação de Presença Humana ("Digitando...")
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('simulateTyping')}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    formData.simulateTyping ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      formData.simulateTyping ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                O bot envia o estado "digitando..." para o grupo durante {formData.typingDurationSeconds} segundos antes de soltar a mensagem com o link.
              </p>
            </div>

            {/* Feature 4: Night Silence Window */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    Pausa Noturna (Janela de Silêncio)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle('nightPauseEnabled')}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    formData.nightPauseEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      formData.nightPauseEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Pausa automática para evitar acordar membros de madrugada e tomar denúncias de spam.
              </p>
              {formData.nightPauseEnabled && (
                <div className="flex items-center space-x-3 pt-1">
                  <div>
                    <span className="text-[11px] text-slate-400">Início:</span>
                    <input
                      type="time"
                      value={formData.nightPauseStart}
                      onChange={(e) => handleChange('nightPauseStart', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400">Retorno:</span>
                    <input
                      type="time"
                      value={formData.nightPauseEnd}
                      onChange={(e) => handleChange('nightPauseEnd', e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono mt-0.5"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Feature 5: Max Messages Per Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Limite Seguro Diário de Mensagens
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={formData.maxMessagesPerDay}
                  onChange={(e) => handleChange('maxMessagesPerDay', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Recomendado: 20 a 30 msgs/dia por grupo
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Duração da Digitação (Segundos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={formData.typingDurationSeconds}
                  onChange={(e) => handleChange('typingDurationSeconds', Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Simula o tempo de escrever uma oferta
                </span>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                Salvar Configurações Anti-Spam
              </button>
            </div>
          </form>
        </div>

        {/* Right: Live Dynamic Message Variation Preview */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>Simulador de Variação de Mensagem</span>
              </h3>
              <button
                onClick={regeneratePreview}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs border border-slate-700 flex items-center space-x-1 transition"
                title="Sortear nova variação Spintax"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold">Testar Outra</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Veja como cada envio muda de forma automática. Clique em "Testar Outra" para observar as variações que impedem que a Meta detecte o robô.
            </p>

            {/* WhatsApp Balloon Preview */}
            <div className="bg-[#0b141a] rounded-2xl p-4 border border-slate-800 relative">
              <div className="flex items-center space-x-2 pb-2 mb-2 border-b border-slate-800 text-slate-400 text-[11px]">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Mensagem Criptografada • Hash Único</span>
              </div>

              {activeProduct.imageUrl && (
                <img
                  src={activeProduct.imageUrl}
                  alt={activeProduct.title}
                  className="w-full h-36 object-cover rounded-xl mb-3 border border-slate-700"
                />
              )}

              <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed bg-[#111b21] p-3 rounded-xl border border-slate-800">
                {previewMessage}
              </pre>

              <div className="flex justify-end text-[10px] text-slate-500 mt-1">
                <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Entregue</span>
              </div>
            </div>
          </div>

          {/* Golden Rules Checklist */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-xs space-y-2">
            <h4 className="font-bold text-slate-300">Regras de Ouro para Não Perder o WhatsApp:</h4>
            <div className="flex items-start space-x-2 text-slate-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Use grupos onde você é o administrador ou grupos criados para achadinhos.</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Mantenha o intervalo mínimo de 4 a 12 minutos para evitar disparos em rajada.</span>
            </div>
            <div className="flex items-start space-x-2 text-slate-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>Evite disparos no meio da madrugada; deixe a Janela Noturna sempre ativada.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
