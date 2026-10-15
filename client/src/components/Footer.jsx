import React from 'react';
import { Briefcase, ShieldCheck, MapPin, CheckCircle2, Heart } from 'lucide-react';

export default function Footer({ navigate }) {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-20 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white/95 px-3.5 py-1 rounded-2xl shadow-sm inline-flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Trevia Logo"
                  draggable="false"
                  className="h-10 w-auto object-contain select-none pointer-events-none"
                />
              </div>
            </div>
            <p className="text-slate-400 text-sm max-w-md leading-relaxed">
              Plataforma digital de serviços locais conectando clientes que precisam contratar com profissionais autônomos e trabalhadores independentes em Joinville e região metropolitana.
            </p>
            <div className="flex items-center space-x-2 text-xs text-teal-400 pt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>Joinville • Araquari • Jaraguá do Sul • São Francisco do Sul • SC</span>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Navegação</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button onClick={() => navigate('/')} className="hover:text-teal-400 transition-colors">
                  Início
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/pedidos')} className="hover:text-teal-400 transition-colors">
                  Explorar Pedidos
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/oportunidades')} className="hover:text-teal-400 transition-colors">
                  Oportunidades de Trabalho
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/pedidos/novo')} className="hover:text-teal-400 transition-colors">
                  Publicar um Serviço
                </button>
              </li>
            </ul>
          </div>

          {/* Transparency & Security */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-4">Transparência</h4>
            <ul className="space-y-2.5 text-xs text-slate-400 leading-relaxed">
              <li className="flex items-start space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span>Cadastro 100% gratuito para clientes e prestadores autônomos.</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <span>Privacidade protegida conforme as diretrizes da LGPD.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 space-y-1.5 leading-relaxed mb-8">
          <p className="font-semibold text-slate-300">Aviso Institucional:</p>
          <p>
            O <strong>Trevia</strong> é um intermediador de oportunidades e contatos locais. A plataforma não executa serviços, não garante contratações ou valores e não realiza cobranças pelos trabalhos realizados entre as partes. A negociação e a execução do serviço são de responsabilidade exclusiva dos usuários.
          </p>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Trevia — Conectando pessoas e serviços com transparência em Santa Catarina.</p>
          <p className="mt-2 sm:mt-0 flex items-center space-x-1">
            <span>Desenvolvido para fortalecer o trabalho autônomo local.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
