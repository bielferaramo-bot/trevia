import { db } from '../db.js';

/**
 * Trevia WhatsApp Messaging Service
 * Preparado para Z-API, Evolution API, ou Provedores Oficiais de WhatsApp Cloud.
 * Configuração via variáveis de ambiente (.env):
 * - WHATSAPP_API_URL (ex: https://api.z-api.io/instances/XXXX/token/YYYY/send-text)
 * - WHATSAPP_API_TOKEN (token de autenticação)
 */

export async function sendWhatsAppMessage(phone, messageText) {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  if (cleanPhone.length < 10) return false;

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (apiUrl) {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiToken ? { 'Authorization': `Bearer ${apiToken}` } : {})
        },
        body: JSON.stringify({
          phone: `55${cleanPhone}`,
          message: messageText
        })
      });
      console.log(`[WhatsApp Service] Disparo enviado para 55${cleanPhone} (Status: ${response.status})`);
      return response.ok;
    } catch (err) {
      console.error(`[WhatsApp Service Error] Falha ao enviar para 55${cleanPhone}:`, err.message);
      return false;
    }
  } else {
    // Modo de demonstração / log do servidor (quando ainda não há credencial do provedor)
    console.log(`\n======================================================`);
    console.log(`📱 [DISPARO WHATSAPP SIMULADO] Destino: 55${cleanPhone}`);
    console.log(messageText);
    console.log(`======================================================\n`);
    return true;
  }
}

/**
 * Notifica os prestadores cadastrados no Radar quando um novo pedido compatível for publicado
 */
export async function notifyProvidersOfNewOrder(order) {
  try {
    const alerts = db.prepare(`
      SELECT * FROM provider_alerts
      WHERE status = 'active'
        AND (category_id = ? OR category_id IS NULL)
    `).all(order.category_id);

    for (const alert of alerts) {
      let locations = [];
      try {
        locations = JSON.parse(alert.locations_json || '[]');
      } catch (e) {
        locations = [];
      }

      // Se o prestador não filtrou bairros ou se o bairro do pedido bate com a lista dele
      const matchLocation = locations.length === 0 ||
        (order.neighborhood && locations.some(l => l.toLowerCase() === order.neighborhood.toLowerCase())) ||
        locations.some(l => l.toLowerCase() === order.city.toLowerCase());

      if (matchLocation) {
        const baseUrl = process.env.APP_URL || 'https://trevia.work';
        const text = `🔔 *Novo Pedido Trevia em Joinville!*\n\nOlá, *${alert.name}*!\nUm novo pedido acabou de ser publicado no seu radar:\n\n📌 *Serviço:* ${order.title}\n🏷️ *Categoria:* ${order.category_name || 'Serviços'}\n📍 *Local:* ${order.neighborhood ? order.neighborhood + ', ' : ''}${order.city}\n⏱️ *Prazo:* ${order.timeframe ? order.timeframe.replace('_', ' ') : 'A combinar'}\n\n👉 *Envie sua proposta sigilosa antes dos concorrentes:*\n${baseUrl}/pedidos/${order.id}`;

        await sendWhatsAppMessage(alert.phone, text);
      }
    }
  } catch (err) {
    console.error('[WhatsApp Service] Erro ao notificar prestadores de novo pedido:', err);
  }
}

/**
 * Notifica o cliente proprietário quando um prestador envia uma nova proposta
 */
export async function notifyClientOfNewProposal(order, proposal) {
  try {
    const clientUser = db.prepare('SELECT phone, name FROM users WHERE id = ?').get(order.client_id);
    if (!clientUser || !clientUser.phone) return;

    const valorFormatado = proposal.proposed_value
      ? `R$ ${Number(proposal.proposed_value).toFixed(2)}`
      : 'A combinar';

    const baseUrl = process.env.APP_URL || 'https://trevia.work';
    const text = `🔔 *Nova Proposta Sigilosa Recebida no Trevia!*\n\nOlá, *${clientUser.name}*!\nO profissional *${proposal.provider_name}* acabou de enviar uma proposta para o seu pedido:\n\n📌 *"${order.title}"*\n💰 *Valor Proposto:* ${valorFormatado}\n⏱️ *Prazo Estimado:* ${proposal.estimated_time || 'A combinar'}\n\n🔒 *Apenas você tem acesso a esta proposta.*\n👉 *Toque para ver a mensagem técnica e liberar o contato:*\n${baseUrl}/pedidos/${order.id}`;

    await sendWhatsAppMessage(clientUser.phone, text);
  } catch (err) {
    console.error('[WhatsApp Service] Erro ao notificar cliente sobre nova proposta:', err);
  }
}
