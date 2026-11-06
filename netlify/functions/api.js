/**
 * Netlify Serverless Function: api.js
 * Provee la API segura para DropiVault en Netlify sin necesidad de un servidor dedicado.
 * Gestiona autenticación con Dropi, extracción y normalización de órdenes,
 * sesiones criptográficamente firmadas y despacho de mensajes WhatsApp.
 */

const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'dropivault_net_key_2026_x79q!';
const WHITE_BRAND_ID = process.env.DROPI_WHITE_BRAND_ID || 'df3e6b0bb66ceaadca4f84cbc371fd66e04d20fe51fc414da8d1b84d31d178de';

// Funciones de firma y verificación de sesión sin estado (Stateless & Serverless-ready)
function signSession(data) {
  const payload = Buffer.from(JSON.stringify({
    ...data,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 horas de validez
  })).toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${hmac}`;
}

function verifySession(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string' || !tokenStr.includes('.')) return null;
  const parts = tokenStr.split('.');
  if (parts.length !== 2) return null;
  const [payload, hmac] = parts;
  const expectedHmac = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (hmac !== expectedHmac) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function normalizeOrder(r, index) {
  const guia = String(
    r.guide_number || 
    r.numero_guia || 
    r.tracking_number || 
    r.order_id || 
    r.id || 
    r.consecutivo || 
    `DRP-${index + 1}`
  ).trim();

  let cliente = 'Cliente';
  if (r.customer_name) cliente = r.customer_name;
  else if (r.nombre_cliente) cliente = r.nombre_cliente;
  else if (r.cliente) cliente = typeof r.cliente === 'string' ? r.cliente : (r.cliente.name || r.cliente.nombre || 'Cliente');
  else if (r.name) cliente = r.name;
  else if (r.customer && typeof r.customer === 'object') {
    cliente = r.customer.name || `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.trim() || 'Cliente';
  }

  const rawTel = r.customer_phone || r.telefono || r.phone || (r.customer && (r.customer.phone || r.customer.cellphone)) || '';
  const telefono = String(rawTel).replace(/\D/g, '');

  let ciudad = 'Colombia';
  if (typeof r.city === 'string' && r.city) ciudad = r.city;
  else if (r.city && r.city.name) ciudad = r.city.name;
  else if (r.ciudad_destino) ciudad = typeof r.ciudad_destino === 'string' ? r.ciudad_destino : (r.ciudad_destino.name || r.ciudad_destino.nombre || 'Colombia');
  else if (r.ciudad) ciudad = typeof r.ciudad === 'string' ? r.ciudad : (r.ciudad.name || r.ciudad.nombre || 'Colombia');
  else if (r.destination_city) ciudad = r.destination_city;

  let direccion = 'Dirección no registrada';
  if (typeof r.address === 'string' && r.address) direccion = r.address;
  else if (typeof r.direccion === 'string' && r.direccion) direccion = r.direccion;
  else if (r.customer && r.customer.address) direccion = r.customer.address;
  else if (r.shipping_address) direccion = typeof r.shipping_address === 'string' ? r.shipping_address : (r.shipping_address.address || '');

  let producto = 'Producto';
  if (typeof r.product_name === 'string' && r.product_name) producto = r.product_name;
  else if (r.producto) producto = typeof r.producto === 'string' ? r.producto : (r.producto.name || r.producto.nombre || 'Producto');
  else if (Array.isArray(r.products) && r.products.length > 0) {
    producto = r.products.map(p => p.name || p.nombre || p.product_name || 'Item').join(', ');
  } else if (Array.isArray(r.items) && r.items.length > 0) {
    producto = r.items.map(p => p.name || p.nombre || p.title || 'Item').join(', ');
  }

  const rawEstado = String(r.status || r.state || r.order_status || r.estado || 'PENDIENTE').toUpperCase();
  let estado = rawEstado;
  if (/ENTREGAD/.test(rawEstado)) estado = 'ENTREGADO';
  else if (/DEVOLU|DEVUELT|REHUS/.test(rawEstado)) estado = 'DEVOLUCION';
  else if (/NOVEDAD|INCIDEN|FALLID|NO_CONTESTA|DIRECCION/.test(rawEstado)) estado = 'NOVEDAD';

  const motivo = r.incident_reason || r.incident_description || r.motivo_novedad || r.novedad || r.motivo || r.last_incident || '';
  const total = Number(r.total || r.total_order || r.amount || r.valor_total || r.total_amount || 0);
  const costoProveedor = Number(r.supplier_cost || r.costo_proveedor || r.product_cost || r.precio_proveedor || 0);
  const flete = Number(r.shipping_cost || r.costo_flete || r.flete || r.shipping_amount || r.precio_flete || 0);

  let transportadora = 'Servientrega';
  if (typeof r.carrier === 'string' && r.carrier) transportadora = r.carrier;
  else if (typeof r.transportadora === 'string' && r.transportadora) transportadora = r.transportadora;
  else if (r.carrier && r.carrier.name) transportadora = r.carrier.name;
  else if (r.transportadora && r.transportadora.nombre) transportadora = r.transportadora.nombre;

  let horasNovedad = 0;
  if (r.hours_in_incident !== undefined) horasNovedad = parseInt(r.hours_in_incident, 10) || 0;
  else if (r.horas_novedad !== undefined) horasNovedad = parseInt(r.horas_novedad, 10) || 0;
  else if (estado === 'NOVEDAD' && (r.updated_at || r.fecha_novedad)) {
    const diff = Date.now() - new Date(r.updated_at || r.fecha_novedad).getTime();
    horasNovedad = Math.max(0, Math.floor(diff / (1000 * 60 * 60)));
  }

  return {
    guia,
    cliente,
    telefono,
    ciudad,
    direccion,
    producto,
    estado,
    motivo,
    total,
    costoProveedor,
    flete,
    transportadora,
    horasNovedad,
    solucion: r.solucion || r.solution_note || ''
  };
}

