let state = { data: [], currentPage: 0, totalPages: 0, pageSize: 10, editingId: null };

export function init() {
  bindEvents();
  cargarProveedores(0);
}

function bindEvents() {
  if (!Utils.hasPermiso('PROVEEDORES_CREAR')) {
    const btn = document.getElementById('btnNuevoProveedor');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevoProveedor')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarProveedor')?.addEventListener('click', guardarProveedor);
  document.getElementById('tableProveedoresBody')?.addEventListener('click', handleTableClick);
  document.getElementById('searchProveedor')?.addEventListener('input', Utils.debounce(() => {
    cargarProveedores(0);
  }, 400));
}

async function cargarProveedores(page) {
  state.currentPage = page;
  const search = document.getElementById('searchProveedor')?.value || '';
  try {
    const result = await API.get('/proveedores?search=' + encodeURIComponent(search) + '&page=' + page + '&size=' + state.pageSize);
    state.data = result.content;
    state.totalPages = result.totalPages;
    renderTable();
    renderPagination();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderTable() {
  const tbody = document.getElementById('tableProveedoresBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-truck"></i><p>No hay proveedores</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(p => `<tr>
    <td><strong>${Utils.esc(p.nombre)}</strong></td>
    <td>${Utils.esc(p.rfc) || '-'}</td>
    <td>${Utils.esc(p.telefono) || '-'}</td>
    <td>${Utils.esc(p.email) || '-'}</td>
    <td>${Utils.esc(p.contactoNombre) || '-'}</td>
    <td><span class="badge-status ${p.activo ? 'badge-active' : 'badge-inactive'}">${p.activo ? 'S&iacute;' : 'No'}</span></td>
    <td class="acciones-cell">
      <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${p.idProveedor}" data-action="menu" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
    </td>
  </tr>`).join('');
}

function renderPagination() {
  const container = document.getElementById('paginationProveedores');
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

  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = parseInt(el.dataset.page);
      if (page >= 0 && page < state.totalPages) cargarProveedores(page);
    });
  });
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const items = [];
    if (Utils.hasPermiso('PROVEEDORES_EDITAR')) {
      items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) });
    }
    if (Utils.hasPermiso('PROVEEDORES_ELIMINAR')) {
      items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => confirmarEliminar(id) });
    }
    if (items.length === 0) return;
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const item = e.target.closest('.btn-action');
  if (!item) return;
  e.preventDefault();
  const id = parseInt(item.dataset.id);
  if (item.dataset.action === 'edit' || item.classList.contains('btn-action-edit')) abrirModal(id);
  else if (item.dataset.action === 'delete' || item.classList.contains('btn-action-delete')) confirmarEliminar(id);
}

function abrirModal(id) {
  state.editingId = id;
  const modal = new bootstrap.Modal(document.getElementById('proveedorModal'));
  document.getElementById('proveedorModalTitle').textContent = id ? 'Editar Proveedor' : 'Nuevo Proveedor';
  document.getElementById('formProveedor').reset();
  document.getElementById('proveedorId').value = '';
  document.getElementById('proveedorActivo').checked = true;

  if (id) {
    const p = state.data.find(p => p.idProveedor === id);
    if (p) {
      document.getElementById('proveedorId').value = p.idProveedor;
      document.getElementById('proveedorNombre').value = p.nombre || '';
      document.getElementById('proveedorRfc').value = p.rfc || '';
      document.getElementById('proveedorTelefono').value = p.telefono || '';
      document.getElementById('proveedorEmail').value = p.email || '';
      document.getElementById('proveedorDireccion').value = p.direccion || '';
      document.getElementById('proveedorContacto').value = p.contactoNombre || '';
      document.getElementById('proveedorActivo').checked = p.activo !== false;
    }
  }
  modal.show();
}

async function guardarProveedor() {
  const data = {
    nombre: document.getElementById('proveedorNombre').value.trim(),
    rfc: document.getElementById('proveedorRfc').value.trim() || null,
    telefono: document.getElementById('proveedorTelefono').value.trim() || null,
    email: document.getElementById('proveedorEmail').value.trim() || null,
    direccion: document.getElementById('proveedorDireccion').value.trim() || null,
    contactoNombre: document.getElementById('proveedorContacto').value.trim() || null,
    activo: document.getElementById('proveedorActivo').checked,
  };

  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }

  try {
    if (state.editingId) {
      await API.put('/proveedores/' + state.editingId, data);
      Utils.showToast('Proveedor actualizado', 'success');
    } else {
      await API.post('/proveedores', data);
      Utils.showToast('Proveedor creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('proveedorModal'))?.hide();
    cargarProveedores(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction('\u00bfDesactivar este proveedor?', 'Confirmar', 'Desactivar');
  if (!confirmed) return;
  try {
    await API.del('/proveedores/' + id);
    Utils.showToast('Proveedor desactivado', 'success');
    cargarProveedores(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
