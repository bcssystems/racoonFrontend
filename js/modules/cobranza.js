let state = { agenda: [], calendario: [], pagina: 0, totalPaginas: 0, totalElementos: 0, tiposPago: [], cajas: [], seleccion: null, tarjeta: '' };
let cobranzaClienteDebounce;

export function init() {
  const hoy = fechaLocal(new Date());
  ['cobranzaDia', 'cobranzaEstado', 'cobranzaCobrador'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => { state.pagina = 0; state.tarjeta = ''; cargarAgenda(); });
  });
  document.getElementById('cobranzaCliente')?.addEventListener('input', () => {
    clearTimeout(cobranzaClienteDebounce);
    cobranzaClienteDebounce = setTimeout(() => { state.pagina = 0; state.tarjeta = ''; cargarAgenda(); }, 400);
  });
  document.getElementById('btnHoyCobranza')?.addEventListener('click', () => {
    document.getElementById('cobranzaDia').value = String(new Date().getDay());
    cargarAgenda();
  });
  document.getElementById('cobranzaAntiguedad')?.addEventListener('change', () => { state.pagina = 0; state.tarjeta = ''; cargarAgenda(); });
  document.querySelectorAll('[data-cobranza-card]').forEach(card => card.addEventListener('click', () => {
    state.tarjeta = card.dataset.cobranzaCard || '';
    if (state.tarjeta === 'HOY') { document.getElementById('cobranzaDia').value = String(new Date().getDay()); document.getElementById('cobranzaAntiguedad').value = ''; }
    if (state.tarjeta === 'SEMANA') { document.getElementById('cobranzaDia').value = 'SEMANA'; document.getElementById('cobranzaAntiguedad').value = ''; }
    if (state.tarjeta === 'ATRASADOS') { document.getElementById('cobranzaDia').value = 'SEMANA'; document.getElementById('cobranzaAntiguedad').value = 'ATRASADOS'; }
    state.pagina = 0; cargarAgenda();
  }));
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
  const cobradores = document.getElementById('cobranzaCobrador');
  const puedeVerTodas = Utils.hasPermiso('COBRANZA_VER_TODAS');
  if (cobradores && !puedeVerTodas) {
    cobradores.innerHTML = '<option value="ME">Mi cartera</option>';
    cobradores.disabled = true;
    return;
  }
  if (cobradores && puedeVerTodas) {
    try {
      const cobradoresDisponibles = await API.get('/creditos/cobradores');
    cobradores.innerHTML = '<option value="">Todos los cobradores</option><option value="ME">Mi cartera</option>' + (cobradoresDisponibles || []).map(p =>
        '<option value="' + p.idPersona + '">' + Utils.esc((p.nombre || '') + ' ' + (p.apellido || '')) + '</option>'
      ).join('');
    } catch (_) {
      cobradores.innerHTML = '<option value="">Todos los cobradores</option><option value="ME">Mi cartera</option>';
    }
  }
}

