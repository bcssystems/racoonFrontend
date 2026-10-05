let state = { data: [], editingId: null };

export function init() {
  bindEvents();
  cargarSucursales();
}

function bindEvents() {
  document.getElementById('btnGuardarSucursal')?.addEventListener('click', guardarSucursal);
  document.getElementById('tableSucursalesBody')?.addEventListener('click', handleTableClick);
}

async function cargarSucursales() {
  try {
    state.data = await API.get('/sucursales');
    renderTable();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('tableSucursalesBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-store"></i><p>No hay sucursales</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(s => `<tr class="${s.activa ? '' : 'inactive-row'}">
    <td>${Utils.esc(s.nombre)}</td>
    <td>${Utils.esc(s.direccion) || '-'}</td>
    <td>${Utils.esc(s.telefono) || '-'}</td>
    <td><span class="badge-status ${s.activa ? 'badge-active' : 'badge-inactive'}">${s.activa ? 'Activa' : 'Inactiva'}</span></td>
    <td class="acciones-cell">
      <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${s.idSucursal}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
    </td>
  </tr>`).join('');
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const items = [];
    if (Utils.hasPermiso('SUCURSALES_EDITAR')) {
      items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) });
    }
    if (Utils.hasPermiso('SUCURSALES_ELIMINAR')) {
      items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => confirmarEliminar(id) });
    }
    if (items.length === 0) return;
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  if (btn.dataset.action === 'edit' || btn.classList.contains('btn-action-edit')) abrirModal(id);
  else if (btn.dataset.action === 'delete' || btn.classList.contains('btn-action-delete')) confirmarEliminar(id);
}

function abrirModal(id) {
  state.editingId = id;
  const modal = new bootstrap.Modal(document.getElementById('sucursalModal'));
  document.getElementById('sucursalModalTitle').textContent = id ? 'Editar Sucursal' : 'Nueva Sucursal';
  document.getElementById('formSucursal').reset();
  document.getElementById('sucursalId').value = '';

  if (id) {
    const s = state.data.find(s => s.idSucursal === id);
    if (s) {
      document.getElementById('sucursalId').value = s.idSucursal;
      document.getElementById('sucursalNombre').value = s.nombre || '';
      document.getElementById('sucursalDireccion').value = s.direccion || '';
      document.getElementById('sucursalTelefono').value = s.telefono || '';
      document.getElementById('sucursalActiva').checked = s.activa !== false;
    }
  } else {
    document.getElementById('sucursalActiva').checked = true;
  }
  modal.show();
}

async function guardarSucursal() {
  const data = {
    nombre: document.getElementById('sucursalNombre').value.trim(),
    direccion: document.getElementById('sucursalDireccion').value.trim(),
    telefono: document.getElementById('sucursalTelefono').value.trim(),
    activa: document.getElementById('sucursalActiva').checked,
  };

  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }

  try {
    if (state.editingId) {
      await API.put('/sucursales/' + state.editingId, data);
      Utils.showToast('Sucursal actualizada', 'success');
    } else {
      await API.post('/sucursales', data);
      Utils.showToast('Sucursal creada', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('sucursalModal'))?.hide();
    cargarSucursales();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction('¿Desactivar esta sucursal?', 'Confirmar', 'Desactivar');
  if (!confirmed) return;
  try {
    await API.del('/sucursales/' + id);
    Utils.showToast('Sucursal desactivada', 'success');
    cargarSucursales();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
