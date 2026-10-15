import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  ArrowRight,
  Briefcase,
  X,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Star,
  Check
} from 'lucide-react';
import OpportunityRadar from '../components/OpportunityRadar.jsx';

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

import { useLocation } from '../LocationContext.jsx';
import { useAuth } from '../AuthContext.jsx';

export default function OrdersList({ navigate, initialParams = {} }) {
  const { userLocation, getDistanceTo } = useLocation();
  const { userMode } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  // Search & Filter state
  const [q, setQ] = useState(initialParams.q || '');
  const [categoryId, setCategoryId] = useState(initialParams.category_id || '');
  const [city, setCity] = useState(initialParams.city || '');
  const [neighborhood, setNeighborhood] = useState(initialParams.neighborhood || '');
  const [timeframe, setTimeframe] = useState('');
  const [status, setStatus] = useState('aberto');
  const [sort, setSort] = useState('recent');

  // Load categories and locations on mount
  useEffect(() => {
    api.categories.list().then(res => setCategories(res.categories || [])).catch(console.error);
    api.locations.list().then(res => setLocations(res.locations || [])).catch(console.error);
  }, []);

  const fetchOrders = () => {
    setLoading(true);
    api.orders.list({
      q,
      category_id: categoryId,
      city,
      neighborhood,
      timeframe,
      status,
      sort: sort === 'proximity' ? 'recent' : sort
    })
      .then(res => setOrders(res.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [categoryId, city, neighborhood, timeframe, status, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  const clearFilters = () => {
    setQ('');
    setCategoryId('');
    setCity('');
    setNeighborhood('');
    setTimeframe('');
    setStatus('aberto');
    setSort('recent');
  };

  // Find neighborhoods for the chosen city
  const selectedLocationObj = locations.find(l => l.city.toLowerCase() === city.toLowerCase());
  const neighborhoodsList = selectedLocationObj ? selectedLocationObj.neighborhoods : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Pedidos de Serviço
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore solicitações públicas de clientes em Joinville e região e encontre novas oportunidades de trabalho
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {/* Text Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por palavras-chave (ex: pintura externa, disjuntor, torneira)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs"
          >
            Buscar
          </button>
        </form>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {/* Categoria */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            >
              <option value="">Todas as categorias</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Cidade
            </label>
            <select
              value={city}
              onChange={(e) => { setCity(e.target.value); setNeighborhood(''); }}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            >
              <option value="">Todas as cidades</option>
              {locations.map(l => (
                <option key={l.id} value={l.city}>{l.city}, {l.state}</option>
              ))}
            </select>
          </div>

          {/* Bairro (Se cidade tiver bairros) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Bairro
            </label>
            <select
              value={neighborhood}
              disabled={neighborhoodsList.length === 0}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 disabled:opacity-50"
            >
              <option value="">Todos os bairros</option>
              {neighborhoodsList.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Prazo */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Prazo Desejado
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            >
              <option value="">Qualquer prazo</option>
              <option value="urgente">Urgente (Hoje / 24h)</option>
              <option value="esta_semana">Esta semana</option>
              <option value="quinze_dias">Próximos 15 dias</option>
              <option value="a_combinar">A combinar</option>
            </select>
          </div>

          {/* Situação */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Situação
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
            >
              <option value="aberto">Abertos (Recebendo propostas)</option>
              <option value="em_negociacao">Em Negociação</option>
              <option value="concluido">Concluídos</option>
              <option value="todos">Todos os estados</option>
            </select>
          </div>

          {/* Ordenação por Proximidade / Recentes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Ordenar Por
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full p-2 text-xs bg-emerald-50/70 border border-emerald-300 rounded-xl focus:outline-none focus:border-emerald-600 font-bold text-emerald-900"
            >
              <option value="recent">Mais Recentes</option>
              <option value="proximity">📍 Mais Próximos de Mim</option>
              <option value="oldest">Mais Antigos</option>
            </select>
          </div>
        </div>

        {/* Clear filters badge */}
        {(categoryId || city || neighborhood || timeframe || q || status !== 'aberto') && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
            <span>Filtros ativos aplicados</span>
            <button
              onClick={clearFilters}
              className="text-teal-700 font-semibold hover:underline flex items-center space-x-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpar todos os filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* OPPORTUNITY RADAR BANNER (PARA PRESTADORES) */}
      <div>
        <OpportunityRadar categories={categories} locations={locations} />
      </div>

      {/* Orders List Content */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Carregando pedidos de serviço...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 max-w-lg mx-auto space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Nenhum pedido encontrado</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Não encontramos pedidos compatíveis com os filtros selecionados. Tente alterar a categoria, cidade ou termo pesquisado.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (() => {
        const displayedOrders = [...orders].map((order) => {
          const distInfo = getDistanceTo(order.city, order.neighborhood);
          return {
            ...order,
            distanceKm: distInfo ? distInfo.distanceKm : 9999,
            distanceText: distInfo ? distInfo.formattedText : null
          };
        });

        if (sort === 'proximity') {
          displayedOrders.sort((a, b) => a.distanceKm - b.distanceKm);
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedOrders.map((order) => {
              const photoUrl = CATEGORY_IMAGES[order.category_id] || 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80';
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(userMode === 'provider' ? `/pedidos/${order.id}?action=proposta` : `/pedidos/${order.id}`)}
                  className="bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-500/80 hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col justify-between group"
                >
                  {/* Photo Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                    <img
                      src={photoUrl}
                      alt={order.title}
                      draggable="false"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none pointer-events-none"
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

                  {/* Card Body */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 mb-1.5">
                        {order.title}
                      </h3>

                      {/* Distância Exata em Metros e KM Estilo OLX */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                          order.distanceKm < 3
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                            : order.distanceKm < 8
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          <span>{order.distanceText || (order.neighborhood ? `${order.neighborhood}, ` : '') + order.city}</span>
                        </span>

                        <span className="text-[11px] font-semibold text-slate-500">
                          {order.timeframe === 'urgente' ? '⚡ Urgente' : '🕒 ' + (order.timeframe ? order.timeframe.replace('_', ' ') : 'Esta semana')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                        {order.description}
                      </p>

                      {/* Privacy, Proposals & Scarcity Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {order.unlocked_count >= (order.max_unlocks || 3) ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-extrabold border border-rose-200">
                            <span>🔒 Vagas Esgotadas</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[10px] font-extrabold border border-amber-200">
                            <span>🔥 Restam {Math.max(0, (order.max_unlocks || 3) - (order.unlocked_count || 0))} vagas</span>
                          </span>
                        )}

                        <span
                          className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
                          title="Seus dados de contato não ficam expostos na internet"
                        >
                          <span>🔒 Propostas Privadas</span>
                        </span>

                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          <span>{order.proposals_count || 0} propostas</span>
                        </span>
                      </div>
                    </div>

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
                        navigate(userMode === 'provider' ? `/pedidos/${order.id}?action=proposta` : `/pedidos/${order.id}`);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                    >
                      {userMode === 'provider' ? 'Enviar Proposta' : 'Ver Detalhes'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        );
      })()}
    </div>
  );
}
