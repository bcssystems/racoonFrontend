let state = { pendientes: [], filtroEstado: 'SOLICITADA_CANCELACION' };

export function init() {
  if (!Utils.hasPermiso('AUTORIZACIONES_VER') && !Utils.hasPermiso('CANCELACIONES_VER')) {
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
    const qs = state.filtroEstado ? '?estado=' + encodeURIComponent(state.filtroEstado) + '&size=200' : '?size=200';
    const res = await API.get('/ventas' + qs);
    state.pendientes = res.content || res || [];
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

  const puedeGenerar = Utils.hasPermiso('VENTAS_CANCELAR') || Utils.hasPermiso('CANCELACIONES_AUTORIZAR');

  body.innerHTML = state.pendientes.map(v => {
    const pendiente = v.estado === 'SOLICITADA_CANCELACION';
    const badge = {
      'SOLICITADA_CANCELACION': '<span class="badge-status badge-warning">Espera c\u00f3digo</span>',
      'CANCELADA': '<span class="badge-status badge-inactive">Cancelada</span>',
      'COMPLETADA': '<span class="badge-status badge-active">Completada</span>'
    }[v.estado] || Utils.esc(v.estado);

    let acciones = '<span class="text-muted small">-</span>';
    if (pendiente && puedeGenerar) {
      acciones = '<button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + v.idVenta + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>';
    }

    return '<tr' + (pendiente ? ' class="table-row-warning"' : '') + '>' +
      '<td><span class="badge-status badge-warning">#' + v.idVenta + '</span></td>' +
      '<td>' + Utils.esc(v.sucursalNombre || '') + '</td>' +
      '<td>' + Utils.esc(v.cajaNombre || '') + '</td>' +
      '<td>' + (v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador') + '</td>' +
      '<td class="fw-semibold">' + Utils.formatMonto(v.total || 0) + '</td>' +
      '<td>' + Utils.esc(v.solicitanteCancelacion || '-') + '</td>' +
      '<td style="max-width:220px">' + Utils.esc(v.motivoCancelacion || '-') + '</td>' +
      '<td>' + Utils.formatDateTime(v.fechaSolicitudCancelacion) + '</td>' +
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
  const items = [
    { icon: 'fa-key', text: 'Generar c\u00f3digo', color: 'var(--primary)', onClick: () => generarCodigo(id) },
    { icon: 'fa-undo', text: 'Rechazar solicitud', color: 'var(--warning)', onClick: () => rechazar(id) },
  ];
  Utils.abrirMenuKebab(kebab, items);
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