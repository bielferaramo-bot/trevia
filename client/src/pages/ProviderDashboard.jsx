import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  Briefcase,
  ExternalLink,
  CheckCircle,
  Clock,
  MapPin,
  Send,
  MessageCircle,
  Save,
  AlertCircle,
  User,
  ShieldCheck
} from 'lucide-react';

export default function ProviderDashboard({ navigate }) {
  const { user, profile, refreshMe, openAuthModal } = useAuth();
  const [tab, setTab] = useState('proposals'); // 'proposals' or 'profile'
  const [proposals, setProposals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [publicName, setPublicName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  const loadProviderData = async () => {
    setLoading(true);
    try {
      const [propsRes, catsRes, locsRes, myProfRes] = await Promise.all([
        api.proposals.myProposals(),
        api.categories.list(),
        api.locations.list(),
        api.professionals.getMyProfile()
      ]);

      setProposals(propsRes.proposals || []);
      setCategories(catsRes.categories || []);
      setLocations(locsRes.locations || []);

      if (myProfRes.profile) {
        const p = myProfRes.profile;
        setPublicName(p.public_name || user.name);
        setBio(p.bio || '');
        setSelectedCategories(p.categories || []);
        setSelectedLocations(p.locations || ['Joinville']);
        setWhatsapp(p.whatsapp || user.phone || '');
        setContactPhone(p.contact_phone || user.phone || '');
        setSlug(p.slug || '');
      }
    } catch (err) {
      console.error('Erro ao carregar painel do prestador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      openAuthModal('login', () => loadProviderData());
    } else {
      loadProviderData();
    }
  }, [user]);

  const toggleCategory = (catId) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const toggleLocation = (cityName) => {
    if (selectedLocations.includes(cityName)) {
      setSelectedLocations(selectedLocations.filter(c => c !== cityName));
    } else {
      setSelectedLocations([...selectedLocations, cityName]);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveSuccess('');

    try {
      const res = await api.professionals.updateMyProfile({
        public_name: publicName,
        bio,
        categories: selectedCategories,
        locations: selectedLocations,
        whatsapp,
        contact_phone: contactPhone
      });

      setSlug(res.profile.slug);
      await refreshMe();
      setSaveSuccess('Perfil profissional atualizado com sucesso!');
    } catch (err) {
      alert(err.message || 'Erro ao salvar perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="font-bold text-slate-800">Área do Prestador</h3>
        <p className="text-xs text-slate-500">Faça login para gerenciar suas propostas enviadas e seu perfil profissional.</p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl"
        >
          Entrar como Prestador
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Painel do Prestador
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Acompanhe propostas enviadas e configure seus serviços para clientes de Joinville e região
          </p>
        </div>

        {slug && (
          <button
            onClick={() => navigate(`/profissionais/${slug}`)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl self-start sm:self-auto shadow-xs"
          >
            <span>Ver Meu Perfil Público</span>
            <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm">
        <button
          onClick={() => setTab('proposals')}
          className={`pb-3 font-bold transition-all relative ${
            tab === 'proposals'
              ? 'text-teal-700 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Propostas Enviadas ({proposals.length})
        </button>
        <button
          onClick={() => setTab('profile')}
          className={`pb-3 font-bold transition-all relative ${
            tab === 'profile'
              ? 'text-teal-700 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Editar Perfil Profissional
        </button>
      </div>

      {/* TAB 1: PROPOSALS */}
      {tab === 'proposals' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Carregando suas propostas...
            </div>
          ) : proposals.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <Send className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-800">Nenhuma proposta enviada ainda</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore as oportunidades em aberto em Joinville e envie suas propostas diretamente aos clientes.
              </p>
              <button
                onClick={() => navigate('/oportunidades')}
                className="mt-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl"
              >
                Buscar Oportunidades
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        {prop.category_name}
                      </span>
                      <h3
                        onClick={() => navigate(`/pedidos/${prop.order_id}`)}
                        className="font-bold text-base text-slate-900 hover:text-teal-700 transition-colors cursor-pointer mt-1"
                      >
                        {prop.order_title}
                      </h3>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1" />
                          {prop.order_city}{prop.order_neighborhood ? ` (${prop.order_neighborhood})` : ''}
                        </span>
                        <span>Enviada em {new Date(prop.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        prop.status === 'aceita'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : prop.status === 'recusada'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {prop.status === 'aceita' ? 'Proposta Aceita pelo Cliente' : prop.status === 'recusada' ? 'Não Selecionada' : 'Aguardando Resposta'}
                      </span>
                    </div>
                  </div>

                  {/* Proposal details */}
                  <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 leading-relaxed italic">
                    "{prop.message}"
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <div className="flex items-center space-x-4">
                      {prop.proposed_value && (
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Valor Informado</span>
                          <span className="font-extrabold text-slate-900">
                            R$ {Number(prop.proposed_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {prop.estimated_time && (
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Prazo Estimado</span>
                          <span className="font-bold text-slate-800">{prop.estimated_time}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/pedidos/${prop.order_id}`)}
                      className="text-xs font-bold text-teal-700 hover:underline"
                    >
                      Acessar Pedido do Cliente →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROFILE EDIT */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {saveSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{saveSuccess}</span>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Identificação Profissional
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome de Apresentação / Nome Comercial *
              </label>
              <input
                type="text"
                required
                value={publicName}
                onChange={(e) => setPublicName(e.target.value)}
                placeholder="Ex: Carlos Silva Eletricista e Reformas"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Este nome será exibido nos cartões de proposta e no seu perfil público.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Biografia e Apresentação
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Descreva sua experiência, especialidades, anos de atuação e diferenciais..."
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600 leading-relaxed"
              />
            </div>
          </div>

          {/* Categorias de atuação */}
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Categorias de Serviço que Você Realiza
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold ring-1 ring-teal-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cidades atendidas */}
          <div className="space-y-3 pt-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Cidades Atendidas
            </h2>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => {
                const isSelected = selectedLocations.includes(loc.city);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => toggleLocation(loc.city)}
                    className={`px-4 py-2 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold ring-1 ring-teal-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    {loc.city}, {loc.state}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Canais de Contato */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Canais de Contato Autorizados
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp para Atendimento
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(47) 99999-9999"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone Fixo / Alternativo
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(47) 3433-0000"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Salvando...' : 'Salvar Perfil Profissional'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
