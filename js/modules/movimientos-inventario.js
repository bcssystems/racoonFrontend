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
  document.getElementById('btnExportMovExcel')?.addEventListener('click', exportarExcel);
  document.getElementById('btnExportMovPdf')?.addEventListener('click', exportarPDF);

  document.getElementById('movProducto')?.addEventListener('change', actualizarStockInfo);
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
  const modalSel = document.getElementById('movProducto');
  try {
    const result = await API.get('/productos?activo=true&page=0&size=500');
    state.productos = result.content || [];
    const opts = state.productos.map(p =>
      '<option value="' + p.idProducto + '">' + Utils.esc(p.sku + ' - ' + p.nombre) + '</option>'
    ).join('');
    sel.innerHTML = '<option value="">Todos</option>' + opts;
    modalSel.innerHTML = '<option value="">Selecciona un producto...</option>' + opts;
    Utils.makeSearchableSelect('movProducto');
  } catch (err) {
    sel.innerHTML = '<option value="">Todos</option>';
    modalSel.innerHTML = '<option value="">Selecciona un producto...</option>';
    Utils.showToast(err.message, 'error');
  }
}

async function actualizarStockInfo() {
  const info = document.getElementById('movStockInfo');
  const idProducto = document.getElementById('movProducto').value;
  const idSucursal = document.getElementById('movSucursal').value;
  if (!info) return;
  if (!idProducto) { info.textContent = ''; return; }

  try {
    const p = await API.get('/productos/' + idProducto);
    if (!p) { info.textContent = ''; return; }
    let stockSuc = null;
    if (idSucursal) {
      const inv = (p.inventarioSucursales || []).find(i => i.idSucursal === parseInt(idSucursal));
      stockSuc = inv ? inv.stock : null;
    }
    let txt = 'Stock actual: <strong>' + (p.stockActual != null ? p.stockActual : 0) + '</strong>';
    if (idSucursal) {
      txt += ' | En sucursal: <strong>' + (stockSuc != null ? stockSuc : 0) + '</strong>';
    }
    info.innerHTML = txt;
  } catch (_) {}
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
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-arrows-rotate"></i><p>No hay movimientos</p></div></td></tr>';
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
      <td>${stockDisplay}</td>
      <td>${Utils.esc(r.sucursalNombre || 'Global')}</td>
      <td>${Utils.esc(r.usuario)}</td>
    </tr>`;
  }).join('');
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
  document.getElementById('movProducto').value = '';
  document.getElementById('movSucursal').value = state.sucursales.length === 1 ? String(state.sucursales[0].idSucursal) : '';
  document.getElementById('movTipo').value = 'ENTRADA';
  Utils.updateSearchableOptions('movProducto');
  Utils.updateSearchableOptions('movSucursal');
  actualizarStockInfo();
  new bootstrap.Modal(document.getElementById('movimientoModal')).show();
}

async function registrarMovimiento() {
  const idProducto = document.getElementById('movProducto').value;
  const idSucursal = document.getElementById('movSucursal').value;
  const tipoMovimiento = document.getElementById('movTipo').value;
  const cantidad = parseInt(document.getElementById('movCantidad').value);

  if (!idProducto) { Utils.showToast('Selecciona un producto', 'warning'); return; }
  if (!idSucursal) { Utils.showToast('Selecciona una sucursal', 'warning'); return; }
  if (!cantidad || cantidad <= 0) { Utils.showToast('Ingresa una cantidad v\u00e1lida', 'warning'); return; }

  const payload = {
    tipoMovimiento,
    cantidad,
    idSucursal: parseInt(idSucursal),
    referencia: document.getElementById('movReferencia').value.trim() || undefined,
    observacion: document.getElementById('movObservacion').value.trim() || undefined,
  };

  try {
    await API.post('/productos/' + idProducto + '/movimiento-stock', payload);
    Utils.showToast('Movimiento registrado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('movimientoModal'))?.hide();
    cargarMovimientos(0);
  } catch (err) { Utils.showToast(err.message, 'error'); }
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