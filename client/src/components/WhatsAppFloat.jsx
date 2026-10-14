import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function WhatsAppFloat() {
  const [showTooltip, setShowTooltip] = useState(true);

  // Número oficial de atendimento Trevia Joinville (configurável ou fallback padrão)
  const whatsappNumber = '5547988501714';
  const defaultMessage = encodeURIComponent('Olá! Gostaria de um orçamento para serviços em Joinville através do Trevia.');
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${defaultMessage}`;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end pointer-events-auto">
      
      {/* Balãozinho de Conversão CRO com chamada para ação */}
      {showTooltip && (
        <div className="mb-2 relative animate-fadeIn flex items-center bg-white text-slate-800 text-xs py-2 px-3.5 rounded-2xl shadow-xl border border-emerald-100 max-w-[240px] sm:max-w-xs">
          <div className="space-y-0.5 pr-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-extrabold text-emerald-700 text-[11px] uppercase tracking-wider">Atendimento Joinville</span>
            </div>
            <p className="font-bold text-slate-900 leading-tight">
              Precisa de ajuda ou orçamento rápido?
            </p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-slate-400 hover:text-slate-600 p-1 -mr-1"
            title="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Seta do balão */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-b border-r border-emerald-100 transform rotate-45"></div>
        </div>
      )}

      {/* Botão Flutuante do WhatsApp */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com atendimento Trevia no WhatsApp"
        className="group relative flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl shadow-emerald-600/40 transform hover:scale-105 active:scale-95 transition-all duration-300"
      >
        {/* Anel Pulsante de Atenção Visual */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-40 animate-ping pointer-events-none"></span>

        {/* Ícone Oficial WhatsApp */}
        <svg
          className="w-8 h-8 fill-current relative z-10"
          viewBox="0 0 24 24"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.697.073-2.197-.551-1.802-.751-2.946-2.589-3.036-2.708-.09-.12-1.028-1.37-1.028-2.613 0-1.242.65-1.854.88-2.106.23-.253.5-.316.666-.316.167 0 .334.002.48.009.155.008.363-.058.57.438.213.513.726 1.77.79 1.9.063.13.104.28.02.443-.083.164-.124.266-.248.411-.124.146-.262.326-.374.438-.124.125-.254.26-.109.51.145.25.644 1.062 1.38 1.72.949.845 1.748 1.107 1.998 1.232.25.125.395.105.542-.063.146-.168.625-.728.792-.98.167-.25.334-.209.562-.125.23.084 1.458.687 1.708.812.25.125.417.187.479.291.063.105.063.606-.081 1.011z"/>
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.95.56 3.77 1.53 5.31L2 22l4.82-1.48C8.3 21.49 10.09 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.74 0-3.37-.5-4.76-1.37l-.34-.21-2.85.88.88-2.77-.23-.37C3.76 14.77 3.2 13.43 3.2 12c0-4.85 3.95-8.8 8.8-8.8s8.8 3.95 8.8 8.8-3.95 8.8-8.8 8.8z"/>
        </svg>

        {/* Tooltip on Hover no Desktop */}
        <span className="hidden md:group-hover:block absolute right-16 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-md">
          Falar no WhatsApp
        </span>
      </a>

    </div>
  );
}
