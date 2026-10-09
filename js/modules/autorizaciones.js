let state = { pendientes: [], filtroEstado: '' };

export function init() {
  if (!Utils.hasPermiso('AUTORIZACIONES_VER') && !Utils.hasPermiso('CANCELACIONES_VER') && !Utils.hasPermiso('MOVIMIENTOS_INVENTARIO_VER')) {
    const body = document.getElementById('autorizacionesBody');
    if (body) body.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-lock"></i><p>Acceso restringido.</p></div></td></tr>';
    return;
  }
  bindEvents();
  cargar();
}

function bindEvents() {
  document.getElementById('autorizacionesBody')?.addEventListener('click', handleTableClick);
  document.getElementById('filterAutEstado')?.addEventListener('change', () => {
    state.filtroEstado = document.getElementById('filterAutEstado').value;
    cargar();
  });
}

async function cargar() {
  const body = document.getElementById('autorizacionesBody');
  if (!body) return;
  try {
    const [ventasRes, movimientosRes] = await Promise.all([
      API.get('/ventas?size=200'),
      API.get('/kardex/pendientes?size=200'),
    ]);
    const ventas = (ventasRes.content || ventasRes || []).map(v => ({ ...v, _tipoSolicitud: 'VENTA' }));
    const movimientos = (movimientosRes.content || movimientosRes || []).map(m => ({ ...m, _tipoSolicitud: 'MOVIMIENTO' }));
    state.pendientes = ventas.concat(movimientos).filter(item => {
      if (!state.filtroEstado) return true;
      return item._tipoSolicitud === 'VENTA'
        ? state.filtroEstado === 'SOLICITADA_CANCELACION' && item.estado === 'SOLICITADA_CANCELACION'
        : state.filtroEstado === 'PENDIENTE';
    });
    state.pendientes.sort((a, b) => new Date(b.fechaSolicitudCancelacion || b.fechaMovimiento || 0) - new Date(a.fechaSolicitudCancelacion || a.fechaMovimiento || 0));
    render();
  } catch (err) {
    state.pendientes = [];
    render();
  }
}

