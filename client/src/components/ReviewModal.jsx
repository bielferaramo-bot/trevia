import React, { useState } from 'react';
import { api } from '../api.js';
import {
  Star,
  X,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MessageCircle,
  Award,
  Sparkles
} from 'lucide-react';

const PROVIDER_TAGS = [
  'Pontualidade ⏰',
  'Serviço Impecável ✨',
  'Preço Justo 💰',
  'Limpeza & Organização 🧹',
  'Muito Atencioso 🤝',
  'Profissionalismo 🛠️'
];

const CLIENT_TAGS = [
  'Comunicação Clara 💬',
  'Pagamento Pontual 💳',
  'Recomendo a Outros 👍',
  'Ambiente Agradável 🏡',
  'Muito Respeitoso ⭐'
];

export default function ReviewModal({
  isOpen,
  onClose,
  orderId,
  orderTitle,
  targetUserId,
  targetUserName,
  targetType = 'provider', // 'provider' or 'client'
  onSuccess
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const availableTags = targetType === 'provider' ? PROVIDER_TAGS : CLIENT_TAGS;

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getRatingLabel = (score) => {
    switch (score) {
      case 1: return 'Muito Ruim';
      case 2: return 'Ruim';
      case 3: return 'Regular';
      case 4: return 'Bom';
      case 5: return 'Excelente / Impecável';
      default: return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (comment.trim().length < 3) {
      setError('Por favor, escreva um breve comentário sobre o atendimento.');
      return;
    }

    setLoading(true);
    try {
      await api.reviews.create({
        order_id: orderId,
        target_user_id: targetUserId,
        rating,
        comment: comment.trim(),
        tags: selectedTags
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao enviar avaliação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-scaleUp my-auto max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200 select-none">
              <Sparkles className="w-3 h-3 text-emerald-300 pointer-events-none" />
              <span>Avaliação de Reputação</span>
            </div>
            <h3 className="text-base sm:text-xl font-extrabold">
              {targetType === 'provider' ? 'Avaliar Prestador de Serviços' : 'Avaliar Contratante'}
            </h3>
            <p className="text-xs text-emerald-100">
              {targetType === 'provider'
                ? `Como foi o trabalho de ${targetUserName}?`
                : `Como foi negociar com ${targetUserName}?`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div className="text-center space-y-2 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs font-bold text-slate-700 block">
              Sua Nota Geral:
            </span>

            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 focus:outline-none transform hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-200'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-black text-emerald-700 uppercase tracking-wide">
              {getRatingLabel(hoverRating || rating)}
            </div>
          </div>

          {/* Quality Tags */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Destaques Positivos (Selecione quantos quiser):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment Textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Seu Comentário / Relato: *
            </label>
            <textarea
              required
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                targetType === 'provider'
                  ? 'Ex: O Marcos chegou pontualmente, fez a troca dos disjuntores com muito capricho e cobrou exatamente o valor combinado. Super recomendo!'
                  : 'Ex: Cliente excelente! Comunicação muito rápida, tirou todas as dúvidas e efetuou o pagamento pontualmente. Recomendo a todos os profissionais.'
              }
              className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all resize-none text-slate-800"
            ></textarea>
          </div>

          {/* Footer CTAs */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center space-x-1.5 disabled:opacity-50"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{loading ? 'Enviando...' : 'Publicar Avaliação'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
