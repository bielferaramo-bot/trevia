import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Wind,
  Droplets,
  Zap,
  Paintbrush,
  Package,
  Hammer,
  Wrench,
  Trees,
  Grid,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Star,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  Bell,
  Check
} from 'lucide-react';
import PriceSimulator from '../components/PriceSimulator.jsx';

import { useLocation } from '../LocationContext.jsx';

// Real high-resolution worker imagery mapped to service categories
const CATEGORY_IMAGES = {
  'cat-ar': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
  'cat-limpeza': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
  'cat-eletricista': 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80',
  'cat-pintor': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
  'cat-encanador': 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=600&q=80',
  'cat-moveis': 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80',
  'cat-pedreiro': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
  'cat-reparos': 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80',
  'cat-jardineiro': 'https://images.unsplash.com/photo-1599685315640-9ceab2f58944?auto=format&fit=crop&w=600&q=80',
  'cat-serralheiro': 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80',
};

const CATEGORY_ICONS = {
  'cat-limpeza': Sparkles,
  'cat-ar': Wind,
  'cat-encanador': Droplets,
  'cat-eletricista': Zap,
  'cat-pintor': Paintbrush,
  'cat-moveis': Package,
  'cat-pedreiro': Hammer,
  'cat-reparos': Wrench,
  'cat-jardineiro': Trees,
  'cat-serralheiro': Wrench,
};

