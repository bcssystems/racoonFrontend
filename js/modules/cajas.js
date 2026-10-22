import { printComprobanteAbono, printRemisionVenta } from './printing.js';

let state = { data: [], editingId: null, sucursales: [], movimientos: [] };

export function init() {
  bindEvents();
  cargarSucursales();
  cargarCajas();
}

function bindEvents() {
  const crear = Utils.hasPermiso('CAJAS_CREAR');
  const btnNuevo = document.getElementById('btnNuevaCaja');
  if (btnNuevo && !crear) btnNuevo.style.display = 'none';
  btnNuevo?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarCaja')?.addEventListener('click', guardarCaja);
  document.getElementById('tableCajasBody')?.addEventListener('click', handleTableClick);
  document.getElementById('filtroSucursal')?.addEventListener('change', cargarCajas);
  document.getElementById('btnConfirmarMovimiento')?.addEventListener('click', confirmarMovimiento);
  document.getElementById('btnConfirmarApertura')?.addEventListener('click', confirmarApertura);
  document.getElementById('btnRealizarCorte')?.addEventListener('click', realizarCorte);
}

async function cargarSucursales() {
  try {
    state.sucursales = await API.get('/sucursales');
    const sel = document.getElementById('filtroSucursal');
    sel.innerHTML = '<option value="">Todas las sucursales</option>' +
      state.sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');

    const selCaja = document.getElementById('cajaSucursal');
    if (selCaja) {
      selCaja.innerHTML = state.sucursales.map(s =>
        `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
      Utils.makeSearchableSelect('cajaSucursal');
    }
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cargarCajas() {
  try {
    const sucId = document.getElementById('filtroSucursal')?.value;
    state.data = sucId ? await API.get('/cajas/sucursal/' + sucId) : await API.get('/cajas');
    renderTable();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderTable() {
  const tbody = document.getElementById('tableCajasBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-cash-register"></i><p>No hay cajas</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(c => {
    const activa = c.estado === 'ABIERTA';
    return `<tr>
      <td><strong>${Utils.esc(c.nombre)}</strong></td>
      <td><span class="badge-status ${c.tipo === 'SECUNDARIA' ? 'badge-warning' : 'badge-active'}">${c.tipo || 'PRINCIPAL'}</span></td>
      <td>${Utils.esc(c.sucursalNombre) || '-'}</td>
      <td><strong>${Utils.formatMonto(c.saldoActual)}</strong></td>
      <td><span class="badge-status ${activa ? 'badge-active' : 'badge-inactive'}">${c.estado}</span></td>
      <td>${Utils.formatDateTime(c.fechaApertura)}</td>
      <td class="acciones-cell">
        <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${c.idCaja}" data-estado="${c.estado}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger:not(.movimiento-kebab)');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const estado = kebab.dataset.estado;
    const abierta = estado === 'ABIERTA';
    const items = [
      { icon: 'fa-exchange-alt', text: 'Ver movimientos', color: 'var(--info)', onClick: () => verMovimientos(id) },
    ];
    if (Utils.hasPermiso('CAJAS_EDITAR')) {
      items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) });
    }
    if (abierta) {
      if (Utils.hasPermiso('CAJAS_CIERRE')) {
        items.push({ danger: true, icon: 'fa-lock', text: 'Cerrar caja', onClick: () => cerrarCaja(id) });
      }
      if (Utils.hasPermiso('CAJAS_CORTE')) {
        items.push({ icon: 'fa-calculator', text: 'Corte', color: 'var(--warning)', onClick: () => previewCorte(id) });
      }
    } else {
      if (Utils.hasPermiso('CAJAS_APERTURA')) {
        items.push({ icon: 'fa-unlock', text: 'Abrir caja', color: 'var(--success)', onClick: () => abrirAperturaModal(id) });
      }
    }
    if (Utils.hasPermiso('CAJAS_ELIMINAR')) {
      items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => confirmarEliminar(id) });
    }
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const movimientoKebab = e.target.closest('.movimiento-kebab');
  if (movimientoKebab) {
    const movimiento = state.movimientos.find(m => m.idMovimientoCaja === parseInt(movimientoKebab.dataset.movimientoId));
    if (movimiento) {
      const items = [];
       if (movimiento.idAbono) items.push({
          icon: 'fa-print', text: 'Imprimir comprobante de abono', color: 'var(--primary)',
          onClick: () => printComprobanteAbono(movimiento, {
            clienteNombre: movimiento.clienteNombre,
            cajaNombre: movimiento.cajaNombre
          })
         });
      if (movimiento.idVenta && Utils.hasPermiso('VENTAS_VER')) items.push({
        icon: 'fa-receipt', text: 'Ver / imprimir venta', color: 'var(--info)',
        onClick: async () => {
          try {
            const venta = await API.get('/ventas/' + movimiento.idVenta);
            printRemisionVenta(venta, { copies: 1 });
          } catch (err) { Utils.showToast(err.message, 'error'); }
        }
      });
      if (!movimiento.cancelado && Utils.hasPermiso('CAJAS_MOVIMIENTO')) items.push({
        danger: true, icon: 'fa-ban', text: 'Cancelar movimiento',
        onClick: () => cancelarMovimientoCaja(movimiento)
      });
      if (!items.length) items.push({
        icon: 'fa-info-circle', text: 'Sin acciones disponibles', color: 'var(--muted)',
        onClick: () => {}
      });
      Utils.abrirMenuKebab(movimientoKebab, items);
    }
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === 'edit' || (!action && btn.classList.contains('btn-action-edit'))) abrirModal(id);
  else if (action === 'delete' || (!action && btn.classList.contains('btn-action-delete'))) confirmarEliminar(id);
  else if (action === 'abrir') abrirAperturaModal(id);
  else if (action === 'cerrar') cerrarCaja(id);
  else if (action === 'corte-preview') previewCorte(id);
}

