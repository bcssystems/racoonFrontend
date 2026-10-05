let state = { data: [], cajas: [], filtro: 'pendientes' };

export function init() {
  bindEvents();
  cargarCajas();
  cargarGastos();
}

function bindEvents() {
  document.getElementById('tableGastosBody')?.addEventListener('click', handleTableClick);
  document.getElementById('filtroCajaGasto')?.addEventListener('change', cargarGastos);
  document.querySelectorAll('input[name="filtroGasto"]').forEach(r => {
    r.addEventListener('change', e => {
      state.filtro = e.target.value;
      document.getElementById('filtroCajaGasto').value = '';
      cargarGastos();
    });
  });
}

async function cargarCajas() {
  try {
    state.cajas = await API.get('/cajas');
    const sel = document.getElementById('filtroCajaGasto');
    if (sel) {
      sel.innerHTML = '<option value="">Todas las cajas</option>' +
        state.cajas.map(c => `<option value="${c.idCaja}">${Utils.esc(c.nombre)}</option>`).join('');
    }
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cargarGastos() {
  const cajaId = document.getElementById('filtroCajaGasto')?.value;
  try {
    if (cajaId) {
      state.data = await API.get('/gastos/caja/' + cajaId);
    } else if (state.filtro === 'pendientes') {
      state.data = await API.get('/gastos/pendientes');
    } else {
      const all = await API.get('/gastos/todos');
      if (state.filtro === 'autorizados') {
        state.data = all.filter(g => g.estado === 'AUTORIZADO');
      } else if (state.filtro === 'rechazados') {
        state.data = all.filter(g => g.estado === 'RECHAZADO');
      } else {
        state.data = all;
      }
    }
    renderTable();
  } catch (err) {
    state.data = [];
    renderTable();
  }
}

function renderTable() {
  const tbody = document.getElementById('tableGastosBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-money-bill-wave"></i><p>No hay gastos</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(g => {
    const badgeClass = {
      'PENDIENTE': 'badge-warning',
      'AUTORIZADO': 'badge-active',
      'RECHAZADO': 'badge-inactive',
    }[g.estado] || 'badge-inactive';

    return `<tr>
      <td>${Utils.esc(g.cajaNombre) || '-'}</td>
      <td>${Utils.esc(g.sucursalNombre) || '-'}</td>
      <td>${Utils.esc(g.descripcion)}</td>
      <td><strong>${Utils.formatMonto(g.monto)}</strong></td>
      <td>${Utils.esc(g.usuario) || '-'}</td>
      <td><span class="badge-status ${badgeClass}">${g.estado}</span></td>
      <td>${Utils.formatDateTime(g.fechaCreacion)}</td>
      <td class="acciones-cell">
        ${g.estado === 'PENDIENTE'
          ? `<button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${g.idGasto}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>`
          : '-'}
      </td>
    </tr>`;
  }).join('');
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const items = [];
    if (Utils.hasPermiso('GASTOS_AUTORIZAR')) {
      items.push({ icon: 'fa-check', text: 'Autorizar', color: 'var(--success)', onClick: () => confirmarAccion(id, 'autorizar') });
    }
    if (Utils.hasPermiso('GASTOS_RECHAZAR')) {
      items.push({ danger: true, icon: 'fa-times', text: 'Rechazar', onClick: () => confirmarAccion(id, 'rechazar') });
    }
    if (items.length > 0) Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'autorizar') confirmarAccion(id, 'autorizar');
  else if (action === 'rechazar') confirmarAccion(id, 'rechazar');
}

async function confirmarAccion(id, accion) {
  const msg = accion === 'autorizar' ? '\u00bfAutorizar este gasto?' : '\u00bfRechazar este gasto?';
  const confirmed = await Utils.confirmAction(msg, 'Confirmar', accion === 'autorizar' ? 'Autorizar' : 'Rechazar');
  if (!confirmed) return;
  try {
    await API.post('/gastos/' + id + '/' + accion, {});
    Utils.showToast('Gasto ' + (accion === 'autorizar' ? 'autorizado' : 'rechazado'), 'success');
    cargarGastos();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
