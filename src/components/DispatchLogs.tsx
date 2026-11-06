import React from 'react';
import {
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { DispatchLog } from '../types';
import { formatCurrencyBRL } from '../services/antiSpam';

interface DispatchLogsProps {
  logs: DispatchLog[];
  onClearLogs: () => Promise<void>;
  isLoading: boolean;
}

export const DispatchLogs: React.FC<DispatchLogsProps> = ({
  logs,
  onClearLogs,
  isLoading,
}) => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Send className="w-5 h-5 text-emerald-400" />
            <span>Histórico de Divulgações no WhatsApp</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {logs.length} registros
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Registro em tempo real de mensagens enviadas, atrasos anti-spam aplicados e comissões estimadas.
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={onClearLogs}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 flex items-center space-x-2 transition self-end sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Histórico</span>
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {logs.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-300">Nenhum envio registrado ainda</h4>
            <p className="text-xs text-slate-500 mt-1">
              Assim que o robô enviar mensagens para seus grupos do WhatsApp, os relatórios aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => {
              const formattedDate = new Date(log.timestamp).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'medium',
              });

              return (
                <div
                  key={log.id}
                  className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {log.status === 'success' || log.status === 'simulated' ? (
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-bold text-white text-xs sm:text-sm truncate">
                            {log.productTitle}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              log.marketplace === 'mercadolivre'
                                ? 'bg-yellow-400/20 text-yellow-300'
                                : 'bg-orange-500/20 text-orange-300'
                            }`}
                          >
                            {log.marketplace.toUpperCase()}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            {log.status === 'simulated' ? 'Modo Teste' : 'WhatsApp Real'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 mt-1 font-mono line-clamp-1">
                          {log.messagePreview}
                        </p>

                        <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-2 flex-wrap gap-y-1">
                          <span>Grupo: <strong className="text-slate-300">{log.groupName}</strong></span>
                          <span>•</span>
                          <span className="flex items-center space-x-1 text-slate-400">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>Anti-spam: {log.antiSpamDelayAppliedSeconds}s intervalo</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center space-x-1 text-emerald-400 font-semibold">
                            <TrendingUp className="w-3 h-3" />
                            <span>Comissão est.: {formatCurrencyBRL(log.commissionEstimated)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-xs font-mono text-slate-400">
                      {formattedDate}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
