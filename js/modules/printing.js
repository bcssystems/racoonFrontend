const TICKET_CSS = `
    @page {
      size: letter;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      color: #222;
      line-height: 1.35;
    }
    .print-copy {
      page-break-after: always;
      min-height: 100vh;
      position: relative;
      box-sizing: border-box;
      padding: 0.25in;
      display: -webkit-flex;
      display: flex;
      -webkit-flex-direction: column;
      flex-direction: column;
    }
    .print-copy:last-child { page-break-after: avoid; }
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
      margin-bottom: 10px;
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

function abrirVentana(titulo, alto, ancho) {
  const win = window.open('', '_blank', 'width=' + (ancho || 800) + ',height=' + (alto || 900));
  if (!win) {
    Utils.showToast('Bloqueador de popups activo. Permite las ventanas emergentes.', 'warning');
    return null;
  }
  return win;
}

export function printRemisionVenta(venta, opts) {
  const options = opts || {};
  const esCredito = options.esCredito || venta.tipoVenta === 'CREDITO';
  const porcentajeInteres = options.porcentajeInteres != null ? options.porcentajeInteres : (venta.porcentajeInteres || 0);
  const plazoMeses = options.plazoMeses != null ? options.plazoMeses : venta.plazoMeses;
  const numCopies = Math.max(1, options.copies || 1);
  const autoPrint = options.autoPrint !== false;
  const configs = options.configs || {};
  const clienteInfo = options.clienteInfo || null;

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const totalConInteres = esCredito
    ? (venta.total || 0) + ((venta.total || 0) * porcentajeInteres / 100)
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

  const pagoRows = esCredito
    ? `<tr><td>Cr\u00e9dito &mdash; Pagar\u00e9 #${Utils.esc(venta.folioPagare || '—')}</td><td class="right">${Utils.formatMonto(totalConInteres)}</td></tr>
       <tr><td class="small">Inter\u00e9s ${(porcentajeInteres || 0)}% / Plazo: ${plazoMeses != null ? plazoMeses + ' meses' : '—'}</td><td class="right">${Utils.formatMonto((venta.total || 0) * porcentajeInteres / 100)}</td></tr>`
    : (venta.pagos || []).length > 0
      ? (venta.pagos || []).map(p => `
    <tr>
      <td>${Utils.esc(p.tipoPagoNombre || '')}${p.referencia ? ' (' + Utils.esc(p.referencia) + ')' : ''}</td>
      <td class="right">${Utils.formatMonto(p.monto || 0)}</td>
    </tr>`).join('')
      : `<tr><td>Enviando pedido</td><td class="right small">Pendiente de pago</td></tr>`;

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
    <h2 class="pagare-h2">PAGAR\u00c9</h2>
    <div class="pagare-doc-no">FOLIO DE PAGAR\u00c9: ${Utils.esc(venta.folioPagare || '—')}</div>
    <div class="pagare-lugar-fecha">
      <span>LUGAR DE EXPEDICI\u00d3N: ${Utils.esc(lugarPagare)}</span>
      <span>D\u00cdA: ${diaExpedicion}&nbsp;&nbsp; MES: ${Utils.esc(mesExpedicion)}&nbsp;&nbsp; A\u00d1O: ${anioExpedicion}</span>
    </div>
    <div class="pagare-bueno-por">
      <span class="pagare-bueno-por-label">BUENO POR</span>
      <span class="pagare-bueno-por-monto">${Utils.formatMonto(totalConInteres)}</span>
    </div>
    <p class="pagare-leyenda">
      Debemos y pagar\u00e9(mos) incondicionalmente en esta ciudad o en cualquier otra que se me requiera, este Pagar\u00e9 a la orden de:
      <strong>${Utils.esc(titularPagare)}</strong>, el d\u00eda ${diaExpedicion} de ${Utils.esc(mesExpedicion)} de ${anioExpedicion}.
      La cantidad de: <strong>${Utils.formatMonto(totalConInteres)} (${Utils.esc(montoLetras)})</strong>.
    </p>
    <p class="pagare-leyenda">
      CANTIDAD QUE CORRESPONDE AL IMPORTE DE LAS MERCANCIAS QUE SE DETALLAN EN EL PEDIDO CUYO N\u00daMERO COINCIDE CON EL DE ESTE DOCUMENTO QUE HE RECIBIDO DE CONFORMIDAD,
      SIENDO ESTE PAGAR\u00c9 MERCANTIL EN LOS T\u00c9RMINOS DE LOS ART\u00cdCULOS 170 Y 171 DE LA LEY GENERAL DE T\u00cdTULOS Y OPERACIONES DE CR\u00c9DITO; AS\u00cd MISMO,
      DE CONFORMIDAD CON EL ART\u00cdCULO 11 Y DEM\u00c1S RELATIVOS DE LA LEY CITADA, ME OBLIGO INCONDICIONALMENTE A PAGAR EL IMPORTE DE ESTE PAGAR\u00c9 CUANDO
      SEA ACEPTADO EN MI NOMBRE Y REPRESENTACI\u00d3N POR EMPLEADO O DEPENDIENTE DE MI NEGOCIO. EL PRESENTE PAGAR\u00c9 ES SIN PROTESTO; EN CASO DE MORA
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
  ${venta.nota ? `<div class="nota"><strong>Nota:</strong> ${Utils.esc(venta.nota)}</div>` : ''}
  ${esCredito ? '<div class="firmas"><div class="firma-espacio"><div class="firma-linea"></div>Entreg\u00f3</div><div class="firma-espacio"><div class="firma-linea"></div>Recibi\u00f3</div></div>' : ''}`;

    const pieHtml = `<div class="bottom-section pagare-footer">${pagareHtml}</div>`;

    const cuerpoTotales = '<div class="page-totals">' + totalesHtml + '\n  ' + pieHtml + '</div>';

    return `
  ${numCopies > 1 ? '<div class="copy-label">--- COPIA ' + (copyIndex + 1) + ' DE ' + numCopies + ' ---</div>' : ''}
  <div class="header">
    <img src="assets/imgs/logotex.png" class="logo" alt="Logotex">
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

  let fullHtml = '<!DOCTYPE html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <title>Remisi\u00f3n - Venta #' + venta.idVenta + '</title>\n  <style>' + TICKET_CSS + '</style>\n</head>\n<body>';
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

export function printCotizacion(cotizacion, opts) {
  const options = opts || {};
  const esCredito = options.esCredito != null ? options.esCredito : cotizacion.tipoVenta === 'CREDITO';
  const porcentajeInteres = options.porcentajeInteres != null ? options.porcentajeInteres : (cotizacion.porcentajeInteres || 0);
  const plazoMeses = options.plazoMeses != null ? options.plazoMeses : cotizacion.plazoMeses;
  const configs = options.configs || {};

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const subtotal = (cotizacion.detalles || []).reduce((s, d) =>
    s + (d.subtotal != null ? d.subtotal : ((d.cantidad || 0) * (d.precioUnitario || 0))), 0);
  const montoEnvio = (cotizacion.cobraEnvio && cotizacion.montoEnvio) ? cotizacion.montoEnvio : 0;
  const total = cotizacion.total != null ? cotizacion.total : (subtotal + montoEnvio);
  const totalConInteres = esCredito ? total + (total * porcentajeInteres / 100) : total;

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
    ? `<tr><td>Cr\u00e9dito &mdash; Plazo ${plazoMeses != null ? plazoMeses + ' meses' : '—'}</td><td class="right">${Utils.formatMonto(totalConInteres)}</td></tr>
       <tr><td class="small">Inter\u00e9s ${(porcentajeInteres || 0)}%</td><td class="right">${Utils.formatMonto(total * porcentajeInteres / 100)}</td></tr>`
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

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Cotizaci\u00f3n #${cotizacion.idCotizacion}</title>
  <style>${TICKET_CSS}</style>
</head>
<body>
<div class="print-copy">
  <div class="header">
    <img src="assets/imgs/logotex.png" class="logo" alt="Logotex">
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

function buildEstadoCuentaHtml(payload) {
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

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Estado de Cuenta</title>
  <style>${STATE_CUENTA_CSS}</style></head><body>
    <div class="header">
      <img src="assets/imgs/logotex.png" class="logo" alt="Logotex">
      <div class="sub">${Utils.esc(configs['descripcionEmpresa'] || '')} &mdash; ${Utils.esc(configs['direccionEmpresa'] || '')}</div>
      <div class="title">Estado de Cuenta</div>
    </div>
    <div class="info-row"><span><strong>Cliente:</strong> ${Utils.esc(nombreCliente)}</span><span><strong>Tel\u00e9fono:</strong> ${Utils.esc(cliente.telefono || '-')}</span></div>
    <div class="info-row"><span><strong>L\u00edmite de cr\u00e9dito:</strong> ${Utils.formatMonto(cliente.limiteCredito || 0)}</span><span><strong>Deuda total:</strong> <span class="total">${Utils.formatMonto(totalPendiente)}</span></span></div>
    <div class="info-row"><span><strong>Tasa de mora mensual:</strong> ${tasaMora != null ? tasaMora + '%' : '—'}</span><span><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</span></div>
    <div class="line"></div>
    <h3 class="sub-title">Cr\u00e9ditos</h3>
    <table>
      <thead><tr><th>#</th><th>Pagar\u00e9</th><th class="right">Original</th><th class="right">Pendiente</th></tr></thead>
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

export function printEstadoCuenta(payload) {
  const html = buildEstadoCuentaHtml(payload);
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
  const html = buildEstadoCuentaHtml(payload);
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