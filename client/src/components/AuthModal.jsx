import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { X, Lock, Mail, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthModal() {
  const { authModal, closeAuthModal, login, register, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState(authModal.tab || 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('client'); // 'client' or 'provider'

  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (authModal.tab) {
      setTab(authModal.tab);
    }
  }, [authModal.tab]);

  useEffect(() => {
    if (!authModal.isOpen) return;
    const clientId = window.TREVIA_CONFIG?.googleClientId || '';
    if (!clientId) return;

    let mounted = true;
    let timer = null;

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current || !mounted) return false;
      try {
        // Limpar qualquer elemento anterior para manter apenas 1 única caixa do Google
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            try {
              setLoading(true);
              await loginWithGoogle(response.credential, role);
            } catch (err) {
              setError(err.message || 'Falha ao autenticar com Google.');
            } finally {
              setLoading(false);
            }
          }
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: tab === 'login' ? 'continue_with' : 'signup_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        });
        return true;
      } catch (e) {
        console.warn('Erro ao carregar botão do Google:', e);
        return false;
      }
    };

    if (!renderGoogleButton()) {
      timer = setInterval(() => {
        if (renderGoogleButton()) {
          clearInterval(timer);
        }
      }, 100);
    }

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [authModal.isOpen, tab, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        if (!name.trim()) throw new Error('Informe seu nome completo.');
        if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
        await register({ name, email, password, phone, role });
      }
    } catch (err) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!authModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh] transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="Trevia Logo"
              draggable="false"
              className="h-9 w-auto object-contain select-none pointer-events-none"
            />
            <span className="text-xs bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
              Joinville e Região
            </span>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner de Contexto de Acesso */}
        {authModal.message && (
          <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-5 py-3 text-xs flex items-center space-x-2.5">
            <Lock className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span className="font-semibold leading-relaxed">{authModal.message}</span>
          </div>
        )}

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-1">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Entrar na Conta
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Criar Conta Gratuita
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Botão Oficial do Google (GSI) */}
          <div ref={googleBtnRef} className="w-full flex justify-center py-1 min-h-[44px]"></div>

          {/* Divisor "ou continue com e-mail" */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2.5 text-slate-400 font-semibold tracking-wider">
                ou com seu e-mail
              </span>
            </div>
          </div>

          {tab === 'register' && (
            <>
              {/* Profile Type Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Qual é o seu objetivo no Trevia?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('client')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === 'client'
                        ? 'border-teal-600 bg-teal-50/50 text-teal-900 font-medium ring-1 ring-teal-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="text-sm font-bold">Contratar Serviços</div>
                    <div className="text-xs text-slate-500">Publicar o que preciso</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('provider')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      role === 'provider'
                        ? 'border-teal-600 bg-teal-50/50 text-teal-900 font-medium ring-1 ring-teal-500'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="text-sm font-bold">Trabalhar / Autônomo</div>
                    <div className="text-xs text-slate-500">Oferecer meus serviços</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(47) 99999-9999"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-sm rounded-xl shadow-sm shadow-teal-700/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Processando...' : tab === 'login' ? 'Entrar com E-mail' : 'Concluir Cadastro Gratuito'}
          </button>

          <p className="text-center text-xs text-slate-500 pt-1">
            {tab === 'login' ? (
              <span>
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('register'); setError(''); }}
                  className="text-teal-600 font-semibold hover:underline"
                >
                  Cadastre-se grátis
                </button>
              </span>
            ) : (
              <span>
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => { setTab('login'); setError(''); }}
                  className="text-teal-600 font-semibold hover:underline"
                >
                  Fazer login
                </button>
              </span>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
