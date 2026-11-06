/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { WhatsAppConnector } from './components/WhatsAppConnector';
import { ProductManager } from './components/ProductManager';
import { Scheduler } from './components/Scheduler';
import { AntiSpamSettings } from './components/AntiSpamSettings';
import { ProfitDashboard } from './components/ProfitDashboard';
import { DispatchLogs } from './components/DispatchLogs';
import { WhatsAppSimulatorModal } from './components/WhatsAppSimulatorModal';
import {
  WhatsAppStatus,
  WhatsAppGroup,
  Product,
  ScheduleItem,
  DispatchLog,
  AntiSpamConfig,
  AffiliateSettings,
  StatsSummary,
} from './types';
import { DEFAULT_ANTISPAM_CONFIG, calculateSafetyScore } from './services/antiSpam';
import {
  INITIAL_GROUPS,
  INITIAL_PRODUCTS,
  INITIAL_SCHEDULES,
  INITIAL_LOGS,
  DEFAULT_AFFILIATE_SETTINGS,
} from './services/mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('whatsapp');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [targetScheduleProductId, setTargetScheduleProductId] = useState<string | undefined>();

  // State
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    state: 'disconnected',
    qrCodeDataUrl: null,
    phoneNumber: null,
    userName: null,
    mode: 'baileys_live',
    messagesSentToday: 0,
  });

  const [groups, setGroups] = useState<WhatsAppGroup[]>(INITIAL_GROUPS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(INITIAL_SCHEDULES);
  const [logs, setLogs] = useState<DispatchLog[]>(INITIAL_LOGS);
  const [antiSpamConfig, setAntiSpamConfig] = useState<AntiSpamConfig>(DEFAULT_ANTISPAM_CONFIG);
  const [affiliateSettings, setAffiliateSettings] = useState<AffiliateSettings>(DEFAULT_AFFILIATE_SETTINGS);
  const [stats, setStats] = useState<StatsSummary | null>(null);

  // Fetch all data from backend
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [
        resStatus,
        resGroups,
        resProducts,
        resSchedules,
        resLogs,
        resAntiSpam,
        resAffiliate,
        resStats,
      ] = await Promise.allSettled([
        fetch('/api/whatsapp/status').then((r) => r.json()),
        fetch('/api/whatsapp/groups').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
        fetch('/api/schedules').then((r) => r.json()),
        fetch('/api/logs').then((r) => r.json()),
        fetch('/api/antispam').then((r) => r.json()),
        fetch('/api/settings/affiliate').then((r) => r.json()),
        fetch('/api/stats').then((r) => r.json()),
      ]);

      if (resStatus.status === 'fulfilled' && resStatus.value) {
        setStatus(resStatus.value);
      }
      if (resGroups.status === 'fulfilled' && Array.isArray(resGroups.value)) {
        setGroups(resGroups.value);
      }
      if (resProducts.status === 'fulfilled' && Array.isArray(resProducts.value)) {
        setProducts(resProducts.value);
      }
      if (resSchedules.status === 'fulfilled' && Array.isArray(resSchedules.value)) {
        setSchedules(resSchedules.value);
      }
      if (resLogs.status === 'fulfilled' && Array.isArray(resLogs.value)) {
        setLogs(resLogs.value);
      }
      if (resAntiSpam.status === 'fulfilled' && resAntiSpam.value?.config) {
        setAntiSpamConfig(resAntiSpam.value.config);
      }
      if (resAffiliate.status === 'fulfilled' && resAffiliate.value?.settings) {
        setAffiliateSettings(resAffiliate.value.settings);
      }
      if (resStats.status === 'fulfilled' && resStats.value) {
        setStats(resStats.value);
      }
    } catch (err) {
      console.warn('API sync warning:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // WhatsApp connection handlers
  const handleConnectBaileys = async (mode?: string) => {
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (data.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      const data = await res.json();
      if (data.status) {
        setStatus(data.status);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Group handlers
  const handleToggleGroupSelection = async (groupId: string) => {
    const updated = groups.map((g) => (g.id === groupId ? { ...g, isSelected: !g.isSelected } : g));
    setGroups(updated);
    try {
      await fetch('/api/whatsapp/groups/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedGroupIds: updated.filter((g) => g.isSelected).map((g) => g.id),
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddGroup = async (name: string, jid?: string, description?: string, category?: string) => {
    try {
      const res = await fetch('/api/whatsapp/groups/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, jid, description, category }),
      });
      const newGroup = await res.json();
      if (newGroup && newGroup.id) {
        setGroups((prev) => [newGroup, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncGroups = async () => {
    try {
      const res = await fetch('/api/whatsapp/groups/sync', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao sincronizar grupos');
      }
      if (data.groups) {
        setGroups(data.groups);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleImportInviteGroup = async (inviteUrl: string, category?: string) => {
    try {
      const res = await fetch('/api/whatsapp/groups/import-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteUrl, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao puxar grupo pelo link');
      }
      if (data.group) {
        setGroups((prev) => {
          const idx = prev.findIndex((g) => g.id === data.group.id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = data.group;
            return copy;
          }
          return [data.group, ...prev];
        });
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleSelectAllGroups = async (selectAll: boolean, onlyAnnouncement?: boolean) => {
    try {
      const res = await fetch('/api/whatsapp/groups/select-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectAll, onlyAnnouncement }),
      });
      const data = await res.json();
      if (data.groups) {
        setGroups(data.groups);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateGroup = async (id: string, group: Partial<WhatsAppGroup>) => {
    try {
      const res = await fetch(`/api/whatsapp/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(group),
      });
      const updated = await res.json();
      setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTestToGroup = async (groupId: string, productId?: string) => {
    try {
      const res = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId, productId }),
      });
      const data = await res.json();
      if (data.log) {
        setLogs((prev) => [data.log, ...prev]);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSession = async () => {
    try {
      const res = await fetch('/api/whatsapp/reset-session', { method: 'POST' });
      const data = await res.json();
      if (data.status) {
        setStatus(data.status);
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestPairingCode = async (phoneNumber: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/whatsapp/pairing-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json();
      if (data.pairingCode) {
        return data.pairingCode;
      }
      if (data.error) {
        throw new Error(data.error);
      }
      return null;
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const handleFactoryReset = async () => {
    if (!confirm('Deseja realmente restaurar o aplicativo aos padrões de fábrica? Todos os produtos, grupos cadastrados e logs serão zerados.')) {
      return;
    }
    try {
      await fetch('/api/factory-reset', { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await fetch(`/api/whatsapp/groups/${groupId}`, { method: 'DELETE' });
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Product handlers
  const handleAddProduct = async (prod: Partial<Product>) => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
      });
      const created = await res.json();
      setProducts((prev) => [created, ...prev]);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProduct = async (id: string, prod: Partial<Product>) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
      });
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleParseLink = async (url: string) => {
    try {
      const res = await fetch('/api/products/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleSaveAffiliateSettings = async (settings: Partial<AffiliateSettings>) => {
    try {
      const res = await fetch('/api/settings/affiliate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.settings) {
        setAffiliateSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Schedule handlers
  const handleCreateSchedule = async (sched: Partial<ScheduleItem>) => {
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sched),
      });
      const created = await res.json();
      setSchedules((prev) => [created, ...prev]);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSchedule = async (id: string, sched: Partial<ScheduleItem>) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sched),
      });
      const updated = await res.json();
      setSchedules((prev) => prev.map((s) => (s.id === id ? updated : s)));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    try {
      await fetch(`/api/schedules/${id}/run-now`, { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Anti-Spam handler
  const handleSaveAntiSpam = async (updated: Partial<AntiSpamConfig>) => {
    try {
      const res = await fetch('/api/antispam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.config) {
        setAntiSpamConfig(data.config);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Logs handler
  const handleClearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculated values
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDispatches = logs.filter((l) => l.timestamp.startsWith(todayStr)).length;
  const safety = calculateSafetyScore(antiSpamConfig, todayDispatches);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        status={status}
        safetyScore={safety.score}
        todayCount={todayDispatches}
        maxToday={antiSpamConfig.maxMessagesPerDay}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'whatsapp' && (
          <WhatsAppConnector
            status={status}
            groups={groups}
            products={products}
            onConnectBaileys={handleConnectBaileys}
            onResetSession={handleResetSession}
            onDisconnect={handleDisconnect}
            onRequestPairingCode={handleRequestPairingCode}
            onFactoryReset={handleFactoryReset}
            onSyncGroups={handleSyncGroups}
            onImportInviteGroup={handleImportInviteGroup}
            onSelectAllGroups={handleSelectAllGroups}
            onToggleGroupSelection={handleToggleGroupSelection}
            onAddGroup={handleAddGroup}
            onUpdateGroup={handleUpdateGroup}
            onDeleteGroup={handleDeleteGroup}
            onSendTestToGroup={handleSendTestToGroup}
            isLoading={isRefreshing}
          />
        )}

        {activeTab === 'products' && (
          <ProductManager
            products={products}
            groups={groups}
            affiliateSettings={affiliateSettings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onParseLink={handleParseLink}
            onSaveAffiliateSettings={handleSaveAffiliateSettings}
            onQuickSend={async (productId) => {
              const selectedGroup = groups.find((g) => g.isSelected) || groups[0];
              if (selectedGroup) {
                await handleSendTestToGroup(selectedGroup.id, productId);
              }
            }}
            onScheduleProduct={(productId) => {
              setTargetScheduleProductId(productId);
              setActiveTab('scheduler');
            }}
          />
        )}

        {activeTab === 'scheduler' && (
          <Scheduler
            schedules={schedules}
            products={products}
            groups={groups}
            onCreateSchedule={handleCreateSchedule}
            onUpdateSchedule={handleUpdateSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onRunNow={handleRunScheduleNow}
            defaultProductId={targetScheduleProductId}
          />
        )}

        {activeTab === 'antispam' && (
          <AntiSpamSettings
            config={antiSpamConfig}
            safetyScore={safety}
            sampleProduct={products[0] || INITIAL_PRODUCTS[0]}
            onSaveConfig={handleSaveAntiSpam}
            isLoading={isRefreshing}
          />
        )}

        {activeTab === 'profits' && (
          <ProfitDashboard products={products} stats={stats} />
        )}

        {activeTab === 'logs' && (
          <DispatchLogs
            logs={logs}
            onClearLogs={handleClearLogs}
            isLoading={isRefreshing}
          />
        )}
      </main>

      {/* Live Phone WhatsApp Simulator Modal */}
      <WhatsAppSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        groups={groups}
        products={products}
        onTriggerSend={async (groupId, prodId) => {
          await handleSendTestToGroup(groupId, prodId);
        }}
      />
    </div>
  );
}
