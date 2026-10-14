import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { trackConversion } from '../analytics.js';
import {
  PlusCircle,
  MapPin,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Info,
  Phone,
  User,
  Lock
} from 'lucide-react';

export default function NewOrder({ navigate, initialParams = {} }) {
  const { user, loginWithToken, openAuthModal } = useAuth();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Read URL query params (from Price Simulator)
  const urlParams = new URLSearchParams(window.location.search);
  const paramTitle = initialParams.title || urlParams.get('title') || '';
  const paramCat = initialParams.category_id || urlParams.get('category_id') || '';
  const paramBudget = initialParams.budget || urlParams.get('budget') || '';
  const paramDesc = initialParams.description || urlParams.get('description') || '';

  // Form fields
  const [title, setTitle] = useState(paramTitle);
  const [categoryId, setCategoryId] = useState(paramCat);
  const [description, setDescription] = useState(paramDesc);
  const [city, setCity] = useState('Joinville');
  const [neighborhood, setNeighborhood] = useState('');
  const [timeframe, setTimeframe] = useState('esta_semana');
  const [estimatedBudget, setEstimatedBudget] = useState(paramBudget);

  // Guest Post-First contact fields (when not logged in)
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  useEffect(() => {
    api.categories.list().then(res => {
      setCategories(res.categories || []);
      if (paramCat) {
        setCategoryId(paramCat);
      }
    }).catch(console.error);

    api.locations.list().then(res => setLocations(res.locations || [])).catch(console.error);
  }, []);

  const handleTitleChange = (val) => {
    setTitle(val);
    const lower = val.toLowerCase();
    if (!categoryId || categoryId === '') {
      if (lower.includes('disjuntor') || lower.includes('dijuntor') || lower.includes('chuveiro') || lower.includes('tomada') || lower.includes('fio') || lower.includes('lâmpada') || lower.includes('luminária') || lower.includes('fiação')) {
        setCategoryId('cat-eletricista');
      } else if (lower.includes('pint') || lower.includes('tinta') || lower.includes('verniz') || lower.includes('massa corrida')) {
        setCategoryId('cat-pintor');
      } else if (lower.includes('vazamento') || lower.includes('torneira') || lower.includes('cano') || lower.includes('encanamento') || lower.includes('desentup') || lower.includes('esgoto')) {
        setCategoryId('cat-encanador');
      } else if (lower.includes('ar condicionado') || lower.includes('split') || lower.includes('climatiz')) {
        setCategoryId('cat-ar');
      } else if (lower.includes('faxina') || lower.includes('limpez') || lower.includes('diarista')) {
        setCategoryId('cat-limpeza');
      } else if (lower.includes('móvel') || lower.includes('guarda-roupa') || lower.includes('armário') || lower.includes('montador') || lower.includes('montagem')) {
        setCategoryId('cat-moveis');
      } else if (lower.includes('muro') || lower.includes('reboco') || lower.includes('tijolo') || lower.includes('pedreiro') || lower.includes('alvenaria') || lower.includes('concreto')) {
        setCategoryId('cat-pedreiro');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (title.trim().length < 5) {
        throw new Error('O título do serviço deve ter pelo menos 5 caracteres.');
      }
      if (description.trim().length < 15) {
        throw new Error('A descrição deve ter pelo menos 15 caracteres para orientar os profissionais.');
      }
      if (!categoryId) {
        throw new Error('Selecione uma categoria.');
      }
      if (!city) {
        throw new Error('Informe a cidade.');
      }

      // Guest validation (zero friction Post-First)
      if (!user) {
        if (!clientName.trim() || clientName.trim().length < 2) {
          throw new Error('Informe seu nome ou como prefere ser chamado(a).');
        }
        const cleanPhone = clientPhone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
          throw new Error('Informe um WhatsApp válido com DDD (Ex: 47 99999-9999).');
        }
      }

      const res = await api.orders.create({
        title,
        description,
        category_id: categoryId,
        city,
        neighborhood,
        timeframe,
        estimated_budget: estimatedBudget ? parseFloat(estimatedBudget) : null,
        client_name: !user ? clientName : undefined,
        client_phone: !user ? clientPhone : undefined
      });

      // Se o backend retornou token automático de cliente, conecta a sessão instantaneamente
      if (res.token && res.user && loginWithToken) {
        loginWithToken(res.token, res.user);
      }

      // Dispara evento de conversão do tráfego pago
      trackConversion('SubmitOrder', {
        order_id: res.order.id,
        category: res.order.category_name,
        city: res.order.city,
        neighborhood: res.order.neighborhood,
        value: estimatedBudget ? parseFloat(estimatedBudget) : undefined
      });

      // Redirect directly to newly created order
      navigate(`/pedidos/${res.order.id}`);
    } catch (err) {
      setError(err.message || 'Erro ao publicar pedido.');
    } finally {
      setLoading(false);
    }
  };

  // Find neighborhoods for the selected city
  const selectedLocationObj = locations.find(l => l.city.toLowerCase() === city.toLowerCase());
  const neighborhoodsList = selectedLocationObj ? selectedLocationObj.neighborhoods : [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Publicar um Pedido de Serviço
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Descreva o que você precisa e conecte-se a profissionais autônomos de Joinville e região
        </p>
      </div>

      {/* Privacy Notice Alert */}
      <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl flex items-start space-x-3 text-xs text-teal-900 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-bold">Privacidade dos seus dados:</span>
          <p className="mt-0.5 text-teal-800">
            Seu telefone, e-mail e endereço completo <strong>nunca são exibidos publicamente</strong>. Apenas os profissionais interessados nas suas especificações enviarão propostas para você avaliar.
          </p>
        </div>
      </div>

      {/* Fast & Free Notice for Unauthenticated Users */}
      {!user && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white rounded-3xl p-5 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-[11px] font-extrabold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sem Burocracia • 100% Gratuito</span>
            </div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Publique seu pedido na hora, sem criar senha antes
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
              Descreva seu serviço abaixo e informe seu WhatsApp de contato para receber as propostas dos profissionais locais.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('login', null, 'Acesse sua conta Trevia')}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all whitespace-nowrap shadow-2xs self-start sm:self-auto"
          >
            Já tem uma conta? Entrar
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. O que você precisa */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">1</span>
            <span>O que você precisa?</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título Objetivo do Serviço *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: Troca de disjuntor e instalação de chuveiro"
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Escreva de forma clara para que os profissionais identifiquem a tarefa rapidamente.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Categoria do Serviço *
            </label>
            <select
              value={categoryId}
              required
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-medium text-slate-800"
            >
              <option value="">Selecione a categoria do serviço...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição Detalhada do que Precisa ser Feito *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Preciso trocar o disjuntor principal que está desarmando quando ligo o chuveiro. Além disso, preciso fixar um chuveiro novo no banheiro social. Já comprei o chuveiro."
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all leading-relaxed"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Mínimo 15 caracteres. Detalhe se você já possui os materiais ou se o prestador deve orçar com material.
            </span>
          </div>
        </div>

        {/* 2. Onde e Quando */}
        <div className="space-y-4 pt-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">2</span>
            <span>Localização e Prazo</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cidade *
              </label>
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setNeighborhood(''); }}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.city}>{loc.city}, {loc.state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bairro (Opcional)
              </label>
              {neighborhoodsList.length > 0 ? (
                <select
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                >
                  <option value="">Selecione o bairro (opcional)</option>
                  {neighborhoodsList.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Informe o bairro"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prazo Desejado
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'urgente', label: 'Urgente', desc: 'Hoje / 24h' },
                { id: 'esta_semana', label: 'Esta Semana', desc: 'Próximos dias' },
                { id: 'quinze_dias', label: '15 Dias', desc: 'Sem pressa' },
                { id: 'a_combinar', label: 'A Combinar', desc: 'Flexível' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTimeframe(opt.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    timeframe === opt.id
                      ? 'border-teal-600 bg-teal-50/70 text-teal-900 font-semibold ring-1 ring-teal-500'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="text-xs font-bold">{opt.label}</div>
                  <div className="text-[10px] text-slate-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Orçamento */}
        <div className="space-y-4 pt-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-100">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">3</span>
            <span>Orçamento Estimado (Opcional)</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quanto você planeja investir? (R$)
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-semibold"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Se você não sabe o valor de mercado, deixe em branco. Os profissionais informarão seus orçamentos.
            </span>
          </div>
        </div>

        {/* 4. Contato para Receber Propostas (Sem burocracia de senha prévia) */}
        {!user && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 pb-2 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">4</span>
              <span>Contato para Receber as Propostas</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu Nome ou Como Prefere ser Chamado(a) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu WhatsApp com DDD *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(47) 99999-9999"
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all font-medium text-slate-800"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Usado apenas para você receber as notificações das propostas.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 flex items-start space-x-2.5">
              <Lock className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Sem burocracia de senha:</strong> Seu pedido entra no ar na hora. Seu WhatsApp nunca fica exposto em praça pública e você só fala com profissionais que você autorizar.
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>Publicação imediata e 100% gratuita</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-700/20 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Publicando...' : 'Publicar Pedido Agora'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
