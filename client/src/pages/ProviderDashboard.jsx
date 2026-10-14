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
  ShieldCheck,
  Volume2,
  Zap,
  Camera,
  Coins,
  Check,
  Radio
} from 'lucide-react';
import DispatchAlertModal from '../components/DispatchAlertModal.jsx';
import RechargeModal from '../components/RechargeModal.jsx';
import { playDispatchAlert } from '../services/soundAlert.js';

const JOINVILLE_NEIGHBORHOODS = [
  'América', 'Anita Garibaldi', 'Atiradores', 'Aventureiro', 'Boa Vista', 'Boehmerwald',
  'Bom Retiro', 'Bucarein', 'Centro', 'Comasa', 'Costa e Silva', 'Distrito Industrial',
  'Espinheiros', 'Fátima', 'Floresta', 'Glória', 'Guanabara', 'Iririú', 'Itaum',
  'Itinga', 'Jardim Iririú', 'Jardim Paraíso', 'Jardim Sofia', 'Morro do Meio',
  'Nova Brasília', 'Paranaguamirim', 'Petrópolis', 'Pirabeiraba', 'Profipo',
  'Rio Bonito', 'Saguaçu', 'Santa Catarina', 'Santo Antônio', 'São Marcos',
  'Ulysses Guimarães', 'Vila Cubatão', 'Vila Nova', 'Zona Industrial Norte'
];

