import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  Filter,
  CheckCircle2,
  Sparkles,
  Zap,
  Check
} from 'lucide-react';

export default function Opportunities({ navigate }) {
  const { user, profile, openAuthModal } = useAuth();
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [q, setQ] = useState('');

  // Auto-suggest filters based on logged in provider profile
  useEffect(() => {
    if (profile && profile.categories && profile.categories.length > 0) {
      setSelectedCategory(profile.categories[0]);
    }
    if (profile && profile.locations && profile.locations.length > 0) {
      setSelectedCity(profile.locations[0]);
    }
  }, [profile]);

  useEffect(() => {
    api.categories.list().then(res => setCategories(res.categories || [])).catch(console.error);
    api.locations.list().then(res => setLocations(res.locations || [])).catch(console.error);
  }, []);

  const fetchOpportunities = () => {
    setLoading(true);
    api.orders.list({
      status: 'aberto',
      category_id: selectedCategory,
      city: selectedCity,
      timeframe,
      q
    })
      .then(res => setOrders(res.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOpportunities();
  }, [selectedCategory, selectedCity, timeframe]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOpportunities();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white p-8 rounded-3xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-teal-300 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
              <Zap className="w-3.5 h-3.5" />
              <span>Painel de Oportunidades para Autônomos</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Pedidos de Serviço em Aberto
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Encontre serviços solicitados por clientes em Joinville e região. Envie sua manifestação ou proposta diretamente ao cliente sem comissões ou taxas ocultas.
            </p>
          </div>

          {!user ? (
            <button
              onClick={() => openAuthModal('register')}
              className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all self-start md:self-center whitespace-nowrap"
            >
              Criar Perfil de Prestador
            </button>
          ) : (
            <button
              onClick={() => navigate('/painel-profissional')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all self-start md:self-center whitespace-nowrap"
            >
              Gerenciar Meu Perfil
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por palavras-chave (ex: conserto, reforma, pintura)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Filtrar
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">Todas as especialidades</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Cidade
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">Todas as cidades</option>
              {locations.map((l) => (
                <option key={l.id} value={l.city}>{l.city}, {l.state}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Prazo Desejado
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="">Qualquer prazo</option>
              <option value="urgente">Urgente</option>
              <option value="esta_semana">Esta Semana</option>
              <option value="quinze_dias">Próximos 15 dias</option>
              <option value="a_combinar">A combinar</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          Buscando oportunidades em Joinville e região...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 max-w-lg mx-auto space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Nenhum pedido compatível no momento</h3>
          <p className="text-xs text-slate-500">
            Tente remover alguns filtros para visualizar mais solicitações abertas em outros bairros e cidades.
          </p>
          <button
            onClick={() => { setSelectedCategory(''); setSelectedCity(''); setTimeframe(''); setQ(''); }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
          >
            Ver todos os pedidos abertos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/pedidos/${order.id}`)}
              className="bg-white rounded-3xl border border-slate-200/90 hover:border-teal-500/80 hover:shadow-lg transition-all cursor-pointer p-6 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                    {order.category_name}
                  </span>
                  {order.timeframe === 'urgente' && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      ⚡ Urgente
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900 group-hover:text-teal-700 transition-colors mb-2 line-clamp-2">
                  {order.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed mb-4">
                  {order.description}
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 mr-1" />
                    <span>{order.city}{order.neighborhood ? `, ${order.neighborhood}` : ''}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3.5 h-3.5 text-slate-400 mr-1" />
                    <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-xs">
                  {order.estimated_budget ? (
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Orçamento</span>
                      <span className="font-extrabold text-slate-900">
                        R$ {Number(order.estimated_budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Valor a combinar</span>
                  )}

                  <span className="px-3 py-1.5 bg-teal-50 text-teal-800 font-bold text-xs rounded-xl group-hover:bg-teal-600 group-hover:text-white transition-colors flex items-center space-x-1">
                    <span>Enviar Proposta</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
