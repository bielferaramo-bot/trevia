import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { trackConversion } from '../analytics.js';
import {
  BellRing,
  CheckCircle2,
  Phone,
  User,
  MapPin,
  Sparkles,
  AlertCircle,
  Zap,
  Send
} from 'lucide-react';

export default function OpportunityRadar({ categories = [], locations = [] }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState(['América', 'Glória', 'Centro']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Default initial category
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  // Joinville neighborhoods
  const joinvilleLoc = locations.find(l => l.city === 'Joinville');
  const neighborhoodsList = joinvilleLoc ? joinvilleLoc.neighborhoods : [
    'América', 'Glória', 'Centro', 'Costa e Silva', 'Anita Garibaldi', 'Saguaçu', 'Vila Nova', 'Aventureiro', 'Pirabeiraba'
  ];

  const toggleNeighborhood = (bairro) => {
    if (selectedNeighborhoods.includes(bairro)) {
      if (selectedNeighborhoods.length > 1) {
        setSelectedNeighborhoods(selectedNeighborhoods.filter(b => b !== bairro));
      }
    } else {
      setSelectedNeighborhoods([...selectedNeighborhoods, bairro]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim()) {
      setError('Por favor, informe seu nome ou nome da sua empresa.');
      return;
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setError('Informe um número de WhatsApp válido com DDD (Ex: 47 99999-9999).');
      return;
    }

    setLoading(true);
    try {
      await api.alerts.create({
        name,
        phone,
        category_id: categoryId,
        locations: selectedNeighborhoods
      });
      trackConversion('Lead', {
        role: 'provider',
        category_id: categoryId,
        locations: selectedNeighborhoods
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Erro ao ativar alertas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-md text-center space-y-4 animate-fadeIn">
        <div className="w-12 h-12 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-lg">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-extrabold text-white">Alertas Ativados com Sucesso!</h3>
          <p className="text-xs sm:text-sm text-emerald-200 max-w-md mx-auto leading-relaxed">
            Excelente, <strong>{name}</strong>! Assim que um cliente publicar um pedido urgente para a sua área em Joinville, você receberá a oportunidade no WhatsApp <strong>{phone}</strong>.
          </p>
        </div>
        <button
          onClick={() => { setSuccess(false); setName(''); setPhone(''); }}
          className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-colors"
        >
          Cadastrar outro número ou especialidade
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white p-4 sm:p-6 lg:p-8 rounded-3xl border border-emerald-700/40 shadow-md space-y-6 max-w-full overflow-hidden">
      {/* Title & Badge */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-[11px] font-bold text-emerald-300 select-none">
          <Zap className="w-3.5 h-3.5 text-emerald-400" />
          <span>Radar de Oportunidades no WhatsApp</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
          Não perca serviços no seu bairro
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
          Cadastre suas especialidades e receba pedidos urgentes direto no seu WhatsApp assim que forem postados por clientes em Joinville e região.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Fast Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Nome */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Nome ou Negócio *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Eletricista"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              WhatsApp com DDD *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(47) 99999-9999"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Especialidade */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Sua Especialidade *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-800/90 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Neighborhood Selection */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Bairros que Você Atende (Toque para selecionar)
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-800/50 rounded-xl border border-slate-700/60">
            {neighborhoodsList.slice(0, 15).map((bairro) => {
              const isSelected = selectedNeighborhoods.includes(bairro);
              return (
                <button
                  key={bairro}
                  type="button"
                  onClick={() => toggleNeighborhood(bairro)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all ${
                    isSelected
                      ? 'bg-emerald-500 text-slate-950 shadow-2xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                  }`}
                >
                  {bairro}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            ✓ 100% gratuito • Cancele quando quiser • Sem spam
          </span>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <BellRing className="w-4 h-4" />
            <span>{loading ? 'Ativando...' : 'Ativar Alertas Gratuitos'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
