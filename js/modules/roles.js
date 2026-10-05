let state = {
  data: [],
  editingId: null,
  permisosPorModulo: {},
};

export function init() {
  bindEvents();
  cargarRoles();
  cargarPermisos();
}

function bindEvents() {
  if (!Utils.hasPermiso('ROLES_CREAR')) {
    const btn = document.getElementById('btnNuevoRol');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevoRol')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarRol')?.addEventListener('click', guardarRol);
  document.getElementById('tableRolesBody')?.addEventListener('click', handleTableClick);
  document.getElementById('rolSeleccionarTodos')?.addEventListener('click', seleccionarTodos);
  document.getElementById('rolPermisosContainer')?.addEventListener('change', e => {
    if (e.target.classList.contains('rol-modulo-check')) seleccionarModuloRol(e.target);
  });
}

async function cargarPermisos() {
  try {
    state.permisosPorModulo = await API.get('/roles/permisos');
  } catch (err) {
    console.warn('No se pudieron cargar los permisos', err);
  }
}

async function cargarRoles() {
  try {
    state.data = await API.get('/roles');
    renderTable();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('tableRolesBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-user-shield"></i><p>No hay roles</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(r => {
    const permisos = r.permisos || [];
    const badges = permisos.length > 4
      ? permisos.slice(0, 4).map(p => `<span class="badge bg-primary text-white me-1">${Utils.esc(p)}</span>`).join('')
        + `<span class="badge bg-secondary text-white">+${permisos.length - 4}</span>`
      : permisos.map(p => `<span class="badge bg-primary text-white me-1">${Utils.esc(p)}</span>`).join('');
    return `<tr class="${r.activo === false ? 'inactive-row' : ''}">
      <td class="fw-semibold">${Utils.esc(r.nombre)}</td>
      <td>${Utils.esc(r.descripcion) || '-'}</td>
      <td class="permisos-cell">${badges || '<span class="text-muted">Sin permisos</span>'}</td>
      <td>${r.esSistema ? '<span class="badge bg-secondary text-white">Sistema</span>' : '<span class="badge bg-success text-white">Personalizado</span>'}</td>
      <td><span class="badge-status ${r.activo === false ? 'badge-inactive' : 'badge-active'}">${r.activo === false ? 'Inactivo' : 'Activo'}</span></td>
      <td class="acciones-cell">
        <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${r.idRol}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function buscarRol(id) {
  return (state.data || []).find(r => r.idRol === id);
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    abrirAccionesRol(kebab, parseInt(kebab.dataset.id));
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn || btn.disabled) return;
  const id = parseInt(btn.dataset.id);
  const rol = buscarRol(id);
  if (rol && rol.esSistema) return;
  if (btn.dataset.action === 'edit') abrirModal(id);
  else if (btn.dataset.action === 'delete') confirmarEliminar(id);
  else if (btn.dataset.action === 'reactivate') reactivarRol(id);
}

function abrirAccionesRol(anchor, id) {
  const rol = buscarRol(id);
  const activo = !rol || rol.activo !== false;
  const items = [
    { icon: 'fa-eye', text: 'Ver permisos', color: 'var(--info)', onClick: () => verRol(id) },
    ...(!rol || rol.esSistema || !Utils.hasPermiso('ROLES_EDITAR') ? [] : [
      { icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) },
    ]),
    ...(!rol || rol.esSistema || !Utils.hasPermiso('ROLES_ELIMINAR') ? [] : [
      activo
        ? { danger: true, icon: 'fa-trash', text: 'Desactivar', onClick: () => confirmarEliminar(id) }
        : { icon: 'fa-undo', text: 'Reactivar', color: 'var(--success)', onClick: () => reactivarRol(id) },
    ]),
  ];
  Utils.abrirMenuKebab(anchor, items);
}

function verRol(id) {
  const rol = buscarRol(id);
  if (!rol) return;
  const badges = (rol.permisos || []).map(p =>
    `<span class="badge bg-primary text-white me-1 mb-1">${Utils.esc(p)}</span>`).join('');
  const desc = rol.descripcion ? '<p class="text-muted mb-2">' + Utils.esc(rol.descripcion) + '</p>' : '';
  Utils.showDialog('Permisos del rol: ' + Utils.esc(rol.nombre),
    '<div class="small">' + desc + '<div>' + (badges || '<span class="text-muted">Sin permisos</span>') + '</div></div>');
}

function permisoIdsSeleccionados() {
  return Array.from(document.querySelectorAll('#rolPermisosContainer .rol-permiso-check:checked'))
    .map(cb => Number(cb.dataset.id));
}

function renderPermisos(seleccionadosIds, disabled) {
  const container = document.getElementById('rolPermisosContainer');
  if (!container) return;
  if (!state.permisosPorModulo || Object.keys(state.permisosPorModulo).length === 0) {
    container.innerHTML = '<div class="text-muted small">Cargando permisos...</div>';
    return;
  }

  let html = '';
  for (const [modulo, permisos] of Object.entries(state.permisosPorModulo)) {
    const moduloId = 'rol-mod-' + modulo;
    html += `<div class="mb-2 rol-modulo-grupo" data-modulo="${Utils.esc(modulo)}">
      <div class="d-flex align-items-center gap-2 mb-1">
        <input class="form-check-input rol-modulo-check" type="checkbox" id="${moduloId}" data-modulo="${Utils.esc(modulo)}" ${disabled ? 'disabled' : ''}>
        <label class="form-check-label fw-semibold small text-uppercase mb-0" for="${moduloId}" style="color:var(--primary)">${Utils.esc(modulo)}</label>
      </div>
      <div class="d-flex flex-wrap gap-2 ps-1">`;
    permisos.forEach(p => {
      const checked = (seleccionadosIds || []).includes(p.idPermiso) ? 'checked' : '';
      const onchange = disabled ? 'disabled' : '';
      html += `<label class="form-check form-check-inline" style="margin-right:.5rem;${disabled ? 'opacity:.7' : ''}">
        <input class="form-check-input rol-permiso-check" type="checkbox" data-modulo="${Utils.esc(modulo)}" data-id="${p.idPermiso}" ${checked} ${onchange}>
        <span class="form-check-label small">${Utils.esc(p.nombre)}</span>
      </label>`;
    });
    html += `</div></div>`;
  }
  container.innerHTML = html;
  sincronizarChecksModulos(container);
}

function sincronizarChecksModulos(container) {
  if (!container) return;
  container.querySelectorAll('.rol-modulo-grupo').forEach(grupo => {
    const checks = grupo.querySelectorAll('.rol-permiso-check');
    const moduloCheck = grupo.querySelector('.rol-modulo-check');
    if (!moduloCheck) return;
    const total = checks.length;
    const marcados = Array.from(checks).filter(c => c.checked).length;
    moduloCheck.checked = total > 0 && marcados === total;
    moduloCheck.indeterminate = marcados > 0 && marcados < total;
  });
}

function seleccionarModuloRol(moduloCheck) {
  const grupo = moduloCheck.closest('.rol-modulo-grupo');
  if (!grupo) return;
  const checked = moduloCheck.checked;
  grupo.querySelectorAll('.rol-permiso-check').forEach(cb => cb.checked = checked);
  sincronizarChecksModulos(document.getElementById('rolPermisosContainer'));
}

function seleccionarTodos(e) {
  const checked = e.target.checked;
  document.querySelectorAll('#rolPermisosContainer .rol-permiso-check').forEach(cb => {
    if (!cb.disabled) cb.checked = checked;
  });
  document.querySelectorAll('#rolPermisosContainer .rol-modulo-check').forEach(cb => {
    if (!cb.disabled) cb.checked = checked;
  });
  sincronizarChecksModulos(document.getElementById('rolPermisosContainer'));
}

function abrirModal(id) {
  state.editingId = id;
  const rol = id ? buscarRol(id) : null;
  if (id && rol && rol.esSistema) return;
  const modal = new bootstrap.Modal(document.getElementById('rolModal'));
  document.getElementById('rolModalTitle').textContent = id ? 'Editar Rol' : 'Nuevo Rol';
  document.getElementById('formRol').reset();
  document.getElementById('rolId').value = '';
  document.getElementById('rolSeleccionarTodos').checked = false;

  if (id && rol) {
    document.getElementById('rolId').value = rol.idRol;
    document.getElementById('rolNombre').value = rol.nombre || '';
    document.getElementById('rolDescripcion').value = rol.descripcion || '';
    document.getElementById('rolNombre').disabled = rol.esSistema;
    document.getElementById('rolDescripcion').disabled = rol.esSistema;
    renderPermisos(permisoIdsPorClaves(rol), rol.esSistema);
  } else {
    document.getElementById('rolNombre').disabled = false;
    document.getElementById('rolDescripcion').disabled = false;
    renderPermisos([], false);
  }
  modal.show();
}

function permisoIdsPorClaves(rol) {
  const claveToId = {};
  Object.values(state.permisosPorModulo).forEach(list => list.forEach(p => claveToId[p.clave] = p.idPermiso));
  return (rol.permisos || []).map(clave => claveToId[clave]).filter(v => v != null);
}

async function guardarRol() {
  const data = {
    nombre: document.getElementById('rolNombre').value.trim(),
    descripcion: document.getElementById('rolDescripcion').value.trim(),
    permisos: permisoIdsSeleccionados(),
  };

  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  if (data.permisos.length === 0) { Utils.showToast('Selecciona al menos un permiso', 'warning'); return; }

  try {
    if (state.editingId) {
      await API.put('/roles/' + state.editingId, data);
      Utils.showToast('Rol actualizado', 'success');
    } else {
      await API.post('/roles', data);
      Utils.showToast('Rol creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('rolModal'))?.hide();
    cargarRoles();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarEliminar(id) {
  const rol = buscarRol(id);
  if (rol && rol.esSistema) return;
  const confirmed = await Utils.confirmAction('¿Desactivar este rol?', 'Confirmar', 'Desactivar');
  if (!confirmed) return;
  try {
    await API.del('/roles/' + id);
    Utils.showToast('Rol desactivado', 'success');
    cargarRoles();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function reactivarRol(id) {
  try {
    await API.put('/roles/' + id + '/reactivar', {});
    Utils.showToast('Rol reactivado', 'success');
    cargarRoles();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}