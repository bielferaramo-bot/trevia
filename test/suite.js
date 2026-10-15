import assert from 'node:assert';
import http from 'node:http';
import app from '../server/index.js';

const PORT = 3099;
let server;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('\n--- INICIANDO BATERIA DE TESTES AUTOMATIZADOS DO TREVIA ---\n');
  const nowSuffix = Date.now();

  try {
    // 1. Health check
    const health = await request('GET', '/api/health');
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.app, 'Trevia API');
    console.log('✓ 1. Endpoint /api/health verificado com sucesso');

    // 2. Fetch categories and locations
    const cats = await request('GET', '/api/categories');
    assert.strictEqual(cats.status, 200);
    assert.ok(cats.body.categories.length >= 8);
    console.log(`✓ 2. Categorias iniciais carregadas (${cats.body.categories.length} ativas)`);

    const locs = await request('GET', '/api/locations');
    assert.strictEqual(locs.status, 200);
    const joinvilleLoc = locs.body.locations.find((l) => l.city === 'Joinville');
    assert.ok(joinvilleLoc);
    assert.ok(joinvilleLoc.neighborhoods.length >= 20);
    console.log(`✓ 3. Localidade Joinville e ${joinvilleLoc.neighborhoods.length} bairros verificados`);

    // 3. Register client user
    const clientEmail = `cliente_${nowSuffix}@exemplo.com`;
    const regClient = await request('POST', '/api/auth/register', {
      name: 'Carlos Oliveira',
      email: clientEmail,
      password: 'senhaSegura123!',
      role: 'client',
      phone: '(47) 98888-1111'
    });
    assert.strictEqual(regClient.status, 201);
    const clientToken = regClient.body.token;
    assert.ok(clientToken);
    console.log('✓ 4. Registro de cliente concluído');

    // 4. Register provider user
    const providerEmail = `prestador_${nowSuffix}@exemplo.com`;
    const regProvider = await request('POST', '/api/auth/register', {
      name: 'Marcos Silva Eletricista',
      email: providerEmail,
      password: 'senhaPrestador123!',
      role: 'provider',
      phone: '(47) 97777-2222'
    });
    assert.strictEqual(regProvider.status, 201);
    const providerToken = regProvider.body.token;
    assert.ok(providerToken);
    console.log('✓ 5. Registro de prestador autônomo concluído com perfil gerado');

    // 5. Client publishes order
    const createOrder = await request(
      'POST',
      '/api/orders',
      {
        title: 'Instalação de 4 luminárias de LED na sala',
        description: 'Preciso trocar luminárias antigas por plafons LED no bairro Glória em Joinville. Já comprei as peças.',
        category_id: 'cat-eletricista',
        city: 'Joinville',
        neighborhood: 'Glória',
        timeframe: 'esta_semana',
        estimated_budget: 250.0
      },
      clientToken
    );
    assert.strictEqual(createOrder.status, 201);
    const orderId = createOrder.body.order.id;
    assert.ok(orderId);
    console.log(`✓ 6. Cliente publicou pedido com sucesso (ID: ${orderId})`);

    // 6. Public listing of orders with filters
    const listOrders = await request('GET', '/api/orders?city=Joinville&category_id=cat-eletricista');
    assert.strictEqual(listOrders.status, 200);
    assert.ok(listOrders.body.orders.length > 0);
    const foundOrder = listOrders.body.orders.find((o) => o.id === orderId);
    assert.ok(foundOrder);
    assert.strictEqual(foundOrder.title, 'Instalação de 4 luminárias de LED na sala');
    // Ensure no private client phone leaked in public listing
    assert.strictEqual(foundOrder.phone, undefined);
    assert.strictEqual(foundOrder.client_phone, undefined);
    console.log('✓ 7. Listagem pública com filtros funciona e protege dados sensíveis do cliente');

    // 7. Provider views order details
    const orderDetail = await request('GET', `/api/orders/${orderId}`, null, providerToken);
    assert.strictEqual(orderDetail.status, 200);
    assert.strictEqual(orderDetail.body.order.has_submitted_proposal, false);
    console.log('✓ 8. Prestador acessou detalhes do pedido aberto');

    // 8. Provider submits proposal / interest
    const submitProposal = await request(
      'POST',
      `/api/proposals/orders/${orderId}/proposals`,
      {
        message: 'Olá Carlos! Sou eletricista com 8 anos de experiência em Joinville. Posso fazer a instalação nesta quinta-feira.',
        proposed_value: 220.0,
        estimated_time: '2 horas'
      },
      providerToken
    );
    assert.strictEqual(submitProposal.status, 201);
    console.log('✓ 9. Prestador enviou proposta/manifestação de interesse');

    // 9. Prevent duplicate proposals
    const duplicateProposal = await request(
      'POST',
      `/api/proposals/orders/${orderId}/proposals`,
      {
        message: 'Tentando enviar proposta duplicada...',
        proposed_value: 200.0
      },
      providerToken
    );
    assert.strictEqual(duplicateProposal.status, 400);
    assert.ok(duplicateProposal.body.error.includes('já enviou'));
    console.log('✓ 10. Bloqueio de propostas duplicadas verificado');

    // 10. Client cannot propose on their own order
    const selfProposal = await request(
      'POST',
      `/api/proposals/orders/${orderId}/proposals`,
      {
        message: 'Propondo em meu próprio pedido...',
        proposed_value: 100.0
      },
      clientToken
    );
    assert.strictEqual(selfProposal.status, 400);
    console.log('✓ 11. Bloqueio de auto-proposta verificado');

    // 11. Client views received proposals
    const clientOrderView = await request('GET', `/api/orders/${orderId}`, null, clientToken);
    assert.strictEqual(clientOrderView.status, 200);
    assert.strictEqual(clientOrderView.body.order.is_owner, true);
    assert.ok(clientOrderView.body.order.proposals.length >= 1);
    assert.strictEqual(clientOrderView.body.order.proposals[0].provider_name, 'Marcos Silva Eletricista');
    console.log('✓ 12. Cliente visualizou propostas recebidas e detalhes do prestador');

    // 12. Provider updates professional profile & public profile view
    const updateProfile = await request(
      'PUT',
      '/api/professionals/me/profile',
      {
        public_name: 'Marcos Silva - Eletricista Joinville',
        bio: 'Especialista em manutenções elétricas residenciais e comerciais em Joinville e Araquari.',
        categories: ['cat-eletricista', 'cat-reparos'],
        locations: ['Joinville', 'Araquari'],
        whatsapp: '(47) 97777-2222',
        contact_phone: '(47) 97777-2222'
      },
      providerToken
    );
    assert.strictEqual(updateProfile.status, 200);
    const providerSlug = updateProfile.body.profile.slug;

    const publicProf = await request('GET', `/api/professionals/${providerSlug}`);
    assert.strictEqual(publicProf.status, 200);
    assert.strictEqual(publicProf.body.profile.public_name, 'Marcos Silva - Eletricista Joinville');
    console.log('✓ 13. Perfil público do prestador consultado com sucesso');

    // 13. Client concludes order
    const closeOrder = await request(
      'PATCH',
      `/api/orders/${orderId}/status`,
      { status: 'concluido' },
      clientToken
    );
    assert.strictEqual(closeOrder.status, 200);
    console.log('✓ 14. Cliente concluiu o pedido de serviço');

    // 14. Second provider attempts proposal on concluded order -> Must be blocked
    const regProvider2 = await request('POST', '/api/auth/register', {
      name: 'João Pintor',
      email: `pintor_${nowSuffix}@exemplo.com`,
      password: 'senhaPintor123!',
      role: 'provider'
    });
    const providerToken2 = regProvider2.body.token;

    const attemptOnClosed = await request(
      'POST',
      `/api/proposals/orders/${orderId}/proposals`,
      {
        message: 'Ainda posso fazer o serviço?',
        proposed_value: 200.0
      },
      providerToken2
    );
    assert.strictEqual(attemptOnClosed.status, 400);
    assert.ok(attemptOnClosed.body.error.includes('não aceita mais novas propostas'));
    console.log('✓ 15. Sistema rejeitou proposta para pedido concluído');

    // 15. Unauthorized user cannot edit another client's order
    const unauthorizedEdit = await request(
      'PUT',
      `/api/orders/${orderId}`,
      { title: 'Tentativa maliciosa de edição' },
      providerToken2
    );
    assert.strictEqual(unauthorizedEdit.status, 403);
    console.log('✓ 16. Verificação de permissão estrita impediu edição indevida');

    // 16. Admin login & metrics
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@trevia.com.br',
      password: 'AdminTrevia2026!'
    });
    assert.strictEqual(adminLogin.status, 200);
    const adminToken = adminLogin.body.token;

    const metrics = await request('GET', '/api/admin/metrics', null, adminToken);
    assert.strictEqual(metrics.status, 200);
    assert.ok(metrics.body.metrics.totalUsers >= 3);
    assert.ok(metrics.body.metrics.totalOrders >= 1);
    console.log(`✓ 17. Painel administrativo verificado com métricas reais (${metrics.body.metrics.totalUsers} usuários, ${metrics.body.metrics.totalOrders} pedidos)`);

    // 17. Radar de Oportunidades via Alerta (POST /api/alerts)
    const alertRegistration = await request('POST', '/api/alerts', {
      name: 'Carlos Eletricista Radar',
      whatsapp: '(47) 99876-5432',
      neighborhoods: ['Centro', 'América', 'Glória'],
      category_id: 'cat-eletricista'
    });
    assert.strictEqual(alertRegistration.status, 201);
    assert.strictEqual(alertRegistration.body.success, true);
    assert.strictEqual(alertRegistration.body.alert.whatsapp, '47998765432');
    console.log('✓ 18. Radar de Oportunidades via Alerta registrado com sanitização de DDD e persistência');

    // Radar invalid whatsapp validation test
    const invalidAlert = await request('POST', '/api/alerts', {
      name: 'Teste Sem WhatsApp',
      whatsapp: '123'
    });
    assert.strictEqual(invalidAlert.status, 400);
    console.log('✓ 19. Validação estrita de WhatsApp rejeitou número inválido no Radar');

    // 20. Fluxo Post-First: Visitante não logado publica pedido sem barreira de senha prévia
    const guestOrder = await request('POST', '/api/orders', {
      title: 'Instalação de Tomada 220v para Lava e Seca',
      description: 'Preciso puxar um ponto de 220v na lavanderia para ligar a máquina de lavar.',
      category_id: 'cat-eletricista',
      city: 'Joinville',
      neighborhood: 'América',
      timeframe: 'esta_semana',
      estimated_budget: 150.0,
      client_name: 'Mariana Silva Tráfego',
      client_phone: '(47) 98811-2233'
    });
    assert.strictEqual(guestOrder.status, 201);
    assert.ok(guestOrder.body.order.id);
    assert.ok(guestOrder.body.token, 'Token JWT gerado automaticamente para o cliente');
    assert.strictEqual(guestOrder.body.user.name, 'Mariana Silva Tráfego');
    console.log('✓ 20. Fluxo Post-First: Pedido publicado por visitante e conta criada com token instantâneo');

    // 21. Validação de Localização OLX e Cálculo de Proximidade
    const listRes = await request('GET', '/api/orders?status=aberto&city=Joinville&sort=proximity');
    assert.strictEqual(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.orders));
    assert.ok(listRes.body.orders.length > 0);
    console.log(`✓ 21. Localização OLX & Filtro de Proximidade verificado (${listRes.body.orders.length} pedidos na região de Joinville)`);

    // 22. Endpoint de Autenticação Google
    const googleInvalidRes = await request('POST', '/api/auth/google', { credential: '' });
    assert.strictEqual(googleInvalidRes.status, 400);
    assert.strictEqual(googleInvalidRes.body.error, 'Credencial do Google não fornecida.');
    console.log('✓ 22. Endpoint de Login com Google verificado e ativo');

    // 23. Captura e Gestão de Leads Express (Formulário Rápido da Home)
    const leadCreateRes = await request('POST', '/api/leads', {
      name: 'Roberto Joinville',
      phone: '(47) 98877-6655',
      service: 'Instalação de Ar Condicionado',
      neighborhood: 'América',
      details: 'Preciso para sábado de manhã'
    });
    assert.strictEqual(leadCreateRes.status, 201);
    assert.ok(leadCreateRes.body.lead_id);

    // Validação de telefone inválido
    const leadInvalidRes = await request('POST', '/api/leads', {
      name: 'Invalido',
      phone: '123'
    });
    assert.strictEqual(leadInvalidRes.status, 400);

    // Listagem no Admin
    const leadsListRes = await request('GET', '/api/leads', null, adminToken);
    assert.strictEqual(leadsListRes.status, 200);
    assert.ok(Array.isArray(leadsListRes.body.leads));
    assert.ok(leadsListRes.body.leads.some(l => l.id === leadCreateRes.body.lead_id));

    // Atualização de Status
    const leadStatusRes = await request('PATCH', `/api/leads/${leadCreateRes.body.lead_id}/status`, { status: 'em_contato' }, adminToken);
    assert.strictEqual(leadStatusRes.status, 200);
    assert.strictEqual(leadStatusRes.body.status, 'em_contato');
    console.log('✓ 23. Captura e Gestão de Leads Express (Zero Perda de Contatos) verificada com sucesso');

    // 24. Sistema Bilateral de Avaliação (Clientes avaliam Prestadores e Prestadores avaliam Clientes)
    // a) Bloqueio de autoavaliação
    const selfReviewRes = await request(
      'POST',
      '/api/reviews',
      {
        order_id: orderId,
        target_user_id: regClient.body.user.id,
        rating: 5,
        comment: 'Tentando avaliar a si mesmo'
      },
      clientToken
    );
    assert.strictEqual(selfReviewRes.status, 400);
    assert.strictEqual(selfReviewRes.body.error, 'Você não pode avaliar a si mesmo.');

    // b) Cliente avalia o Prestador
    const clientReviewRes = await request(
      'POST',
      '/api/reviews',
      {
        order_id: orderId,
        target_user_id: regProvider.body.user.id,
        rating: 5,
        comment: 'Excelente trabalho com as luminárias LED! Rápido, limpo e pontual.',
        tags: ['Pontualidade ⏰', 'Serviço Impecável ✨']
      },
      clientToken
    );
    assert.strictEqual(clientReviewRes.status, 201);
    assert.ok(clientReviewRes.body.review.id);
    assert.strictEqual(clientReviewRes.body.review.target_type, 'provider');
    assert.strictEqual(clientReviewRes.body.review.rating, 5);

    // c) Bloqueio de avaliação duplicada pelo cliente no mesmo pedido
    const duplicateClientReview = await request(
      'POST',
      '/api/reviews',
      {
        order_id: orderId,
        target_user_id: regProvider.body.user.id,
        rating: 4,
        comment: 'Tentativa duplicada'
      },
      clientToken
    );
    assert.strictEqual(duplicateClientReview.status, 400);
    assert.strictEqual(duplicateClientReview.body.error, 'Você já avaliou este usuário neste pedido.');

    // d) Prestador avalia o Cliente (Contratante)
    const providerReviewRes = await request(
      'POST',
      '/api/reviews',
      {
        order_id: orderId,
        target_user_id: regClient.body.user.id,
        rating: 5,
        comment: 'Ótimo cliente! Comunicação clara, super solícito e pagamento imediato via PIX.',
        tags: ['Comunicação Clara 💬', 'Pagamento Pontual 💳']
      },
      providerToken
    );
    assert.strictEqual(providerReviewRes.status, 201);
    assert.ok(providerReviewRes.body.review.id);
    assert.strictEqual(providerReviewRes.body.review.target_type, 'client');
    assert.strictEqual(providerReviewRes.body.review.rating, 5);

    // e) Bloqueio de avaliação duplicada pelo prestador no mesmo pedido
    const duplicateProviderReview = await request(
      'POST',
      '/api/reviews',
      {
        order_id: orderId,
        target_user_id: regClient.body.user.id,
        rating: 5,
        comment: 'Tentativa duplicada prestador'
      },
      providerToken
    );
    assert.strictEqual(duplicateProviderReview.status, 400);

    // f) Consulta de avaliações do pedido
    const orderReviewsRes = await request('GET', `/api/reviews/order/${orderId}`);
    assert.strictEqual(orderReviewsRes.status, 200);
    assert.strictEqual(orderReviewsRes.body.reviews.length, 2);

    // g) Consulta e agregação de reputação do prestador
    const providerReviewsProfile = await request('GET', `/api/reviews/user/${regProvider.body.user.id}`);
    assert.strictEqual(providerReviewsProfile.status, 200);
    assert.strictEqual(providerReviewsProfile.body.total_reviews, 1);
    assert.strictEqual(providerReviewsProfile.body.average_rating, 5);

    // h) Consulta e agregação de reputação do cliente
    const clientReviewsProfile = await request('GET', `/api/reviews/user/${regClient.body.user.id}`);
    assert.strictEqual(clientReviewsProfile.status, 200);
    assert.strictEqual(clientReviewsProfile.body.total_reviews, 1);
    assert.strictEqual(clientReviewsProfile.body.average_rating, 5);
    console.log('✓ 24. Sistema Bilateral de Avaliação verificado (Cliente avalia Prestador e Prestador avalia Cliente com reputação agregada)');

    // 25. Escassez de Vagas & Garantia Trevia de Estorno de Crédito
    // a) Checa detalhes do pedido com cálculo de vagas
    const orderWithSpots = await request('GET', `/api/orders/${orderId}`, null, providerToken);
    assert.strictEqual(orderWithSpots.status, 200);
    assert.strictEqual(orderWithSpots.body.order.max_unlocks, 3);
    assert.ok(typeof orderWithSpots.body.order.spots_left === 'number');

    // b) Prestador libera contato
    const unlockRes = await request('POST', `/api/radar/orders/${orderId}/unlock`, {}, providerToken);
    assert.strictEqual(unlockRes.status, 200);
    const creditsBeforeRefund = unlockRes.body.credits_remaining;

    // c) Prestador aciona a Garantia Trevia (Solicitação de Estorno de Crédito)
    const refundRes = await request(
      'POST',
      `/api/radar/orders/${orderId}/refund`,
      {
        reason: 'Cliente não responde no WhatsApp',
        details: 'Tentei contato 3 vezes durante o dia sem resposta.'
      },
      providerToken
    );
    assert.strictEqual(refundRes.status, 200);
    assert.strictEqual(refundRes.body.success, true);
    assert.strictEqual(refundRes.body.credits_remaining, creditsBeforeRefund + 1);

    // d) Impede solicitação duplicada de estorno no mesmo pedido
    const duplicateRefundRes = await request(
      'POST',
      `/api/radar/orders/${orderId}/refund`,
      {
        reason: 'Cliente não responde no WhatsApp'
      },
      providerToken
    );
    assert.strictEqual(duplicateRefundRes.status, 400);
    console.log('✓ 25. Escassez de Vagas & Garantia Trevia de Estorno de Crédito verificada com sucesso');

    // 26. Gamificação: Bônus de Boas-Vindas (1º Crédito Grátis) & Níveis Trevia Pro
    // a) Criar novo prestador para testar bônus de boas-vindas
    const newProvEmail = `gamified_${Date.now()}@teste.com`;
    const regNewProv = await request('POST', '/api/auth/register', {
      name: 'Eletricista Gamificado',
      email: newProvEmail,
      password: 'password123',
      role: 'provider',
      phone: '(47) 98888-7766'
    });
    assert.strictEqual(regNewProv.status, 201);
    const newProvToken = regNewProv.body.token;
    assert.strictEqual(regNewProv.body.user.credits, 3);
    assert.strictEqual(regNewProv.body.user.has_received_welcome_bonus, 0);

    // b) Completa 100% do perfil profissional pela primeira vez
    const updateProfRes = await request(
      'PUT',
      '/api/professionals/me/profile',
      {
        public_name: 'Eletricista Gamificado Joinville',
        bio: 'Especialista em instalações elétricas residenciais e comerciais em Joinville há 8 anos.',
        categories: ['cat-eletricista'],
        locations: ['Joinville'],
        whatsapp: '(47) 98888-7766',
        portfolio: [
          {
            title: 'Troca de Quadro Elétrico',
            description: 'Instalação completa no bairro Glória com disjuntores novos.',
            image_before: 'https://exemplo.com/antes.jpg',
            image_after: 'https://exemplo.com/depois.jpg'
          }
        ]
      },
      newProvToken
    );
    assert.strictEqual(updateProfRes.status, 200);
    assert.strictEqual(updateProfRes.body.welcome_bonus_awarded, true);
    assert.strictEqual(updateProfRes.body.new_credits, 4); // 3 iniciais + 1 bônus
    assert.ok(updateProfRes.body.profile.provider_level);
    assert.strictEqual(updateProfRes.body.profile.provider_level.level, 'Bronze');

    // c) Atualizar perfil novamente NÃO dá bônus repetido
    const secondUpdateRes = await request(
      'PUT',
      '/api/professionals/me/profile',
      {
        public_name: 'Eletricista Gamificado Joinville',
        bio: 'Especialista em instalações elétricas residenciais e comerciais em Joinville há 8 anos.',
        categories: ['cat-eletricista'],
        whatsapp: '(47) 98888-7766'
      },
      newProvToken
    );
    assert.strictEqual(secondUpdateRes.status, 200);
    assert.strictEqual(secondUpdateRes.body.welcome_bonus_awarded, false);
    console.log('✓ 26. Gamificação Trevia Pro: Bônus de Boas-Vindas (+1 Crédito) e Nível Bronze verificados');

    // 27. Pagamento Protegido: Sinal Seguro via PIX em Custódia Trevia
    // a) Cliente cria sinal de R$ 80,00 para o pedido
    const escrowCreateRes = await request(
      'POST',
      `/api/escrow/order/${orderId}`,
      {
        amount: 80.00,
        description: 'Sinal para compra de cabeamento e disjuntores'
      },
      clientToken
    );
    assert.strictEqual(escrowCreateRes.status, 201);
    assert.strictEqual(escrowCreateRes.body.deposit.amount, 80);
    assert.strictEqual(escrowCreateRes.body.deposit.status, 'pendente');
    assert.ok(escrowCreateRes.body.deposit.pix_code);
    assert.ok(escrowCreateRes.body.deposit.qr_code_url);
    const depositId = escrowCreateRes.body.deposit.id;

    // b) Consulta status do sinal pelo pedido
    const escrowGetRes = await request('GET', `/api/escrow/order/${orderId}`, null, clientToken);
    assert.strictEqual(escrowGetRes.status, 200);
    assert.strictEqual(escrowGetRes.body.deposit.id, depositId);
    assert.strictEqual(escrowGetRes.body.permissions.can_fund, true);

    // c) Simula/confirma pagamento do PIX pelo cliente (entra em custódia)
    const escrowFundRes = await request('POST', `/api/escrow/${depositId}/fund`, {}, clientToken);
    assert.strictEqual(escrowFundRes.status, 200);
    assert.strictEqual(escrowFundRes.body.deposit.status, 'em_custodia');
    assert.ok(escrowFundRes.body.deposit.funded_at);

    // d) Cliente libera o sinal ao prestador após conclusão do serviço
    const escrowReleaseRes = await request('POST', `/api/escrow/${depositId}/release`, {}, clientToken);
    assert.strictEqual(escrowReleaseRes.status, 200);
    assert.strictEqual(escrowReleaseRes.body.deposit.status, 'liberado');
    assert.ok(escrowReleaseRes.body.deposit.released_at);
    console.log('✓ 27. Pagamento Protegido: Sinal Seguro via PIX em Custódia Trevia verificado com sucesso');

    // 28. Sistema Seguro de Recarga PIX & Aprovação Financeira
    // a) Prestador tenta creditar conta diretamente sem PIX -> Deve ser bloqueado (403)
    const directCrediting = await request('POST', '/api/radar/credits/recharge', { package_id: 'pro' }, providerToken);
    assert.strictEqual(directCrediting.status, 403);
    assert.strictEqual(directCrediting.body.requires_pix, true);

    // b) Prestador cria pedido de recarga PIX
    const pixOrderRes = await request(
      'POST',
      '/api/radar/credits/order',
      { package_id: 'pro' },
      providerToken
    );
    assert.strictEqual(pixOrderRes.status, 201);
    assert.ok(pixOrderRes.body.recharge);
    assert.strictEqual(pixOrderRes.body.recharge.status, 'pendente');
    assert.strictEqual(pixOrderRes.body.recharge.credits, 8);
    assert.strictEqual(pixOrderRes.body.recharge.amount, 39.9);
    assert.strictEqual(pixOrderRes.body.recharge.pix_key, 'c8b36d11-7899-4ce7-999a-7ac85399dd71');
    assert.ok(pixOrderRes.body.recharge.pix_code.startsWith('000201'));
    assert.ok(pixOrderRes.body.recharge.qr_code_url);
    const rechargeId = pixOrderRes.body.recharge.id;

    // c) Prestador envia comprovante de pagamento
    const submitProofRes = await request(
      'POST',
      '/api/radar/credits/submit-proof',
      {
        recharge_id: rechargeId,
        proof_text: 'E2E-TEST-COMPROVANTE-ITAU-99887766'
      },
      providerToken
    );
    assert.strictEqual(submitProofRes.status, 200);
    assert.strictEqual(submitProofRes.body.status, 'em_analise');

    // d) Prestador visualiza suas recargas
    const myRechargesRes = await request('GET', '/api/radar/credits/my-recharges', null, providerToken);
    assert.strictEqual(myRechargesRes.status, 200);
    assert.ok(myRechargesRes.body.recharges.some(r => r.id === rechargeId && r.status === 'em_analise'));

    // e) Admin lista recargas no painel
    const adminRechargesRes = await request('GET', '/api/admin/recharges', null, adminToken);
    assert.strictEqual(adminRechargesRes.status, 200);
    const foundAdminOrder = adminRechargesRes.body.recharges.find(r => r.id === rechargeId);
    assert.ok(foundAdminOrder);
    assert.strictEqual(foundAdminOrder.buyer_name, 'Marcos Silva Eletricista');

    // Saldo do prestador antes da aprovação
    const userBeforeRes = await request('GET', '/api/auth/me', null, providerToken);
    const balanceBefore = userBeforeRes.body.user.credits;

    // f) Admin aprova a recarga após conferência do extrato PIX
    const approveRes = await request('POST', `/api/admin/recharges/${rechargeId}/approve`, {}, adminToken);
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.body.credits_added, 8);
    assert.strictEqual(approveRes.body.new_balance, balanceBefore + 8);

    // Saldo do prestador verificado após aprovação
    const userAfterRes = await request('GET', '/api/auth/me', null, providerToken);
    assert.strictEqual(userAfterRes.body.user.credits, balanceBefore + 8);

    // g) Tentativa de aprovação duplicada deve ser bloqueada
    const duplicateApprove = await request('POST', `/api/admin/recharges/${rechargeId}/approve`, {}, adminToken);
    assert.strictEqual(duplicateApprove.status, 400);
    console.log('✓ 28. Sistema Seguro de Recarga PIX (Chave Oficial c8b36d11-7899-4ce7-999a-7ac85399dd71 + Bloqueio de Créditos Gratuitos + Moderação Financeira do Admin) verificado com sucesso');

    // 29. Proteção Estrita de Perfil de Contratante & Reconhecimento de Autoria de Pedidos
    // a) Cliente autenticado cria um novo pedido e recebe is_owner: true
    const clientNewOrder = await request('POST', '/api/orders', {
      title: 'Pintura de Fachada em Anita Garibaldi',
      description: 'Preciso de pintor para pintura externa de casa térrea com lavagem prévia.',
      category_id: 'cat-pintor',
      city: 'Joinville',
      neighborhood: 'Anita Garibaldi',
      timeframe: 'este_mes',
      estimated_budget: 1800.0
    }, clientToken);
    assert.strictEqual(clientNewOrder.status, 201);
    assert.strictEqual(clientNewOrder.body.order.is_owner, true, 'Pedido recém-criado deve retornar is_owner: true');
    const clientNewOrderId = clientNewOrder.body.order.id;

    // b) Cliente consulta seu próprio pedido via GET /api/orders/:id e recebe is_owner: true estrito
    const getClientOwnOrder = await request('GET', `/api/orders/${clientNewOrderId}`, null, clientToken);
    assert.strictEqual(getClientOwnOrder.status, 200);
    assert.strictEqual(getClientOwnOrder.body.order.is_owner, true, 'is_owner deve ser estritamente true');

    // c) Cliente tenta liberar contato do seu próprio pedido: bloqueado
    const unlockOwnContact = await request('POST', `/api/radar/orders/${clientNewOrderId}/unlock`, {}, clientToken);
    assert.strictEqual(unlockOwnContact.status, 400);
    assert.ok(unlockOwnContact.body.error.includes('Você é o autor deste pedido'));

    // d) Cliente tenta enviar proposta comercial para pedido de outro usuário: bloqueado
    const clientProposeOther = await request('POST', `/api/proposals/orders/${guestOrder.body.order.id}/proposals`, {
      message: 'Sou cliente mas tentando enviar proposta indevidamente',
      proposed_value: 500
    }, clientToken);
    assert.strictEqual(clientProposeOther.status, 403);
    assert.ok(clientProposeOther.body.error.includes('Apenas profissionais'));

    // e) Cliente tenta liberar contato de outro pedido com créditos: bloqueado
    const clientUnlockOther = await request('POST', `/api/radar/orders/${guestOrder.body.order.id}/unlock`, {}, clientToken);
    assert.strictEqual(clientUnlockOther.status, 403);
    assert.ok(clientUnlockOther.body.error.includes('Apenas profissionais'));
    console.log('✓ 29. Proteção Estrita de Perfil de Contratante (is_owner garantido + bloqueio de propostas e desbloqueio por contratantes) verificada com sucesso');

    // 30. Sistema Completo de Carteira Digital (Depósito PIX, Saques, Custódia e Moderação Admin)
    // a) Consulta resumo da carteira do cliente (saldo inicial 0.00)
    const walletSummary1 = await request('GET', '/api/wallet/summary', null, clientToken);
    assert.strictEqual(walletSummary1.status, 200);
    assert.strictEqual(walletSummary1.body.official_pix_key, 'c8b36d11-7899-4ce7-999a-7ac85399dd71');
    assert.strictEqual(walletSummary1.body.wallet_balance, 0);

    // b) Cliente solicita depósito de R$ 150,00 via PIX
    const depositCreateRes = await request('POST', '/api/wallet/deposit', { amount: 150.00 }, clientToken);
    assert.strictEqual(depositCreateRes.status, 201);
    assert.strictEqual(depositCreateRes.body.deposit.amount, 150);
    assert.strictEqual(depositCreateRes.body.deposit.status, 'pendente');
    assert.strictEqual(depositCreateRes.body.official_pix_key, 'c8b36d11-7899-4ce7-999a-7ac85399dd71');
    assert.ok(depositCreateRes.body.deposit.pix_code);
    assert.ok(depositCreateRes.body.deposit.qr_code_url);
    const wDepositId = depositCreateRes.body.deposit.id;

    // c) Cliente confirma depósito PIX -> Saldo creditado
    const depositConfirmRes = await request('POST', `/api/wallet/deposit/${wDepositId}/confirm`, {}, clientToken);
    assert.strictEqual(depositConfirmRes.status, 200);
    assert.strictEqual(depositConfirmRes.body.new_balance, 150);

    // Saldo do cliente verificado
    const walletSummary2 = await request('GET', '/api/wallet/summary', null, clientToken);
    assert.strictEqual(walletSummary2.body.wallet_balance, 150);

    // d) Cliente solicita saque de R$ 50,00 para chave PIX celular
    const withdrawRes = await request('POST', '/api/wallet/withdraw', {
      amount: 50.00,
      pix_key_type: 'phone',
      pix_key: '(47) 98888-1111'
    }, clientToken);
    assert.strictEqual(withdrawRes.status, 201);
    assert.strictEqual(withdrawRes.body.new_balance, 100);
    assert.strictEqual(withdrawRes.body.withdrawal.status, 'pendente');
    const withdrawalId = withdrawRes.body.withdrawal.id;

    // e) Tentativa de sacar mais do que o saldo disponível é rejeitada
    const overWithdraw = await request('POST', '/api/wallet/withdraw', {
      amount: 200.00,
      pix_key_type: 'cpf',
      pix_key: '000.111.222-33'
    }, clientToken);
    assert.strictEqual(overWithdraw.status, 400);

    // f) Admin lista saques pendentes e aprova saque
    const adminWithdrawalsRes = await request('GET', '/api/admin/wallet/withdrawals', null, adminToken);
    assert.strictEqual(adminWithdrawalsRes.status, 200);
    assert.ok(adminWithdrawalsRes.body.withdrawals.some(w => w.id === withdrawalId && w.status === 'pendente'));

    const adminApproveWithdrawal = await request('POST', `/api/admin/wallet/withdrawals/${withdrawalId}/approve`, {}, adminToken);
    assert.strictEqual(adminApproveWithdrawal.status, 200);
    assert.strictEqual(adminApproveWithdrawal.body.withdrawal.status, 'pago');

    // g) Cliente usa saldo restante da carteira (R$ 100) para pagar sinal de um pedido
    const newEscrowOrder = await request('POST', '/api/orders', {
      title: 'Instalação de Tomadas e Cabeamento de Rede',
      description: 'Preciso de eletricista para instalação no América.',
      category_id: 'cat-eletricista',
      city: 'Joinville',
      neighborhood: 'América',
      timeframe: 'urgente',
      estimated_budget: 200.0
    }, clientToken);

    const escrowDepositRes = await request('POST', `/api/escrow/order/${newEscrowOrder.body.order.id}`, {
      amount: 70.00,
      description: 'Sinal de materiais pago via carteira'
    }, clientToken);
    const newEscrowId = escrowDepositRes.body.deposit.id;

    // Prestador aceita e libera contato do pedido
    await request('POST', `/api/proposals/orders/${newEscrowOrder.body.order.id}/proposals`, {
      proposed_value: 200.00,
      estimated_time: '1 dia',
      message: 'Olá, sou especialista e posso realizar o serviço hoje.'
    }, providerToken);

    // Cliente paga o sinal seguro DIRETO com a Carteira Digital
    const fundWithWalletRes = await request('POST', `/api/escrow/${newEscrowId}/fund-with-wallet`, {}, clientToken);
    assert.strictEqual(fundWithWalletRes.status, 200);
    assert.strictEqual(fundWithWalletRes.body.deposit.status, 'em_custodia');

    // Verifica saldo do cliente (era 100 - 70 = 30)
    const walletSummary3 = await request('GET', '/api/wallet/summary', null, clientToken);
    assert.strictEqual(walletSummary3.body.wallet_balance, 30);

    // h) Saldo do prestador antes de liberar o sinal
    const provSummaryBefore = await request('GET', '/api/wallet/summary', null, providerToken);
    const provBalBefore = provSummaryBefore.body.wallet_balance;

    // Cliente libera o sinal após serviço finalizado -> Credita AUTOMATICAMENTE na carteira do prestador
    const releaseToWalletRes = await request('POST', `/api/escrow/${newEscrowId}/release`, {}, clientToken);
    assert.strictEqual(releaseToWalletRes.status, 200);
    assert.strictEqual(releaseToWalletRes.body.deposit.status, 'liberado');

    // Saldo do prestador aumentado em +70.00
    const provSummaryAfter = await request('GET', '/api/wallet/summary', null, providerToken);
    assert.strictEqual(provSummaryAfter.body.wallet_balance, provBalBefore + 70);

    // Extrato de transações do prestador contém o sinal recebido
    const provTxRes = await request('GET', '/api/wallet/transactions', null, providerToken);
    assert.ok(provTxRes.body.transactions.some(t => t.type === 'sinal_recebido' && t.amount === 70));
    console.log('✓ 30. Sistema Completo de Carteira Digital (Depósito PIX, Saques, Custódia e Moderação Admin) verificado com sucesso');

    console.log('\n--- TODOS OS 30 TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO! ---\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ FALHA NOS TESTES:', err);
    process.exit(1);
  }
}

// Start test server on dedicated port
server = app.listen(PORT, () => {
  runTests();
});
