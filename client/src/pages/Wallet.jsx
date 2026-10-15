import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ChevronRight,
  QrCode,
  DollarSign,
  AlertTriangle,
  Lock,
  Building2,
  Smartphone,
  Mail,
  KeyRound,
  FileText
} from 'lucide-react';

export default function Wallet({ navigate }) {
  const { user, refreshMe, openAuthModal } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('statement'); // 'statement', 'withdrawals', 'escrows'
  const [filterType, setFilterType] = useState('todos');

  // Summary state
  const [summary, setSummary] = useState({
    wallet_balance: 0,
    held_balance: 0,
    pending_withdrawals: 0,
    total_withdrawn: 0,
    total_deposited: 0,
    official_pix_key: 'c8b36d11-7899-4ce7-999a-7ac85399dd71',
    recent_transactions: [],
    active_escrows: []
  });

  // Statement & Withdrawals lists
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  // Modals state
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [activeDeposit, setActiveDeposit] = useState(null);
  const [confirmingDeposit, setConfirmingDeposit] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState('');

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [pixKeyType, setPixKeyType] = useState('cpf');
  const [pixKey, setPixKey] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');

  const loadWalletData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [sumRes, txRes, withRes] = await Promise.all([
        api.wallet.summary(),
        api.wallet.transactions({ limit: 50, type: filterType }),
        api.wallet.withdrawals()
      ]);

      setSummary(sumRes);
      setTransactions(txRes.transactions || []);
      setWithdrawals(withRes.withdrawals || []);
      if (refreshMe) await refreshMe();
    } catch (err) {
      console.error('Erro ao carregar dados da carteira:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) {
      openAuthModal('login', () => loadWalletData());
    } else {
      loadWalletData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      api.wallet.transactions({ limit: 50, type: filterType })
        .then(res => setTransactions(res.transactions || []))
        .catch(console.error);
    }
  }, [filterType]);

  const handleCreateDeposit = async (e) => {
    e?.preventDefault();
    setDepositError('');
    setDepositLoading(true);

    try {
      const res = await api.wallet.deposit(depositAmount);
      setActiveDeposit(res.deposit);
    } catch (err) {
      setDepositError(err.message || 'Erro ao gerar cobrança PIX.');
    } finally {
      setDepositLoading(false);
    }
  };

  const handleConfirmDeposit = async () => {
    if (!activeDeposit) return;
    setConfirmingDeposit(true);
    setDepositError('');

    try {
      const res = await api.wallet.confirmDeposit(activeDeposit.id);
      setDepositSuccessMsg(res.message);
      await loadWalletData();
      setTimeout(() => {
        setDepositModalOpen(false);
        setActiveDeposit(null);
        setDepositSuccessMsg('');
      }, 2000);
    } catch (err) {
      setDepositError(err.message || 'Erro ao confirmar depósito.');
    } finally {
      setConfirmingDeposit(false);
    }
  };

  const handleRequestWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccessMsg('');

    const numAmount = parseFloat(withdrawAmount);
    if (!numAmount || numAmount < 5) {
      setWithdrawError('O valor mínimo para saque via PIX é de R$ 5,00.');
      return;
    }

    if (numAmount > summary.wallet_balance) {
      setWithdrawError(`Saldo insuficiente. Você tem R$ ${summary.wallet_balance.toFixed(2).replace('.', ',')} disponível.`);
      return;
    }

    if (!pixKey.trim()) {
      setWithdrawError('Informe sua chave PIX para transferência.');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await api.wallet.withdraw({
        amount: numAmount,
        pix_key_type: pixKeyType,
        pix_key: pixKey.trim()
      });

      setWithdrawSuccessMsg(res.message);
      setWithdrawAmount('');
      setPixKey('');
      await loadWalletData();
      setTimeout(() => {
        setWithdrawModalOpen(false);
        setWithdrawSuccessMsg('');
      }, 2200);
    } catch (err) {
      setWithdrawError(err.message || 'Erro ao solicitar saque via PIX.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <WalletIcon className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="font-bold text-slate-800">Acesse sua Carteira</h3>
        <p className="text-xs text-slate-500">Faça login para consultar seu saldo disponível, efetuar saques e gerenciar seus pagamentos protegidos.</p>
        <button
          onClick={() => openAuthModal('login')}
          className="px-6 py-2.5 bg-teal-600 text-white text-xs font-bold rounded-xl hover:bg-teal-700 transition-colors"
        >
          Entrar no Trevia
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sistema Seguro de Pagamentos • Trevia Pay</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Minha Carteira Digital</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Receba valores de serviços concluídos, deposite saldo e faça saques instantâneos via PIX.
          </p>
        </div>

        <button
          onClick={() => loadWalletData(true)}
          disabled={refreshing}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
          <span>{refreshing ? 'Atualizando...' : 'Atualizar Saldo'}</span>
        </button>
      </div>

      {/* Balance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Available Balance Card */}
        <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-emerald-400/10 pointer-events-none blur-xl"></div>
          
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-200 uppercase tracking-wider flex items-center space-x-1.5">
                <WalletIcon className="w-4 h-4" />
                <span>Saldo Disponível</span>
              </span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                Livre para Saque
              </span>
            </div>

            <div className="mt-3">
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                R$ {Number(summary.wallet_balance).toFixed(2).replace('.', ',')}
              </div>
              <p className="text-[11px] text-emerald-100/80 mt-1">
                Disponível para transferir via PIX ou pagar serviços
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-emerald-600/50">
            <button
              onClick={() => {
                setActiveDeposit(null);
                setDepositSuccessMsg('');
                setDepositError('');
                setDepositModalOpen(true);
              }}
              className="py-2.5 px-3 bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm active:scale-98 transition-all"
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>Depositar</span>
            </button>
            <button
              onClick={() => {
                setWithdrawError('');
                setWithdrawSuccessMsg('');
                setWithdrawModalOpen(true);
              }}
              disabled={summary.wallet_balance < 5}
              className={`py-2.5 px-3 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
                summary.wallet_balance >= 5
                  ? 'bg-emerald-950/60 hover:bg-emerald-950/80 text-white border border-emerald-400/40 shadow-sm active:scale-98'
                  : 'bg-emerald-950/30 text-emerald-300/60 border border-emerald-800/30 cursor-not-allowed'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-300 stroke-[2.5]" />
              <span>Sacar PIX</span>
            </button>
          </div>
        </div>

        {/* Held Escrow Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Em Custódia (Sinal Seguro)</span>
              </span>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                Protegido
              </span>
            </div>

            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-800 tracking-tight">
                R$ {Number(summary.held_balance).toFixed(2).replace('.', ',')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Valores retidos com segurança até a entrega e validação do serviço.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Sinais em andamento:</span>
            <span className="font-bold text-slate-900">{summary.active_escrows.length}</span>
          </div>
        </div>

        {/* Withdrawal & History Stats Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Status de Saques</span>
              </span>
              {summary.pending_withdrawals > 0 && (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  Em Processamento
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <span className="text-xs text-slate-500">Saques em análise:</span>
                <div className="text-xl font-bold text-amber-700">
                  R$ {Number(summary.pending_withdrawals).toFixed(2).replace('.', ',')}
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500">Total já transferido para sua conta:</span>
                <div className="text-sm font-bold text-slate-700">
                  R$ {Number(summary.total_withdrawn).toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Chave Oficial de Depósito: <span className="font-mono text-slate-600 font-semibold">{summary.official_pix_key.slice(0, 8)}...</span>
          </div>
        </div>

      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setTab('statement')}
          className={`pb-3 transition-colors flex items-center space-x-2 ${
            tab === 'statement' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Extrato de Movimentações</span>
        </button>

        <button
          onClick={() => setTab('withdrawals')}
          className={`pb-3 transition-colors flex items-center space-x-2 ${
            tab === 'withdrawals' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Solicitações de Saque ({withdrawals.length})</span>
        </button>

        <button
          onClick={() => setTab('escrows')}
          className={`pb-3 transition-colors flex items-center space-x-2 ${
            tab === 'escrows' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Sinais em Custódia ({summary.active_escrows.length})</span>
        </button>
      </div>

      {/* Tab 1: Statement */}
      {tab === 'statement' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          
          {/* Filters */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Histórico de Transações</h3>
            
            <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setFilterType('todos')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterType === 'todos' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterType('deposito')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterType === 'deposito' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Depósitos
              </button>
              <button
                onClick={() => setFilterType('saque')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterType === 'saque' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Saques
              </button>
              <button
                onClick={() => setFilterType('sinal_recebido')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterType === 'sinal_recebido' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sinais Recebidos
              </button>
              <button
                onClick={() => setFilterType('sinal_pago')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  filterType === 'sinal_pago' ? 'bg-white text-amber-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sinais Pagos
              </button>
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Carregando extrato da carteira...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <WalletIcon className="w-10 h-10 mx-auto text-slate-300" />
              <p>Nenhuma transação encontrada no período.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.map(tx => {
                const isCredit = tx.direction === 'credit';
                return (
                  <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 rounded-xl px-2 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                        )}
                      </div>

                      <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900">
                          {tx.description}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(tx.created_at).toLocaleString('pt-BR')} • Saldo após: R$ {Number(tx.balance_after).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm sm:text-base font-extrabold ${
                        isCredit ? 'text-emerald-700' : 'text-slate-800'
                      }`}>
                        {isCredit ? '+' : '-'} R$ {Number(tx.amount).toFixed(2).replace('.', ',')}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        tx.status === 'concluido'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {tx.status === 'concluido' ? 'Concluído' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Tab 2: Withdrawals */}
      {tab === 'withdrawals' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Histórico de Saques Solicitados</h3>
              <p className="text-xs text-slate-500">Transferências solicitadas para sua conta bancária via PIX</p>
            </div>
            
            <button
              onClick={() => {
                setWithdrawError('');
                setWithdrawSuccessMsg('');
                setWithdrawModalOpen(true);
              }}
              disabled={summary.wallet_balance < 5}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              + Novo Saque PIX
            </button>
          </div>

          {withdrawals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <ArrowUpRight className="w-10 h-10 mx-auto text-slate-300" />
              <p>Nenhuma solicitação de saque realizada ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {withdrawals.map(w => (
                <div key={w.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-base">
                        R$ {Number(w.amount).toFixed(2).replace('.', ',')}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        w.status === 'pago'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : w.status === 'rejeitado'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {w.status === 'pago' ? 'Pago via PIX' : w.status === 'rejeitado' ? 'Estornado / Rejeitado' : 'Em Análise / Pendente'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono">
                      Chave PIX ({w.pix_key_type?.toUpperCase()}): <strong className="text-slate-800">{w.pix_key}</strong>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Solicitado em {new Date(w.created_at).toLocaleString('pt-BR')}
                      {w.processed_at && ` • Processado em ${new Date(w.processed_at).toLocaleString('pt-BR')}`}
                    </div>

                    {w.rejection_reason && (
                      <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-1">
                        <strong>Motivo do estorno:</strong> {w.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Active Escrows */}
      {tab === 'escrows' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Sinais Protegidos em Custódia</h3>
            <p className="text-xs text-slate-500">Valores garantidos para serviços em andamento na região</p>
          </div>

          {summary.active_escrows.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
              <p>Nenhum sinal em custódia no momento.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {summary.active_escrows.map(esc => {
                const isClient = esc.client_id === user.id;
                return (
                  <div key={esc.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900 text-base">
                          R$ {Number(esc.amount).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          {esc.status === 'em_custodia' ? 'Em Custódia Segura' : esc.status === 'em_disputa' ? 'Em Mediação' : 'Aguardando Pagamento'}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {isClient ? 'Você é o Contratante' : 'Você é o Prestador'}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-slate-700">
                        Pedido: <span className="font-bold text-teal-800">{esc.order_title}</span>
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Iniciado em {new Date(esc.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/pedidos/${esc.order_id}`)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl self-start sm:self-auto transition-colors"
                    >
                      <span>Ver Pedido</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: DEPOSIT VIA PIX */}
      {depositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Adicionar Saldo via PIX</h3>
                  <p className="text-[11px] text-slate-500">Crédito rápido e seguro na sua Carteira Trevia</p>
                </div>
              </div>
              <button
                onClick={() => setDepositModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {depositSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-sm">{depositSuccessMsg}</h4>
                <p className="text-xs text-emerald-700">Seu saldo foi atualizado imediatamente.</p>
              </div>
            ) : !activeDeposit ? (
              /* Step 1: Select Amount */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Selecione ou digite o valor do depósito:
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[20, 50, 100, 200].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setDepositAmount(val)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          depositAmount === val
                            ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="5"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseFloat(e.target.value) || '')}
                      placeholder="Outro valor..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Valor mínimo: R$ 5,00</span>
                </div>

                {depositError && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {depositError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreateDeposit}
                  disabled={depositLoading || !depositAmount || depositAmount < 5}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-sm active:scale-98 disabled:opacity-50"
                >
                  {depositLoading ? 'Gerando PIX...' : `Gerar PIX de R$ ${Number(depositAmount || 0).toFixed(2).replace('.', ',')}`}
                </button>
              </div>
            ) : (
              /* Step 2: Show QR Code & Official Key */
              <div className="space-y-4">
                <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-800 font-bold uppercase">Valor a Transferir</span>
                    <div className="text-2xl font-extrabold text-emerald-900">
                      R$ {Number(activeDeposit.amount).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  <div className="text-right text-[11px] text-emerald-800 font-medium">
                    Favorecido: <strong>Trevia Serviços</strong><br/>
                    Joinville, SC
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <img
                    src={activeDeposit.qr_code_url}
                    alt="QR Code PIX Trevia"
                    className="w-48 h-48 rounded-xl shadow-xs bg-white p-1"
                  />
                  <span className="text-[11px] text-slate-500 mt-2 font-medium">
                    Aponte a câmera do seu aplicativo bancário
                  </span>
                </div>

                {/* Chave Oficial Trevia */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">Chave PIX Oficial Trevia:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={summary.official_pix_key}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl font-mono text-xs text-slate-700 border border-slate-200 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(summary.official_pix_key, 'key')}
                      className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1 hover:bg-slate-800 transition-colors flex-shrink-0"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {/* PIX Copia e Cola */}
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700">Código PIX Copia e Cola:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={activeDeposit.pix_code}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl font-mono text-[10px] text-slate-700 border border-slate-200 select-all truncate"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeDeposit.pix_code, 'code')}
                      className="px-3 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl flex items-center space-x-1 hover:bg-teal-700 transition-colors flex-shrink-0"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                {depositError && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {depositError}
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="button"
                  onClick={handleConfirmDeposit}
                  disabled={confirmingDeposit}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-sm active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>{confirmingDeposit ? 'Validando Pagamento...' : 'Já Realizei o Pagamento via PIX'}</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL 2: WITHDRAW VIA PIX */}
      {withdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Solicitar Saque via PIX</h3>
                  <p className="text-[11px] text-slate-500">Transfira seu saldo disponível para sua conta bancária</p>
                </div>
              </div>
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {withdrawSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-sm">{withdrawSuccessMsg}</h4>
                <p className="text-xs text-emerald-700">Nossa equipe financeira já recebeu seu pedido de transferência.</p>
              </div>
            ) : (
              <form onSubmit={handleRequestWithdraw} className="space-y-4">
                
                {/* Available Balance Box */}
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Saldo Disponível</span>
                    <div className="text-xl font-extrabold text-slate-900">
                      R$ {Number(summary.wallet_balance).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(summary.wallet_balance.toFixed(2))}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Sacar Tudo
                  </button>
                </div>

                {/* Amount to withdraw */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor a Sacar (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="5"
                    max={summary.wallet_balance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0,00"
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Valor mínimo: R$ 5,00</span>
                </div>

                {/* PIX Key Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Chave PIX de Destino:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
                    {[
                      { id: 'cpf', label: 'CPF' },
                      { id: 'cnpj', label: 'CNPJ' },
                      { id: 'phone', label: 'Celular' },
                      { id: 'email', label: 'E-mail' },
                      { id: 'random', label: 'Aleatória' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPixKeyType(t.id)}
                        className={`py-1.5 px-2 font-bold rounded-xl border text-center transition-all ${
                          pixKeyType === t.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PIX Key Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Chave PIX:
                  </label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={
                      pixKeyType === 'cpf'
                        ? '000.000.000-00'
                        : pixKeyType === 'phone'
                        ? '(47) 90000-0000'
                        : pixKeyType === 'email'
                        ? 'seuemail@exemplo.com'
                        : 'Informe sua chave...'
                    }
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {withdrawError && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {withdrawError}
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>
                    O valor será debitado do seu saldo imediatamente e transferido para a chave PIX indicada após validação do sistema.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={withdrawLoading || !withdrawAmount || parseFloat(withdrawAmount) < 5 || parseFloat(withdrawAmount) > summary.wallet_balance || !pixKey.trim()}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-xl transition-all shadow-sm active:scale-98 disabled:opacity-50"
                >
                  {withdrawLoading ? 'Processando Saque...' : 'Confirmar e Solicitar Transferência PIX'}
                </button>

              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
