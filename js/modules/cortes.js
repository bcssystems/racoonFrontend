let state = {
  page: 0,
  totalPages: 0,
  size: 15,
  currentCorte: null,
  currentMovimientos: [],
};

export function init() {
  bindEvents();
  cargarSucursales();
  const hoy = todayStr();
  document.getElementById('filterDesde').value = hoy;
  document.getElementById('filterHasta').value = hoy;
  buscar(0);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function puedeVerMovimientos() {
  return Utils.hasPermiso('CORTES_MOVIMIENTOS_VER') ||
    ['ADMINISTRADOR', 'SISTEMAS'].includes((Utils.getRolActual() || '').toUpperCase());
}

function bindEvents() {
  document.getElementById('btnFiltrar')?.addEventListener('click', () => buscar(0));
  document.getElementById('btnLimpiar')?.addEventListener('click', limpiar);
  document.getElementById('filterSucursal')?.addEventListener('change', async (e) => {
    const idSucursal = parseInt(e.target.value);
    const selCaja = document.getElementById('filterCaja');
    selCaja.innerHTML = '<option value="">Todas</option>';
    if (idSucursal) {
      try {
        const cajas = await API.get('/cajas/sucursal/' + idSucursal);
        selCaja.innerHTML += cajas.map(c => `<option value="${c.idCaja}">${Utils.esc(c.nombre)}</option>`).join('');
      } catch (_) {}
    }
  });
  document.getElementById('tableBody')?.addEventListener('click', handleTableClick);
  document.getElementById('btnReimprimirCorte')?.addEventListener('click', reimprimirCorte);
  document.getElementById('btnReimprimirCorte80')?.addEventListener('click', () => reimprimirCorte('80mm'));
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    const id = parseInt(kebab.dataset.id);
    const acciones = [
      { icon: 'fa-eye', text: 'Ver detalle', color: 'var(--info)', onClick: () => verCorte(id) },
      { icon: 'fa-receipt', text: 'Reimprimir corte', color: 'var(--primary)', onClick: () => reimprimirCorteDesdeLista(id) },
    ];
    if (puedeVerMovimientos()) {
      acciones.push({ icon: 'fa-print', text: 'Imprimir movimientos del corte', color: 'var(--primary)', onClick: () => imprimirMovimientosCorte(id) });
    }
    Utils.abrirMenuKebab(kebab, acciones);
    return;
  }
}

async function reimprimirCorteDesdeLista(id) {
  try {
    state.currentCorte = await API.get('/cortes/' + id);
    reimprimirCorte();
  } catch (err) {
    Utils.showToast('No se pudo cargar el corte: ' + err.message, 'error');
  }
}

async function cargarSucursales() {
  try {
    const sucursales = await API.get('/sucursales');
    const sel = document.getElementById('filterSucursal');
    sel.innerHTML = '<option value="">Todas</option>' +
      sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
  } catch (_) {}
}

function limpiar() {
  document.getElementById('filterSucursal').value = '';
  document.getElementById('filterCaja').innerHTML = '<option value="">Todas</option>';
  document.getElementById('filterDesde').value = todayStr();
  document.getElementById('filterHasta').value = todayStr();
  document.getElementById('tableBody').innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-calculator"></i><p>Selecciona filtros y presiona Buscar</p></div></td></tr>';
  document.getElementById('pagination').innerHTML = '';
}

