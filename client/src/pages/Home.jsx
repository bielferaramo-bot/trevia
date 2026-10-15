import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useLocation } from '../LocationContext.jsx';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
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
  MessageCircle,
  Phone,
  HelpCircle,
  ThumbsUp,
  Send,
  Check,
  User,
  ExternalLink,
  ShieldAlert,
  Award,
  Briefcase,
  Coins,
  Radio,
  Wallet
} from 'lucide-react';
import PriceSimulator from '../components/PriceSimulator.jsx';
import { trackConversion } from '../analytics.js';

// Fotos otimizadas com WebP e alta resolução mapeadas por serviço
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

const JOINVILLE_NEIGHBORHOODS = [
  'América', 'Glória', 'Centro', 'Costa e Silva', 'Anita Garibaldi',
  'Saguaçu', 'Atiradores', 'Bom Retiro', 'Floresta', 'Vila Nova',
  'Pirabeiraba', 'Aventureiro', 'Iririú', 'Boa Vista', 'Boehmerwald',
  'Itaum', 'Jardim Sofia', 'Espinheiros', 'Araquari (Região)', 'Jaraguá do Sul (Região)'
];

const LOCAL_SERVICES_LIST = [
  'Instalação de Ar Condicionado',
  'Eletricista Residencial e Comercial',
  'Encanador e Desentupimento',
  'Pintura de Casas e Apartamentos',
  'Diarista e Faxina Residencial',
  'Marido de Aluguel e Pequenos Reparos',
  'Montagem e Desmontagem de Móveis',
  'Pedreiro, Alvenaria e Reformas',
  'Jardinagem e Limpeza de Terrenos'
];

const LOCAL_TESTIMONIALS = [
  {
    id: 1,
    name: 'Mariana Ribeiro',
    role: 'Cliente Residencial',
    neighborhood: 'Bairro América, Joinville',
    service: 'Eletricista Residencial',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    stars: 5,
    date: 'Há 3 dias',
    text: 'Precisei com urgência de um eletricista no sábado de manhã para consertar o disjuntor do chuveiro. Em menos de 20 minutos já estava conversando pelo WhatsApp com um ótimo profissional. Serviço impecável, pontual e com preço justo!'
  },
  {
    id: 2,
    name: 'Marcos Vinícius Silva',
    role: 'Morador / Síndico',
    neighborhood: 'Bairro Glória, Joinville',
    service: 'Manutenção de Ar Condicionado',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    stars: 5,
    date: 'Há 1 semana',
    text: 'Solicitei higienização e manutenção de dois aparelhos Split antes da chegada do verão. O técnico foi super pontual, uniformizado e o orçamento foi exatamente o acordado pelo WhatsApp, sem pegadinhas. Recomendo muito!'
  },
  {
    id: 3,
    name: 'Juliana Ferrari',
    role: 'Empresária',
    neighborhood: 'Bairro Costa e Silva, Joinville',
    service: 'Limpeza e Diarista',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    stars: 5,
    date: 'Há 2 semanas',
    text: 'Sempre tive receio de contratar serviços pela internet, mas a Trevia me passou total segurança. A diarista era muito experiente, atenciosa e deixou a casa impecável. O contato direto pelo WhatsApp facilita muito a rotina.'
  },
  {
    id: 4,
    name: 'Roberto Silveira',
    role: 'Proprietário',
    neighborhood: 'Anita Garibaldi, Joinville',
    service: 'Pintura e Reparos',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    stars: 5,
    date: 'Há 3 semanas',
    text: 'Reformei meu apartamento e encontrei tanto o pintor quanto o encanador pelo Trevia. Economizei um tempão ligando de loja em loja. As propostas vieram rápidas e os dois profissionais foram excelentes.'
  }
];

const FAQ_ITEMS = [
  {
    question: 'Quanto custa solicitar um orçamento no Trevia?',
    answer: 'É 100% gratuito para quem contrata! Você não paga nenhuma taxa de cadastro ou solicitação de orçamento. O valor final do serviço é combinado diretamente entre você e o profissional escolhido, sem intermediários ou comissões ocultas.'
  },
  {
    question: 'Como os profissionais entram em contato comigo?',
    answer: 'Você pode solicitar contato rápido direto pelo WhatsApp através do nosso formulário express ou publicar seu pedido no mural do Trevia. Seus dados de contato ficam 100% seguros e você só conversa com profissionais verificados que atendem a sua região.'
  },
  {
    question: 'Quais cidades e bairros a Trevia atende?',
    answer: 'Atendemos todos os bairros de Joinville (América, Glória, Centro, Costa e Silva, Anita Garibaldi, Saguaçu, Bom Retiro, Vila Nova, Pirabeiraba, Aventureiro, etc.) além das cidades vizinhas da região metropolitana: Araquari, Jaraguá do Sul, Garuva, Guaramirim e São Francisco do Sul.'
  },
  {
    question: 'Como sei se o profissional é de confiança?',
    answer: 'No Trevia você confere avaliações reais de clientes da região de Joinville, fotos de trabalhos já executados e histórico na plataforma. Além disso, nosso sistema de propostas é privado para evitar qualquer tipo de spam.'
  },
  {
    question: 'Sou profissional autônomo, como posso receber serviços?',
    answer: 'O cadastro para prestadores autônomos também é gratuito. Basta clicar em "Quero Trabalhar", criar seu perfil profissional e você poderá visualizar todos os pedidos abertos em Joinville, ativando alertas instantâneos no seu celular.'
  }
];

