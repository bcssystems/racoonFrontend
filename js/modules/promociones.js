let state = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  totalElements: 0,
  pageSize: 10,
  filterTipo: '',
  filterActivo: '',
  editingId: null,
  comboProductos: [],
};

export function init() {
  bindEvents();
  cargarProductosSelect();
  cargarPromociones(0);
}

function bindEvents() {
  const btnNuevo = document.getElementById('btnNuevaPromocion');
  if (btnNuevo) {
    if (!Utils.hasPermiso('PROMOCIONES_CREAR')) btnNuevo.style.display = 'none';
    btnNuevo.addEventListener('click', () => abrirModal(null));
  }

  const btnGuardar = document.getElementById('btnGuardarPromocion');
  if (btnGuardar) btnGuardar.addEventListener('click', guardarPromocion);

  const btnFiltrar = document.getElementById('btnFiltrar');
  if (btnFiltrar) btnFiltrar.addEventListener('click', () => {
    state.filterTipo = document.getElementById('filterTipo').value;
    state.filterActivo = document.getElementById('filterActivo').value;
    state.currentPage = 0;
    cargarPromociones(0);
  });

  const tipoSelect = document.getElementById('promocionTipo');
  if (tipoSelect) tipoSelect.addEventListener('change', toggleTipoForm);

  const descuentoInput = document.getElementById('promocionDescuento');
  if (descuentoInput) descuentoInput.addEventListener('input', recalcularPrecios);

  const precioFinalInput = document.getElementById('promocionPrecioFinal');
  if (precioFinalInput) precioFinalInput.addEventListener('input', () => {});

  const btnAgregar = document.getElementById('btnAgregarComboProducto');
  if (btnAgregar) btnAgregar.addEventListener('click', agregarProductoCombo);

  const tableBody = document.getElementById('tablePromocionesBody');
  if (tableBody) tableBody.addEventListener('click', handleTableClick);
}

async function cargarProductosSelect() {
  try {
    const result = await API.get('/productos?activo=true&size=500');
    const productos = result.content || [];
    const opts = productos.map(p =>
      `<option value="${p.idProducto}">${Utils.esc(p.sku)} - ${Utils.esc(p.nombre)}</option>`
    ).join('');
    const selects = ['promocionProducto', 'comboProductoSelect'];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      if (sel) {
        sel.innerHTML = '<option value="">Seleccionar producto</option>' + opts;
        Utils.makeSearchableSelect(id);
      }
    });
  } catch (_) {}
}

