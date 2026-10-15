import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';
import { authenticate } from '../auth.js';

export const professionalsRouter = express.Router();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

export function computeProviderLevel(reviewsCount = 0, avgRating = 5.0) {
  const count = Number(reviewsCount) || 0;
  const rating = Number(avgRating) || 5.0;

  if (count >= 15 && rating >= 4.8) {
    return {
      tier: 4,
      level: 'Diamante',
      badge: '💎 Prestador Diamante',
      color: 'cyan',
      description: 'Nível Máximo de Excelência em Joinville e Região',
      perks: [
        'Destaque no topo absoluto das buscas locais',
        'Selo Diamante Oficial de Alta Confiança',
        'Notificação prioritária instantânea de chamados no WhatsApp'
      ],
      nextLevel: null,
      progressPercent: 100
    };
  }

  if (count >= 8 && rating >= 4.7) {
    return {
      tier: 3,
      level: 'Ouro',
      badge: '🥇 Prestador Ouro',
      color: 'amber',
      description: 'Profissional com Alto Volume de Avaliações Positivas',
      perks: [
        'Destaque de recomendação nos perfis de Joinville',
        'Selo Ouro de Reputação Impecável',
        'Prioridade na fila de desbloqueio de pedidos'
      ],
      nextLevel: 'Diamante',
      progressPercent: Math.min(100, Math.round((count / 15) * 100))
    };
  }

  if (count >= 3 && rating >= 4.5) {
    return {
      tier: 2,
      level: 'Prata',
      badge: '🥈 Prestador Prata',
      color: 'slate',
      description: 'Profissional com Histórico Ativo e Avaliado',
      perks: [
        'Selo Prata Verificado no Perfil e Cartão Digital',
        'Acesso antecipado aos chamados do radar'
      ],
      nextLevel: 'Ouro',
      progressPercent: Math.min(100, Math.round((count / 8) * 100))
    };
  }

  return {
    tier: 1,
    level: 'Bronze',
    badge: '🥉 Prestador Bronze',
    color: 'orange',
    description: 'Perfil Verificado Trevia em Início de Trajetória',
    perks: [
      'Perfil público indexado nas buscas de Joinville',
      'Cartão de Visita Digital com QR Code'
    ],
    nextLevel: 'Prata',
    progressPercent: Math.min(100, Math.round((count / 3) * 100))
  };
}