const PROVIDER_TESTIMONIALS = [
  {
    id: 1,
    name: 'Carlos Eduardo Mendes',
    role: 'Eletricista Residencial e Predial',
    neighborhood: 'Costa e Silva, Joinville',
    specialty: 'Instalações e Padrão Celesc',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    stars: 5,
    earnings: '+R$ 4.200/mês',
    text: 'Trabalho há mais de 10 anos em Joinville e o Trevia foi uma virada de chave. O alerta toca no celular, eu envio a proposta e negocio direto no WhatsApp sem pagar porcentagem abusiva do meu serviço. Melhor plataforma da região!'
  },
  {
    id: 2,
    name: 'Roberto Silveira',
    role: 'Técnico de Climatização e Ar Split',
    neighborhood: 'Bairro Glória, Joinville',
    specialty: 'Instalação e Higienização de Ar',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    stars: 5,
    earnings: '+R$ 5.800/mês',
    text: 'A garantia de estorno de moedas é o que me conquistou. Em outros apps você gasta dinheiro e o cliente nem visualiza. No Trevia, se o cliente não responder em 48h a moeda volta para a conta. Já tenho clientes fixos no América e Centro.'
  },
  {
    id: 3,
    name: 'Vanessa Antunes',
    role: 'Diarista e Especialista em Pós-Obra',
    neighborhood: 'Anita Garibaldi, Joinville',
    specialty: 'Limpeza Residencial e Comercial',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    stars: 5,
    earnings: '+R$ 3.600/mês',
    text: 'Preencho todos os dias da minha semana com serviços rápidos em Joinville. Os clientes são super educados e o pagamento é feito diretamente para mim no PIX logo após o término da limpeza. Super recomendo!'
  },
  {
    id: 4,
    name: 'Lucas Ferreira',
    role: 'Pintor e Acabamentos',
    neighborhood: 'Vila Nova, Joinville',
    specialty: 'Pintura Interna e Externa',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    stars: 5,
    earnings: '+R$ 4.900/mês',
    text: 'O radar de oportunidades no estilo Uber é fantástico. Eu recebo o chamado no bairro perto de onde já estou trabalhando, passo o orçamento e fecho. O dinheiro que ganho vai direto pra minha carteira com saque instantâneo.'
  }
];

const PROVIDER_FAQ_ITEMS = [
  {
    question: 'Como funciona para receber pedidos de clientes em Joinville?',
    answer: 'Assim que um cliente publica uma necessidade ou solicita um orçamento, nosso Radar de Oportunidades notifica os prestadores cadastrados na categoria e região correspondente. Você visualiza a descrição do serviço, o bairro e o orçamento estimado, podendo enviar sua proposta imediatamente.'
  },
  {
    question: 'Quanto o Trevia cobra de comissão pelos serviços que eu fechar?',
    answer: 'ZERO comissão percentual! Você não paga nenhuma porcentagem sobre o valor que combinar com o cliente. Se você fechar um serviço de R$ 500,00 ou R$ 2.000,00, os 100% são inteiramente seus, pagos diretamente pelo cliente via PIX ou dinheiro.'
  },
  {
    question: 'O que acontece se o cliente não responder à minha proposta?',
    answer: 'Você conta com a Proteção de Moedas Trevia: se o cliente não interagir ou não responder à sua proposta no prazo de 48 horas, as moedas utilizadas para o envio da proposta retornam automaticamente para a sua conta.'
  },
  {
    question: 'Como funciona a Carteira Digital e o saque dos meus valores?',
    answer: 'Na sua Carteira Trevia você acompanha todo o seu saldo com transparência. Caso tenha valores retidos ou saldo de serviços, você pode solicitar a transferência para a sua chave PIX a qualquer momento com liquidação rápida.'
  },
  {
    question: 'Preciso ter empresa (CNPJ ou MEI) para trabalhar no Trevia?',
    answer: 'Não é obrigatório! Você pode se cadastrar como profissional autônomo pessoa física (CPF) ou como MEI/empresa (CNPJ). O importante é prestar um serviço de alta qualidade para receber boas avaliações dos clientes de Joinville.'
  }
];

