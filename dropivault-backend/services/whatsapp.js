/**
 * Servicio de mensajería y webhooks de WhatsApp Cloud API (Meta)
 * Incluye envío de mensajes y clasificador inteligente de respuestas para auto-resolución de guías.
 */

async function sendMessage(to, message) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  // Limpiar número de teléfono (solo dígitos)
  const cleanPhone = String(to || '').replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 7) {
    throw new Error('Número de teléfono inválido o con formato incorrecto');
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new Error('El mensaje no puede estar vacío');
  }

  // Si no están configuradas las credenciales en .env, retornar simulación exitosa
  if (!token || !phoneId) {
    return {
      ok: true,
      simulado: true,
      mensaje: 'Mensaje simulado correctamente (WhatsApp Cloud API en modo demostración)'
    };
  }

  // Llamada oficial a Meta WhatsApp Cloud API
  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: message.trim()
      }
    })
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg = (data && data.error && data.error.message) || 'Error devuelto por WhatsApp Cloud API';
    throw new Error(errorMsg);
  }

  return {
    ok: true,
    simulado: false,
    data
  };
}

/**
 * Analiza una respuesta de WhatsApp enviada por el cliente y clasifica la intención
 * para auto-resolver la guía o actualizar la dirección en Dropi / Transportadora.
 * @param {string} text - Texto del mensaje del cliente
 * @returns {Object} Clasificación y acción recomendada
 */
function classifyCustomerReply(text) {
  const t = String(text || '').toLowerCase().trim();

  // Patrones de cancelación / rechazo
  if (/(cancelar|no quiero|ya no|no lo voy a recibir|no compre|estafa|demoraron mucho)/i.test(t)) {
    return {
      intencion: 'CANCELACION',
      accion: 'MARCAR_DEVOLUCION_INMEDIATA',
      estadoSugerido: 'CANCELADO_CLIENTE',
      explicacion: 'El cliente indicó expresamente que no desea recibir el producto.',
      autoResolver: false
    };
  }

  // Patrones de actualización de dirección (Torre, Apto, Manzana, Casa, Calle, Carrera, etc.)
  const patronDireccion = /(calle|cra|carrera|cll|dg|diagonal|transversal|tv|av|avenida|torre|apto|apartamento|piso|barrio|manzana|mz|conjunto|casa|frente)/i;
  if (patronDireccion.test(t)) {
    return {
      intencion: 'ACTUALIZACION_DIRECCION',
      accion: 'ACTUALIZAR_NOMENCLATURA',
      estadoSugerido: 'ENTREGADO',
      datosExtraidos: text,
      explicacion: 'El cliente proporcionó especificaciones detalladas de dirección/portería.',
      autoResolver: true
    };
  }

  // Patrones de confirmación de reprogramación o dinero listo
  if (/(si|confirmo|confirmado|recibo|manana|mañana|hoy|tengo el dinero|listo el efectivo|dejar en porteria|porteria|vigilante)/i.test(t)) {
    return {
      intencion: 'CONFIRMACION_ENTREGA',
      accion: 'REPROGRAMAR_ENTREGA',
      estadoSugerido: 'ENTREGADO',
      explicacion: 'El cliente confirma que estará presente o que deja el dinero listo para recibir.',
      autoResolver: true
    };
  }

  // Dudas o peticiones de soporte
  return {
    intencion: 'CONSULTA_GENERAL',
    accion: 'REVISAR_MANUALMENTE',
    estadoSugerido: 'NOVEDAD',
    explicacion: 'Mensaje requiere revisión de un asesor humano.',
    autoResolver: false
  };
}

module.exports = {
  sendMessage,
  classifyCustomerReply
};
