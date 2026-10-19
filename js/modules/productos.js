let state = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  totalElements: 0,
  pageSize: 15,
  searchTerm: '',
  filterCategoria: '',
  filterSucursal: '',
  sortField: 'idProducto',
  sortDir: 'DESC',
  editingId: null,
  currentProductoId: null,
  showInactive: false,
  categorias: [],
  movFullProductoId: null,
  movFullPage: 0,
  movFullTotalPages: 0,
  movFullFechaInicio: '',
  movFullFechaFin: '',
};

export function init() {
  bindEvents();
  cargarCategorias();
  cargarProductos(0);
  cargarSucursalesSelect();
  cargarStats();
}

function bindEvents() {
  if (!Utils.hasPermiso('PRODUCTOS_CREAR')) {
    const btn = document.getElementById('btnNuevoProducto');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevoProducto')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarProducto')?.addEventListener('click', guardarProducto);
  document.getElementById('statsCostoTotalCard')?.addEventListener('click', mostrarCostoPorSucursal);
  document.getElementById('btnExportarInventario')?.addEventListener('click', exportarInventarioCSV);
  document.getElementById('btnExportarInventarioExcel')?.addEventListener('click', exportarInventarioExcel);
  document.getElementById('btnExportarInventarioPdf')?.addEventListener('click', exportarInventarioPDF);
  document.getElementById('searchProducto')?.addEventListener('input', Utils.debounce(e => {
    state.searchTerm = e.target.value;
    state.currentPage = 0;
    cargarProductos(0);
  }, 400));
  document.getElementById('filterCategoria')?.addEventListener('change', e => {
    state.filterCategoria = e.target.value;
    state.currentPage = 0;
    cargarProductos(0);
    cargarStats();
  });
  document.getElementById('filterSucursal')?.addEventListener('change', e => {
    state.filterSucursal = e.target.value;
    state.currentPage = 0;
    cargarProductos(0);
    cargarStats();
  });
  document.getElementById('productoTreeRoot')?.addEventListener('click', handleTableClick);
  if (!Utils.hasPermiso('PRODUCTOS_MOVIMIENTO')) {
    const btnMov = document.getElementById('btnRegistrarMovimiento');
    if (btnMov) btnMov.style.display = 'none';
    const btnMovFull = document.getElementById('btnRegistrarMovimientoFull');
    if (btnMovFull) btnMovFull.style.display = 'none';
  }
  document.getElementById('btnRegistrarMovimientoFull')?.addEventListener('click', () => {
    state.currentProductoId = state.movFullProductoId;
    abrirModalMovimiento();
  });
  document.getElementById('btnToggleInactivos')?.addEventListener('click', toggleInactivos);
  document.getElementById('btnMovFullFiltrar')?.addEventListener('click', () => {
    state.movFullFechaInicio = document.getElementById('movFullFechaInicio')?.value || '';
    state.movFullFechaFin = document.getElementById('movFullFechaFin')?.value || '';
    state.movFullPage = 0;
    cargarMovimientosFull(0);
  });
  document.getElementById('btnMovFullLimpiar')?.addEventListener('click', () => {
    if (document.getElementById('movFullFechaInicio')) document.getElementById('movFullFechaInicio').value = '';
    if (document.getElementById('movFullFechaFin')) document.getElementById('movFullFechaFin').value = '';
    state.movFullFechaInicio = '';
    state.movFullFechaFin = '';
    state.movFullPage = 0;
    cargarMovimientosFull(0);
  });
}

async function cargarCategorias() {
  try {
    const cats = await API.get('/categorias/activas');
    state.categorias = cats || [];
    const filterSel = document.getElementById('filterCategoria');
    if (filterSel) {
      filterSel.innerHTML = '<option value="">Todas las categor&iacute;as</option>' +
        state.categorias.map(c => `<option value="${c.idCategoria}">${Utils.esc(c.nombre)}</option>`).join('');
    }
    const formSel = document.getElementById('productoCategoria');
    if (formSel) {
      formSel.innerHTML = '<option value="">Seleccionar categor&iacute;a</option>' +
        state.categorias.map(c => `<option value="${c.idCategoria}">${Utils.esc(c.nombre)}</option>`).join('');
    }
  } catch (_) {}
}