async function buscar(page) {
  state.page = page;
  const body = document.getElementById('tableBody');
  if (!body) return;

  const params = new URLSearchParams();
  params.set('page', page);
  params.set('size', state.size);

  const idSucursal = parseInt(document.getElementById('filterSucursal').value);
  const idCaja = parseInt(document.getElementById('filterCaja').value);
  const desde = document.getElementById('filterDesde').value;
  const hasta = document.getElementById('filterHasta').value;

  if (idSucursal) params.set('idSucursal', idSucursal);
  if (idCaja) params.set('idCaja', idCaja);
  if (desde) params.set('fechaInicio', desde + 'T00:00:00');
  if (hasta) params.set('fechaFin', hasta + 'T23:59:59');

  body.innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Buscando...</p></div></td></tr>';

  try {
    const result = await API.get('/cortes?' + params.toString());
    const cortes = result.content || [];
    state.totalPages = result.totalPages;

    if (cortes.length === 0) {
      body.innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-calculator"></i><p>Sin resultados</p></div></td></tr>';
    } else {
      body.innerHTML = cortes.map(c => `<tr>
        <td>${c.idCorte}</td>
        <td>${Utils.esc(c.cajaNombre || '')}</td>
        <td>${Utils.esc(c.sucursalNombre || '')}</td>
        <td>${Utils.formatMonto(c.saldoInicial || 0)}</td>
        <td class="fw-semibold">${Utils.formatMonto(c.totalVentas || 0)}</td>
        <td class="text-success">${Utils.formatMonto(c.totalIngresos || 0)}</td>
        <td class="text-danger">${Utils.formatMonto(c.totalEgresos || 0)}</td>
        <td class="fw-bold" style="color:var(--primary)">${Utils.formatMonto(c.saldoFinalContado || 0)}</td>
        <td>${Utils.formatDateTime(c.fechaApertura)}</td>
        <td>${Utils.formatDateTime(c.fechaCierre)}</td>
        <td>${Utils.esc(c.usuario || '')}</td>
        <td><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${c.idCorte}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>
      </tr>`).join('');
    }

    renderPagination();
  } catch (_) {
    body.innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error al consultar</p></div></td></tr>';
  }
}

