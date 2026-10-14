import React, { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';
import { X, Lock, Mail, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthModal() {
  const { authModal, closeAuthModal, login, register, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState(authModal.tab || 'login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleNotice, setGoogleNotice] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('client'); // 'client' or 'provider'

  if (!authModal.isOpen) return null;

  const googleBtnRef = React.useRef(null);

  React.useEffect(() => {
    const clientId = window.TREVIA_CONFIG?.googleClientId || '';
    if (!clientId) return;

    let mounted = true;
    const timer = setInterval(() => {
      if (window.google?.accounts?.id && googleBtnRef.current && mounted) {
        clearInterval(timer);
        try {
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
            text: tab === 'login' ? 'signin_with' : 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });
        } catch (e) {
          console.warn('Erro ao carregar botão do Google:', e);
        }
      }
    }, 150);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [authModal.isOpen, tab, role]);

  const handleGoogleSignIn = () => {
    setError('');
    const clientId = window.TREVIA_CONFIG?.googleClientId || '';

    if (!clientId) {
      setGoogleNotice(true);
      return;
    }

    if (window.google?.accounts?.id) {
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
      window.google.accounts.id.prompt();
    } else {
      setError('Serviço do Google temporariamente indisponível.');
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh] transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <img
              src="/logo.png"
              alt="Trevia Logo"
              className="h-9 w-auto object-contain"
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

          {/* Divisor "ou" */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2.5 text-slate-400 font-medium">ou</span>
            </div>
          </div>

          {/* Container Oficial do Google GSI */}
          <div ref={googleBtnRef} className="w-full flex justify-center"></div>

          {/* Botão de fallback / direto do Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center space-x-2.5 py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm transition-all"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{tab === 'login' ? 'Entrar com o Google' : 'Cadastrar com o Google'}</span>
          </button>

          {googleNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs leading-relaxed animate-fadeIn">
              <div className="font-bold flex items-center space-x-1.5 mb-0.5">
                <span>✨ Botão do Google Integrado!</span>
              </div>
              <p>O fluxo de login com Google já está totalmente programado no Trevia. Para ativar a janela de seleção de conta do Google no ar, basta inserir o seu <strong>Client ID</strong> nas configurações do seu site quando quiser.</p>
            </div>
          )}

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
