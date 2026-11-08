const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Cargar variables de entorno: intenta con 'dotenv' o con parser nativo
try {
  require('dotenv').config();
} catch (e) {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^([^=]+)=(.*)$/);
      if (match && !match[1].startsWith('#')) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// Cargar dependencias esenciales de Express y seguridad
let express, cors, helmet, rateLimit, cookieParser;
try {
  express = require('express');
  cors = require('cors');
  helmet = require('helmet');
  rateLimit = require('express-rate-limit');
  cookieParser = require('cookie-parser');
} catch (err) {
  console.error('❌ Error crítico: No se pudieron cargar las dependencias esenciales de Express:', err.message);
  console.error('Ejecuta "npm install" en la carpeta dropivault-backend antes de iniciar el servidor.');
  process.exit(1);
}

const dropiService = require('./services/dropi');
const whatsappService = require('./services/whatsapp');
const auditService = require('./services/audit');
const digestService = require('./services/digest');
const { createSession, getSession, deleteSession } = require('./services/sessions');

const PORT = process.env.PORT || 3000;
const PAIS_WHITELIST = [
  'https://api.dropi.co',
  'https://api.dropi.mx',
  'https://api.dropi.ec',
  'https://api.dropi.cl',
  'https://api.dropi.pe'
];

/**
 * Comparación segura contra ataques de temporización (timing attacks)
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Orígenes autorizados para CORS
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'https://dropivault.netlify.app,http://localhost:5500')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Almacén en memoria para eventos de webhook en tiempo real
const webhookEventsLog = [];

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Configuración de CORS:
// Si no hay Origin (servidores backend Dropi/Meta, CLI), se permite continuar ({ origin: false }).
// Si hay Origin y no está en allowedOrigins, se rechaza.
const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  if (!origin) {
    return callback(null, { origin: false });
  }

  if (allowedOrigins.includes(origin)) {
    return callback(null, { origin: true, credentials: true });
  }

  return callback(new Error('CORS: Origen no permitido'));
};

app.use(cors(corsOptionsDelegate));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Espera 15 minutos.' }
});

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Middleware para exigir sesión válida basada en la cookie dropivault_session
 */
function requireSession(req, res, next) {
  const sessionId = req.cookies?.dropivault_session;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(401).json({ ok: false, error: 'Sesión no iniciada o expirada' });
  }

  req.session = session;
  next();
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'online',
    mode: 'express',
    features: ['dropi-sync', 'whatsapp-cloud', 'freight-audit', 'daily-digest', 'webhooks', 'auto-resolve'],
    timestamp: new Date().toISOString()
  });
});

// 1. Auth Login (Exclusivo con Token Oficial de Integración de Dropi)
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, token, paisUrl, tienda, comunidad } = req.body;
    const cleanPaisUrl = String(paisUrl || 'https://api.dropi.co').replace(/\/$/, '');

    // Validación estricta de país permitido contra PAIS_WHITELIST
    if (!PAIS_WHITELIST.includes(cleanPaisUrl)) {
      return res.status(400).json({ ok: false, error: 'País no soportado' });
    }

    if (!email || !tienda) {
      return res.status(400).json({ ok: false, error: 'Correo corporativo y nombre de tienda son requeridos' });
    }

    const tokenFinal = token ? String(token).trim() : null;
    if (!tokenFinal) {
      return res.status(400).json({ ok: false, error: 'Ingresa tu Token de integración de Dropi' });
    }

    const sessionId = createSession({
      token: tokenFinal,
      email: email.trim(),
      tienda: tienda.trim(),
      comunidad: (comunidad || '').trim(),
      paisUrl: cleanPaisUrl
    });

    res.cookie('dropivault_session', sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ ok: true, tienda: tienda.trim(), comunidad: comunidad || 'Dropi', sessionToken: sessionId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Error en el servidor' });
  }
});

// 2. Orders Dropi (Requiere sesión activa, admite cookie o Bearer token)
app.get('/api/orders', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    let bearerToken = null;
    if (authHeader.startsWith('Bearer ')) bearerToken = authHeader.slice(7).trim();
    const sessionId = req.cookies?.dropivault_session || bearerToken;
    const session = getSession(sessionId);

    if (!session) {
      return res.status(401).json({ ok: false, error: 'Sesión no iniciada o expirada' });
    }

    const orders = await dropiService.getOrders(session.token, session.paisUrl);
    res.json({ ok: true, orders });
  } catch (e) {
    console.error('[Error /api/orders]:', e.message);
    res.status(502).json({ ok: false, error: e.message || 'Error al consultar órdenes en Dropi' });
  }
});

