const fs = require('fs');
const path = require('path');

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

// Almacén en memoria para eventos de webhook en tiempo real
const webhookEventsLog = [];

let app;

try {
  // ==========================================
  // BLOQUE 1: EXPRESS (PRODUCCIÓN & DESARROLLO)
  // ==========================================
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const cookieParser = require('cookie-parser');

  app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(express.json());

  app.use(cors({
    origin: function (origin, callback) {
      callback(null, true); // Permitir peticiones locales y desde navegadores
    },
    credentials: true
  }));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Demasiados intentos. Espera 15 minutos.' }
  });

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

  // 1. Auth Login (Exclusivo con Token Oficial de Dropi)
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    try {
      const { email, token, paisUrl, tienda, comunidad } = req.body;
      const cleanPaisUrl = String(paisUrl || 'https://api.dropi.co').replace(/\/$/, '');

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

  // 2. Orders Dropi
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

  // 3. WhatsApp Send
  app.post('/api/whatsapp/send', async (req, res) => {
    try {
      const { telefono, mensaje } = req.body;
      const result = await whatsappService.sendMessage(telefono, mensaje);
      res.json(result);
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // 4. WhatsApp Auto-resolve Simulation / Classifier
  app.post('/api/whatsapp/auto-resolve', (req, res) => {
    try {
      const { mensaje, guia } = req.body;
      const clasificacion = whatsappService.classifyCustomerReply(mensaje);
      res.json({
        ok: true,
        guia: guia || 'DRP-992831',
        clasificacion
      });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  // 5. Webhook Dropi (Recepción de eventos en tiempo real y verificación)
  app.get('/api/webhooks/dropi', (req, res) => {
    res.json({ ok: true, status: 'online', service: 'DropiVault Webhook Receiver' });
  });

  app.post('/api/webhooks/dropi', (req, res) => {
    const event = req.body;
    const receivedAt = new Date().toISOString();
    const eventRecord = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      receivedAt,
      type: event.type || event.event || 'order.incident_updated',
      data: event.data || event
    };

    webhookEventsLog.unshift(eventRecord);
    if (webhookEventsLog.length > 50) webhookEventsLog.pop();

    console.log(`[Webhook Dropi Recibido] Tipo: ${eventRecord.type}`);
    res.json({ ok: true, processed: true, eventId: eventRecord.id });
  });

  app.get('/api/webhooks/events', (req, res) => {
    res.json({ ok: true, events: webhookEventsLog });
  });

  // 6. Webhook WhatsApp Meta (Verificación y recepción)
  app.get('/api/webhooks/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WEBHOOK_SECRET || 'dropivault_webhook_token_2026';

    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    res.sendStatus(403);
  });

  app.post('/api/webhooks/whatsapp', (req, res) => {
    try {
      const body = req.body;
      // Extraer mensaje de WhatsApp Meta format
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
        console.log(`[WhatsApp Incoming] De: ${from} | Intención: ${clasificacion.intencion}`);
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (e) {
      res.status(200).send('EVENT_RECEIVED');
    }
  });

  // 7. Auditoría Forense de Fletes
  app.post('/api/audit/freight', (req, res) => {
    try {
      const { orders } = req.body;
      const resultado = auditService.auditFreight(orders || []);
      res.json({ ok: true, ...resultado });
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // 8. Resumen Diario Ejecutivo (Daily Digest)
  app.post('/api/reports/daily-digest', async (req, res) => {
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

  app.listen(PORT, () => {
    console.log(`🚀 DropiVault Backend activo en http://localhost:${PORT} [Express]`);
  });

} catch (err) {
  // ========================================================
  // BLOQUE 2: SERVIDOR NATIVO NODE.JS (CERO DEPENDENCIAS NPM)
  // ========================================================
  console.log(`⚠️ Dependencias npm no detectadas (${err.message}).`);
  console.log(`⚡ Iniciando servidor nativo Node.js sin dependencias en puerto ${PORT}...`);

  const http = require('http');

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const parseCookies = (rc) => {
      const list = {};
      if (!rc) return list;
      rc.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
      });
      return list;
    };

    const cookies = parseCookies(req.headers.cookie);

    const sendJson = (status, obj, setCookieHeader) => {
      const headers = { 'Content-Type': 'application/json' };
      if (setCookieHeader) headers['Set-Cookie'] = setCookieHeader;
      res.writeHead(status, headers);
      res.end(JSON.stringify(obj));
    };

    const readBody = () => new Promise(resolve => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({}); }
      });
    });

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    try {
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(200, {
          ok: true,
          status: 'online',
          mode: 'native_http',
          features: ['dropi-sync', 'whatsapp-cloud', 'freight-audit', 'daily-digest', 'webhooks', 'auto-resolve'],
          timestamp: new Date().toISOString()
        });
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await readBody();
        const { email, password, token, paisUrl, tienda, comunidad } = body;
        const cleanPaisUrl = String(paisUrl || 'https://api.dropi.co').replace(/\/$/, '');

        if (!email || !tienda) {
          return sendJson(400, { ok: false, error: 'Correo corporativo y nombre de tienda requeridos' });
        }

        let tokenFinal = token ? String(token).trim() : null;

        if (password && String(password).trim()) {
          const whiteBrandId = process.env.DROPI_WHITE_BRAND_ID || 'df3e6b0bb66ceaadca4f84cbc371fd66e04d20fe51fc414da8d1b84d31d178de';
          try {
            const authData = await dropiService.login(email.trim(), String(password).trim(), cleanPaisUrl, whiteBrandId);
            tokenFinal = authData.token;
          } catch (err) {
            return sendJson(401, { ok: false, error: err.message || 'Credenciales inválidas en Dropi' });
          }
        } else if (!tokenFinal) {
          return sendJson(400, { ok: false, error: 'Ingresa tu Token de integración o contraseña de Dropi' });
        }

        const sessionId = createSession({
          token: tokenFinal,
          email: email.trim(),
          tienda: tienda.trim(),
          comunidad: (comunidad || '').trim(),
          paisUrl: cleanPaisUrl
        });

        const cookieStr = `dropivault_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
        return sendJson(200, { ok: true, tienda: tienda.trim(), comunidad: comunidad || 'Dropi' }, cookieStr);
      }

      if (pathname === '/api/orders' && req.method === 'GET') {
        const sessionId = cookies.dropivault_session;
        const session = getSession(sessionId);

        if (!session) {
          return sendJson(401, { ok: false, error: 'Sesión no iniciada o expirada' });
        }

        const orders = await dropiService.getOrders(session.token, session.paisUrl);
        return sendJson(200, { ok: true, orders });
      }

      if (pathname === '/api/whatsapp/send' && req.method === 'POST') {
        const body = await readBody();
        const result = await whatsappService.sendMessage(body.telefono, body.mensaje);
        return sendJson(200, result);
      }

      if (pathname === '/api/whatsapp/auto-resolve' && req.method === 'POST') {
        const body = await readBody();
        const clasificacion = whatsappService.classifyCustomerReply(body.mensaje);
        return sendJson(200, { ok: true, guia: body.guia || 'DRP-992831', clasificacion });
      }

      if (pathname === '/api/webhooks/dropi' && req.method === 'POST') {
        const event = await readBody();
        const eventRecord = {
          id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          receivedAt: new Date().toISOString(),
          type: event.type || event.event || 'order.incident_updated',
          data: event.data || event
        };
        webhookEventsLog.unshift(eventRecord);
        if (webhookEventsLog.length > 50) webhookEventsLog.pop();
        return sendJson(200, { ok: true, processed: true, eventId: eventRecord.id });
      }

      if (pathname === '/api/webhooks/events' && req.method === 'GET') {
        return sendJson(200, { ok: true, events: webhookEventsLog });
      }

      if (pathname === '/api/audit/freight' && req.method === 'POST') {
        const body = await readBody();
        const resultado = auditService.auditFreight(body.orders || []);
        return sendJson(200, { ok: true, ...resultado });
      }

      if (pathname === '/api/reports/daily-digest' && req.method === 'POST') {
        const body = await readBody();
        const digest = digestService.generateDailyDigest(body);
        let telegramResult = null;
        if (body.enviarTelegram) {
          try {
            telegramResult = await digestService.sendToTelegram(digest.markdown);
          } catch (e) {
            telegramResult = { ok: false, error: e.message };
          }
        }
        return sendJson(200, { ok: true, digest: digest.markdown, timestamp: digest.timestamp, telegram: telegramResult });
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const sessionId = cookies.dropivault_session;
        if (sessionId) deleteSession(sessionId);
        const cookieStr = `dropivault_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        return sendJson(200, { ok: true }, cookieStr);
      }

      sendJson(404, { ok: false, error: 'Ruta no encontrada' });
    } catch (error) {
      console.error('[Error Nativo]:', error.message);
      sendJson(500, { ok: false, error: error.message || 'Error interno del servidor' });
    }
  });

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 DropiVault Backend activo en http://localhost:${PORT}`);
    console.log(`⚡ Servidor nativo Node.js listo (cero dependencias externas)`);
    console.log(`📡 Conectado a la API oficial de Dropi`);
    console.log(`=======================================================`);
  });
}