// Public profile view
professionalsRouter.get('/:slug', (req, res) => {
  try {
    const profile = db.prepare(`
      SELECT
        p.id,
        p.user_id,
        p.public_name,
        p.slug,
        p.bio,
        p.categories_json,
        p.locations_json,
        p.contact_phone,
        p.whatsapp,
        p.portfolio_json,
        p.avatar_url,
        p.experience_years,
        p.payment_methods_json,
        p.is_verified,
        p.base_neighborhood,
        p.created_at,
        u.name as user_name,
        u.status as user_status
      FROM profiles p
      JOIN users u ON p.user_id = u.id
      WHERE p.slug = ? AND p.status = 'active' AND u.status = 'active'
    `).get(req.params.slug);

    if (!profile) {
      return res.status(404).json({ error: 'Perfil profissional não encontrado ou desativado.' });
    }

    const revStats = db.prepare(`
      SELECT COUNT(*) as count, AVG(rating) as avg_rating
      FROM reviews
      WHERE target_user_id = ?
    `).get(profile.user_id);

    const providerLevel = computeProviderLevel(revStats?.count, revStats?.avg_rating);

    res.json({
      profile: {
        id: profile.id,
        public_name: profile.public_name,
        slug: profile.slug,
        bio: profile.bio,
        categories: JSON.parse(profile.categories_json || '[]'),
        locations: JSON.parse(profile.locations_json || '[]'),
        contact_phone: profile.contact_phone,
        whatsapp: profile.whatsapp,
        portfolio: JSON.parse(profile.portfolio_json || '[]'),
        avatar_url: profile.avatar_url || '',
        experience_years: profile.experience_years ?? 2,
        payment_methods: JSON.parse(profile.payment_methods_json || '["pix","dinheiro","cartao"]'),
        is_verified: !!profile.is_verified,
        base_neighborhood: profile.base_neighborhood || 'Centro',
        member_since: profile.created_at,
        provider_level: providerLevel,
        reviews_stats: {
          total_reviews: revStats?.count || 0,
          average_rating: revStats?.avg_rating ? Number(revStats.avg_rating.toFixed(1)) : 5.0
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar perfil profissional.' });
  }
});

// Provider's own profile
professionalsRouter.get('/me/profile', authenticate, (req, res) => {
  try {
    let profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);

    if (!profile) {
      // Auto-create blank profile if not present
      const now = new Date().toISOString();
      const baseSlug = slugify(req.user.name || 'profissional');
      let slug = baseSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM profiles WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const id = 'prof-' + uuidv4();
      db.prepare(`
        INSERT INTO profiles (
          id, user_id, public_name, slug, bio, categories_json, locations_json,
          contact_phone, whatsapp, portfolio_json, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        id,
        req.user.id,
        req.user.name,
        slug,
        'Profissional autônomo disponível em Joinville e região.',
        JSON.stringify([]),
        JSON.stringify(['Joinville']),
        req.user.phone || '',
        req.user.phone || '',
        JSON.stringify([]),
        now,
        now
      );

      profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id);
    }

    const revStats = db.prepare(`
      SELECT COUNT(*) as count, AVG(rating) as avg_rating
      FROM reviews
      WHERE target_user_id = ?
    `).get(req.user.id);

    const providerLevel = computeProviderLevel(revStats?.count, revStats?.avg_rating);

    res.json({
      profile: {
        ...profile,
        categories: JSON.parse(profile.categories_json || '[]'),
        locations: JSON.parse(profile.locations_json || '[]'),
        portfolio: JSON.parse(profile.portfolio_json || '[]'),
        provider_level: providerLevel,
        reviews_stats: {
          total_reviews: revStats?.count || 0,
          average_rating: revStats?.avg_rating ? Number(revStats.avg_rating.toFixed(1)) : 5.0
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar perfil do prestador.' });
  }
});

// Update provider profile
professionalsRouter.put('/me/profile', authenticate, (req, res) => {
  try {
    const {
      public_name,
      bio,
      categories = [],
      locations = [],
      contact_phone,
      whatsapp,
      avatar_url,
      experience_years,
      payment_methods = ['pix', 'dinheiro', 'cartao'],
      base_neighborhood = 'Centro',
      portfolio,
      status = 'active'
    } = req.body;

    if (!public_name || !public_name.trim()) {
      return res.status(400).json({ error: 'O nome profissional é obrigatório.' });
    }

    let profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
    const now = new Date().toISOString();

    if (!profile) {
      const baseSlug = slugify(public_name);
      let slug = baseSlug;
      let counter = 1;
      while (db.prepare('SELECT id FROM profiles WHERE slug = ?').get(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      const id = 'prof-' + uuidv4();
      db.prepare(`
        INSERT INTO profiles (
          id, user_id, public_name, slug, bio, categories_json, locations_json,
          contact_phone, whatsapp, portfolio_json, avatar_url, experience_years,
          payment_methods_json, is_verified, base_neighborhood, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
      `).run(
        id,
        req.user.id,
        public_name.trim(),
        slug,
        bio ? bio.trim() : '',
        JSON.stringify(categories),
        JSON.stringify(locations),
        contact_phone || '',
        whatsapp || '',
        JSON.stringify(portfolio || []),
        avatar_url || '',
        Number(experience_years) || 2,
        JSON.stringify(payment_methods),
        base_neighborhood,
        status,
        now,
        now
      );
    } else {
      db.prepare(`
        UPDATE profiles SET
          public_name = ?,
          bio = ?,
          categories_json = ?,
          locations_json = ?,
          contact_phone = ?,
          whatsapp = ?,
          avatar_url = COALESCE(?, avatar_url),
          experience_years = COALESCE(?, experience_years),
          payment_methods_json = COALESCE(?, payment_methods_json),
          base_neighborhood = COALESCE(?, base_neighborhood),
          portfolio_json = COALESCE(?, portfolio_json),
          status = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        public_name.trim(),
        bio ? bio.trim() : '',
        JSON.stringify(categories),
        JSON.stringify(locations),
        contact_phone || '',
        whatsapp || '',
        avatar_url !== undefined ? avatar_url : null,
        experience_years !== undefined ? Number(experience_years) : null,
        payment_methods !== undefined ? JSON.stringify(payment_methods) : null,
        base_neighborhood !== undefined ? base_neighborhood : null,
        portfolio !== undefined ? JSON.stringify(portfolio) : null,
        status,
        now,
        profile.id
      );
    }

    if (avatar_url !== undefined || base_neighborhood !== undefined) {
      db.prepare(`
        UPDATE users 
        SET avatar_url = COALESCE(?, avatar_url),
            base_neighborhood = COALESCE(?, base_neighborhood),
            updated_at = ? 
        WHERE id = ?
      `).run(
        avatar_url !== undefined ? avatar_url : null,
        base_neighborhood !== undefined ? base_neighborhood : null,
        now,
        req.user.id
      );
    }

    // Welcome Bonus Gamification: Award 1 credit when completing profile for the 1st time
    let bonusAwarded = false;
    const userRec = db.prepare('SELECT credits, COALESCE(has_received_welcome_bonus, 0) as has_received_welcome_bonus FROM users WHERE id = ?').get(req.user.id);
    const cleanPhone = (whatsapp || '').replace(/\D/g, '');
    const isProfileComplete = 
      public_name && public_name.trim().length >= 3 &&
      bio && bio.trim().length >= 15 &&
      cleanPhone.length >= 10 &&
      Array.isArray(categories) && categories.length > 0;

    if (userRec && userRec.has_received_welcome_bonus === 0 && isProfileComplete) {
      db.prepare('UPDATE users SET credits = credits + 1, has_received_welcome_bonus = 1 WHERE id = ?').run(req.user.id);
      bonusAwarded = true;
      try {
        db.prepare(`
          INSERT INTO audit_logs (id, user_id, action, target_type, target_id, details)
          VALUES (?, ?, 'welcome_bonus_granted', 'user', ?, ?)
        `).run('log-' + uuidv4(), req.user.id, req.user.id, 'Ganhou 1º crédito grátis por completar 100% do perfil profissional');
      } catch (e) {}
    }

    const updated = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
    const revStats = db.prepare(`
      SELECT COUNT(*) as count, AVG(rating) as avg_rating
      FROM reviews
      WHERE target_user_id = ?
    `).get(req.user.id);
    const providerLevel = computeProviderLevel(revStats?.count, revStats?.avg_rating);

    res.json({
      profile: {
        ...updated,
        categories: JSON.parse(updated.categories_json || '[]'),
        locations: JSON.parse(updated.locations_json || '[]'),
        portfolio: JSON.parse(updated.portfolio_json || '[]'),
        payment_methods: JSON.parse(updated.payment_methods_json || '["pix","dinheiro","cartao"]'),
        provider_level: providerLevel
      },
      welcome_bonus_awarded: bonusAwarded,
      new_credits: userRec ? (userRec.credits + (bonusAwarded ? 1 : 0)) : 3,
      message: bonusAwarded 
        ? '🎉 Parabéns! Você completou seu perfil e ganhou seu 1º Crédito Grátis!' 
        : 'Perfil profissional atualizado com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao salvar perfil profissional:', err);
    res.status(500).json({ error: 'Erro ao salvar perfil profissional.' });
  }
});