async function cargarPromociones(page) {
  state.currentPage = page;
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('size', state.pageSize);
  if (state.filterTipo) params.set('tipo', state.filterTipo);
  if (state.filterActivo) params.set('activo', state.filterActivo);

  try {
    const result = await API.get('/promociones?' + params.toString());
    state.data = result.content;
    state.totalPages = result.totalPages;
    state.totalElements = result.totalElements;
    renderTable();
    renderPagination();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('tablePromocionesBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-percent"></i><p>No hay promociones</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(p => {
    const now = new Date();
    const inicio = new Date(p.fechaInicio);
    const fin = p.fechaFin ? new Date(p.fechaFin) : null;
    const vigente = p.activo && inicio <= now && (!fin || fin >= now);

    let badgeClass = vigente ? 'badge-active' : 'badge-inactive';
    let badgeText = vigente ? 'Vigente' : (p.activo ? 'Programada' : 'Inactiva');

    const tipoBadge = p.tipo === 'COMBO'
      ? '<span class="badge bg-info">Combo</span>'
      : '<span class="badge bg-success">Promo</span>';

    const precioSugerido = p.precioSugerido != null ? Utils.formatMonto(p.precioSugerido) : '-';
    const precioFinal = p.precioFinal != null ? Utils.formatMonto(p.precioFinal) : '-';

    const vigencia = Utils.formatDate(p.fechaInicio) + (p.fechaFin ? ' → ' + Utils.formatDate(p.fechaFin) : '');

    return `<tr>
      <td><strong>${Utils.esc(p.nombre)}</strong></td>
      <td>${tipoBadge}</td>
      <td>${p.descuentoPorcentaje}%</td>
      <td>${precioSugerido}</td>
      <td>${precioFinal}</td>
      <td class="small text-muted">${vigencia}</td>
      <td><span class="badge-status ${badgeClass}">${badgeText}</span></td>
      <td class="acciones-cell text-end">
        <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${p.idPromocion}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function renderPagination() {
  const container = document.getElementById('paginationPromociones');
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
      if (page >= 0 && page < state.totalPages) cargarPromociones(page);
    });
  });
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const items = [];
    if (Utils.hasPermiso('PROMOCIONES_EDITAR')) {
      items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) });
    }
    if (Utils.hasPermiso('PROMOCIONES_ELIMINAR')) {
      items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => confirmarEliminar(id) });
    }
    if (items.length === 0) return;
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'edit') abrirModal(id);
  else if (action === 'delete') confirmarEliminar(id);
}

function toggleTipoForm() {
  const tipo = document.getElementById('promocionTipo').value;
  const isCombo = tipo === 'COMBO';
  document.getElementById('promocionProductoGroup').classList.toggle('d-none', isCombo);
  document.getElementById('comboProductosGroup').classList.toggle('d-none', !isCombo);
}

async function abrirModal(id) {
  state.editingId = id;
  const modalEl = document.getElementById('promocionModal');
  if (!modalEl) return;

  const modal = new bootstrap.Modal(modalEl);
  const title = document.getElementById('promocionModalTitle');
  const form = document.getElementById('formPromocion');
  form.reset();
  document.getElementById('promocionId').value = '';
  document.getElementById('promocionActivo').checked = true;

  state.comboProductos = [];
  renderComboTable();

  if (id) {
    title.textContent = 'Editar Promoción';
    try {
      const p = await API.get('/promociones/' + id);
      document.getElementById('promocionId').value = p.idPromocion;
      document.getElementById('promocionNombre').value = p.nombre || '';
      document.getElementById('promocionDescripcion').value = p.descripcion || '';
      document.getElementById('promocionTipo').value = p.tipo;
      document.getElementById('promocionDescuento').value = p.descuentoPorcentaje || '';
      document.getElementById('promocionFechaInicio').value = formatDateTimeLocal(p.fechaInicio);
      document.getElementById('promocionFechaFin').value = p.fechaFin ? formatDateTimeLocal(p.fechaFin) : '';
      document.getElementById('promocionActivo').checked = p.activo !== false;
      document.getElementById('promocionPrecioSugerido').value = p.precioSugerido || '';
      document.getElementById('promocionPrecioFinal').value = p.precioFinal || '';

      toggleTipoForm();

      if (p.tipo === 'PROMOCION' && p.idProducto) {
        const prodSelect = document.getElementById('promocionProducto');
        prodSelect.value = p.idProducto;
        Utils.updateSearchableOptions('promocionProducto');
      }

      if (p.tipo === 'COMBO' && p.detalles) {
        state.comboProductos = p.detalles.map(d => ({
          idProducto: d.idProducto,
          sku: d.productoSku,
          nombre: d.productoNombre,
          cantidad: d.cantidad,
        }));
        renderComboTable();
        recalcularPrecios();
      }
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return;
    }
  } else {
    title.textContent = 'Nueva Promoción';
    toggleTipoForm();
  }

  modal.show();
}

function formatDateTimeLocal(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function agregarProductoCombo() {
  const select = document.getElementById('comboProductoSelect');
  const cantidad = parseInt(document.getElementById('comboProductoCantidad').value) || 1;
  const option = select.options[select.selectedIndex];

  if (!select.value) {
    Utils.showToast('Selecciona un producto', 'warning');
    return;
  }

  const existing = state.comboProductos.find(p => p.idProducto === parseInt(select.value));
  if (existing) {
    existing.cantidad += cantidad;
  } else {
    state.comboProductos.push({
      idProducto: parseInt(select.value),
      sku: option.text.split(' - ')[0],
      nombre: option.text.split(' - ')[1],
      cantidad: cantidad,
    });
  }

  renderComboTable();
  recalcularPrecios();
  document.getElementById('comboProductoCantidad').value = 1;
}

function renderComboTable() {
  const tbody = document.getElementById('comboProductosTableBody');
  if (!tbody) return;

  if (state.comboProductos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted small text-center">Sin productos</td></tr>';
    return;
  }

  tbody.innerHTML = state.comboProductos.map((p, i) =>
    `<tr>
      <td>${Utils.esc(p.sku)} - ${Utils.esc(p.nombre)}</td>
      <td>${p.cantidad}</td>
      <td id="comboPrice_${i}">-</td>
      <td id="comboSubtotal_${i}">-</td>
      <td><button class="btn btn-sm btn-outline-danger py-0 px-1" data-index="${i}" data-action="remove-combo"><i class="fas fa-times"></i></button></td>
    </tr>`
  ).join('');

  tbody.querySelectorAll('[data-action="remove-combo"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      state.comboProductos.splice(idx, 1);
      renderComboTable();
      recalcularPrecios();
    });
  });

  cargarPreciosCombo();
}

async function cargarPreciosCombo() {
  for (let i = 0; i < state.comboProductos.length; i++) {
    try {
      const prod = await API.get('/productos/' + state.comboProductos[i].idProducto);
      const price = prod.precioBase || 0;
      state.comboProductos[i]._precioBase = price;
      const priceCell = document.getElementById('comboPrice_' + i);
      const subCell = document.getElementById('comboSubtotal_' + i);
      if (priceCell) priceCell.textContent = Utils.formatMonto(price);
      if (subCell) subCell.textContent = Utils.formatMonto(price * state.comboProductos[i].cantidad);
    } catch (_) {}
  }
  recalcularPrecios();
}

async function recalcularPrecios() {
  const tipo = document.getElementById('promocionTipo').value;
  const desc = parseFloat(document.getElementById('promocionDescuento').value) || 0;
  let sugerido = 0;

  if (tipo === 'PROMOCION') {
    const prodId = document.getElementById('promocionProducto').value;
    if (prodId) {
      try {
        const prod = await API.get('/productos/' + prodId);
        const base = prod.precioBase || 0;
        sugerido = base * (1 - desc / 100);
      } catch (_) {}
    }
  } else if (tipo === 'COMBO') {
    for (const p of state.comboProductos) {
      const price = p._precioBase || 0;
      sugerido += price * p.cantidad;
    }
    sugerido = sugerido * (1 - desc / 100);
  }

  document.getElementById('promocionPrecioSugerido').value = sugerido.toFixed(2);
  const finalInput = document.getElementById('promocionPrecioFinal');
  if (!finalInput.dataset.userEdited) {
    finalInput.value = sugerido.toFixed(2);
  }
}

document.addEventListener('input', function(e) {
  if (e.target.id === 'promocionPrecioFinal') {
    e.target.dataset.userEdited = 'true';
  }
  if (e.target.id === 'promocionDescuento' || e.target.id === 'promocionProducto') {
    document.getElementById('promocionPrecioFinal').dataset.userEdited = '';
  }
});

async function guardarPromocion() {
  Utils.syncSearchableSelects();

  const data = {
    nombre: document.getElementById('promocionNombre').value.trim(),
    descripcion: document.getElementById('promocionDescripcion').value.trim() || null,
    tipo: document.getElementById('promocionTipo').value,
    descuentoPorcentaje: parseFloat(document.getElementById('promocionDescuento').value) || 0,
    activo: document.getElementById('promocionActivo').checked,
    fechaInicio: document.getElementById('promocionFechaInicio').value ? new Date(document.getElementById('promocionFechaInicio').value).toISOString() : null,
    fechaFin: document.getElementById('promocionFechaFin').value ? new Date(document.getElementById('promocionFechaFin').value).toISOString() : null,
    precioSugerido: parseFloat(document.getElementById('promocionPrecioSugerido').value) || null,
    precioFinal: parseFloat(document.getElementById('promocionPrecioFinal').value) || null,
  };

  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  if (!data.fechaInicio) { Utils.showToast('La fecha de inicio es obligatoria', 'warning'); return; }

  if (data.tipo === 'PROMOCION') {
    data.idProducto = parseInt(document.getElementById('promocionProducto').value) || null;
    if (!data.idProducto) { Utils.showToast('Selecciona un producto', 'warning'); return; }
  } else {
    data.idProducto = null;
    data.detalles = state.comboProductos.map(p => ({
      idProducto: p.idProducto,
      cantidad: p.cantidad,
    }));
    if (data.detalles.length === 0) { Utils.showToast('Agrega al menos un producto al combo', 'warning'); return; }
  }

  try {
    if (state.editingId) {
      await API.put('/promociones/' + state.editingId, data);
      Utils.showToast('Promoción actualizada', 'success');
    } else {
      await API.post('/promociones', data);
      Utils.showToast('Promoción creada', 'success');
    }

    const modal = bootstrap.Modal.getInstance(document.getElementById('promocionModal'));
    if (modal) modal.hide();
    cargarPromociones(0);
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction('¿Desactivar esta promoción?', 'Confirmar', 'Desactivar');
  if (!confirmed) return;
  try {
    await API.del('/promociones/' + id);
    Utils.showToast('Promoción desactivada', 'success');
    cargarPromociones(state.currentPage);
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}
