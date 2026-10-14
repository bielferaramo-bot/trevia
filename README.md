# Trevia — Plataforma Digital de Serviços Locais

**Trevia** é uma plataforma full-stack desenvolvida para conectar pessoas que precisam contratar serviços com profissionais autônomos e pequenos prestadores, com foco inicial em **Joinville, Santa Catarina, e região metropolitana** (Araquari, Jaraguá do Sul, São Francisco do Sul, etc.).

---

## 🚀 Proposta de Valor e Modelo de Negócio
- **Gratuidade no Lançamento**: Cadastro e publicação 100% gratuitos para clientes e trabalhadores autônomos. Sem comissões ou taxas ocultas.
- **Intermediação Transparente**: O Trevia conecta o pedido do cliente aos profissionais interessados. Os detalhes, valores e execução são combinados diretamente entre as partes.
- **Privacidade & LGPD**: Dados privados do cliente (telefone, e-mail e endereço residencial completo) nunca são expostos na listagem pública.
- **Categorias Configuráveis**: Eletricista, Pintor, Pedreiro e Alvenaria, Encanador, Montagem de Móveis, Limpeza/Faxina, Reparos Residenciais, Jardinagem, etc. gerenciadas via painel administrativo.

---

## 🛠️ Stack Tecnológica
- **Backend**: Node.js v22 LTS com Express e SQLite nativo (`node:sqlite`).
- **Banco de Dados**: SQLite relacional com integridade referencial (`PRAGMA foreign_keys = ON`), modo WAL, índices e transações ACID.
- **Segurança**: Criptografia de senhas com `bcryptjs`, autenticação stateless com `jsonwebtoken` (JWT), e autorização estrita por propriedade no servidor.
- **Frontend**: React 19 com Vite, TailwindCSS (paleta personalizada Trevia Emerald/Teal), ícones Lucide React e roteamento SPA responsivo (mobile-first).

---

## 📂 Estrutura do Projeto

```
trevia/
├── package.json               # Configurações e scripts principais
├── server/                    # Backend Node.js + Express
│   ├── index.js               # Ponto de entrada do servidor unificado
│   ├── db.js                  # Conexão SQLite (node:sqlite) e migrations/seeds
│   ├── auth.js                # Middlewares de autenticação JWT e permissões
│   └── routes/                # Rotas da API REST
│       ├── auth.js            # Login, cadastro de cliente e prestador
│       ├── orders.js          # Criação, listagem pública, filtros e detalhes de pedidos
│       ├── proposals.js       # Envio de propostas/interesse e prevenção de duplicidade
│       ├── professionals.js   # Perfil público do autônomo e gestão do prestador
│       ├── categories.js      # Listagem de categorias ativas
│       ├── locations.js       # Cidades e bairros cadastrados de Joinville e região
│       ├── reports.js         # Módulo de denúncia e confiança
│       └── admin.js           # Métricas reais e gestão operacional
├── client/                    # Frontend React + Vite
│   ├── index.html             # Shell da aplicação com tipografia e Tailwind
│   ├── src/
│   │   ├── main.jsx           # Ponto de entrada do React
│   │   ├── App.jsx            # Roteador SPA e casca da aplicação
│   │   ├── AuthContext.jsx    # Contexto global de autenticação e modais
│   │   ├── api.js             # Cliente HTTP centralizado
│   │   ├── components/        # Navbar, Footer, AuthModal
│   │   └── pages/             # Home, Pedidos, Novo Pedido, Detalhes,
│   │                          # Oportunidades, Painel do Cliente, Painel do Prestador,
│   │                          # Perfil Público e Admin
└── test/
    └── suite.js               # Suite de 17 testes automatizados de ponta a ponta
```

---

## 🏃 Como Executar Localmente

### 1. Pré-requisitos
- Node.js v20.19+ ou v22+ (o ambiente já possui o Node.js v22.14 LTS pré-instalado em `C:\Users\bielf\.gemini\antigravity\tools\node`).

### 2. Rodar a Aplicação
No terminal do projeto (`C:\Users\bielf\.gemini\antigravity\scratch\trevia`):

```bash
# Iniciar o servidor unificado (porta 3001)
npm start
```

Acesse no navegador:
👉 **http://localhost:3001**

### 3. Rodar a Bateria de Testes Automatizados
Para verificar a integridade relacional, segurança e todas as 15 regras de negócio:

```bash
npm test
```

### 4. Credenciais de Teste Administrativas
- **E-mail**: `admin@trevia.com.br`
- **Senha**: `AdminTrevia2026!`
- **URL do Painel**: `http://localhost:3001/admin`