// 3. WhatsApp Send (Protegida con requireSession)
app.post('/api/whatsapp/send', requireSession, async (req, res) => {
  try {
    const { telefono, mensaje } = req.body;
    const result = await whatsappService.sendMessage(telefono, mensaje);
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// 4. WhatsApp Auto-resolve (Protegida con requireSession)
app.post('/api/whatsapp/auto-resolve', requireSession, (req, res) => {
  try {
    // TODO: Implementar la lógica real de auto-resolución vía WhatsApp / Dropi API
    res.json({
      ok: true,
      message: 'Solicitud de auto-resolución recibida'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Error en el servidor' });
  }
});

// 5. Webhook Dropi (Validación de secreto y recepción segura)
app.get('/api/webhooks/dropi', (req, res) => {
  res.json({ ok: true, status: 'online', service: 'DropiVault Webhook Receiver' });
});

app.post('/api/webhooks/dropi', (req, res) => {
  const secretProvided = req.headers['x-dropi-secret'] || req.headers['x-webhook-secret'] || req.query.secret;
  const configuredSecret = process.env.DROPI_WEBHOOK_SECRET;

  if (!configuredSecret || !secretProvided || !safeCompare(String(secretProvided), String(configuredSecret))) {
    return res.status(401).json({ ok: false, error: 'No autorizado: secreto inválido' });
  }

  // Registrar evento y recortar el arreglo a un máximo de 200 elementos
  webhookEventsLog.unshift({
    id: `dropi_${Date.now()}`,
    receivedAt: new Date().toISOString(),
    type: req.body?.type || req.body?.event || 'order.incident_updated',
    data: req.body?.data || req.body
  });
  if (webhookEventsLog.length > 200) webhookEventsLog.length = 200;

  // TODO: Implementar la lógica real para procesar el evento webhook de Dropi (actualizar base de datos, emitir eventos a clientes, etc.)
  res.status(200).json({ ok: true, message: 'Webhook recibido' });
});

// GET /api/webhooks/events (Protegida con requireSession)
app.get('/api/webhooks/events', requireSession, (req, res) => {
  res.json({ ok: true, events: webhookEventsLog });
});

// 6. Webhook WhatsApp Meta (Verificación y recepción con validación HMAC SHA256)
app.get('/api/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const verifyToken = process.env.WEBHOOK_SECRET;

  if (mode === 'subscribe' && verifyToken && token && safeCompare(String(token), String(verifyToken))) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

app.post('/api/webhooks/whatsapp', (req, res) => {
  const signatureHeader = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret || !signatureHeader || !req.rawBody) {
    return res.status(401).json({ ok: false, error: 'Firma no válida o ausente' });
  }

  const signature = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : signatureHeader;
  const expectedSignature = crypto.createHmac('sha256', appSecret).update(req.rawBody).digest('hex');

  if (!safeCompare(signature, expectedSignature)) {
    return res.status(401).json({ ok: false, error: 'Firma no válida' });
  }

  try {
    const body = req.body;
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const messageObj = changes?.value?.messages?.[0];

    if (messageObj && messageObj.text?.body) {
      const text = messageObj.text.body;
      const from = messageObj.from;
      const clasificacion = whatsappService.classifyCustomerReply(text);

      webhookEventsLog.unshift({
        id: `wa_${Date.now()}`,
        receivedAt: new Date().toISOString(),
        type: 'whatsapp.message_received',
        data: { from, text, clasificacion }
      });
      if (webhookEventsLog.length > 200) webhookEventsLog.length = 200;
      console.log(`[WhatsApp Incoming] De: ${from} | Intención: ${clasificacion.intencion}`);
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (e) {
    res.status(200).send('EVENT_RECEIVED');
  }
});

// 7. Auditoría Forense de Fletes (Protegida con requireSession)
app.post('/api/audit/freight', requireSession, (req, res) => {
  try {
    const { orders } = req.body;
    const resultado = auditService.auditFreight(orders || []);
    res.json({ ok: true, ...resultado });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 8. Resumen Diario Ejecutivo / Daily Digest (Protegida con requireSession)
app.post('/api/reports/daily-digest', requireSession, async (req, res) => {
  try {
    const digest = digestService.generateDailyDigest(req.body);
    let telegramResult = null;

    if (req.body.enviarTelegram) {
      try {
        telegramResult = await digestService.sendToTelegram(digest.markdown);
      } catch (tgErr) {
        telegramResult = { ok: false, error: tgErr.message };
      }
    }

    res.json({
      ok: true,
      digest: digest.markdown,
      timestamp: digest.timestamp,
      telegram: telegramResult
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 9. Logout
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies?.dropivault_session;
  if (sessionId) deleteSession(sessionId);
  res.clearCookie('dropivault_session');
  res.json({ ok: true });
});

// Manejador centralizado de errores (incluye bloqueo por CORS)
app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ ok: false, error: err.message });
  }
  console.error('[Error Servidor]:', err);
  res.status(500).json({ ok: false, error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 DropiVault Backend activo en http://localhost:${PORT} [Express]`);
});
