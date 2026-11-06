import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Percent,
  ShoppingBag,
  Award,
  ArrowUpRight,
  Calculator,
  Users,
  PieChart,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { Product, StatsSummary, Marketplace } from '../types';
import { formatCurrencyBRL } from '../services/antiSpam';

interface ProfitDashboardProps {
  products: Product[];
  stats: StatsSummary | null;
}

export const ProfitDashboard: React.FC<ProfitDashboardProps> = ({ products, stats }) => {
  // Profit simulator state
  const [simulatorGroupSize, setSimulatorGroupSize] = useState<number>(850);
  const [simulatorConversionRate, setSimulatorConversionRate] = useState<number>(2.5); // 2.5% of group buys

  // Aggregated profits
  const totalProfit = products.reduce((sum, p) => sum + (p.estimatedProfit || 0), 0);
  const avgMargin = products.length > 0
    ? (products.reduce((sum, p) => sum + (p.commissionRate || 0), 0) / products.length).toFixed(1)
    : '0';

  const meliProducts = products.filter((p) => p.marketplace === 'mercadolivre');
  const shopeeProducts = products.filter((p) => p.marketplace === 'shopee');
  const amazonProducts = products.filter((p) => p.marketplace === 'amazon');

  const meliProfit = meliProducts.reduce((sum, p) => sum + p.estimatedProfit, 0);
  const shopeeProfit = shopeeProducts.reduce((sum, p) => sum + p.estimatedProfit, 0);
  const amazonProfit = amazonProducts.reduce((sum, p) => sum + p.estimatedProfit, 0);

  // Simulated sales calculation
  const estimatedBuyers = Math.max(1, Math.round((simulatorGroupSize * simulatorConversionRate) / 100));
  const avgProfitPerSale = products.length > 0 ? totalProfit / products.length : 15;
  const projectedEarningsPerDispatch = estimatedBuyers * avgProfitPerSale;
  const projectedMonthlyEarnings = projectedEarningsPerDispatch * 30; // 1 post/day

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span>Painel de Margens de Lucro & Comissões de Afiliado</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Acompanhe quanto você ganha líquido em cada venda efetuada no Mercado Livre, Shopee e outros marketplaces a partir das divulgações automáticas.
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl font-bold self-end md:self-center">
            <span>Comissões Oficiais Brasileiras Atualizadas</span>
          </div>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Lucro Acumulado Catálogo</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">{formatCurrencyBRL(totalProfit)}</p>
            <p className="text-[11px] text-emerald-400 mt-1 font-medium">Soma de 1 venda de cada produto</p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Comissão Média</span>
              <Percent className="w-4 h-4 text-teal-400" />
            </div>
            <p className="text-2xl font-black text-teal-300">{avgMargin}%</p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Margem bruta média nas plataformas</p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Mercado Livre Afiliados</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-yellow-400/20 text-yellow-300 font-bold">MELI</span>
            </div>
            <p className="text-2xl font-black text-yellow-400">{formatCurrencyBRL(meliProfit)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{meliProducts.length} produtos cadastrados</p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Shopee Afiliados</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold">SHOPEE</span>
            </div>
            <p className="text-2xl font-black text-orange-400">{formatCurrencyBRL(shopeeProfit)}</p>
            <p className="text-[11px] text-slate-400 mt-1">{shopeeProducts.length} produtos cadastrados</p>
          </div>
        </div>
      </div>

      {/* Simulator: Projeção de Ganhos no Grupo WhatsApp */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex-1">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <span>Simulador de Faturamento do Grupo WhatsApp</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Ajuste o tamanho do seu grupo e a taxa média de conversão para estimar o retorno financeiro dos seus disparos automáticos.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Membros no seu Grupo de WhatsApp:
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={simulatorGroupSize}
                    onChange={(e) => setSimulatorGroupSize(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-emerald-400 shrink-0 w-16 text-right">
                    {simulatorGroupSize}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Taxa de Compra Estimada (% de membros que compram):
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="0.5"
                    max="8.0"
                    step="0.5"
                    value={simulatorConversionRate}
                    onChange={(e) => setSimulatorConversionRate(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-teal-300 shrink-0 w-16 text-right">
                    {simulatorConversionRate}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Box */}
          <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-5 shrink-0 lg:w-80 text-center space-y-3">
            <div>
              <p className="text-xs text-slate-400">Vendas Estimadas por Disparo</p>
              <p className="text-xl font-black text-white mt-0.5">
                ~{estimatedBuyers} compradores
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-400">Lucro Estimado por Oferta Disparada</p>
              <p className="text-2xl font-black text-emerald-400 mt-0.5">
                {formatCurrencyBRL(projectedEarningsPerDispatch)}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>Projeção Mensal (1 oferta/dia): </span>
              <strong className="text-emerald-300">{formatCurrencyBRL(projectedMonthlyEarnings)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Margins Table by Product */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-white text-base flex items-center space-x-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Tabela de Margem de Lucro por Produto</span>
          </h3>
          <span className="text-xs text-slate-400">
            Ordenado por maior lucro unitário
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Produto</th>
                <th className="pb-3 font-semibold">Marketplace</th>
                <th className="pb-3 font-semibold">Preço Promocional</th>
                <th className="pb-3 font-semibold">Desconto</th>
                <th className="pb-3 font-semibold">Comissão %</th>
                <th className="pb-3 font-semibold text-right">Seu Lucro por Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <p className="font-semibold text-slate-300">Nenhum produto no catálogo</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Cadastre seus produtos na aba "Produtos & Links" para ver a margem e o lucro de cada um aqui.
                    </p>
                  </td>
                </tr>
              ) : (
                [...products]
                  .sort((a, b) => b.estimatedProfit - a.estimatedProfit)
                  .map((product) => {
                    return (
                      <tr key={product.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 pr-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={product.imageUrl}
                              alt={product.title}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate max-w-xs sm:max-w-md">
                                {product.title}
                              </p>
                              <p className="text-[11px] text-slate-400">{product.category}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              product.marketplace === 'mercadolivre'
                                ? 'bg-yellow-400/20 text-yellow-300'
                                : product.marketplace === 'shopee'
                                ? 'bg-orange-500/20 text-orange-300'
                                : 'bg-slate-700 text-slate-200'
                            }`}
                          >
                            {product.marketplace === 'mercadolivre'
                              ? 'Mercado Livre'
                              : product.marketplace === 'shopee'
                              ? 'Shopee'
                              : product.marketplace.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 font-bold text-white">
                          {formatCurrencyBRL(product.promotionalPrice)}
                        </td>

                        <td className="py-3">
                          <span className="text-[11px] font-bold text-rose-400">
                            {product.discountPercentage}% OFF
                          </span>
                        </td>

                        <td className="py-3 font-bold text-teal-300">
                          {product.commissionRate}%
                        </td>

                        <td className="py-3 text-right">
                          <span className="font-extrabold text-sm text-emerald-400">
                            {formatCurrencyBRL(product.estimatedProfit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
