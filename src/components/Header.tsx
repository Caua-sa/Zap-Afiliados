import React from 'react';
import {
  Smartphone,
  ShieldCheck,
  Send,
  TrendingUp,
  Clock,
  ShoppingBag,
  ExternalLink,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { WhatsAppStatus } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  status: WhatsAppStatus;
  safetyScore: number;
  todayCount: number;
  maxToday: number;
  onOpenSimulator: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  status,
  safetyScore,
  todayCount,
  maxToday,
  onOpenSimulator,
  onRefresh,
  isRefreshing,
}) => {
  const isConnected = status.connected;

  const tabs = [
    { id: 'whatsapp', label: 'Área de Grupos & WhatsApp', icon: Smartphone, badge: isConnected ? 'Online' : 'Desconectado' },
    { id: 'products', label: 'Produtos & Disparo do Dia', icon: ShoppingBag, badge: 'Links Reais' },
    { id: 'scheduler', label: 'Agendamentos', icon: Clock },
    { id: 'antispam', label: 'Anti-Spam', icon: ShieldCheck, badge: `${safetyScore}% Seguro` },
    { id: 'profits', label: 'Margens de Lucro', icon: TrendingUp },
    { id: 'logs', label: 'Histórico de Envios', icon: Send },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Smartphone className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  ZapAfiliados
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Bot Baileys Pro
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Mercado Livre & Shopee • Divulgador Automático de Grupos
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* WhatsApp Status Pill */}
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden md:inline font-semibold">WhatsApp Conectado</span>
                  <span className="md:hidden font-semibold">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-amber-300">Conectar QR Code</span>
                </>
              )}
            </button>

            {/* Anti-Spam Safety Indicator */}
            <button
              onClick={() => setActiveTab('antispam')}
              className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition"
              title="Proteção Ativa contra bloqueios"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Anti-Spam:</span>
              <span className="font-bold text-emerald-400">{safetyScore}% Seguro</span>
            </button>

            {/* Daily Dispatches Pill */}
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 border border-slate-700/80">
              <Send className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-slate-300">Hoje:</span>
              <span className="font-bold text-white">
                {todayCount}/{maxToday}
              </span>
            </div>

            {/* Live WhatsApp Simulator Preview Button */}
            <button
              onClick={onOpenSimulator}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950 transition active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver no WhatsApp</span>
              <span className="sm:hidden">Simulador</span>
            </button>

            {/* Refresh */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 border border-slate-700 hover:bg-slate-700 transition"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2.5 scrollbar-none border-t border-slate-800/60">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                      isActive
                        ? 'bg-slate-950/20 text-slate-950'
                        : tab.badge === 'Online'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : tab.badge === 'Desconectado'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
