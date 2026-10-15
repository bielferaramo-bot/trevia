import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'trevia.db');

export const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for safety and performance
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client', -- 'client', 'provider', 'both', 'admin'
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    display_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS locations (
    id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'SC',
    neighborhoods_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    public_name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    bio TEXT,
    categories_json TEXT NOT NULL DEFAULT '[]',
    locations_json TEXT NOT NULL DEFAULT '[]',
    contact_phone TEXT,
    whatsapp TEXT,
    portfolio_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category_id TEXT NOT NULL,
    city TEXT NOT NULL,
    neighborhood TEXT,
    timeframe TEXT, -- 'urgente', 'esta_semana', 'quinze_dias', 'a_combinar'
    estimated_budget REAL,
    status TEXT NOT NULL DEFAULT 'aberto', -- 'aberto', 'em_negociacao', 'concluido', 'cancelado'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT,
    FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    message TEXT NOT NULL,
    proposed_value REAL,
    estimated_time TEXT,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'aceita', 'recusada'
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(provider_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(order_id, provider_id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'order', 'profile', 'proposal'
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'revisado', 'ignorado', 'resolvido'
    created_at TEXT NOT NULL,
    FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS provider_alerts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    category_id TEXT,
    locations_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS unlocked_contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, order_id)
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    neighborhood TEXT NOT NULL,
    details TEXT,
    source TEXT NOT NULL DEFAULT 'express_home',
    status TEXT NOT NULL DEFAULT 'novo', -- 'novo', 'em_contato', 'convertido', 'arquivado'
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    reviewer_id TEXT NOT NULL,
    target_user_id TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'provider' or 'client'
    rating INTEGER NOT NULL,   -- 1 to 5
    comment TEXT NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(target_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(order_id, reviewer_id, target_user_id)
  );

  CREATE TABLE IF NOT EXISTS credit_refunds (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'aprovado', -- 'aprovado', 'pendente', 'rejeitado'
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_category ON orders(category_id);
  CREATE INDEX IF NOT EXISTS idx_orders_city ON orders(city);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_proposals_order ON proposals(order_id);
  CREATE INDEX IF NOT EXISTS idx_proposals_provider ON proposals(provider_id);
  CREATE INDEX IF NOT EXISTS idx_alerts_category ON provider_alerts(category_id);
  CREATE INDEX IF NOT EXISTS idx_unlocked_user ON unlocked_contacts(user_id);
  CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_user_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_credit_refunds_user ON credit_refunds(user_id);
  CREATE INDEX IF NOT EXISTS idx_credit_refunds_order ON credit_refunds(order_id);

  CREATE TABLE IF NOT EXISTS escrow_deposits (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    provider_id TEXT,
    amount REAL NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_custodia', 'liberado', 'reembolsado', 'em_disputa'
    pix_code TEXT,
    qr_code_url TEXT,
    created_at TEXT NOT NULL,
    funded_at TEXT,
    released_at TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(provider_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_escrow_order ON escrow_deposits(order_id);
  CREATE INDEX IF NOT EXISTS idx_escrow_client ON escrow_deposits(client_id);
  CREATE INDEX IF NOT EXISTS idx_escrow_provider ON escrow_deposits(provider_id);
`);

// Safe incremental column additions for user credits, avatars, and profile preferences
try { db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 3`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN base_neighborhood TEXT DEFAULT 'Centro'`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN has_received_welcome_bonus INTEGER NOT NULL DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE orders ADD COLUMN max_unlocks INTEGER NOT NULL DEFAULT 3`); } catch (e) {}

try { db.exec(`ALTER TABLE profiles ADD COLUMN avatar_url TEXT DEFAULT ''`); } catch (e) {}
try { db.exec(`ALTER TABLE profiles ADD COLUMN experience_years INTEGER DEFAULT 2`); } catch (e) {}
try { db.exec(`ALTER TABLE profiles ADD COLUMN payment_methods_json TEXT NOT NULL DEFAULT '["pix","dinheiro","cartao"]'`); } catch (e) {}
try { db.exec(`ALTER TABLE profiles ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 1`); } catch (e) {}
try { db.exec(`ALTER TABLE profiles ADD COLUMN base_neighborhood TEXT DEFAULT 'Centro'`); } catch (e) {}


// Seed default initial categories & Joinville locations if empty
export function seedInitialData() {
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  if (catCount === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, slug, description, icon, is_active, display_order)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);

    const defaultCats = [
      ['cat-pedreiro', 'Pedreiro e Alvenaria', 'pedreiro-alvenaria', 'Construção, reformas, reboco, muros e fundações', 'Hammer', 1],
      ['cat-pintor', 'Pintura Residencial e Comercial', 'pintura', 'Pintura interna, externa, texturas e acabamentos finos', 'Paintbrush', 2],
      ['cat-eletricista', 'Eletricista', 'eletricista', 'Instalação elétrica, troca de fiação, disjuntores e luminárias', 'Zap', 3],
      ['cat-encanador', 'Encanador e Hidráulica', 'encanador', 'Desentupimentos, conserto de vazamentos e tubulações', 'Droplets', 4],
      ['cat-reparos', 'Reparos e Marido de Aluguel', 'reparos-marido-de-aluguel', 'Pequenos reparos residenciais, fixação de suportes e consertos', 'Wrench', 5],
      ['cat-moveis', 'Montagem de Móveis', 'montagem-de-moveis', 'Montagem e desmontagem de armários, guarda-roupas e estantes', 'Package', 6],
      ['cat-limpeza', 'Limpeza e Faxina', 'limpeza-faxina', 'Faxina residencial, pós-obra e higienização', 'Sparkles', 7],
      ['cat-jardineiro', 'Jardinagem e Poda', 'jardinagem', 'Corte de grama, limpeza de terreno, poda e manutenção de jardins', 'Trees', 8],
      ['cat-ar', 'Ar Condicionado e Climatização', 'ar-condicionado', 'Instalação, manutenção e higienização de ar condicionado', 'Wind', 9],
      ['cat-serralheiro', 'Serralheria e Solda', 'serralheria', 'Grades, portões, calhas e estruturas metálicas', 'ShieldCheck', 10],
    ];

    for (const c of defaultCats) {
      insertCat.run(...c);
    }
  }

  const locCount = db.prepare('SELECT COUNT(*) as count FROM locations').get().count;
  if (locCount === 0) {
    const insertLoc = db.prepare(`
      INSERT INTO locations (id, city, state, neighborhoods_json, is_active)
      VALUES (?, ?, ?, ?, 1)
    `);

    const joinvilleNeighborhoods = [
      'América', 'Anita Garibaldi', 'Atiradores', 'Aventureiro', 'Boa Vista',
      'Bom Retiro', 'Bucarein', 'Centro', 'Comasa', 'Costa e Silva',
      'Espinheiros', 'Fátima', 'Floresta', 'Glória', 'Guanabara',
      'Iririú', 'Itaum', 'Itinga', 'Jardim Paraíso', 'Jardim Sofia',
      'Paranaguamirim', 'Petrópolis', 'Pirabeiraba', 'Profipo', 'Saguaçu',
      'Santa Catarina', 'Santo Antônio', 'São Marcos', 'Ulysses Guimarães',
      'Vila Nova', 'Vila Cubatão', 'Zona Industrial Norte'
    ];

    insertLoc.run('loc-joinville', 'Joinville', 'SC', JSON.stringify(joinvilleNeighborhoods));
    insertLoc.run('loc-araquari', 'Araquari', 'SC', JSON.stringify(['Centro', 'Itinga', 'Porto Grande', 'Rainha']));
    insertLoc.run('loc-jaragua', 'Jaraguá do Sul', 'SC', JSON.stringify(['Centro', 'Barra do Rio Cerro', 'Rau', 'Ilha da Figueira', 'Vila Nova']));
    insertLoc.run('loc-saofrancisco', 'São Francisco do Sul', 'SC', JSON.stringify(['Centro Histórico', 'Enseada', 'Ubatuba', 'Paulistas']));
  }

  // Create default admin if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@trevia.com.br');
  if (!adminExists) {
    const now = new Date().toISOString();
    const hash = bcrypt.hashSync('AdminTrevia2026!', 10);
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'admin', ?, 'active', ?, ?)
    `).run('user-admin-1', 'Administrador Trevia', 'admin@trevia.com.br', hash, '(47) 99999-0000', now, now);
  }

  // Seed initial realistic orders in Joinville if empty
  const ordersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  if (ordersCount === 0) {
    const now = new Date().toISOString();
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, client_id, title, description, category_id, city, neighborhood, timeframe, estimated_budget, status, created_at, updated_at)
      VALUES (?, 'user-admin-1', ?, ?, ?, 'Joinville', ?, ?, ?, 'aberto', ?, ?)
    `);

    insertOrder.run(
      'ord-seed-1',
      'Instalação e Higienização de Ar Condicionado Split',
      'Preciso instalar um aparelho de 12.000 BTUs no quarto principal e realizar a higienização de outro no bairro Glória. Tubulação já passada.',
      'cat-ar',
      'Glória',
      'esta_semana',
      350.0,
      now,
      now
    );

    insertOrder.run(
      'ord-seed-2',
      'Faxina e Limpeza Residencial Completa',
      'Procuro profissional de confiança para limpeza geral de um apartamento de 85m² no bairro América, incluindo vidros e sacada.',
      'cat-limpeza',
      'América',
      'esta_semana',
      220.0,
      now,
      now
    );

    insertOrder.run(
      'ord-seed-3',
      'Instalação de Plafons LED e Troca de Disjuntor',
      'Substituição de disjuntor de 40A do chuveiro e instalação de 4 luminárias de sobrepor na sala no Costa e Silva.',
      'cat-eletricista',
      'Costa e Silva',
      'urgente',
      280.0,
      now,
      now
    );

    insertOrder.run(
      'ord-seed-4',
      'Pintura Interna e Reparo de Paredes',
      'Pintura de sala e dois quartos com tinta Suvinil já comprada no Anita Garibaldi. Necessário cobrir pequenas imperfeições.',
      'cat-pintor',
      'Anita Garibaldi',
      'quinze_dias',
      850.0,
      now,
      now
    );

    insertOrder.run(
      'ord-seed-5',
      'Conserto de Torneira e Válvula Hidráulica',
      'Vazamento na cuba do banheiro e na caixa acoplada do vaso sanitário no Centro de Joinville.',
      'cat-encanador',
      'Centro',
      'urgente',
      180.0,
      now,
      now
    );

    insertOrder.run(
      'ord-seed-6',
      'Montagem de Guarda-Roupa com Espelho e Painel de TV',
      'Móveis novos na caixa entregues no bairro Saguaçu. Preciso de montador com ferramentas próprias e boa experiência.',
      'cat-moveis',
      'Saguaçu',
      'esta_semana',
      200.0,
      now,
      now
    );
  }
}

seedInitialData();
