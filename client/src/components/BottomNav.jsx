import React from 'react';
import { useAuth } from '../AuthContext.jsx';
import { Home, FileText, PlusCircle, Briefcase, User, Wallet, Radio, ArrowLeftRight } from 'lucide-react';

export default function BottomNav({ currentPath, navigate }) {
  const { user, userMode, toggleMode, openAuthModal } = useAuth();

  const handlePublish = () => {
    if (!user) {
      openAuthModal('login', () => navigate('/pedidos/novo'), 'Acesse sua conta para publicar um pedido no Trevia');
      return;
    }
    navigate('/pedidos/novo');
  };

  const handleAccount = () => {
    if (!user) {
      openAuthModal('login');
    } else if (userMode === 'provider') {
      navigate('/painel-profissional');
    } else {
      navigate('/minha-conta');
    }
  };

  const handleSwitchMode = () => {
    const next = toggleMode();
    if (next === 'provider' && currentPath === '/minha-conta') navigate('/painel-profissional');
    if (next === 'client' && currentPath === '/painel-profissional') navigate('/minha-conta');
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))]">
      {/* Discreet Mode Indicator & Switcher Banner */}
      <div className={`flex items-center justify-between px-3 py-1 text-[10px] font-semibold border-b ${
        userMode === 'provider' ? 'bg-slate-900 text-slate-200 border-slate-800' : 'bg-emerald-50 text-emerald-900 border-emerald-100'
      }`}>
        <span className="flex items-center space-x-1">
          {userMode === 'provider' ? (
            <>
              <Briefcase className="w-3 h-3 text-emerald-400" />
              <span>Modo Prestador Ativo</span>
            </>
          ) : (
            <>
              <User className="w-3 h-3 text-emerald-600" />
              <span>Modo Contratante Ativo</span>
            </>
          )}
        </span>
        <button
          onClick={handleSwitchMode}
          className="font-extrabold underline flex items-center space-x-1"
        >
          <span>{userMode === 'provider' ? 'Mudar p/ Contratante' : 'Mudar p/ Prestador'}</span>
          <ArrowLeftRight className="w-2.5 h-2.5" />
        </button>
      </div>

      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto pt-1">
        {userMode === 'client' ? (
          <>
            {/* Início */}
            <button
              onClick={() => navigate('/')}
              className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
                currentPath === '/' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Home className={`w-5 h-5 mb-0.5 ${currentPath === '/' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              <span>Início</span>
            </button>

            {/* Serviços */}
            <button
              onClick={() => navigate('/pedidos')}
              className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
                currentPath.startsWith('/pedidos') && currentPath !== '/pedidos/novo'
                  ? 'text-emerald-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className={`w-5 h-5 mb-0.5 ${currentPath.startsWith('/pedidos') && currentPath !== '/pedidos/novo' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              <span>Serviços</span>
            </button>

            {/* Publicar CTA */}
            <button
              onClick={handlePublish}
              className="flex flex-col items-center -mt-4 py-1 px-2 text-[10px] font-bold text-emerald-800"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-700/30">
                <PlusCircle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <span className="mt-0.5">Publicar</span>
            </button>

            {/* Minha Carteira */}
            <button
              onClick={() => (user ? navigate('/carteira') : openAuthModal('login'))}
              className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
                currentPath === '/carteira' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wallet className={`w-5 h-5 mb-0.5 ${currentPath === '/carteira' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              <span>Carteira</span>
            </button>

            {/* Conta */}
            <button
              onClick={handleAccount}
              className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
                currentPath === '/minha-conta' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className={`w-5 h-5 mb-0.5 ${currentPath === '/minha-conta' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              <span>{user ? 'Pedidos' : 'Entrar'}</span>
            </button>
          </>
        ) : (
          <>
            {/* Radar Prestador */}
            <button
              onClick={() => navigate('/oportunidades')}
              className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors relative ${
                currentPath === '/oportunidades' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Briefcase className={`w-5 h-5 mb-0.5 ${currentPath === '/oportunidades' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute -top-0.5 -right-0.5 animate-pulse"></span>
              </div>
              <span>Radar</span>
            </button>

            {/* Pedidos para Orçar */}
            <button
              onClick={() => navigate('/pedidos')}
              className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
                currentPath.startsWith('/pedidos') ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className={`w-5 h-5 mb-0.5 ${currentPath.startsWith('/pedidos') ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              <span>Pedidos</span>
            </button>

            {/* Radar CTA Central */}
            <button
              onClick={() => navigate('/oportunidades')}
              className="flex flex-col items-center -mt-4 py-1 px-2 text-[10px] font-bold text-slate-900"
            >
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-900 to-slate-800 text-emerald-400 flex items-center justify-center shadow-md">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <span className="mt-0.5">Oportunidades</span>
            </button>

            {/* Carteira PIX */}
            <button
              onClick={() => (user ? navigate('/carteira') : openAuthModal('login'))}
              className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
                currentPath === '/carteira' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wallet className={`w-5 h-5 mb-0.5 ${currentPath === '/carteira' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              <span>Ganhos</span>
            </button>

            {/* Painel Pro */}
            <button
              onClick={handleAccount}
              className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
                currentPath === '/painel-profissional' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className={`w-5 h-5 mb-0.5 ${currentPath === '/painel-profissional' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
              <span>{user ? 'Painel Pro' : 'Entrar'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