async function cargarStats() {
  try {
    const params = new URLSearchParams();
    if (state.filterCategoria) params.set('idCategoria', state.filterCategoria);
    if (state.filterSucursal) params.set('idSucursal', state.filterSucursal);
    const stats = await API.get('/productos/stats' + (params.toString() ? '?' + params.toString() : ''));
    document.getElementById('statsStock').textContent = stats.stockGlobal || 0;
    document.getElementById('statsActivos').textContent = stats.activos || 0;
    const costoTotal = stats.costoTotalInventario || 0;
    document.getElementById('statsCostoTotal').textContent = Utils.formatMonto(costoTotal);
  } catch (_) {}
}

async function mostrarCostoPorSucursal() {
  const body = document.getElementById('costoSucursalBody');
  body.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div>';
  new bootstrap.Modal(document.getElementById('costoSucursalModal')).show();
  try {
    const data = await API.get('/productos/stats/costo-por-sucursal');
    if (!data || data.length === 0) {
      body.innerHTML = '<div class="text-center py-3 text-muted">Sin datos de inventario</div>';
      return;
    }
    body.innerHTML = data.map(r =>
      '<div class="d-flex justify-content-between align-items-center py-1 border-bottom">' +
        '<span class="fw-semibold small">' + Utils.esc(r.sucursal || '—') + '</span>' +
        '<span class="fw-bold" style="color:var(--primary)">' + Utils.formatMonto(parseFloat(r.costo) || 0) + '</span>' +
      '</div>'
    ).join('');
  } catch (_) {
    body.innerHTML = '<div class="text-center py-3 text-danger">Error al cargar datos</div>';
  }
}

async function cargarProductos(page) {
  state.currentPage = page;
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('size', state.pageSize);
  params.set('sort', state.sortField + ',' + state.sortDir);
  if (state.searchTerm) params.set('search', state.searchTerm);
  if (state.filterCategoria) params.set('idCategoria', state.filterCategoria);
  if (state.filterSucursal) params.set('idSucursal', state.filterSucursal);
  params.set('activo', state.showInactive ? 'false' : 'true');

  try {
    const result = await API.get('/productos?' + params.toString());
    state.data = result.content;
    state.totalPages = result.totalPages;
    state.totalElements = result.totalElements;
    renderTable();
    renderPagination();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function toggleInactivos() {
  state.showInactive = !state.showInactive;
  state.currentPage = 0;
  const btn = document.getElementById('btnToggleInactivos');
  if (btn) {
    btn.innerHTML = state.showInactive
      ? '<i class="fas fa-eye-slash me-1"></i> Mostrar activos'
      : '<i class="fas fa-eye me-1"></i> Mostrar inactivos';
  }
  cargarProductos(0);
}

async function cargarSucursalesSelect() {
  try {
    const sucursales = await API.get('/sucursales');
    state.sucursales = sucursales;
    const selects = document.querySelectorAll('.sucursal-select');
    selects.forEach(sel => {
      sel.innerHTML = '<option value="">Todas las sucursales</option>' +
        sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
      Utils.makeSearchableSelect(sel.id);
    });

    const stockSelects = document.querySelectorAll('.sucursal-stock-select');
    stockSelects.forEach(sel => {
      sel.innerHTML = '<option value="">Seleccionar sucursal</option>' +
        sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
      Utils.makeSearchableSelect(sel.id);
    });

    const badge = document.getElementById('sucursalPrincipalBadge');
    if (badge && sucursales.length > 0) {
      badge.innerHTML = '<i class="fas fa-building me-1"></i> Sucursal principal: ' + Utils.esc(sucursales[0].nombre);
    }
  } catch (err) {
    console.warn('Error al cargar sucursales:', err);
  }
}

function renderTable() {
  const root = document.getElementById('productoTreeRoot');
  if (!root) return;

  if (!state.data || state.data.length === 0) {
    root.innerHTML = '<li class="producto-node empty-tree"><div class="empty-state"><i class="fas fa-box-open"></i><p>No hay productos</p></div></li>';
    return;
  }

  root.innerHTML = state.data.map(p => renderProductoNode(p)).join('');
}

function renderProductoNode(p) {
  const id = p.idProducto;

  let stockDisplay = p.stockActual;
  let stockClass = Utils.getStockClass(p.stockActual, p.stockMinimo);
  const unidad = (p.unidadMedida || 'PIEZA').toLowerCase();
  const categoria = p.categoriaNombre ? '<small class="text-muted d-block">' + Utils.esc(p.categoriaNombre) + '</small>' : '';

  return `<li class="producto-node${p.activo ? '' : ' inactive'}">
    <div class="producto-row">
      <div class="producto-spacer"></div>
      <span class="producto-sku">${Utils.esc(p.sku)}</span>
      <span class="producto-nombre"><strong>${Utils.esc(p.nombre)}</strong>${categoria}</span>
      <span class="producto-unidad">${Utils.esc(unidad)}</span>
      <span class="producto-stock ${stockClass}">${stockDisplay}</span>
      <span class="producto-precio">${Utils.formatMonto(p.precioBase || 0)}</span>
      <span class="badge-status ${p.activo ? 'badge-active' : 'badge-inactive'}">${p.activo ? 'Activo' : 'Inactivo'}</span>
      <div class="producto-actions">
        <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${id}" data-action="menu" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
      </div>
    </div>
  </li>`;
}

function renderPagination() {
  const container = document.getElementById('paginationProductos');
  if (!container) return;

  if (state.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += `<li class="page-item ${state.currentPage === 0 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${state.currentPage - 1}"><i class="fas fa-chevron-left"></i></a></li>`;

  for (let i = 0; i < state.totalPages; i++) {
    if (i === 0 || i === state.totalPages - 1 || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
      html += `<li class="page-item ${i === state.currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
      html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
    }
  }

  html += `<li class="page-item ${state.currentPage === state.totalPages - 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${state.currentPage + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = parseInt(el.dataset.page);
      if (page >= 0 && page < state.totalPages) cargarProductos(page);
    });
  });
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    abrirAccionesProducto(kebab, id);
    return;
  }

  const item = e.target.closest('.btn-action');
  if (item) {
    const id = parseInt(item.dataset.id);
    const action = item.dataset.action;
    e.preventDefault();
    if (action === 'edit') abrirModal(id);
    else if (action === 'delete') confirmarEliminar(id);
    else if (action === 'reactivate') reactivarProducto(id);
    else if (action === 'view') verDetalle(id);
    else if (action === 'inventario') verInventario(id);
    return;
  }
}

