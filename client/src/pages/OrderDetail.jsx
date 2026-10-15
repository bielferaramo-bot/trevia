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
  Lock,
  Star,
  ThumbsUp,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Wallet
} from 'lucide-react';
import RechargeModal from '../components/RechargeModal.jsx';
import ReviewModal from '../components/ReviewModal.jsx';

export default function OrderDetail({ orderId, navigate }) {
  const { user, refreshMe, openAuthModal } = useAuth();
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

  // Contact unlocking & recharge modal
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [unlockingContact, setUnlockingContact] = useState(false);

  // Review & Rating state
  const [orderReviews, setOrderReviews] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState({ id: '', name: '', type: 'provider' });

  // Report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Refund / Trevia Guarantee state
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('Cliente não responde no WhatsApp');
  const [refundDetails, setRefundDetails] = useState('');
  const [requestingRefund, setRequestingRefund] = useState(false);
  const [refundSuccessMessage, setRefundSuccessMessage] = useState('');

  // Escrow / Sinal Seguro PIX state
  const [escrowState, setEscrowState] = useState({ deposit: null, permissions: {} });
  const [escrowModalOpen, setEscrowModalOpen] = useState(false);
  const [escrowAmount, setEscrowAmount] = useState('50');
  const [escrowDesc, setEscrowDesc] = useState('Sinal de garantia para início dos serviços e compra de materiais');
  const [creatingEscrow, setCreatingEscrow] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('Prestador não compareceu no dia combinado');
  const [pixCopied, setPixCopied] = useState(false);
  const [processingEscrow, setProcessingEscrow] = useState(false);

  // Status updating state
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadOrder = () => {
    setLoading(true);
    Promise.all([
      api.orders.get(orderId),
      api.reviews.getByOrder(orderId).catch(() => ({ reviews: [] })),
      api.escrow.getByOrder(orderId).catch(() => ({ deposit: null, permissions: {} }))
    ])
      .then(([ordRes, revRes, escRes]) => {
        setOrder(ordRes.order);
        setOrderReviews(revRes.reviews || []);
        if (escRes) setEscrowState(escRes);
      })
      .catch(err => setError(err.message || 'Erro ao carregar pedido.'))
      .finally(() => setLoading(false));
  };

  const handleCreateEscrow = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login', () => handleCreateEscrow(e));
      return;
    }
    const val = Number(escrowAmount);
    if (!val || val < 5) {
      alert('O valor do sinal seguro deve ser de no mínimo R$ 5,00.');
      return;
    }
    setCreatingEscrow(true);
    try {
      await api.escrow.create(orderId, {
        amount: val,
        description: escrowDesc
      });
      setEscrowModalOpen(false);
      loadOrder();
      alert('🛡️ Sinal Seguro PIX gerado com sucesso! Efetue o pagamento para ativar a custódia garantida.');
    } catch (err) {
      alert(err.message || 'Erro ao criar sinal seguro.');
    } finally {
      setCreatingEscrow(false);
    }
  };

  const handleFundEscrow = async (depositId) => {
    setProcessingEscrow(true);
    try {
      await api.escrow.fund(depositId);
      loadOrder();
      alert('🛡️ Pagamento confirmado com sucesso! O valor agora está retido em custódia segura Trevia.');
    } catch (err) {
      alert(err.message || 'Erro ao confirmar custódia.');
    } finally {
      setProcessingEscrow(false);
    }
  };

  const handleFundWithWallet = async (depositId) => {
    if (!window.confirm(`Deseja debitar R$ ${Number(escrowState.deposit?.amount || 0).toFixed(2).replace('.', ',')} do seu saldo disponível em carteira para ativar a custódia segura deste pedido?`)) return;
    setProcessingEscrow(true);
    try {
      await api.escrow.fundWithWallet(depositId);
      if (refreshMe) await refreshMe();
      loadOrder();
      alert('🛡️ Sinal pago com sucesso usando o saldo da sua Carteira Digital! O valor agora está retido em custódia segura Trevia.');
    } catch (err) {
      alert(err.message || 'Erro ao pagar com a carteira.');
    } finally {
      setProcessingEscrow(false);
    }
  };

  const handleReleaseEscrow = async (depositId) => {
    if (!window.confirm('Confirma que o serviço foi concluído satisfatoriamente e deseja liberar o sinal ao profissional?')) return;
    setProcessingEscrow(true);
    try {
      await api.escrow.release(depositId);
      loadOrder();
      alert('✅ Sinal liberado com sucesso ao profissional! Obrigado por contratar com segurança no Trevia.');
    } catch (err) {
      alert(err.message || 'Erro ao liberar sinal.');
    } finally {
      setProcessingEscrow(false);
    }
  };

  const handleDisputeEscrow = async (e) => {
    e.preventDefault();
    if (!escrowState.deposit) return;
    setProcessingEscrow(true);
    try {
      await api.escrow.dispute(escrowState.deposit.id, { reason: disputeReason });
      setDisputeModalOpen(false);
      loadOrder();
      alert('⚠️ Mediação solicitada com sucesso. O valor continuará bloqueado em segurança até a resolução do suporte.');
    } catch (err) {
      alert(err.message || 'Erro ao solicitar mediação.');
    } finally {
      setProcessingEscrow(false);
    }
  };

  const handleCopyPix = (pixCode) => {
    if (!pixCode) return;
    navigator.clipboard.writeText(pixCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
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

  const handleUnlockContact = async () => {
    if (!user) {
      openAuthModal('login', () => handleUnlockContact());
      return;
    }
    if (isOwner) {
      alert('Você é o autor deste pedido. Seus dados de contato já pertencem a você.');
      return;
    }
    if (user.role === 'client') {
      alert('Apenas profissionais prestadores podem liberar contatos com créditos.');
      return;
    }
    setUnlockingContact(true);
    try {
      const res = await api.radar.unlockContact(order.id);
      setOrder(prev => ({
        ...prev,
        client_phone: res.client_phone,
        client_name: res.client_name,
        is_contact_unlocked: true
      }));
      await refreshMe();
    } catch (err) {
      if (err.message && (err.message.includes('crédito') || err.message.includes('insuficiente') || err.message.includes('402'))) {
        setRechargeModalOpen(true);
      } else {
        alert(err.message || 'Erro ao liberar contato.');
      }
    } finally {
      setUnlockingContact(false);
    }
  };

  const handleProposalSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (isOwner) {
      alert('Você não pode enviar uma proposta para o seu próprio pedido.');
      return;
    }
    if (user.role === 'client') {
      alert('Contas de contratante não podem enviar propostas comerciais. Cadastre-se como profissional.');
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

  const handleOpenReview = (targetId, targetName, targetType) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setReviewTarget({
      id: targetId,
      name: targetName,
      type: targetType
    });
    setReviewModalOpen(true);
  };

  const hasReviewedTarget = (targetId) => {
    return orderReviews.some(r => r.reviewer_id === user?.id && r.target_user_id === targetId);
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

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    setRequestingRefund(true);
    try {
      const res = await api.radar.requestRefund(order.id, {
        reason: refundReason,
        details: refundDetails
      });
      setRefundSuccessMessage(res.message || 'Crédito estornado com sucesso!');
      await refreshMe();
      setTimeout(() => {
        setRefundModalOpen(false);
        setRefundSuccessMessage('');
        loadOrder();
      }, 1800);
    } catch (err) {
      alert(err.message || 'Erro ao solicitar estorno de crédito.');
    } finally {
      setRequestingRefund(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!order) return;
    const orderUrl = `https://trevia.work/pedidos/${order.id}`;
    const budgetText = order.estimated_budget
      ? `💰 Orçamento estimado: *R$ ${Number(order.estimated_budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*\n`
      : '';
    const text = `🔔 *Novo Pedido de Serviço em Joinville!*\n\n📌 *${order.title}*\n🏷️ Categoria: *${order.category_name}*\n📍 Local: *${order.neighborhood ? `${order.neighborhood}, ` : ''}${order.city}*\n⏱️ Prazo: *${order.timeframe ? order.timeframe.replace('_', ' ') : 'A combinar'}*\n${budgetText}\n👉 *Veja os detalhes e envie sua proposta no Trevia:*\n${orderUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
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
  const isOwner = Boolean(
    order.is_owner === true ||
    (user && order.client_id && String(user.id) === String(order.client_id)) ||
    (user && order.client_phone && user.phone && String(user.phone).replace(/\D/g, '') === String(order.client_phone).replace(/\D/g, '')) ||
    (typeof window !== 'undefined' && sessionStorage.getItem(`order_owner_${order.id}`) === 'true')
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar: Back & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => navigate('/pedidos')}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar <span className="hidden sm:inline">para Pedidos</span></span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleShareWhatsApp}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all shadow-2xs active:scale-95"
            title="Compartilhar este pedido nos grupos de WhatsApp de Joinville"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Compartilhar <span className="hidden sm:inline">no WhatsApp</span></span>
          </button>

          <button
            onClick={() => setReportModalOpen(true)}
            className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-xl hover:bg-slate-50"
            title="Denunciar pedido suspeito"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Denunciar</span>
          </button>
        </div>
      </div>

      {/* Main Order Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8 space-y-6 max-w-full overflow-hidden">
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
        {isOwner && (
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

        {/* PROVIDER ACTIONS / NON-OWNER VIEW */}
        {!isOwner && (
          user?.role === 'client' ? (
            <div className="pt-4 border-t border-slate-100">
              <div className="p-6 bg-gradient-to-br from-slate-50 via-teal-50/20 to-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-full">
                    <Briefcase className="w-3 h-3 text-teal-700" />
                    Área de Profissionais Autônomos
                  </span>
                </div>
                <h4 className="font-bold text-base text-slate-900">
                  Você está conectado como Contratante
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  Este pedido foi publicado por outro usuário da comunidade Trevia. Somente profissionais e prestadores de serviços cadastrados podem enviar propostas comerciais ou liberar o WhatsApp para atendimento.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={() => navigate('/pedidos/novo')}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                  >
                    Publicar um Pedido para Você
                  </button>
                  <button
                    onClick={() => navigate('/pedidos')}
                    className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-colors"
                  >
                    Explorar Outros Pedidos
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
                    <div className="text-xs text-emerald-900 bg-white/80 p-3 rounded-xl border border-emerald-100 space-y-2">
                      <p className="font-medium italic">"{order.my_proposal.message}"</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-emerald-700">
                        <div className="flex items-center space-x-4">
                          {order.my_proposal.proposed_value && (
                            <span>Valor: R$ {order.my_proposal.proposed_value.toFixed(2)}</span>
                          )}
                          {order.my_proposal.estimated_time && (
                            <span>Prazo: {order.my_proposal.estimated_time}</span>
                          )}
                        </div>

                        {(order.my_proposal.status === 'aceita' || order.status === 'concluido' || order.is_contact_unlocked) && (
                          !hasReviewedTarget(order.client_id) ? (
                            <button
                              onClick={() => handleOpenReview(order.client_id, order.client_name, 'client')}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center space-x-1 shadow-xs transition-colors"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>Avaliar Contratante</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Você avaliou o cliente</span>
                            </span>
                          )
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

              {/* Box de Contato Direto do Cliente / Liberação por Crédito */}
              <div className="mt-4 p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        order.is_contact_unlocked
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : order.spots_exhausted
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-900 border border-amber-200'
                      }`}>
                        {order.is_contact_unlocked
                          ? '✓ Contato Direto Liberado'
                          : order.spots_exhausted
                          ? `🔒 Vagas Esgotadas (${order.unlocked_count}/${order.max_unlocks})`
                          : `🔥 Restam ${order.spots_left ?? 3} de ${order.max_unlocks ?? 3} vagas`}
                      </span>
                      <span className="text-xs text-slate-400">
                        Cliente: <strong>{order.client_name}</strong>
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Telefone e WhatsApp do Cliente
                    </h4>
                    <p className="text-xs text-slate-500">
                      {order.is_contact_unlocked
                        ? 'Você tem acesso liberado para ligar ou enviar mensagem no WhatsApp deste cliente.'
                        : 'Libere o WhatsApp e telefone para falar diretamente com o cliente agora.'}
                    </p>
                  </div>

                  {order.is_contact_unlocked ? (
                    <div className="flex flex-col sm:items-end gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`https://wa.me/55${(order.client_phone || '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center space-x-2 transition-transform transform active:scale-95"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Conversar no WhatsApp ({order.client_phone})</span>
                        </a>

                        {!hasReviewedTarget(order.client_id) ? (
                          <button
                            onClick={() => handleOpenReview(order.client_id, order.client_name, 'client')}
                            className="px-4 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-transform active:scale-95 shadow-2xs"
                          >
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span>Avaliar Contratante</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Você avaliou o cliente</span>
                          </span>
                        )}
                      </div>

                      {order.refund_request ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Garantia Trevia: Crédito estornado</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRefundModalOpen(true)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium flex items-center space-x-1 self-start sm:self-auto"
                          title="Se o cliente não responder ou o número for inválido, devolvemos seu crédito"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span>Cliente não atendeu? Solicitar estorno do crédito</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:items-end gap-1.5">
                      {order.spots_exhausted ? (
                        <div className="px-5 py-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-2xl text-xs font-bold flex items-center space-x-2">
                          <Lock className="w-4 h-4 text-slate-400" />
                          <span>Vagas Esgotadas (Limite de 3 prestadores atingido)</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleUnlockContact}
                          disabled={unlockingContact}
                          className="px-5 py-3 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-black text-xs rounded-2xl shadow-sm flex items-center justify-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
                        >
                          <Lock className="w-4 h-4" />
                          <span>{unlockingContact ? 'Liberando...' : 'Liberar WhatsApp do Cliente (1 Crédito)'}</span>
                        </button>
                      )}
                      <div className="flex flex-col sm:items-end text-[11px] text-slate-400">
                        <span>
                          Seu saldo: <strong>{user?.credits ?? 0} créditos</strong> •{' '}
                          <button
                            type="button"
                            onClick={() => setRechargeModalOpen(true)}
                            className="text-teal-700 font-bold hover:underline"
                          >
                            Recarregar
                          </button>
                        </span>
                        <span className="text-emerald-700 font-medium mt-0.5">
                          🛡️ <strong>Garantia Trevia:</strong> Não atendeu? Estorno em 1 clique.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* GARANTIA TREVIA: PAGAMENTO PROTEGIDO (SINAL EM CUSTÓDIA PIX) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Garantia Trevia
                </span>
                <span className="text-xs text-slate-400 font-semibold">• Sem Golpes em Joinville</span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 mt-0.5">
                Pagamento Protegido (Sinal Seguro PIX)
              </h3>
            </div>
          </div>

          {!escrowState.deposit && (
            <button
              onClick={() => {
                if (!user) openAuthModal('login', () => setEscrowModalOpen(true));
                else setEscrowModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors self-start sm:self-auto flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Proteger Sinal via PIX</span>
            </button>
          )}
        </div>

        {!escrowState.deposit ? (
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
            <p className="leading-relaxed max-w-2xl">
              <strong>Como funciona o Sinal Seguro:</strong> Precisa comprar materiais ou garantir a data do serviço? O cliente deposita o sinal na Trevia via PIX. O valor fica <strong>100% retido em custódia</strong> e só é repassado ao prestador após a confirmação do serviço concluído. Zero risco para ambas as partes!
            </p>
            <div className="flex items-center space-x-2 shrink-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                ✓ 100% Protegido
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status do Sinal Atual */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              escrowState.deposit.status === 'em_custodia' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' :
              escrowState.deposit.status === 'liberado' ? 'bg-sky-50 border-sky-200 text-sky-950' :
              escrowState.deposit.status === 'em_disputa' ? 'bg-rose-50 border-rose-200 text-rose-950' :
              'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                    escrowState.deposit.status === 'em_custodia' ? 'bg-emerald-600 text-white border-emerald-600' :
                    escrowState.deposit.status === 'liberado' ? 'bg-sky-600 text-white border-sky-600' :
                    escrowState.deposit.status === 'em_disputa' ? 'bg-rose-600 text-white border-rose-600' :
                    'bg-amber-500 text-white border-amber-500'
                  }`}>
                    {escrowState.deposit.status === 'em_custodia' ? '🛡️ Em Custódia Segura' :
                     escrowState.deposit.status === 'liberado' ? '✅ Sinal Liberado ao Prestador' :
                     escrowState.deposit.status === 'em_disputa' ? '⚠️ Em Mediação Trevia' :
                     '⏳ Aguardando Pagamento PIX'}
                  </span>
                  <span className="text-base font-black">
                    R$ {Number(escrowState.deposit.amount).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs">
                  {escrowState.deposit.description || 'Sinal seguro garantido pela Trevia'}
                </p>
              </div>

              {/* Botões contextuais de Ação */}
              <div className="flex flex-wrap items-center gap-2">
                {escrowState.deposit.status === 'pendente' && (
                  <>
                    {user && Number(user.wallet_balance || 0) >= Number(escrowState.deposit.amount) && (
                      <button
                        onClick={() => handleFundWithWallet(escrowState.deposit.id)}
                        disabled={processingEscrow}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                      >
                        <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pagar com Saldo da Carteira (R$ {Number(user.wallet_balance || 0).toFixed(2).replace('.', ',')})</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleFundEscrow(escrowState.deposit.id)}
                      disabled={processingEscrow}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{processingEscrow ? 'Confirmando...' : 'Confirmar Pagamento PIX'}</span>
                    </button>
                  </>
                )}

                {escrowState.deposit.status === 'em_custodia' && escrowState.permissions?.can_release && (
                  <button
                    onClick={() => handleReleaseEscrow(escrowState.deposit.id)}
                    disabled={processingEscrow}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{processingEscrow ? 'Liberando...' : 'Liberar Sinal ao Prestador'}</span>
                  </button>
                )}

                {escrowState.deposit.status === 'em_custodia' && escrowState.permissions?.can_dispute && (
                  <button
                    onClick={() => setDisputeModalOpen(true)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors"
                  >
                    Solicitar Mediação
                  </button>
                )}
              </div>
            </div>

            {/* QR Code e Chave PIX (se pendente) */}
            {escrowState.deposit.status === 'pendente' && (
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                {escrowState.deposit.qr_code_url && (
                  <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs shrink-0 select-none">
                    <img
                      src={escrowState.deposit.qr_code_url}
                      alt="QR Code PIX Custódia"
                      draggable="false"
                      className="w-32 h-32 block select-none pointer-events-none"
                    />
                  </div>
                )}
                <div className="space-y-2 flex-1">
                  <h4 className="font-bold text-xs text-slate-800">
                    Pague via PIX para ativar a custódia do sinal (R$ {Number(escrowState.deposit.amount).toFixed(2)})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Abra o app do seu banco, escolha "Pagar com PIX Copia e Cola" ou escaneie o código acima.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={escrowState.deposit.pix_code}
                      className="text-xs bg-white border border-slate-200 p-2 rounded-xl text-slate-700 font-mono flex-1 overflow-hidden text-ellipsis select-all"
                    />
                    <button
                      onClick={() => handleCopyPix(escrowState.deposit.pix_code)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shrink-0 flex items-center space-x-1 transition-colors"
                    >
                      {pixCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{pixCopied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PROPOSALS LIST (Visible to Order Owner) */}
      {isOwner && (
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
            <div className="p-8 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-white rounded-3xl border border-teal-200/80 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-base text-slate-900">
                  Aguardando Propostas dos Profissionais
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Seu pedido está ativo no <strong>Radar de Oportunidades de Joinville e Região</strong>! Os profissionais qualificados já foram notificados e assim que enviarem um orçamento sigiloso, ele aparecerá aqui para você avaliar.
                </p>
              </div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100/80 text-emerald-800 text-[11px] font-bold rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>● Radar Ativo em Joinville</span>
              </div>
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

                    {/* Direct Contact Button & Review */}
                    <div className="flex flex-wrap items-center gap-2">
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

                      {(prop.status === 'aceita' || order.status === 'concluido') && (
                        hasReviewedTarget(prop.provider_id) ? (
                          <span className="inline-flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Avaliação enviada</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenReview(prop.provider_id, prop.provider_name, 'provider')}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition-transform active:scale-95"
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Avaliar Prestador</span>
                          </button>
                        )
                      )}

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

      {/* AVALIAÇÕES DESTE SERVIÇO */}
      {orderReviews && orderReviews.length > 0 && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Avaliações deste Serviço ({orderReviews.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Transparência e reputação confirmada entre as partes
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {orderReviews.map((rev) => {
              let tags = [];
              try {
                tags = typeof rev.tags_json === 'string' ? JSON.parse(rev.tags_json) : rev.tags_json || [];
              } catch (e) {
                tags = [];
              }
              const isTargetProvider = rev.target_type === 'provider';

              return (
                <div
                  key={rev.id}
                  className="p-4 bg-slate-50/70 border border-slate-200/70 rounded-2xl space-y-2.5 transition-all hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                        {rev.reviewer_avatar ? (
                          <img src={rev.reviewer_avatar} alt={rev.reviewer_name} draggable="false" className="w-full h-full object-cover select-none pointer-events-none" />
                        ) : (
                          rev.reviewer_name?.slice(0, 2) || 'AV'
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center space-x-1.5">
                          <span>{rev.reviewer_name}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600">
                            avaliou {isTargetProvider ? 'o profissional' : 'o contratante'} {rev.target_name}
                          </span>
                        </div>
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
                      <span className="text-xs font-black text-amber-700 ml-1">{rev.rating}.0</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-normal bg-white p-3 rounded-xl border border-slate-100">
                    "{rev.comment}"
                  </p>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-full"
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

      {/* Modal de Recarga de Créditos via PIX */}
      <RechargeModal
        isOpen={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
        onSuccess={() => handleUnlockContact()}
      />

      {/* Modal de Avaliação Bilateral */}
      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        orderId={order.id}
        orderTitle={order.title}
        targetUserId={reviewTarget.id}
        targetUserName={reviewTarget.name}
        targetType={reviewTarget.type}
        onSuccess={loadOrder}
      />

      {/* Modal de Garantia Trevia / Estorno de Crédito */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Garantia Trevia (Risco Zero)</h3>
                  <span className="text-[11px] text-teal-700 font-medium">Estorno Imediato de Crédito</span>
                </div>
              </div>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold p-1"
              >
                ✕ Fechar
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Valorizamos o seu trabalho e investimento. Se o cliente não responder no WhatsApp ou o contato for inválido, seu crédito retorna imediatamente ao seu saldo.
            </p>

            {refundSuccessMessage ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold text-center border border-emerald-200">
                {refundSuccessMessage}
              </div>
            ) : (
              <form onSubmit={handleRefundSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Qual foi a dificuldade encontrada? *
                  </label>
                  <select
                    required
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Cliente não responde no WhatsApp">Cliente não responde no WhatsApp</option>
                    <option value="Telefone inválido ou não existe">Telefone informado é inválido ou não existe</option>
                    <option value="Cliente informou que já fechou com outro">Cliente informou que já fechou com outro profissional</option>
                    <option value="Cliente desistiu do serviço">Cliente desistiu de realizar o serviço</option>
                    <option value="Outro motivo">Outro motivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Observação adicional (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={refundDetails}
                    onChange={(e) => setRefundDetails(e.target.value)}
                    placeholder="Ex: Enviei mensagem e aguardei, mas sem retorno..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-teal-600 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRefundModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={requestingRefund}
                    className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-emerald-600 hover:from-teal-800 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center space-x-1.5 transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{requestingRefund ? 'Processando Estorno...' : 'Ativar Garantia e Recuperar Crédito'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Modal para Gerar Sinal Seguro PIX */}
      {escrowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Proteger Sinal via PIX
                </h3>
                <p className="text-xs text-slate-500">
                  Custódia Trevia com Garantia Total de Reembolso
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateEscrow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Valor do Sinal (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    min="5"
                    step="0.01"
                    required
                    value={escrowAmount}
                    onChange={(e) => setEscrowAmount(e.target.value)}
                    placeholder="100,00"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 font-bold text-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mínimo de R$ 5,00. Recomendamos entre 10% e 30% do orçamento para compra de materiais.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Finalidade do Sinal
                </label>
                <input
                  type="text"
                  required
                  value={escrowDesc}
                  onChange={(e) => setEscrowDesc(e.target.value)}
                  placeholder="Ex: Sinal para compra de fios, disjuntores e reserva de data"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600 text-slate-800"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
                <span className="font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Proteção Bidirecional Trevia:</span>
                </span>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  O dinheiro permanece retido em conta segura Trevia. O prestador trabalha com a garantia de que o pagamento existe, e você só autoriza o repasse após a entrega do serviço!
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEscrowModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingEscrow}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center space-x-1.5 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{creatingEscrow ? 'Gerando...' : 'Gerar Chave PIX Segura'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Solicitar Mediação de Sinal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 border border-rose-100">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Solicitar Mediação Trevia
                </h3>
                <p className="text-xs text-slate-500">
                  Suporte especializado para resolução de divergências
                </p>
              </div>
            </div>

            <form onSubmit={handleDisputeEscrow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Qual foi o problema ocorrido? *
                </label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-600 font-medium text-slate-800"
                >
                  <option value="Prestador não compareceu no dia combinado">Prestador não compareceu no dia combinado</option>
                  <option value="Serviço executado com defeitos graves">Serviço executado com defeitos graves</option>
                  <option value="Desacordo de escopo ou valores">Desacordo de escopo ou valores</option>
                  <option value="Cliente desistiu do serviço antes do início">Cliente desistiu do serviço antes do início</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>

              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 text-xs text-rose-900">
                <p className="text-[11px] leading-relaxed">
                  Ao abrir a mediação, o repasse continuará <strong>bloqueado em segurança</strong> e nossa equipe entrará em contato via WhatsApp com ambas as partes para resolver o caso amigavelmente ou estornar o valor.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingEscrow}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50 flex items-center space-x-1.5 transition-all"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{processingEscrow ? 'Abrindo...' : 'Confirmar Mediação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