function abrirModal(id) {
  state.editingId = id;
  const modal = new bootstrap.Modal(document.getElementById('cajaModal'));
  document.getElementById('cajaModalTitle').textContent = id ? 'Editar Caja' : 'Nueva Caja';
  document.getElementById('formCaja').reset();
  document.getElementById('cajaId').value = '';

  if (id) {
    const c = state.data.find(c => c.idCaja === id);
    if (c) {
      document.getElementById('cajaId').value = c.idCaja;
      document.getElementById('cajaNombre').value = c.nombre || '';
      document.getElementById('cajaTipo').value = c.tipo || 'PRINCIPAL';
      document.getElementById('cajaSucursal').value = c.idSucursal || '';
      Utils.updateSearchableOptions('cajaSucursal');
    }
  }
  modal.show();
}

async function guardarCaja() {
  const data = {
    nombre: document.getElementById('cajaNombre').value.trim(),
    tipo: document.getElementById('cajaTipo').value,
    idSucursal: parseInt(document.getElementById('cajaSucursal').value),
  };

  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  if (!data.idSucursal) { Utils.showToast('Selecciona una sucursal', 'warning'); return; }

  try {
    if (state.editingId) {
      await API.put('/cajas/' + state.editingId, data);
      Utils.showToast('Caja actualizada', 'success');
    } else {
      await API.post('/cajas', data);
      Utils.showToast('Caja creada', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('cajaModal'))?.hide();
    cargarCajas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction('¿Eliminar esta caja?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/cajas/' + id);
    Utils.showToast('Caja eliminada', 'success');
    cargarCajas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function abrirAperturaModal(id) {
  document.getElementById('apCajaId').value = id;
  document.getElementById('formApertura').reset();
  document.getElementById('apSaldoInicial').value = '0';
  new bootstrap.Modal(document.getElementById('cajaAperturaModal')).show();
}

async function confirmarApertura() {
  const id = parseInt(document.getElementById('apCajaId').value);
  const saldoInicial = parseFloat(document.getElementById('apSaldoInicial').value);
  if (isNaN(saldoInicial) || saldoInicial < 0) {
    Utils.showToast('Ingresa un saldo inicial v&aacute;lido', 'warning');
    return;
  }
  try {
    await API.post('/cajas/' + id + '/apertura', { saldoInicial });
    Utils.showToast('Caja abierta', 'success');
    bootstrap.Modal.getInstance(document.getElementById('cajaAperturaModal'))?.hide();
    cargarCajas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cerrarCaja(id) {
  const confirmed = await Utils.confirmAction('¿Cerrar esta caja?', 'Confirmar', 'Cerrar');
  if (!confirmed) return;
  try {
    await API.post('/cajas/' + id + '/cierre', {});
    Utils.showToast('Caja cerrada', 'success');
    cargarCajas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarMovimiento() {
  const id = parseInt(document.getElementById('movCajaId').value);
  const tipo = document.getElementById('movTipo').value;
  const monto = parseFloat(document.getElementById('movMonto').value);
  const motivo = document.getElementById('movMotivo').value.trim();

  if (isNaN(monto) || monto <= 0) { Utils.showToast('Monto inv&aacute;lido', 'warning'); return; }

  const endpoint = tipo === 'INGRESO' ? '/cajas/' + id + '/ingresos' : '/cajas/' + id + '/egresos';
  try {
    await API.post(endpoint, { monto, motivo });
    Utils.showToast('Movimiento registrado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('cajaMovimientoModal'))?.hide();
    cargarCajas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function verMovimientos(id) {
  try {
    const movs = await API.get('/cajas/' + id + '/movimientos');
    state.movimientos = movs || [];
    const caja = state.data.find(c => c.idCaja === id);
    document.getElementById('movimientosModalTitle').textContent =
      'Movimientos - ' + (caja ? caja.nombre : '');

    const body = document.getElementById('tableMovimientosBody');
    if (!movs || movs.length === 0) {
      body.innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-exchange-alt"></i><p>Sin movimientos</p></div></td></tr>';
    } else {
      body.innerHTML = movs.map(m => {
        const esIngreso = m.tipo === 'INGRESO';
        return `<tr class="${m.cancelado ? 'text-muted text-decoration-line-through' : ''}">
          <td>${Utils.formatDateTime(m.fecha)}</td>
          <td><span class="badge-status ${esIngreso ? 'badge-active' : 'badge-inactive'}">${m.tipo}</span></td>
          <td style="color:${esIngreso ? 'var(--success)' : 'var(--danger)'};font-weight:600">
            ${esIngreso ? '+' : '-'}${Utils.formatMonto(m.monto)}
          </td>
          <td>${m.clienteNombre ? '<strong>' + Utils.esc(m.clienteNombre) + '</strong><br><small>Crédito ' + Utils.esc(m.folioCredito || ('#' + m.idCredito)) + '</small>' : m.idVenta ? '<strong>Venta #' + m.idVenta + '</strong><br><small>' + (Utils.esc(m.motivo) || '-') + '</small>' : (Utils.esc(m.motivo) || '-')}</td>
          <td><button type="button" class="btn-kebab-toggle kebab-trigger movimiento-kebab" data-movimiento-id="${m.idMovimientoCaja}" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>
        </tr>`;
      }).join('');
    }
    new bootstrap.Modal(document.getElementById('movimientosModal')).show();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cancelarMovimientoCaja(movimiento) {
  const descripcion = movimiento.idAbono
    ? 'el abono de ' + (movimiento.clienteNombre || 'Cliente') + ' al crédito #' + movimiento.idCredito
    : 'el movimiento de caja #' + movimiento.idMovimientoCaja;
  try {
    if (Utils.hasPermiso('CANCELACIONES_AUTORIZAR')) {
      const ok = await Utils.confirm('Se cancelará ' + descripcion + ' y se revertirá el saldo de caja.', 'Cancelar movimiento');
      if (!ok) return;
      await API.post('/cajas/movimientos/' + movimiento.idMovimientoCaja + '/cancelar', {});
      Utils.showToast('Movimiento cancelado', 'success');
    } else if (movimiento.estadoCancelacion === 'SOLICITADA') {
      const codigo = await Utils.promptInput('Código de autorización', 'Ingresa el código generado por el administrador', '');
      if (codigo === null || !/^\d{4}$/.test(String(codigo).trim())) return;
      await API.post('/cajas/movimientos/' + movimiento.idMovimientoCaja + '/cancelar', { codigo: String(codigo).trim() });
      Utils.showToast('Movimiento cancelado', 'success');
    } else {
      const motivo = await Utils.promptInput('Solicitar cancelación', 'Indica el motivo de la cancelación', '');
      if (motivo === null || !motivo.trim()) return;
      await API.post('/cajas/movimientos/' + movimiento.idMovimientoCaja + '/solicitar-cancelacion', { motivo: motivo.trim() });
      Utils.showToast('Solicitud enviada al administrador', 'success');
    }
    const cajaId = movimiento.idCaja;
    await verMovimientos(cajaId);
    cargarCajas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function previewCorte(id) {
  try {
    const corte = await API.get('/cajas/' + id + '/corte-preview');
    const body = document.getElementById('cortePreviewBody');
    document.getElementById('cortePreviewTitle').textContent =
      'Vista Previa de Corte - ' + (state.data.find(c => c.idCaja === id)?.nombre || '');

    body.innerHTML = `
      <div class="row g-3">
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Saldo Inicial</small>
          <h4 class="mb-0">${Utils.formatMonto(corte.saldoInicial)}</h4>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Total Ventas</small>
          <h4 class="mb-0 text-success">${Utils.formatMonto(corte.totalVentas)}</h4>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Contado</small>
          <h5 class="mb-0">${Utils.formatMonto(corte.totalVentasContado)}</h5>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Cr&eacute;dito</small>
          <h5 class="mb-0">${Utils.formatMonto(corte.totalVentasCredito)}</h5>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Ingresos</small>
          <h5 class="mb-0 text-success">${Utils.formatMonto(corte.totalIngresos)}</h5>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Egresos</small>
          <h5 class="mb-0 text-danger">${Utils.formatMonto(corte.totalEgresos)}</h5>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Abonos (Cr\u00e9ditos)</small>
          <h5 class="mb-0" style="color:var(--info)">${Utils.formatMonto(corte.totalAbonos || 0)}</h5>
        </div></div>
      </div>
      <hr>
      <div class="text-center">
        <h5>Saldo Esperado</h5>
        <h3 class="fw-bold" style="color:var(--primary)">${Utils.formatMonto(corte.saldoEsperado)}</h3>
      </div>
    `;
    document.getElementById('btnRealizarCorte').dataset.cajaId = id;
    new bootstrap.Modal(document.getElementById('cortePreviewModal')).show();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function realizarCorte() {
  const id = parseInt(document.getElementById('btnRealizarCorte').dataset.cajaId);
  try {
    await API.post('/cajas/' + id + '/corte', {});
    Utils.showToast('Corte realizado exitosamente', 'success');
    bootstrap.Modal.getInstance(document.getElementById('cortePreviewModal'))?.hide();
    cargarCajas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
