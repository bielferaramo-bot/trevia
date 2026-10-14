import React from 'react';
import { useAuth } from '../AuthContext.jsx';
import { Home, FileText, PlusCircle, Briefcase, User } from 'lucide-react';

export default function BottomNav({ currentPath, navigate }) {
  const { user, openAuthModal } = useAuth();

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
    } else {
      navigate('/minha-conta');
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 pt-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] shadow-lg">
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto">
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

        {/* Pedidos */}
        <button
          onClick={() => navigate('/pedidos')}
          className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
            currentPath.startsWith('/pedidos') && currentPath !== '/pedidos/novo'
              ? 'text-emerald-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className={`w-5 h-5 mb-0.5 ${currentPath.startsWith('/pedidos') && currentPath !== '/pedidos/novo' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
          <span>Pedidos</span>
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

        {/* Oportunidades */}
        <button
          onClick={() => navigate('/oportunidades')}
          className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
            currentPath === '/oportunidades' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className={`w-5 h-5 mb-0.5 ${currentPath === '/oportunidades' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
          <span>Trabalhar</span>
        </button>

        {/* Conta */}
        <button
          onClick={handleAccount}
          className={`flex flex-col items-center py-1.5 px-2 text-[10px] font-semibold transition-colors ${
            currentPath === '/minha-conta' || currentPath === '/painel-profissional'
              ? 'text-emerald-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className={`w-5 h-5 mb-0.5 ${currentPath === '/minha-conta' || currentPath === '/painel-profissional' ? 'text-emerald-600 stroke-[2.5]' : ''}`} />
          <span>{user ? 'Conta' : 'Entrar'}</span>
        </button>
      </div>
    </div>
  );
}
