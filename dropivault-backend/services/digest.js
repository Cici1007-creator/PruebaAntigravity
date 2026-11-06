/**
 * Servicio de Generación de Resumen Ejecutivo Diario (Daily Digest)
 * Compila las métricas clave de la tienda y permite despacharlas vía Telegram Bot o WhatsApp
 */

/**
 * Genera el texto del resumen ejecutivo a partir de las métricas de órdenes
 * @param {Object} data - Datos consolidados de la tienda
 * @returns {Object} Texto en formato Markdown y texto plano
 */
function generateDailyDigest({ tienda, facturacion, utilidadNeta, capitalRecuperado, enNovedad, totalOrdenes, tasaEntrega, fletesReclamables, alertaAsesor, moneda = 'COP' }) {
  const fecha = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const markdown = `📊 *RESUMEN EJECUTIVO DE TESORERÍA - DROPIVAULT*
🏪 *Tienda:* ${tienda || 'Mi Tienda Dropi'}
📅 *Fecha:* ${fecha}
━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Facturación Bruta:* $${Number(facturacion || 0).toLocaleString('es-CO')} ${moneda}
💵 *Utilidad Neta Disponible:* $${Number(utilidadNeta || 0).toLocaleString('es-CO')} ${moneda}
🛡️ *Capital Rescatado (WA):* $${Number(capitalRecuperado || 0).toLocaleString('es-CO')} ${moneda}
📦 *Total Órdenes Auditadas:* ${totalOrdenes || 0}
🎯 *Efectividad de Entrega:* ${tasaEntrega || 0}%
⚠️ *Guías en Novedad Activa:* ${enNovedad || 0}
⚖️ *Fletes Reclamables (Auditoría):* $${Number(fletesReclamables || 0).toLocaleString('es-CO')} ${moneda}
━━━━━━━━━━━━━━━━━━━━━━━━
💡 *Consejo del Asesor Inteligente:*
${alertaAsesor || 'Mantén el seguimiento de guías con más de 24h para evitar devolución automática.'}
`;

  return {
    markdown,
    timestamp: new Date().toISOString()
  };
}

/**
 * Envía el resumen ejecutivo a un canal de Telegram mediante Telegram Bot API
 * @param {string} text - Mensaje formateado en Markdown
 * @returns {Promise<Object>}
 */
async function sendToTelegram(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return {
      ok: true,
      simulado: true,
      mensaje: 'Telegram no configurado en .env (TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID faltantes). Digest generado en modo local.'
    };
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.description || 'Error al enviar mensaje a Telegram');
  }

  return {
    ok: true,
    simulado: false,
    telegramId: data.result?.message_id
  };
}

module.exports = {
  generateDailyDigest,
  sendToTelegram
};

