import React, { useState } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Users,
  Send,
  Plus,
  ShieldCheck,
  Zap,
  Info,
  Radio,
  Clock,
  Sparkles,
  Smartphone,
  ExternalLink,
  Trash2,
  KeyRound,
  RotateCcw,
  Download,
  Link,
  CheckSquare,
  Square,
  Tag,
  Filter,
} from 'lucide-react';
import { WhatsAppStatus, WhatsAppGroup, Product } from '../types';

interface WhatsAppConnectorProps {
  status: WhatsAppStatus;
  groups: WhatsAppGroup[];
  products: Product[];
  onConnectBaileys: () => Promise<void>;
  onResetSession: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onRequestPairingCode: (phone: string) => Promise<string | null>;
  onFactoryReset: () => Promise<void>;
  onSyncGroups: () => Promise<void>;
  onImportInviteGroup: (inviteUrl: string, category?: string) => Promise<void>;
  onSelectAllGroups: (selectAll: boolean, onlyAnnouncement?: boolean) => Promise<void>;
  onToggleGroupSelection: (groupId: string) => Promise<void>;
  onAddGroup: (name: string, jid?: string, description?: string, category?: string) => Promise<void>;
  onUpdateGroup: (id: string, group: Partial<WhatsAppGroup>) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  onSendTestToGroup: (groupId: string, productId?: string) => Promise<void>;
  isLoading: boolean;
}

