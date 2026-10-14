import React, { useEffect, useState } from 'react';
import { Volume2, MapPin, DollarSign, Clock, ArrowRight, X, Sparkles, Navigation } from 'lucide-react';

export default function DispatchAlertModal({ order, onAccept, onDismiss }) {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!order) return;
    setTimeLeft(30);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [order]);

  if (!order) return null;

  const progressPercent = (timeLeft / 30) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border-2 border-emerald-500 overflow-hidden transform transition-all animate-bounceIn">
        
        {/* Top Header com Barra de Tempo estilo Uber */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white p-4 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400"></span>
              </span>
              <span className="text-xs uppercase font-extrabold tracking-wider bg-black/20 px-2.5 py-1 rounded-full border border-white/20 flex items-center space-x-1">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Chamado no Radar de Joinville</span>
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-200">
                {timeLeft}s
              </span>
              <button
                onClick={onDismiss}
                className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-2 text-lg font-black tracking-tight text-white flex items-center justify-between">
            <span>{order.title}</span>
          </div>

          {/* Barra de Progresso Regressiva */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
            <div
              className="h-full bg-amber-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Informações Principais do Chamado */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            
            {/* Valor Estimado */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center space-x-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>Valor Estimado</span>
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-950 mt-0.5">
                {order.estimated_budget ? `R$ ${Number(order.estimated_budget).toFixed(2)}` : 'A combinar'}
              </span>
            </div>

            {/* Localização e Distância */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                <Navigation className="w-3.5 h-3.5 text-teal-600" />
                <span>Distância / Bairro</span>
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-800 truncate mt-0.5">
                {order.neighborhood || 'Joinville'}
              </span>
              <span className="text-[11px] font-semibold text-teal-700">
                {order.distance_km ? `a ~${order.distance_km} km de você` : 'Região de Joinville'}
              </span>
            </div>
          </div>

          {/* Descrição resumida do trabalho */}
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed border border-slate-100 line-clamp-2">
            "{order.description}"
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Prazo: <strong className="text-slate-700 capitalize">{order.timeframe ? order.timeframe.replace('_', ' ') : 'Imediato'}</strong></span>
            </span>
            <span className="bg-teal-50 text-teal-800 font-semibold px-2.5 py-0.5 rounded-full border border-teal-200">
              {order.category_name || 'Serviço'}
            </span>
          </div>

          {/* Botões de Ação Estilo Uber */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => onAccept(order)}
              className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-2 transform hover:scale-[1.02]"
            >
              <span>ACEITAR CHAMADO / VER DETALHES</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onDismiss}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition-colors"
            >
              Recusar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
