import { printComprobanteAbono, printRemisionVenta } from './printing.js';

let state = { data: [], editingId: null, sucursales: [], movimientos: [], movimientosCajaId: null, filtroRequestId: 0 };

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
  document.getElementById('tableMovimientosBody')?.addEventListener('click', handleTableClick);
  document.getElementById('filtroSucursal')?.addEventListener('change', cargarCajas);
  document.getElementById('btnConfirmarMovimiento')?.addEventListener('click', confirmarMovimiento);
  document.getElementById('btnConfirmarApertura')?.addEventListener('click', confirmarApertura);
  document.getElementById('btnRealizarCorte')?.addEventListener('click', realizarCorte);
  document.getElementById('btnImprimirMovimientosCaja')?.addEventListener('click', () => {
    if (state.movimientosCajaId) imprimirMovimientosCaja(state.movimientosCajaId);
  });
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
  const requestId = ++state.filtroRequestId;
  try {
    const sucId = document.getElementById('filtroSucursal')?.value;
    const cajas = sucId ? await API.get('/cajas/sucursal/' + sucId) : await API.get('/cajas');
    if (requestId !== state.filtroRequestId || String(document.getElementById('filtroSucursal')?.value || '') !== String(sucId || '')) return;
    state.data = cajas || [];
    renderTable();
  } catch (err) {
    if (requestId !== state.filtroRequestId) return;
    Utils.showToast(err.message, 'error');
  }
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
  const movimientoKebab = e.target.closest('.movimiento-kebab');
  if (movimientoKebab) {
    e.preventDefault();
    e.stopPropagation();
    const movimiento = state.movimientos.find(m => m.idMovimientoCaja === parseInt(movimientoKebab.dataset.movimientoId));
    if (movimiento) {
      const items = [];
      if (movimiento.idAbono) items.push({
        icon: 'fa-print', text: 'Imprimir comprobante de abono', color: 'var(--primary)',
        onClick: () => printComprobanteAbono(movimiento, { clienteNombre: movimiento.clienteNombre, cajaNombre: movimiento.cajaNombre })
      });
      if (movimiento.idVenta && Utils.hasPermiso('VENTAS_VER')) items.push({
        icon: 'fa-receipt', text: 'Ver / imprimir venta', color: 'var(--info)',
        onClick: async () => {
          try { printRemisionVenta(await API.get('/ventas/' + movimiento.idVenta), { copies: 1 }); }
          catch (err) { Utils.showToast(err.message, 'error'); }
        }
      });
      if (!movimiento.cancelado && Utils.hasPermiso('CAJAS_MOVIMIENTO')) items.push({
        danger: true, icon: 'fa-ban',
        text: movimiento.estadoCancelacion === 'SOLICITADA' ? 'Procesar cancelación solicitada' : 'Cancelar movimiento',
        onClick: () => cancelarMovimientoCaja(movimiento)
      });
      if (!items.length) items.push({
        icon: 'fa-info-circle', text: movimiento.cancelado ? 'Movimiento cancelado' : 'Sin acciones disponibles', color: 'var(--muted)', onClick: () => {}
      });
      Utils.abrirMenuKebab(movimientoKebab, items);
    }
    return;
  }

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

