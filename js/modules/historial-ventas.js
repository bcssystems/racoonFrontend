import { printRemisionVenta } from './printing.js';

let state = {
  page: 0,
  totalPages: 0,
  size: 15,
};

export function init() {
  const today = new Date().toISOString().slice(0, 10);
  const desdeEl = document.getElementById('filterDesde');
  const hastaEl = document.getElementById('filterHasta');
  if (desdeEl) desdeEl.value = today;
  if (hastaEl) hastaEl.value = today;
  bindEvents();
  cargarSucursales();
  buscar(0);
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
  document.getElementById('tableBody')?.addEventListener('click', (e) => {
    const kebab = e.target.closest('.kebab-trigger');
    if (kebab) {
      e.preventDefault();
      abrirAccionesVenta(kebab, parseInt(kebab.dataset.venta), kebab.dataset.estado);
      return;
    }
    const detalle = e.target.closest('[data-detalle]');
    if (detalle) { e.preventDefault(); verDetalle(parseInt(detalle.dataset.detalle)); return; }
    const factura = e.target.closest('[data-factura]');
    if (factura) { e.preventDefault(); imprimirRemision(parseInt(factura.dataset.factura)); return; }
    const cancelar = e.target.closest('[data-cancelar]');
    if (cancelar) { e.preventDefault(); solicitarCancelacion(parseInt(cancelar.dataset.cancelar)); return; }
    const aprobar = e.target.closest('[data-aprobar]');
    if (aprobar) { e.preventDefault(); autorizarCancelacion(parseInt(aprobar.dataset.aprobar)); return; }
    const rechazar = e.target.closest('[data-rechazar]');
    if (rechazar) { e.preventDefault(); rechazarCancelacion(parseInt(rechazar.dataset.rechazar)); return; }
  });
}

