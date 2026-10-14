import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '../LocationContext.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../api.js';
import {
  BellRing,
  Volume2,
  VolumeX,
  Zap,
  MapPin,
  Clock,
  DollarSign,
  ArrowRight,
  X,
  CheckCircle,
  Radio
} from 'lucide-react';

/**
 * Toca o som característico de chamado (Chime melódico estilo Uber/99)
 * Usando Web Audio API nativa (sem dependência de arquivo externo)
 */
function playUberChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Tom 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tom 2: E5 (659.25 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.15);
    gain2.gain.setValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);

    // Tom 3: G5 (783.99 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(783.99, now + 0.3);
    gain3.gain.setValueAtTime(0.35, now + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.3);
    osc3.stop(now + 0.7);

    // Vibração no celular
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (err) {
    console.warn('[UberAlert] Erro ao emitir som de notificação:', err);
  }
}

export default function UberRideAlert({ navigate }) {
  const { user } = useAuth();
  const { getDistanceTo } = useLocation();

  const [isRadarActive, setIsRadarActive] = useState(() => {
    return localStorage.getItem('trevia_uber_radar') !== 'false';
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeAlert, setActiveAlert] = useState(null);
  const seenOrderIds = useRef(new Set());
  const initialLoadDone = useRef(false);

  const toggleRadar = () => {
    const next = !isRadarActive;
    setIsRadarActive(next);
    localStorage.setItem('trevia_uber_radar', next.toString());
  };

  // Escuta periódica de novos pedidos abertos (Polling inteligente a cada 10s)
  useEffect(() => {
    if (!isRadarActive) return;

    const checkNewOrders = async () => {
      try {
        const res = await api.orders.list({ status: 'aberto', limit: 3, sort: 'recent' });
        if (!res || !res.orders || res.orders.length === 0) return;

        // Na primeira execução apenas memoriza os IDs existentes para não tocar alerta retroativo
        if (!initialLoadDone.current) {
          res.orders.forEach(o => seenOrderIds.current.add(o.id));
          initialLoadDone.current = true;
          return;
        }

        // Procura pedidos recentes ainda não vistos
        for (const order of res.orders) {
          if (!seenOrderIds.current.has(order.id)) {
            seenOrderIds.current.add(order.id);

            // Não notifica se o usuário for o próprio criador do pedido
            if (user && user.id === order.client_id) continue;

            // Calcula distância até o pedido
            const distInfo = getDistanceTo ? getDistanceTo(order.city, order.neighborhood) : null;

            setActiveAlert({
              ...order,
              distanceText: distInfo ? distInfo.formattedText : null,
              distanceKm: distInfo ? distInfo.distanceKm : null
            });

            // Toca o som do chamado estilo Uber
            if (soundEnabled) {
              playUberChimeSound();
            }
            break;
          }
        }
      } catch (err) {
        // Silencioso em caso de falha transitória
      }
    };

    checkNewOrders();
    const interval = setInterval(checkNewOrders, 10000);
    return () => clearInterval(interval);
  }, [isRadarActive, soundEnabled, user]);

  return (
    <>
      {/* O POPUP DE CHAMADO ESTILO UBER */}
      {activeAlert && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500 text-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4 animate-bounce-short">
            {/* Top Bar do Alerta */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  🔔 NOVO SERVIÇO NO SEU RAIO!
                </span>
              </div>

              <button
                onClick={() => setActiveAlert(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações Centrais do Chamado */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block">
                {activeAlert.category_name || 'Serviço Local'}
              </span>

              <h3 className="text-xl font-black text-white leading-snug">
                {activeAlert.title}
              </h3>

              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {activeAlert.description}
              </p>
            </div>

            {/* Detalhes de Distância e Prazo */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/90 rounded-2xl border border-slate-700/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Distância</span>
                <span className="font-bold text-emerald-400 flex items-center mt-0.5">
                  <MapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                  <span>{activeAlert.distanceText || `${activeAlert.neighborhood || activeAlert.city}`}</span>
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Orçamento Estimado</span>
                <span className="font-extrabold text-white flex items-center mt-0.5">
                  {activeAlert.estimated_budget
                    ? `R$ ${Number(activeAlert.estimated_budget).toFixed(2)}`
                    : 'A combinar'}
                </span>
              </div>
            </div>

            {/* Botões de Ação Imediata */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  const targetId = activeAlert.id;
                  setActiveAlert(null);
                  navigate(`/pedidos/${targetId}`);
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-98 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
              >
                <span>ACEITAR E ENVIAR ORÇAMENTO</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>

              <button
                onClick={() => setActiveAlert(null)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Dispensar este chamado
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
