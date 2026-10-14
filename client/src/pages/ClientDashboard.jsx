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
  ArrowRight
} from 'lucide-react';

export default function ClientDashboard({ navigate }) {
  const { user, refreshMe, openAuthModal } = useAuth();
  const [tab, setTab] = useState('orders'); // 'orders' or 'profile'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [name, setName] = useState(user ? user.name : '');
  const [phone, setPhone] = useState(user ? user.phone : '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  const loadMyOrders = () => {
    setLoading(true);
    api.orders.myOrders()
      .then(res => setOrders(res.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) {
      openAuthModal('login', () => loadMyOrders());
    } else {
      loadMyOrders();
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

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
      await api.auth.updateMe({ name, phone });
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
    </div>
  );
}
