import React, { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { PRICING_GUIDE } from '../data/pricingGuide.js';
import {
  Calculator,
  Info,
  Clock,
  ArrowRight,
  TrendingUp,
  Sparkles,
  CheckCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

export default function PriceSimulator({ navigate }) {
  const { user, openAuthModal } = useAuth();
  // Group categories from PRICING_GUIDE
  const categories = Array.from(
    new Set(PRICING_GUIDE.map(item => JSON.stringify({ id: item.categoryId, name: item.categoryName })))
  ).map(str => JSON.parse(str));

  const [selectedCatId, setSelectedCatId] = useState(categories[0].id);

  // Available services for selected category
  const availableServices = PRICING_GUIDE.filter(item => item.categoryId === selectedCatId);
  const [selectedServiceId, setSelectedServiceId] = useState(availableServices[0].id);

  // Current selected item
  const currentItem = PRICING_GUIDE.find(item => item.id === selectedServiceId) || availableServices[0];

  const handleCategoryChange = (catId) => {
    setSelectedCatId(catId);
    const servicesForCat = PRICING_GUIDE.filter(item => item.categoryId === catId);
    if (servicesForCat.length > 0) {
      setSelectedServiceId(servicesForCat[0].id);
    }
  };

  const handlePublishWithEstimate = () => {
    const avgBudget = Math.round((currentItem.minPrice + currentItem.maxPrice) / 2);
    const params = new URLSearchParams({
      category_id: currentItem.categoryId,
      title: currentItem.suggestedTitle,
      budget: avgBudget.toString(),
      description: currentItem.suggestedDescription
    });
    const targetUrl = `/pedidos/novo?${params.toString()}`;
    if (!user) {
      openAuthModal('login', () => navigate(targetUrl), 'Acesse sua conta para publicar este pedido pré-preenchido no Trevia');
      return;
    }
    navigate(targetUrl);
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 rounded-3xl border-2 border-emerald-200/90 p-4 sm:p-6 lg:p-8 shadow-sm space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 select-none">
            <Calculator className="w-5 h-5 pointer-events-none" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Simulador de Preço Médio Local
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 select-none shrink-0">
                Joinville & Região
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulte valores médios de mercado cobrados por autônomos na região e publique sem dúvidas
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-semibold bg-white px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Valores de Referência</span>
        </div>
      </div>

      {/* Selectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            1. Escolha a Especialidade
          </label>
          <select
            value={selectedCatId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800 shadow-2xs"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Service Type Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            2. Tipo de Serviço
          </label>
          <select
            value={selectedServiceId}
            onChange={(e) => setSelectedServiceId(e.target.value)}
            className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-semibold text-slate-800 shadow-2xs"
          >
            {availableServices.map(s => (
              <option key={s.id} value={s.id}>{s.serviceName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Result Display Card */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-emerald-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Faixa de Valor Médio em Joinville
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight mt-0.5">
              {currentItem.averageDisplay}
            </div>
            <span className="text-[11px] text-slate-500 flex items-center mt-1">
              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <span>Tempo estimado de execução: <strong>{currentItem.estimatedHours}</strong></span>
            </span>
          </div>

          <button
            onClick={handlePublishWithEstimate}
            className="w-full sm:w-auto px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm shadow-emerald-700/20 transition-all flex items-center justify-center space-x-2 hover:scale-[1.02]"
          >
            <span>Publicar este pedido com base nessa estimativa</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>

        {/* Scope Tip Box */}
        <div className="flex items-start space-x-2.5 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 leading-relaxed">
          <Info className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold">Dica de escopo na região: </span>
            <span>{currentItem.scopeTip}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
