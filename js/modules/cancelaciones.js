let state = { pendientes: [], historial: [], historialTabCargado: false };

export function init() {
  if (!Utils.hasPermiso('CANCELACIONES_VER')) {
    const body = document.getElementById('cancelacionesBody');
    if (body) {
      body.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-lock"></i><p>Acceso restringido.</p></div></td></tr>';
    }
    return;
  }
  bindEvents();
  cargarPendientes();
}

function bindEvents() {
  document.getElementById('cancelacionesBody')?.addEventListener('click', handleTableClick);
  document.getElementById('cancelHistorialBody')?.addEventListener('click', handleHistorialClick);

  document.querySelectorAll('#cancelTabs button[data-bs-toggle="tab"]').forEach(btn => {
    btn.addEventListener('shown.bs.tab', () => {
      const target = btn.getAttribute('data-bs-target');
      if (target === '#cancelHistorialTab' && !state.historialTabCargado) {
        state.historialTabCargado = true;
        cargarHistorial();
      }
    });
  });

  const busqueda = document.getElementById('historialBusqueda');
  if (busqueda) {
    busqueda.addEventListener('input', Utils.debounce(() => {
      const q = busqueda.value.trim().toLowerCase();
      renderHistorial(state.historial.filter(v =>
        !q || String(v.idVenta).includes(q)
          || (v.clienteNombre || '').toLowerCase().includes(q)
          || (v.sucursalNombre || '').toLowerCase().includes(q)
      ));
    }, 300));
  }
  document.getElementById('btnExportHistorial')?.addEventListener('click', exportarHistorial);
}

async function cargarPendientes() {
  const body = document.getElementById('cancelacionesBody');
  if (!body) return;
  try {
    const res = await API.get('/ventas?estado=SOLICITADA_CANCELACION&size=200');
    state.pendientes = res.content || res || [];
    renderTable();
  } catch (err) {
    state.pendientes = [];
    renderTable();
  }
}

function renderTable() {
  const body = document.getElementById('cancelacionesBody');
  document.getElementById('cancelStatsRow')?.classList.remove('d-none');
  const pendientes = (document.getElementById('cancelStatsPendientes'));
  if (pendientes) pendientes.textContent = state.pendientes.length;

  let monto = 0, contado = 0, credito = 0;
  state.pendientes.forEach(v => {
    monto += v.total || 0;
    if (v.tipoVenta === 'CREDITO') credito++;
    else contado++;
  });
  const elMonto = document.getElementById('cancelStatsMonto');
  if (elMonto) elMonto.textContent = Utils.formatMonto(monto);
  const elContado = document.getElementById('cancelStatsContado');
  if (elContado) elContado.textContent = contado;
  const elCredito = document.getElementById('cancelStatsCredito');
  if (elCredito) elCredito.textContent = credito;

  if (!state.pendientes.length) {
    body.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-check-double"></i><p>Sin solicitudes de cancelaci&oacute;n pendientes</p></div></td></tr>';
    return;
  }

  body.innerHTML = state.pendientes.map(v => `<tr>
    <td><span class="badge-status badge-warning">#${v.idVenta}</span></td>
    <td>${Utils.esc(v.sucursalNombre || '')}</td>
    <td>${Utils.esc(v.cajaNombre || '')}</td>
    <td>${v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador'}</td>
    <td class="fw-semibold">${Utils.formatMonto(v.total || 0)}</td>
    <td><span class="badge ${v.tipoVenta === 'CREDITO' ? 'bg-info text-dark' : 'bg-secondary'}">${v.tipoVenta === 'CREDITO' ? 'Cr\u00e9dito' : 'Contado'}</span></td>
    <td>${Utils.esc(v.solicitanteCancelacion || '-')}</td>
    <td style="max-width:220px">${Utils.esc(v.motivoCancelacion || '-')}</td>
    <td>${Utils.formatDateTime(v.fechaSolicitudCancelacion)}</td>
    <td class="acciones-cell">
      <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${v.idVenta}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
    </td>
  </tr>`).join('');
}

async function cargarHistorial() {
  const body = document.getElementById('cancelHistorialBody');
  if (!body) return;
  try {
    const res = await API.get('/ventas?estado=CANCELADA&size=200');
    state.historial = res.content || res || [];
    renderHistorial(state.historial);
  } catch (err) {
    state.historial = [];
    renderHistorial([]);
  }
}

function renderHistorial(list) {
  const body = document.getElementById('cancelHistorialBody');
  if (!list || list.length === 0) {
    body.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-history"></i><p>Sin ventas canceladas</p></div></td></tr>';
    return;
  }
  body.innerHTML = list.map(v => `<tr>
    <td><span class="badge-status badge-inactive">#${v.idVenta}</span></td>
    <td>${Utils.esc(v.sucursalNombre || '')}</td>
    <td>${Utils.esc(v.cajaNombre || '')}</td>
    <td>${v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador'}</td>
    <td class="fw-semibold">${Utils.formatMonto(v.total || 0)}</td>
    <td><span class="badge ${v.tipoVenta === 'CREDITO' ? 'bg-info text-dark' : 'bg-secondary'}">${v.tipoVenta === 'CREDITO' ? 'Cr\u00e9dito' : 'Contado'}</span></td>
    <td>${Utils.esc(v.autorizadorCancelacion || '-')}</td>
    <td style="max-width:220px">${Utils.esc(v.motivoCancelacion || '-')}</td>
    <td>${Utils.formatDateTime(v.fechaAutorizacionCancelacion || v.fechaSolicitudCancelacion)}</td>
    <td class="acciones-cell">
      <button type="button" class="btn btn-sm btn-outline-info btn-action" data-id="${v.idVenta}" data-action="ver" title="Ver detalle"><i class="fas fa-eye"></i></button>
    </td>
  </tr>`).join('');
}

