let state = { data: [], editingId: null };

export function init() {
  bindEvents();
  cargarTiposPago();
}

function bindEvents() {
  if (!Utils.hasPermiso('TIPOS_PAGO_CREAR')) {
    const btn = document.getElementById('btnNuevoTipoPago');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevoTipoPago')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarTipoPago')?.addEventListener('click', guardarTipoPago);
  document.getElementById('tableBody')?.addEventListener('click', handleTableClick);
}

async function cargarTiposPago() {
  try {
    state.data = await API.get('/tipos-pago');
    renderTable();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><i class="fas fa-credit-card"></i><p>No hay tipos de pago</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(t =>
    `<tr>
      <td>${t.idTipoPago}</td>
      <td><strong>${Utils.esc(t.nombre)}</strong></td>
      <td><span class="badge-status ${t.activo ? 'badge-active' : 'badge-inactive'}">${t.activo ? 'S&iacute;' : 'No'}</span></td>
      <td class="acciones-cell">
        <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${t.idTipoPago}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
      </td>
    </tr>`
  ).join('');
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const items = [];
    if (Utils.hasPermiso('TIPOS_PAGO_EDITAR')) {
      items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) });
    }
    if (Utils.hasPermiso('TIPOS_PAGO_ELIMINAR')) {
      items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => confirmarEliminar(id) });
    }
    if (items.length === 0) return;
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  if (btn.classList.contains('btn-action-edit')) abrirModal(id);
  else if (btn.classList.contains('btn-action-delete')) confirmarEliminar(id);
}

function abrirModal(id) {
  state.editingId = id;
  const modal = new bootstrap.Modal(document.getElementById('tipoPagoModal'));
  document.getElementById('tipoPagoModalTitle').textContent = id ? 'Editar Tipo de Pago' : 'Nuevo Tipo de Pago';
  document.getElementById('formTipoPago').reset();
  document.getElementById('tipoPagoId').value = '';

  if (id) {
    const t = state.data.find(t => t.idTipoPago === id);
    if (t) {
      document.getElementById('tipoPagoId').value = t.idTipoPago;
      document.getElementById('tipoPagoNombre').value = t.nombre || '';
    }
  }
  modal.show();
}

async function guardarTipoPago() {
  const nombre = document.getElementById('tipoPagoNombre').value.trim();
  if (!nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }

  try {
    if (state.editingId) {
      await API.put('/tipos-pago/' + state.editingId, { nombre });
      Utils.showToast('Tipo de pago actualizado', 'success');
    } else {
      await API.post('/tipos-pago', { nombre });
      Utils.showToast('Tipo de pago creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('tipoPagoModal'))?.hide();
    cargarTiposPago();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction('¿Eliminar este tipo de pago?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/tipos-pago/' + id);
    Utils.showToast('Tipo de pago eliminado', 'success');
    cargarTiposPago();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
