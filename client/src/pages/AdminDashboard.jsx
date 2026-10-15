import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  Shield,
  Users,
  Briefcase,
  Layers,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Plus,
  RefreshCw,
  Clock,
  Check,
  X,
  MessageCircle,
  Trash2,
  Phone,
  ExternalLink,
  Sparkles,
  CreditCard,
  QrCode,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';

export default function AdminDashboard({ navigate }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('metrics'); // 'metrics', 'recharges', 'leads', 'categories', 'locations', 'reports'
  const [metrics, setMetrics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [walletWithdrawals, setWalletWithdrawals] = useState([]);
  const [walletDeposits, setWalletDeposits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // New category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes, lRes, rRes, ldRes, rcRes, wwRes, wdRes] = await Promise.all([
        api.admin.getMetrics(),
        api.admin.getCategories(),
        api.admin.getLocations(),
        api.admin.getReports(),
        api.leads.list().catch(() => ({ leads: [] })),
        api.admin.getRecharges().catch(() => ({ recharges: [] })),
        api.admin.getWalletWithdrawals().catch(() => ({ withdrawals: [] })),
        api.admin.getWalletDeposits().catch(() => ({ deposits: [] }))
      ]);

      setMetrics(mRes.metrics);
      setCategories(cRes.categories || []);
      setLocations(lRes.locations || []);
      setReports(rRes.reports || []);
      setLeads(ldRes.leads || []);
      setRecharges(rcRes.recharges || []);
      setWalletWithdrawals(wwRes.withdrawals || []);
      setWalletDeposits(wdRes.deposits || []);
    } catch (err) {
      console.error('Erro ao carregar dados administrativos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadAdminData();
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800">Acesso Restrito à Administração</h3>
        <p className="text-xs text-slate-500">
          Você precisa de permissão de administrador para visualizar este painel.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    setCreatingCat(true);
    try {
      await api.admin.createCategory({
        name: newCatName,
        slug: newCatSlug,
        description: newCatDesc,
        display_order: categories.length + 1
      });
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao criar categoria.');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleToggleCategory = async (cat) => {
    try {
      await api.admin.updateCategory(cat.id, { is_active: cat.is_active ? 0 : 1 });
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao alterar categoria.');
    }
  };

  const handleUpdateReportStatus = async (reportId, status) => {
    try {
      await api.admin.updateReport(reportId, status);
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao alterar denúncia.');
    }
  };

  const handleUpdateLeadStatus = async (leadId, status) => {
    try {
      await api.leads.updateStatus(leadId, status);
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao alterar status do lead.');
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Deseja excluir este lead permanentemente?')) return;
    try {
      await api.leads.delete(leadId);
      loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao excluir lead.');
    }
  };

  const handleApproveRecharge = async (id) => {
    if (!window.confirm('Confirma que o PIX caiu na sua conta e deseja liberar os créditos para este usuário?')) return;
    setActionLoading(id);
    try {
      await api.admin.approveRecharge(id);
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao aprovar recarga.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRecharge = async (id) => {
    const reason = window.prompt('Motivo da rejeição (opcional):', 'Comprovante não identificado ou valor divergente');
    if (reason === null) return;
    setActionLoading(id);
    try {
      await api.admin.rejectRecharge(id, reason);
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao rejeitar recarga.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveWithdrawal = async (id) => {
    if (!window.confirm('Confirma que realizou a transferência PIX para a chave informada e deseja marcar o saque como PAGO?')) return;
    setActionLoading(id);
    try {
      await api.admin.approveWalletWithdrawal(id);
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao aprovar saque.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectWithdrawal = async (id) => {
    const reason = window.prompt('Informe o motivo da recusa do saque (o saldo será estornado e devolvido à carteira do usuário):', 'Chave PIX inválida ou dados incorretos');
    if (reason === null) return;
    setActionLoading(id);
    try {
      await api.admin.rejectWalletWithdrawal(id, reason);
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao estornar saque.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveDeposit = async (id) => {
    if (!window.confirm('Confirma que o PIX caiu na conta oficial Trevia e deseja creditar o saldo na carteira do usuário?')) return;
    setActionLoading(id);
    try {
      await api.admin.approveWalletDeposit(id);
      await loadAdminData();
    } catch (err) {
      alert(err.message || 'Erro ao aprovar depósito.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Módulo de Gestão e Moderação</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Painel da Administração
          </h1>
        </div>

        <button
          onClick={loadAdminData}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setTab('metrics')}
          className={`pb-3 transition-colors ${
            tab === 'metrics' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Indicadores do Sistema
        </button>
        <button
          onClick={() => setTab('recharges')}
          className={`pb-3 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            tab === 'recharges' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Recargas PIX</span>
          {recharges.filter(r => r.status === 'em_analise' || r.status === 'pendente').length > 0 ? (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              {recharges.filter(r => r.status === 'em_analise' || r.status === 'pendente').length} pendente(s)
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {recharges.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('wallet')}
          className={`pb-3 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            tab === 'wallet' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Saques & Carteira PIX</span>
          {walletWithdrawals.filter(w => w.status === 'pendente').length > 0 ? (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              {walletWithdrawals.filter(w => w.status === 'pendente').length} saque(s) pendente(s)
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {walletWithdrawals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('leads')}
          className={`pb-3 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            tab === 'leads' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>Leads Express</span>
          {leads.filter(l => l.status === 'novo').length > 0 ? (
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {leads.filter(l => l.status === 'novo').length}
            </span>
          ) : (
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {leads.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`pb-3 transition-colors whitespace-nowrap ${
            tab === 'categories' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Categorias ({categories.length})
        </button>
        <button
          onClick={() => setTab('locations')}
          className={`pb-3 transition-colors whitespace-nowrap ${
            tab === 'locations' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Localidades ({locations.length})
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`pb-3 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
            tab === 'reports' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>Denúncias</span>
          {reports.filter(r => r.status === 'pendente').length > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {reports.filter(r => r.status === 'pendente').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: METRICS */}
      {tab === 'metrics' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Faturamento PIX</span>
              <span className="text-2xl font-extrabold text-emerald-600">
                R$ {recharges.filter(r => r.status === 'aprovado').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toFixed(2).replace('.', ',')}
              </span>
              <span className="text-[11px] text-slate-500 block pt-1">
                {recharges.filter(r => r.status === 'aprovado').length} recargas liberadas
              </span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Total de Usuários</span>
              <span className="text-2xl font-extrabold text-slate-900">{metrics.totalUsers}</span>
              <span className="text-[11px] text-slate-500 block pt-1">
                {metrics.totalClients} clientes • {metrics.totalProviders} autônomos
              </span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Pedidos Totais</span>
              <span className="text-2xl font-extrabold text-slate-900">{metrics.totalOrders}</span>
              <span className="text-[11px] text-emerald-600 font-semibold block pt-1">
                {metrics.openOrders} atualmente abertos
              </span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Propostas Enviadas</span>
              <span className="text-2xl font-extrabold text-slate-900">{metrics.totalProposals}</span>
              <span className="text-[11px] text-slate-500 block pt-1">
                Manifestações de interesse
              </span>
            </div>

            <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-xs text-slate-400 font-semibold block">Denúncias Pendentes</span>
              <span className="text-2xl font-extrabold text-rose-600">{metrics.pendingReports}</span>
              <span className="text-[11px] text-slate-500 block pt-1">
                Aguardando moderação
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: RECARGAS PIX */}
      {tab === 'recharges' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Gestão e Aprovação de Recargas PIX</h2>
              <p className="text-xs text-slate-500">
                Liberação manual e segura de créditos após conferência do pagamento no extrato bancário.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>
                Total aprovado: R$ {recharges.filter(r => r.status === 'aprovado').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {/* PIX Key Banner */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-emerald-900">Chave PIX Oficial de Recebimento:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-800">
                    Ativa no App
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-emerald-800 select-all mt-0.5">
                  c8b36d11-7899-4ce7-999a-7ac85399dd71
                </div>
              </div>
            </div>
            <div className="text-[11px] text-emerald-700 sm:text-right">
              Todos os pagamentos PIX caem diretamente na sua conta bancária vinculada a esta chave.
            </div>
          </div>

          {/* Recharges List */}
          {recharges.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
              Nenhum pedido de recarga registrado ainda. Assim que um profissional solicitar créditos, ele aparecerá aqui com os dados e comprovante para liberação.
            </div>
          ) : (
            <div className="space-y-4">
              {recharges.map((rc) => {
                const cleanPhone = rc.buyer_phone ? rc.buyer_phone.replace(/\D/g, '') : '';
                const waNumber = cleanPhone.startsWith('55') ? cleanPhone : (cleanPhone ? `55${cleanPhone}` : '');
                const waLink = waNumber ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Olá, ${rc.buyer_name || 'Profissional'}! Sou da equipe Trevia a respeito do seu pedido de recarga #${rc.id} (${rc.credits} créditos).`)}` : null;

                const isPending = rc.status === 'pendente' || rc.status === 'em_analise';
                const isApproved = rc.status === 'aprovado';
                const isRejected = rc.status === 'rejeitado';

                return (
                  <div
                    key={rc.id}
                    className={`p-6 bg-white rounded-3xl border shadow-xs space-y-4 transition-all ${
                      isPending ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-slate-500">#{rc.id}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600 font-semibold">
                          {new Date(rc.created_at).toLocaleString('pt-BR')}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs font-bold text-slate-800">
                          Pacote: <span className="text-emerald-700 uppercase">{rc.package_id || 'Créditos'}</span>
                        </span>
                      </div>

                      <div>
                        {rc.status === 'em_analise' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>Comprovante Enviado (Aguardando Liberação)</span>
                          </span>
                        )}
                        {rc.status === 'pendente' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                            <Clock className="w-3 h-3" />
                            <span>PIX Gerado (Pendente de Pagamento)</span>
                          </span>
                        )}
                        {rc.status === 'aprovado' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3" />
                            <span>Aprovado & Créditos Liberados</span>
                          </span>
                        )}
                        {rc.status === 'rejeitado' && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                            <X className="w-3 h-3" />
                            <span>Rejeitado</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Buyer Details */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dados do Solicitante</span>
                        <div className="font-bold text-slate-900 text-sm">{rc.buyer_name || 'Usuário #' + rc.user_id}</div>
                        <div className="text-xs text-slate-500">{rc.buyer_email || 'Email não disponível'}</div>
                        {rc.buyer_phone && (
                          <div className="text-xs text-slate-600 font-semibold flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{rc.buyer_phone}</span>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 pt-1">
                          Saldo atual em conta: <span className="font-bold text-slate-800">{rc.buyer_current_credits ?? 0} créditos</span>
                        </div>
                      </div>

                      {/* Values */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valores do Pedido</span>
                        <div className="text-2xl font-black text-slate-900">
                          R$ {Number(rc.amount || 0).toFixed(2).replace('.', ',')}
                        </div>
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>+{rc.credits} Créditos para a conta</span>
                        </div>
                      </div>

                      {/* Transaction proof info */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comprovante Informado</span>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                          {rc.transaction_proof ? (
                            <p className="font-mono text-slate-800 break-words whitespace-pre-wrap">
                              {rc.transaction_proof}
                            </p>
                          ) : (
                            <p className="text-slate-400 italic">Nenhum comprovante digitado ainda</p>
                          )}
                        </div>
                        {rc.reviewed_at && (
                          <div className="text-[10px] text-slate-400 pt-1">
                            Processado em: {new Date(rc.reviewed_at).toLocaleString('pt-BR')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div>
                        {waLink && (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Contatar via WhatsApp</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {!isApproved && (
                          <>
                            <button
                              disabled={actionLoading === rc.id}
                              onClick={() => handleRejectRecharge(rc.id)}
                              className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-50"
                            >
                              <X className="w-3.5 h-3.5 inline mr-1" />
                              Rejeitar
                            </button>
                            <button
                              disabled={actionLoading === rc.id}
                              onClick={() => handleApproveRecharge(rc.id)}
                              className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Liberar +{rc.credits} Créditos</span>
                            </button>
                          </>
                        )}
                        {isApproved && (
                          <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Créditos creditados com sucesso na conta</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: WALLET & PIX WITHDRAWALS */}
      {tab === 'wallet' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gestão Financeira & Saques PIX</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Transferências e Carteira Digital
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chave PIX Oficial Trevia: <strong className="font-mono text-slate-800">c8b36d11-7899-4ce7-999a-7ac85399dd71</strong>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-2xl text-xs font-bold text-amber-900">
                <span>Saques Pendentes: </span>
                <strong className="text-amber-700">
                  R$ {walletWithdrawals.filter(w => w.status === 'pendente').reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0).toFixed(2).replace('.', ',')}
                </strong>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-2xl text-xs font-bold text-emerald-900">
                <span>Total Já Transferido: </span>
                <strong className="text-emerald-700">
                  R$ {walletWithdrawals.filter(w => w.status === 'pago').reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0).toFixed(2).replace('.', ',')}
                </strong>
              </div>
            </div>
          </div>

          {/* Section 1: Withdrawals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                <ArrowUpRight className="w-4 h-4 text-rose-500" />
                <span>Solicitações de Saque de Usuários ({walletWithdrawals.length})</span>
              </h3>
            </div>

            {walletWithdrawals.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400 space-y-2">
                <ArrowUpRight className="w-10 h-10 mx-auto text-slate-300" />
                <p>Nenhuma solicitação de saque cadastrada no sistema.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {walletWithdrawals.map(w => {
                  const isPending = w.status === 'pendente';
                  const isPaid = w.status === 'pago';
                  const isRejected = w.status === 'rejeitado';
                  const cleanPhone = w.user_phone ? w.user_phone.replace(/\D/g, '') : '';
                  const waLink = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Ol%C3%A1%20${encodeURIComponent(w.user_name || '')}%2C%20estou%20entrando%20em%20contato%20sobre%20seu%20saque%20no%20Trevia.` : null;

                  return (
                    <div
                      key={w.id}
                      className={`p-5 sm:p-6 bg-white rounded-3xl border shadow-xs space-y-4 transition-all ${
                        isPending ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/15' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-slate-500">#{w.id}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-600 font-semibold">
                            {new Date(w.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div>
                          {isPending && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              <Clock className="w-3 h-3" />
                              <span>Pendente de Transferência PIX</span>
                            </span>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle className="w-3 h-3" />
                              <span>Transferido & Pago via PIX</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                              <X className="w-3 h-3" />
                              <span>Estornado / Recusado</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* User Details */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Solicitante</span>
                          <div className="font-bold text-slate-900 text-sm">{w.user_name || 'Usuário #' + w.user_id}</div>
                          <div className="text-xs text-slate-500">{w.user_email || 'Email não disponível'}</div>
                          {w.user_phone && (
                            <div className="text-xs text-slate-600 font-semibold flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{w.user_phone}</span>
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 pt-1">
                            Saldo restante na carteira: <span className="font-bold text-slate-800">R$ {Number(w.user_wallet_balance ?? 0).toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valor Solicitado</span>
                          <div className="text-3xl font-black text-rose-700">
                            R$ {Number(w.amount || 0).toFixed(2).replace('.', ',')}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            Transferência direta para a conta do usuário
                          </span>
                        </div>

                        {/* PIX Key of destination */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chave PIX de Destino</span>
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                            <div className="text-[10px] uppercase font-bold text-slate-500">
                              Tipo: <strong className="text-slate-800">{w.pix_key_type?.toUpperCase()}</strong>
                            </div>
                            <div className="font-mono font-extrabold text-sm text-slate-900 select-all break-all mt-0.5">
                              {w.pix_key}
                            </div>
                          </div>
                          {w.processed_at && (
                            <div className="text-[10px] text-slate-400">
                              Processado em: {new Date(w.processed_at).toLocaleString('pt-BR')}
                            </div>
                          )}
                          {w.rejection_reason && (
                            <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200">
                              <strong>Motivo do estorno:</strong> {w.rejection_reason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div>
                          {waLink && (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {isPending && (
                            <>
                              <button
                                disabled={actionLoading === w.id}
                                onClick={() => handleRejectWithdrawal(w.id)}
                                className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5 inline mr-1" />
                                Recusar e Estornar Saldo
                              </button>
                              <button
                                disabled={actionLoading === w.id}
                                onClick={() => handleApproveWithdrawal(w.id)}
                                className="px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Marcar como Pago via PIX</span>
                              </button>
                            </>
                          )}
                          {isPaid && (
                            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center space-x-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Transferência confirmada</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Deposits */}
          <div className="space-y-3 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
              <span>Depósitos PIX em Carteira ({walletDeposits.length})</span>
            </h3>

            {walletDeposits.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                Nenhum depósito cadastrado no sistema.
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {walletDeposits.map(d => (
                  <div key={d.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          R$ {Number(d.amount).toFixed(2).replace('.', ',')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          d.status === 'aprovado'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {d.status === 'aprovado' ? 'Creditado na Carteira' : 'Pendente de Pagamento'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {d.user_name || 'Usuário #' + d.user_id} ({d.user_email}) • {new Date(d.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>

                    {d.status !== 'aprovado' && (
                      <button
                        onClick={() => handleApproveDeposit(d.id)}
                        disabled={actionLoading === d.id}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors self-start sm:self-auto"
                      >
                        Aprovar Depósito
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: LEADS EXPRESS */}
      {tab === 'leads' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Leads do Formulário Rápido (Home & Tráfego)</h2>
              <p className="text-xs text-slate-500">Contatos de clientes em Joinville recebidos pelo site para follow-up imediato</p>
            </div>
            <div className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              Total: {leads.length} leads ({leads.filter(l => l.status === 'novo').length} novos)
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
              Nenhum lead registrado ainda. Assim que as campanhas de tráfego começarem, cada pessoa que preencher o formulário da página inicial aparecerá aqui com telefone e WhatsApp.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leads.map((ld) => {
                const cleanPhone = ld.phone ? ld.phone.replace(/\D/g, '') : '';
                const waNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                const waLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(`Olá, ${ld.name}! Sou da equipe Trevia. Vi que você solicitou um orçamento para ${ld.service} no bairro ${ld.neighborhood} em Joinville. Como podemos te ajudar?`)}`;

                return (
                  <div key={ld.id} className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          ld.status === 'novo' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          ld.status === 'em_contato' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          ld.status === 'convertido' ? 'bg-teal-100 text-teal-800 border border-teal-300' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {ld.status === 'novo' ? '⚡ Novo Lead' : ld.status === 'em_contato' ? '📞 Em Contato' : ld.status === 'convertido' ? '✓ Convertido' : 'Arquivado'}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          {new Date(ld.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900">{ld.name}</h3>
                        <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold mt-0.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{ld.neighborhood}, Joinville</span>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-700">
                        <div><strong>Serviço:</strong> {ld.service}</div>
                        {ld.details && (
                          <div className="text-slate-500 italic">"{ld.details}"</div>
                        )}
                        <div className="text-slate-400 text-[11px] pt-1">
                          Telefone: <span className="font-mono text-slate-700 font-bold">{ld.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center space-x-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Falar no WhatsApp</span>
                      </a>

                      <div className="flex items-center space-x-2">
                        <select
                          value={ld.status}
                          onChange={(e) => handleUpdateLeadStatus(ld.id, e.target.value)}
                          className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium"
                        >
                          <option value="novo">Novo</option>
                          <option value="em_contato">Em Contato</option>
                          <option value="convertido">Convertido</option>
                          <option value="arquivado">Arquivado</option>
                        </select>

                        <button
                          onClick={() => handleDeleteLead(ld.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Excluir Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {tab === 'categories' && (
        <div className="space-y-6">
          {/* Create category box */}
          <form onSubmit={handleCreateCategory} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Cadastrar Nova Categoria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Nome da categoria (ex: Vidraceiro)"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                }}
                className="p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <input
                type="text"
                required
                placeholder="Slug (ex: vidraceiro)"
                value={newCatSlug}
                onChange={(e) => setNewCatSlug(e.target.value)}
                className="p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
              <input
                type="text"
                placeholder="Descrição resumida"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <button
              type="submit"
              disabled={creatingCat}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Categoria</span>
            </button>
          </form>

          {/* List categories */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Slug</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="p-4 font-bold text-slate-900">{c.name}</td>
                    <td className="p-4 text-slate-500">{c.slug}</td>
                    <td className="p-4 text-slate-500">{c.description}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleCategory(c)}
                        className="text-xs text-teal-700 hover:underline font-semibold"
                      >
                        {c.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LOCATIONS */}
      {tab === 'locations' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locations.map((loc) => (
              <div key={loc.id} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center">
                    <MapPin className="w-4 h-4 text-teal-600 mr-1.5" />
                    <span>{loc.city}, {loc.state}</span>
                  </h3>
                  <span className="text-[10px] font-bold bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-full">
                    {loc.neighborhoods ? loc.neighborhoods.length : 0} bairros cadastrados
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100">
                  {loc.neighborhoods && loc.neighborhoods.map((b, i) => (
                    <span key={i} className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-700">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: REPORTS */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
              Nenhuma denúncia pendente de moderação no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Motivo: {rep.reason}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      rep.status === 'pendente' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {rep.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 italic">"{rep.details || 'Sem detalhes informados'}"</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>Alvo: {rep.target_type} ({rep.target_id})</span>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleUpdateReportStatus(rep.id, 'resolvido')}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg"
                      >
                        Marcar como Resolvido
                      </button>
                      <button
                        onClick={() => handleUpdateReportStatus(rep.id, 'ignorado')}
                        className="px-2.5 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-lg"
                      >
                        Ignorar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