async function verCorte(id) {
  try {
    const corte = await API.get('/cortes/' + id);
    state.currentCorte = corte;
    state.currentMovimientos = [];
    let errorMovimientos = null;
    if (puedeVerMovimientos()) {
      try { state.currentMovimientos = await API.get('/cortes/' + id + '/movimientos') || []; }
      catch (err) { errorMovimientos = err.message || 'No fue posible cargar los movimientos'; }
    }
    document.getElementById('corteDetailId').textContent = corte.idCorte;
    const isAdmin = Utils.hasPermiso('CORTES_EDITAR');

    const body = document.getElementById('corteDetailBody');
    body.innerHTML = `
      <div class="col-md-6">
        <div class="panel-card p-3">
          <table class="table table-sm table-borderless mb-0">
            <tr><td class="text-muted">Caja</td><td class="fw-semibold text-end">${Utils.esc(corte.cajaNombre || '')}</td></tr>
            <tr><td class="text-muted">Sucursal</td><td class="fw-semibold text-end">${Utils.esc(corte.sucursalNombre || '')}</td></tr>
            <tr><td class="text-muted">Entregado por</td><td class="fw-semibold text-end">${Utils.esc(corte.usuario || '')}</td></tr>
            <tr><td class="text-muted">Apertura</td><td class="fw-semibold text-end">${Utils.formatDateTime(corte.fechaApertura)}</td></tr>
            <tr><td class="text-muted">Cierre</td><td class="fw-semibold text-end">${Utils.formatDateTime(corte.fechaCierre)}</td></tr>
            <tr><td class="text-muted">Recibido por</td><td class="fw-semibold text-end">${Utils.esc(corte.recibidoPor || 'PENDIENTE')}</td></tr>
            <tr><td class="text-muted">Fecha de recepción</td><td class="fw-semibold text-end">${corte.fechaRecepcion ? Utils.formatDateTime(corte.fechaRecepcion) : '—'}</td></tr>
          </table>
        </div>
      </div>
      <div class="col-md-6">
        <div class="panel-card p-3">
          <table class="table table-sm table-borderless mb-0">
            <tr><td class="text-muted">Saldo Inicial</td><td class="fw-semibold text-end">${Utils.formatMonto(corte.saldoInicial || 0)}</td></tr>
            <tr><td class="text-muted">Ventas</td><td class="fw-semibold text-end">${Utils.formatMonto(corte.totalVentas || 0)}</td></tr>
            <tr><td class="text-muted">Contado</td><td class="fw-semibold text-end">${Utils.formatMonto(corte.totalVentasContado || 0)}</td></tr>
            <tr><td class="text-muted">Cr\u00e9dito</td><td class="fw-semibold text-end">${Utils.formatMonto(corte.totalVentasCredito || 0)}</td></tr>
            <tr><td class="text-muted">Ingresos</td><td class="text-success fw-semibold text-end">+${Utils.formatMonto(corte.totalIngresos || 0)}</td></tr>
            <tr><td class="text-muted">Egresos</td><td class="text-danger fw-semibold text-end">-${Utils.formatMonto(corte.totalEgresos || 0)}</td></tr>
            <tr><td class="text-muted">Abonos (Cr\u00e9ditos)</td><td class="fw-semibold text-end" style="color:var(--info)">+${Utils.formatMonto(corte.totalAbonos || 0)}</td></tr>
            <tr class="border-top"><td class="fw-bold">Saldo Final</td><td class="fw-bold text-end" style="color:var(--primary)">${Utils.formatMonto(corte.saldoFinalContado || 0)}</td></tr>
          </table>
        </div>
      </div>
      ${puedeVerMovimientos() ? `
      <div class="col-12">
        <div class="panel-card p-3">
          <h6 class="fw-semibold mb-2">Movimientos del periodo <span class="text-muted small">(${state.currentMovimientos.length})</span></h6>
          ${errorMovimientos ? `<div class="alert alert-danger py-2 mb-2">No se pudieron consultar los movimientos: ${Utils.esc(errorMovimientos)}. Si se denegó el acceso, cierra sesión y vuelve a entrar para renovar permisos.</div>` : ''}
          <div class="table-responsive"><table class="table table-sm table-custom mb-0">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Cliente / crédito</th><th>Usuario</th><th>Estado</th><th class="text-end">Monto</th></tr></thead>
            <tbody>${state.currentMovimientos.length ? state.currentMovimientos.map(m => `<tr>
              <td>${Utils.formatDateTime(m.fecha)}</td><td>${Utils.esc(m.tipo || '')}</td><td>${Utils.esc(m.descripcion || '')}${m.idVenta ? ' · Venta #' + m.idVenta : ''}</td>
              <td>${Utils.esc(m.cliente || '—')}${m.folioCredito ? '<br><small>Crédito ' + Utils.esc(m.folioCredito) + '</small>' : ''}</td>
              <td>${Utils.esc(m.usuario || '')}</td><td>${m.cancelado ? 'CANCELADO' : 'VIGENTE'}${m.motivoCancelacion ? '<br><small>' + Utils.esc(m.motivoCancelacion) + '</small>' : ''}</td>
              <td class="text-end">${Utils.formatMonto(m.monto || 0)}</td></tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted">Sin movimientos registrados</td></tr>'}</tbody>
          </table></div>
        </div>
      </div>` : ''}
      <div class="col-12">
        <div class="panel-card p-3">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="fw-semibold mb-0">Desglose por Forma de Pago</h6>
            ${isAdmin ? `<button class="btn btn-sm btn-outline-primary ripple" id="btnEditCorte"><i class="fas fa-pen me-1"></i> Editar Conteo Real</button>` : ''}
          </div>
          ${corte.detallePagos && corte.detallePagos.length > 0 ? `
          <table class="table table-sm table-custom mb-0" id="corteDetalleTable">
            <thead>
              <tr>
                <th>Forma de Pago</th>
                <th class="text-end">Sistema</th>
                ${isAdmin ? '<th class="text-end" style="width:140px">Real</th>' : '<th class="text-end">Real</th>'}
                <th class="text-end">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              ${corte.detallePagos.map(d => {
                const diff = (d.montoReal != null) ? (d.montoReal - (d.monto || 0)) : null;
                const diffStr = diff != null ? ((diff >= 0 ? '+' : '') + Utils.formatMonto(diff)) : '-';
                const diffColor = diff != null ? (diff === 0 ? '' : (diff > 0 ? 'color:var(--success)' : 'color:var(--danger)')) : 'color:#999';
                return `
              <tr>
                <td>${Utils.esc(d.tipoPagoNombre || '')}</td>
                <td class="text-end fw-semibold">${Utils.formatMonto(d.monto || 0)}</td>
                ${isAdmin ? `<td class="text-end">
                  <input type="number" class="form-control form-control-sm corte-real-input text-end" data-id="${d.idTipoPago}" data-sistema="${(d.monto || 0)}" step="0.01" min="0" value="${(d.montoReal != null ? d.montoReal : (d.monto || 0)).toFixed(2)}" disabled>
                </td>` : `<td class="text-end fw-semibold">${d.montoReal != null ? Utils.formatMonto(d.montoReal) : '-'}</td>`}
                <td class="text-end fw-semibold" style="${diffColor}">${diffStr}</td>
              </tr>`;}).join('')}
              <tr class="border-top">
                <td class="fw-bold">Total</td>
                <td class="text-end fw-bold">${Utils.formatMonto(corte.detallePagos.reduce((s, d) => s + (d.monto || 0), 0))}</td>
                ${isAdmin ? `<td class="text-end fw-bold corte-total-real">${Utils.formatMonto(corte.totalReal || corte.detallePagos.reduce((s, d) => s + (d.monto || 0), 0))}</td>` : `<td class="text-end fw-bold">${corte.totalReal != null ? Utils.formatMonto(corte.totalReal) : '-'}</td>`}
                <td class="text-end fw-bold" style="${corte.diferencia != null ? (corte.diferencia === 0 ? '' : (corte.diferencia > 0 ? 'color:var(--success)' : 'color:var(--danger)')) : 'color:#999'}">${corte.diferencia != null ? ((corte.diferencia >= 0 ? '+' : '') + Utils.formatMonto(corte.diferencia)) : '-'}</td>
              </tr>
            </tbody>
          </table>
          ${isAdmin ? '<div class="text-end mt-2 d-none" id="corteEditActions"><button class="btn btn-primary btn-sm px-3 ripple" id="btnSaveCorteReal"><i class="fas fa-save me-1"></i> Guardar Cambios</button></div>' : ''}
          ` : '<p class="text-muted small mb-0">Sin desglose de pagos</p>'}
        </div>
      </div>
      ${corte.abonos && corte.abonos.length > 0 ? `
      <div class="col-12">
        <div class="panel-card p-3">
          <h6 class="fw-semibold mb-2"><i class="fas fa-hand-holding-dollar me-1" style="color:var(--info)"></i> Abonos por Cr\u00e9dito <span class="text-muted small">(${corte.abonos.length})</span></h6>
          <div class="table-responsive">
            <table class="table table-sm table-custom mb-0">
              <thead>
                <tr>
                  <th>Folio Cr\u00e9dito</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Tipo Pago</th>
                  <th class="text-end">Monto</th>
                </tr>
              </thead>
              <tbody>
                ${corte.abonos.map(a => `
                <tr>
                  <td>${a.folioCredito ? Utils.esc(a.folioCredito) : '<span class="text-muted">-</span>'}</td>
                  <td>${Utils.esc(a.cliente || '')}</td>
                  <td>${Utils.formatDateTime(a.fecha)}</td>
                  <td>${Utils.esc(a.tipoPago || '')}</td>
                  <td class="text-end fw-semibold">${Utils.formatMonto(a.monto || 0)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>` : ''}
    `;

    new bootstrap.Modal(document.getElementById('corteDetailModal')).show();

    const btnRecibir = document.getElementById('btnRecibirCorte');
    if (btnRecibir) btnRecibir.remove();
    if (Utils.hasPermiso('CORTES_RECIBIR') && !corte.recibidoPor) {
      const footer = document.querySelector('#corteDetailModal .modal-body .text-center');
      if (footer) {
        const receive = document.createElement('button');
        receive.id = 'btnRecibirCorte'; receive.className = 'btn btn-success px-4 ms-2';
        receive.innerHTML = '<i class="fas fa-check me-1"></i> Marcar recibido';
        receive.addEventListener('click', async () => {
          try {
            await API.post('/cortes/' + corte.idCorte + '/recibir', {});
            Utils.showToast('Corte marcado como recibido', 'success');
            bootstrap.Modal.getInstance(document.getElementById('corteDetailModal'))?.hide();
            await verCorte(corte.idCorte); buscar(state.page);
          } catch (err) { Utils.showToast(err.message, 'error'); }
        });
        footer.appendChild(receive);
      }
    }

    if (isAdmin) {
      const editBtn = document.getElementById('btnEditCorte');
      const saveDiv = document.getElementById('corteEditActions');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          document.querySelectorAll('#corteDetalleTable .corte-real-input').forEach(i => i.disabled = false);
          saveDiv?.classList.remove('d-none');
          editBtn.classList.add('d-none');
        });
      }
      const saveBtn = document.getElementById('btnSaveCorteReal');
      if (saveBtn) {
        saveBtn.addEventListener('click', saveCorteRealCounts);
      }
      document.querySelectorAll('#corteDetalleTable .corte-real-input').forEach(inp => {
        inp.addEventListener('input', function() {
          const sistema = parseFloat(this.dataset.sistema) || 0;
          const real = parseFloat(this.value) || 0;
          let totalReal = 0;
          let totalSistema = 0;
          document.querySelectorAll('#corteDetalleTable .corte-real-input').forEach(i => {
            totalReal += parseFloat(i.value) || 0;
            totalSistema += parseFloat(i.dataset.sistema) || 0;
          });
          document.querySelector('.corte-total-real').textContent = Utils.formatMonto(totalReal);
        });
      });
    }
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function imprimirMovimientosCorte(id) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    Utils.showToast('Permite las ventanas emergentes para imprimir el reporte', 'warning');
    return;
  }
  printWindow.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Movimientos del corte</title></head><body><p>Consultando movimientos...</p></body></html>');
  try {
    const [corte, movimientos] = await Promise.all([
      API.get('/cortes/' + id), API.get('/cortes/' + id + '/movimientos')
    ]);
    const filas = movimientos.length ? movimientos.map(m => `<tr>
      <td>${Utils.esc(Utils.formatDateTime(m.fecha))}</td><td>${Utils.esc(m.tipo || '')}</td>
      <td>${Utils.esc(m.descripcion || '')}${m.idVenta ? ' · Venta #' + m.idVenta : ''}</td>
      <td>${Utils.esc(m.cliente || '—')}${m.folioCredito ? '<br>Crédito ' + Utils.esc(m.folioCredito) : ''}</td>
      <td>${Utils.esc(m.usuario || '')}</td><td>${m.cancelado ? 'CANCELADO' : 'VIGENTE'}</td>
      <td class="amount">${Utils.formatMonto(m.monto || 0)}</td></tr>`).join('')
      : '<tr><td colspan="7" class="empty">No hay movimientos registrados para el periodo de este corte.</td></tr>';
    const total = movimientos.filter(m => !m.cancelado).reduce((s, m) =>
      s + ((m.tipo === 'EGRESO') ? -1 : 1) * (Number(m.monto) || 0), 0);
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Movimientos del corte #${corte.idCorte}</title>
      <style>@page{size:landscape;margin:12mm}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#000}h1{font-size:20px;margin:0 0 6px}p{margin:3px 0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #333;padding:6px;text-align:left;vertical-align:top}th{background:#eee}.amount{text-align:right;white-space:nowrap}.empty{text-align:center;padding:20px}.total{text-align:right;font-weight:bold;margin-top:10px}@media print{th{background:#fff}}</style>
      </head><body><h1>Movimientos del corte #${corte.idCorte}</h1>
      <p><strong>Caja:</strong> ${Utils.esc(corte.cajaNombre || '')} &nbsp; <strong>Sucursal:</strong> ${Utils.esc(corte.sucursalNombre || '')}</p>
      <p><strong>Periodo:</strong> ${Utils.esc(Utils.formatDateTime(corte.fechaApertura))} — ${Utils.esc(Utils.formatDateTime(corte.fechaCierre))}</p>
      <p><strong>Responsable:</strong> ${Utils.esc(corte.usuario || '')}</p>
      <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Cliente / crédito</th><th>Usuario</th><th>Estado</th><th>Monto</th></tr></thead><tbody>${filas}</tbody></table>
      <div class="total">Neto de movimientos vigentes: ${Utils.formatMonto(total)}</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 350);
  } catch (err) {
    printWindow.close();
    Utils.showToast('No se pudo generar el reporte: ' + err.message, 'error');
  }
}

