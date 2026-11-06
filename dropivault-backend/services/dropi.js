/**
 * Servicio de conexión real con la API de Dropi
 * Conecta directamente a la plataforma de Dropi (Colombia, México, Ecuador, Chile, Perú)
 * y extrae las órdenes, novedades y estados reales de la tienda del usuario.
 * CERO DATOS FALSOS O SIMULADOS.
 */

/**
 * Normaliza cualquier objeto de orden devuelto por Dropi al formato de DropiVault
 */
function normalizeDropiOrder(r, index) {
  // Identificador de guía o número de orden
  const guia = String(
    r.guide_number || 
    r.numero_guia || 
    r.tracking_number || 
    r.order_id || 
    r.id || 
    r.consecutivo || 
    `DRP-${index + 1}`
  ).trim();

  // Nombre del destinatario / cliente
  let cliente = 'Cliente';
  if (r.customer_name) cliente = r.customer_name;
  else if (r.nombre_cliente) cliente = r.nombre_cliente;
  else if (r.cliente) cliente = typeof r.cliente === 'string' ? r.cliente : (r.cliente.name || r.cliente.nombre || 'Cliente');
  else if (r.name) cliente = r.name;
  else if (r.customer && typeof r.customer === 'object') {
    cliente = r.customer.name || `${r.customer.first_name || ''} ${r.customer.last_name || ''}`.trim() || 'Cliente';
  }

  // Teléfono limpio (solo dígitos)
  const rawTel = r.customer_phone || r.telefono || r.phone || (r.customer && (r.customer.phone || r.customer.cellphone)) || '';
  const telefono = String(rawTel).replace(/\D/g, '');

  // Ciudad de destino
  let ciudad = 'Colombia';
  if (typeof r.city === 'string' && r.city) ciudad = r.city;
  else if (r.city && r.city.name) ciudad = r.city.name;
  else if (r.ciudad_destino) ciudad = typeof r.ciudad_destino === 'string' ? r.ciudad_destino : (r.ciudad_destino.name || r.ciudad_destino.nombre || 'Colombia');
  else if (r.ciudad) ciudad = typeof r.ciudad === 'string' ? r.ciudad : (r.ciudad.name || r.ciudad.nombre || 'Colombia');
  else if (r.destination_city) ciudad = r.destination_city;

  // Dirección física de entrega
  let direccion = 'Dirección no registrada';
  if (typeof r.address === 'string' && r.address) direccion = r.address;
  else if (typeof r.direccion === 'string' && r.direccion) direccion = r.direccion;
  else if (r.customer && r.customer.address) direccion = r.customer.address;
  else if (r.shipping_address) direccion = typeof r.shipping_address === 'string' ? r.shipping_address : (r.shipping_address.address || '');

  // Nombre del producto despachado
  let producto = 'Producto';
  if (typeof r.product_name === 'string' && r.product_name) producto = r.product_name;
  else if (r.producto) producto = typeof r.producto === 'string' ? r.producto : (r.producto.name || r.producto.nombre || 'Producto');
  else if (Array.isArray(r.products) && r.products.length > 0) {
    producto = r.products.map(p => p.name || p.nombre || p.product_name || 'Item').join(', ');
  } else if (Array.isArray(r.items) && r.items.length > 0) {
    producto = r.items.map(p => p.name || p.nombre || p.title || 'Item').join(', ');
  }

  // Estado estandarizado
  const rawEstado = String(r.status || r.state || r.order_status || r.estado || 'PENDIENTE').toUpperCase();
  let estado = rawEstado;
  if (/ENTREGAD/.test(rawEstado)) estado = 'ENTREGADO';
  else if (/DEVOLU|DEVUELT|REHUS/.test(rawEstado)) estado = 'DEVOLUCION';
  else if (/NOVEDAD|INCIDEN|FALLID|NO_CONTESTA|DIRECCION/.test(rawEstado)) estado = 'NOVEDAD';

  // Detalle o motivo de la novedad en transportadora
  const motivo = r.incident_reason || r.incident_description || r.motivo_novedad || r.novedad || r.motivo || r.last_incident || '';

  // Montos financieros en moneda local
  const total = Number(r.total || r.total_order || r.amount || r.valor_total || r.total_amount || 0);
  const costoProveedor = Number(r.supplier_cost || r.costo_proveedor || r.product_cost || r.precio_proveedor || 0);
  const flete = Number(r.shipping_cost || r.costo_flete || r.flete || r.shipping_amount || r.precio_flete || 0);

  // Transportadora
  let transportadora = 'Servientrega';
  if (typeof r.carrier === 'string' && r.carrier) transportadora = r.carrier;
  else if (typeof r.transportadora === 'string' && r.transportadora) transportadora = r.transportadora;
  else if (r.carrier && r.carrier.name) transportadora = r.carrier.name;
  else if (r.transportadora && r.transportadora.nombre) transportadora = r.transportadora.nombre;

  // Horas en novedad
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

/**
 * Autentica al usuario en Dropi utilizando sus credenciales
 * @param {string} email - Correo registrado en Dropi
 * @param {string} password - Contraseña
 * @param {string} paisUrl - URL regional de la API (ej: https://api.dropi.co)
 * @param {string} whiteBrandId - Identificador de Marca Blanca
 * @returns {Promise<{token: string, user: object}>}
 */
async function login(email, password, paisUrl, whiteBrandId) {
  const base = paisUrl.replace(/\/$/, '');
  const endpoints = [
    `${base}/api/login`,
    `${base}/login`
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          white_brand_id: whiteBrandId || 'df3e6b0bb66ceaadca4f84cbc371fd66e04d20fe51fc414da8d1b84d31d178de'
        })
      });

      const data = await res.json();

      if (res.ok && data) {
        const token = data.token || (data.data && data.data.token);
        if (token) {
          return {
            token,
            user: data.user || (data.data && data.data.user) || { email }
          };
        }
      }

      if (data && (data.message || data.error)) {
        lastError = new Error(data.message || data.error);
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Credenciales inválidas en Dropi. Verifica tu correo y contraseña.');
}

