const TICKET_CSS = `
    @page {
      size: letter;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: #222;
      line-height: 1.35;
    }
    .print-copy {
      page-break-after: always;
      break-after: page;
       min-height: 0;
      position: relative;
      box-sizing: border-box;
        padding: 0.02in;
      display: -webkit-flex;
      display: flex;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .print-copy:last-child { page-break-after: avoid; break-after: auto; }
    .page-totals {
      margin-top: auto;
      padding-bottom: 0.1in;
    }
    .copy-label {
      text-align: center;
      font-size: 7.5pt;
      color: #999;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 3px solid #2563EB;
       margin-bottom: 6px;
    }
    .header h1 {
      font-size: 22pt;
      font-weight: 800;
      letter-spacing: 4px;
      color: #2563EB;
      text-transform: uppercase;
    }
    .header .logo {
      max-height: 72px;
      max-width: 340px;
      margin-bottom: 4px;
    }
    .header .sub {
      font-size: 8pt;
      color: #888;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .header .folio {
      font-size: 13pt;
      color: #2563EB;
      font-weight: 700;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .info-grid {
      width: 100%;
      margin-bottom: 8px;
      border-collapse: collapse;
    }
    .info-grid td {
      padding: 2px 6px;
      font-size: 9pt;
      vertical-align: top;
    }
    .info-grid .label {
      font-weight: 600;
      color: #555;
      width: 90px;
      text-transform: uppercase;
      font-size: 7.5pt;
      letter-spacing: 0.5px;
    }
    .info-grid td:last-child { text-align: left; }
    .divider { border-top: 1px solid #ccc; margin: 6px 0; }
    table.detalles {
      width: 100%;
      border-collapse: collapse;
    }
    table.detalles thead { background: #2563EB; color: #fff; }
    table.detalles th {
      font-size: 7.5pt;
      text-align: left;
      padding: 5px 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    table.detalles th.right { text-align: right; }
    table.detalles th.center { text-align: center; }
    table.detalles td {
      padding: 4px 6px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 9pt;
      vertical-align: top;
    }
    table.detalles td.right { text-align: right; }
    table.detalles td.center { text-align: center; }
    table.detalles .detalle-attrs {
      font-size: 7.5pt;
      color: #666;
      font-style: italic;
    }
    .totals {
      width: 100%;
      border-collapse: collapse;
    }
    .totals td {
      padding: 2px 6px;
      font-size: 9.5pt;
    }
    .totals td.right { text-align: right; }
    .totals .total-row td {
      font-size: 13pt;
      font-weight: 700;
      border-top: 2px solid #222;
      padding-top: 6px;
      color: #2563EB;
    }
    .section { margin-top: 8px; }
    .section-title {
      font-weight: 600;
      font-size: 8pt;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .credito-calendario { margin-top: 5px; }
    .credito-calendario th, .credito-calendario td { padding: 2px 4px; font-size: 7pt; border-bottom: 1px solid #000; }
    .credito-calendario th { text-align: left; font-weight: 700; }
    .nota {
      margin-top: 6px;
      padding: 6px 8px;
      background: #f0f4f8;
      font-size: 8.5pt;
      border-left: 3px solid #2563EB;
    }
    .footer {
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 7.5pt;
      color: #999;
      line-height: 1.5;
    }
    .footer strong { color: #666; }
    .bottom-section {
      position: absolute;
      bottom: 0.25in;
      left: 0.25in;
      right: 0.25in;
    }
    .firmas {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
    }
    .firma-espacio { width: 45%; text-align: center; }
    .firma-linea { border-top: 1px solid #222; height: 26px; }
    body, body * { color: #000 !important; }

    .pagare { margin-top: 8px; }
    .pagare-footer {
      position: static !important;
      margin-top: 12px;
      page-break-inside: avoid;
    }
    .pagare-h2 {
      text-align: center;
      font-size: 7.5pt;
      font-weight: 800;
      letter-spacing: 4px;
      color: #1e3a5f;
      text-transform: uppercase;
      margin: 8px 0 1px;
    }
    .pagare-doc-no {
      text-align: center;
      font-size: 4pt;
      color: #2563EB;
      font-weight: 600;
      padding-bottom: 3px;
      border-bottom: 1px solid #2563EB;
      margin-bottom: 4px;
    }
    .pagare-lugar-fecha {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 3px;
      font-size: 3.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .pagare-bueno-por {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border: 1px solid #334155;
      border-radius: 2px;
      padding: 3px 5px;
      margin: 5px 0;
      font-size: 4.25pt;
    }
    .pagare-bueno-por-label { font-weight: 700; letter-spacing: 1px; }
    .pagare-bueno-por-monto {
      font-size: 5pt;
      font-weight: 800;
      color: #1e3a5f;
      border-bottom: 1px solid #334155;
      min-width: 40%;
      text-align: right;
    }
    .pagare-desglose {
      width: 100%;
      margin: 5px 0;
      border-collapse: collapse;
    }
    .pagare-desglose td {
      padding: 2px 3px;
      font-size: 4pt;
      border-bottom: 1px solid #cbd5e1;
    }
    .pagare-desglose td:last-child { text-align: right; font-weight: 700; }
    .pagare-leyenda {
      font-size: 4pt;
      text-align: justify;
      line-height: 1.45;
      margin-bottom: 3px;
    }
    .pagare-pie {
      display: flex;
      align-items: stretch;
      gap: 8px;
      margin-top: 10px;
    }
    .pagare-caja {
      width: 62%;
      border: 1px solid #334155;
      border-radius: 2px;
      padding: 3px 4px;
    }
    .pagare-caja-titulo {
      text-align: center;
      font-weight: 700;
      font-size: 3.25pt;
      letter-spacing: 1px;
      border-bottom: 1px solid #334155;
      padding-bottom: 1px;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    .pagare-caja-tabla { width: 100%; border-collapse: collapse; }
    .pagare-caja-tabla td {
      font-size: 3.5pt;
      padding: 1px 1.5px;
      vertical-align: top;
    }
    .pagare-caja-campo {
      width: 34%;
      font-weight: 700;
      white-space: nowrap;
    }
    .pagare-firma-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      text-align: center;
    }
    .pagare-linea-firma { border-bottom: 1px solid #222; height: 12px; }
    .pagare-firma-rol {
      margin-top: 2px;
      font-size: 3.25pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .pagare-firma-nombre {
      margin-top: 1px;
      font-size: 3.5pt;
      font-weight: 600;
    }
  `;

