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
  Radio,
  Star,
  ThumbsUp,
  QrCode,
  Trash2,
  Plus,
  Award,
  Gift,
  Sparkles,
  Wallet
} from 'lucide-react';
import DispatchAlertModal from '../components/DispatchAlertModal.jsx';
import RechargeModal from '../components/RechargeModal.jsx';
import DigitalCardModal from '../components/DigitalCardModal.jsx';
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
  const { user, profile, refreshMe, openAuthModal, setMode } = useAuth();
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
  const [cardModalOpen, setCardModalOpen] = useState(false);

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
  const [reviewsData, setReviewsData] = useState({ average_rating: 0, total_reviews: 0, reviews: [] });
  const [portfolio, setPortfolio] = useState([]);
  const [providerLevel, setProviderLevel] = useState(null);
  const [bonusModalOpen, setBonusModalOpen] = useState(false);

  // New portfolio item form
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [newJobBefore, setNewJobBefore] = useState('');
  const [newJobAfter, setNewJobAfter] = useState('');
  const [portfolioFormOpen, setPortfolioFormOpen] = useState(false);

  const loadProviderData = async () => {
    setLoading(true);
    try {
      const [propsRes, catsRes, locsRes, myProfRes, revsRes] = await Promise.all([
        api.proposals.myProposals(),
        api.categories.list(),
        api.locations.list(),
        api.professionals.getMyProfile(),
        user?.id ? api.reviews.getByUser(user.id).catch(() => ({ average_rating: 0, total_reviews: 0, reviews: [] })) : Promise.resolve({ average_rating: 0, total_reviews: 0, reviews: [] })
      ]);

      setProposals(propsRes.proposals || []);
      setCategories(catsRes.categories || []);
      setLocations(locsRes.locations || []);
      if (revsRes) {
        setReviewsData(revsRes);
      }

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
        setPortfolio(p.portfolio || []);
        if (p.provider_level) {
          setProviderLevel(p.provider_level);
        }
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

  const handleAddPortfolioItem = (e) => {
    e.preventDefault();
    if (!newJobTitle.trim()) {
      alert('Informe o título do trabalho realizado.');
      return;
    }
    const newItem = {
      id: 'job-' + Date.now(),
      title: newJobTitle.trim(),
      description: newJobDesc.trim(),
      image_before: newJobBefore.trim(),
      image_after: newJobAfter.trim(),
      image: newJobAfter.trim() || newJobBefore.trim()
    };
    setPortfolio([...portfolio, newItem]);
    setNewJobTitle('');
    setNewJobDesc('');
    setNewJobBefore('');
    setNewJobAfter('');
    setPortfolioFormOpen(false);
  };

  const handleRemovePortfolioItem = (index) => {
    const updated = portfolio.filter((_, i) => i !== index);
    setPortfolio(updated);
  };

  const handleFillPortfolioSample = () => {
    setNewJobTitle('Reforma e Troca de Fiação Elétrica');
    setNewJobDesc('Substituição completa de fiação antiga e disjuntores obsoletos por padrão NBR 5410 com DPS e DR de proteção contra surtos no bairro América.');
    setNewJobBefore('https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80');
    setNewJobAfter('https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80');
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
        payment_methods: paymentMethods,
        portfolio
      });

      setSlug(res.profile.slug);
      if (res.profile?.provider_level) {
        setProviderLevel(res.profile.provider_level);
      }
      await refreshMe();

      if (res.welcome_bonus_awarded) {
        setBonusModalOpen(true);
        setSaveSuccess('🎉 Parabéns! Você completou seu perfil e ganhou seu 1º Crédito Grátis!');
      } else {
        setSaveSuccess('Perfil profissional atualizado com sucesso!');
      }
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
      
      {/* Mode Orientation Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs border border-slate-800 shadow-sm">
        <div className="flex items-center space-x-2 text-emerald-300 font-bold">
          <Briefcase className="w-4 h-4 text-emerald-400" />
          <span>Você está no Painel do Prestador Pro</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode('client');
            navigate('/minha-conta');
          }}
          className="text-xs font-black text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 shadow-2xs"
        >
          <User className="w-3.5 h-3.5 text-emerald-400" />
          <span>Mudar para Painel do Contratante (Cliente) →</span>
        </button>
      </div>

      {/* Top Header com Botões de Radar e Créditos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Painel do Prestador
            </h1>
            {slug && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigate(`/profissionais/${slug}`)}
                  className="text-xs text-teal-700 hover:text-teal-900 font-bold flex items-center space-x-1"
                  title="Visualizar como os clientes veem seu perfil"
                >
                  <span>Ver Perfil</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setCardModalOpen(true)}
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-2.5 py-1 rounded-xl flex items-center space-x-1 shadow-2xs transition-colors"
                  title="Abrir seu Cartão Virtual com QR Code para imprimir ou divulgar no WhatsApp"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Meu Cartão QR</span>
                </button>
              </div>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Base: <strong className="text-slate-700">{baseNeighborhood}, Joinville</strong> • Oportunidades instantâneas na sua região
          </p>
        </div>

        {/* Controles de Status do Radar & Créditos */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Badge de Avaliação / Reputação */}
          <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-200 px-3 py-2 rounded-2xl">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span className="text-xs font-bold text-amber-900">
              <strong>{reviewsData.average_rating > 0 ? reviewsData.average_rating.toFixed(1) : '5.0'}</strong> ({reviewsData.total_reviews} avaliações)
            </span>
          </div>

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

          {/* Badge de Carteira Digital */}
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-900">
              <strong>R$ {Number(user?.wallet_balance || 0).toFixed(2).replace('.', ',')}</strong>
            </span>
            <button
              onClick={() => navigate('/carteira')}
              className="text-[11px] font-extrabold bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 rounded-lg shadow-xs transition-colors"
            >
              Carteira
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

      {/* Bônus de Boas-Vindas Banner (se ainda não resgatado) */}
      {user && !user.has_received_welcome_bonus && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  Bônus de Boas-Vindas
                </span>
                <span className="text-emerald-200 text-xs font-semibold">+1 Crédito Grátis</span>
              </div>
              <h3 className="font-extrabold text-sm sm:text-base text-white mt-0.5">
                Complete seu Perfil Profissional e Ganhe 1 Crédito no Radar
              </h3>
              <p className="text-xs text-emerald-100 max-w-xl">
                Preencha seu Nome, Apresentação (Bio), WhatsApp e Categorias de serviço. O crédito cai na hora na sua conta!
              </p>
            </div>
          </div>
          <button
            onClick={() => setTab('profile')}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-emerald-800 font-extrabold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center space-x-1.5"
          >
            <span>Completar Agora</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          </button>
        </div>
      )}

      {/* Cartão de Nível Trevia Pro (Estilo Uber Pro) */}
      {providerLevel && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-xs ${
                providerLevel.tier === 4 ? 'bg-cyan-100 text-cyan-800 border border-cyan-300' :
                providerLevel.tier === 3 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                providerLevel.tier === 2 ? 'bg-slate-100 text-slate-800 border border-slate-300' :
                'bg-orange-100 text-orange-800 border border-orange-300'
              }`}>
                {providerLevel.tier === 4 ? '💎' : providerLevel.tier === 3 ? '🥇' : providerLevel.tier === 2 ? '🥈' : '🥉'}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                    providerLevel.tier === 4 ? 'bg-cyan-50 text-cyan-800 border-cyan-300' :
                    providerLevel.tier === 3 ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    providerLevel.tier === 2 ? 'bg-slate-100 text-slate-800 border-slate-300' :
                    'bg-orange-50 text-orange-800 border-orange-200'
                  }`}>
                    {providerLevel.badge}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold">• Programa Trevia Pro</span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 mt-1">
                  {providerLevel.description}
                </h4>
              </div>
            </div>

            <div className="flex items-center space-x-4 self-start sm:self-auto text-xs text-slate-600 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-extrabold text-slate-900">{reviewsData.average_rating > 0 ? reviewsData.average_rating.toFixed(1) : '5.0'}</span>
                <span className="text-[10px] text-slate-400">({reviewsData.total_reviews} avaliações)</span>
              </div>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                <span className="font-bold text-slate-800">{portfolio.length}</span>
                <span className="text-[10px] text-slate-400">{portfolio.length === 1 ? 'foto' : 'fotos'}</span>
              </div>
            </div>
          </div>

          {/* Barra de Progresso para o Próximo Nível */}
          {providerLevel.nextLevel ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Progresso para o Nível {providerLevel.nextLevel}</span>
                <span className="text-teal-700">{providerLevel.progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${providerLevel.progressPercent}%` }}
                ></div>
              </div>
            </div>
          ) : (
            <div className="text-xs font-bold text-cyan-800 bg-cyan-50 p-2.5 rounded-xl border border-cyan-200 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>Você atingiu o nível máximo Diamante! Seu perfil possui destaque prioritário absoluto em Joinville.</span>
            </div>
          )}

          {/* Vantagens Ativas */}
          {providerLevel.perks && providerLevel.perks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {providerLevel.perks.map((perk, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1 text-[11px] font-semibold bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/80"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>{perk}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

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
        <button
          onClick={() => setTab('reviews')}
          className={`pb-3 font-bold transition-all relative flex items-center space-x-1.5 ${
            tab === 'reviews'
              ? 'text-teal-700 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
          <span>Avaliações de Clientes ({reviewsData.total_reviews})</span>
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
                    draggable="false"
                    className="w-full h-full object-cover rounded-2xl select-none pointer-events-none"
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

          {/* Galeria de Fotos & Portfólio (Antes & Depois) */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-700">
                  <Camera className="w-4 h-4" />
                  <span>Portfólio & Fotos Reais</span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Galeria de Trabalhos & Antes e Depois
                </h3>
                <p className="text-xs text-slate-500">
                  Fotos reais de serviços executados em Joinville. Prestadores com fotos convertem até 3x mais clientes no WhatsApp!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPortfolioFormOpen(!portfolioFormOpen)}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors self-start sm:self-auto shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{portfolioFormOpen ? 'Fechar Formulário' : 'Adicionar Trabalho'}</span>
              </button>
            </div>

            {/* Formulário de Novo Trabalho */}
            {portfolioFormOpen && (
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Novo Serviço Realizado
                  </span>
                  <button
                    type="button"
                    onClick={handleFillPortfolioSample}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Preencher Exemplo de Joinville</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título do Trabalho *
                  </label>
                  <input
                    type="text"
                    value={newJobTitle}
                    onChange={(e) => setNewJobTitle(e.target.value)}
                    placeholder="Ex: Reforma de Banheiro ou Troca de Fiação no América"
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descrição do Serviço (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={newJobDesc}
                    onChange={(e) => setNewJobDesc(e.target.value)}
                    placeholder="Ex: Instalação de porcelanato retificado, registros e vaso sanitário com garantia."
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Foto do "Antes" (URL da Imagem)
                    </label>
                    <input
                      type="url"
                      value={newJobBefore}
                      onChange={(e) => setNewJobBefore(e.target.value)}
                      placeholder="https://exemplo.com/antes.jpg"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Foto do "Depois" ou Concluído (URL da Imagem) *
                    </label>
                    <input
                      type="url"
                      value={newJobAfter}
                      onChange={(e) => setNewJobAfter(e.target.value)}
                      placeholder="https://exemplo.com/depois.jpg"
                      className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPortfolioFormOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPortfolioItem}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar à Galeria</span>
                  </button>
                </div>
              </div>
            )}

            {/* Lista de Fotos Existentes */}
            {portfolio.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center space-y-1.5">
                <Camera className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-600 font-semibold">
                  Nenhum trabalho adicionado ao seu portfólio ainda.
                </p>
                <p className="text-[11px] text-slate-400">
                  Clique no botão acima para adicionar fotos reais e destacar seu perfil nas buscas de Joinville!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portfolio.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3 relative group">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900">{item.title}</h4>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePortfolioItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-white transition-colors"
                        title="Remover foto do portfólio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.image_before && item.image_after ? (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative rounded-xl overflow-hidden bg-slate-200 aspect-video select-none">
                          <img src={item.image_before} alt="Antes" draggable="false" className="w-full h-full object-cover select-none pointer-events-none" />
                          <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase select-none pointer-events-none">
                            Antes
                          </span>
                        </div>
                        <div className="relative rounded-xl overflow-hidden bg-slate-200 aspect-video select-none">
                          <img src={item.image_after} alt="Depois" draggable="false" className="w-full h-full object-cover select-none pointer-events-none" />
                          <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase select-none pointer-events-none">
                            Depois
                          </span>
                        </div>
                      </div>
                    ) : (item.image_after || item.image) ? (
                      <div className="rounded-xl overflow-hidden bg-slate-200 aspect-video select-none">
                        <img src={item.image_after || item.image} alt={item.title} draggable="false" className="w-full h-full object-cover select-none pointer-events-none" />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
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

      {/* TAB 3: REVIEWS RECEIVED FROM CLIENTS */}
      {tab === 'reviews' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col items-center justify-center text-amber-800">
                <span className="text-2xl font-black">{reviewsData.average_rating > 0 ? reviewsData.average_rating.toFixed(1) : '5.0'}</span>
                <div className="flex text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Sua Reputação Profissional em Joinville</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Baseado em <strong>{reviewsData.total_reviews} avaliações</strong> deixadas por clientes que contrataram seus serviços.
                </p>
              </div>
            </div>

            {slug && (
              <button
                onClick={() => navigate(`/profissionais/${slug}`)}
                className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
              >
                <span>Ver seu Perfil Público</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {reviewsData.reviews.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <Star className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-800">Ainda nenhuma avaliação recebida</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Envie propostas para os pedidos em aberto e atenda clientes. Ao concluir o serviço, solicite que o cliente deixe uma avaliação para alavancar seu perfil!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsData.reviews.map((rev) => {
                let tags = [];
                try {
                  tags = typeof rev.tags_json === 'string' ? JSON.parse(rev.tags_json) : rev.tags_json || [];
                } catch (e) {
                  tags = [];
                }

                return (
                  <div
                    key={rev.id}
                    className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                          {rev.reviewer_avatar ? (
                            <img src={rev.reviewer_avatar} alt={rev.reviewer_name} draggable="false" className="w-full h-full object-cover select-none pointer-events-none" />
                          ) : (
                            rev.reviewer_name?.slice(0, 2) || 'CL'
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{rev.reviewer_name}</h4>
                          <span className="text-[10px] text-slate-400">
                            {new Date(rev.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-0.5 text-amber-500 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/60">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      "{rev.comment}"
                    </p>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tags.map((tag, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

      {/* Modal de Cartão Digital com QR Code */}
      <DigitalCardModal
        isOpen={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        profile={{
          public_name: publicName || user?.name,
          slug: slug,
          avatar_url: avatarUrl,
          whatsapp: whatsapp || user?.phone,
          base_neighborhood: baseNeighborhood,
          experience_years: experienceYears,
          categories: selectedCategories.map(cId => categories.find(c => c.id === cId)?.name || cId),
          is_verified: true
        }}
        rating={reviewsData}
        providerLevel={providerLevel}
      />

      {/* Modal Comemorativo de Bônus de Boas-Vindas */}
      {bonusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-4 border border-emerald-100 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-inner">
              🎁
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Parabéns • 1º Crédito Liberado!
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Você Ganhou +1 Crédito Grátis no Radar!
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seu perfil profissional está 100% completo e validado para receber solicitações em Joinville e região. Você já pode desbloquear clientes com seu novo crédito!
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-emerald-800 font-bold">Seu Novo Saldo:</span>
              <span className="font-black text-emerald-900 text-sm">{user?.credits ? user.credits + 1 : 4} créditos</span>
            </div>

            <button
              onClick={() => {
                setBonusModalOpen(false);
                navigate('/pedidos');
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors"
            >
              Ver Pedidos no Radar Agora
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
