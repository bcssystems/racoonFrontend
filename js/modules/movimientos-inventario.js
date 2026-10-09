let state = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  pageSize: 20,
  filtros: {
    sucursal: '',
    producto: '',
    fechaInicio: '',
    fechaFin: '',
    tipo: '',
  },
  sucursales: [],
  productos: [],
  guardando: false,
};

export function init() {
  bindEvents();
  cargarSucursales().then(() => {
    cargarProductos();
    cargarMovimientos(0);
  });
}

function bindEvents() {
  document.getElementById('filterMovSucursal')?.addEventListener('change', e => {
    state.filtros.sucursal = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });
  document.getElementById('filterMovProducto')?.addEventListener('change', e => {
    state.filtros.producto = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });
  document.getElementById('filterMovFechaInicio')?.addEventListener('change', e => {
    state.filtros.fechaInicio = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });
  document.getElementById('filterMovFechaFin')?.addEventListener('change', e => {
    state.filtros.fechaFin = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });
  document.getElementById('filterMovTipo')?.addEventListener('change', e => {
    state.filtros.tipo = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });

  if (!Utils.hasPermiso('PRODUCTOS_MOVIMIENTO')) {
    const btn = document.getElementById('btnNuevoMovimiento');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevoMovimiento')?.addEventListener('click', abrirModal);
  document.getElementById('btnConfirmarMovimiento')?.addEventListener('click', registrarMovimiento);
  document.getElementById('btnAgregarLineaMovimiento')?.addEventListener('click', agregarLineaMovimiento);
  document.getElementById('btnExportMovExcel')?.addEventListener('click', exportarExcel);
  document.getElementById('btnExportMovPdf')?.addEventListener('click', exportarPDF);
  document.getElementById('tableMovBody')?.addEventListener('click', handleTableClick);

  document.getElementById('movSucursal')?.addEventListener('change', actualizarStockInfo);
  document.getElementById('paginationMov')?.addEventListener('click', e => {
    const el = e.target.closest('[data-page]');
    if (!el) return;
    e.preventDefault();
    const page = parseInt(el.dataset.page);
    if (page >= 0 && page < state.totalPages) cargarMovimientos(page);
  });
}

async function cargarSucursales() {
  try {
    state.sucursales = await API.get('/sucursales');
    const filtro = document.getElementById('filterMovSucursal');
    const modalSel = document.getElementById('movSucursal');
    const opts = state.sucursales.map(s => '<option value="' + s.idSucursal + '">' + Utils.esc(s.nombre) + '</option>').join('');
    if (filtro) {
      filtro.innerHTML = opts;
      Utils.makeSearchableSelect('filterMovSucursal');
    }
    if (modalSel) {
      modalSel.innerHTML = opts;
      Utils.makeSearchableSelect('movSucursal');
    }
    if (state.sucursales.length === 1) {
      const unica = state.sucursales[0].idSucursal;
      if (filtro && !state.filtros.sucursal) {
        state.filtros.sucursal = String(unica);
        filtro.value = String(unica);
      }
      if (modalSel) modalSel.value = String(unica);
    }
  } catch (_) {}
}

async function cargarProductos() {
  const sel = document.getElementById('filterMovProducto');
  try {
    const result = await API.get('/productos?activo=true&page=0&size=500');
    state.productos = result.content || [];
    const opts = state.productos.map(p =>
      '<option value="' + p.idProducto + '">' + Utils.esc(p.sku + ' - ' + p.nombre) + '</option>'
    ).join('');
    sel.innerHTML = '<option value="">Todos</option>' + opts;
  } catch (err) {
    sel.innerHTML = '<option value="">Todos</option>';
    Utils.showToast(err.message, 'error');
  }
}

async function actualizarStockInfo() {
  const info = document.getElementById('movStockInfo');
  const idSucursal = document.getElementById('movSucursal').value;
  if (!info) return;
  info.textContent = idSucursal ? 'El stock disponible se valida al registrar cada línea.' : '';
}

async function cargarMovimientos(page) {
  state.currentPage = page;
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('size', state.pageSize);

  if (state.filtros.sucursal) params.set('idSucursal', state.filtros.sucursal);
  if (state.filtros.producto) params.set('idProducto', state.filtros.producto);
  if (state.filtros.fechaInicio) params.set('fechaInicio', state.filtros.fechaInicio + 'T00:00:00');
  if (state.filtros.fechaFin) params.set('fechaFin', state.filtros.fechaFin + 'T23:59:59');
  if (state.filtros.tipo) params.set('tipo', state.filtros.tipo);

  try {
    const result = await API.get('/kardex?' + params.toString());
    state.data = result.content;
    state.totalPages = result.totalPages;
    renderTable();
    renderPagination();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('tableMovBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10"><div class="empty-state"><i class="fas fa-arrows-rotate"></i><p>No hay movimientos</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(r => {
    let badgeClass;
    if (r.tipoMovimiento === 'ENTRADA' || r.tipoMovimiento === 'RECEPCION' || r.tipoMovimiento === 'RECEPCION_PEDIDO') {
      badgeClass = 'badge-active';
    } else if (r.tipoMovimiento === 'SALIDA') {
      badgeClass = 'badge-inactive';
    } else if (r.tipoMovimiento === 'AJUSTE') {
      badgeClass = 'badge bg-warning text-dark';
    } else if (r.tipoMovimiento === 'TRANSFERENCIA') {
      badgeClass = 'badge bg-info text-white';
    } else {
      badgeClass = 'badge bg-secondary text-white';
    }

    const stockDisplay = r.stockAnterior != null && r.stockNuevo != null
      ? r.stockAnterior + ' &rarr; ' + r.stockNuevo
      : '-';
    const detalle = r.observacion || (r.tipoMovimiento + ' de ' + r.cantidad + ' unidades');

    return `<tr>
      <td class="text-nowrap">${Utils.formatDateTime(r.fechaMovimiento)}</td>
      <td><span class="${badgeClass}">${Utils.capitalize(r.tipoMovimiento.replace('_', ' '))}</span></td>
      <td><span class="fw-semibold">${Utils.esc(r.productoNombre || '')}</span><br><small class="text-muted">${Utils.esc(r.productoSku || '')}</small></td>
      <td>${Utils.esc(detalle)}</td>
      <td class="fw-semibold">${r.cantidad != null ? r.cantidad : '-'}</td>
       <td>${Utils.formatMonto(r.costoTotal != null ? r.costoTotal : (r.costoUnitario || 0) * (r.cantidad || 0))}</td>
       <td>${stockDisplay}</td>
      <td>${Utils.esc(r.sucursalNombre || 'Global')}</td>
       <td>${Utils.esc(r.usuario)}</td>
       <td class="acciones-cell">${r.estado === 'PENDIENTE' && Utils.hasPermiso('PRODUCTOS_MOVIMIENTO_AUTORIZAR') ? '<button type="button" class="btn-kebab-toggle movimiento-kebab" data-id="' + r.idMovimiento + '" title="Autorizar"><i class="fas fa-ellipsis-v"></i></button>' : (r.estado ? '<span class="small text-muted">' + Utils.esc(r.estado) + '</span>' : '')}</td>
    </tr>`;
  }).join('');
}

function handleTableClick(e) {
  const btn = e.target.closest('.movimiento-kebab');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  Utils.abrirMenuKebab(btn, [
    { icon: 'fa-key', text: 'Generar código y aprobar', color: 'var(--primary)', onClick: () => aprobarMovimiento(id) },
    { danger: true, icon: 'fa-times', text: 'Rechazar', onClick: () => rechazarMovimiento(id) },
  ]);
}

async function aprobarMovimiento(id) {
  try {
    const codigo = await API.post('/productos/movimientos/' + id + '/generar-codigo');
    Utils.showDialog('Código de autorización', '<p class="mb-1">Movimiento #' + id + '</p><div class="display-6 fw-bold text-center" style="letter-spacing:6px">' + Utils.esc(codigo.codigo) + '</div><small class="text-muted">Válido hasta ' + new Date(codigo.expiraEn).toLocaleTimeString() + '</small>');
    const ingresado = await Utils.promptInput('Autorizar movimiento #' + id, 'Ingresa el código generado:', codigo.codigo);
    if (!ingresado) return;
    await API.post('/productos/movimientos/' + id + '/aprobar', { codigoAutorizacion: ingresado.trim() });
    Utils.showToast('Movimiento aprobado', 'success');
    cargarMovimientos(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function rechazarMovimiento(id) {
  if (!await Utils.confirm('¿Rechazar el movimiento #' + id + '?', 'Rechazar movimiento')) return;
  try {
    await API.post('/productos/movimientos/' + id + '/rechazar', {});
    Utils.showToast('Movimiento rechazado', 'success');
    cargarMovimientos(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderPagination() {
  const container = document.getElementById('paginationMov');
  if (!container) return;
  if (state.totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += `<li class="page-item ${state.currentPage === 0 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage - 1}"><i class="fas fa-chevron-left"></i></a></li>`;
  for (let i = 0; i < state.totalPages; i++) {
    if (i === 0 || i === state.totalPages - 1 || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
      html += `<li class="page-item ${i === state.currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
      html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
    }
  }
  html += `<li class="page-item ${state.currentPage === state.totalPages - 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;
}

function abrirModal() {
  const form = document.getElementById('formMovimiento');
  if (form) form.reset();
  document.getElementById('tableDetallesMovimiento').innerHTML = '';
  document.getElementById('movSucursal').value = state.sucursales.length === 1 ? String(state.sucursales[0].idSucursal) : '';
  Utils.updateSearchableOptions('movSucursal');
  agregarLineaMovimiento();
  actualizarStockInfo();
  new bootstrap.Modal(document.getElementById('movimientoModal')).show();
}

async function registrarMovimiento() {
  if (state.guardando) return;
  const idSucursal = document.getElementById('movSucursal').value;
  if (!idSucursal) { Utils.showToast('Selecciona una sucursal', 'warning'); return; }
  const filas = Array.from(document.querySelectorAll('#tableDetallesMovimiento tr'));
  if (filas.length === 0) { Utils.showToast('Agrega al menos un producto', 'warning'); return; }

  const lineas = [];
  for (const fila of filas) {
    const idProducto = parseInt(fila.querySelector('.mov-producto-linea').value);
    const tipoMovimiento = fila.querySelector('.mov-tipo-linea').value;
    const cantidad = parseInt(fila.querySelector('.mov-cantidad-linea').value);
    const producto = state.productos.find(p => p.idProducto === idProducto);
    const costo = Number(producto?.costoPromedio) || 0;
    if (!idProducto) { Utils.showToast('Selecciona un producto en cada línea', 'warning'); return; }
    if (!cantidad || cantidad <= 0) { Utils.showToast('Indica una cantidad válida en cada línea', 'warning'); return; }
    if (!Number.isFinite(costo) || costo < 0) { Utils.showToast('Indica un costo válido en cada línea', 'warning'); return; }
    lineas.push({ idProducto, tipoMovimiento, cantidad, costo });
  }

  state.guardando = true;
  const btn = document.getElementById('btnConfirmarMovimiento');
  if (btn) { btn.disabled = true; btn.dataset.originalText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Procesando...'; }
  try {
    for (const linea of lineas) {
      await API.post('/productos/' + linea.idProducto + '/movimiento-stock', {
        tipoMovimiento: linea.tipoMovimiento,
        cantidad: linea.cantidad,
        idSucursal: parseInt(idSucursal),
        referencia: document.getElementById('movReferencia').value.trim() || undefined,
        observacion: document.getElementById('movObservacion').value.trim() || undefined,
        costoUnitario: linea.costo,
        costoTotal: linea.cantidad * linea.costo,
      });
    }
    Utils.showToast('Movimiento registrado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('movimientoModal'))?.hide();
    cargarMovimientos(0);
  } catch (err) { Utils.showToast(err.message, 'error'); }
  finally {
    state.guardando = false;
    if (btn) { btn.disabled = false; if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText; }
  }
}

function agregarLineaMovimiento() {
  const productos = state.productos.map(p => '<option value="' + p.idProducto + '">' + Utils.esc(p.sku + ' - ' + p.nombre) + '</option>').join('');
  const tbody = document.getElementById('tableDetallesMovimiento');
  const uid = 'mov-producto-' + Date.now() + Math.floor(Math.random() * 1000);
  const fila = document.createElement('tr');
  fila.innerHTML =
    '<td><select id="' + uid + '" class="form-select form-select-sm mov-producto-linea"><option value="">Selecciona...</option>' + productos + '</select></td>' +
    '<td><select class="form-select form-select-sm mov-tipo-linea"><option value="ENTRADA">Entrada</option><option value="SALIDA">Salida</option><option value="RECAMBIO">Recambio</option><option value="MERMA">Merma</option><option value="DEVOLUCION">Devolución</option></select></td>' +
    '<td><input type="number" class="form-control form-control-sm mov-cantidad-linea" min="1" step="1" placeholder="Cantidad"></td>' +
    '<td class="mov-subtotal-linea text-end fw-semibold">$0.00</td>' +
    '<td><button type="button" class="btn-action" style="color:var(--danger)" data-action="quitar"><i class="fas fa-times"></i></button></td>';
  tbody.appendChild(fila);
  Utils.makeSearchableSelect(uid);
  const recalcular = () => {
    const cantidad = parseFloat(fila.querySelector('.mov-cantidad-linea').value) || 0;
    const idProducto = parseInt(fila.querySelector('.mov-producto-linea').value);
    const producto = state.productos.find(p => p.idProducto === idProducto);
    const costo = Number(producto?.costoPromedio) || 0;
    fila.querySelector('.mov-subtotal-linea').textContent = Utils.formatMonto(cantidad * costo);
    actualizarTotalesMovimiento();
  };
  fila.querySelectorAll('input, select').forEach(el => el.addEventListener('input', recalcular));
  fila.querySelector('.searchable-original')?.addEventListener('change', recalcular);
  fila.querySelector('[data-action="quitar"]').addEventListener('click', () => { fila.remove(); actualizarTotalesMovimiento(); });
  recalcular();
}

function actualizarTotalesMovimiento() {
  let cantidad = 0;
  let costoTotal = 0;
  document.querySelectorAll('#tableDetallesMovimiento tr').forEach(fila => {
    const qty = parseFloat(fila.querySelector('.mov-cantidad-linea')?.value) || 0;
    const idProducto = parseInt(fila.querySelector('.mov-producto-linea')?.value);
    const producto = state.productos.find(p => p.idProducto === idProducto);
    const costo = Number(producto?.costoPromedio) || 0;
    cantidad += qty;
    costoTotal += qty * costo;
  });
  document.getElementById('movTotalCantidad').textContent = cantidad;
  document.getElementById('movTotalCosto').textContent = Utils.formatMonto(costoTotal);
}

function buildRows() {
  const headers = ['Fecha', 'Tipo', 'Producto', 'Detalle', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Sucursal', 'Responsable'];
  const rows = state.data.map(r => [
    r.fechaMovimiento,
    r.tipoMovimiento,
    r.productoSku + ' ' + (r.productoNombre || ''),
    r.observacion || '',
    r.cantidad != null ? r.cantidad : '',
    r.stockAnterior != null ? r.stockAnterior : '',
    r.stockNuevo != null ? r.stockNuevo : '',
    r.sucursalNombre || 'Global',
    r.usuario,
  ]);
  return { headers, rows };
}

function exportarExcel() {
  if (!state.data || state.data.length === 0) { Utils.showToast('No hay datos para exportar', 'warning'); return; }
  const { headers, rows } = buildRows();
  Utils.downloadXls('movimientos_inventario_' + new Date().toISOString().slice(0, 10) + '.xls', 'Movimientos de Inventario', headers, rows);
  Utils.showToast('Exportado a Excel', 'success');
}

function exportarPDF() {
  if (!state.data || state.data.length === 0) { Utils.showToast('No hay datos para exportar', 'warning'); return; }
  const rowsHtml = state.data.map(r =>
    '<tr>' +
      '<td>' + Utils.formatDateTime(r.fechaMovimiento) + '</td>' +
      '<td>' + Utils.capitalize(r.tipoMovimiento.replace('_', ' ')) + '</td>' +
      '<td>' + Utils.esc(r.productoSku + ' ' + (r.productoNombre || '')) + '</td>' +
      '<td>' + Utils.esc(r.observacion || '') + '</td>' +
      '<td class="right">' + (r.cantidad != null ? r.cantidad : '') + '</td>' +
      '<td class="right">' + (r.stockAnterior != null ? r.stockAnterior + ' -> ' + r.stockNuevo : '') + '</td>' +
      '<td>' + Utils.esc(r.sucursalNombre || 'Global') + '</td>' +
      '<td>' + Utils.esc(r.usuario) + '</td>' +
    '</tr>'
  ).join('');

  const body =
    '<h2>MOVIMIENTOS DE INVENTARIO</h2>' +
    '<h4>Generado: ' + new Date().toLocaleString() + ' | Registros: ' + state.data.length + '</h4>' +
    '<table>' +
      '<thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Detalle</th><th class="right">Cant.</th><th class="right">Stock</th><th>Sucursal</th><th>Responsable</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
    '</table>';

  Utils.openPrintWindow('Movimientos de Inventario', body);
}
