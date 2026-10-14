import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useLocation } from '../LocationContext.jsx';
import {
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Briefcase,
  User,
  Phone,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Send,
  Flag,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function OrderDetail({ orderId, navigate }) {
  const { user, openAuthModal } = useAuth();
  const { getDistanceTo } = useLocation();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Proposal modal/form state
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [proposalMessage, setProposalMessage] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [proposalSuccessMessage, setProposalSuccessMessage] = useState('');

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Status updating state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadOrder = () => {
    setLoading(true);
    api.orders.get(orderId)
      .then(res => setOrder(res.order))
      .catch(err => setError(err.message || 'Erro ao carregar pedido.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrder();
  }, [orderId, user]);

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Deseja alterar a situação deste pedido para "${newStatus}"?`)) return;
    setUpdatingStatus(true);
    try {
      await api.orders.updateStatus(order.id, newStatus);
      loadOrder();
    } catch (err) {
      alert(err.message || 'Erro ao atualizar situação.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleProposalSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    setSubmittingProposal(true);
    try {
      await api.proposals.create(order.id, {
        message: proposalMessage,
        proposed_value: proposedValue ? parseFloat(proposedValue) : null,
        estimated_time: estimatedTime
      });
      setProposalSuccessMessage('Proposta enviada com sucesso! O cliente receberá sua notificação.');
      setProposalModalOpen(false);
      loadOrder();
    } catch (err) {
      alert(err.message || 'Erro ao enviar proposta.');
    } finally {
      setSubmittingProposal(false);
    }
  };

  const handleProposalStatus = async (proposalId, status) => {
    try {
      await api.proposals.updateStatus(proposalId, status);
      loadOrder();
    } catch (err) {
      alert(err.message || 'Erro ao alterar proposta.');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }

    setSubmittingReport(true);
    try {
      await api.reports.create({
        target_type: 'order',
        target_id: order.id,
        reason: reportReason,
        details: reportDetails
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportModalOpen(false);
        setReportSuccess(false);
      }, 2000);
    } catch (err) {
      alert(err.message || 'Erro ao enviar denúncia.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-slate-400">
        Carregando detalhes do pedido...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="font-bold text-slate-800">Pedido não encontrado</h3>
        <p className="text-xs text-slate-500">{error || 'O pedido pode ter sido removido ou o link está incorreto.'}</p>
        <button
          onClick={() => navigate('/pedidos')}
          className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl"
        >
          Voltar para lista de pedidos
        </button>
      </div>
    );
  }

  const isClosed = order.status === 'concluido' || order.status === 'cancelado';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Back & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/pedidos')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Pedidos</span>
        </button>

        <button
          onClick={() => setReportModalOpen(true)}
          className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-rose-600 transition-colors"
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Denunciar pedido</span>
        </button>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Badges & Status */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-3 py-1 rounded-full">
              {order.category_name}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              order.status === 'aberto'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : order.status === 'em_negociacao'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {order.status === 'aberto' ? '● Aberto para propostas' : order.status === 'em_negociacao' ? 'Em Negociação' : order.status === 'concluido' ? 'Concluído' : 'Cancelado'}
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full"
              title="Seus dados de contato e propostas não ficam expostos publicamente na internet"
            >
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>🔒 Propostas Privadas</span>
            </span>
          </div>

          <div className="text-xs text-slate-400 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            <span>Publicado em {new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
          {order.title}
        </h1>

        {/* Key Info Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Localização & Distância</span>
            {(() => {
              const dist = getDistanceTo(order.city, order.neighborhood);
              return (
                <span className="font-bold text-slate-800 flex items-center mt-0.5" title={dist ? dist.formattedText : ''}>
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {dist && dist.formattedText ? `${dist.formattedText} • ` : ''}
                    {order.neighborhood ? `${order.neighborhood}, ` : ''}{order.city}
                  </span>
                </span>
              );
            })()}
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Prazo Desejado</span>
            <span className="font-bold text-slate-800 flex items-center mt-0.5 capitalize">
              <Clock className="w-3.5 h-3.5 text-teal-600 mr-1 flex-shrink-0" />
              <span>{order.timeframe ? order.timeframe.replace('_', ' ') : 'A combinar'}</span>
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Orçamento Estimado</span>
            <span className="font-bold text-slate-800 flex items-center mt-0.5">
              {order.estimated_budget ? (
                <span className="text-teal-800 font-extrabold">
                  R$ {Number(order.estimated_budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-slate-500">A combinar</span>
              )}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Manifestações</span>
            <span className="font-bold text-slate-800 flex items-center mt-0.5">
              <MessageCircle className="w-3.5 h-3.5 text-teal-600 mr-1 flex-shrink-0" />
              <span>{order.proposals_count || 0} propostas</span>
            </span>
          </div>
        </div>

        {/* Detailed Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Descrição do Serviço
          </h3>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap bg-white">
            {order.description}
          </p>
        </div>

        {/* OWNER CONTROLS (If current user published this order) */}
        {order.is_owner && (
          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                Gerenciar Situação do seu Pedido
              </span>
              <span className="text-xs text-teal-700">Apenas você pode alterar</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                disabled={updatingStatus || order.status === 'aberto'}
                onClick={() => handleStatusChange('aberto')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  order.status === 'aberto'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Aberto (Receber Propostas)
              </button>

              <button
                disabled={updatingStatus || order.status === 'em_negociacao'}
                onClick={() => handleStatusChange('em_negociacao')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  order.status === 'em_negociacao'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Em Negociação
              </button>

              <button
                disabled={updatingStatus || order.status === 'concluido'}
                onClick={() => handleStatusChange('concluido')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  order.status === 'concluido'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Concluir Pedido
              </button>

              <button
                disabled={updatingStatus || order.status === 'cancelado'}
                onClick={() => handleStatusChange('cancelado')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  order.status === 'cancelado'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                Cancelar Pedido
              </button>
            </div>
          </div>
        )}

        {/* PROVIDER ACTIONS (If viewer is not owner) */}
        {!order.is_owner && (
          <div className="pt-4 border-t border-slate-100">
            {isClosed ? (
              <div className="p-4 bg-slate-100 rounded-2xl text-xs text-slate-600 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Este pedido está com a situação "{order.status}" e não aceita mais novas propostas.</span>
              </div>
            ) : order.has_submitted_proposal ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Você já enviou uma proposta para este pedido</span>
                </div>
                {order.my_proposal && (
                  <div className="text-xs text-emerald-900 bg-white/80 p-3 rounded-xl border border-emerald-100 space-y-1">
                    <p className="font-medium italic">"{order.my_proposal.message}"</p>
                    <div className="flex items-center space-x-4 pt-1 text-[11px] text-emerald-700">
                      {order.my_proposal.proposed_value && (
                        <span>Valor proposto: R$ {order.my_proposal.proposed_value.toFixed(2)}</span>
                      )}
                      {order.my_proposal.estimated_time && (
                        <span>Prazo: {order.my_proposal.estimated_time}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 bg-gradient-to-br from-teal-50 via-emerald-50/40 to-white rounded-3xl border border-teal-200/90 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-full">
                        <Lock className="w-3 h-3 text-teal-700" />
                        Proposta Direta & Fechada
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-slate-900">
                      Você pode atender este pedido?
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                      Envie seu orçamento e prazo com total sigilo comercial. Nenhum outro profissional concorrente terá acesso aos seus valores.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (!user) openAuthModal('login', () => setProposalModalOpen(true));
                      else setProposalModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm transition-all whitespace-nowrap flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Enviar Proposta Sigilosa</span>
                  </button>
                </div>

                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200/60 text-xs text-emerald-900 flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Privacidade Assegurada:</strong> O cliente receberá sua proposta em sigilo e liberará o contato caso aprove o orçamento.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PROPOSALS LIST (Visible to Order Owner) */}
      {order.is_owner && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Propostas e Contatos Recebidos ({order.proposals ? order.proposals.length : 0})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare as manifestações dos profissionais e entre em contato pelo canal autorizado
              </p>
            </div>
          </div>

          {!order.proposals || order.proposals.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
              <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-800">Ainda nenhuma proposta recebida</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Profissionais de Joinville e região estão visualizando seu pedido. Assim que enviarem uma manifestação, você poderá vê-la aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {order.proposals.map((prop) => (
                <div
                  key={prop.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                        {prop.provider_name ? prop.provider_name.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-sm text-slate-900">{prop.provider_name}</h4>
                          {prop.provider_slug && (
                            <button
                              onClick={() => navigate(`/profissionais/${prop.provider_slug}`)}
                              className="text-[11px] text-teal-700 hover:underline font-semibold"
                            >
                              Ver Perfil Público
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Enviado em {new Date(prop.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        prop.status === 'aceita'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : prop.status === 'recusada'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {prop.status === 'aceita' ? 'Proposta Aceita' : prop.status === 'recusada' ? 'Recusada' : 'Aguardando decisão'}
                      </span>
                    </div>
                  </div>

                  {/* Proposal text */}
                  <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    "{prop.message}"
                  </div>

                  {/* Financial & Time details */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                    <div className="flex items-center space-x-4">
                      {prop.proposed_value && (
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Valor Proposto</span>
                          <span className="font-extrabold text-teal-800 text-sm">
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

                    {/* Direct Contact Button */}
                    <div className="flex items-center space-x-2">
                      {prop.provider_whatsapp || prop.provider_phone ? (
                        <a
                          href={`https://wa.me/55${(prop.provider_whatsapp || prop.provider_phone).replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-xs transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp ({prop.provider_whatsapp || prop.provider_phone})</span>
                        </a>
                      ) : null}

                      {prop.status === 'pendente' && (
                        <>
                          <button
                            onClick={() => handleProposalStatus(prop.id, 'aceita')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            title="Aceitar Proposta"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleProposalStatus(prop.id, 'recusada')}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Recusar Proposta"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROPOSAL SUBMISSION MODAL */}
      {proposalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Enviar Proposta Direta & Fechada</h3>
                  <span className="text-[11px] text-teal-700 font-medium">Canal seguro e confidencial</span>
                </div>
              </div>
              <button
                onClick={() => setProposalModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕ Fechar
              </button>
            </div>

            {/* Explicit Confidential Notice Required by Specification */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 flex items-start space-x-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>O cliente receberá sua proposta em sigilo e liberará o contato caso aprove o orçamento.</strong> Seus valores, prazos e mensagem não ficam expostos em praça pública nem para outros prestadores.
              </p>
            </div>

            <form onSubmit={handleProposalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor da Proposta (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={proposedValue}
                      onChange={(e) => setProposedValue(e.target.value)}
                      placeholder="150.00"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Valor estimado ou mão de obra.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prazo Estimado *
                  </label>
                  <input
                    type="text"
                    required
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="Ex: 2 horas, 1 a 2 dias"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Tempo previsto para executar.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mensagem Técnica / Observação *
                </label>
                <textarea
                  required
                  rows={4}
                  value={proposalMessage}
                  onChange={(e) => setProposalMessage(e.target.value)}
                  placeholder="Olá! Sou especialista neste tipo de serviço. Possuo ferramentas próprias e disponibilidade para esta semana. O valor estimado inclui a execução técnica..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600 leading-relaxed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Explique como você realizará o serviço, se inclui material ou ferramentas.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProposalModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingProposal}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center space-x-1.5 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingProposal ? 'Enviando Proposta...' : 'Enviar Proposta Sigilosa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-base text-slate-900">Denunciar Pedido Suspeito</h3>
            <p className="text-xs text-slate-500">
              A moderação do Trevia revisa denúncias para manter a plataforma segura e confiável.
            </p>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-semibold text-center">
                Denúncia enviada com sucesso. Obrigado por colaborar!
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo da Denúncia *
                  </label>
                  <select
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="">Selecione um motivo...</option>
                    <option value="Conteúdo falso ou spam">Conteúdo falso ou spam</option>
                    <option value="Linguagem ofensiva ou assédio">Linguagem ofensiva ou inadequada</option>
                    <option value="Tentativa de golpe ou fraude">Tentativa de golpe ou fraude</option>
                    <option value="Outro motivo">Outro motivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Detalhes Adicionais
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Descreva o que ocorreu..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                  >
                    {submittingReport ? 'Enviando...' : 'Enviar Denúncia'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