function reimprimirCorte(formato = 'carta') {
  const corte = state.currentCorte;
  if (!corte) return;

  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  const es80mm = formato === '80mm';
  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Corte de Caja #${corte.idCorte || ''}</title>
  <style>
    @page { size: ${es80mm ? '80mm auto' : 'letter'}; margin: ${es80mm ? '0' : '0.5in'}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: ${es80mm ? '8px' : '12px'}; color: #000; padding: ${es80mm ? '2mm' : '20px'}; ${es80mm ? 'width:72mm;max-width:72mm;' : ''} }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: ${es80mm ? '14px' : '20px'}; font-weight: bold; letter-spacing: 2px; color: #000; margin-bottom: 2px; }
    .header .sub { font-size: 10px; color: #000; }
    .header .logo { max-height: 72px; max-width: 340px; margin-bottom: 4px; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .info-table { width: 100%; font-size: 11px; margin-bottom: 8px; }
    .info-table td { padding: 2px 4px; }
    .info-table td:last-child { text-align: right; }
    .section-title { font-size: 13px; font-weight: bold; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: ${es80mm ? '8px' : '12px'}; }
    .data-table td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
    .data-table td:last-child { text-align: right; font-weight: 600; }
    .data-table .total-row td { font-size: 14px; font-weight: bold; border-top: 2px solid #000; border-bottom: none; padding-top: 8px; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #000; }
    .firmas-entrega { margin-top: 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align:center; font-size: ${es80mm ? '7px' : '10px'}; }
    .firma-linea { border-top:1px solid #000; padding-top:4px; margin-top:24px; }
    body, body * { color:#000 !important; background:#fff !important; border-color:#000 !important; box-shadow:none !important; }
  </style>
</head>
<body>
  <div class="header">
    <img src="assets/imgs/logotex.png" class="logo" alt="" onerror="this.remove()">
    <div class="sub">Corte de Caja</div>
  </div>
  <div class="divider"></div>
  <table class="info-table">
    <tr><td><strong>Corte #</strong></td><td>${corte.idCorte || '-'}</td></tr>
    <tr><td><strong>Fecha de Corte</strong></td><td>${fechaStr}</td></tr>
    <tr><td><strong>Hora</strong></td><td>${horaStr}</td></tr>
    <tr><td><strong>Caja</strong></td><td>${Utils.esc(corte.cajaNombre || '')}</td></tr>
    <tr><td><strong>Sucursal</strong></td><td>${Utils.esc(corte.sucursalNombre || '')}</td></tr>
    <tr><td><strong>Entregado por</strong></td><td>${Utils.esc(corte.usuario || '')}</td></tr>
    <tr><td><strong>Recibido por</strong></td><td>${Utils.esc(corte.recibidoPor || 'PENDIENTE')}</td></tr>
    <tr><td><strong>Apertura</strong></td><td>${corte.fechaApertura ? new Date(corte.fechaApertura).toLocaleString('es-MX') : '-'}</td></tr>
    <tr><td><strong>Cierre</strong></td><td>${corte.fechaCierre ? new Date(corte.fechaCierre).toLocaleString('es-MX') : now.toLocaleString('es-MX')}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="section-title">Resumen del Corte</div>
  <table class="data-table">
    <tr><td>Saldo Inicial</td><td>${Utils.formatMonto(corte.saldoInicial || 0)}</td></tr>
    <tr><td>Total Ventas</td><td>${Utils.formatMonto(corte.totalVentas || 0)}</td></tr>
    <tr><td style="padding-left:20px">Ventas Contado</td><td>${Utils.formatMonto(corte.totalVentasContado || 0)}</td></tr>
    <tr><td style="padding-left:20px">Ventas Cr\u00e9dito</td><td>${Utils.formatMonto(corte.totalVentasCredito || 0)}</td></tr>
    <tr><td>Total Ingresos</td><td style="color:#059669">+${Utils.formatMonto(corte.totalIngresos || 0)}</td></tr>
    <tr><td>Total Egresos</td><td style="color:#dc2626">-${Utils.formatMonto(corte.totalEgresos || 0)}</td></tr>
    <tr><td>Abonos (Cr\u00e9ditos)</td><td style="color:#0891b2">+${Utils.formatMonto(corte.totalAbonos || 0)}</td></tr>
    <tr class="total-row"><td>Saldo Final</td><td>${Utils.formatMonto(corte.saldoFinalContado || 0)}</td></tr>
  </table>
  ${corte.detallePagos && corte.detallePagos.length > 0 ? `
  <div class="divider"></div>
  <div class="section-title">Desglose por Forma de Pago</div>
  <table class="data-table" style="font-size:11px">
    <tr style="font-weight:bold;border-bottom:1px solid #000">
      <td style="width:40%">M\u00e9todo</td>
      <td style="width:20%;text-align:center">Sistema</td>
      <td style="width:20%;text-align:center">Real</td>
      <td style="width:20%;text-align:center">Diferencia</td>
    </tr>
    ${corte.detallePagos.map(d => {
      const diff = (d.montoReal != null) ? (d.montoReal - (d.monto || 0)) : null;
      const diffStr = diff != null ? ((diff >= 0 ? '+' : '') + Utils.formatMonto(diff)) : 'Sin conteo';
      return `
    <tr>
      <td>${Utils.esc(d.tipoPagoNombre || '')}</td>
      <td style="text-align:center">${Utils.formatMonto(d.monto || 0)}</td>
      <td style="text-align:center">${d.montoReal != null ? Utils.formatMonto(d.montoReal) : '-'}</td>
      <td style="text-align:center">${diffStr}</td>
    </tr>`;
    }).join('')}
    <tr style="font-weight:bold;border-top:2px solid #000;border-bottom:none">
      <td style="padding-top:6px">Total</td>
      <td style="text-align:center;padding-top:6px">${Utils.formatMonto(corte.detallePagos.reduce((s, d) => s + (d.monto || 0), 0))}</td>
      <td style="text-align:center;padding-top:6px">${corte.totalReal != null ? Utils.formatMonto(corte.totalReal) : '-'}</td>
      <td style="text-align:center;padding-top:6px">${corte.diferencia != null ? ((corte.diferencia >= 0 ? '+' : '') + Utils.formatMonto(corte.diferencia)) : '-'}</td>
    </tr>
  </table>` : ''}
  <div class="divider"></div>
  <div class="section-title">Entrega y recepción</div>
  <div class="firmas-entrega">
    <div><div class="firma-linea">Entregado por<br>${Utils.esc(corte.usuario || '')}</div></div>
    <div><div class="firma-linea">Recibido por<br>${Utils.esc(corte.recibidoPor || 'PENDIENTE')}</div></div>
  </div>
  ${corte.abonos && corte.abonos.length > 0 ? `
  <div class="divider"></div>
  <div class="section-title">Abonos por Cr\u00e9dito</div>
  <table class="data-table" style="font-size:11px">
    <tr style="font-weight:bold;border-bottom:1px solid #000">
      <td style="width:15%">Folio</td>
      <td style="width:30%">Cliente</td>
      <td style="width:25%">Fecha</td>
      <td style="width:15%">Tipo Pago</td>
      <td style="width:15%;text-align:center">Monto</td>
    </tr>
    ${corte.abonos.map(a => `
    <tr>
      <td>${Utils.esc(a.folioCredito || '-')}</td>
      <td>${Utils.esc(a.cliente || '')}</td>
      <td>${a.fecha ? new Date(a.fecha).toLocaleString('es-MX') : '-'}</td>
      <td>${Utils.esc(a.tipoPago || '')}</td>
      <td style="text-align:center">${Utils.formatMonto(a.monto || 0)}</td>
    </tr>`).join('')}
  </table>` : ''}
  <div class="footer">
    <p>--- Fin del Corte ---</p>
    <p>${fechaStr} ${horaStr}</p>
  </div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
}

async function saveCorteRealCounts() {
  const corte = state.currentCorte;
  if (!corte) return;
  const inputs = document.querySelectorAll('#corteDetalleTable .corte-real-input');
  const pagos = [];
  inputs.forEach(inp => {
    pagos.push({ idTipoPago: parseInt(inp.dataset.id), montoReal: parseFloat(inp.value) || 0 });
  });
  try {
    await API.put('/cortes/' + corte.idCorte + '/detalle-pagos', { pagos });
    Utils.showToast('Conteo real guardado', 'success');
    state.currentCorte = await API.get('/cortes/' + corte.idCorte);
    bootstrap.Modal.getInstance(document.getElementById('corteDetailModal'))?.hide();
    if (state.totalPages > 0) buscar(state.page);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container) return;
  if (state.totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += `<li class="page-item ${state.page === 0 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${state.page - 1}"><i class="fas fa-chevron-left"></i></a></li>`;

  for (let i = 0; i < state.totalPages; i++) {
    if (i === 0 || i === state.totalPages - 1 || (i >= state.page - 2 && i <= state.page + 2)) {
      html += `<li class="page-item ${i === state.page ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.page - 3 || i === state.page + 3) {
      html += '<li class="page-item disabled"><a class="page-link" href="#">...</a></li>';
    }
  }

  html += `<li class="page-item ${state.page === state.totalPages - 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${state.page + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const p = parseInt(el.dataset.page);
      if (p >= 0 && p < state.totalPages) buscar(p);
    });
  });
}