async function abrirAperturaModal(id) {
  document.getElementById('apCajaId').value = id;
  document.getElementById('formApertura').reset();
  document.getElementById('apSaldoInicial').value = '0';
  const input = document.getElementById('apSaldoInicial');
  const info = document.getElementById('aperturaSaldoInfo');
  if (input) input.readOnly = false;
  if (info) info.textContent = 'Cargando fondo de apertura...';
  try {
    const sugerencia = await API.get('/cajas/' + id + '/apertura/saldo-inicial');
    if (String(document.getElementById('apCajaId').value) !== String(id)) return;
    if (input) {
      input.value = (Number(sugerencia.saldoInicial) || 0).toFixed(2);
      input.readOnly = sugerencia.tipoCaja !== 'SECUNDARIA';
    }
    if (info) info.textContent = sugerencia.tipoCaja === 'SECUNDARIA'
      ? 'Caja secundaria: se sugiere el fondo configurado como referencia; puedes ajustar el saldo inicial.'
      : 'Caja principal: se aplicará el fondo configurado para cajas normales.';
  } catch (err) {
    if (info) info.textContent = 'No se pudo consultar el fondo configurado: ' + err.message;
  }
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
    state.movimientosCajaId = id;
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

function imprimirMovimientosCaja(id) {
  const caja = state.data.find(c => c.idCaja === id);
  const movimientos = state.movimientos || [];
  const vigentes = movimientos.filter(m => !m.cancelado);
  const ingresos = vigentes.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + (Number(m.monto) || 0), 0);
  const egresos = vigentes.filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + (Number(m.monto) || 0), 0);
  const filas = movimientos.length ? movimientos.map(m => `<tr class="${m.cancelado ? 'cancelado' : ''}">
    <td>${Utils.esc(Utils.formatDateTime(m.fecha))}</td><td>${Utils.esc(m.tipo || '')}</td>
    <td>${Utils.esc(m.clienteNombre || (m.idVenta ? 'Venta #' + m.idVenta : m.motivo || '-'))}${m.folioCredito ? '<br>Crédito ' + Utils.esc(m.folioCredito) : ''}</td>
    <td>${Utils.esc(m.usuario || '')}</td><td>${m.cancelado ? 'CANCELADO' : 'VIGENTE'}</td>
    <td class="monto">${m.tipo === 'INGRESO' ? '+' : '-'}${Utils.formatMonto(m.monto || 0)}</td>
  </tr>`).join('') : '<tr><td colspan="6" class="empty">No hay movimientos registrados.</td></tr>';
  const win = window.open('', 'racoon-print-tab');
  if (!win) { Utils.showToast('Permite las ventanas emergentes para imprimir el reporte', 'warning'); return; }
  win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Movimientos de caja</title>
    <style>@page{size:landscape;margin:12mm}*{box-sizing:border-box}body{font:12px Arial;color:#000}h1{margin:0 0 6px}p{margin:3px 0}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #333;padding:6px;text-align:left}.monto{text-align:right;white-space:nowrap}.cancelado{color:#777;text-decoration:line-through}.empty{text-align:center;padding:20px}.totales{margin-top:12px;text-align:right;font-weight:bold}</style>
    </head><body><h1>Reporte de movimientos de caja</h1>
    <p><strong>Caja:</strong> ${Utils.esc(caja?.nombre || '')} &nbsp; <strong>Sucursal:</strong> ${Utils.esc(caja?.sucursalNombre || '')}</p>
    <p><strong>Estado:</strong> ${Utils.esc(caja?.estado || 'ABIERTA')} &nbsp; <strong>Apertura:</strong> ${Utils.esc(Utils.formatDateTime(caja?.fechaApertura))}</p>
    <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción / cliente</th><th>Usuario</th><th>Estado</th><th>Monto</th></tr></thead><tbody>${filas}</tbody></table>
    <div class="totales">Ingresos vigentes: ${Utils.formatMonto(ingresos)} &nbsp; Egresos vigentes: ${Utils.formatMonto(egresos)} &nbsp; Neto: ${Utils.formatMonto(ingresos - egresos)}</div>
    </body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 300);
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
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Total Gastos</small>
          <h5 class="mb-0 text-danger">-${Utils.formatMonto(corte.totalGastos || 0)}</h5>
        </div></div>
       </div>
       ${corte.anticipos && corte.anticipos.length > 0 ? `<hr><h6 class="fw-semibold">Anticipos en ventas a crédito</h6><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Venta</th><th>Cliente</th><th>Forma de pago</th><th class="text-end">Monto</th></tr></thead><tbody>${corte.anticipos.map(a => `<tr><td>#${a.idVenta || '-'}</td><td>${Utils.esc(a.cliente || '-')}</td><td>${Utils.esc(a.tipoPago || '-')}</td><td class="text-end">${Utils.formatMonto(a.monto || 0)}</td></tr>`).join('')}<tr class="fw-bold"><td colspan="3">Total anticipos</td><td class="text-end">${Utils.formatMonto(corte.totalAnticipos || 0)}</td></tr></tbody></table></div>` : ''}
       ${corte.detallePagos && corte.detallePagos.length > 0 ? `<hr><h6 class="fw-semibold">Conteo real por forma de pago</h6><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Forma de pago</th><th class="text-end">Sistema</th><th class="text-end">Real</th></tr></thead><tbody>${corte.detallePagos.map(d => `<tr><td>${Utils.esc(d.tipoPagoNombre || '')}</td><td class="text-end">${Utils.formatMonto(d.monto || 0)}</td><td><input type="number" class="form-control form-control-sm caja-corte-real-input text-end" data-id="${d.idTipoPago}" value="${d.montoReal != null ? Number(d.montoReal).toFixed(2) : ''}" min="0" step="0.01"></td></tr>`).join('')}</tbody></table></div>` : ''}
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
    const corte = await API.post('/cajas/' + id + '/corte', {});
      const inputs = document.querySelectorAll('.caja-corte-real-input');
      if (inputs.length > 0 && corte?.idCorte) {
      const pagos = Array.from(inputs).filter(input => input.value.trim() !== '').map(input => ({ idTipoPago: parseInt(input.dataset.id), montoReal: parseFloat(input.value) }));
      if (pagos.length > 0) await API.put('/cortes/' + corte.idCorte + '/detalle-pagos', { pagos });
    }
    Utils.showToast('Corte realizado exitosamente', 'success');
    bootstrap.Modal.getInstance(document.getElementById('cortePreviewModal'))?.hide();
    cargarCajas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