export default function ProviderDashboard({ navigate }) {
  const { user, profile, refreshMe, openAuthModal } = useAuth();
  const [tab, setTab] = useState('proposals'); // 'proposals' or 'profile'
  const [proposals, setProposals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Radar Estilo Uber state
  const [radarActive, setRadarActive] = useState(() => {
    return localStorage.getItem('trevia_radar_online') !== 'false';
  });
  const [activeDispatchOrder, setActiveDispatchOrder] = useState(null);
  const [soundTested, setSoundTested] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);

  // Profile form state
  const [publicName, setPublicName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [whatsapp, setWhatsapp] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [experienceYears, setExperienceYears] = useState(2);
  const [baseNeighborhood, setBaseNeighborhood] = useState('Centro');
  const [paymentMethods, setPaymentMethods] = useState(['pix', 'dinheiro', 'cartao']);
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
        setPublicName(p.public_name || user?.name || '');
        setBio(p.bio || '');
        setSelectedCategories(p.categories || []);
        setSelectedLocations(p.locations || ['Joinville']);
        setWhatsapp(p.whatsapp || user?.phone || '');
        setContactPhone(p.contact_phone || user?.phone || '');
        setAvatarUrl(p.avatar_url || user?.avatar_url || '');
        setExperienceYears(p.experience_years ?? 2);
        setBaseNeighborhood(p.base_neighborhood || user?.base_neighborhood || 'Centro');
        setPaymentMethods(p.payment_methods || ['pix', 'dinheiro', 'cartao']);
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

  // Real-time Radar Listener (SSE + Polling fallback for Uber-style alerts)
  useEffect(() => {
    if (!user || !radarActive) return;

    let eventSource = null;
    let pollInterval = null;
    let lastSeenId = null;

    try {
      eventSource = new EventSource('/api/radar/stream');
      eventSource.addEventListener('new_order', (e) => {
        try {
          const ord = JSON.parse(e.data);
          if (ord && ord.id && ord.id !== lastSeenId) {
            lastSeenId = ord.id;
            playDispatchAlert();
            setActiveDispatchOrder(ord);
          }
        } catch (err) {
          console.warn('Erro ao processar chamado do radar:', err);
        }
      });
    } catch (e) {
      console.warn('EventSource indisponível, usando polling');
    }

    // Polling de 6 segundos para garantir que nenhum chamado seja perdido
    pollInterval = setInterval(async () => {
      try {
        const res = await api.radar.getLatest();
        if (res.orders && res.orders.length > 0) {
          const newest = res.orders[0];
          const ageSec = (Date.now() - new Date(newest.created_at).getTime()) / 1000;
          if (ageSec < 35 && newest.id !== lastSeenId) {
            lastSeenId = newest.id;
            playDispatchAlert();
            setActiveDispatchOrder(newest);
          }
        }
      } catch (err) {
        // Silencioso
      }
    }, 6000);

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user, radarActive]);

  const toggleRadar = () => {
    const nextState = !radarActive;
    setRadarActive(nextState);
    localStorage.setItem('trevia_radar_online', String(nextState));
    if (nextState) {
      playDispatchAlert(); // Pequeno som de confirmação ao ficar online
    }
  };

  const handleTestSound = () => {
    playDispatchAlert();
    setSoundTested(true);
    setTimeout(() => setSoundTested(false), 2000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 260;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

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

  const togglePaymentMethod = (method) => {
    if (paymentMethods.includes(method)) {
      setPaymentMethods(paymentMethods.filter(m => m !== method));
    } else {
      setPaymentMethods([...paymentMethods, method]);
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
        contact_phone: contactPhone,
        avatar_url: avatarUrl,
        experience_years: experienceYears,
        base_neighborhood: baseNeighborhood,
        payment_methods: paymentMethods
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
      
      {/* Top Header com Botões de Radar e Créditos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Painel do Prestador
            </h1>
            {slug && (
              <button
                onClick={() => navigate(`/profissionais/${slug}`)}
                className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center space-x-1"
                title="Visualizar como os clientes veem seu perfil"
              >
                <span>Ver Perfil</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Base: <strong className="text-slate-700">{baseNeighborhood}, Joinville</strong> • Oportunidades instantâneas na sua região
          </p>
        </div>

        {/* Controles de Status do Radar & Créditos */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Badge de Saldo de Créditos */}
          <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-2xl">
            <Coins className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-900">
              <strong>{user?.credits ?? 0}</strong> créditos
            </span>
            <button
              onClick={() => setRechargeModalOpen(true)}
              className="text-[11px] font-extrabold bg-amber-600 hover:bg-amber-700 text-white px-2 py-0.5 rounded-lg shadow-xs transition-colors"
            >
              + Recarregar
            </button>
          </div>

          {/* Interruptor Radar Estilo Uber */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl">
            <button
              onClick={toggleRadar}
              className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center space-x-2 transition-all ${
                radarActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${radarActive ? 'bg-white animate-pulse' : 'bg-slate-300'}`}></span>
              <span>{radarActive ? 'Radar Ligado' : 'Offline'}</span>
            </button>

            {radarActive && (
              <button
                onClick={handleTestSound}
                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-200 rounded-lg transition-colors text-[11px] font-semibold flex items-center space-x-1"
                title="Testar o som do alerta estilo Uber"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{soundTested ? 'Tocando!' : 'Testar Som'}</span>
              </button>
            )}
          </div>
        </div>
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
            <div className="space-y-3">
              {proposals.map((prop) => (
                <div
                  key={prop.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-semibold text-slate-400">
                        Pedido: <strong className="text-slate-800">{prop.order_title}</strong>
                      </span>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          <span>{prop.order_neighborhood ? `${prop.order_neighborhood}, ` : ''}{prop.order_city}</span>
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          <span>{new Date(prop.created_at).toLocaleDateString('pt-BR')}</span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold capitalize ${
                        prop.status === 'aceita'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : prop.status === 'recusada'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {prop.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-3 rounded-xl">
                    "{prop.message}"
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
                    <div className="flex items-center space-x-4">
                      {prop.proposed_value && (
                        <span>Valor Proposto: <strong className="text-teal-800">R$ {Number(prop.proposed_value).toFixed(2)}</strong></span>
                      )}
                      {prop.estimated_time && (
                        <span>Prazo: <strong className="text-slate-800">{prop.estimated_time}</strong></span>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/pedidos/${prop.order_id}`)}
                      className="text-teal-700 hover:text-teal-900 font-bold flex items-center space-x-1 self-start sm:self-auto"
                    >
                      <span>Ver Pedido</span>
                      <ExternalLink className="w-3 h-3" />
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

          {/* Foto de Perfil / Logo */}
          <div className="space-y-4 pb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Foto de Perfil ou Logomarca
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Foto de Perfil"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Carregar Foto do Celular/PC</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-colors"
                    >
                      Remover Foto
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Foto de rosto ou a marca do seu negócio. Perfis com foto fecham até 3x mais serviços.
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Identificação & Bairro Base
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seu Bairro Base em Joinville (Para Cálculo de Distância)
                </label>
                <select
                  value={baseNeighborhood}
                  onChange={(e) => setBaseNeighborhood(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                >
                  {JOINVILLE_NEIGHBORHOODS.map(neigh => (
                    <option key={neigh} value={neigh}>{neigh}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tempo de Experiência na Área (em anos)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="Ex: 5"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Formas de Pagamento Aceitas
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { id: 'pix', label: 'PIX' },
                    { id: 'cartao', label: 'Cartão de Crédito/Débito' },
                    { id: 'dinheiro', label: 'Dinheiro' }
                  ].map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => togglePaymentMethod(method.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        paymentMethods.includes(method.id)
                          ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold ring-1 ring-teal-500'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {paymentMethods.includes(method.id) ? '✓ ' : ''}{method.label}
                    </button>
                  ))}
                </div>
              </div>
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

      {/* Modal de Alerta Estilo Uber (Quando toca no Radar) */}
      <DispatchAlertModal
        order={activeDispatchOrder}
        onAccept={(ord) => {
          setActiveDispatchOrder(null);
          navigate(`/pedidos/${ord.id}`);
        }}
        onDismiss={() => setActiveDispatchOrder(null)}
      />

      {/* Modal de Recarga de Créditos via PIX */}
      <RechargeModal
        isOpen={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
        onSuccess={() => loadProviderData()}
      />

    </div>
  );
}
