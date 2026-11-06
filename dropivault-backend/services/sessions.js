const crypto = require('crypto');

const SECRET = process.env.SESSION_SECRET || 'dropivault_net_key_2026_x79q!';

/**
 * Gestor de sesiones seguras en memoria y verificador criptográfico
 * Los tokens de Dropi se gestionan exclusivamente en el backend.
 */
const sessions = new Map();

function signSession(data) {
  const payload = Buffer.from(JSON.stringify({
    ...data,
    exp: Date.now() + 24 * 60 * 60 * 1000
  })).toString('base64url');
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${hmac}`;
}

function verifySignedSession(tokenStr) {
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

/**
 * Crea una nueva sesión
 * @param {object} data - Datos de la sesión (token, email, tienda, comunidad, paisUrl, modo)
 * @returns {string} Token firmado y registrado en memoria
 */
function createSession(data) {
  const sessionId = signSession(data);
  sessions.set(sessionId, {
    ...data,
    createdAt: Date.now()
  });
  return sessionId;
}

/**
 * Recupera una sesión existente
 * @param {string} sessionId
 * @returns {object|null}
 */
function getSession(sessionId) {
  if (!sessionId) return null;
  const memSession = sessions.get(sessionId);
  if (memSession) return memSession;
  return verifySignedSession(sessionId);
}

/**
 * Elimina una sesión activa
 * @param {string} sessionId
 * @returns {boolean}
 */
function deleteSession(sessionId) {
  if (!sessionId) return false;
  return sessions.delete(sessionId);
}

module.exports = {
  createSession,
  getSession,
  deleteSession
};
