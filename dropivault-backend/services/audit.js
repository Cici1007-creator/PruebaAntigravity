/**
 * Servicio de Auditoría Forense de Fletes para Dropshipping
 * Detecta sobrecostos de peso volumétrico, dobles cobros en devoluciones injustificadas
 * y calcula el monto exacto reclamable a las transportadoras (Servientrega, Coordinadora, Inter Rapidísimo, Envía).
 */

// Tarifas base estimadas promedio por transportadora para paquetes estándar (< 1kg) en Colombia
const TARIFAS_BASE_FLETE = {
  'Servientrega': 14500,
  'Coordinadora': 15200,
  'Inter Rapidísimo': 13800,
  'Envía': 14200,
  'TCC': 15000,
  'Otras': 14500
};

/**
 * Audita una lista de órdenes y detecta anomalías financieras en fletes
 * @param {Array} orders - Lista de órdenes normalizadas
 * @returns {Object} Informe detallado de auditoría y cartas de reclamo
 */
function auditFreight(orders) {
  if (!Array.isArray(orders) || orders.length === 0) {
    return {
      totalDiscrepancias: 0,
      montoTotalReclamable: 0,
      guiasAuditadas: 0,
      anomalias: [],
      resumenPorTransportadora: {},
      cartaReclamo: ''
    };
  }

  const anomalias = [];
  const resumenPorTransportadora = {};

  orders.forEach(o => {
    const transportadora = o.transportadora || 'Servientrega';
    const baseEsperada = TARIFAS_BASE_FLETE[transportadora] || TARIFAS_BASE_FLETE['Otras'];
    const fleteCobrado = Number(o.flete || 0);

    if (!resumenPorTransportadora[transportadora]) {
      resumenPorTransportadora[transportadora] = {
        totalGuias: 0,
        guiasConSobreprecio: 0,
        montoReclamable: 0
      };
    }
    resumenPorTransportadora[transportadora].totalGuias++;

    // 1. Detección de flete desproporcionado (> 45% sobre la tarifa base de 1kg sin justificación)
    if (fleteCobrado > (baseEsperada * 1.45)) {
      const sobrecosto = Math.round(fleteCobrado - baseEsperada);
      anomalias.push({
        guia: o.guia,
        cliente: o.cliente,
        ciudad: o.ciudad,
        transportadora,
        tipoAnomalia: 'SOBRECOSTO_PESO_VOLUMETRICO',
        motivo: `Flete cobrado de $${fleteCobrado.toLocaleString('es-CO')} supera el estándar estimado de $${baseEsperada.toLocaleString('es-CO')}`,
        fleteEsperado: baseEsperada,
        fleteCobrado,
        montoReclamable: sobrecosto
      });
      resumenPorTransportadora[transportadora].guiasConSobreprecio++;
      resumenPorTransportadora[transportadora].montoReclamable += sobrecosto;
    }

    // 2. Detección de devolución con cobro excesivo (> 2x base)
    const estado = String(o.estado || '').toUpperCase();
    if (estado.includes('DEVOL') && fleteCobrado > (baseEsperada * 1.8)) {
      const sobrecosto = Math.round(fleteCobrado - (baseEsperada * 1.2));
      // Verificar si ya fue agregada para evitar duplicar
      const yaExiste = anomalias.find(a => a.guia === o.guia);
      if (!yaExiste) {
        anomalias.push({
          guia: o.guia,
          cliente: o.cliente,
          ciudad: o.ciudad,
          transportadora,
          tipoAnomalia: 'DOBLE_COBRO_DEVOLUCION',
          motivo: `Devolución facturada con recargo excesivo de flete ($${fleteCobrado.toLocaleString('es-CO')})`,
          fleteEsperado: Math.round(baseEsperada * 1.2),
          fleteCobrado,
          montoReclamable: sobrecosto
        });
        resumenPorTransportadora[transportadora].guiasConSobreprecio++;
        resumenPorTransportadora[transportadora].montoReclamable += sobrecosto;
      }
    }
  });

  const montoTotalReclamable = anomalias.reduce((sum, a) => sum + a.montoReclamable, 0);

  // Generar plantilla formal de carta de reclamo para transportadoras
  const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const listaGuiasTxt = anomalias.slice(0, 15).map(a => 
    ` • Guía: ${a.guia} | Destino: ${a.ciudad} | Transportadora: ${a.transportadora} | Cobrado: $${a.fleteCobrado.toLocaleString('es-CO')} | Esperado: $${a.fleteEsperado.toLocaleString('es-CO')} | Saldo a favor: $${a.montoReclamable.toLocaleString('es-CO')}`
  ).join('\n');

  const cartaReclamo = `ASUNTO: Solicitud formal de auditoría y ajuste tarifario en guías de mensajería
FECHA: ${fechaHoy}
DIRIGIDO A: Departamento de Liquidaciones y Facturación / Servicio al Cliente

Estimados señores,

Por medio de la presente, solicitamos formalmente la revisión y reliquidación de fletes aplicados a las órdenes relacionadas a continuación, las cuales presentan cobros que exceden los acuerdos tarifarios vigentes o recargos indebidos de peso volumétrico:

${listaGuiasTxt}

Monto total reclamable identificado: $${montoTotalReclamable.toLocaleString('es-CO')} COP.

Agradecemos procesar el abono a la billetera de recaudo correspondiente dentro del término establecido por los acuerdos de nivel de servicio (SLA).

Atentamente,
Área de Tesorería y Conciliación Logística`;

  return {
    totalDiscrepancias: anomalias.length,
    montoTotalReclamable,
    guiasAuditadas: orders.length,
    anomalias,
    resumenPorTransportadora,
    cartaReclamo
  };
}

module.exports = {
  auditFreight,
  TARIFAS_BASE_FLETE
};