export const WhatsAppConnector: React.FC<WhatsAppConnectorProps> = ({
  status,
  groups,
  products,
  onConnectBaileys,
  onResetSession,
  onDisconnect,
  onRequestPairingCode,
  onFactoryReset,
  onSyncGroups,
  onImportInviteGroup,
  onSelectAllGroups,
  onToggleGroupSelection,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onSendTestToGroup,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Add manual group state
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupJid, setNewGroupJid] = useState('');
  const [newGroupCategory, setNewGroupCategory] = useState('Geral');

  // Import invite state
  const [inviteUrlInput, setInviteUrlInput] = useState('');
  const [inviteCategory, setInviteCategory] = useState('Geral');
  const [isImportingInvite, setIsImportingInvite] = useState(false);

  // Pairing code state
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [pairingCodeResult, setPairingCodeResult] = useState<string | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [sendingGroupId, setSendingGroupId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const selectedCount = groups.filter((g) => g.isSelected).length;

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || (g.category && g.category.toLowerCase() === categoryFilter.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(groups.map((g) => g.category || 'Geral')));

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await onAddGroup(newGroupName, newGroupJid || undefined, undefined, newGroupCategory);
    setNewGroupName('');
    setNewGroupJid('');
    setShowAddModal(false);
    setFeedbackToast({ message: 'Grupo adicionado com sucesso!', type: 'success' });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleImportInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUrlInput.trim()) return;
    setIsImportingInvite(true);
    try {
      await onImportInviteGroup(inviteUrlInput.trim(), inviteCategory);
      setInviteUrlInput('');
      setShowInviteModal(false);
      setFeedbackToast({ message: 'Grupo puxado pelo link com sucesso!', type: 'success' });
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (err: any) {
      setFeedbackToast({ message: err?.message || 'Erro ao puxar grupo pelo link', type: 'error' });
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setIsImportingInvite(false);
    }
  };

  const handleSyncFromWhatsApp = async () => {
    if (!status.connected) {
      setFeedbackToast({
        message: 'Conecte o WhatsApp escaneando o QR Code antes de puxar os grupos automaticamente.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
      return;
    }

    setIsSyncing(true);
    try {
      await onSyncGroups();
      setFeedbackToast({ message: 'Todos os grupos do WhatsApp foram atualizados com sucesso!', type: 'success' });
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (err: any) {
      setFeedbackToast({ message: err?.message || 'Falha ao sincronizar grupos', type: 'error' });
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestSend = async (groupId: string) => {
    if (products.length === 0) {
      setFeedbackToast({
        message: 'Cadastre pelo menos 1 produto antes de enviar o teste.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
      return;
    }

    setSendingGroupId(groupId);
    try {
      await onSendTestToGroup(groupId, selectedProductId);
      const group = groups.find((g) => g.id === groupId);
      setFeedbackToast({
        message: `Mensagem enviada com sucesso para "${group?.name || 'Grupo'}"!`,
        type: 'success',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
    } catch (err: any) {
      setFeedbackToast({
        message: err?.message || 'Erro ao enviar. Verifique a conexão com o WhatsApp.',
        type: 'error',
      });
      setTimeout(() => setFeedbackToast(null), 4000);
    } finally {
      setSendingGroupId(null);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumberInput.trim()) return;
    setIsPairingLoading(true);
    setPairingError(null);
    try {
      const code = await onRequestPairingCode(phoneNumberInput.trim());
      if (code) {
        setPairingCodeResult(code);
      } else {
        setPairingError('Não foi possível obter o código. Tente reiniciar a sessão.');
      }
    } catch (err: any) {
      setPairingError(err?.message || 'Falha ao solicitar código de pareamento.');
    } finally {
      setIsPairingLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl font-bold flex items-center space-x-3 animate-bounce ${
            feedbackToast.type === 'success'
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-rose-500 text-white'
          }`}
        >
          {feedbackToast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Conexão Oficial WhatsApp Web (Baileys)</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {status.connected ? 'WhatsApp Conectado' : 'Aguardando Escaneamento'}
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                O QR Code abaixo é <strong>gerado diretamente com os servidores do WhatsApp Web</strong>.
                Depois de escanear, você pode puxar todos os seus grupos automaticamente ou importar grupos específicos por link.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 self-end md:self-center flex-wrap gap-y-2">
            <button
              onClick={onResetSession}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
              title="Gera um novo QR Code oficial do WhatsApp"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Gerar Novo QR</span>
            </button>

            <button
              onClick={() => setShowPairingModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 flex items-center space-x-1.5 transition"
              title="Conectar digitando código de 8 dígitos no celular"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Código de 8 Dígitos</span>
            </button>

            <button
              onClick={onFactoryReset}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-950/80 text-rose-400 border border-rose-800/40 flex items-center space-x-1.5 transition"
              title="Restaura o aplicativo ao padrão de fábrica (limpa tudo)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zerar Tudo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: QR Code + Área de Grupos Específicos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: QR Code WhatsApp Web */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span>QR Code WhatsApp Web</span>
              </h3>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  status.connected
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                }`}
              >
                {status.connected ? 'Online' : 'Pronto p/ Escanear'}
              </span>
            </div>

            {status.connected ? (
              /* Connected State */
              <div className="text-center py-8 px-4 bg-slate-950/60 rounded-xl border border-emerald-500/30">
                <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-white">WhatsApp Conectado!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Sessão ativa e autenticada com sucesso via Baileys.
                </p>

                <div className="mt-5 text-left bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Número Conectado:</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {status.phoneNumber || 'Número Conectado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nome:</span>
                    <span className="font-semibold text-white">
                      {status.userName || 'WhatsApp Conectado'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grupos Puxados:</span>
                    <span className="font-semibold text-emerald-400">{groups.length} grupos</span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    onClick={onResetSession}
                    disabled={isLoading}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 border border-slate-700 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reconectar</span>
                  </button>
                  <button
                    onClick={onDisconnect}
                    disabled={isLoading}
                    className="flex-1 py-2 px-3 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold flex items-center justify-center space-x-1.5 border border-rose-800/40 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </button>
                </div>
              </div>
            ) : (
              /* QR Code Display */
              <div className="flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500/40 relative">
                  {status.qrCodeDataUrl ? (
                    <img
                      src={status.qrCodeDataUrl}
                      alt="WhatsApp Web QR Code Oficial"
                      className="w-60 h-60 sm:w-64 sm:h-64 object-contain"
                    />
                  ) : (
                    <div className="w-60 h-60 sm:w-64 sm:h-64 flex flex-col items-center justify-center bg-slate-100 text-slate-600 text-xs text-center p-4">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                      <span>Conectando aos servidores do WhatsApp...</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 w-full bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                  <p className="font-bold text-slate-200">Como escanear no seu celular:</p>
                  <div className="flex items-start space-x-2 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span>Abra o <strong>WhatsApp</strong> no seu smartphone.</span>
                  </div>
                  <div className="flex items-start space-x-2 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span>
                      Vá em <strong>Configurações</strong> &gt; <strong>Aparelhos Conectados</strong>.
                    </span>
                  </div>
                  <div className="flex items-start space-x-2 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span>
                      Toque em <strong>Conectar um aparelho</strong> e aponte para o QR Code acima.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Criptografia oficial ponta a ponta</span>
            </span>
            <button
              onClick={onResetSession}
              className="text-emerald-400 hover:underline font-semibold"
            >
              Recarregar QR
            </button>
          </div>
        </div>

        {/* Right: Área de Grupos Específicos (Atualizar e Puxar os Grupos que Quiser) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            {/* Header & Main Pull Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Área de Grupos Específicos</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    {selectedCount} selecionados p/ envio
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Puxe todos os grupos da sua conta, adicione por link ou cadastre grupos específicos.
                </p>
              </div>

              {/* Action Buttons to Pull / Add Groups */}
              <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <button
                  onClick={handleSyncFromWhatsApp}
                  disabled={isSyncing}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition active:scale-95"
                  title="Puxar todos os grupos participantes da sua conta conectada"
                >
                  <Download className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                  <span>{isSyncing ? 'Puxando...' : 'Puxar do WhatsApp'}</span>
                </button>

                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 flex items-center space-x-1.5 transition"
                  title="Puxar grupo por link de convite (chat.whatsapp.com/...)"
                >
                  <Link className="w-3.5 h-3.5" />
                  <span>Puxar por Link</span>
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 flex items-center space-x-1.5 transition"
                  title="Cadastrar grupo manualmente"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Manual</span>
                </button>
              </div>
            </div>

            {/* Batch Controls: Marcar Todos / Desmarcar Todos / Apenas Admins */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400 font-semibold">Seleção Rápida:</span>
                <button
                  onClick={() => onSelectAllGroups(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold border border-slate-700 transition"
                >
                  Marcar Todos
                </button>
                <button
                  onClick={() => onSelectAllGroups(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold border border-slate-700 transition"
                >
                  Desmarcar Todos
                </button>
                <button
                  onClick={() => onSelectAllGroups(false, true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold border border-slate-700 transition"
                  title="Selecionar apenas grupos onde somente administradores podem enviar"
                >
                  Apenas Admins
                </button>
              </div>

              {products.length > 0 && (
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">Oferta Teste:</span>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full sm:w-44 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-500 truncate"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.marketplace.toUpperCase()}] {p.title.substring(0, 24)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
              <div className="sm:col-span-8">
                <input
                  type="text"
                  placeholder="Buscar grupo por nome ou JID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Todas Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Group List */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {groups.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 p-6">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-white">Nenhum grupo cadastrado ainda</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Conecte seu WhatsApp e clique em <strong>Puxar do WhatsApp</strong> para carregar seus grupos automaticamente, ou clique em <strong>Puxar por Link</strong> para importar qualquer grupo via convite.
                  </p>
                  <div className="mt-4 flex justify-center space-x-3">
                    <button
                      onClick={handleSyncFromWhatsApp}
                      disabled={isSyncing}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center space-x-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Puxar Grupos do WhatsApp</span>
                    </button>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                    >
                      <span>Colar Link de Grupo</span>
                    </button>
                  </div>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-400">
                  Nenhum grupo encontrado com os filtros aplicados.
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isSendingThis = sendingGroupId === group.id;
                  return (
                    <div
                      key={group.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        group.isSelected
                          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md'
                          : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
                          onClick={() => onToggleGroupSelection(group.id)}
                        >
                          <input
                            type="checkbox"
                            checked={group.isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-slate-700 bg-slate-800 shrink-0 cursor-pointer"
                          />

                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 font-bold shrink-0 text-sm">
                            👥
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {group.name}
                              </h4>
                              {group.category && (
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-teal-300 font-medium border border-slate-700">
                                  {group.category}
                                </span>
                              )}
                              {group.isAnnouncementOnly && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold">
                                  Somente Admins
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                              {group.membersCount > 0 && <span>{group.membersCount} participantes</span>}
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-500 truncate">
                                {group.id}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center space-x-2">
                          <button
                            onClick={() => handleTestSend(group.id)}
                            disabled={isSendingThis}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/30 flex items-center space-x-1.5 transition active:scale-95"
                            title="Disparar oferta agora neste grupo"
                          >
                            <Send className={`w-3.5 h-3.5 ${isSendingThis ? 'animate-bounce' : ''}`} />
                            <span className="hidden sm:inline">
                              {isSendingThis ? 'Enviando...' : 'Testar Envio'}
                            </span>
                          </button>

                          <button
                            onClick={() => onDeleteGroup(group.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs border border-slate-700 transition"
                            title="Remover grupo do bot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <div>
              <span>Grupos ativos no divulgador: </span>
              <strong className="text-emerald-400">{selectedCount}</strong> de {groups.length} grupos
            </div>
            <div className="text-[11px] text-slate-500">
              O bot só publicará nos grupos marcados com caixinha verde.
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Puxar Grupo por Link de Convite */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1.5 flex items-center space-x-2">
              <Link className="w-5 h-5 text-teal-400" />
              <span>Puxar Grupo por Link de Convite</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Cole o link de convite do grupo do WhatsApp. O robô vai extrair os detalhes do grupo e adicioná-lo para você.
            </p>

            <form onSubmit={handleImportInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Link de Convite do WhatsApp *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://chat.whatsapp.com/ABCxyz123..."
                  value={inviteUrlInput}
                  onChange={(e) => setInviteUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria do Grupo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Achadinhos Shopee, Promoções Mercado Livre, Geral"
                  value={inviteCategory}
                  onChange={(e) => setInviteCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isImportingInvite}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                >
                  {isImportingInvite ? 'Puxando Grupo...' : 'Puxar e Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pairing Code 8 Dígitos */}
      {showPairingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1.5 flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-teal-400" />
              <span>Conectar com Código de Pareamento</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Digite seu número com DDI e DDD (ex: 5511999999999) para receber o código de 8 dígitos para digitar no WhatsApp.
            </p>

            {pairingCodeResult ? (
              <div className="bg-slate-950 p-5 rounded-2xl border border-teal-500/40 text-center space-y-3 mb-4">
                <p className="text-xs text-slate-400">Seu Código de Pareamento:</p>
                <div className="text-3xl font-mono font-black text-teal-400 tracking-widest py-2 bg-slate-900 rounded-xl border border-slate-800">
                  {pairingCodeResult}
                </div>
                <p className="text-xs text-slate-300">
                  Abra a notificação no seu WhatsApp e digite esse código para confirmar a conexão.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Número do WhatsApp (com DDI e DDD) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 5511999999999"
                    value={phoneNumberInput}
                    onChange={(e) => setPhoneNumberInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Formato: 55 + DDD + Número (apenas dígitos)
                  </span>
                </div>

                {pairingError && (
                  <div className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-xl">
                    {pairingError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPairingLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                >
                  {isPairingLoading ? 'Solicitando Código...' : 'Gerar Código de 8 Dígitos'}
                </button>
              </form>
            )}

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPairingModal(false);
                  setPairingCodeResult(null);
                  setPairingError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Grupo Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Cadastrar Grupo Manual</h3>
            <p className="text-xs text-slate-400 mb-4">
              Informe o nome e detalhes do grupo para divulgar ofertas.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Grupo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ofertas VIP Mercado Livre & Shopee"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Categoria / Tag do Grupo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Shopee, Mercado Livre, Cupons, Geral"
                  value={newGroupCategory}
                  onChange={(e) => setNewGroupCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ID / JID do WhatsApp (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1203630123456789@g.us (deixe em branco para gerar automático)"
                  value={newGroupJid}
                  onChange={(e) => setNewGroupJid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                >
                  Salvar Grupo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