const TICKET_80MM_CSS = `
    @page { size: 80mm auto; margin: 0; }
    html, body { width: 72mm; max-width: 72mm; min-width: 72mm; overflow-x: hidden; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; line-height: 1.25; }
    .print-copy {
      width: 72mm;
      max-width: 72mm;
      min-height: 0;
       padding: 0;
      margin: 0 auto;
      display: block;
      page-break-after: always;
      break-after: page;
      break-inside: avoid;
    }
    .print-copy:last-child { page-break-after: avoid; break-after: auto; }
    .header, .section, .nota, .bottom-section, .pagare { max-width: 100%; overflow-wrap: anywhere; word-break: break-word; }
    .info-grid { table-layout: fixed; }
    .info-grid td { overflow-wrap: anywhere; word-break: break-word; }
     .header { padding-top: 0; padding-bottom: 3px; border-bottom-width: 2px; margin-bottom: 4px; }
    .header .logo { max-width: 100%; max-height: 28mm; }
    .header .sub { font-size: 7pt; }
    .header .folio { font-size: 10pt; }
     .info-grid td { padding: 1px 2px; font-size: 6.5pt; }
    .info-grid .label { width: 35px; font-size: 5.5pt; }
    table.detalles { table-layout: fixed; }
    table.detalles th { padding: 3px 2px; font-size: 5.8pt; letter-spacing: 0; }
    table.detalles td { padding: 3px 2px; font-size: 7.2pt; overflow-wrap: anywhere; word-break: break-word; }
    table.detalles th:nth-child(3), table.detalles td:nth-child(3) { display: none; }
    table.detalles th:nth-child(1) { width: 48% !important; }
    table.detalles th:nth-child(2) { width: 12% !important; }
    table.detalles th:nth-child(4) { width: 20% !important; }
    table.detalles th:nth-child(5) { width: 20% !important; }
    .totals td { padding: 2px; font-size: 7pt; }
    .totals .total-row td { font-size: 10pt; padding-top: 4px; }
    .section-title { font-size: 6.5pt; }
    .nota { padding: 4px; font-size: 6.5pt; }
    .firmas { margin-top: 18px; font-size: 6.5pt; }
    .bottom-section { position: static; left: auto; right: auto; bottom: auto; }
    .pagare-footer { margin-top: 8px; page-break-inside: avoid; }
    .pagare { margin-top: 5px; }
    .pagare-h2 { font-size: 7pt; letter-spacing: 2px; margin: 5px 0 1px; }
    .pagare-doc-no, .pagare-lugar-fecha { font-size: 4.5pt; }
    .pagare-bueno-por { padding: 2px 3px; margin: 3px 0; font-size: 5pt; }
    .pagare-bueno-por-monto { font-size: 6pt; }
    .pagare-desglose { table-layout: fixed; }
    .pagare-desglose td { font-size: 5pt; padding: 1px 2px; overflow-wrap: anywhere; word-break: break-word; }
    .pagare-leyenda { font-size: 5.2pt; line-height: 1.3; margin-bottom: 2px; overflow-wrap: anywhere; word-break: break-word; }
    .pagare-pie { gap: 4px; margin-top: 5px; }
    .pagare-caja { width: 60%; padding: 2px; }
    .pagare-caja-titulo { font-size: 3.2pt; letter-spacing: .4px; }
    .pagare-caja-tabla { table-layout: fixed; }
    .pagare-caja-tabla td { font-size: 4.6pt; padding: .5px; overflow-wrap: anywhere; word-break: break-word; }
    .pagare-firma-rol { font-size: 4.2pt; letter-spacing: .3px; }
    .pagare-firma-nombre { font-size: 4.5pt; overflow-wrap: anywhere; }
     .ticket-config-footer { font-size: 5.5pt; margin-top: 4px; overflow-wrap: anywhere; }
     .credito-calendario th, .credito-calendario td { padding: 1px; font-size: 5.2pt; }
    body, body * { color: #000 !important; }
  `;

export function getDesglosePagos(venta) {
  const pagosBase = venta && venta.pagos ? venta.pagos : [];
  const pagos = pagosBase.filter(p => {
    const nombre = (p.tipoPagoNombre || '').toLowerCase();
    return nombre !== 'credito' && nombre !== 'crédito';
  }).map(p => ({
    label: p.tipoPagoNombre || 'Pago',
    monto: Number(p.monto) || 0,
    referencia: p.referencia || '',
    credito: false,
  }));
  const pagado = pagos.reduce((suma, pago) => suma + pago.monto, 0);
  const montoCredito = venta && venta.tipoVenta === 'CREDITO'
    ? Math.max(0, (Number(venta.total) || 0) - pagado)
    : 0;
  if (montoCredito > 0.005) {
    pagos.push({
       label: 'Crédito' + (venta.folioPagare ? ' / Folio ' + venta.folioPagare : ''),
      monto: montoCredito,
      referencia: '',
      credito: true,
    });
  }
  return { pagos, montoCredito, pagado };
}

