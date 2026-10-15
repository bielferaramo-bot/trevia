import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  Zap,
  ShieldCheck,
  Copy,
  QrCode,
  Check,
  MessageCircle,
  Clock,
  ExternalLink,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

export const OFFICIAL_PIX_KEY = 'c8b36d11-7899-4ce7-999a-7ac85399dd71';
export const OFFICIAL_PIX_RECIPIENT = 'Trevia Serviços';
export const OFFICIAL_PIX_CITY = 'Joinville - SC';

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function buildPixEMV(key, amount, identifier = '***') {
  const formattedAmount = Number(amount).toFixed(2);
  const keyLen = String(key.length).padStart(2, '0');
  const merchantAccountInfo = `0014br.gov.bcb.pix01${keyLen}${key}`;
  const maiLen = String(merchantAccountInfo.length).padStart(2, '0');

  const amountStr = String(formattedAmount);
  const amountLen = String(amountStr.length).padStart(2, '0');

  const cleanName = 'TREVIA SERVICOS'.slice(0, 25);
  const nameLen = String(cleanName.length).padStart(2, '0');

  const cleanCity = 'JOINVILLE'.slice(0, 15);
  const cityLen = String(cleanCity.length).padStart(2, '0');

  const cleanId = (identifier || '***').slice(0, 25).replace(/[^a-zA-Z0-9]/g, '');
  const idField = `05${String(cleanId.length).padStart(2, '0')}${cleanId}`;
  const addDataField = `62${String(idField.length).padStart(2, '0')}${idField}`;

  const rawPayload = 
    `000201` +
    `26${maiLen}${merchantAccountInfo}` +
    `52040000` +
    `5303986` +
    `54${amountLen}${amountStr}` +
    `5802BR` +
    `59${nameLen}${cleanName}` +
    `60${cityLen}${cleanCity}` +
    `${addDataField}` +
    `6304`;

  return rawPayload + crc16(rawPayload);
}

