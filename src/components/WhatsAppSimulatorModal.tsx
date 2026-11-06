import React, { useState } from 'react';
import {
  X,
  Send,
  Smartphone,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  Mic,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { WhatsAppGroup, Product } from '../types';
import { generateAffiliateMessage, formatCurrencyBRL } from '../services/antiSpam';

interface WhatsAppSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: WhatsAppGroup[];
  products: Product[];
  onTriggerSend: (groupId: string, productId: string) => Promise<void>;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({
  isOpen,
  onClose,
  groups,
  products,
  onTriggerSend,
}) => {
  if (!isOpen) return null;

  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    groups.find((g) => g.isSelected)?.id || groups[0]?.id || ''
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [isTyping, setIsTyping] = useState(false);
  const [dispatchedMessages, setDispatchedMessages] = useState<
    {
      id: string;
      product: Product;
      text: string;
      time: string;
    }[]
  >(() => {
    // initialize with 1 sample
    const p = products[0] || products[1];
    return p
      ? [
          {
            id: 'init_1',
            product: p,
            text: generateAffiliateMessage(p),
            time: '11:45',
          },
        ]
      : [];
  });

  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];
  const currentProduct = products.find((p) => p.id === selectedProductId) || products[0];

  const handleSimulateSend = async () => {
    if (!currentProduct) return;
    setIsTyping(true);

    try {
      // simulate typing 2 seconds
      await new Promise((r) => setTimeout(r, 2000));
      const newMsg = {
        id: `sim_${Date.now()}`,
        product: currentProduct,
        text: generateAffiliateMessage(currentProduct),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setDispatchedMessages((prev) => [...prev, newMsg]);

      // Call backend send
      if (currentGroup) {
        await onTriggerSend(currentGroup.id, currentProduct.id);
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl my-6 flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Simulador do WhatsApp Web & Celular
              </h3>
              <p className="text-xs text-slate-400">
                Veja exatamente como as ofertas chegam na tela dos clientes do seu grupo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Controls + Phone Screen */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 flex-1 min-h-0">
          {/* Controls Left */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Grupo de WhatsApp Selecionado:
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.membersCount} membros)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Oferta a ser Disparada:
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.marketplace.toUpperCase()}] {p.title.substring(0, 36)}... — {formatCurrencyBRL(p.promotionalPrice)}
                    </option>
                  ))}
                </select>
              </div>

              {products.length === 0 ? (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-400 text-center">
                  Nenhum produto cadastrado ainda. Cadastre um produto na aba "Produtos & Links".
                </div>
              ) : currentProduct ? (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Preço com Desconto:</span>
                    <strong className="text-white">{formatCurrencyBRL(currentProduct.promotionalPrice)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Desconto:</span>
                    <strong className="text-rose-400">{currentProduct.discountPercentage}% OFF</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sua Comissão Estimada:</span>
                    <strong className="text-emerald-400">
                      {formatCurrencyBRL(currentProduct.estimatedProfit)} ({currentProduct.commissionRate}%)
                    </strong>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleSimulateSend}
                disabled={isTyping || products.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {products.length === 0
                    ? 'Nenhum produto cadastrado'
                    : isTyping
                    ? 'Robô Digitando e Postando...'
                    : 'Disparar Oferta no Simulador'}
                </span>
              </button>

              <p className="text-[11px] text-slate-500 text-center">
                Ao disparar, a mensagem passa pelo motor Spintax e adiciona atraso anti-spam automático.
              </p>
            </div>
          </div>

          {/* Phone Screen Right */}
          <div className="md:col-span-7 flex justify-center items-center">
            <div className="w-full max-w-[340px] h-[520px] bg-[#0b141a] rounded-[36px] border-4 border-slate-700 shadow-2xl flex flex-col overflow-hidden relative">
              {/* WhatsApp Group Header */}
              <div className="bg-[#1f2c34] px-3.5 py-3 flex items-center justify-between text-white border-b border-slate-800 shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <ArrowLeft className="w-4 h-4 text-slate-400" />
                  <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-600">
                    👥
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">
                      {currentGroup?.name || 'Grupo WhatsApp'}
                    </p>
                    <p className="text-[10px] text-emerald-400 truncate">
                      {isTyping ? 'Robô digitando...' : `${currentGroup?.membersCount || 0} participantes`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-slate-400 shrink-0">
                  <Video className="w-3.5 h-3.5" />
                  <Phone className="w-3.5 h-3.5" />
                  <MoreVertical className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#0b141a] bg-opacity-95">
                <div className="text-center my-2">
                  <span className="text-[10px] bg-[#182229] text-slate-400 px-2 py-0.5 rounded-md shadow-xs">
                    HOJE
                  </span>
                </div>

                {dispatchedMessages.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs px-4">
                    Nenhuma mensagem enviada neste grupo ainda. Cadastre um produto e clique em disparar.
                  </div>
                ) : (
                  dispatchedMessages.map((msg) => (
                    <div key={msg.id} className="max-w-[88%] ml-auto">
                      <div className="bg-[#005c4b] text-white rounded-2xl rounded-tr-xs p-2.5 shadow-md space-y-2">
                        {msg.product?.imageUrl && (
                          <div className="rounded-xl overflow-hidden max-h-36 w-full bg-slate-900">
                            <img
                              src={msg.product.imageUrl}
                              alt={msg.product.title}
                              className="w-full h-36 object-cover"
                            />
                          </div>
                        )}

                        <div className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans text-slate-100">
                          {msg.text}
                        </div>

                        <div className="flex items-center justify-end space-x-1 text-[9px] text-emerald-200 pt-0.5">
                          <span>{msg.time}</span>
                          <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {isTyping && (
                  <div className="bg-[#202c33] text-emerald-400 text-xs px-3 py-1.5 rounded-full inline-flex items-center space-x-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="text-[10px]">Robô divulgando oferta...</span>
                  </div>
                )}
              </div>

              {/* WhatsApp Fake Input Bar */}
              <div className="bg-[#1f2c34] px-3 py-2 flex items-center space-x-2 shrink-0 border-t border-slate-800">
                <Smile className="w-4 h-4 text-slate-400" />
                <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1.5 text-[11px] text-slate-400">
                  Somente admins podem enviar
                </div>
                <Paperclip className="w-4 h-4 text-slate-400" />
                <div className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-slate-950">
                  <Mic className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