function abrirAccionesVenta(anchor, id, estado) {
  const items = [
    { icon: 'fa-eye', text: 'Ver detalle', color: 'var(--primary)', onClick: () => verDetalle(id) },
    { icon: 'fa-print', text: 'Imprimir remisi\u00f3n', color: 'var(--success)', onClick: () => imprimirRemision(id) },
  ];
  if (estado === 'COMPLETADA') {
    if (Utils.hasPermiso('VENTAS_CREAR')) {
      items.push({ danger: true, icon: 'fa-ban', text: 'Solicitar cancelaci\u00f3n', onClick: () => solicitarCancelacion(id) });
    }
  } else if (estado === 'SOLICITADA_CANCELACION') {
    if (Utils.hasPermiso('VENTAS_CANCELAR') || Utils.hasPermiso('CANCELACIONES_AUTORIZAR')) {
      items.push({ icon: 'fa-check', text: 'Autorizar cancelaci\u00f3n', color: 'var(--success)', onClick: () => autorizarCancelacion(id) });
      items.push({ icon: 'fa-undo', text: 'Rechazar cancelaci\u00f3n', color: 'var(--warning)', onClick: () => rechazarCancelacion(id) });
    }
  }
  Utils.abrirMenuKebab(anchor, items);
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
  document.getElementById('filterEstado').value = '';
  document.getElementById('filterDesde').value = '';
  document.getElementById('filterHasta').value = '';
  document.getElementById('statsRow').classList.add('d-none');
  document.getElementById('tableBody').innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-receipt"></i><p>Selecciona filtros y presiona Buscar</p></div></td></tr>';
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
  const estado = document.getElementById('filterEstado').value;
  const desde = document.getElementById('filterDesde').value;
  const hasta = document.getElementById('filterHasta').value;

  if (idSucursal) params.set('idSucursal', idSucursal);
  if (idCaja) params.set('idCaja', idCaja);
  if (estado) params.set('estado', estado);
  if (desde) params.set('fechaInicio', desde + 'T00:00:00');
  if (hasta) params.set('fechaFin', hasta + 'T23:59:59');

  body.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Buscando...</p></div></td></tr>';

  try {
    const result = await API.get('/ventas?' + params.toString());
    const ventas = result.content || [];
    state.totalPages = result.totalPages;

    if (ventas.length === 0) {
      body.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-receipt"></i><p>Sin resultados</p></div></td></tr>';
      document.getElementById('statsRow').classList.add('d-none');
    } else {
      let totalMonto = 0, completadas = 0, canceladas = 0, pendientes = 0;
      body.innerHTML = ventas.map(v => {
        totalMonto += v.total || 0;
        if (v.estado === 'COMPLETADA') completadas++;
        else if (v.estado === 'CANCELADA') canceladas++;
        else if (v.estado === 'SOLICITADA_CANCELACION') pendientes++;

        const estadoBadge = v.estado === 'COMPLETADA' ? 'bg-success'
          : v.estado === 'CANCELADA' ? 'bg-danger'
          : v.estado === 'SOLICITADA_CANCELACION' ? 'bg-warning text-dark'
          : 'bg-secondary';

        let acciones = `
          <button type="button" class="btn-kebab-toggle kebab-trigger" data-venta="${v.idVenta}" data-estado="${v.estado}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>`;

        return `<tr class="${v.estado === 'CANCELADA' ? 'text-muted' : ''}">
          <td>${v.idVenta}</td>
          <td>${Utils.esc(v.sucursalNombre || '')}</td>
          <td>${Utils.esc(v.cajaNombre || '')}</td>
          <td>${v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador'}</td>
          <td class="fw-semibold">${Utils.formatMonto(v.total || 0)}</td>
          <td><span class="badge ${estadoBadge}">${v.estado}</span></td>
          <td>${Utils.formatDateTime(v.fecha)}</td>
          <td class="acciones-cell">${acciones}</td>
        </tr>`;
      }).join('');

      document.getElementById('statsCount').textContent = ventas.length;
      document.getElementById('statsTotal').textContent = Utils.formatMonto(totalMonto);
      document.getElementById('statsCompletadas').textContent = completadas;
      document.getElementById('statsCanceladas').textContent = canceladas;
      document.getElementById('statsRow').classList.remove('d-none');
    }

    renderPagination();
  } catch (_) {
    body.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error al consultar</p></div></td></tr>';
  }
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

async function solicitarCancelacion(id) {
  const motivo = await Utils.promptInput('Motivo de la cancelaci\u00f3n', 'Escribe el motivo...');
  if (!motivo) return;
  try {
    await API.post('/ventas/' + id + '/solicitar-cancelacion', { motivo });
    Utils.showToast('Solicitud enviada. Espera autorizaci\u00f3n del administrador', 'success');
    buscar(state.page);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function autorizarCancelacion(id) {
  const ok = await Utils.confirm('Autorizar la cancelaci\u00f3n de la venta #' + id + '? Se revertir\u00e1 el stock.');
  if (!ok) return;
  try {
    await API.post('/ventas/' + id + '/cancelar', {});
    Utils.showToast('Venta cancelada exitosamente', 'success');
    buscar(state.page);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function rechazarCancelacion(id) {
  const ok = await Utils.confirm('Rechazar la solicitud de cancelaci\u00f3n del cliente #' + id + '? La venta queda completada.');
  if (!ok) return;
  try {
    await API.post('/ventas/' + id + '/rechazar-cancelacion');
    Utils.showToast('Solicitud rechazada', 'success');
    buscar(state.page);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function imprimirRemision(id) {
  try {
    const venta = await API.get('/ventas/' + id);
    imprimirTicket(venta);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function imprimirTicket(venta) {
  let configs = {};
  let clienteInfo = null;
  (async () => {
    try {
      const list = await API.get('/configuraciones');
      (list || []).forEach(c => { configs[c.clave] = c.valor; });
    } catch (_) {}
    if (venta.idCliente) {
      try { clienteInfo = await API.get('/clientes/' + venta.idCliente); } catch (_) {}
    }
    printRemisionVenta(venta, { configs, clienteInfo, copies: 1 });
  })();
}

async function verDetalle(id) {
  try {
    const venta = await API.get('/ventas/' + id);
    const detallesHtml = (venta.detalles || []).map(d => {
      const unidad = (d.unidadMedida || 'UNIDAD').toLowerCase();
      return `<tr>
        <td>${d.productoNombre ? Utils.esc(d.productoNombre) : Utils.esc(d.descripcion || '')}</td>
        <td class="center">${d.cantidad} ${Utils.esc(unidad)}</td>
        <td class="right">${Utils.formatMonto(d.precioUnitario || 0)}</td>
        <td class="right">${Utils.formatMonto(d.subtotal || 0)}</td>
      </tr>`;
    }).join('');

    const estadoBadge = venta.estado === 'COMPLETADA' ? 'bg-success'
        : venta.estado === 'CANCELADA' ? 'bg-danger'
        : venta.estado === 'SOLICITADA_CANCELACION' ? 'bg-warning text-dark'
        : 'bg-secondary';

    const motivoHtml = (venta.motivoCancelacion && (venta.estado === 'SOLICITADA_CANCELACION' || venta.estado === 'CANCELADA'))
      ? `<div class="col-12"><strong>Motivo de cancelaci\u00f3n:</strong> ${Utils.esc(venta.motivoCancelacion)}${venta.solicitanteCancelacion ? ' <small class="text-muted">(solicitado por ' + Utils.esc(venta.solicitanteCancelacion) + ')</small>' : ''}</div>`
      : '';

    document.getElementById('detalleBody').innerHTML =
      `<div class="small mb-3 p-2 bg-light rounded">
        <div class="row g-2">
          <div class="col-4"><strong>Caja:</strong> ${Utils.esc(venta.cajaNombre || '')}</div>
          <div class="col-4"><strong>Cliente:</strong> ${venta.clienteNombre ? Utils.esc(venta.clienteNombre) : 'Mostrador'}</div>
          <div class="col-4"><strong>Total:</strong> <span class="fw-bold" style="color:var(--primary)">${Utils.formatMonto(venta.total || 0)}</span></div>
          <div class="col-4"><strong>Subtotal:</strong> ${Utils.formatMonto(venta.subtotal || 0)}</div>
          <div class="col-4"><strong>Descuento:</strong> ${Utils.formatMonto(venta.descuento || 0)}</div>
          <div class="col-4"><strong>Estado:</strong> <span class="badge ${estadoBadge}">${venta.estado}</span></div>
          ${venta.tipoVenta === 'CREDITO'
            ? `<div class="col-4"><strong>Pagar\u00e9:</strong> ${Utils.esc(venta.folioPagare || '—')}</div>
               <div class="col-4"><strong>Inter\u00e9s:</strong> ${venta.porcentajeInteres || 0}%</div>
               <div class="col-4"><strong>Plazo:</strong> ${venta.plazoMeses != null ? venta.plazoMeses + ' meses' : '—'}</div>`
            : ''}
          ${(venta.pagos || []).length
            ? `<div class="col-12"><strong>Forma de pago:</strong> ${venta.pagos.map(p => Utils.esc(p.tipoPagoNombre || '') + ' ' + Utils.formatMonto(p.monto || 0) + (p.referencia ? ' (' + Utils.esc(p.referencia) + ')' : '')).join(' &middot; ')}</div>`
            : ''}
          ${motivoHtml}
      <table class="table table-sm table-custom mb-0">
        <thead><tr><th>Producto</th><th>Cant</th><th>P/U</th><th>Subtotal</th></tr></thead>
        <tbody>${detallesHtml || '<tr><td colspan="4" class="text-muted">Sin detalles</td></tr>'}</tbody>
      </table>`;

    new bootstrap.Modal(document.getElementById('detalleModal')).show();
  } catch (_) {
    Utils.showToast('Error al cargar detalle', 'error');
  }
}