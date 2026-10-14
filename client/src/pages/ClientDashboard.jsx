import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  Briefcase,
  PlusCircle,
  Clock,
  MapPin,
  Calendar,
  MessageCircle,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Camera,
  Star,
  ThumbsUp,
  Sparkles
} from 'lucide-react';

const JOINVILLE_NEIGHBORHOODS = [
  'América', 'Anita Garibaldi', 'Atiradores', 'Aventureiro', 'Boa Vista', 'Boehmerwald',
  'Bom Retiro', 'Bucarein', 'Centro', 'Comasa', 'Costa e Silva', 'Distrito Industrial',
  'Espinheiros', 'Fátima', 'Floresta', 'Glória', 'Guanabara', 'Iririú', 'Itaum',
  'Itinga', 'Jardim Iririú', 'Jardim Paraíso', 'Jardim Sofia', 'Morro do Meio',
  'Nova Brasília', 'Paranaguamirim', 'Petrópolis', 'Pirabeiraba', 'Profipo',
  'Rio Bonito', 'Saguaçu', 'Santa Catarina', 'Santo Antônio', 'São Marcos',
  'Ulysses Guimarães', 'Vila Cubatão', 'Vila Nova', 'Zona Industrial Norte'
];

export default function ClientDashboard({ navigate }) {
  const { user, refreshMe, openAuthModal } = useAuth();
  const [tab, setTab] = useState('orders'); // 'orders', 'profile', or 'reviews'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewsData, setReviewsData] = useState({ average_rating: 0, total_reviews: 0, reviews: [] });

  // Profile edit state
  const [name, setName] = useState(user ? user.name : '');
  const [phone, setPhone] = useState(user ? user.phone : '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [baseNeighborhood, setBaseNeighborhood] = useState(user?.base_neighborhood || 'Centro');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  const loadMyOrders = () => {
    setLoading(true);
    api.orders.myOrders()
      .then(res => setOrders(res.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadMyReviews = () => {
    if (user?.id) {
      api.reviews.getByUser(user.id)
        .then(res => setReviewsData(res))
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (!user) {
      openAuthModal('login', () => {
        loadMyOrders();
        loadMyReviews();
      });
    } else {
      loadMyOrders();
      loadMyReviews();
      setName(user.name);
      setPhone(user.phone || '');
      setAvatarUrl(user.avatar_url || '');
      setBaseNeighborhood(user.base_neighborhood || 'Centro');
    }
  }, [user]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 250;
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

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.orders.updateStatus(orderId, newStatus);
      loadMyOrders();
    } catch (err) {
      alert(err.message || 'Erro ao alterar situação.');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess('');
    try {
      await api.auth.updateMe({
        name,
        phone,
        avatar_url: avatarUrl,
        base_neighborhood: baseNeighborhood
      });
      await refreshMe();
      setProfileSuccess('Dados atualizados com sucesso!');
    } catch (err) {
      alert(err.message || 'Erro ao atualizar dados.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <User className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="font-bold text-slate-800">Acesso Restrito</h3>
        <p className="text-xs text-slate-500">Faça login para consultar seus pedidos publicados e dados pessoais.</p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl"
        >
          Entrar no Trevia
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Minha Conta
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie seus pedidos de serviço, visualize propostas recebidas e atualize seus dados
          </p>
        </div>

        <button
          onClick={() => navigate('/pedidos/novo')}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Novo Pedido de Serviço</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm">
        <button
          onClick={() => setTab('orders')}
          className={`pb-3 font-bold transition-all relative ${
            tab === 'orders'
              ? 'text-teal-700 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Meus Pedidos Publicados ({orders.length})
        </button>
        <button
          onClick={() => setTab('profile')}
          className={`pb-3 font-bold transition-all relative ${
            tab === 'profile'
              ? 'text-teal-700 border-b-2 border-teal-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Dados Cadastrais
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
          <span>Minhas Avaliações ({reviewsData.total_reviews})</span>
        </button>
      </div>

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Carregando seus pedidos...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-800">Você ainda não publicou pedidos</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Precisa de reformas, reparos, pintura ou outros serviços em Joinville? Publique agora e receba orçamentos.
              </p>
              <button
                onClick={() => navigate('/pedidos/novo')}
                className="mt-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl"
              >
                Publicar Primeiro Pedido
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        {order.category_name}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        order.status === 'aberto'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : order.status === 'em_negociacao'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : order.status === 'concluido'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {order.status === 'aberto' ? '● Aberto' : order.status === 'em_negociacao' ? 'Em Negociação' : order.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                      </span>
                    </div>

                    <h3
                      onClick={() => navigate(`/pedidos/${order.id}`)}
                      className="font-bold text-base text-slate-900 hover:text-teal-700 transition-colors cursor-pointer"
                    >
                      {order.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1" />
                        {order.city}{order.neighborhood ? ` (${order.neighborhood})` : ''}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="flex items-center font-bold text-teal-700">
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />
                        {order.proposals_count || 0} propostas recebidas
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <button
                      onClick={() => navigate(`/pedidos/${order.id}`)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1"
                    >
                      <span>Ver Propostas</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {order.status !== 'concluido' && order.status !== 'cancelado' && (
                      <button
                        onClick={() => handleStatusChange(order.id, 'concluido')}
                        className="px-3 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 font-medium text-xs rounded-xl transition-colors"
                      >
                        Concluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 max-w-xl space-y-4">
          <h2 className="font-bold text-base text-slate-900 pb-2 border-b border-slate-100">
            Meus Dados Pessoais
          </h2>

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Foto de Perfil */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Foto de Perfil</label>
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <label className="cursor-pointer px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors inline-flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Alterar Foto</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="ml-2 text-xs text-rose-600 hover:underline font-semibold"
                    >
                      Remover
                    </button>
                  )}
                  <span className="text-[11px] text-slate-400 block">Sua foto ajuda os profissionais a reconhecerem você com facilidade.</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Seu Bairro Principal em Joinville</label>
              <select
                value={baseNeighborhood}
                onChange={(e) => setBaseNeighborhood(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
              >
                {JOINVILLE_NEIGHBORHOODS.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail (Login)</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full p-2.5 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">O e-mail é a chave de login e não pode ser alterado diretamente.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Telefone de Contato</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(47) 99999-9999"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {savingProfile ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      )}

      {/* Reviews Tab */}
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
                <h3 className="text-base font-extrabold text-slate-900">Sua Reputação como Contratante</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Baseado em <strong>{reviewsData.total_reviews} avaliações</strong> deixadas por profissionais que prestaram serviços para você.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-w-xs">
              <span className="font-bold text-slate-700 block mb-0.5">Por que isso importa?</span>
              Bons contratantes recebem propostas mais rápidas e com condições especiais dos melhores profissionais de Joinville.
            </div>
          </div>

          {reviewsData.reviews.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center space-y-3">
              <Star className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="font-bold text-base text-slate-800">Nenhuma avaliação recebida ainda</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Assim que um profissional aceito ou contratado concluir um serviço com você, a avaliação dele aparecerá aqui.
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
                            <img src={rev.reviewer_avatar} alt={rev.reviewer_name} className="w-full h-full object-cover" />
                          ) : (
                            rev.reviewer_name?.slice(0, 2) || 'PR'
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
    </div>
  );
}