function abrirAccionesProducto(anchor, id) {
  const p = (state.data || []).find(x => x.idProducto === id);
  const items = [
    { icon: 'fa-warehouse', text: 'Inventario y movimientos', color: 'var(--primary)', onClick: () => verInventario(id) },
    { icon: 'fa-eye', text: 'Ver detalle', color: 'var(--primary)', onClick: () => verDetalle(id) },
  ];
  if (p && !p.activo && (Utils.hasPermiso('PRODUCTOS_EDITAR') || Utils.hasPermiso('PRODUCTOS_CREAR'))) {
    items.push({ icon: 'fa-undo', text: 'Reactivar', color: '#28a745', onClick: () => reactivarProducto(id) });
  }
  if (Utils.hasPermiso('PRODUCTOS_EDITAR')) {
    items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) });
  }
  if (Utils.hasPermiso('PRODUCTOS_ELIMINAR')) {
    items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => confirmarEliminar(id) });
  }
  Utils.abrirMenuKebab(anchor, items);
}

async function verDetalle(id) {
  const modalEl = document.getElementById('productoDetalleModal');
  if (!modalEl) return;

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const body = document.getElementById('productoDetalleBody');
  body.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i></div>';
  modal.show();

  try {
    const p = await API.get('/productos/' + id);
    const unidad = (p.unidadMedida || 'UNIDAD').toLowerCase();

    const invHtml = (p.inventarioSucursales || []).map(i =>
      `<tr>
        <td>${Utils.esc(i.sucursalNombre)}</td>
        <td class="fw-semibold">${i.stock} ${Utils.esc(unidad)}</td>
        <td>${i.stockMinimo != null ? i.stockMinimo : '-'}</td>
        <td>${i.stockMaximo != null ? i.stockMaximo : '-'}</td>
      </tr>`
    ).join('') || '<tr><td colspan="4" class="text-muted">Sin stock en sucursales</td></tr>';

    body.innerHTML = `
      <div class="row g-3">
        <div class="col-12">
          <table class="table table-sm table-bordered mb-0">
            <tbody>
              <tr><th class="w-40">SKU</th><td>${Utils.esc(p.sku)}</td></tr>
              <tr><th>Nombre</th><td>${Utils.esc(p.nombre)}</td></tr>
              <tr><th>Categor&iacute;a</th><td>${Utils.esc(p.categoriaNombre || 'Sin categor&iacute;a')}</td></tr>
              <tr><th>Descripci&oacute;n</th><td>${Utils.esc(p.descripcion || '—')}</td></tr>
              <tr><th>Precio p&uacute;blico</th><td>${Utils.formatMonto(p.precioBase || 0)}</td></tr>
              <tr><th>Precio colaborador</th><td>${p.precio2 != null ? Utils.formatMonto(p.precio2) : '—'}</td></tr>
              <tr><th>Precio mayoreo</th><td>${p.precio3 != null ? Utils.formatMonto(p.precio3) : '—'}</td></tr>
              <tr><th>Precio distribuidor</th><td>${p.precio4 != null ? Utils.formatMonto(p.precio4) : '—'}</td></tr>
              <tr><th>Costo promedio</th><td>${p.costoPromedio != null ? Utils.formatMonto(p.costoPromedio) : '—'}</td></tr>
              <tr><th>Unidad de medida</th><td>${Utils.esc(unidad)}</td></tr>
              <tr><th>Stock global</th><td>${p.stockActual != null ? p.stockActual + ' ' + Utils.esc(unidad) : '—'}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="col-12">
          <h6 class="fw-semibold mt-2"><i class="fas fa-warehouse me-1"></i> Stock por Sucursal</h6>
          <div class="table-responsive">
            <table class="table table-sm table-bordered mb-0">
              <thead><tr><th>Sucursal</th><th>Stock</th><th>M&iacute;nimo</th><th>M&aacute;ximo</th></tr></thead>
              <tbody>${invHtml}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (err) {
    body.innerHTML = '<div class="text-center py-4 text-danger">Error al cargar el producto</div>';
  }
}

async function abrirModal(id) {
  state.editingId = id;

  const modalEl = document.getElementById('productoModal');
  if (!modalEl) return;

  const modal = new bootstrap.Modal(modalEl);
  const title = document.getElementById('productoModalTitle');
  const form = document.getElementById('formProducto');
  form.reset();

  document.getElementById('productoId').value = '';
  document.getElementById('productoUnidadMedida').value = 'PIEZA';
  const catSel = document.getElementById('productoCategoria');
  if (catSel) {
    catSel.innerHTML = '<option value="">Seleccionar categor&iacute;a</option>' +
      state.categorias.map(c => `<option value="${c.idCategoria}">${Utils.esc(c.nombre)}</option>`).join('');
  }

  const skuField = document.getElementById('productoSku');

  await generarStockInputs(id);

  if (id) {
    title.textContent = 'Editar Producto';
    try {
      const p = await API.get('/productos/' + id);
      document.getElementById('productoId').value = p.idProducto;
      document.getElementById('productoNombre').value = p.nombre || '';
      document.getElementById('productoDescripcion').value = p.descripcion || '';
      document.getElementById('productoPrecioBase').value = p.precioBase || '';
      document.getElementById('productoPrecio2').value = p.precio2 || '';
      document.getElementById('productoPrecio3').value = p.precio3 || '';
      document.getElementById('productoPrecio4').value = p.precio4 || '';
      document.getElementById('productoCosto').value = p.costoPromedio || '';
      document.getElementById('productoActivo').checked = p.activo !== false;
       document.getElementById('productoUnidadMedida').value = p.unidadMedida || 'PIEZA';
      if (catSel && p.idCategoria) catSel.value = p.idCategoria;

      const invs = p.inventarioSucursales || [];
      invs.forEach(inv => {
        const stockInput = document.getElementById('stock_' + inv.idSucursal);
        const minInput = document.getElementById('stockMin_' + inv.idSucursal);
        const maxInput = document.getElementById('stockMax_' + inv.idSucursal);
        if (stockInput) stockInput.value = inv.stock || 0;
        if (minInput) minInput.value = inv.stockMinimo || '';
        if (maxInput) maxInput.value = inv.stockMaximo || '';
      });

      if (skuField) {
        skuField.value = p.sku || '';
        skuField.readOnly = true;
      }
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return;
    }
  } else {
    title.textContent = 'Nuevo Producto';
    document.getElementById('productoActivo').checked = true;
    if (skuField) {
      skuField.value = '7502025' + String(Math.floor(100000 + Math.random() * 900000));
      skuField.disabled = false;
      skuField.readOnly = true;
    }
  }

  modal.show();
}

async function generarStockInputs(editingId) {
  const container = document.getElementById('stockSucursalInputs');
  if (!container) return;
  try {
    const sucursales = await API.get('/sucursales');
    container.innerHTML = '<div class="row g-2">' + sucursales.map(s =>
      `<div class="col-md-4 mb-2">
        <div class="p-2 border rounded">
          <div class="fw-semibold small mb-1">${Utils.esc(s.nombre)}</div>
          <div class="row g-1">
            <div class="col-4">
              <input type="number" class="form-control form-control-sm stock-input" id="stock_${s.idSucursal}" placeholder="Stock" min="0" ${editingId ? '' : 'value="0"'}>
            </div>
            <div class="col-4">
              <input type="number" class="form-control form-control-sm" id="stockMin_${s.idSucursal}" placeholder="M\u00edn" min="0">
            </div>
            <div class="col-4">
              <input type="number" class="form-control form-control-sm" id="stockMax_${s.idSucursal}" placeholder="M\u00e1x" min="0">
            </div>
          </div>
        </div>
      </div>`
    ).join('') + '</div>';
  } catch (err) {
    container.innerHTML = '<p class="text-muted small">Error al cargar sucursales</p>';
  }
}

async function guardarProducto() {
  Utils.syncSearchableSelects();

  let inventarios = [];
  try {
    const sucursales = await API.get('/sucursales');
    sucursales.forEach(s => {
      const stock = parseInt(document.getElementById('stock_' + s.idSucursal).value) || 0;
      const stockMin = parseInt(document.getElementById('stockMin_' + s.idSucursal).value) || null;
      const stockMax = parseInt(document.getElementById('stockMax_' + s.idSucursal).value) || null;
      inventarios.push({ idSucursal: s.idSucursal, stock: stock, stockMinimo: stockMin, stockMaximo: stockMax });
    });
  } catch (err) {
    Utils.showToast('Error al cargar sucursales', 'error');
    return;
  }

  const data = {
    sku: document.getElementById('productoSku').value.trim(),
    nombre: document.getElementById('productoNombre').value.trim(),
    descripcion: document.getElementById('productoDescripcion').value.trim(),
    precioBase: parseFloat(document.getElementById('productoPrecioBase').value) || null,
    precio2: parseFloat(document.getElementById('productoPrecio2').value) || null,
    precio3: parseFloat(document.getElementById('productoPrecio3').value) || null,
    precio4: parseFloat(document.getElementById('productoPrecio4').value) || null,
    costoPromedio: parseFloat(document.getElementById('productoCosto').value) || null,
    idCategoria: parseInt(document.getElementById('productoCategoria').value) || null,
     unidadMedida: document.getElementById('productoUnidadMedida').value || 'PIEZA',
    activo: document.getElementById('productoActivo').checked,
    inventarios: inventarios,
  };

  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  if (!data.idCategoria) { Utils.showToast('La categor\u00eda es obligatoria', 'warning'); return; }
  if (data.precioBase == null) { Utils.showToast('El precio p\u00fablico es obligatorio', 'warning'); return; }
  for (const precio of [data.precioBase, data.precio2, data.precio3, data.precio4]) {
    if (precio != null && data.costoPromedio != null && precio <= data.costoPromedio) {
      Utils.showToast('Todos los precios deben ser mayores al costo del producto', 'warning'); return;
    }
  }

  try {
    if (state.editingId) {
      await API.put('/productos/' + state.editingId, data);
      Utils.showToast('Producto actualizado', 'success');
    } else {
      await API.post('/productos', data);
      Utils.showToast('Producto creado', 'success');
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('productoModal'));
    if (modal) modal.hide();
    cargarProductos(0);
    cargarStats();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction(
    '\u00bfDesactivar este producto?', 'Confirmar', 'Desactivar'
  );
  if (!confirmed) return;

  try {
    await API.del('/productos/' + id);
    Utils.showToast('Producto desactivado', 'success');
    cargarProductos(state.currentPage);
    cargarStats();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function reactivarProducto(id) {
  const confirmed = await Utils.confirmAction(
    '\u00bfReactivar este producto?', 'Confirmar', 'Reactivar'
  );
  if (!confirmed) return;

  try {
    await API.patch('/productos/' + id + '/reactivar');
    Utils.showToast('Producto reactivado', 'success');
    cargarProductos(state.currentPage);
    cargarStats();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function verInventario(id) {
  state.currentProductoId = id;
  await abrirMovimientosFull();
}

function abrirModalMovimiento() {
  const modalEl = document.getElementById('movimientoModal');
  if (!modalEl) return;

  document.getElementById('movimientoProductoId').value = state.currentProductoId || '';
  document.getElementById('movimientoForm').reset();
  document.getElementById('movimientoSucursalGroup').classList.remove('d-none');
  document.getElementById('movimientoTipo').value = 'ENTRADA';
  document.getElementById('movimientoCantidad').value = '1';

  bootstrap.Modal.getOrCreateInstance(modalEl).show();

  document.getElementById('btnGuardarMovimiento').onclick = async () => {
    const tipo = document.getElementById('movimientoTipo').value;
    const cantidad = parseInt(document.getElementById('movimientoCantidad').value) || 0;
    const referencia = document.getElementById('movimientoReferencia').value.trim();
    const observacion = document.getElementById('movimientoObservacion').value.trim();
    const idProducto = parseInt(document.getElementById('movimientoProductoId').value);

    if (!cantidad || cantidad <= 0) {
      Utils.showToast('La cantidad debe ser mayor a 0', 'warning');
      return;
    }

    try {
      const data = {
        tipoMovimiento: tipo,
        cantidad: cantidad,
        idSucursal: parseInt(document.getElementById('movimientoSucursal').value) || null,
        referencia: referencia,
        observacion: observacion,
      };
      await API.post(`/productos/${idProducto}/movimiento-stock`, data);
      Utils.showToast('Movimiento registrado', 'success');
      bootstrap.Modal.getInstance(modalEl).hide();
      if (state.currentProductoId) verInventario(state.currentProductoId);
      cargarProductos(state.currentPage);
    } catch (err) {
      Utils.showToast(err.message, 'error');
    }
  };
}

async function fetchAllProducts() {
  const all = [];
  let page = 0;
  const size = 50;
  while (true) {
    const params = new URLSearchParams({ page, size, sort: 'idProducto,DESC', activo: 'true' });
    const result = await API.get('/productos?' + params.toString());
    const content = result.content || [];
    all.push(...content);
    if (page >= (result.totalPages || 1) - 1) break;
    page++;
  }
  return all;
}

function buildInventoryRows(products, filterSucursalId) {
  const rows = [];
  for (const p of products) {
    const invList = p.inventarioSucursales || [];
    if (invList.length === 0) {
      if (filterSucursalId) continue;
      rows.push({
        sku: p.sku || '', nombre: p.nombre || '', tipo: 'Simple',
        sucursal: '', stock: p.stockActual || 0, stockMinimo: '', stockMaximo: '',
        costoPromedio: p.costoPromedio || 0, costoTotal: (p.costoPromedio || 0) * (p.stockActual || 0),
        estado: p.activo ? 'Activo' : 'Inactivo',
      });
    } else {
      for (const inv of invList) {
        if (filterSucursalId && inv.idSucursal != filterSucursalId) continue;
        rows.push({
          sku: p.sku || '', nombre: p.nombre || '', tipo: 'Simple',
          sucursal: inv.sucursalNombre || '', stock: inv.stock || 0,
          stockMinimo: inv.stockMinimo ?? '', stockMaximo: inv.stockMaximo ?? '',
          costoPromedio: p.costoPromedio || 0, costoTotal: (p.costoPromedio || 0) * (inv.stock || 0),
          estado: p.activo ? 'Activo' : 'Inactivo',
        });
      }
    }
  }
  return rows;
}

function downloadCSV(headers, rows, filename) {
  const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + (v ?? '') + '"').join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function exportarInventarioCSV() {
  const sucursalId = document.getElementById('exportSucursalSelect')?.value || '';
  const sucursalNombre = document.getElementById('exportSucursalSelect')?.selectedOptions?.[0]?.textContent || '';
  Utils.showToast('Exportando inventario...', 'info');
  try {
    const products = await fetchAllProducts();
    const rows = buildInventoryRows(products, sucursalId || null);
    const headers = ['SKU', 'Nombre', 'Tipo', 'Sucursal', 'Stock', 'Stock Min', 'Stock Max', 'Costo Promedio', 'Costo Total', 'Estado'];
    if (sucursalId) {
      const csvRows = rows.map(r => [r.sku, r.nombre, r.tipo, r.sucursal, r.stock, r.stockMinimo, r.stockMaximo, r.costoPromedio, r.costoTotal, r.estado]);
      downloadCSV(headers, csvRows, 'inventario_' + sucursalNombre.replace(/\s+/g, '_') + '_' + new Date().toISOString().slice(0, 10) + '.csv');
    } else {
      const sucursalesMap = {};
      for (const r of rows) {
        const key = r.sucursal || 'Sin Sucursal';
        if (!sucursalesMap[key]) sucursalesMap[key] = [];
        sucursalesMap[key].push(r);
      }
      const allRows = [];
      for (const [sucursal, items] of Object.entries(sucursalesMap)) {
        allRows.push(['--- ' + sucursal + ' ---', '', '', '', '', '', '', '', '', '']);
        for (const r of items) {
          allRows.push([r.sku, r.nombre, r.tipo, r.sucursal, r.stock, r.stockMinimo, r.stockMaximo, r.costoPromedio, r.costoTotal, r.estado]);
        }
      }
      downloadCSV(headers, allRows, 'inventario_total_' + new Date().toISOString().slice(0, 10) + '.csv');
    }
    Utils.showToast('Inventario exportado', 'success');
  } catch (err) { Utils.showToast('Error al exportar: ' + err.message, 'error'); }
}

async function prepararInventario(conTotales) {
  const sucursalId = document.getElementById('exportSucursalSelect')?.value || '';
  const sucursalNombre = document.getElementById('exportSucursalSelect')?.selectedOptions?.[0]?.textContent || '';
  const products = await fetchAllProducts();
  const rows = buildInventoryRows(products, sucursalId || null);
  return { rows, sucursalId, sucursalNombre };
}

async function exportarInventarioExcel() {
  Utils.showToast('Generando Excel...', 'info');
  try {
    const { rows, sucursalNombre } = await prepararInventario();
    const headers = ['SKU', 'Nombre', 'Tipo', 'Sucursal', 'Stock', 'Stock Min', 'Stock Max', 'Costo Promedio', 'Costo Total', 'Estado'];
    const data = rows.map(r => [r.sku, r.nombre, r.tipo, r.sucursal, r.stock, r.stockMinimo, r.stockMaximo, r.costoPromedio, r.costoTotal, r.estado]);
    const file = (sucursalNombre ? 'inventario_' + sucursalNombre.replace(/\s+/g, '_') : 'inventario_total') + '_' + new Date().toISOString().slice(0, 10) + '.xls';
    Utils.downloadXls(file, 'Inventario', headers, data);
    Utils.showToast('Inventario exportado a Excel', 'success');
  } catch (err) { Utils.showToast('Error al exportar: ' + err.message, 'error'); }
}

async function exportarInventarioPDF() {
  Utils.showToast('Generando PDF...', 'info');
  try {
    const { rows, sucursalId, sucursalNombre } = await prepararInventario();

    let filas;
    if (sucursalId) {
      const totalCosto = rows.reduce((s, r) => s + (r.costoTotal || 0), 0);
      const totalStock = rows.reduce((s, r) => s + (r.stock || 0), 0);
      filas = rows.map(r =>
        '<tr>' +
          '<td>' + Utils.esc(r.sku || '') + '</td>' +
          '<td>' + Utils.esc(r.nombre || '') + '</td>' +
          '<td class="right">' + (r.stock || 0) + '</td>' +
          '<td class="right">' + (r.costoPromedio != null ? Utils.formatMonto(r.costoPromedio) : '') + '</td>' +
          '<td class="right">' + (r.costoTotal != null ? Utils.formatMonto(r.costoTotal) : '') + '</td>' +
        '</tr>'
      ).join('') +
      '<tr class="total"><td colspan="2">TOTALES</td>' +
        '<td class="right">' + totalStock + '</td><td></td>' +
        '<td class="right">' + Utils.formatMonto(totalCosto) + '</td></tr>';
    } else {
      const sucursalesMap = {};
      for (const r of rows) {
        const key = r.sucursal || 'Sin Sucursal';
        if (!sucursalesMap[key]) sucursalesMap[key] = [];
        sucursalesMap[key].push(r);
      }
      filas = Object.entries(sucursalesMap).map(([sucursal, items]) => {
        const totalCosto = items.reduce((s, r) => s + (r.costoTotal || 0), 0);
        const totalStock = items.reduce((s, r) => s + (r.stock || 0), 0);
        return '<tr style="background:#f1f1f1"><td colspan="5"><strong>' + Utils.esc(sucursal) + '</strong> — Stock: ' + totalStock + ' | Costo: ' + Utils.formatMonto(totalCosto) + '</td></tr>' +
          items.map(r =>
            '<tr>' +
              '<td>' + Utils.esc(r.sku || '') + '</td>' +
              '<td>' + Utils.esc(r.nombre || '') + '</td>' +
              '<td class="right">' + (r.stock || 0) + '</td>' +
              '<td class="right">' + (r.costoPromedio != null ? Utils.formatMonto(r.costoPromedio) : '') + '</td>' +
              '<td class="right">' + (r.costoTotal != null ? Utils.formatMonto(r.costoTotal) : '') + '</td>' +
            '</tr>'
          ).join('');
      }).join('');
    }

    const body =
      '<h2>INVENTARIO</h2>' +
      '<h4>' + (sucursalNombre ? Utils.esc(sucursalNombre) : 'TODAS LAS SUCURSALES') + ' | Generado: ' + new Date().toLocaleString() + '</h4>' +
      '<table>' +
        '<thead><tr><th>SKU</th><th>Nombre</th><th class="right">Stock</th><th class="right">Costo Prom.</th><th class="right">Costo Total</th></tr></thead>' +
        '<tbody>' + filas + '</tbody>' +
      '</table>';

    Utils.openPrintWindow('Inventario', body);
  } catch (err) { Utils.showToast('Error al exportar: ' + err.message, 'error'); }
}

async function abrirMovimientosFull() {
  const modalEl = document.getElementById('movimientosFullModal');
  if (!modalEl) return;
  state.movFullProductoId = state.currentProductoId;
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  if (document.getElementById('movFullFechaInicio')) document.getElementById('movFullFechaInicio').value = '';
  if (document.getElementById('movFullFechaFin')) document.getElementById('movFullFechaFin').value = '';
  state.movFullFechaInicio = '';
  state.movFullFechaFin = '';
  try {
    const p = await API.get('/productos/' + state.movFullProductoId);
    document.getElementById('movimientosFullProducto').textContent = '(' + p.nombre + ')';
  } catch (_) {}
  cargarMovimientosFull(0);
  modal.show();
}

async function cargarMovimientosFull(page) {
  state.movFullPage = page;
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('size', 15);
  if (state.movFullFechaInicio) params.set('fechaInicio', state.movFullFechaInicio + 'T00:00:00');
  if (state.movFullFechaFin) params.set('fechaFin', state.movFullFechaFin + 'T23:59:59');

  const tbody = document.getElementById('movimientosFullBody');
  const pag = document.getElementById('paginationMovimientosFull');
  if (!tbody) return;

  try {
    const result = await API.get('/kardex?idProducto=' + state.movFullProductoId + '&' + params.toString());
    const movs = result.content || [];
    state.movFullTotalPages = result.totalPages || 0;

    if (movs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Sin movimientos</td></tr>';
    } else {
      tbody.innerHTML = movs.map(m => {
        const badgeClass = m.tipoMovimiento === 'ENTRADA' ? 'bg-success'
          : m.tipoMovimiento === 'SALIDA' ? 'bg-danger'
          : m.tipoMovimiento === 'AJUSTE' ? 'bg-warning text-dark'
          : 'bg-info text-white';
        return `<tr>
          <td class="text-nowrap">${Utils.formatDateTime(m.fechaMovimiento)}</td>
          <td><span class="badge ${badgeClass}">${Utils.esc(m.tipoMovimiento)}</span></td>
          <td class="fw-semibold">${Utils.esc(m.productoNombre || '')}<br><small class="text-muted">${Utils.esc(m.productoSku || '')}</small></td>
          <td>${m.cantidad != null ? m.cantidad : '-'}</td>
          <td>${m.stockAnterior != null ? m.stockAnterior + ' \u2192 ' + m.stockNuevo : '-'}</td>
          <td>${Utils.esc(m.sucursalNombre || 'Global')}</td>
          <td>${Utils.esc(m.referencia || '\u2014')}</td>
          <td>${Utils.esc(m.usuario || '\u2014')}</td>
        </tr>`;
      }).join('');
    }

    renderMovimientosFullPagination(pag);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar movimientos</td></tr>';
  }
}

function renderMovimientosFullPagination(container) {
  if (!container) return;
  if (state.movFullTotalPages <= 1) { container.innerHTML = ''; return; }
  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += `<li class="page-item ${state.movFullPage === 0 ? 'disabled' : ''}"><a class="page-link" href="#" data-mf-page="${state.movFullPage - 1}"><i class="fas fa-chevron-left"></i></a></li>`;
  for (let i = 0; i < state.movFullTotalPages; i++) {
    if (i === 0 || i === state.movFullTotalPages - 1 || (i >= state.movFullPage - 2 && i <= state.movFullPage + 2)) {
      html += `<li class="page-item ${i === state.movFullPage ? 'active' : ''}"><a class="page-link" href="#" data-mf-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.movFullPage - 3 || i === state.movFullPage + 3) {
      html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
    }
  }
  html += `<li class="page-item ${state.movFullPage === state.movFullTotalPages - 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-mf-page="${state.movFullPage + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;
  container.querySelectorAll('[data-mf-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const p = parseInt(el.dataset.mfPage);
      if (p >= 0 && p < state.movFullTotalPages) cargarMovimientosFull(p);
    });
  });
}