async function cargarAgenda() {
  const dia = document.getElementById('cobranzaDia')?.value || 'SEMANA';
  const rango = rangoSemana(dia);
  const estado = document.getElementById('cobranzaEstado').value;
  const idCobrador = document.getElementById('cobranzaCobrador')?.value;
  const cliente = document.getElementById('cobranzaCliente')?.value.trim();
  const params = new URLSearchParams();
  params.set('desde', rango.desde); params.set('hasta', rango.hasta);
  if (estado) params.set('estado', estado);
  if (idCobrador && idCobrador !== 'ME') params.set('idCobrador', idCobrador);
  if (idCobrador === 'ME') params.set('miCartera', 'true');
  if (cliente) params.set('cliente', cliente);
  params.set('page', String(state.pagina)); params.set('size', '10');
  const tablaParams = params.toString();
  const calendarioParams = new URLSearchParams(params); const semana = rangoSemana('SEMANA'); calendarioParams.set('desde', semana.desde); calendarioParams.set('hasta', semana.hasta); calendarioParams.set('page', '0'); calendarioParams.set('size', '100');
  try {
    const [tabla, calendario] = await Promise.all([
      API.get('/creditos/cobranza/agenda?' + tablaParams),
      API.get('/creditos/cobranza/agenda?' + calendarioParams.toString())
    ]);
    const page = tabla && Array.isArray(tabla.content) ? tabla : { content: Array.isArray(tabla) ? tabla : [], totalPages: 1, totalElements: Array.isArray(tabla) ? tabla.length : 0 };
    state.agenda = page.content || [];
    state.calendario = calendario?.content || (Array.isArray(calendario) ? calendario : []);
    state.totalPaginas = page.totalPages || 1; state.totalElementos = page.totalElements || state.agenda.length;
    render();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function rangoSemana(dia) {
  const ahora = new Date(); const actual = ahora.getDay();
  const lunes = new Date(ahora); lunes.setHours(0, 0, 0, 0); lunes.setDate(ahora.getDate() - (actual === 0 ? 6 : actual - 1));
  const desde = new Date(lunes); const hasta = new Date(lunes);
  if (dia !== 'SEMANA') { const offset = dia === '0' ? 6 : Number(dia) - 1; desde.setDate(lunes.getDate() + offset); hasta.setDate(lunes.getDate() + offset); }
  return { desde: fechaLocal(desde), hasta: fechaLocal(dia === 'SEMANA' ? new Date(lunes.getTime() + 6 * 86400000) : hasta) };
}

function render() {
  const tbody = document.getElementById('tableCobranzaBody');
  const antiguedad = document.getElementById('cobranzaAntiguedad')?.value || '';
  const hoy = fechaLocal(new Date());
  const agendaCalendario = (state.calendario || []).filter(x => {
    const fecha = x.fechaVencimiento ? String(x.fechaVencimiento).slice(0, 10) : '';
    if (antiguedad === 'HOY') return fecha === hoy;
    if (antiguedad === 'ATRASADOS') return fecha < hoy && x.estado !== 'PAGADA' && (x.saldo || 0) > 0;
    return true;
  });
  const unique = (items) => new Set(items.map(x => x.idCredito)).size;
  const resumen = state.calendario || [];
  document.getElementById('cobranzaCreditosDia').textContent = unique(resumen.filter(x => String(x.fechaVencimiento || '').slice(0, 10) === hoy));
  document.getElementById('cobranzaCreditosAtrasados').textContent = unique(resumen.filter(x => String(x.fechaVencimiento || '').slice(0, 10) < hoy && x.estado !== 'PAGADA' && (x.saldo || 0) > 0));
  document.getElementById('cobranzaCarteraSemanal').textContent = unique(resumen.filter(x => (x.saldo || 0) > 0));
  const agenda = (state.agenda || []).filter(x => {
    const fecha = x.fechaVencimiento ? String(x.fechaVencimiento).slice(0, 10) : '';
    if (state.tarjeta === 'HOY') return fecha === hoy;
    if (state.tarjeta === 'ATRASADOS') return fecha < hoy && x.estado !== 'PAGADA' && (x.saldo || 0) > 0;
    if (antiguedad === 'HOY') return fecha === hoy;
    if (antiguedad === 'ATRASADOS') return fecha < hoy && x.estado !== 'PAGADA' && (x.saldo || 0) > 0;
    return true;
  });
  if (!tbody) return;
  if (!agenda.length) {
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-calendar-check"></i><p>No hay cobranzas para el periodo seleccionado</p></div></td></tr>';
    renderPagination(); renderCalendar(agendaCalendario); return;
  }
  tbody.innerHTML = agenda.map(x => {
    const queryMapa = x.latitud != null && x.longitud != null ? x.latitud + ',' + x.longitud : x.direccion;
    const mapa = queryMapa ? ' <a target="_blank" title="Abrir ubicación en Google Maps" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(queryMapa) + '"><i class="fas fa-map-marker-alt"></i></a>' : '';
    const estado = x.estado === 'PAGADA' ? 'bg-success' : x.estado === 'PARCIAL' ? 'bg-info' : 'bg-warning text-dark';
    const atrasada = x.fechaVencimiento && String(x.fechaVencimiento).slice(0, 10) < hoy && x.estado !== 'PAGADA';
    return '<tr><td class="text-nowrap">' + (x.fechaVencimiento ? new Date(x.fechaVencimiento).toLocaleDateString() : '-') + (atrasada ? ' <span class="badge bg-danger">Atrasada</span>' : '') + '</td>' +
      '<td><strong>' + Utils.esc(x.clienteNombre || '') + '</strong><br><small class="text-muted">Parcialidad #' + x.numero + '</small></td>' +
      '<td>' + Utils.esc(x.telefono || '—') + '</td><td>' + Utils.esc(x.direccion || '—') + mapa + '</td>' +
      '<td>' + Utils.esc(x.folioCredito || ('#' + x.idCredito)) + '</td><td class="text-end">' + Utils.formatMonto(x.montoProgramado || 0) + '</td>' +
      '<td class="text-end fw-semibold">' + Utils.formatMonto(x.saldo || 0) + '</td><td><span class="badge ' + estado + '">' + Utils.esc(x.estado) + '</span></td>' +
      '<td>' + '<button type="button" class="btn-kebab-toggle kebab-trigger cobranza-kebab" data-cobranza-id="' + x.idCredito + '" data-cobranza-parcialidad="' + x.idParcialidad + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>' + '</td></tr>';
  }).join('');
  renderPagination(); renderCalendar(agendaCalendario);
}

function renderPagination() {
  const el = document.getElementById('cobranzaPagination'); if (!el) return;
  if (state.totalPaginas <= 1) { el.innerHTML = '<small class="text-muted">' + state.totalElementos + ' registro(s)</small>'; return; }
  let html = '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">' + state.totalElementos + ' registro(s)</small><div class="btn-group btn-group-sm">';
  html += '<button class="btn btn-outline-secondary" data-page="' + (state.pagina - 1) + '" ' + (state.pagina === 0 ? 'disabled' : '') + '>Anterior</button>';
  for (let i = 0; i < state.totalPaginas; i++) if (i < 3 || i >= state.totalPaginas - 2 || Math.abs(i - state.pagina) <= 1) html += '<button class="btn ' + (i === state.pagina ? 'btn-primary' : 'btn-outline-secondary') + '" data-page="' + i + '">' + (i + 1) + '</button>';
  html += '<button class="btn btn-outline-secondary" data-page="' + (state.pagina + 1) + '" ' + (state.pagina >= state.totalPaginas - 1 ? 'disabled' : '') + '>Siguiente</button></div></div>';
  el.innerHTML = html; el.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => { state.pagina = Number(b.dataset.page); cargarAgenda(); }));
}