export default function RechargeModal({ isOpen, onClose, onSuccess }) {
  const { user, refreshMe } = useAuth();
  const [selectedPkg, setSelectedPkg] = useState('pro');
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const [transactionProof, setTransactionProof] = useState('');
  const [rechargeOrder, setRechargeOrder] = useState(null);

  const packages = [
    {
      id: 'starter',
      name: 'Pacote Básico',
      credits: 3,
      price: 19.90,
      priceFormatted: '19,90',
      pricePerContact: 'R$ 6,63 por contato',
      highlight: false
    },
    {
      id: 'pro',
      name: 'Pacote Profissional',
      credits: 8,
      price: 39.90,
      priceFormatted: '39,90',
      pricePerContact: 'R$ 4,98 por contato',
      badge: 'Mais Escolhido',
      highlight: true
    },
    {
      id: 'turbo',
      name: 'Pacote Turbo',
      credits: 15,
      price: 59.90,
      priceFormatted: '59,90',
      pricePerContact: 'R$ 3,99 por contato',
      badge: 'Melhor Custo-Benefício',
      highlight: false
    }
  ];

  const currentPkg = packages.find(p => p.id === selectedPkg) || packages[1];
  const pixCode = buildPixEMV(OFFICIAL_PIX_KEY, currentPkg.price, rechargeOrder?.id || 'TREVIA');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(pixCode)}`;

  // Create or refresh recharge order on mount / package change
  useEffect(() => {
    if (isOpen && user) {
      api.radar.createRechargeOrder(selectedPkg)
        .then(res => setRechargeOrder(res.recharge))
        .catch(err => console.warn('Erro ao criar ordem de recarga:', err));
    }
  }, [isOpen, selectedPkg, user]);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(OFFICIAL_PIX_KEY);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleSubmitProof = async (e) => {
    if (e) e.preventDefault();
    if (!rechargeOrder?.id) return;

    setLoading(true);
    try {
      await api.radar.submitPaymentProof({
        recharge_id: rechargeOrder.id,
        proof_text: transactionProof.trim() || 'Comprovante enviado pelo usuário'
      });
      setProofSent(true);
    } catch (err) {
      alert(err.message || 'Erro ao registrar comprovante.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsAppProof = () => {
    const text = `👋 Olá, Equipe Trevia!\n\nAcabei de realizar o pagamento do PIX para recarga de créditos:\n\n📦 *Pacote:* ${currentPkg.name} (${currentPkg.credits} créditos)\n💰 *Valor:* R$ ${currentPkg.priceFormatted}\n🔑 *Chave Destino:* ${OFFICIAL_PIX_KEY}\n👤 *Nome:* ${user?.name || 'Prestador'}\n📧 *E-mail:* ${user?.email || ''}\n🔖 *ID do Pedido:* ${rechargeOrder?.id || 'N/A'}\n\nEnvio em anexo o comprovante para liberação dos meus créditos. Obrigado!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    handleSubmitProof();
  };

  // Admin instant bypass for testing
  const handleAdminBypass = async () => {
    if (user?.role !== 'admin') return;
    try {
      setLoading(true);
      const res = await api.radar.rechargeCredits(selectedPkg);
      await refreshMe();
      if (onSuccess) onSuccess(res.total_credits);
      alert(`⚡ Modo Administrador: ${res.added_credits} créditos adicionados com sucesso!`);
      onClose();
    } catch (err) {
      alert(err.message || 'Erro no bypass admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Recarga Segura de Créditos</h3>
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

        {proofSent ? (
          <div className="p-6 sm:p-8 text-center space-y-4 overflow-y-auto">
            <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Pagamento em Análise
              </span>
              <h4 className="text-lg font-black text-slate-900 mt-1">
                Comprovante Registrado!
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                Identificamos sua solicitação de recarga de <strong>{currentPkg.credits} créditos (R$ {currentPkg.priceFormatted})</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-left space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500">Beneficiário:</span>
                <span className="font-bold">{OFFICIAL_PIX_RECIPIENT}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chave PIX:</span>
                <span className="font-mono text-[11px] font-semibold">{OFFICIAL_PIX_KEY}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Pago:</span>
                <span className="font-black text-emerald-700">R$ {currentPkg.priceFormatted}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Assim que a entrada do PIX for conferida na conta, seus créditos serão ativados automaticamente. Você também pode enviar o comprovante diretamente no WhatsApp para agilizar:
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleShareWhatsAppProof}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Comprovante no WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Fechar e Aguardar Liberação
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
            
            {/* Escolha do Pacote */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Selecione o Pacote de Créditos:
              </label>
              
              <div className="space-y-2">
                {packages.map(pkg => (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg.id)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between relative ${
                      selectedPkg === pkg.id
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{pkg.name}</span>
                        {pkg.badge && (
                          <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                            {pkg.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {pkg.credits} contatos liberados • {pkg.pricePerContact}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-slate-900">R$ {pkg.priceFormatted}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">PIX</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dados do PIX para Transferência */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center sm:text-left">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Pague via PIX para sua conta</span>
                </span>
                <span className="text-xs font-black text-emerald-700">R$ {currentPkg.priceFormatted}</span>
              </div>

              {/* QR Code Container */}
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs w-fit mx-auto">
                <img
                  src={qrCodeUrl}
                  alt="QR Code PIX Trevia"
                  className="w-36 h-36 mx-auto block"
                />
              </div>

              {/* Chave PIX Oficial */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-600">Chave PIX Oficial (Aleatória):</span>
                  <span className="text-slate-400 text-[10px]">{OFFICIAL_PIX_RECIPIENT} • {OFFICIAL_PIX_CITY}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={OFFICIAL_PIX_KEY}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[11px] font-mono text-slate-700 truncate select-all font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1 shrink-0"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey ? 'Copiada!' : 'Copiar Chave'}</span>
                  </button>
                </div>
              </div>

              {/* PIX Copia e Cola */}
              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-slate-600 block">PIX Copia e Cola com Valor Exato:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={pixCode}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-mono text-slate-500 truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center space-x-1 shrink-0"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Confirmação e Envio de Comprovante */}
            <form onSubmit={handleSubmitProof} className="space-y-2.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">
                3. Já realizou a transferência PIX?
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={transactionProof}
                  onChange={(e) => setTransactionProof(e.target.value)}
                  placeholder="ID da transação (opcional) ou seu nome"
                  className="flex-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-600"
                />

                <button
                  type="button"
                  onClick={handleShareWhatsAppProof}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar Comprovante</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center space-x-1.5"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{loading ? 'Registrando...' : 'Confirmar Envio do PIX'}</span>
              </button>
            </form>

            {/* Admin Override Test Pill */}
            {user?.role === 'admin' && (
              <div className="pt-2 border-t border-slate-100 flex justify-center">
                <button
                  type="button"
                  onClick={handleAdminBypass}
                  className="text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Aprovar Imediatamente (Modo Administrador)</span>
                </button>
              </div>
            )}

            <p className="text-center text-[10px] text-slate-400 flex items-center justify-center space-x-1 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>O dinheiro cai diretamente na conta do Trevia. Liberação após conferência.</span>
            </p>

          </div>
        )}

      </div>
    </div>
  );
}