export default function Home({ navigate }) {
  const { user, openAuthModal } = useAuth();
  const { userLocation, getDistanceTo, openLocationModal } = useLocation();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Search input and location state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Joinville');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('América');

  useEffect(() => {
    // Load categories
    api.categories.list()
      .then(res => setCategories(res.categories || []))
      .catch(console.error);

    // Load locations
    api.locations.list()
      .then(res => setLocations(res.locations || []))
      .catch(console.error);

    // Load recent orders
    api.orders.list({ limit: 6, sort: 'recent', status: 'aberto' })
      .then(res => setRecentOrders(res.orders || []))
      .catch(console.error)
      .finally(() => setLoadingOrders(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('q', searchQuery.trim());
    if (selectedCity) params.append('city', selectedCity);
    navigate(`/pedidos?${params.toString()}`);
  };

  const handlePublishClick = () => {
    if (!user) {
      openAuthModal('login', () => navigate('/pedidos/novo'));
    } else {
      navigate('/pedidos/novo');
    }
  };

  return (
    <div className="pb-16 md:pb-8 space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">

      {/* TOP APP-STYLE LOCATION & QUICK ACCESS HEADER */}
      <div className="flex items-center justify-between py-2 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center space-x-1 text-xs font-bold text-slate-900 cursor-pointer">
              <span>{selectedCity}, SC</span>
              <span className="text-slate-400 font-normal">({selectedNeighborhood})</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Conectando com profissionais na sua região
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/pedidos')}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors relative"
            title="Avisos e Pedidos Recentes"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5"></span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR (App-like rounded pill search box) */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por serviço ou profissional (ex: ar condicionado, pintura, limpeza)..."
            className="w-full pl-11 pr-24 py-3.5 text-sm bg-white border border-slate-200/90 rounded-2xl shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800 placeholder-slate-400"
          />
          <button
            type="submit"
            className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Buscar</span>
          </button>
        </div>
      </form>

      {/* HERO PROMO CARD (Matches the AC Technician green banner in the reference image) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white shadow-md p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6 relative z-10">
          {/* Left Content */}
          <div className="md:col-span-7 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-bold text-emerald-100 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Joinville e Região Metropolitana</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
              Ar condicionado, pintura ou limpeza? <br />
              <span className="text-emerald-200">A gente conecta você rápido.</span>
            </h1>

            <div className="space-y-1.5 text-xs text-emerald-100 font-medium">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>Profissionais autônomos locais em Joinville, SC</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>100% gratuito • Negocie direto pelo WhatsApp</span>
              </div>
            </div>

            {/* Action Pill Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handlePublishClick}
                className="px-5 py-2.5 rounded-full bg-white text-emerald-900 font-bold text-xs shadow-md hover:bg-emerald-50 active:scale-95 transition-all flex items-center space-x-1.5"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Publicar um Serviço</span>
              </button>

              <button
                onClick={() => navigate('/oportunidades')}
                className="px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs backdrop-blur-md border border-white/25 transition-all flex items-center space-x-1.5"
              >
                <Search className="w-4 h-4 text-emerald-200" />
                <span>Ver Oportunidades</span>
              </button>
            </div>
          </div>

          {/* Right Image Feature (Cutout / Photo of real worker) */}
          <div className="md:col-span-5 flex justify-center md:justify-end">
            <div className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 transform hover:scale-[1.02] transition-transform">
              <img
                src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=700&q=80"
                alt="Profissional Especialista em Manutenção"
                className="w-full h-48 sm:h-56 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/80 via-transparent to-transparent flex items-end p-3">
                <span className="text-[11px] font-bold text-white bg-emerald-900/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-emerald-500/30">
                  Técnico Autônomo • Joinville
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR SERVICES (Matches the exact rounded square box grid in the reference image) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Serviços Populares
          </h2>
          <button
            onClick={() => navigate('/pedidos')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* The 4-column (mobile) / 5 to 10-column (desktop) box grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3.5">
          {categories.slice(0, 7).map((cat) => {
            const IconComponent = CATEGORY_ICONS[cat.id] || Wrench;
            return (
              <button
                key={cat.id}
                onClick={() => navigate(`/pedidos?category_id=${cat.id}`)}
                className="p-3 sm:p-4 rounded-2xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#DCFCE7] text-center flex flex-col items-center justify-center space-y-2 group transition-all active:scale-95 shadow-2xs hover:shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
                  <IconComponent className="w-5 h-5 text-emerald-700" />
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight line-clamp-2">
                  {cat.name.split(' ')[0]} {cat.name.split(' ')[1] ? cat.name.split(' ')[1] : ''}
                </span>
              </button>
            );
          })}

          {/* More Services Box */}
          <button
            onClick={() => navigate('/pedidos')}
            className="p-3 sm:p-4 rounded-2xl bg-[#F0FDF4] hover:bg-[#DCFCE7] border border-[#DCFCE7] text-center flex flex-col items-center justify-center space-y-2 group transition-all active:scale-95 shadow-2xs hover:shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
              <Grid className="w-5 h-5 text-emerald-700" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
              Mais Serviços
            </span>
          </button>
        </div>
      </section>

      {/* PRICE SIMULATOR (ÍMÃ DE CONVERSÃO LOCAL) */}
      <section>
        <PriceSimulator navigate={navigate} />
      </section>

      {/* RECOMMENDED FOR YOU / REAL ORDERS (Matches the reference image's card format) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Recomendados para Você
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pedidos de serviço e oportunidades recentes em Joinville
            </p>
          </div>
          <button
            onClick={() => navigate('/pedidos')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loadingOrders ? (
          <div className="py-12 text-center text-sm text-slate-400">
            Carregando pedidos em Joinville...
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <p className="text-xs text-slate-500">Nenhum pedido aberto no momento.</p>
            <button
              onClick={handlePublishClick}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              Publicar Pedido
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {recentOrders.map((order) => {
              const photoUrl = CATEGORY_IMAGES[order.category_id] || 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80';
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/pedidos/${order.id}`)}
                  className="bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-500/80 hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col justify-between group"
                >
                  {/* Photo at the top */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img
                      src={photoUrl}
                      alt={order.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-white/95 text-slate-900 text-[10px] font-extrabold shadow-sm">
                        {order.category_name}
                      </span>
                      {order.timeframe === 'urgente' && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold shadow-sm">
                          ⚡ Urgente
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 mb-1">
                        {order.title}
                      </h3>

                      {/* Urgência e Distância Exata Estilo OLX */}
                      {(() => {
                        const distInfo = getDistanceTo(order.city, order.neighborhood);
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                              <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span>{distInfo && distInfo.formattedText ? distInfo.formattedText : (order.neighborhood ? `${order.neighborhood}, ` : '') + order.city}</span>
                            </span>

                            <span className="text-[11px] font-semibold text-slate-500">
                              {order.timeframe === 'urgente' ? '⚡ Urgente' : '🕒 ' + (order.timeframe ? order.timeframe.replace('_', ' ') : 'Esta semana')}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Selos de Confiança e Proposta Fechada */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span
                          className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
                          title="Seus dados de contato não ficam expostos na internet"
                        >
                          <span>🔒 Propostas Privadas</span>
                        </span>

                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          <span>{order.proposals_count || 0} propostas enviadas</span>
                        </span>
                      </div>
                    </div>

                    {/* Price & Action row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Orçamento estimado</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {order.estimated_budget ? (
                            `R$ ${Number(order.estimated_budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          ) : (
                            'A combinar'
                          )}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/pedidos/${order.id}`);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* VALUE PROPOSITION BAR (The 4 horizontal rounded cards like the bottom of the reference image) */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="flex flex-col items-center text-center space-y-2 p-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">Autônomos Locais</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Profissionais da região de Joinville</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-2 p-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">Preço Transparente</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Sem taxas ou comissões ocultas</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-2 p-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-emerald-700">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">Resposta Rápida</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Publique e receba contatos diretos</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center space-y-2 p-2">
            <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-emerald-700">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900">Foco Regional</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Joinville, Araquari e Jaraguá</p>
            </div>
          </div>
        </div>
      </section>

      {/* SIMPLE 3-STEP GUIDE FOR FIRST-TIME USERS */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Como funciona o Trevia?
          </h2>
          <p className="text-xs text-slate-400">
            Super simples para quem está usando pela primeira vez
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-xs mx-auto flex items-center justify-center">
              1
            </div>
            <h3 className="font-bold text-sm text-white">Descreva o que precisa</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Diga o que você precisa consertar, limpar ou instalar e informe seu bairro em Joinville.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-xs mx-auto flex items-center justify-center">
              2
            </div>
            <h3 className="font-bold text-sm text-white">Receba orçamentos</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Profissionais autônomos locais visualizam seu pedido e enviam propostas diretamente.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-xs mx-auto flex items-center justify-center">
              3
            </div>
            <h3 className="font-bold text-sm text-white">Combine no WhatsApp</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compare as mensagens, avalie os perfis e fale direto com o prestador pelo WhatsApp.
            </p>
          </div>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={handlePublishClick}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all inline-flex items-center space-x-2"
          >
            <span>Publicar Meu Primeiro Pedido Grátis</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
}
