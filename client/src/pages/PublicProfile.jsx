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
  CheckCircle2,
  Star,
  ThumbsUp,
  Award,
  QrCode,
  Camera,
  Zap
} from 'lucide-react';
import DigitalCardModal from '../components/DigitalCardModal.jsx';

export default function PublicProfile({ slug, navigate }) {
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ average_rating: 0, total_reviews: 0, distribution: {} });
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.professionals.get(slug),
      api.categories.list()
    ])
      .then(async ([profRes, catsRes]) => {
        setProfile(profRes.profile);
        setCategories(catsRes.categories || []);

        if (profRes.profile && profRes.profile.user_id) {
          try {
            const revRes = await api.reviews.getByUser(profRes.profile.user_id);
            setReviews(revRes.reviews || []);
            setReviewStats(revRes.stats || { average_rating: 0, total_reviews: 0, distribution: {} });
          } catch (e) {
            console.error('Erro ao buscar avaliações:', e);
          }
        }
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-full overflow-hidden">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar</span>
      </button>

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 lg:p-8 space-y-6 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-3.5 sm:gap-4 min-w-0 w-full">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.public_name}
                draggable="false"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md flex-shrink-0 select-none pointer-events-none"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-slate-900 to-teal-800 text-white flex items-center justify-center font-extrabold text-2xl shadow-md flex-shrink-0 select-none pointer-events-none">
                {profile.public_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-2 min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight break-words mr-1">
                  {profile.public_name}
                </h1>
                {profile.is_verified && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200 select-none shrink-0" title="Identidade e WhatsApp verificados">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Verificado</span>
                  </span>
                )}
                {profile.provider_level && (
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border select-none shrink-0 ${
                      profile.provider_level.tier === 4 ? 'bg-cyan-50 text-cyan-900 border-cyan-300 shadow-2xs' :
                      profile.provider_level.tier === 3 ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs' :
                      profile.provider_level.tier === 2 ? 'bg-slate-100 text-slate-800 border-slate-300' :
                      'bg-orange-50 text-orange-800 border-orange-200'
                    }`}
                    title={profile.provider_level.description}
                  >
                    <span>{profile.provider_level.badge}</span>
                  </span>
                )}
                {reviewStats.total_reviews > 0 ? (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold select-none shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span>{reviewStats.average_rating.toFixed(1)} ({reviewStats.total_reviews})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-medium select-none shrink-0">
                    Novo Profissional
                  </span>
                )}
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-teal-50 text-teal-800 text-[11px] font-bold rounded-full border border-teal-200 select-none shrink-0" title="Ativo no Radar Trevia em Joinville">
                  <Zap className="w-3.5 h-3.5 text-teal-600 fill-teal-600 shrink-0" />
                  <span>Responde em ~10 min</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-2 text-xs text-slate-500">
                <span className="flex items-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-teal-600 shrink-0" />
                  <span>Base: {profile.base_neighborhood || 'Joinville'}</span>
                </span>
                {profile.experience_years > 0 && (
                  <span className="shrink-0">• {profile.experience_years} {profile.experience_years === 1 ? 'ano' : 'anos'} de experiência</span>
                )}
                <span className="shrink-0">• No Trevia desde {new Date(profile.member_since).toLocaleDateString('pt-BR')}</span>
              </div>

              {/* Formas de pagamento aceitas */}
              {profile.payment_methods && profile.payment_methods.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {profile.payment_methods.includes('pix') && (
                    <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold rounded-md select-none">
                      ✓ Aceita PIX
                    </span>
                  )}
                  {profile.payment_methods.includes('cartao') && (
                    <span className="px-2 py-0.5 bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold rounded-md select-none">
                      ✓ Aceita Cartão
                    </span>
                  )}
                  {profile.payment_methods.includes('dinheiro') && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md select-none">
                      ✓ Dinheiro
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Contact CTAs */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0 shrink-0">
            {profile.whatsapp && (
              <a
                href={`https://wa.me/55${profile.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Falar no WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => setCardModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
              title="Ver Cartão Digital com QR Code"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Cartão QR Code</span>
            </button>

            {profile.contact_phone && profile.contact_phone !== profile.whatsapp && (
              <a
                href={`tel:${profile.contact_phone.replace(/\D/g, '')}`}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{profile.contact_phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Presentation & Bio */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider select-none">
            Apresentação Profissional
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
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

        {/* Galeria de Fotos e Trabalhos (Antes & Depois) */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center space-x-1 text-xs font-bold text-teal-700">
                <Camera className="w-3.5 h-3.5" />
                <span>Trabalhos Realizados</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Galeria de Serviços & Antes e Depois
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Fotos reais de atendimentos em Joinville
            </span>
          </div>

          {!profile.portfolio || profile.portfolio.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-2">
              <Camera className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600 font-medium">
                Fotos de serviços anteriores e portfólio completo podem ser solicitados diretamente no WhatsApp do profissional.
              </p>
              {profile.whatsapp && (
                <a
                  href={`https://wa.me/55${profile.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Gostaria de ver fotos e orçamentos de serviços que você já realizou em Joinville.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Pedir Fotos no WhatsApp</span>
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile.portfolio.map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-3 p-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    )}
                  </div>

                  {item.image_before && item.image_after ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative rounded-xl overflow-hidden bg-slate-200 aspect-video select-none">
                        <img src={item.image_before} alt="Antes" draggable="false" className="w-full h-full object-cover select-none pointer-events-none" />
                        <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase select-none pointer-events-none">
                          Antes
                        </span>
                      </div>
                      <div className="relative rounded-xl overflow-hidden bg-slate-200 aspect-video select-none">
                        <img src={item.image_after} alt="Depois" draggable="false" className="w-full h-full object-cover select-none pointer-events-none" />
                        <span className="absolute bottom-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase select-none pointer-events-none">
                          Depois
                        </span>
                      </div>
                    </div>
                  ) : item.image_after || item.image ? (
                    <div className="rounded-xl overflow-hidden bg-slate-200 aspect-video select-none">
                      <img src={item.image_after || item.image} alt={item.title} draggable="false" className="w-full h-full object-cover select-none pointer-events-none" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Reviews Section */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center space-x-1 text-xs font-bold text-amber-700">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Reputação Verificada</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Avaliações de Clientes ({reviewStats.total_reviews})
              </h2>
            </div>

            {reviewStats.total_reviews > 0 && (
              <div className="flex items-center space-x-2 bg-amber-50 px-3 py-1.5 rounded-2xl border border-amber-200">
                <div className="text-xl font-black text-amber-900">
                  {reviewStats.average_rating.toFixed(1)}
                </div>
                <div className="flex flex-col">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${s <= Math.round(reviewStats.average_rating) ? 'fill-current' : 'text-slate-200 fill-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-amber-800 font-semibold">
                    {reviewStats.total_reviews} {reviewStats.total_reviews === 1 ? 'avaliação' : 'avaliações'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 text-center space-y-1.5">
              <p className="text-xs text-slate-500 font-medium">
                Este profissional ainda não possui avaliações registradas por clientes no Trevia.
              </p>
              <p className="text-[11px] text-slate-400">
                Após contratar um serviço, o cliente pode deixar uma avaliação pública de qualidade e pontualidade.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex text-amber-400">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-current' : 'text-slate-200 fill-slate-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rev.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "{rev.comment}"
                    </p>

                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {rev.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-bold text-slate-800">
                      {rev.reviewer_name}
                      {rev.reviewer_neighborhood ? ` • ${rev.reviewer_neighborhood}` : ''}
                    </span>
                    {rev.order_title && (
                      <span className="truncate max-w-[140px] text-slate-400" title={rev.order_title}>
                        {rev.order_title}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

      {/* Modal do Cartão de Visita Digital com QR Code */}
      <DigitalCardModal
        isOpen={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        profile={profile}
        rating={reviewStats}
        providerLevel={profile.provider_level}
      />
    </div>
  );
}
