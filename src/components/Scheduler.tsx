import React, { useState } from 'react';
import {
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  ShoppingBag,
  Zap,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ScheduleItem, Product, WhatsAppGroup, ScheduleFrequency } from '../types';
import { formatCurrencyBRL } from '../services/antiSpam';

interface SchedulerProps {
  schedules: ScheduleItem[];
  products: Product[];
  groups: WhatsAppGroup[];
  onCreateSchedule: (sched: Partial<ScheduleItem>) => Promise<void>;
  onUpdateSchedule: (id: string, sched: Partial<ScheduleItem>) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onRunNow: (id: string) => Promise<void>;
  defaultProductId?: string;
}

export const Scheduler: React.FC<SchedulerProps> = ({
  schedules,
  products,
  groups,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onRunNow,
  defaultProductId,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  // Schedule creation form state
  const [productId, setProductId] = useState<string>(defaultProductId || products[0]?.id || '');
  const [targetGroupIds, setTargetGroupIds] = useState<string[]>(
    groups.filter((g) => g.isSelected).map((g) => g.id)
  );
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState<string>('12:00');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [notes, setNotes] = useState<string>('');

  const daysLabels = [
    { day: 0, label: 'Dom' },
    { day: 1, label: 'Seg' },
    { day: 2, label: 'Ter' },
    { day: 3, label: 'Qua' },
    { day: 4, label: 'Qui' },
    { day: 5, label: 'Sex' },
    { day: 6, label: 'Sáb' },
  ];

  const handleToggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleToggleGroup = (gid: string) => {
    if (targetGroupIds.includes(gid)) {
      setTargetGroupIds(targetGroupIds.filter((id) => id !== gid));
    } else {
      setTargetGroupIds([...targetGroupIds, gid]);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    await onCreateSchedule({
      productId,
      targetGroupIds: targetGroupIds.length > 0 ? targetGroupIds : groups.map((g) => g.id),
      scheduledDate,
      scheduledTime,
      frequency,
      daysOfWeek: frequency === 'weekly' ? selectedDays : undefined,
      notes: notes || undefined,
      status: 'pending',
    });

    setShowModal(false);
  };

  const handleExecuteNow = async (id: string) => {
    setRunningId(id);
    try {
      await onRunNow(id);
    } finally {
      setRunningId(null);
    }
  };

  // Quick Preset Helper
  const applyPreset = (time: string, freq: ScheduleFrequency, noteText: string) => {
    setScheduledTime(time);
    setFrequency(freq);
    setNotes(noteText);
    setShowModal(true);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>Agendamento Totalmente Automático de Divulgações</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Programe os dias da semana, horários de pico comercial e meses de postagem para cada produto.
              O robô disparará nos grupos de WhatsApp especificados respeitando os intervalos anti-spam.
            </p>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-center">
            <button
              onClick={() => {
                setProductId(products[0]?.id || '');
                setShowModal(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Quick Best Practice Presets */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <p className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Horários de Mais Vendas no Brasil (Presets Rápidos):</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyPreset('11:45', 'daily', 'Disparo de Almoço - Alto clique mobile')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              ☀️ Almoço (11:45)
            </button>
            <button
              onClick={() => applyPreset('15:30', 'daily', 'Café da Tarde - Ofertas Relâmpago Shopee')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              ⚡ Tarde Relâmpago (15:30)
            </button>
            <button
              onClick={() => applyPreset('19:45', 'daily', 'Pico Noturno - Maior conversão de compras')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              🌙 Horário Nobre (19:45)
            </button>
            <button
              onClick={() => applyPreset('10:00', 'weekly', 'Achadinhos de Sábado')}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              🛍️ Sábado VIP (10:00)
            </button>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-emerald-400" />
            <span>Fila de Postagens Programadas</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {schedules.length} ativas
            </span>
          </h3>
        </div>

        {schedules.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-300">Nenhum agendamento ativo</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Crie agendamentos automáticos para que seus grupos recebam ofertas todos os dias sem você precisar postar manualmente.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map((schedule) => {
              const product = products.find((p) => p.id === schedule.productId);
              const isExecuting = runningId === schedule.id;

              return (
                <div
                  key={schedule.id}
                  className={`p-4 rounded-xl border transition-all ${
                    schedule.status === 'paused'
                      ? 'bg-slate-950/30 border-slate-800 opacity-70'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 shadow-md'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Product & Timing Info */}
                    <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                      {product?.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.title}
                          className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                          <ShoppingBag className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            ⏰ {schedule.scheduledTime}
                          </span>

                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                            {schedule.frequency === 'daily'
                              ? '🔄 Todos os Dias'
                              : schedule.frequency === 'weekly'
                              ? '📅 Dias da Semana'
                              : `📆 Data: ${schedule.scheduledDate}`}
                          </span>

                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              schedule.status === 'sent'
                                ? 'bg-teal-500/20 text-teal-300'
                                : schedule.status === 'paused'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {schedule.status === 'sent'
                              ? 'Disparado'
                              : schedule.status === 'paused'
                              ? 'Pausado'
                              : 'Pronto p/ Envio'}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-1.5">
                          {product ? product.title : 'Produto não encontrado'}
                        </h4>

                        <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1 flex-wrap gap-y-1">
                          {product && (
                            <span className="text-emerald-400 font-bold">
                              Comissão: {formatCurrencyBRL(product.estimatedProfit)} ({product.commissionRate}%)
                            </span>
                          )}
                          <span>•</span>
                          <span className="flex items-center space-x-1 text-slate-300">
                            <Users className="w-3.5 h-3.5 text-teal-400" />
                            <span>
                              {schedule.targetGroupIds.length} grupo(s) configurado(s)
                            </span>
                          </span>
                          {schedule.notes && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400 italic">"{schedule.notes}"</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-2 self-end lg:self-center shrink-0">
                      <button
                        onClick={() => handleExecuteNow(schedule.id)}
                        disabled={isExecuting}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition active:scale-95"
                        title="Executar disparo agora mesmo"
                      >
                        <Zap className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                        <span>{isExecuting ? 'Disparando...' : 'Disparar Agora'}</span>
                      </button>

                      <button
                        onClick={() =>
                          onUpdateSchedule(schedule.id, {
                            status: schedule.status === 'paused' ? 'pending' : 'paused',
                          })
                        }
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                        title={schedule.status === 'paused' ? 'Ativar agendamento' : 'Pausar agendamento'}
                      >
                        {schedule.status === 'paused' ? (
                          <Play className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Pause className="w-4 h-4 text-amber-400" />
                        )}
                      </button>

                      <button
                        onClick={() => onDeleteSchedule(schedule.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs border border-slate-700 transition"
                        title="Excluir agendamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <h3 className="text-base font-bold text-white mb-2">Criar Agendamento de Divulgação</h3>
            <p className="text-xs text-slate-400 mb-6">
              Defina o produto, o horário, a data e os grupos de WhatsApp que receberão a oferta.
            </p>

            <form onSubmit={handleSaveSchedule} className="space-y-4">
              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Selecione o Produto *
                </label>
                {products.length === 0 ? (
                  <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300">
                    Nenhum produto cadastrado no catálogo. Adicione um produto na aba "Produtos & Links" antes de agendar.
                  </div>
                ) : (
                  <select
                    required
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.marketplace.toUpperCase()}] {p.title} — {formatCurrencyBRL(p.promotionalPrice)} (Lucro: {formatCurrencyBRL(p.estimatedProfit)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Horário da Postagem (Hora e Minuto) *
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Frequência *
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="daily">Todos os dias (Diário)</option>
                    <option value="weekly">Dias específicos da semana</option>
                    <option value="once">Disparo Único (Data fixa)</option>
                  </select>
                </div>
              </div>

              {/* Date if Once */}
              {frequency === 'once' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data do Disparo (Dia / Mês / Ano) *
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Days of week if Weekly */}
              {frequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dias da Semana para Divulgar:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {daysLabels.map((d) => {
                      const isSelected = selectedDays.includes(d.day);
                      return (
                        <button
                          key={d.day}
                          type="button"
                          onClick={() => handleToggleDay(d.day)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            isSelected
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Target Groups Area */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Grupos de WhatsApp Específicos para Enviar:
                </label>
                <div className="max-h-36 overflow-y-auto space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {groups.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      Nenhum grupo cadastrado ainda. Conecte o WhatsApp ou adicione um grupo na aba "Conexão & Grupos".
                    </div>
                  ) : (
                    groups.map((group) => {
                      const isChecked = targetGroupIds.includes(group.id);
                      return (
                        <div
                          key={group.id}
                          onClick={() => handleToggleGroup(group.id)}
                          className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer border ${
                            isChecked
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-white'
                              : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="font-medium truncate">{group.name}</span>
                          <span className="text-[11px] text-slate-400">👥 {group.membersCount}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações / Nome da Campanha (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Campanha Especial Dias das Mães, Achadinho Black Friday"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                >
                  Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
