import React, { useState } from 'react';
import { X, CheckCircle, Zap, ShieldCheck, Copy, QrCode, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export default function RechargeModal({ isOpen, onClose, onSuccess }) {
  const { user, refreshMe } = useAuth();
  const [selectedPkg, setSelectedPkg] = useState('pro');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const packages = [
    {
      id: 'starter',
      name: 'Pacote Básico',
      credits: 3,
      price: '19,90',
      pricePerContact: 'R$ 6,63 por contato',
      highlight: false
    },
    {
      id: 'pro',
      name: 'Pacote Profissional',
      credits: 8,
      price: '39,90',
      pricePerContact: 'R$ 4,98 por contato',
      badge: 'Mais Escolhido',
      highlight: true
    },
    {
      id: 'turbo',
      name: 'Pacote Turbo',
      credits: 15,
      price: '59,90',
      pricePerContact: 'R$ 3,99 por contato',
      badge: 'Melhor Custo-Benefício',
      highlight: false
    }
  ];

  const currentPkg = packages.find(p => p.id === selectedPkg);
  const mockPixCode = `00020126580014br.gov.bcb.pix0136trevia-pix-key-${selectedPkg}-joinville5204000053039865405${currentPkg?.price.replace(',', '.')}5802BR5916TREVIA SERVICOS6009JOINVILLE62070503***6304`;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(mockPixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleConfirmPix = async () => {
    try {
      setLoading(true);
      const res = await api.radar.rechargeCredits(selectedPkg);
      await refreshMe();
      setConfirmed(true);
      setTimeout(() => {
        setConfirmed(false);
        if (onSuccess) onSuccess(res.total_credits);
        onClose();
      }, 1500);
    } catch (err) {
      alert(err.message || 'Erro ao processar recarga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Recarga de Créditos</h3>
              <p className="text-xs text-slate-500">Saldo atual: <strong>{user?.credits ?? 0} créditos</strong></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {confirmed ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-black text-slate-900">Recarga Confirmada com Sucesso!</h4>
            <p className="text-xs text-slate-600">Seus novos créditos já foram adicionados à sua conta.</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            
            {/* Escolha do Pacote */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Escolha seu Pacote PIX:
              </label>
              
              <div className="space-y-2">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between relative ${
                      selectedPkg === pkg.id
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{pkg.name}</span>
                        {pkg.badge && (
                          <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            {pkg.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {pkg.credits} contatos liberados • {pkg.pricePerContact}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">R$ {pkg.price}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">PIX Único</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chave PIX Copia e Cola */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PIX Copia e Cola (Aprovação Imediata)</span>
                </span>
                <span className="text-xs font-extrabold text-emerald-700">R$ {currentPkg?.price}</span>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={mockPixCode}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-500 truncate select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmPix}
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{loading ? 'Confirmando PIX...' : `Liberar ${currentPkg?.credits} Créditos Agora`}</span>
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-400 flex items-center justify-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Transação protegida e créditos liberados instantaneamente.</span>
            </p>

          </div>
        )}

      </div>
    </div>
  );
}
