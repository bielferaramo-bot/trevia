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

    console.log('\n--- TODOS OS 23 TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO! ---\n');
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