export default function Home({ navigate }) {
  const { user, openAuthModal, userMode, setMode } = useAuth();
  const { userLocation, getDistanceTo } = useLocation();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Search input and location state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Joinville');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('América');
  const [providerCategoryFilter, setProviderCategoryFilter] = useState('');
  const [openProviderFaqIndex, setOpenProviderFaqIndex] = useState(null);

  // Express Lead Form state
  const [leadForm, setLeadForm] = useState({
    name: '',
    whatsapp: '',
    service: 'Instalação de Ar Condicionado',
    neighborhood: 'América',
    details: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [savedLeadWaUrl, setSavedLeadWaUrl] = useState('');

  const handlePhoneChange = (val) => {
    const digits = val.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length <= 2) {
      formatted = digits ? `(${digits}` : '';
    } else if (digits.length <= 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 11) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    setLeadForm(prev => ({ ...prev, whatsapp: formatted }));
  };

  // FAQ Accordion active index
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

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

  const handleExpressLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadForm.name.trim() || !leadForm.whatsapp.trim()) {
      alert('Por favor, informe seu nome e telefone/WhatsApp.');
      return;
    }

    const cleanDigits = leadForm.whatsapp.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      alert('Informe seu WhatsApp com o DDD (ex: 47 99999-9999).');
      return;
    }

    setSavingLead(true);

    const phone = '5547988501714';
    const textMsg = `Olá! Meu nome é *${leadForm.name}* (${leadForm.whatsapp}).
Gostaria de um orçamento sem compromisso para *${leadForm.service}* no bairro *${leadForm.neighborhood}* em Joinville.
${leadForm.details ? `Observações: ${leadForm.details}` : ''}
Encontrei vocês através do site Trevia (trevia.work).`;

    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(textMsg)}`;
    setSavedLeadWaUrl(waUrl);

    try {
      // 1. Salva no banco de dados para ZERO perda de leads
      await api.leads.create({
        name: leadForm.name,
        phone: leadForm.whatsapp,
        service: leadForm.service,
        neighborhood: leadForm.neighborhood,
        details: leadForm.details,
        source: 'express_home'
      });

      // 2. Dispara evento de conversão para Meta Ads e Google Ads
      trackConversion('Lead', {
        service: leadForm.service,
        neighborhood: leadForm.neighborhood,
        city: 'Joinville'
      });
    } catch (err) {
      console.warn('Erro ao salvar lead em background:', err);
    } finally {
      setSavingLead(false);
      setFormSubmitted(true);
      // 3. Abre conversa de WhatsApp
      window.open(waUrl, '_blank');
    }
  };

  const toggleFaq = (idx) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  return (
    <div className="pb-16 md:pb-8 space-y-10 sm:space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">

      {/* TOP REGIONAL BANNER & QUICK LOCATION */}
      <div className="flex flex-wrap items-center justify-between py-2.5 border-b border-slate-100 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
              <span>{selectedCity}, SC</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold text-[10px]">
                {selectedNeighborhood} e região
              </span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium hidden sm:block">
              Conectando você aos melhores profissionais de Joinville e Cidades Vizinhas
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="https://wa.me/5547988501714?text=Ol%C3%A1!%20Gostaria%20de%20um%20or%C3%A7amento%20para%20servi%C3%A7os%20em%20Joinville."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>(47) 98850-1714</span>
          </a>

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

      {/* MODE SELECTOR TABS (Bifurcação Clara: Contratante vs Prestador) */}
      <div className="bg-slate-100 p-1.5 rounded-2xl max-w-xl mx-auto flex items-center border border-slate-200/90 shadow-inner">
        <button
          type="button"
          onClick={() => setMode('client')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
            userMode === 'client'
              ? 'bg-white text-emerald-950 shadow-xs border border-slate-200/80 scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <User className={`w-4 h-4 ${userMode === 'client' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>👤 Quero Contratar</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${userMode === 'client' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
            Cliente
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMode('provider')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${
            userMode === 'provider'
              ? 'bg-emerald-600 text-white shadow-md scale-[1.01]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Briefcase className={`w-4 h-4 ${userMode === 'provider' ? 'text-white' : 'text-slate-400'}`} />
          <span>💼 Quero Trabalhar</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${userMode === 'provider' ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'}`}>
            Prestador
          </span>
        </button>
      </div>

      {userMode === 'provider' ? (
        /* ========================================================================= */
        /* FLUXO DO PRESTADOR / AUTÔNOMO (QUERO TRABALHAR)                           */
        /* ========================================================================= */
        <div className="space-y-10 sm:space-y-12">
          {/* SEARCH BAR (Oportunidades em Aberto) */}
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar pedidos em aberto em Joinville (ex: instalação ar, pintura, reparo elétrico, faxina)..."
                className="w-full pl-11 pr-24 py-3.5 text-sm bg-white border border-slate-200/90 rounded-2xl shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all text-slate-800 placeholder-slate-400"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buscar Vagas</span>
              </button>
            </div>
          </form>

          {/* 1. HERO DO PRESTADOR */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white shadow-xl p-6 sm:p-8 lg:p-12 border border-emerald-900/40">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md text-xs font-bold text-emerald-300 border border-emerald-400/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{recentOrders.length > 0 ? `${recentOrders.length} Pedidos Abertos Hoje em Joinville e Região` : 'Radar de Oportunidades Joinville'}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                  Receba Pedidos de Clientes e <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-white">
                    Fature Direto no seu WhatsApp
                  </span>
                </h1>

                <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
                  Trabalhe como autônomo em Joinville e região sem pagar comissões abusivas por serviço. Veja solicitações reais de clientes agora, envie orçamentos e receba 100% do seu dinheiro via PIX.
                </p>

                {/* Trust bullet points para prestador */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-200 font-medium pt-1">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>100% do valor do serviço é seu</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Radar de pedidos estilo Uber no celular</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Garantia de estorno de moedas em 48h</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>Carteira com saque PIX instantâneo</span>
                  </div>
                </div>

                {/* CTAs de ação imediata */}
                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <a
                    href="#pedidos-abertos"
                    className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm shadow-lg transition-all flex items-center space-x-2"
                  >
                    <span>Ver Pedidos em Aberto</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => navigate('/oportunidades')}
                    className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/20 transition-all flex items-center space-x-2"
                  >
                    <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                    <span>Ativar Radar Sonoro</span>
                  </button>

                  <button
                    onClick={() => navigate('/painel-profissional')}
                    className="px-5 py-3 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center space-x-1.5"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Painel do Prestador Pro</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Hero Visual Card simulating live incoming order */}
              <div className="lg:col-span-5 flex justify-center lg:justify-end">
                <div className="w-full max-w-md bg-slate-900/90 rounded-3xl border border-emerald-500/30 p-5 shadow-2xl space-y-4 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                      <span className="text-xs font-black text-emerald-300">Chamado em Tempo Real</span>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Joinville, SC
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold rounded-full">
                        Instalação de Ar Condicionado
                      </span>
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-extrabold rounded-full">
                        ⚡ Urgente
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      Instalação e Ponto de Dreno Ar Split 12.000 BTUs
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Bairro América, Joinville (a ~2.4 km de você)</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Orçamento estimado</span>
                      <span className="text-base font-black text-emerald-400">R$ 380,00</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">Propostas</span>
                      <span className="text-xs font-bold text-slate-200">Apenas 1 enviada</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (recentOrders.length > 0) {
                        navigate(`/pedidos/${recentOrders[0].id}`);
                      } else {
                        navigate('/pedidos');
                      }
                    }}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                  >
                    <span>Enviar Proposta e Pegar Serviço</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <p className="text-[10px] text-center text-slate-400 font-medium">
                    🔒 Contato direto no WhatsApp após envio • Sem taxas ocultas
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 2. MÉTRICAS DO PRESTADOR */}
          <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">0% Taxa</div>
                <div className="text-xs font-bold text-slate-200">Comissão por Serviço</div>
                <div className="text-[11px] text-slate-400">100% do valor é seu</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">+1.450</div>
                <div className="text-xs font-bold text-slate-200">Pedidos Postados</div>
                <div className="text-[11px] text-slate-400">Em Joinville e Região</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">48h Garantia</div>
                <div className="text-xs font-bold text-slate-200">Estorno Automático</div>
                <div className="text-[11px] text-slate-400">Se o cliente não responder</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl sm:text-3xl font-black text-emerald-400">PIX Imediato</div>
                <div className="text-xs font-bold text-slate-200">Carteira Digital</div>
                <div className="text-[11px] text-slate-400">Depósitos e saques rápidos</div>
              </div>
            </div>
          </section>

          {/* 3. 4 VANTAGENS EXCLUSIVAS */}
          <section className="space-y-4">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Por que trabalhar com o Trevia?</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Vantagens Exclusivas para Profissionais em Joinville
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Criado especialmente para valorizar a mão de obra autônoma com honestidade e tecnologia.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-500 transition-all space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Radio className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Radar em Tempo Real</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Seja avisado com alerta sonoro e notificações assim que um morador do seu bairro publicar uma solicitação no Trevia.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-500 transition-all space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">100% do Lucro é Seu</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Não cobramos 15% ou 20% do valor do seu serviço como outros apps. O valor combinado com o cliente é pago diretamente a você.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-500 transition-all space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Garantia de Moedas 48h</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enviou proposta e o cliente não visualizou ou não respondeu em 48 horas? As moedas voltam automaticamente para o seu saldo.
                </p>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:border-emerald-500 transition-all space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Carteira com Saque PIX</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Acompanhe seus créditos, recarregue moedas por chave PIX automática e solicite saques dos seus valores quando quiser.
                </p>
              </div>
            </div>
          </section>

          {/* 4. MURAL DE PEDIDOS ABERTOS COM AÇÃO IMEDIATA */}
          <section id="pedidos-abertos" className="scroll-mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
                  <span>Pedidos em Aberto para Prestadores</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </h2>
                <p className="text-xs text-slate-500">
                  Clientes aguardando contato e orçamento em Joinville e cidades vizinhas
                </p>
              </div>
              <button
                onClick={() => navigate('/pedidos')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
              >
                <span>Ver todos ({recentOrders.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setProviderCategoryFilter('')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  !providerCategoryFilter
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Todas as Categorias
              </button>
              {categories.slice(0, 8).map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setProviderCategoryFilter(cat.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    providerCategoryFilter === cat.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Orders Grid */}
            {loadingOrders ? (
              <div className="py-12 text-center text-sm text-slate-400">
                Carregando oportunidades em Joinville...
              </div>
            ) : recentOrders.filter(o => !providerCategoryFilter || o.category_id === providerCategoryFilter).length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">Nenhum pedido nesta categoria no momento.</p>
                <button
                  onClick={() => setProviderCategoryFilter('')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  Ver Todas as Oportunidades
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {recentOrders
                  .filter(o => !providerCategoryFilter || o.category_id === providerCategoryFilter)
                  .map((order) => {
                    const photoUrl = CATEGORY_IMAGES[order.category_id] || 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80';
                    const distInfo = getDistanceTo(order.city, order.neighborhood);

                    return (
                      <div
                        key={order.id}
                        onClick={() => navigate(`/pedidos/${order.id}`)}
                        className="bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-500/80 hover:shadow-lg transition-all cursor-pointer overflow-hidden flex flex-col justify-between group"
                      >
                        <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                          <img
                            src={photoUrl}
                            alt={`Serviço de ${order.title} em Joinville SC`}
                            draggable="false"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none pointer-events-none"
                            loading="lazy"
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

                        <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 mb-1">
                              {order.title}
                            </h3>

                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                                <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                <span>{distInfo && distInfo.formattedText ? distInfo.formattedText : (order.neighborhood ? `${order.neighborhood}, ` : '') + order.city}</span>
                              </span>

                              <span className="text-[11px] font-semibold text-slate-500">
                                {order.timeframe === 'urgente' ? '⚡ Urgente' : '🕒 ' + (order.timeframe ? order.timeframe.replace('_', ' ') : 'Esta semana')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                                <span>🔒 Proposta Privada</span>
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
                                navigate(`/pedidos/${order.id}`);
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
                            >
                              <span>Enviar Proposta</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* 5. COMO FUNCIONA PARA O PRESTADOR */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Passo a Passo Simples</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Como Funciona para o Prestador de Serviços
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Comece a receber solicitações em menos de 3 minutos
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  1
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Crie seu Perfil Grátis</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cadastre suas especialidades (ar condicionado, eletricista, encanador, faxina, etc.) e defina os bairros de Joinville onde você atende.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  2
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Receba Alertas de Clientes</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Nosso radar avisa no seu celular e no WhatsApp quando um cliente da sua região solicitar seu serviço com orçamento estimado.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  3
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Envie Proposta e Fature</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Converse diretamente com o cliente no WhatsApp, combine os detalhes e receba 100% do valor combinado via PIX, sem comissões.
                </p>
              </div>
            </div>
          </section>

          {/* 6. DEPOIMENTOS DE PRESTADORES */}
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Depoimentos de Autônomos de Joinville</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Profissionais que Faturam com o Trevia
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Veja histórias reais de quem transformou o Trevia na principal fonte de clientes.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {PROVIDER_TESTIMONIALS.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex text-amber-400">
                        {[...Array(t.stars)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-extrabold">
                        {t.earnings}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      "{t.text}"
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center space-x-3">
                    <img
                      src={t.avatar}
                      alt={`Foto de ${t.name}, prestador em ${t.neighborhood}`}
                      draggable="false"
                      className="w-10 h-10 rounded-full object-cover border border-emerald-100 flex-shrink-0 select-none pointer-events-none"
                      loading="lazy"
                    />
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{t.name}</h4>
                      <p className="text-[10px] text-emerald-700 font-semibold truncate">{t.neighborhood}</p>
                      <p className="text-[10px] text-slate-400 truncate">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 7. FAQ DO PRESTADOR */}
          <section className="space-y-4">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dúvidas dos Prestadores</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Perguntas Frequentes sobre Trabalhar no Trevia
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Tudo o que você precisa saber sobre moedas, propostas e saques
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3">
              {PROVIDER_FAQ_ITEMS.map((item, idx) => {
                const isOpen = openProviderFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenProviderFaqIndex(isOpen ? null : idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between font-bold text-sm text-slate-900 hover:text-emerald-700 transition-colors"
                    >
                      <span>{item.question}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* 8. CTA FINAL DO PRESTADOR */}
          <section className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-xl border border-emerald-900/50">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
              Pronto para lotar sua agenda de clientes em Joinville?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Cadastre-se gratuitamente, ative o radar no seu celular e comece a receber pedidos de moradores do seu bairro hoje mesmo.
            </p>

            <div className="pt-2 flex flex-wrap justify-center items-center gap-3">
              <button
                onClick={() => navigate('/painel-profissional')}
                className="px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center space-x-2"
              >
                <Briefcase className="w-4 h-4" />
                <span>Acessar Meu Painel do Prestador</span>
              </button>

              <button
                onClick={() => navigate('/oportunidades')}
                className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/20 transition-all flex items-center space-x-2"
              >
                <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
                <span>Ver Todas as Oportunidades</span>
              </button>
            </div>
          </section>
        </div>
      ) : (
        /* ========================================================================= */
        /* FLUXO DO CONTRATANTE / CLIENTE (QUERO CONTRATAR)                          */
        /* ========================================================================= */
        <div className="space-y-10 sm:space-y-12">
          {/* SEARCH BAR (Instant Access) */}
          <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por serviço ou profissional em Joinville (ex: ar condicionado, eletricista, limpeza, pintor)..."
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

      {/* 1. HERO SECTION (CRO + VALUE PROPOSITION CLARA PARA JOINVILLE E REGIÃO) */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-xl p-6 sm:p-8 lg:p-12">
        {/* Decorative blur glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Left Column: Value Prop, Headline, Bullet points & Quick CTAs */}
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-emerald-200 border border-white/20">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Joinville, Araquari, Jaraguá do Sul e Região</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Serviços Locais Confiáveis em <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-200 to-white">
                Joinville e Região
              </span>
            </h1>

            <p className="text-sm sm:text-base text-emerald-100 max-w-xl leading-relaxed">
              Encontre eletricistas, instaladores de ar condicionado, diaristas, pintores e encanadores avaliados. Peça orçamentos sem compromisso e negocie direto no WhatsApp.
            </p>

            {/* Trust bullet points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-emerald-100 font-medium pt-1">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>Profissionais locais e avaliados</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>100% Gratuito para clientes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>Contato rápido pelo WhatsApp</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
                <span>Sem intermediários ou comissões</span>
              </div>
            </div>

            {/* Strategic CTAs */}
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <a
                href="#form-rapido"
                className="px-6 py-3 rounded-full bg-white text-emerald-950 font-black text-xs sm:text-sm shadow-lg hover:bg-emerald-50 active:scale-95 transition-all flex items-center space-x-2"
              >
                <span>Solicitar Orçamento Grátis</span>
                <ArrowRight className="w-4 h-4 text-emerald-700" />
              </a>

              <a
                href="https://wa.me/5547988501714?text=Ol%C3%A1!%20Gostaria%20de%20um%20or%C3%A7amento%20para%20servi%C3%A7os%20em%20Joinville%20atrav%C3%A9s%20do%20Trevia."
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center space-x-2"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Chamar no WhatsApp</span>
              </a>

              <button
                onClick={() => setMode('provider')}
                className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition-all flex items-center space-x-1.5"
              >
                <Briefcase className="w-3.5 h-3.5 text-emerald-300" />
                <span>Sou Prestador / Quero Trabalhar</span>
              </button>
            </div>
          </div>

          {/* Right Column: Hero Visual Feature / Social Proof Box */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900/60 backdrop-blur-md">
              <img
                src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=700&q=80"
                alt="Profissional técnico de ar condicionado em Joinville SC atendendo cliente"
                draggable="false"
                className="w-full h-52 sm:h-64 object-cover select-none pointer-events-none"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-4 sm:p-5">
                <div className="flex items-center space-x-2 mb-1.5">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-black text-white">4.9 / 5.0</span>
                  <span className="text-[10px] text-emerald-300 font-semibold">• +1.450 Atendimentos</span>
                </div>
                <p className="text-xs text-white/95 font-medium leading-snug">
                  "Conectamos clientes com profissionais pontuais e de confiança nos bairros de Joinville."
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-emerald-200 pt-2 border-t border-white/10">
                  <span>📍 Joinville e Região Metropolitana</span>
                  <span className="font-bold text-white">Trevia.work</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. FORMULÁRIO RÁPIDO E SIMPLES (CRO / ÍMÃ DE CONVERSÃO EXPRESS) */}
      <section id="form-rapido" className="scroll-mt-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 border border-emerald-100 shadow-md">
          <div className="max-w-3xl mx-auto text-center space-y-2 mb-6">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Orçamento Grátis em 1 Minuto</span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              Qual serviço você precisa em Joinville?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Preencha o formulário rápido abaixo e receba atendimento imediato de profissionais locais pelo WhatsApp.
            </p>
          </div>

          {formSubmitted ? (
            <div className="max-w-xl mx-auto p-6 sm:p-8 bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-3xl border border-emerald-200 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900">
                  Solicitação Recebida com Sucesso!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Seus dados foram registrados com segurança. Preparamos sua mensagem direta para atendimento via WhatsApp:
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-emerald-100 text-xs text-emerald-950 font-medium text-left space-y-1">
                <div><strong>Serviço:</strong> {leadForm.service}</div>
                <div><strong>Local:</strong> {leadForm.neighborhood}, Joinville</div>
                <div><strong>Contato:</strong> {leadForm.name} ({leadForm.whatsapp})</div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={savedLeadWaUrl || 'https://wa.me/5547988501714'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>Abrir Conversa no WhatsApp Agora</span>
                </a>

                <button
                  type="button"
                  onClick={() => setFormSubmitted(false)}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold transition-colors"
                >
                  Novo Orçamento
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Se a janela do WhatsApp não abriu automaticamente no seu celular, toque no botão verde acima.
              </p>
            </div>
          ) : (
            <form onSubmit={handleExpressLeadSubmit} className="max-w-2xl mx-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Campo Nome */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Seu Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={leadForm.name}
                    onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                    placeholder="Ex: Carlos Silva"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-slate-800"
                  />
                </div>

                {/* Campo Telefone / WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Seu WhatsApp com DDD *
                  </label>
                  <input
                    type="tel"
                    required
                    value={leadForm.whatsapp}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(47) 99999-9999"
                    maxLength={15}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-slate-800"
                  />
                </div>

                {/* Campo Serviço Desejado */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Serviço Desejado *
                  </label>
                  <select
                    value={leadForm.service}
                    onChange={(e) => setLeadForm({ ...leadForm, service: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-slate-800 bg-white"
                  >
                    {LOCAL_SERVICES_LIST.map((srv) => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                    <option value="Outro Serviço">Outro Serviço em Geral</option>
                  </select>
                </div>

                {/* Campo Bairro / Cidade */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Bairro ou Cidade em SC *
                  </label>
                  <select
                    value={leadForm.neighborhood}
                    onChange={(e) => setLeadForm({ ...leadForm, neighborhood: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-slate-800 bg-white"
                  >
                    {JOINVILLE_NEIGHBORHOODS.map((nh) => (
                      <option key={nh} value={nh}>{nh}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Observações / Descrição Breve */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Descrição do que precisa (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={leadForm.details}
                  onChange={(e) => setLeadForm({ ...leadForm, details: e.target.value })}
                  placeholder="Ex: Troca de fiação, instalação de ar split 12.000 BTUs ou faxina para apartamento no sábado..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none text-slate-800 resize-none"
                ></textarea>
              </div>

              {/* Botão de Envio Principal (CRO WhatsApp Link Formatado) */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={savingLead}
                  className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] active:scale-95 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>{savingLead ? 'Registrando Solicitação...' : 'Solicitar Orçamento Grátis no WhatsApp'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublishClick}
                  className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all flex items-center justify-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-400" />
                  <span>Publicar Pedido no Mural</span>
                </button>
              </div>

              {/* Aviso de Confiança e LGPD */}
              <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>100% Gratuito • Sem ligações chatas • Resposta rápida de profissionais locais</span>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 3. PROVA SOCIAL & MÉTRICAS DE CONFIANÇA */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">+1.450</div>
            <div className="text-xs font-bold text-slate-200">Serviços Solicitados</div>
            <div className="text-[11px] text-slate-400">Em Joinville e Região</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">4.9 / 5.0</div>
            <div className="text-xs font-bold text-slate-200">Avaliação Média</div>
            <div className="text-[11px] text-slate-400">Satisfação dos Clientes</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">&lt; 25 min</div>
            <div className="text-xs font-bold text-slate-200">Tempo de Resposta</div>
            <div className="text-[11px] text-slate-400">Contato ágil no WhatsApp</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">100% Grátis</div>
            <div className="text-xs font-bold text-slate-200">Para Clientes</div>
            <div className="text-[11px] text-slate-400">Sem taxas escondidas</div>
          </div>
        </div>
      </section>

      {/* 4. POPULAR SERVICES (Grid com ícones e categorias em Joinville) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Serviços Populares em Joinville
            </h2>
            <p className="text-xs text-slate-500">
              Profissionais autônomos prontos para atender na sua região
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

        {/* 4-column (mobile) / 8-column (desktop) box grid */}
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

      {/* 5. PRICE SIMULATOR (ÍMÃ DE CONVERSÃO LOCAL) */}
      <section>
        <PriceSimulator navigate={navigate} />
      </section>

      {/* 6. RECOMMENDED FOR YOU / REAL ORDERS (Cards de Pedidos com Distância e Urgência) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Oportunidades e Pedidos Recentes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Serviços solicitados por moradores de Joinville e cidades vizinhas
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
                      alt={`Serviço de ${order.title} em Joinville SC`}
                      draggable="false"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none pointer-events-none"
                      loading="lazy"
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

      {/* 7. DEPOIMENTOS DE CLIENTES LOCAIS (PROVA SOCIAL COM BAIRROS DE JOINVILLE) */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
            <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>O que dizem os clientes de Joinville</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Depoimentos de quem já usou o Trevia
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Mais de 1.450 clientes atendidos com rapidez, segurança e preço justo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {LOCAL_TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Stars and date */}
                <div className="flex items-center justify-between">
                  <div className="flex text-amber-400">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{t.date}</span>
                </div>

                {/* Testimonial text */}
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "{t.text}"
                </p>
              </div>

              {/* Author info */}
              <div className="pt-3 border-t border-slate-100 flex items-center space-x-3">
                <img
                  src={t.avatar}
                  alt={`Foto de ${t.name}, cliente em ${t.neighborhood}`}
                  draggable="false"
                  className="w-10 h-10 rounded-full object-cover border border-emerald-100 flex-shrink-0 select-none pointer-events-none"
                  loading="lazy"
                />
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{t.name}</h4>
                  <p className="text-[10px] text-emerald-700 font-semibold truncate">{t.neighborhood}</p>
                  <p className="text-[10px] text-slate-400 truncate">{t.service}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. BAIRROS E CIDADES ATENDIDAS (SEO LOCAL AUTHORITY HUB) */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-6">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Cobertura Regional Santa Catarina</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Profissionais disponíveis em Joinville e Cidades Vizinhas
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
            A Trevia conecta você aos prestadores mais próximos da sua residência ou empresa. Atendemos todas as regiões da maior cidade de Santa Catarina:
          </p>
        </div>

        {/* Neighborhood Tags */}
        <div className="flex flex-wrap gap-2 pt-1">
          {JOINVILLE_NEIGHBORHOODS.map((nh) => (
            <button
              key={nh}
              onClick={() => {
                setSelectedNeighborhood(nh);
                setSearchQuery(nh);
                navigate(`/pedidos?q=${encodeURIComponent(nh)}`);
              }}
              className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-colors"
            >
              📍 {nh}
            </button>
          ))}
        </div>

        {/* SEO Textual Content Snippet */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 text-xs text-slate-600 leading-relaxed space-y-2">
          <p>
            <strong>Serviços em Joinville:</strong> Seja para conserto de vazamentos com encanadores no Bairro Glória, manutenção e carga de gás de ar-condicionado no Centro e América, pintura residencial no Costa e Silva ou diaristas no Anita Garibaldi e Pirabeiraba, o Trevia reúne profissionais qualificados da região norte catarinense.
          </p>
          <p>
            Também atendemos demandas industriais e comerciais em Araquari, Jaraguá do Sul, Guaramirim, Garuva e São Francisco do Sul. Peça um orçamento sem compromisso e negocie com facilidade.
          </p>
        </div>
      </section>

      {/* 9. FAQ ACCORDION (PERGUNTAS FREQUENTES & SEO SNIPPETS) */}
      <section className="space-y-4">
        <div className="text-center max-w-2xl mx-auto space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Perguntas Frequentes sobre o Trevia
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Tudo o que você precisa saber antes de contratar ou se cadastrar
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between font-bold text-sm text-slate-900 hover:text-emerald-700 transition-colors"
                >
                  <span>{item.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-600 flex-shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 10. FINAL CALL TO ACTION BANNER (FECHAMENTO DE ALTA CONVERSÃO) */}
      <section className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-6 sm:p-10 text-center space-y-4 shadow-xl">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">
          Precisa de um profissional em Joinville hoje mesmo?
        </h2>
        <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto leading-relaxed">
          Receba orçamentos de profissionais avaliados e disponíveis agora no seu bairro. Grátis, simples e sem compromisso.
        </p>

        <div className="pt-2 flex flex-wrap justify-center items-center gap-3">
          <a
            href="#form-rapido"
            className="px-6 py-3 rounded-full bg-white text-emerald-950 font-black text-xs sm:text-sm shadow-lg hover:bg-emerald-50 active:scale-95 transition-all flex items-center space-x-2"
          >
            <span>Pedir Orçamento Grátis</span>
            <ArrowRight className="w-4 h-4 text-emerald-700" />
          </a>

          <a
            href="https://wa.me/5547988501714?text=Ol%C3%A1!%20Gostaria%20de%20um%20or%C3%A7amento%20para%20servi%C3%A7os%20em%20Joinville."
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs sm:text-sm shadow-lg active:scale-95 transition-all flex items-center space-x-2"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            <span>Falar no WhatsApp: (47) 98850-1714</span>
          </a>
        </div>
      </section>
        </div>
      )}

    </div>
  );
}
