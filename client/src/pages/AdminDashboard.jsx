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
  Sparkles
} from 'lucide-react';

export default function AdminDashboard({ navigate }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('metrics'); // 'metrics', 'leads', 'categories', 'locations', 'reports'
  const [metrics, setMetrics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // New category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes, lRes, rRes, ldRes] = await Promise.all([
        api.admin.getMetrics(),
        api.admin.getCategories(),
        api.admin.getLocations(),
        api.admin.getReports(),
        api.leads.list().catch(() => ({ leads: [] }))
      ]);

      setMetrics(mRes.metrics);
      setCategories(cRes.categories || []);
      setLocations(lRes.locations || []);
      setReports(rRes.reports || []);
      setLeads(ldRes.leads || []);
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
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setTab('metrics')}
          className={`pb-3 transition-colors ${
            tab === 'metrics' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Indicadores do Sistema
        </button>
        <button
          onClick={() => setTab('leads')}
          className={`pb-3 transition-colors flex items-center space-x-1.5 ${
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
          className={`pb-3 transition-colors ${
            tab === 'categories' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Categorias ({categories.length})
        </button>
        <button
          onClick={() => setTab('locations')}
          className={`pb-3 transition-colors ${
            tab === 'locations' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Localidades ({locations.length})
        </button>
        <button
          onClick={() => setTab('reports')}
          className={`pb-3 transition-colors flex items-center space-x-1.5 ${
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
