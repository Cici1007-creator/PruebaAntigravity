const { getSession } = require('../services/sessions');

/**
 * Middleware que verifica la presencia y validez de la cookie o cabecera Authorization
 * Si la sesión no existe o expiró, devuelve HTTP 401 Unauthorized
 */
function requireSession(req, res, next) {
  let sessionId = req.cookies && req.cookies.dropivault_session;

  if (!sessionId) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      sessionId = authHeader.slice(7).trim();
    }
  }

  if (!sessionId) {
    return res.status(401).json({
      ok: false,
      error: 'Sesión no válida o no iniciada'
    });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({
      ok: false,
      error: 'Sesión expirada o no encontrada en el servidor'
    });
  }

  // Adjuntar la sesión al request para uso en los controladores
  req.session = session;
  req.sessionId = sessionId;
  next();
}

module.exports = {
  requireSession
};
