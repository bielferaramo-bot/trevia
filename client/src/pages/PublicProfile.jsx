import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import {
  Briefcase,
  MapPin,
  Calendar,
  MessageCircle,
  Phone,
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

export default function PublicProfile({ slug, navigate }) {
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.professionals.get(slug),
      api.categories.list()
    ])
      .then(([profRes, catsRes]) => {
        setProfile(profRes.profile);
        setCategories(catsRes.categories || []);
      })
      .catch(err => setError(err.message || 'Perfil não encontrado.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-sm text-slate-400">
        Carregando perfil profissional...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="font-bold text-slate-800">Perfil Não Encontrado</h3>
        <p className="text-xs text-slate-500">Este prestador de serviços pode ter desativado seu perfil ou o link está incorreto.</p>
        <button
          onClick={() => navigate('/pedidos')}
          className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl"
        >
          Voltar para pedidos
        </button>
      </div>
    );
  }

  // Map category IDs to names
  const categoryNames = profile.categories.map(catId => {
    const c = categories.find(cat => cat.id === catId);
    return c ? c.name : catId;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar</span>
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start space-x-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.public_name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-slate-900 to-teal-800 text-white flex items-center justify-center font-extrabold text-2xl shadow-md flex-shrink-0">
                {profile.public_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {profile.public_name}
                </h1>
                {profile.is_verified && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200" title="Identidade e WhatsApp verificados">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verificado</span>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                <span className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-teal-600" />
                  <span>Base: {profile.base_neighborhood || 'Joinville'}</span>
                </span>
                {profile.experience_years > 0 && (
                  <span>• {profile.experience_years} {profile.experience_years === 1 ? 'ano' : 'anos'} de experiência</span>
                )}
                <span>• No Trevia desde {new Date(profile.member_since).toLocaleDateString('pt-BR')}</span>
              </div>

              {/* Formas de pagamento aceitas */}
              {profile.payment_methods && profile.payment_methods.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.payment_methods.includes('pix') && (
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold rounded-md">
                      ✓ Aceita PIX
                    </span>
                  )}
                  {profile.payment_methods.includes('cartao') && (
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold rounded-md">
                      ✓ Aceita Cartão
                    </span>
                  )}
                  {profile.payment_methods.includes('dinheiro') && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md">
                      ✓ Dinheiro
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact CTAs */}
          <div className="flex flex-wrap items-center gap-2">
            {profile.whatsapp && (
              <a
                href={`https://wa.me/55${profile.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Falar no WhatsApp</span>
              </a>
            )}

            {profile.contact_phone && profile.contact_phone !== profile.whatsapp && (
              <a
                href={`tel:${profile.contact_phone.replace(/\D/g, '')}`}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{profile.contact_phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Presentation & Bio */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Apresentação Profissional
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            {profile.bio || 'Profissional autônomo atuando em Joinville e região.'}
          </p>
        </div>

        {/* Specialties / Categories */}
        {categoryNames.length > 0 && (
          <div className="space-y-2 pt-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Áreas de Atuação
            </h2>
            <div className="flex flex-wrap gap-2">
              {categoryNames.map((name, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full text-xs font-semibold"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cities served */}
        {profile.locations && profile.locations.length > 0 && (
          <div className="space-y-2 pt-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Regiões Atendidas
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.locations.map((loc, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium flex items-center space-x-1"
                >
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{loc}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Safety & Trust Box */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start space-x-3 text-xs text-slate-600 leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-bold text-slate-800">Dicas para uma boa contratação:</span>
            <p className="mt-0.5">
              Combine escopo, cronograma, materiais e forma de pagamento de forma clara antes do início do serviço. O Trevia conecta você aos profissionais, mas a execução é acordada diretamente entre as partes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