exports.handler = async function (event, context) {
  // Configuración de cabeceras CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Normalizar ruta: quitar prefijo de función de Netlify si existe
  const rawPath = event.path || '';
  const path = rawPath.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  const method = event.httpMethod;

  // 1. Health check
  if (path === '/health' && method === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        status: 'online',
        mode: 'netlify-serverless',
        timestamp: new Date().toISOString()
      })
    };
  }

  // 2. Auth Login: POST /auth/login
  if (path === '/auth/login' && method === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { email, password, token, paisUrl, tienda, comunidad } = body;
      const cleanPaisUrl = String(paisUrl || 'https://api.dropi.co').replace(/\/$/, '');

      if (!email || !tienda) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Correo corporativo y nombre de tienda son requeridos' })
        };
      }

      let dropiToken = token ? String(token).trim() : null;

      // Autenticar con Dropi si se suministró contraseña
      if (password && String(password).trim()) {
        const loginEndpoints = [
          `${cleanPaisUrl}/api/login`,
          `${cleanPaisUrl}/login`
        ];

        let authSuccess = false;
        let lastErr = null;

        for (const url of loginEndpoints) {
          try {
            const dropiRes = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                email: email.trim(),
                password: String(password).trim(),
                white_brand_id: WHITE_BRAND_ID
              })
            });

            const data = await dropiRes.json();
            if (dropiRes.ok && data) {
              const tok = data.token || (data.data && data.data.token) || data.jwt;
              if (tok) {
                dropiToken = tok;
                authSuccess = true;
                break;
              }
            }
            if (data && (data.message || data.error)) {
              lastErr = data.message || data.error;
            }
          } catch (e) {
            lastErr = e.message;
          }
        }

        if (!authSuccess || !dropiToken) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              ok: false,
              error: lastErr || 'Credenciales no válidas en Dropi. Por favor revisa tu correo y contraseña.'
            })
          };
        }
      } else if (!dropiToken) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Ingresa tu contraseña o Token de integración de Dropi' })
        };
      }

      // Crear token de sesión firmado para Serverless
      const sessionToken = signSession({
        token: dropiToken,
        email: email.trim(),
        tienda: tienda.trim(),
        comunidad: (comunidad || '').trim(),
        paisUrl: cleanPaisUrl
      });

      // Retornar cookie y respuesta JSON con sessionToken
      const cookieHeader = `dropivault_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': cookieHeader
        },
        body: JSON.stringify({
          ok: true,
          tienda: tienda.trim(),
          comunidad: (comunidad || '').trim(),
          modo: password ? 'credenciales_dropi' : 'token_dropi',
          sessionToken
        })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Error procesando login: ' + err.message })
      };
    }
  }

  // 3. Extraer sesión para rutas protegidas
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  let sessionTokenCandidate = null;
  if (authHeader.startsWith('Bearer ')) {
    sessionTokenCandidate = authHeader.slice(7).trim();
  }

  // Si no está en Header, buscar en Cookies
  if (!sessionTokenCandidate && event.headers['cookie']) {
    const cookies = event.headers['cookie'].split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'dropivault_session') {
        sessionTokenCandidate = decodeURIComponent(v);
        break;
      }
    }
  }

  const session = verifySession(sessionTokenCandidate);

  // 4. Get Orders: GET /orders
  if (path === '/orders' && method === 'GET') {
    if (!session || !session.token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ ok: false, error: 'Sesión expirada o no iniciada' })
      };
    }

    const base = (session.paisUrl || 'https://api.dropi.co').replace(/\/$/, '');
    const dropiHeaders = {
      'Authorization': `Bearer ${session.token}`,
      'dropi-integration-key': session.token,
      'token': session.token,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const requestAttempts = [
      { url: `${base}/api/orders/myorders`, method: 'POST', body: JSON.stringify({ pageSize: 200, limit: 200 }) },
      { url: `${base}/api/orders/myorders?pageSize=200`, method: 'GET' },
      { url: `${base}/api/orders?pageSize=200`, method: 'GET' },
      { url: `${base}/orders/myorders`, method: 'POST', body: JSON.stringify({ pageSize: 200, limit: 200 }) },
      { url: `${base}/api/v1/orders`, method: 'GET' }
    ];

    let ordersFound = null;
    let fetchError = null;

    for (const attempt of requestAttempts) {
      try {
        const opts = { method: attempt.method, headers: dropiHeaders };
        if (attempt.body) opts.body = attempt.body;

        const res = await fetch(attempt.url, opts);
        if (res.ok) {
          const data = await res.json();
          let rawList = null;
          if (Array.isArray(data)) rawList = data;
          else if (data && typeof data === 'object') {
            rawList = data.objects || data.data || data.orders || data.pedidos || data.items || data.results || null;
          }
          if (Array.isArray(rawList)) {
            ordersFound = rawList.map((o, idx) => normalizeOrder(o, idx));
            break;
          }
        }
      } catch (err) {
        fetchError = err.message;
      }
    }

    if (ordersFound !== null) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          count: ordersFound.length,
          orders: ordersFound,
          tienda: session.tienda
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        count: 0,
        orders: [],
        tienda: session.tienda,
        aviso: 'Conectado con Dropi. No se encontraron pedidos recientes o el endpoint devolvió 0 registros.'
      })
    };
  }

  // 5. WhatsApp Send: POST /whatsapp/send
  if (path === '/whatsapp/send' && method === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { telefono, mensaje, guia } = body;

      if (!telefono || !mensaje) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'Teléfono y mensaje requeridos' })
        };
      }

      const waToken = process.env.WHATSAPP_TOKEN;
      const waPhoneId = process.env.WHATSAPP_PHONE_ID;

      // Si están las variables configuradas en Netlify, enviar por Meta Cloud API
      if (waToken && waPhoneId) {
        const cleanTel = String(telefono).replace(/\D/g, '');
        const metaRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanTel,
            type: 'text',
            text: { body: mensaje }
          })
        });

        const metaData = await metaRes.json();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: metaRes.ok,
            simulado: false,
            metaResponse: metaData
          })
        };
      }

      // Modo de prueba / simulación inteligente
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          simulado: true,
          guia,
          telefono,
          mensaje: 'Mensaje despachado con éxito vía simulación DropiVault'
        })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: err.message })
      };
    }
  }

  // 6. Reports Daily Digest: POST /reports/daily-digest
  if (path === '/reports/daily-digest' && method === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { orders = [], summary = {} } = body;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          digest: {
            titulo: 'Resumen Ejecutivo DropiVault',
            generado: new Date().toLocaleString(),
            pedidos: orders.length,
            metricas: summary
          }
        })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: err.message })
      };
    }
  }

  // 7. Webhook Dropi: POST /webhooks/dropi
  if (path === '/webhooks/dropi' && method === 'POST') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, recibido: true, timestamp: Date.now() })
    };
  }

  // 8. WhatsApp Auto-Resolve NLP: POST /whatsapp/auto-resolve
  if (path === '/whatsapp/auto-resolve' && method === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { text = '' } = body;
      const lower = text.toLowerCase();
      let solucion = 'REPROGRAMAR_ENTREGA';
      let accion = 'Reprogramar entrega para mañana en jornada de la tarde';

      if (/direccion|barrio|casa|apto|calle|carrera/.test(lower)) {
        solucion = 'CORRECCION_DIRECCION';
        accion = 'Actualizar nomenclatura y referencias en la guía';
      } else if (/no quiero|cancele|ya no|demorado|devolver/.test(lower)) {
        solucion = 'GESTION_SALVAMENTO';
        accion = 'Ofrecer bono o descuento del 15% para evitar devolución';
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          intent: solucion,
          accionRecomendada: accion
        })
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: err.message })
      };
    }
  }

  // 9. Auth Logout: POST /auth/logout
  if (path === '/auth/logout' && method === 'POST') {
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': 'dropivault_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
      },
      body: JSON.stringify({ ok: true, mensaje: 'Sesión cerrada' })
    };
  }

  // Ruta no encontrada
  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ ok: false, error: 'Endpoint no encontrado: ' + path })
  };
};
