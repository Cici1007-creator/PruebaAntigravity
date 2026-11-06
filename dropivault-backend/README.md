# 🛡️ DropiVault Backend · Motor de Inteligencia y Auditoría para Dropi

Backend de alta seguridad desarrollado en **Node.js (Express + Fallback Nativo)** para conectar la microapp DropiVault con la API de Dropi, Meta WhatsApp Cloud API y servicios de auditoría forense para dropshippers en Latinoamérica (Colombia, México, Ecuador, Chile y Perú).

---

## ⚡ Nuevas Capacidades y Automatizaciones Integradas

1. **Auditoría Forense de Cobro de Fletes (`/api/audit/freight`)**:
   - Detecta sobrecostos de peso volumétrico y dobles cobros en devoluciones indebidas.
   - Calcula el saldo a favor de la tienda y redacta automáticamente la **Carta de Reclamo Oficial** para radicar ante Servientrega, Coordinadora, Inter Rapidísimo o Envía.
2. **Webhooks en Tiempo Real Dropi (`/api/webhooks/dropi`)**:
   - Receptor de eventos en vivo desde Dropi / Transportadoras para alertar anomalías al instante.
3. **Webhook WhatsApp con Auto-Resolución (`/api/webhooks/whatsapp` y `/api/whatsapp/auto-resolve`)**:
   - Recibe respuestas del comprador, procesa intención con NLP (confirmación de dirección, torre/apto, entrega reprogramada) y auto-resuelve la guía sin intervención manual.
4. **Resumen Diario Automatizado (`/api/reports/daily-digest`)**:
   - Genera el reporte ejecutivo de tesorería y lo despacha directamente a tu bot de Telegram o WhatsApp.
5. **Autenticación Dual**:
   - Por Token de Integración o por Correo + Contraseña de Dropi con White Brand ID.

---

## 🚀 Cómo Iniciar el Servidor

```bash
cd dropivault-backend
npm install    # (Opcional: si no se instalan dependencias, el servidor arrancará en modo nativo sin fallar)
npm start
# O directamente:
node server.js
```

El servidor quedará escuchando en `http://localhost:3000`.

---

## 📡 Endpoints Disponibles

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del backend y módulos activos |
| `POST` | `/api/auth/login` | Login seguro contra Dropi (Cookie HttpOnly) |
| `GET` | `/api/orders` | Consulta órdenes reales desde Dropi |
| `POST` | `/api/whatsapp/send` | Envío de mensajes oficiales vía Meta WhatsApp |
| `POST` | `/api/whatsapp/auto-resolve` | Clasificador inteligente de respuestas de clientes |
| `POST` | `/api/webhooks/dropi` | Endpoint receptor de webhooks de Dropi |
| `GET/POST` | `/api/webhooks/whatsapp` | Webhook de Meta para mensajería entrante |
| `POST` | `/api/audit/freight` | Auditoría de fletes y carta de reclamo |
| `POST` | `/api/reports/daily-digest` | Generador y despachador de resumen ejecutivo |
| `POST` | `/api/auth/logout` | Cierre de sesión seguro |

---

## 🔐 Configuración de Variables en `.env`

- `PORT`: Puerto (3000 por defecto).
- `ALLOWED_ORIGIN`: Orígenes autorizados para CORS.
- `SESSION_SECRET`: Clave de cifrado de sesiones en el servidor.
- `DROPI_WHITE_BRAND_ID`: ID de marca blanca en Dropi.
- `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID`: Credenciales Meta (dejar vacías para simular).
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`: Para recibir el resumen diario en Telegram.
