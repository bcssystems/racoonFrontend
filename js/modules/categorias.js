let state = { data: [], editingId: null, searchTerm: '' };

export function init() {
  bindEvents();
  cargarCategorias();
}

function bindEvents() {
  if (!Utils.hasPermiso('CATEGORIAS_CREAR')) {
    const btn = document.getElementById('btnNuevaCategoria');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevaCategoria')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarCategoria')?.addEventListener('click', guardarCategoria);
  document.getElementById('btnLimpiarCategoria')?.addEventListener('click', limpiarBusqueda);
  document.getElementById('searchCategoria')?.addEventListener('input', Utils.debounce(e => {
    state.searchTerm = e.target.value.trim();
    cargarCategorias();
  }, 350));
  document.getElementById('searchCategoria')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') cargarCategorias();
  });
  document.getElementById('tableBody')?.addEventListener('click', handleTableClick);
}

async function cargarCategorias() {
  try {
    const params = new URLSearchParams();
    params.set('page', 0);
    params.set('size', 100);
    params.set('sort', 'nombre,ASC');
    if (state.searchTerm) params.set('search', state.searchTerm);
    const result = await API.get('/categorias?' + params.toString());
    state.data = result.content || [];
    renderTable();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-th-large"></i><p>No hay categor&iacute;as</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(c =>
    `<tr>
      <td>${c.idCategoria}</td>
      <td><strong>${Utils.esc(c.nombre)}</strong></td>
      <td>${Utils.esc(c.descripcion) || '&mdash;'}</td>
      <td><span class="badge-status ${c.activo ? 'badge-active' : 'badge-inactive'}">${c.activo ? 'Activa' : 'Inactiva'}</span></td>
      <td class="acciones-cell">
        <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${c.idCategoria}" data-action="menu" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
      </td>
    </tr>`
  ).join('');
}

function handleTableClick(e) {
  const btn = e.target.closest('.kebab-trigger');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const cat = state.data.find(c => c.idCategoria === id);
  if (!cat) return;
  const items = [];
  if (Utils.hasPermiso('CATEGORIAS_EDITAR')) {
    items.push({ icon: 'fa-edit', text: 'Editar', onClick: () => abrirModal(id) });
  }
  if (Utils.hasPermiso('CATEGORIAS_ELIMINAR')) {
    if (cat.activo) {
      items.push({ icon: 'fa-ban', text: 'Desactivar', danger: true, onClick: () => desactivarCategoria(id) });
    } else {
      items.push({ icon: 'fa-check-circle', text: 'Activar', color: '#198754', onClick: () => activarCategoria(id) });
    }
  }
  if (items.length === 0) return;
  Utils.abrirMenuKebab(btn, items);
}

function limpiarBusqueda() {
  document.getElementById('searchCategoria').value = '';
  state.searchTerm = '';
  cargarCategorias();
}

function abrirModal(id) {
  state.editingId = id;
  const modal = new bootstrap.Modal(document.getElementById('categoriaModal'));
  document.getElementById('categoriaModalTitle').textContent = id ? 'Editar Categor&iacute;a' : 'Nueva Categoría';
  document.getElementById('formCategoria').reset();
  document.getElementById('categoriaId').value = '';

  if (id) {
    const c = state.data.find(c => c.idCategoria === id);
    if (c) {
      document.getElementById('categoriaId').value = c.idCategoria;
      document.getElementById('categoriaNombre').value = c.nombre || '';
      document.getElementById('categoriaDescripcion').value = c.descripcion || '';
    }
  }
  modal.show();
}

async function guardarCategoria() {
  const nombre = document.getElementById('categoriaNombre').value.trim();
  const descripcion = document.getElementById('categoriaDescripcion').value.trim();
  if (!nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }

  try {
    if (state.editingId) {
      await API.put('/categorias/' + state.editingId, { nombre, descripcion, activo: true });
      Utils.showToast('Categor&iacute;a actualizada', 'success');
    } else {
      await API.post('/categorias', { nombre, descripcion, activo: true });
      Utils.showToast('Categor&iacute;a creada', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('categoriaModal'))?.hide();
    cargarCategorias();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function desactivarCategoria(id) {
  const confirmed = await Utils.confirmAction('&iquest;Desactivar esta categor&iacute;a? Los productos la conservan pero ya no aparecer&aacute; en filtros nuevos.', 'Confirmar', 'Desactivar');
  if (!confirmed) return;
  try {
    await API.put('/categorias/' + id, { activo: false });
    Utils.showToast('Categor&iacute;a desactivada', 'success');
    cargarCategorias();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function activarCategoria(id) {
  try {
    await API.put('/categorias/' + id, { activo: true });
    Utils.showToast('Categor&iacute;a activada', 'success');
    cargarCategorias();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}