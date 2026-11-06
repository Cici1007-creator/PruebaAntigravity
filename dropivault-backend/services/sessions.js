const crypto = require('crypto');

/**
 * Gestor de sesiones seguras en memoria en el servidor
 * Los tokens de Dropi se guardan exclusivamente aquí y NUNCA se exponen al navegador.
 */
const sessions = new Map();

/**
 * Crea una nueva sesión en memoria
 * @param {object} data - Datos de la sesión (token, email, tienda, comunidad, paisUrl, modo)
 * @returns {string} ID único de sesión (UUID v4)
 */
function createSession(data) {
  const sessionId = crypto.randomUUID();
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
  return sessions.get(sessionId) || null;
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