function render() {
  const body = document.getElementById('autorizacionesBody');
  if (!state.pendientes.length) {
    body.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-check-double"></i><p>Sin autorizaciones pendientes</p></div></td></tr>';
    return;
  }

  const puedeGenerarVenta = Utils.hasPermiso('VENTAS_CANCELAR') || Utils.hasPermiso('CANCELACIONES_AUTORIZAR');
  const puedeGenerarMovimiento = Utils.hasPermiso('PRODUCTOS_MOVIMIENTO_AUTORIZAR');
  const puedeAutorizarMovimiento = Utils.hasPermiso('PRODUCTOS_MOVIMIENTO');

  body.innerHTML = state.pendientes.map(v => {
    const esMovimiento = v._tipoSolicitud === 'MOVIMIENTO';
    const pendiente = v.estado === (esMovimiento ? 'PENDIENTE' : 'SOLICITADA_CANCELACION');
    const badge = {
      'SOLICITADA_CANCELACION': '<span class="badge-status badge-warning">Espera c\u00f3digo</span>',
      'PENDIENTE': '<span class="badge-status badge-warning">Espera c\u00f3digo</span>',
      'CANCELADA': '<span class="badge-status badge-inactive">Cancelada</span>',
      'COMPLETADA': '<span class="badge-status badge-active">Completada</span>'
    }[v.estado] || Utils.esc(v.estado);

    let acciones = '<span class="text-muted small">-</span>';
    if (pendiente && ((esMovimiento && (puedeGenerarMovimiento || puedeAutorizarMovimiento)) || (!esMovimiento && puedeGenerarVenta))) {
      acciones = '<button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + (esMovimiento ? v.idMovimiento : v.idVenta) + '" data-tipo="' + v._tipoSolicitud + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>';
    }

    return '<tr' + (pendiente ? ' class="table-row-warning"' : '') + '>' +
      '<td><span class="badge-status badge-warning">#' + (esMovimiento ? v.idMovimiento : v.idVenta) + '</span></td>' +
      '<td>' + (esMovimiento ? 'Movimiento' : 'Cancelación') + '</td>' +
      '<td>' + Utils.esc(v.sucursalNombre || 'Global') + '</td>' +
      '<td>' + (esMovimiento ? Utils.esc(v.productoSku + ' - ' + v.productoNombre) : (v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador')) + '</td>' +
      '<td class="fw-semibold">' + (esMovimiento ? v.cantidad : Utils.formatMonto(v.total || 0)) + '</td>' +
      '<td>' + Utils.esc(esMovimiento ? (v.usuario || '-') : (v.solicitanteCancelacion || '-')) + '</td>' +
      '<td style="max-width:220px">' + Utils.esc(esMovimiento ? (v.observacion || v.referencia || '-') : (v.motivoCancelacion || '-')) + '</td>' +
      '<td>' + Utils.formatDateTime(esMovimiento ? v.fechaMovimiento : v.fechaSolicitudCancelacion) + '</td>' +
      '<td>' + badge + '</td>' +
      '<td class="acciones-cell">' + acciones + '</td>' +
    '</tr>';
  }).join('');
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (!kebab) return;
  e.preventDefault();
  const id = parseInt(kebab.dataset.id);
  const tipo = kebab.dataset.tipo;
  if (tipo === 'MOVIMIENTO') {
    const items = [];
    if (Utils.hasPermiso('PRODUCTOS_MOVIMIENTO_AUTORIZAR')) {
      items.push({ icon: 'fa-key', text: 'Generar código', color: 'var(--primary)', onClick: () => generarCodigoMovimiento(id) });
      items.push({ danger: true, icon: 'fa-times', text: 'Rechazar movimiento', onClick: () => rechazarMovimiento(id) });
    } else if (Utils.hasPermiso('PRODUCTOS_MOVIMIENTO')) {
      items.push({ icon: 'fa-key', text: 'Autorizar con código', color: 'var(--primary)', onClick: () => autorizarMovimiento(id) });
    }
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const items = [
    { icon: 'fa-key', text: 'Generar c\u00f3digo', color: 'var(--primary)', onClick: () => generarCodigo(id) },
    { icon: 'fa-undo', text: 'Rechazar solicitud', color: 'var(--warning)', onClick: () => rechazar(id) },
  ];
  Utils.abrirMenuKebab(kebab, items);
}

async function generarCodigoMovimiento(id) {
  try {
    const resp = await API.post('/productos/movimientos/' + id + '/generar-codigo');
    document.getElementById('modalCodigoVenta').textContent = 'Movimiento #' + resp.idMovimiento;
    document.getElementById('modalCodigoValor').textContent = resp.codigo;
    document.getElementById('modalCodigoExpira').textContent = 'Expira a las ' + new Date(resp.expiraEn).toLocaleTimeString();
    new bootstrap.Modal(document.getElementById('modalCodigoAutorizacion')).show();
    await cargar();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function autorizarMovimiento(id) {
  try {
    const codigo = await Utils.promptInput('Autorizar movimiento #' + id, 'Ingresa el código generado por el administrador:');
    if (!codigo) return;
    await API.post('/productos/movimientos/' + id + '/aprobar', { codigoAutorizacion: codigo.trim() });
    Utils.showToast('Movimiento autorizado', 'success');
    await cargar();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function rechazarMovimiento(id) {
  if (!await Utils.confirm('¿Rechazar el movimiento #' + id + '?', 'Rechazar movimiento')) return;
  try {
    await API.post('/productos/movimientos/' + id + '/rechazar', {});
    Utils.showToast('Movimiento rechazado', 'success');
    await cargar();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function generarCodigo(id) {
  const frag = '<p class="small text-muted">Se generar\u00e1 un c\u00f3digo de 4 d\u00edgitos v\u00e1lido por 10 minutos para que el cajero autorice la cancelaci\u00f3n de la venta #' + id + '.</p>';
  const ok = await Utils.confirm(frag, 'Generar c\u00f3digo de autorizaci\u00f3n');
  if (!ok) return;
  try {
    const resp = await API.post('/ventas/' + id + '/generar-codigo');
    document.getElementById('modalCodigoVenta').textContent = 'Venta #' + resp.idVenta;
    document.getElementById('modalCodigoValor').textContent = resp.codigo;
    document.getElementById('modalCodigoExpira').textContent = 'Expira a las ' + new Date(resp.expiraEn).toLocaleTimeString();
    new bootstrap.Modal(document.getElementById('modalCodigoAutorizacion')).show();
    await cargar();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function rechazar(id) {
  const ok = await Utils.confirm('Rechazar la solicitud de cancelaci\u00f3n de la venta #' + id + '? La venta queda como completada.', 'Rechazar solicitud');
  if (!ok) return;
  try {
    await API.post('/ventas/' + id + '/rechazar-cancelacion');
    Utils.showToast('Solicitud rechazada. Venta #' + id + ' sigue completada', 'success');
    await cargar();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