function renderCalendar(items) {
  const el = document.getElementById('cobranzaCalendario'); if (!el) return;
  const ahora = new Date(); const actual = ahora.getDay(); const lunes = new Date(ahora); lunes.setHours(0, 0, 0, 0); lunes.setDate(ahora.getDate() - (actual === 0 ? 6 : actual - 1));
  const nombres = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  el.innerHTML = nombres.map((nombre, index) => {
    const fecha = new Date(lunes); fecha.setDate(lunes.getDate() + index); const clave = fechaLocal(fecha);
    const eventos = items.filter(x => String(x.fechaVencimiento || '').slice(0, 10) === clave);
    return '<div class="cobranza-day"><div class="cobranza-day-title">' + nombre + ' ' + fecha.getDate() + '</div>' + (eventos.length ? eventos.map(x => '<button type="button" class="cobranza-event ' + (clave < fechaLocal(new Date()) && x.estado !== 'PAGADA' ? 'atrasado' : '') + ' cobranza-calendar-item" data-cobranza-id="' + x.idCredito + '" data-cobranza-parcialidad="' + x.idParcialidad + '"><strong>' + Utils.esc(x.clienteNombre || '') + '</strong><br>' + Utils.esc(x.folioCredito || ('#' + x.idCredito)) + ' · ' + Utils.formatMonto(x.saldo || 0) + '<span class="float-end">⋮</span></button>').join('') : '<small class="text-muted">Sin cobros</small>') + '</div>';
  }).join('');
}

