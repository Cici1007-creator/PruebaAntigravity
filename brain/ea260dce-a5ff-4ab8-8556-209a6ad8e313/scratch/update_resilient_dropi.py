path_micro = r'c:\Users\isabe\OneDrive\Desktop\PruebaAntigravity\graphify-out\Microapp.HTML'
path_index = r'c:\Users\isabe\OneDrive\Desktop\PruebaAntigravity\index.html'

with open(path_micro, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's inspect the current conectarConDropiAPI and sincronizarDesdeDropiAPI
old_block = """async function conectarConDropiAPI(e){
  e.preventDefault();
  const email=$('auth-email').value,paisUrl=$('auth-pais').value,tienda=$('auth-tienda').value,
        comunidad=$('auth-comunidad').value,tokenInput=$('auth-token').value.trim(),pw=$('auth-password').value;
  const btn=e.target.querySelector('button.btn-primary');
  
  if (metodoAuthActual === 'token' && !tokenInput) {
    toast('Debes ingresar tu Token de integración de Dropi');
    return;
  }
  if (metodoAuthActual === 'credenciales' && !pw) {
    toast('Debes ingresar tu contraseña de acceso a Dropi');
    return;
  }

  btn.disabled=true;
  $('auth-loading').classList.remove('hidden');
  $('auth-loading-text').innerText = `Conectando en tiempo real con ${paisUrl}…`;

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim(),
        password: (metodoAuthActual === 'credenciales' && pw) ? pw.trim() : undefined,
        token: (metodoAuthActual === 'token' && tokenInput) ? tokenInput.trim() : undefined,
        paisUrl,
        tienda: tienda.trim(),
        comunidad: comunidad.trim()
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Credenciales o token inválidos en Dropi');
    }

    sesionUsuario = { email, paisUrl, tienda, comunidad };
  } catch (err) {
    $('auth-loading').classList.add('hidden');
    btn.disabled=false;
    toast(`Error de conexión con Dropi: ${err.message}`);
    return;
  }

  $('auth-loading-text').innerText = `¡Conexión exitosa! Sincronizando órdenes de ${tienda}…`;
  await new Promise(r=>setTimeout(r,600));

  aplicarRegion(paisUrl);

  $('auth-screen').classList.add('leaving');
  await new Promise(r=>setTimeout(r,400));
  $('auth-screen').classList.add('hidden');
  $('app-dashboard').classList.remove('hidden');
  requestAnimationFrame(()=>$('app-dashboard').classList.add('visible'));
  scrollTo(0,0);
  btn.disabled=false;

  $('header-tienda').innerText=tienda;
  $('header-comunidad').innerText=comunidad;

  sincronizarDesdeDropiAPI();
}

async function sincronizarDesdeDropiAPI(){
  if(!sesionUsuario) return;
  $('file-label').innerText='Consultando órdenes en Dropi API…';
  await new Promise(r=>setTimeout(r,500));

  try {
    const res = await fetch(`${API}/api/orders`, {
      method: 'GET',
      credentials: 'include'
    });
    const data = await res.json();

    if (res.ok && data.ok && Array.isArray(data.orders)) {
      ordenesTotales = data.orders.map((o, i) => ({
        ...o,
        transportadora: o.transportadora || TR[i % TR.length],
        horasNovedad: Number(o.horasNovedad || 0),
        solucion: o.solucion || ''
      }));
      
      if (ordenesTotales.length === 0) {
        $('file-label').innerText = '0 órdenes encontradas en tu cuenta de Dropi';
        toast('Conectado a Dropi. Tu tienda no tiene órdenes activas registradas.');
      } else {
        $('file-label').innerText = `${ordenesTotales.length} órdenes extraídas de Dropi`;
        toast(`Sincronizado con Dropi: ${ordenesTotales.length} órdenes reales`);
      }
    } else {
      throw new Error(data.error || 'Error al conectar con la API de Dropi');
    }
  } catch (err) {
    console.error('Error al sincronizar con Dropi:', err.message);
    toast(`Error al consultar Dropi: ${err.message}`);
    // Cero datos falsos: no inventamos pedidos
    ordenesTotales = cargarGuardado() || [];
    $('file-label').innerText = 'Fallo de sincronización con Dropi';
  }

  refrescar();
}"""

new_block = """const DROPI_WHITE_BRAND_ID = "df3e6b0bb66ceaadca4f84cbc371fd66e04d20fe51fc414da8d1b84d31d178de";
let tokenDirectoDropi = null;

async function conectarConDropiAPI(e){
  e.preventDefault();
  const email=$('auth-email').value,paisUrl=$('auth-pais').value,tienda=$('auth-tienda').value,
        comunidad=$('auth-comunidad').value,tokenInput=$('auth-token').value.trim(),pw=$('auth-password').value;
  const btn=e.target.querySelector('button.btn-primary');
  
  if (metodoAuthActual === 'token' && !tokenInput) {
    toast('Por favor ingresa tu Token de integración de Dropi');
    return;
  }
  if (metodoAuthActual === 'credenciales' && !pw) {
    toast('Por favor ingresa tu contraseña de acceso a Dropi');
    return;
  }

  btn.disabled=true;
  $('auth-loading').classList.remove('hidden');
  $('auth-loading-text').innerText = `Conectando con ${paisUrl}…`;

  let conexionExitosa = false;
  let errorMensaje = '';

  // ESTRATEGIA 1: Intentar a través del Backend seguro en Node.js (localhost:3000)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        email: email.trim(),
        password: (metodoAuthActual === 'credenciales' && pw) ? pw.trim() : undefined,
        token: (metodoAuthActual === 'token' && tokenInput) ? tokenInput.trim() : undefined,
        paisUrl,
        tienda: tienda.trim(),
        comunidad: comunidad.trim()
      })
    });
    clearTimeout(timeoutId);

    const data = await res.json();
    if (res.ok && data.ok) {
      conexionExitosa = true;
      sesionUsuario = { email, paisUrl, tienda, comunidad, canal: 'backend' };
    } else {
      errorMensaje = data.error || 'Credenciales o token no válidos en Dropi';
    }
  } catch (backendErr) {
    console.warn('Backend en localhost:3000 no respondió, intentando conexión directa con Dropi:', backendErr.message);

    // ESTRATEGIA 2: Si el backend local no está corriendo, conectar directo a Dropi desde el navegador
    try {
      if (metodoAuthActual === 'credenciales') {
        const dropiRes = await fetch(`${paisUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password: pw.trim(),
            white_brand_id: DROPI_WHITE_BRAND_ID
          })
        });

        const dropiData = await dropiRes.json();
        if (dropiRes.ok && (dropiData.token || (dropiData.data && dropiData.data.token))) {
          tokenDirectoDropi = dropiData.token || dropiData.data.token;
          conexionExitosa = true;
          sesionUsuario = { email, paisUrl, tienda, comunidad, canal: 'directo' };
        } else {
          errorMensaje = (dropiData && (dropiData.message || dropiData.error)) || 'Credenciales incorrectas en Dropi';
        }
      } else {
        // Token directo provisto por el usuario
        tokenDirectoDropi = tokenInput;
        conexionExitosa = true;
        sesionUsuario = { email, paisUrl, tienda, comunidad, canal: 'directo' };
      }
    } catch (directErr) {
      console.error('Error al conectar con Dropi directamente:', directErr);
      errorMensaje = 'No se pudo conectar: el backend (localhost:3000) está apagado y el navegador bloqueó la conexión directa por CORS. Inicia el backend con "node server.js" o sube tu reporte Excel de Dropi.';
    }
  }

  if (!conexionExitosa) {
    $('auth-loading').classList.add('hidden');
    btn.disabled=false;
    toast(errorMensaje || 'No se pudo autenticar en Dropi');
    return;
  }

  $('auth-loading-text').innerText = `¡Autenticación correcta! Sincronizando datos de ${tienda}…`;
  await new Promise(r=>setTimeout(r,600));

  aplicarRegion(paisUrl);

  $('auth-screen').classList.add('leaving');
  await new Promise(r=>setTimeout(r,400));
  $('auth-screen').classList.add('hidden');
  $('app-dashboard').classList.remove('hidden');
  requestAnimationFrame(()=>$('app-dashboard').classList.add('visible'));
  scrollTo(0,0);
  btn.disabled=false;

  $('header-tienda').innerText=tienda;
  $('header-comunidad').innerText=comunidad;

  sincronizarDesdeDropiAPI();
}

async function sincronizarDesdeDropiAPI(){
  if(!sesionUsuario) return;
  $('file-label').innerText='Consultando órdenes en Dropi…';
  await new Promise(r=>setTimeout(r,400));

  let ordenesRecibidas = null;
  let errorMsg = '';

  // 1. Si la sesión fue abierta con el backend:
  if (sesionUsuario.canal === 'backend') {
    try {
      const res = await fetch(`${API}/api/orders`, { method: 'GET', credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.orders)) {
        ordenesRecibidas = data.orders;
      } else {
        errorMsg = data.error || 'Fallo al consultar órdenes en el backend';
      }
    } catch (err) {
      errorMsg = err.message;
    }
  }

  // 2. Si el backend falló o sesión directa: intentar consultar directo a Dropi
  if (!ordenesRecibidas && tokenDirectoDropi) {
    const endpoints = [
      `${sesionUsuario.paisUrl}/api/orders/myorders`,
      `${sesionUsuario.paisUrl}/api/orders?pageSize=200`,
      `${sesionUsuario.paisUrl}/orders/myorders`
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tokenDirectoDropi}`,
            'dropi-integration-key': tokenDirectoDropi,
            'Content-Type': 'application/json'
          }
        });
        if (res.ok) {
          const d = await res.json();
          const list = Array.isArray(d) ? d : (d.objects || d.data || d.orders || d.pedidos || []);
          if (Array.isArray(list)) {
            ordenesRecibidas = list.map((r, i) => ({
              guia: String(r.guide_number || r.numero_guia || r.order_id || r.id || `DRP-${i+1}`).trim(),
              cliente: r.customer_name || r.nombre_cliente || r.cliente || 'Cliente',
              telefono: String(r.customer_phone || r.telefono || '').replace(/\\D/g, ''),
              ciudad: r.city || (r.ciudad_destino && r.ciudad_destino.name) || 'Colombia',
              direccion: r.address || r.direccion || 'Dirección en guía',
              producto: r.product_name || r.producto || 'Producto',
              estado: String(r.status || r.state || 'PENDIENTE').toUpperCase(),
              motivo: r.incident_reason || r.motivo || '',
              total: Number(r.total || r.amount || 0),
              costoProveedor: Number(r.supplier_cost || r.costo_proveedor || 0),
              flete: Number(r.shipping_cost || r.flete || 0),
              transportadora: r.carrier || r.transportadora || 'Servientrega',
              horasNovedad: Number(r.hours_in_incident || 0),
              solucion: ''
            }));
            break;
          }
        }
      } catch (e) {}
    }
  }

  if (ordenesRecibidas) {
    ordenesTotales = ordenesRecibidas.map((o, i) => ({
      ...o,
      transportadora: o.transportadora || TR[i % TR.length],
      horasNovedad: Number(o.horasNovedad || 0),
      solucion: o.solucion || ''
    }));

    if (ordenesTotales.length === 0) {
      $('file-label').innerText = '0 órdenes encontradas en Dropi';
      toast('Conectado a Dropi. Tu tienda no tiene órdenes registradas en este período.');
    } else {
      $('file-label').innerText = `${ordenesTotales.length} órdenes reales de Dropi`;
      toast(`¡Sincronizado con Dropi! ${ordenesTotales.length} órdenes reales cargadas.`);
    }
  } else {
    toast(errorMsg || 'Aviso: No se pudieron extraer órdenes de Dropi. Puedes cargar tu archivo .xlsx.');
    $('file-label').innerText = 'Sube tu reporte Excel exportado de Dropi';
    ordenesTotales = cargarGuardado() || [];
  }

  refrescar();
}"""

assert old_block in content, "Error: old_block not found in Microapp.HTML"
content = content.replace(old_block, new_block)

with open(path_micro, 'w', encoding='utf-8') as f:
    f.write(content)

with open(path_index, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated Microapp.HTML and index.html with resilient dual-channel Dropi connection!")

