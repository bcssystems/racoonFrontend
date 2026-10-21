let state = { agenda: [], tiposPago: [], cajas: [], seleccion: null };
let cobranzaClienteDebounce;

export function init() {
  const hoy = fechaLocal(new Date());
  document.getElementById('cobranzaDesde').value = hoy;
  document.getElementById('cobranzaHasta').value = hoy;
  document.getElementById('btnBuscarCobranza')?.addEventListener('click', cargarAgenda);
  document.getElementById('cobranzaCliente')?.addEventListener('input', () => {
    clearTimeout(cobranzaClienteDebounce);
    cobranzaClienteDebounce = setTimeout(cargarAgenda, 400);
  });
  document.getElementById('btnHoyCobranza')?.addEventListener('click', () => {
    document.getElementById('cobranzaDesde').value = hoy;
    document.getElementById('cobranzaHasta').value = hoy;
    cargarAgenda();
  });
  document.getElementById('cobranzaAntiguedad')?.addEventListener('change', render);
  document.getElementById('tableCobranzaBody')?.addEventListener('click', manejarClick);
  document.getElementById('btnGuardarCobranzaAbono')?.addEventListener('click', guardarAbono);
  cargarCatalogos();
  cargarAgenda();
}

function fechaLocal(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function cargarCatalogos() {
  try { state.tiposPago = await API.get('/tipos-pago') || []; } catch (_) { state.tiposPago = []; }
  try { state.cajas = (await API.get('/cajas') || []).filter(c => c.estado === 'ABIERTA'); } catch (_) { state.cajas = []; }
  const pagos = document.getElementById('cobranzaAbonoTipoPago');
  if (pagos) pagos.innerHTML = state.tiposPago.map(t => '<option value="' + t.idTipoPago + '">' + Utils.esc(t.nombre) + '</option>').join('');
  const cajas = document.getElementById('cobranzaAbonoCaja');
  if (cajas) cajas.innerHTML = '<option value="">Seleccionar caja...</option>' + state.cajas.map(c => '<option value="' + c.idCaja + '">' + Utils.esc(c.nombre + ' - ' + (c.sucursalNombre || '')) + '</option>').join('');
  try {
    const personas = await API.get('/personas?page=0&size=100&activa=true&sort=nombre,ASC');
    const cobradores = document.getElementById('cobranzaCobrador');
    if (cobradores && personas?.content) {
      const puedeVerTodas = Utils.hasPermiso('COBRANZA_VER_TODAS') || Utils.hasPermiso('CREDITOS_ASIGNAR');
      cobradores.innerHTML = '<option value="">' + (puedeVerTodas ? 'Todos los cobradores' : 'Mi cartera') + '</option>' + personas.content.map(p =>
        '<option value="' + p.idPersona + '">' + Utils.esc((p.nombre || '') + ' ' + (p.apellido || '')) + '</option>'
      ).join('');
      if (!puedeVerTodas) cobradores.disabled = true;
    }
  } catch (_) {}
}

async function cargarAgenda() {
  const desde = document.getElementById('cobranzaDesde').value;
  const hasta = document.getElementById('cobranzaHasta').value;
  const estado = document.getElementById('cobranzaEstado').value;
  const idCobrador = document.getElementById('cobranzaCobrador')?.value;
  const cliente = document.getElementById('cobranzaCliente')?.value.trim();
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  if (estado) params.set('estado', estado);
  if (idCobrador) params.set('idCobrador', idCobrador);
  if (cliente) params.set('cliente', cliente);
  try {
    state.agenda = await API.get('/creditos/cobranza/agenda?' + params.toString()) || [];
    render();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function render() {
  const tbody = document.getElementById('tableCobranzaBody');
  const antiguedad = document.getElementById('cobranzaAntiguedad')?.value || '';
  const hoy = fechaLocal(new Date());
  const agenda = (state.agenda || []).filter(x => {
    const fecha = x.fechaVencimiento ? String(x.fechaVencimiento).slice(0, 10) : '';
    if (antiguedad === 'HOY') return fecha === hoy;
    if (antiguedad === 'ATRASADOS') return fecha < hoy && x.estado !== 'PAGADA' && (x.saldo || 0) > 0;
    return true;
  });
  document.getElementById('cobranzaTotal').textContent = agenda.length;
  document.getElementById('cobranzaSaldo').textContent = Utils.formatMonto(agenda.reduce((s, x) => s + (x.saldo || 0), 0));
  document.getElementById('cobranzaPagado').textContent = Utils.formatMonto(agenda.reduce((s, x) => s + (x.montoPagado || 0), 0));
  if (!tbody) return;
  if (!agenda.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-calendar-check"></i><p>No hay cobranzas para el periodo seleccionado</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = agenda.map(x => {
    const mapa = x.direccion ? ' <a target="_blank" title="Abrir ubicación" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(x.direccion) + '"><i class="fas fa-map-marker-alt"></i></a>' : '';
    const estado = x.estado === 'PAGADA' ? 'bg-success' : x.estado === 'PARCIAL' ? 'bg-info' : 'bg-warning text-dark';
    const atrasada = x.fechaVencimiento && String(x.fechaVencimiento).slice(0, 10) < hoy && x.estado !== 'PAGADA';
    return '<tr><td class="text-nowrap">' + (x.fechaVencimiento ? new Date(x.fechaVencimiento).toLocaleDateString() : '-') + (atrasada ? ' <span class="badge bg-danger">Atrasada</span>' : '') + '</td>' +
      '<td><strong>' + Utils.esc(x.clienteNombre || '') + '</strong><br><small class="text-muted">Parcialidad #' + x.numero + '</small></td>' +
      '<td>' + Utils.esc(x.telefono || '—') + '</td><td>' + Utils.esc(x.direccion || '—') + mapa + '</td>' +
      '<td>' + Utils.esc(x.folioCredito || ('#' + x.idCredito)) + '</td><td class="text-end">' + Utils.formatMonto(x.montoProgramado || 0) + '</td>' +
      '<td class="text-end fw-semibold">' + Utils.formatMonto(x.saldo || 0) + '</td><td><span class="badge ' + estado + '">' + Utils.esc(x.estado) + '</span></td>' +
      '<td>' + (x.saldo > 0 && Utils.hasPermiso('COBRANZA_ABONAR') ? '<button type="button" class="btn-kebab-toggle kebab-trigger cobranza-kebab" data-cobranza-id="' + x.idCredito + '" data-cobranza-parcialidad="' + x.idParcialidad + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>' : '') + '</td></tr>';
  }).join('');
}

function manejarClick(e) {
  const kebab = e.target.closest('.cobranza-kebab');
  if (kebab) {
    const item = state.agenda.find(x => x.idCredito === parseInt(kebab.dataset.cobranzaId) && x.idParcialidad === parseInt(kebab.dataset.cobranzaParcialidad));
    if (item) {
      Utils.abrirMenuKebab(kebab, [{
        icon: 'fa-money-bill-wave', text: 'Registrar abono', color: 'var(--success)',
        onClick: () => abrirModalAbono(item)
      }]);
    }
    return;
  }
  const btn = e.target.closest('[data-cobranza-id]');
  if (!btn) return;
  const item = state.agenda.find(x => x.idCredito === parseInt(btn.dataset.cobranzaId) && x.idParcialidad === parseInt(btn.dataset.cobranzaParcialidad));
  if (!item) return;
  abrirModalAbono(item);
}

function abrirModalAbono(item) {
  state.seleccion = item;
  document.getElementById('cobranzaAbonoInfo').innerHTML = '<strong>' + Utils.esc(item.clienteNombre) + '</strong><br>Crédito ' + Utils.esc(item.folioCredito || ('#' + item.idCredito)) + ' | Saldo: ' + Utils.formatMonto(item.saldo || 0);
  document.getElementById('cobranzaAbonoMonto').value = (item.saldo || 0).toFixed(2);
  document.getElementById('cobranzaAbonoCaja').value = state.cajas.length === 1 ? String(state.cajas[0].idCaja) : '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('cobranzaAbonoModal')).show();
}

async function guardarAbono() {
  if (!state.seleccion) return;
  const monto = parseFloat(document.getElementById('cobranzaAbonoMonto').value);
  const idCaja = parseInt(document.getElementById('cobranzaAbonoCaja').value) || null;
  const idTipoPago = parseInt(document.getElementById('cobranzaAbonoTipoPago').value) || null;
  if (!monto || monto <= 0) { Utils.showToast('Indica un monto válido', 'warning'); return; }
  if (!idCaja) { Utils.showToast('Selecciona una caja abierta', 'warning'); return; }
  if (!idTipoPago) { Utils.showToast('Selecciona una forma de pago', 'warning'); return; }
  try {
    await API.post('/creditos/cobranza/abonos', { idCredito: state.seleccion.idCredito, monto, tipo: 'PARCIAL', idTipoPago, idCaja });
    bootstrap.Modal.getInstance(document.getElementById('cobranzaAbonoModal'))?.hide();
    Utils.showToast('Cobranza registrada', 'success');
    cargarAgenda();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}