function manejarClick(e) {
  const kebab = e.target.closest('.cobranza-kebab');
  if (kebab) {
    const item = buscarItem(kebab.dataset.cobranzaId, kebab.dataset.cobranzaParcialidad);
    if (item) {
      const items = [{ icon: 'fa-eye', text: 'Ver detalle del crédito', color: 'var(--info)', onClick: () => verDetalleCredito(item) }];
      if (item.saldo > 0 && Utils.hasPermiso('COBRANZA_ABONAR')) items.push({ icon: 'fa-money-bill-wave', text: 'Registrar abono', color: 'var(--success)', onClick: () => abrirModalAbono(item) });
      Utils.abrirMenuKebab(kebab, items);
    }
    return;
  }
  const btn = e.target.closest('[data-cobranza-id]');
  if (!btn) return;
  const item = buscarItem(btn.dataset.cobranzaId, btn.dataset.cobranzaParcialidad);
  if (!item) return;
  verDetalleCredito(item);
}

function buscarItem(idCredito, idParcialidad) {
  const id = parseInt(idCredito); const parcialidad = parseInt(idParcialidad);
  return [...(state.agenda || []), ...(state.calendario || [])].find(x => x.idCredito === id && x.idParcialidad === parcialidad);
}

async function verDetalleCredito(item) {
  try {
    const parcialidades = await API.get('/creditos/' + item.idCredito + '/parcialidades') || [];
    const filas = parcialidades.map(p => '<tr><td>#' + p.numero + '</td><td>' + Utils.formatDateTime(p.fechaVencimiento) + '</td><td>' + Utils.formatMonto((p.capitalProgramado || 0) + (p.interesProgramado || 0)) + '</td><td>' + Utils.formatMonto((p.capitalPagado || 0) + (p.interesPagado || 0)) + '</td><td>' + Utils.esc(p.estado || '') + '</td></tr>').join('');
    const boton = item.saldo > 0 && Utils.hasPermiso('COBRANZA_ABONAR') ? '<button type="button" class="btn btn-success btn-sm" id="btnDetalleCobranzaAbono"><i class="fas fa-money-bill-wave me-1"></i>Registrar abono</button>' : '';
    Utils.showDialog('Detalle del crédito ' + Utils.esc(item.folioCredito || ('#' + item.idCredito)), '<div class="row g-2 mb-3"><div class="col-md-6"><strong>Cliente:</strong> ' + Utils.esc(item.clienteNombre || '-') + '</div><div class="col-md-6"><strong>Saldo:</strong> ' + Utils.formatMonto(item.saldo || 0) + '</div><div class="col-md-6"><strong>Teléfono:</strong> ' + Utils.esc(item.telefono || '-') + '</div><div class="col-md-6"><strong>Dirección:</strong> ' + Utils.esc(item.direccion || '-') + '</div></div><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Parcialidad</th><th>Vencimiento</th><th>Programado</th><th>Pagado</th><th>Estado</th></tr></thead><tbody>' + (filas || '<tr><td colspan="5">Sin parcialidades</td></tr>') + '</tbody></table></div><div class="text-end mt-3">' + boton + '</div>');
    document.getElementById('btnDetalleCobranzaAbono')?.addEventListener('click', () => { document.getElementById('dynamicDialog')?.remove(); abrirModalAbono(item); });
  } catch (err) { Utils.showToast(err.message, 'error'); }
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