function fechaTicket(valor) {
  if (!valor) return null;
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleDateString('es-MX', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function planCreditoTicket(venta, desglosePagos) {
  if (!venta || venta.tipoVenta !== 'CREDITO') return '';
  const cantidad = Number(venta.numeroParcialidades) || 1;
  const periodicidad = venta.periodicidad || 'MENSUAL';
  const capital = Number(venta.capitalFinanciado) || desglosePagos.montoCredito || 0;
  const interes = Number(venta.interesTotal) || 0;
  const totalPlan = capital + interes;
  const montoAbono = totalPlan / cantidad;
  const fechaInicio = venta.fecha ? new Date(venta.fecha) : new Date();
  const primerPago = venta.fechaPrimerPago ? new Date(venta.fechaPrimerPago) : fechaInicio;
  const fechas = [];
  for (let i = 0; i < cantidad; i++) {
    const fecha = new Date(primerPago);
    if (periodicidad === 'SEMANAL') fecha.setDate(fecha.getDate() + (i * 7));
    else if (periodicidad === 'QUINCENAL') fecha.setDate(fecha.getDate() + (i * 15));
    else fecha.setMonth(fecha.getMonth() + i);
    fechas.push(fecha);
  }
  const filas = fechas.map((fecha, i) => '<tr><td>Abono #' + (i + 1) + '</td><td>' + fechaTicket(fecha) + '</td><td class="right">' + Utils.formatMonto(montoAbono) + '</td></tr>').join('');
  const saldo = Number(venta.saldoCapital || 0) + Number(venta.saldoInteres || 0);
  return '<div class="section credito-plan">' +
    '<div class="section-title">Plan de crédito y abonos</div>' +
    '<table class="totals credito-resumen"><tr><td>Fecha de inicio</td><td class="right">' + (fechaTicket(venta.fecha) || '-') + '</td></tr>' +
    '<tr><td>Primer pago</td><td class="right">' + (fechaTicket(primerPago) || '-') + '</td></tr>' +
    '<tr><td>Fecha de fin</td><td class="right">' + (fechaTicket(fechas[fechas.length - 1]) || '-') + '</td></tr>' +
    '<tr><td>Parcialidades</td><td class="right">' + cantidad + ' / ' + Utils.esc(periodicidad) + '</td></tr>' +
    '<tr><td>Abono programado</td><td class="right">' + Utils.formatMonto(montoAbono) + '</td></tr>' +
    '<tr><td>Saldo pendiente</td><td class="right">' + Utils.formatMonto(saldo) + '</td></tr></table>' +
    '<table class="totals credito-calendario"><thead><tr><th>Abono</th><th>Fecha</th><th class="right">Monto</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
}

const STATE_CUENTA_CSS = `
    @page { size: letter; margin: 0.35in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 9.5pt;
      color: #222;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      padding-bottom: 8px;
      border-bottom: 3px solid #2563EB;
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 20pt;
      font-weight: 800;
      letter-spacing: 4px;
      color: #2563EB;
      text-transform: uppercase;
    }
    .header .logo {
      max-height: 72px;
      max-width: 340px;
      margin-bottom: 4px;
    }
    .header .sub {
      font-size: 7.5pt;
      color: #555;
      letter-spacing: 0.5px;
    }
    .header .title {
      font-size: 12pt;
      color: #1e3a5f;
      font-weight: 700;
      margin-top: 2px;
      letter-spacing: 1px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 4px;
      font-size: 9pt;
      padding: 1px 0;
    }
    .line { border-top: 1px dashed #999; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 3px 6px; border: 1px solid #c9c9c9; font-size: 8.5pt; }
    th { background: #2563EB; color: #fff; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
    th.right, td.right { text-align: right; }
    h3.sub-title {
      font-size: 9pt;
      margin: 8px 0 3px;
      color: #1e3a5f;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .total { font-size: 12pt; font-weight: 800; color: #2563EB; }
    .notas-box { font-size: 8.5pt; }
    .firma { margin-top: 56px; text-align: center; font-size: 8.5pt; }
    .firma-linea { border-top: 1px solid #222; width: 55%; margin: 0 auto 4px; }
  `;

const STATE_CUENTA_80MM_CSS = `
    @page { size: 80mm auto; margin: 0; }
    html, body { width: 72mm; max-width: 72mm; min-width: 72mm; overflow-x: hidden; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 7pt; line-height: 1.25; }
    .header, .info-row, .line, h3, .notas-box, .firma { max-width: 100%; overflow-wrap: anywhere; word-break: break-word; }
    .header { padding-bottom: 5px; border-bottom-width: 2px; margin-bottom: 7px; }
    .header h1 { font-size: 14pt; letter-spacing: 2px; }
    .header .sub { font-size: 6pt; }
    .header .title { font-size: 9pt; }
    .info-row { display: block; font-size: 6.5pt; padding: 1px 0; }
    table { width: 100%; table-layout: fixed; }
    th, td { padding: 2px 1.5px; font-size: 5.8pt; overflow-wrap: anywhere; word-break: break-word; }
    h3.sub-title { font-size: 6.5pt; margin: 6px 0 2px; }
    .total { font-size: 9pt; }
    .notas-box { font-size: 6pt; }
    .firma { margin-top: 28px; font-size: 6pt; }
  `;

function abrirVentana(titulo, alto, ancho) {
  // Reutiliza una sola pestaña del mismo navegador para todos los comprobantes.
  // No se envían dimensiones para evitar que el navegador la convierta en popup.
  const win = window.open('', 'racoon-print-tab');
  if (!win) {
    Utils.showToast('Bloqueador de popups activo. Permite las ventanas emergentes.', 'warning');
    return null;
  }
  return win;
}

export function printRemisionVenta(venta, opts) {
  const options = opts || {};
  if (!options._confirmed) {
    seleccionarFormatoTicket(venta, options);
    return;
  }
  const esCredito = options.esCredito || venta.tipoVenta === 'CREDITO';
  const porcentajeInteres = options.porcentajeInteres != null ? options.porcentajeInteres : (venta.porcentajeInteres || 0);
  const plazoMeses = options.plazoMeses != null ? options.plazoMeses : venta.plazoMeses;
  const numCopies = Math.max(1, options.copies || 1);
  const autoPrint = options.autoPrint !== false;
  const configs = options.configs || {};
  const clienteInfo = options.clienteInfo || null;
  const formato = options.formato || 'carta';
  const logo = configs.logoTicket || configs.logoUrl || configs.logoEmpresa || '';
  const logoHtml = logo ? '<img src="' + Utils.esc(logo) + '" class="logo" alt="" onerror="this.remove()">' : '';
  const empresa = configs.descripcionEmpresa || 'Racoon';
  const footer = configs.pieTicket || configs.footerTicket || '';
  const politicasGarantia = footer || 'POLÍTICAS DE GARANTÍA RACOON: Conserve este ticket. La garantía aplica conforme a las condiciones informadas al momento de la compra.';

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const desglosePagos = getDesglosePagos(venta);

  const interesTotalCredito = esCredito
    ? (venta.interesTotal != null ? Number(venta.interesTotal) : desglosePagos.montoCredito * porcentajeInteres / 100)
    : 0;
  const totalConInteres = esCredito
    ? desglosePagos.montoCredito + interesTotalCredito
    : (venta.total || 0);

  const detalleRows = (venta.detalles || []).map(d => {
    const dSubtotal = d.subtotal || (d.cantidad * d.precioUnitario) || 0;
    const nombre = Utils.esc(d.productoNombre || d.descripcion || 'Producto');
    const unidad = (d.unidadMedida || 'UNIDAD').toLowerCase();
    const attrs = d.atributosText ? '<br><span class="detalle-attrs">' + Utils.esc(d.atributosText) + '</span>' : '';
    return `
    <tr class="detalle-row">
      <td>${nombre}${attrs}</td>
      <td class="center">${d.cantidad}</td>
      <td class="center small">${Utils.esc(unidad)}</td>
      <td class="right">${Utils.formatMonto(d.precioUnitario || 0)}</td>
      <td class="right">${Utils.formatMonto(dSubtotal)}</td>
    </tr>`;
  }).join('');

  const pagoRows = desglosePagos.pagos.length > 0
       ? desglosePagos.pagos.map(p => `
     <tr>
       <td>${Utils.esc(p.label)}${p.referencia ? ' (' + Utils.esc(p.referencia) + ')' : ''}</td>
       <td class="right">${Utils.formatMonto(p.monto)}</td>
     </tr>`).join('')
       + (esCredito && porcentajeInteres > 0
          ? `<tr><td>Interés mensual ${(porcentajeInteres || 0)}% / ${venta.periodicidad || 'MENSUAL'}: ${venta.numeroParcialidades || plazoMeses || '—'}</td><td class="right">${Utils.formatMonto(interesTotalCredito)}</td></tr>`
         : '')
       : `<tr><td>Enviando pedido</td><td class="right small">Pendiente de pago</td></tr>`;
  const pagareDesgloseHtml = desglosePagos.pagos.map(p =>
    `<tr><td>${Utils.esc(p.label)}</td><td>${Utils.formatMonto(p.monto)}</td></tr>`).join('')
    + (porcentajeInteres > 0
       ? `<tr><td>Interés ${(porcentajeInteres || 0)}%</td><td>${Utils.formatMonto(interesTotalCredito)}</td></tr>`
      : '');

   const titularPagare = configs['titularPagare'] || (venta.folioPagare ? 'Logotex' : '');
   const lugarPagare = configs['direccionEmpresa'] || 'San Luis Potos\u00ed, S.L.P.';
   const tasaMora = configs['tasaInteresMoraPagare'] || 0;
  const montoLetras = Utils.numeroALetras(totalConInteres);

  const deudorNombre = clienteInfo
    ? [clienteInfo.nombre || '', clienteInfo.apellidoPaterno || '', clienteInfo.apellidoMaterno || ''].filter(Boolean).join(' ')
    : (venta.clienteNombre || '');
  const deudorDireccionCompuesta = clienteInfo
    ? [clienteInfo.calle || '', clienteInfo.numExt ? '#' + clienteInfo.numExt : '', clienteInfo.numInt ? 'Int ' + clienteInfo.numInt : '', clienteInfo.colonia ? 'Col. ' + clienteInfo.colonia : ''].filter(Boolean).join(', ')
    : '';
  const deudorDireccion = clienteInfo ? (clienteInfo.direccion || deudorDireccionCompuesta || '') : '';
  const deudorRfc = clienteInfo ? (clienteInfo.rfc || '') : '';
  const deudorPoblacion = clienteInfo
    ? [clienteInfo.municipio || '', clienteInfo.estado || ''].filter(Boolean).join(', ') || (clienteInfo.cp || '')
    : '';
  const deudorTel = clienteInfo ? (clienteInfo.telefono || '') : '';

  const diaExpedicion = now.getDate();
  const mesExpedicion = now.toLocaleDateString('es-MX', { month: 'long' });
  const anioExpedicion = now.getFullYear();

  const pagareHtml = `
  <div class="pagare">
     <h2 class="pagare-h2">DOCUMENTO DE CR\u00c9DITO</h2>
     <div class="pagare-doc-no">FOLIO DE CR\u00c9DITO: ${Utils.esc(venta.folioPagare || '—')}</div>
    <div class="pagare-lugar-fecha">
      <span>LUGAR DE EXPEDICI\u00d3N: ${Utils.esc(lugarPagare)}</span>
      <span>D\u00cdA: ${diaExpedicion}&nbsp;&nbsp; MES: ${Utils.esc(mesExpedicion)}&nbsp;&nbsp; A\u00d1O: ${anioExpedicion}</span>
    </div>
    <div class="pagare-bueno-por">
      <span class="pagare-bueno-por-label">BUENO POR</span>
      <span class="pagare-bueno-por-monto">${Utils.formatMonto(totalConInteres)}</span>
    </div>
    <table class="pagare-desglose">
      ${pagareDesgloseHtml}
    </table>
    <p class="pagare-leyenda">
       Debemos y nos obligamos a cubrir incondicionalmente en esta ciudad o en cualquier otra que se me requiera, este documento de cr\u00e9dito a la orden de:
      <strong>${Utils.esc(titularPagare)}</strong>, el d\u00eda ${diaExpedicion} de ${Utils.esc(mesExpedicion)} de ${anioExpedicion}.
      La cantidad de: <strong>${Utils.formatMonto(totalConInteres)} (${Utils.esc(montoLetras)})</strong>.
    </p>
    <p class="pagare-leyenda">
       CANTIDAD QUE CORRESPONDE AL IMPORTE DE LAS MERCANC\u00cdAS QUE SE DETALLAN EN EL PEDIDO CUYO N\u00daMERO COINCIDE CON EL DE ESTE DOCUMENTO QUE HE RECIBIDO DE CONFORMIDAD.
       EL PRESENTE DOCUMENTO REPRESENTA EL SALDO DEL CR\u00c9DITO CONTRATADO Y LAS CONDICIONES ACEPTADAS POR EL CLIENTE; AS\u00cd MISMO,
       DE CONFORMIDAD CON LAS CONDICIONES DEL CR\u00c9DITO, ME OBLIGO INCONDICIONALMENTE A PAGAR EL IMPORTE DE ESTE DOCUMENTO CUANDO
       SEA ACEPTADO EN MI NOMBRE Y REPRESENTACI\u00d3N POR EMPLEADO O DEPENDIENTE DE MI NEGOCIO. EN CASO DE MORA
       AL PLAZO SE CUBRIR\u00c1N INTERESES A LA TASA DEL <strong>${tasaMora}%</strong> MENSUAL.
    </p>
    <div class="pagare-pie">
      <div class="pagare-caja">
        <div class="pagare-caja-titulo">DATOS DEL(LOS) DEUDOR(ES) / AVAL</div>
        <table class="pagare-caja-tabla">
          <tr><td class="pagare-caja-campo">Nombre:</td><td>${Utils.esc(deudorNombre) || '______________'}</td></tr>
          <tr><td class="pagare-caja-campo">Direcci\u00f3n:</td><td>${Utils.esc(deudorDireccion) || '______________'}</td></tr>
          <tr><td class="pagare-caja-campo">RFC:</td><td>${Utils.esc(deudorRfc) || '______________'}</td></tr>
          <tr><td class="pagare-caja-campo">Poblaci\u00f3n:</td><td>${Utils.esc(deudorPoblacion) || '______________'}</td></tr>
          <tr><td class="pagare-caja-campo">Tel.:</td><td>${Utils.esc(deudorTel) || '______________'}</td></tr>
        </table>
      </div>
      <div class="pagare-firma-area">
        <div class="pagare-linea-firma"></div>
        <div class="pagare-firma-rol">FIRMA(S) DEL(LOS) DEUDOR(ES) / AVAL</div>
        <div class="pagare-firma-nombre">${Utils.esc(deudorNombre)}</div>
      </div>
    </div>
  </div>`;

  function buildBodyHtml(copyIndex) {
    const totalesHtml = `
  <div class="divider"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td class="right">${Utils.formatMonto(venta.subtotal || 0)}</td></tr>
    <tr><td>Descuento</td><td class="right">-${Utils.formatMonto(venta.descuento || 0)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td class="right">${Utils.formatMonto(esCredito ? totalConInteres : venta.total || 0)}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="section">
    <div class="section-title">Forma de Pago</div>
   <table class="totals">
      ${pagoRows}
    </table>
  </div>
  ${planCreditoTicket(venta, desglosePagos)}
  ${venta.nota ? `<div class="nota"><strong>Nota:</strong> ${Utils.esc(venta.nota)}</div>` : ''}
  <div class="firmas"><div class="firma-espacio"><div class="firma-linea"></div>Firma del cliente</div><div class="firma-espacio"><div class="firma-linea"></div>Firma de quien entrega</div></div>`;

    const configFooter = '<div class="ticket-config-footer footer"><strong>Políticas de garantía</strong><br>' + Utils.esc(politicasGarantia).replace(/\n/g, '<br>') + '</div>';
    const cuerpoTotales = '<div class="page-totals">' + totalesHtml + '\n  ' + configFooter + '</div>';

    return `
  ${numCopies > 1 ? '<div class="copy-label">--- COPIA ' + (copyIndex + 1) + ' DE ' + numCopies + ' ---</div>' : ''}
  <div class="header">
     ${logoHtml}
    <div class="sub">${Utils.esc(empresa)}</div>
    <div class="folio">REMISI\u00d3N #${venta.idVenta}</div>
  </div>
  <table class="info-grid">
    <tr><td class="label">Fecha</td><td class="value">${fechaStr}</td><td class="label">Caja</td><td class="value">${Utils.esc(venta.cajaNombre || '')}</td></tr>
    <tr><td class="label">Hora</td><td class="value">${horaStr}</td><td class="label">Sucursal</td><td class="value">${Utils.esc(venta.sucursalNombre || '')}</td></tr>
    <tr><td class="label">Cliente</td><td class="value">${Utils.esc(venta.clienteNombre || 'Mostrador')}</td><td class="label">Atendi\u00f3</td><td class="value">${Utils.esc(venta.usuario || '')}</td></tr>
    <tr><td class="label">Tipo</td><td class="value">${venta.tipoVenta || 'CONTADO'}</td><td class="label">Folio</td><td class="value">#${venta.idVenta}</td></tr>
  </table>
  <div class="divider"></div>
  <table class="detalles">
    <thead>
      <tr>
        <th style="width:38%">Descripci\u00f3n</th>
        <th class="center" style="width:9%">Cant</th>
        <th class="center" style="width:12%">Unidad</th>
        <th class="right" style="width:18%">Precio</th>
        <th class="right" style="width:23%">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${detalleRows}
    </tbody>
  </table>
  ${cuerpoTotales}
  `;
  }

  const win = abrirVentana('Remisi\u00f3n - Venta #' + venta.idVenta, 600, 800);
  if (!win) return;

  const printCss = formato === '80mm' ? TICKET_CSS + TICKET_80MM_CSS : TICKET_CSS;
  let fullHtml = '<!DOCTYPE html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <title>Remisi\u00f3n - Venta #' + venta.idVenta + '</title>\n  <style>' + printCss + '</style>\n</head>\n<body>';
  for (let i = 0; i < numCopies; i++) {
    fullHtml += '<div class="print-copy">' + buildBodyHtml(i) + '</div>';
  }
  fullHtml += '\n</body>\n</html>';
  win.document.write(fullHtml);
  win.document.close();
  win.focus();
  if (autoPrint) {
    setTimeout(() => { win.print(); }, 300);
  }
}

function seleccionarFormatoTicket(venta, options) {
  const existente = document.getElementById('selectorFormatoTicket');
  if (existente) existente.remove();
  const modal = document.createElement('div');
  modal.id = 'selectorFormatoTicket';
  modal.className = 'modal fade';
  modal.tabIndex = -1;
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content border-0 shadow">
        <div class="modal-header border-0">
          <h5 class="modal-title fw-bold"><i class="fas fa-print me-2" style="color:var(--primary)"></i>Imprimir ticket</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p class="small text-muted mb-3">Selecciona el formato para conservar toda la información de la venta #${Utils.esc(venta.idVenta)}</p>
          <div class="d-grid gap-2">
            <button type="button" class="btn btn-primary formato-ticket" data-formato="carta"><i class="fas fa-file-alt me-2"></i>Carta</button>
            <button type="button" class="btn btn-outline-primary formato-ticket" data-formato="80mm"><i class="fas fa-receipt me-2"></i>80 mm</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const instancia = new bootstrap.Modal(modal);
  modal.querySelectorAll('.formato-ticket').forEach(btn => btn.addEventListener('click', () => {
    instancia.hide();
    printRemisionVenta(venta, { ...options, formato: btn.dataset.formato, _confirmed: true });
    modal.addEventListener('hidden.bs.modal', () => modal.remove(), { once: true });
  }));
  modal.addEventListener('hidden.bs.modal', () => modal.remove(), { once: true });
  instancia.show();
}

function seleccionarFormatoDocumento(titulo, descripcion, onSelect) {
  const existente = document.getElementById('selectorFormatoDocumento');
  if (existente) existente.remove();
  const modal = document.createElement('div');
  modal.id = 'selectorFormatoDocumento';
  modal.className = 'modal fade';
  modal.tabIndex = -1;
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content border-0 shadow">
        <div class="modal-header border-0">
          <h5 class="modal-title fw-bold"><i class="fas fa-print me-2" style="color:var(--primary)"></i>${Utils.esc(titulo)}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <p class="small text-muted mb-3">${Utils.esc(descripcion)}</p>
          <div class="d-grid gap-2">
            <button type="button" class="btn btn-primary formato-documento" data-formato="carta"><i class="fas fa-file-alt me-2"></i>Carta</button>
            <button type="button" class="btn btn-outline-primary formato-documento" data-formato="80mm"><i class="fas fa-receipt me-2"></i>80 mm</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  const instancia = new bootstrap.Modal(modal);
  modal.querySelectorAll('.formato-documento').forEach(btn => btn.addEventListener('click', () => {
    instancia.hide();
    onSelect(btn.dataset.formato);
    modal.addEventListener('hidden.bs.modal', () => modal.remove(), { once: true });
  }));
  modal.addEventListener('hidden.bs.modal', () => modal.remove(), { once: true });
  instancia.show();
}

export function printComprobanteAbono(abonos, opts) {
  const options = opts || {};
  if (!options._confirmed) {
    seleccionarFormatoDocumento(
      'Imprimir comprobante de abono',
      'Selecciona el formato del comprobante',
      formato => printComprobanteAbono(abonos, { ...options, formato, _confirmed: true })
    );
    return;
  }

  const lista = Array.isArray(abonos) ? abonos : [abonos];
  const primero = lista[0] || {};
  const total = lista.reduce((sum, abono) => sum + (Number(abono && abono.monto) || 0), 0);
  const saldoTotal = lista.reduce((sum, abono) => sum + (Number(abono && abono.saldoNuevo) || 0), 0);
  const fecha = primero.fecha ? new Date(primero.fecha) : new Date();
  const fechaStr = fecha.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const pagos = lista.reduce((todos, abono) => todos.concat(abono && abono.pagos ? abono.pagos : []), []);
  const pagosHtml = pagos.length
    ? pagos.map(p => `<tr><td>${Utils.esc(p.nombreTipoPago || p.tipoPagoNombre || 'Pago')}${p.referencia ? ' (' + Utils.esc(p.referencia) + ')' : ''}</td><td class="right">${Utils.formatMonto(p.monto || 0)}</td></tr>`).join('')
    : `<tr><td>${Utils.esc(primero.metodoPago || 'Pago')}</td><td class="right">${Utils.formatMonto(total)}</td></tr>`;
  const detalleHtml = lista.map(abono => `
    <div class="abono-detalle">
      <div class="abono-field"><span>Crédito</span><strong>#${Utils.esc(abono.idCredito || '')}${abono.folioCredito ? ' / ' + Utils.esc(abono.folioCredito) : ''}</strong></div>
      <div class="abono-field"><span>Saldo anterior</span><strong>${abono.saldoAnterior != null ? Utils.formatMonto(abono.saldoAnterior) : '—'}</strong></div>
      <div class="abono-field"><span>Abono</span><strong>${Utils.formatMonto(abono.monto || 0)}</strong></div>
      <div class="abono-field"><span>Interés</span><strong>${Utils.formatMonto(abono.interesPagado || 0)}</strong></div>
      <div class="abono-field"><span>Capital</span><strong>${Utils.formatMonto(abono.capitalPagado || 0)}</strong></div>
      <div class="abono-field"><span>Saldo restante</span><strong>${abono.saldoNuevo != null ? Utils.formatMonto(abono.saldoNuevo) : '—'}</strong></div>
    </div>`).join('');
  const clienteNombre = options.clienteNombre || primero.clienteNombre || 'Cliente';
  const estado = lista.some(a => a.estadoCredito === 'PAGADO') ? 'LIQUIDADO' : 'SALDO PENDIENTE';
  const css = options.formato === '80mm' ? TICKET_CSS + TICKET_80MM_CSS : TICKET_CSS;
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Comprobante de abono</title><style>${css}
     .abono-detalle { width:100%; border:1px solid #000; margin:6px 0; }
     .abono-field { display:flex; justify-content:space-between; gap:12px; padding:5px 6px; border-bottom:1px solid #000; font-size:9pt; overflow-wrap:anywhere; }
     .abono-field:last-child { border-bottom:0; }
     .abono-field span { font-weight:700; }
     .abono-field strong { text-align:right; }
    .right { text-align:right; }
    .muted { color:#666; font-size:7.5pt; }
    .abono-total { font-size:14pt; font-weight:700; color:#2563EB; }
     .abono-status { text-align:center; font-weight:700; letter-spacing:1px; margin:10px 0; }
     @media print {
       .abono-field { padding:3px 4px; font-size:7pt; }
       .abono-field span { font-size:6.5pt; }
       .abono-field strong { font-size:7pt; }
     }
    @media print { .print-copy { break-after: page; } .print-copy:last-child { break-after:auto; } }
  </style></head><body>
    <div class="print-copy">
      <div class="header"><div class="sub">Racoon</div><div class="folio">COMPROBANTE DE ABONO</div></div>
      <table class="info-grid">
        <tr><td class="label">Cliente</td><td>${Utils.esc(clienteNombre)}</td></tr>
        <tr><td class="label">Fecha</td><td>${fechaStr} ${horaStr}</td></tr>
        <tr><td class="label">Folio</td><td>#${Utils.esc(primero.idAbono || '')}</td></tr>
        <tr><td class="label">Venta</td><td>#${Utils.esc(primero.idVenta || '')}</td></tr>
        ${options.cajaNombre ? `<tr><td class="label">Caja</td><td>${Utils.esc(options.cajaNombre)}</td></tr>` : ''}
      </table>
      <div class="divider"></div>
       <div class="abono-detalles">${detalleHtml}</div>
      <div class="divider"></div>
      <table class="totals">
        <tr><td>Saldo anterior</td><td class="right">${lista.length === 1 && primero.saldoAnterior != null ? Utils.formatMonto(primero.saldoAnterior) : 'Ver detalle'}</td></tr>
        <tr><td>Total abonado</td><td class="right abono-total">${Utils.formatMonto(total)}</td></tr>
        ${lista.length > 1 ? `<tr><td>Saldo total restante</td><td class="right">${Utils.formatMonto(saldoTotal)}</td></tr>` : ''}
      </table>
      <div class="section"><div class="section-title">Forma de pago</div><table class="totals">${pagosHtml}</table></div>
      <div class="abono-status">${estado}</div>
      <div class="footer">Conserve este comprobante como constancia de su pago.</div>
    </div>
  </body></html>`;
  const win = abrirVentana('Comprobante de abono', 600, 800);
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function printComprobanteMovimiento(movimiento, opts) {
  const options = opts || {};
  if (!options._confirmed) {
    seleccionarFormatoDocumento(
      'Imprimir comprobante de movimiento',
      'Selecciona el formato del comprobante',
      formato => printComprobanteMovimiento(movimiento, { ...options, formato, _confirmed: true })
    );
    return;
  }

  const tipo = Utils.capitalize((movimiento.tipoMovimiento || 'MOVIMIENTO').replace('_', ' '));
  const stock = movimiento.stockAnterior != null && movimiento.stockNuevo != null
    ? movimiento.stockAnterior + ' &rarr; ' + movimiento.stockNuevo : '—';
  const costoTotal = movimiento.costoTotal != null
    ? Utils.formatMonto(movimiento.costoTotal) : '—';
  const css = options.formato === '80mm' ? TICKET_CSS + TICKET_80MM_CSS : TICKET_CSS;
  const html = '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<title>Comprobante de movimiento #' + Utils.esc(movimiento.idMovimiento || '') + '</title>' +
    '<style>' + css + '</style></head><body>' +
    '<div class="print-copy">' +
    '<div class="header"><div class="sub">Racoon</div><div class="folio">COMPROBANTE DE MOVIMIENTO</div></div>' +
    '<table class="info-grid">' +
    '<tr><td class="label">Folio</td><td>' + Utils.esc(movimiento.referencia || ('MOV-' + movimiento.idMovimiento)) + '</td></tr>' +
    '<tr><td class="label">Tipo</td><td>' + Utils.esc(tipo) + '</td></tr>' +
    '<tr><td class="label">Fecha</td><td>' + Utils.formatDateTime(movimiento.fechaMovimiento) + '</td></tr>' +
    '<tr><td class="label">Sucursal</td><td>' + Utils.esc(movimiento.sucursalNombre || 'Global') + '</td></tr>' +
    '<tr><td class="label">Responsable</td><td>' + Utils.esc(movimiento.usuario || '') + '</td></tr>' +
    '</table><div class="divider"></div>' +
    '<table class="detalles"><thead><tr><th>Producto</th><th class="right">Cantidad</th><th class="right">Costo total</th></tr></thead>' +
    '<tbody><tr><td>' + Utils.esc((movimiento.productoSku || '') + ' - ' + (movimiento.productoNombre || '')) + '</td>' +
    '<td class="right">' + (movimiento.cantidad != null ? movimiento.cantidad : '—') + '</td>' +
    '<td class="right">' + costoTotal + '</td></tr></tbody></table>' +
    '<div class="divider"></div><table class="totals">' +
    '<tr><td>Stock anterior &rarr; nuevo</td><td class="right">' + stock + '</td></tr>' +
    '<tr><td>Observación</td><td class="right">' + Utils.esc(movimiento.observacion || '—') + '</td></tr>' +
    '</table><div class="footer">Documento generado por Racoon.</div>' +
    '</div></body></html>';
  const win = abrirVentana('Movimiento #' + movimiento.idMovimiento, 600, 800);
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

export function printCotizacion(cotizacion, opts) {
  const options = opts || {};
  if (!options._confirmed) {
    seleccionarFormatoDocumento(
      'Imprimir cotización',
      'Selecciona el formato para la cotización #' + cotizacion.idCotizacion,
      formato => printCotizacion(cotizacion, { ...options, formato, _confirmed: true })
    );
    return;
  }
  const esCredito = options.esCredito != null ? options.esCredito : cotizacion.tipoVenta === 'CREDITO';
  const porcentajeInteres = options.porcentajeInteres != null ? options.porcentajeInteres : (cotizacion.porcentajeInteres || 0);
  const plazoMeses = options.plazoMeses != null ? options.plazoMeses : cotizacion.plazoMeses;
  const configs = options.configs || {};
  const logo = configs.logoTicket || configs.logoUrl || configs.logoEmpresa || '';
  const logoHtml = logo ? '<img src="' + Utils.esc(logo) + '" class="logo" alt="" onerror="this.remove()">' : '';

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const subtotal = (cotizacion.detalles || []).reduce((s, d) =>
    s + (d.subtotal != null ? d.subtotal : ((d.cantidad || 0) * (d.precioUnitario || 0))), 0);
  const montoEnvio = (cotizacion.cobraEnvio && cotizacion.montoEnvio) ? cotizacion.montoEnvio : 0;
  const total = cotizacion.total != null ? cotizacion.total : (subtotal + montoEnvio);
  const parcialidades = cotizacion.numeroParcialidades || cotizacion.plazoMeses || 1;
  const mesesEquivalentes = cotizacion.periodicidad === 'QUINCENAL' ? parcialidades / 2 : cotizacion.periodicidad === 'SEMANAL' ? parcialidades / 4 : parcialidades;
  const interesTotal = esCredito ? total * porcentajeInteres / 100 * mesesEquivalentes : 0;
  const totalConInteres = total + interesTotal;

  const detalleRows = (cotizacion.detalles || []).map(d => {
    const dSubtotal = d.subtotal != null ? d.subtotal : ((d.cantidad || 0) * (d.precioUnitario || 0));
    const nombre = Utils.esc(d.productoNombre || 'Producto');
    const sku = d.productoSku ? '<br><span class="detalle-attrs">SKU: ' + Utils.esc(d.productoSku) + '</span>' : '';
    return `
    <tr class="detalle-row">
      <td>${nombre}${sku}</td>
      <td class="center">${d.cantidad || 0}</td>
      <td class="center small">—</td>
      <td class="right">${Utils.formatMonto(d.precioUnitario || 0)}</td>
      <td class="right">${Utils.formatMonto(dSubtotal)}</td>
    </tr>`;
  }).join('');

  const pagoHtml = esCredito
     ? `<tr><td>Cr\u00e9dito &mdash; ${cotizacion.periodicidad || 'MENSUAL'} x ${parcialidades}</td><td class="right">${Utils.formatMonto(totalConInteres)}</td></tr>
       <tr><td class="small">Inter\u00e9s mensual ${(porcentajeInteres || 0)}%</td><td class="right">${Utils.formatMonto(interesTotal)}</td></tr>`
    : `<tr><td>Contado</td><td class="right">${Utils.formatMonto(total)}</td></tr>`;

  const expiraStr = cotizacion.fechaExpiracion
    ? new Date(cotizacion.fechaExpiracion).toLocaleDateString('es-MX')
    : (cotizacion.diasVigencia != null ? (cotizacion.diasVigencia + ' d\u00edas') : '-');

  const ganchoEmpresa = configs['direccionEmpresa'] || 'San Luis Potos\u00ed, S.L.P.';
  const telefonoEmpresa = configs['telefonoEmpresa'] || '';

  const totalesHtml = `
  <div class="divider"></div>
  <table class="totals">
    <tr><td>Subtotal</td><td class="right">${Utils.formatMonto(subtotal)}</td></tr>
    <tr><td>Env\u00edo</td><td class="right">${Utils.formatMonto(montoEnvio)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td class="right">${Utils.formatMonto(esCredito ? totalConInteres : total)}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="section">
    <div class="section-title">Forma de Pago</div>
    <table class="totals">
      ${pagoHtml}
    </table>
  </div>
  ${cotizacion.nota ? `<div class="nota"><strong>Nota:</strong> ${Utils.esc(cotizacion.nota)}</div>` : ''}`;

  const formato = options.formato || 'carta';
  const printCss = formato === '80mm' ? TICKET_CSS + TICKET_80MM_CSS : TICKET_CSS;
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotizaci\u00f3n #${cotizacion.idCotizacion}</title>
  <style>${printCss}</style>
</head>
<body>
<div class="print-copy">
  <div class="header">
     ${logoHtml}
    <div class="folio">COTIZACI\u00d3N #${cotizacion.idCotizacion}</div>
  </div>
  <table class="info-grid">
    <tr><td class="label">Fecha</td><td class="value">${fechaStr}</td><td class="label">Atendi\u00f3</td><td class="value">${Utils.esc(cotizacion.usuarioNombre || '')}</td></tr>
    <tr><td class="label">Hora</td><td class="value">${horaStr}</td><td class="label">Paqueter\u00eda</td><td class="value">${Utils.esc(cotizacion.paqueteria || '—')}</td></tr>
    <tr><td class="label">Cliente</td><td class="value">${Utils.esc(cotizacion.clienteNombre || '')}</td><td class="label">Tipo</td><td class="value">${esCredito ? 'CR\u00c9DITO' : 'CONTADO'}</td></tr>
    <tr><td class="label">Vigencia</td><td class="value">V\u00e1lida hasta ${expiraStr}</td><td class="label">Folio</td><td class="value">#${cotizacion.idCotizacion}</td></tr>
  </table>
  <div class="divider"></div>
  <table class="detalles">
    <thead>
      <tr>
        <th style="width:38%">Descripci\u00f3n</th>
        <th class="center" style="width:9%">Cant</th>
        <th class="center" style="width:12%">Unidad</th>
        <th class="right" style="width:18%">Precio</th>
        <th class="right" style="width:23%">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${detalleRows}
    </tbody>
  </table>
  ${totalesHtml}
  <div class="bottom-section">
    <div class="footer">
      <strong>Logotex</strong> &mdash; ${Utils.esc(ganchoEmpresa)}${telefonoEmpresa ? ' &mdash; ' + Utils.esc(telefonoEmpresa) : ''}<br>
      Este documento es una cotizaci\u00f3n y no constituye venta ni factura<br>
      ${fechaStr} ${horaStr}
    </div>
  </div>
</div>
</body>
</html>`;

  const win = abrirVentana('Cotizaci\u00f3n #' + cotizacion.idCotizacion, 600, 800);
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  if (options.autoPrint !== false) {
    setTimeout(() => { win.print(); }, 300);
  }
}

function buildEstadoCuentaHtml(payload, formato) {
  const configs = payload.configs || {};
  const cliente = payload.cliente || {};
  const totalPendiente = payload.totalPendiente || 0;
  const tasaMora = payload.tasaMora;

  const creditosRows = (payload.creditos || []).map(c => `<tr>
    <td>${c.idCredito}</td>
    <td>#${Utils.esc(c.folioPagare || c.folio || '')}</td>
    <td class="right">${Utils.formatMonto(c.montoOriginal || 0)}</td>
    <td class="right">${Utils.formatMonto(c.saldoPendiente || 0)}</td>
  </tr>`).join('');

  const creditosById = {};
  (payload.creditos || []).forEach(c => { creditosById[c.idCredito] = c; });

  const movimientos = (payload.movimientos || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const movRows = movimientos.map(m => {
    const c = creditosById[m.idCredito];
    const folio = c ? (c.folioPagare || c.folio || ('#' + c.idCredito)) : '&mdash;';
    const venta = c ? ('#' + (c.idVenta || '')) : '&mdash;';
    const tipo = m.tipo === 'CARGO' ? 'Cargo'
      : m.tipo === 'ABONO' ? 'Abono'
      : m.tipo === 'LIQUIDACION' ? 'Liquidaci\u00f3n' : (m.tipo || '');
    return `<tr>
      <td>${Utils.esc(folio)}</td>
      <td>${Utils.esc(venta)}</td>
      <td>${m.fecha ? new Date(m.fecha).toLocaleString() : '-'}</td>
      <td>${tipo}${m.tipoPagoNombre ? ' (' + Utils.esc(m.tipoPagoNombre) + ')' : ''}</td>
      <td class="right">${Utils.formatMonto(m.monto || 0)}</td>
      <td class="right">${Utils.formatMonto(m.saldoNuevo || 0)}</td>
    </tr>`;
  }).join('');

  const notas = (payload.notas || [])
    .filter(n => n.nota)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  const notasHtml = notas.length
    ? '<ol>' + notas.map(n => '<li>' + Utils.esc(n.nota) + '</li>').join('') + '</ol>'
    : '<div style="text-align:center;font-size:8.5pt">Sin notas de ventas</div>';

  const nombreCliente = [cliente.nombre || '', cliente.apellidoPaterno || '', cliente.apellidoMaterno || ''].filter(Boolean).join(' ');

  const printCss = formato === '80mm' ? STATE_CUENTA_CSS + STATE_CUENTA_80MM_CSS : STATE_CUENTA_CSS;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Estado de Cuenta</title>
  <style>${printCss}</style></head><body>
    <div class="header">
       ${(configs.logoTicket || configs.logoUrl || configs.logoEmpresa) ? '<img src="' + Utils.esc(configs.logoTicket || configs.logoUrl || configs.logoEmpresa) + '" class="logo" alt="" onerror="this.remove()">' : ''}
      <div class="sub">${Utils.esc(configs['descripcionEmpresa'] || '')} &mdash; ${Utils.esc(configs['direccionEmpresa'] || '')}</div>
      <div class="title">Estado de Cuenta</div>
    </div>
    <div class="info-row"><span><strong>Cliente:</strong> ${Utils.esc(nombreCliente)}</span><span><strong>Tel\u00e9fono:</strong> ${Utils.esc(cliente.telefono || '-')}</span></div>
    <div class="info-row"><span><strong>L\u00edmite de cr\u00e9dito:</strong> ${Utils.formatMonto(cliente.limiteCredito || 0)}</span><span><strong>Deuda total:</strong> <span class="total">${Utils.formatMonto(totalPendiente)}</span></span></div>
    <div class="info-row"><span><strong>Tasa de mora mensual:</strong> ${tasaMora != null ? tasaMora + '%' : '—'}</span><span><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</span></div>
    <div class="line"></div>
    <h3 class="sub-title">Cr\u00e9ditos</h3>
    <table>
      <thead><tr><th>#</th><th>Folio de cr\u00e9dito</th><th class="right">Original</th><th class="right">Pendiente</th></tr></thead>
      <tbody>${creditosRows || '<tr><td colspan="4" style="text-align:center">Sin cr\u00e9ditos</td></tr>'}</tbody>
    </table>
    <div class="line"></div>
    <h3 class="sub-title">Movimientos</h3>
    <table>
      <thead><tr><th>Folio</th><th>Venta</th><th>Fecha</th><th>Movimiento</th><th class="right">Cantidad</th><th class="right">Saldo</th></tr></thead>
      <tbody>${movRows || '<tr><td colspan="6" style="text-align:center">Sin movimientos</td></tr>'}</tbody>
    </table>
    <div class="line"></div>
    <h3 class="sub-title">Notas de ventas</h3>
    <div class="notas-box">${notasHtml}</div>
    <div class="firma"><div class="firma-linea"></div>Firma del cliente</div>
  </body></html>`;
}

export function printEstadoCuenta(payload, opts) {
  const options = opts || {};
  if (!options._confirmed) {
    seleccionarFormatoDocumento(
      'Imprimir estado de cuenta',
      'Selecciona el formato del estado de cuenta',
      formato => printEstadoCuenta(payload, { ...options, formato, _confirmed: true })
    );
    return;
  }
  const formato = options.formato || 'carta';
  const html = buildEstadoCuentaHtml(payload, formato);
  const win = abrirVentana('Estado de Cuenta', 700, 680);
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 300);
}

export function descargarEstadoCuentaPdf(payload) {
  if (typeof html2canvas !== 'function' || typeof window.jspdf !== 'object' || !window.jspdf.jsPDF) {
    Utils.showToast('Librer\u00edas de PDF no disponibles', 'error');
    return;
  }
  const html = buildEstadoCuentaHtml(payload, 'carta');
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '1000px';
  iframe.style.height = '1600px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const idoc = iframe.contentWindow.document;
  idoc.open();
  idoc.write(html);
  idoc.close();

  let intentos = 0;
  const intentar = function () {
    const body = iframe.contentWindow.document.body;
    if (!body || intentos++ > 50) {
      iframe.remove();
      Utils.showToast('No se pudo generar el PDF', 'error');
      return;
    }
    html2canvas(body, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      .then(function (canvas) {
        const jsPDF = window.jspdf.jsPDF;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = canvas.height * imgW / canvas.width;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        if (imgH <= pageH) {
          pdf.addImage(dataUrl, 'JPEG', 0, 0, imgW, imgH);
        } else {
          let heightLeft = imgH;
          let position = 0;
          pdf.addImage(dataUrl, 'JPEG', 0, position, imgW, imgH);
          heightLeft -= pageH;
          while (heightLeft > 0) {
            position -= pageH;
            pdf.addPage();
            pdf.addImage(dataUrl, 'JPEG', 0, position, imgW, imgH);
            heightLeft -= pageH;
          }
        }
        const nombre = [payload.cliente && payload.cliente.nombre, payload.cliente && payload.cliente.apellidoPaterno].filter(Boolean).join(' ').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'cliente';
        pdf.save('estado-de-cuenta_' + nombre + '_' + new Date().toISOString().slice(0, 10) + '.pdf');
        iframe.remove();
      })
      .catch(function () {
        iframe.remove();
        Utils.showToast('Error al generar el PDF', 'error');
      });
  };
  setTimeout(intentar, 300);
}
