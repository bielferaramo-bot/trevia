import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Printer,
  ShieldCheck,
  Star,
  MapPin,
  MessageCircle,
  ExternalLink,
  QrCode
} from 'lucide-react';

export default function DigitalCardModal({
  isOpen,
  onClose,
  profile,
  rating = { average_rating: 5, total_reviews: 0 },
  providerLevel = null
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !profile) return null;

  const profileUrl = `https://trevia.work/profissionais/${profile.slug || ''}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(profileUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = `👋 Olá! Sou *${profile.public_name}*, profissional em Joinville e região.\n\n⭐ Veja minhas avaliações de clientes e serviços no meu perfil oficial no Trevia:\n👉 ${profileUrl}\n\nSolicite seu orçamento diretamente comigo!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">Cartão de Visita Digital</h3>
              <p className="text-[11px] text-slate-500">Pronto para divulgar e imprimir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Card Container */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div
            id="trevia-digital-card"
            className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-500/30 space-y-5 text-center relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>

            {/* Trevia Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-black tracking-wider text-emerald-400 uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Trevia • Joinville</span>
              </div>
              <div className="flex items-center space-x-1.5">
                {providerLevel?.badge && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    {providerLevel.badge}
                  </span>
                )}
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Verificado
                </span>
              </div>
            </div>

            {/* Profile Avatar & Info */}
            <div className="space-y-2">
              <div className="relative mx-auto w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-lg bg-slate-800">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.public_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-extrabold text-2xl text-white">
                    {profile.public_name?.charAt(0) || 'P'}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-extrabold text-lg text-white tracking-tight flex items-center justify-center space-x-1">
                  <span>{profile.public_name}</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </h4>
                <p className="text-xs text-slate-300 font-medium">
                  {profile.categories && profile.categories.length > 0 ? profile.categories.join(' • ') : 'Serviços Especializados'}
                </p>
              </div>

              {/* Star Rating Badge */}
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 text-xs font-bold text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>{rating.average_rating > 0 ? rating.average_rating.toFixed(1) : '5.0'}</span>
                <span className="text-slate-300 text-[10px]">({rating.total_reviews} avaliações)</span>
              </div>

              <div className="flex items-center justify-center text-[11px] text-slate-400 space-x-1">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Joinville e Região • {profile.base_neighborhood || 'Centro'}</span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-3 rounded-2xl shadow-md w-fit mx-auto border border-emerald-500/20">
              <img
                src={qrCodeUrl}
                alt={`QR Code de ${profile.public_name}`}
                className="w-36 h-36 mx-auto block"
              />
            </div>

            <p className="text-[11px] text-slate-300 font-medium leading-relaxed max-w-xs mx-auto">
              Aponte a câmera do seu celular para ver fotos dos meus serviços e avaliações de outros clientes de Joinville.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>

            <button
              onClick={handleCopy}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition-colors border border-slate-200"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Cartão de Visita</span>
          </button>
        </div>

      </div>
    </div>
  );
}