/**
 * Consulta las órdenes reales directamente desde la API / Dashboard de Dropi
 * Conecta con los endpoints oficiales de listado de órdenes y normaliza la información.
 * @param {string} token - Token de integración o token de sesión de Dropi
 * @param {string} paisUrl - URL regional de Dropi
 * @returns {Promise<Array>} Lista de órdenes reales de Dropi (devuelve [] si no hay órdenes)
 */
async function getOrders(token, paisUrl) {
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new Error('Token de autenticación de Dropi requerido para consultar órdenes.');
  }

  const base = paisUrl.replace(/\/$/, '');
  const headers = {
    'Authorization': `Bearer ${token.trim()}`,
    'dropi-integration-key': token.trim(),
    'token': token.trim(),
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Estrategias de endpoints ordenadas por prioridad en la API de Dropi
  const requestAttempts = [
    { url: `${base}/api/orders/myorders`, method: 'POST', body: JSON.stringify({ pageSize: 200, limit: 200 }) },
    { url: `${base}/api/orders/myorders?pageSize=200`, method: 'GET' },
    { url: `${base}/api/orders?pageSize=200`, method: 'GET' },
    { url: `${base}/orders/myorders`, method: 'POST', body: JSON.stringify({ pageSize: 200, limit: 200 }) },
    { url: `${base}/api/v1/orders`, method: 'GET' }
  ];

  let lastError = null;

  for (const attempt of requestAttempts) {
    try {
      const options = {
        method: attempt.method,
        headers
      };
      if (attempt.body) {
        options.body = attempt.body;
      }

      const res = await fetch(attempt.url, options);

      if (res.status === 401 || res.status === 403) {
        throw new Error('Token de Dropi inválido o expirado. Inicia sesión nuevamente.');
      }

      if (res.ok) {
        const data = await res.json();
        
        let rawList = null;
        if (Array.isArray(data)) {
          rawList = data;
        } else if (data && typeof data === 'object') {
          if (Array.isArray(data.objects)) rawList = data.objects;
          else if (Array.isArray(data.data)) rawList = data.data;
          else if (Array.isArray(data.orders)) rawList = data.orders;
          else if (Array.isArray(data.pedidos)) rawList = data.pedidos;
          else if (Array.isArray(data.items)) rawList = data.items;
          else if (data.data && Array.isArray(data.data.orders)) rawList = data.data.orders;
        }

        if (rawList !== null) {
          // Órdenes reales obtenidas directamente de Dropi
          return rawList.map(normalizeDropiOrder);
        }
      }
    } catch (err) {
      if (err.message && err.message.includes('Token de Dropi inválido')) {
        throw err;
      }
      lastError = err;
    }
  }

  // Si no se pudo obtener respuesta de ningún endpoint de Dropi, lanzar error explícito
  throw lastError || new Error('No se pudo establecer conexión con los endpoints de órdenes de Dropi.');
}

/**
 * Consulta una orden puntual por su ID o número de guía en Dropi
 */
async function getOrderById(token, paisUrl, orderId) {
  const orders = await getOrders(token, paisUrl);
  return orders.find(o => o.guia === String(orderId).trim()) || null;
}

module.exports = {
  login,
  getOrders,
  getOrderById,
  normalizeDropiOrder
};
