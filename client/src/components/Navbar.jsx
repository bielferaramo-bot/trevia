import React, { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { useLocation } from '../LocationContext.jsx';
import {
  Briefcase,
  PlusCircle,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  MapPin,
  ChevronDown,
  Layers,
  Search,
  Navigation
} from 'lucide-react';

export default function Navbar({ currentPath, navigate }) {
  const { user, logout, openAuthModal } = useAuth();
  const { userLocation, openLocationModal } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handlePublishClick = () => {
    if (!user) {
      openAuthModal('login', () => navigate('/pedidos/novo'), 'Acesse sua conta para publicar um pedido no Trevia');
      return;
    }
    navigate('/pedidos/novo');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & OLX-Style Location Pill */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-left group"
            >
              <img
                src="/logo.png"
                alt="Trevia Logo"
                className="h-9 sm:h-11 w-auto object-contain transform group-hover:scale-105 transition-transform duration-200"
              />
            </button>

            {/* Pill de Localização Estilo OLX */}
            <button
              onClick={openLocationModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200/90 text-emerald-900 text-xs font-bold transition-all shadow-2xs hover:shadow-xs active:scale-98"
              title="Clique para alterar sua localização ou ativar GPS"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[200px]">{userLocation.label}</span>
              <ChevronDown className="w-3 h-3 text-emerald-700/80 flex-shrink-0" />
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1 pl-2">
              <button
                onClick={() => navigate('/')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPath === '/' ? 'text-teal-700 bg-teal-50/70 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Início
              </button>
              <button
                onClick={() => navigate('/pedidos')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPath.startsWith('/pedidos') && currentPath !== '/pedidos/novo'
                    ? 'text-teal-700 bg-teal-50/70 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Ver Pedidos
              </button>
              <button
                onClick={() => navigate('/oportunidades')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPath === '/oportunidades'
                    ? 'text-teal-700 bg-teal-50/70 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Para Prestadores
              </button>
            </nav>
          </div>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* CTA Publicar Serviço */}
            <button
              onClick={handlePublishClick}
              className="inline-flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold shadow-sm shadow-teal-700/20 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publicar um Serviço</span>
            </button>

            {/* User status */}
            {!user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Entrar
                </button>
                <button
                  onClick={() => openAuthModal('register')}
                  className="px-3.5 py-2 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 rounded-xl transition-colors"
                >
                  Cadastrar Grátis
                </button>
              </div>
            ) : (
              <div className="relative pl-2 border-l border-slate-200">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 py-1.5 px-3 rounded-xl hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{user.name}</div>
                    <div className="text-[10px] text-slate-500 capitalize">
                      {user.role === 'admin' ? 'Administrador' : user.role === 'provider' ? 'Prestador' : 'Cliente'}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fadeIn"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    <button
                      onClick={() => { navigate('/minha-conta'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2 font-medium"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Minha Conta (Pedidos)</span>
                    </button>

                    <button
                      onClick={() => { navigate('/painel-profissional'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2 font-medium"
                    >
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span>Painel do Prestador</span>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => { navigate('/admin'); setUserDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 flex items-center space-x-2 font-medium"
                      >
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <span>Administração</span>
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={() => { logout(); setUserDropdownOpen(false); navigate('/'); }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-2 font-medium"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <div className="py-2 border-b border-slate-100 flex items-center space-x-2 text-xs text-teal-700 font-medium">
            <MapPin className="w-4 h-4 text-teal-600" />
            <span>Joinville, SC e região metropolitana</span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => { navigate('/'); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Início
            </button>
            <button
              onClick={() => { navigate('/pedidos'); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver Pedidos
            </button>
            <button
              onClick={() => { navigate('/oportunidades'); setMobileMenuOpen(false); }}
              className="w-full text-left py-2 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Área do Prestador
            </button>
          </div>

          <button
            onClick={() => { handlePublishClick(); setMobileMenuOpen(false); }}
            className="w-full py-2.5 px-4 rounded-xl bg-teal-600 text-white text-sm font-semibold text-center flex items-center justify-center space-x-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publicar um Serviço</span>
          </button>

          {!user ? (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }}
                className="py-2 text-center text-sm font-semibold text-slate-700 bg-slate-100 rounded-xl"
              >
                Entrar
              </button>
              <button
                onClick={() => { openAuthModal('register'); setMobileMenuOpen(false); }}
                className="py-2 text-center text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl"
              >
                Cadastrar Grátis
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              <div className="text-xs text-slate-500 px-3 pb-1">Conectado como {user.name}</div>
              <button
                onClick={() => { navigate('/minha-conta'); setMobileMenuOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Minha Conta (Meus Pedidos)
              </button>
              <button
                onClick={() => { navigate('/painel-profissional'); setMobileMenuOpen(false); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Painel do Prestador
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => { navigate('/admin'); setMobileMenuOpen(false); }}
                  className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  Administração
                </button>
              )}
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); navigate('/'); }}
                className="w-full text-left py-2 px-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