function handleHistorialClick(e) {
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  if (btn.dataset.action === 'ver') verDetalle(id);
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const items = [
      { icon: 'fa-eye', text: 'Ver detalle', color: 'var(--info)', onClick: () => verDetalle(id) },
    ];
    if (Utils.hasPermiso('CANCELACIONES_AUTORIZAR')) {
      items.push({ icon: 'fa-check', text: 'Autorizar cancelaci\u00f3n', color: 'var(--success)', onClick: () => autorizar(id) });
      items.push({ icon: 'fa-undo', text: 'Rechazar solicitud', color: 'var(--warning)', onClick: () => rechazar(id) });
    }
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'ver') verDetalle(id);
  else if (action === 'autorizar') autorizar(id);
  else if (action === 'rechazar') rechazar(id);
}

async function verDetalle(id) {
  try {
    const venta = await API.get('/ventas/' + id);
    const detalles = (venta.detalles || []).map(d =>
      '<tr><td>' + Utils.esc(d.productoNombre || d.descripcion || 'Producto') + '</td><td class="text-center">' + d.cantidad +
      '</td><td>' + Utils.formatMonto(d.precioUnitario || 0) + '</td><td>' + Utils.formatMonto(d.subtotal || 0) + '</td></tr>'
    ).join('');
    const estadoBadge = venta.estado === 'CANCELADA'
      ? '<span class="badge-status badge-inactive">Cancelada</span>'
      : '<span class="badge-status badge-warning">Solicitud pendiente</span>';
    const bodyHtml =
      '<div class="small mb-3 p-2 bg-light rounded"><div class="row g-2">' +
        '<div class="col-6"><strong>Caja:</strong> ' + Utils.esc(venta.cajaNombre || '') + '</div>' +
        '<div class="col-6"><strong>Cliente:</strong> ' + (venta.clienteNombre ? Utils.esc(venta.clienteNombre) : 'Mostrador') + '</div>' +
        '<div class="col-6"><strong>Total:</strong> <span class="fw-bold" style="color:var(--primary)">' + Utils.formatMonto(venta.total || 0) + '</span></div>' +
        '<div class="col-6"><strong>Tipo:</strong> ' + venta.tipoVenta + ' ' + estadoBadge + '</div>' +
        '<div class="col-12"><strong>Motivo:</strong> ' + Utils.esc(venta.motivoCancelacion || '-') +
          ' <small class="text-muted">(solicitado por ' + Utils.esc(venta.solicitanteCancelacion || '-') + ' el ' + Utils.formatDateTime(venta.fechaSolicitudCancelacion) + ')</small></div>' +
        (venta.estado === 'CANCELADA'
          ? '<div class="col-12"><small class="text-muted">Autorizado por ' + Utils.esc(venta.autorizadorCancelacion || '-') + ' el ' + Utils.formatDateTime(venta.fechaAutorizacionCancelacion) + '</small></div>'
          : '') +
      '</div></div>' +
      '<div class="table-responsive"><table class="table table-sm table-custom mb-0"><thead><tr><th>Producto</th><th>Cant</th><th>P/U</th><th>Subtotal</th></tr></thead>' +
      '<tbody>' + (detalles || '<tr><td colspan="4" class="text-muted">Sin detalles</td></tr>') + '</tbody></table></div>';
    Utils.showDialog('Detalle de Venta #' + id, bodyHtml);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function exportarHistorial() {
  const list = state.historial;
  if (!list || list.length === 0) { Utils.showToast('No hay ventas canceladas para exportar', 'warning'); return; }
  const fecha = new Date().toISOString().slice(0, 10);
  const headers = ['ID', 'Sucursal', 'Caja', 'Cliente', 'Total', 'Tipo', 'Autorizo', 'Motivo', 'Fecha cancelacion'];
  const rows = list.map(v => [
    v.idVenta,
    v.sucursalNombre || '',
    v.cajaNombre || '',
    v.clienteNombre || 'Mostrador',
    (v.total || 0).toFixed(2),
    v.tipoVenta,
    v.autorizadorCancelacion || '',
    v.motivoCancelacion || '',
    Utils.formatDateTime(v.fechaAutorizacionCancelacion || v.fechaSolicitudCancelacion)
  ]);
  Utils.downloadXls('historial-cancelaciones_' + fecha + '.xls', 'Cancelaciones', headers, rows);
}

async function autorizar(id) {
  const ok = await Utils.confirm('Autorizar la cancelaci&oacute;n de la venta #' + id + '? Se revertir&aacute; el stock, el saldo de la caja y el cr&eacute;dito en su caso.', 'Autorizar cancelaci&oacute;n');
  if (!ok) return;
  try {
    await API.post('/ventas/' + id + '/cancelar', {});
    Utils.showToast('Venta #' + id + ' cancelada exitosamente', 'success');
    cargarPendientes();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function rechazar(id) {
  const ok = await Utils.confirm('Rechazar la solicitud de cancelaci&oacute;n de la venta #' + id + '? La venta queda como completada.', 'Rechazar solicitud');
  if (!ok) return;
  try {
    await API.post('/ventas/' + id + '/rechazar-cancelacion');
    Utils.showToast('Solicitud rechazada. Venta #' + id + ' sigue completada', 'success');
    cargarPendientes();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}