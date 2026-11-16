let state = { items: [], calendario: [], pagina: 0, totalPaginas: 1, totalElementos: 0, selected: null, tiposPago: [], cajas: [] };
let debounce;

export function init() {
  ['carteraCobrador', 'carteraEstado'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { state.pagina = 0; cargar(); }));
  document.getElementById('carteraCliente')?.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => { state.pagina = 0; cargar(); }, 350); });
  document.getElementById('btnActualizarCartera')?.addEventListener('click', () => cargar());
  document.getElementById('carteraCobranzaBody')?.addEventListener('click', manejarClick);
  document.getElementById('btnGuardarCarteraAbono')?.addEventListener('click', guardarAbono);
  cargarCatalogos();
  cargarCobradores().finally(() => cargar());
}

function fechaLocal(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function semana() {
  const hoy = new Date(); const dia = hoy.getDay();
  const lunes = new Date(hoy); lunes.setHours(0, 0, 0, 0); lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1));
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  return { desde: fechaLocal(lunes), hasta: fechaLocal(domingo) };
}
function lista(respuesta) { return Array.isArray(respuesta) ? respuesta : (Array.isArray(respuesta?.content) ? respuesta.content : []); }

async function cargarCobradores() {
  const select = document.getElementById('carteraCobrador'); if (!select) return;
  if (!Utils.hasPermiso('COBRANZA_VER_TODAS')) { select.innerHTML = '<option value="ME">Mi cartera</option>'; select.value = 'ME'; select.disabled = true; return; }
  try {
    const personas = lista(await API.get('/creditos/cobradores'));
    select.innerHTML = '<option value="">Todos los cobradores</option><option value="ME">Mi cartera</option>' + personas.map(p => '<option value="' + p.idPersona + '">' + Utils.esc((p.nombre || '') + ' ' + (p.apellido || '')) + '</option>').join('');
    const elegido = sessionStorage.getItem('cobranzaCarteraCobrador');
    if (elegido) { select.value = elegido; sessionStorage.removeItem('cobranzaCarteraCobrador'); }
  } catch (_) {}
}
async function cargarCatalogos() {
  try { state.tiposPago = lista(await API.get('/tipos-pago')); } catch (_) { state.tiposPago = []; }
  try { state.cajas = lista(await API.get('/cajas')).filter(c => c.estado === 'ABIERTA'); } catch (_) { state.cajas = []; }
  const pagos = document.getElementById('carteraAbonoTipoPago'); if (pagos) pagos.innerHTML = state.tiposPago.map(t => '<option value="' + t.idTipoPago + '">' + Utils.esc(t.nombre) + '</option>').join('');
  const cajas = document.getElementById('carteraAbonoCaja'); if (cajas) cajas.innerHTML = '<option value="">Seleccionar caja...</option>' + state.cajas.map(c => '<option value="' + c.idCaja + '">' + Utils.esc(c.nombre + ' - ' + (c.sucursalNombre || '')) + '</option>').join('');
}
async function cargar() {
  const rango = semana(); const params = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta, page: String(state.pagina), size: '20' });
  const cobrador = document.getElementById('carteraCobrador')?.value; const estado = document.getElementById('carteraEstado')?.value; const cliente = document.getElementById('carteraCliente')?.value.trim();
  if (cobrador === 'ME') params.set('miCartera', 'true'); else if (cobrador) params.set('idCobrador', cobrador);
  if (estado) params.set('estado', estado); if (cliente) params.set('cliente', cliente);
  const calendarioParams = new URLSearchParams(params); calendarioParams.set('page', '0'); calendarioParams.set('size', '100');
  try {
    const [respuesta, calendario] = await Promise.all([API.get('/creditos/cobranza/agenda?' + params), API.get('/creditos/cobranza/agenda?' + calendarioParams)]);
    state.items = lista(respuesta); state.calendario = lista(calendario); state.totalPaginas = Math.max(1, Number(respuesta?.totalPages) || 1); state.totalElementos = Number(respuesta?.totalElements) || state.items.length; render();
  } catch (err) { state.items = []; state.calendario = []; state.totalPaginas = 1; state.totalElementos = 0; render(); Utils.showToast(err.message, 'error'); }
}
function render() {
  const body = document.getElementById('carteraCobranzaBody'); if (!body) return;
  renderCalendar();
  const hoy = fechaLocal(new Date());
  body.innerHTML = state.items.length ? state.items.map(x => {
    const atrasada = x.fechaVencimiento && String(x.fechaVencimiento).slice(0, 10) < hoy && x.estado !== 'PAGADA';
    const estado = x.estado === 'PAGADA' ? 'bg-success' : x.estado === 'PARCIAL' ? 'bg-info' : 'bg-warning text-dark';
    return '<tr><td class="text-nowrap">' + (x.fechaVencimiento ? new Date(x.fechaVencimiento).toLocaleDateString() : '-') + (atrasada ? ' <span class="badge bg-danger">Atrasada</span>' : '') + '</td><td><strong>' + Utils.esc(x.clienteNombre || '') + '</strong><br><small class="text-muted">Parcialidad #' + x.numero + '</small></td><td>' + Utils.esc(x.telefono || '—') + '</td><td>' + Utils.esc(x.direccion || '—') + '</td><td>' + Utils.esc(x.folioCredito || ('#' + x.idCredito)) + '</td><td class="text-end">' + Utils.formatMonto(x.montoProgramado || 0) + '</td><td class="text-end fw-semibold">' + Utils.formatMonto(x.saldo || 0) + '</td><td><span class="badge ' + estado + '">' + Utils.esc(x.estado || '') + '</span></td><td><button type="button" class="btn-kebab-toggle kebab-trigger cartera-kebab" data-id="' + x.idCredito + '" data-parcialidad="' + x.idParcialidad + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td></tr>';
  }).join('') : '<tr><td colspan="9" class="text-center text-muted py-4">No hay créditos en la cartera semanal</td></tr>';
  const pagination = document.getElementById('carteraCobranzaPagination');
  if (pagination) pagination.innerHTML = state.totalPaginas <= 1 || state.totalElementos <= 0 ? '' : '<div class="d-flex justify-content-between align-items-center"><small class="text-muted">' + state.totalElementos + ' registro(s)</small><div class="btn-group btn-group-sm"><button class="btn btn-outline-secondary" data-page="' + (state.pagina - 1) + '" ' + (state.pagina === 0 ? 'disabled' : '') + '>Anterior</button>' + Array.from({ length: state.totalPaginas }, (_, i) => '<button class="btn ' + (i === state.pagina ? 'btn-primary' : 'btn-outline-secondary') + '" data-page="' + i + '">' + (i + 1) + '</button>').join('') + '<button class="btn btn-outline-secondary" data-page="' + (state.pagina + 1) + '" ' + (state.pagina >= state.totalPaginas - 1 ? 'disabled' : '') + '>Siguiente</button></div></div>';
  pagination?.querySelectorAll('[data-page]')?.forEach(b => b.addEventListener('click', () => { state.pagina = Number(b.dataset.page); cargar(); }));
}
function renderCalendar() {
  const el = document.getElementById('carteraCalendario'); if (!el) return;
  const ahora = new Date(); const actual = ahora.getDay(); const lunes = new Date(ahora); lunes.setHours(0, 0, 0, 0); lunes.setDate(ahora.getDate() - (actual === 0 ? 6 : actual - 1));
  const nombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const hoy = fechaLocal(new Date());
  el.innerHTML = nombres.map((nombre, index) => { const fecha = new Date(lunes); fecha.setDate(lunes.getDate() + index); const clave = fechaLocal(fecha); const eventos = state.calendario.filter(x => String(x.fechaVencimiento || '').slice(0, 10) === clave); return '<div class="cobranza-day"><div class="cobranza-day-title">' + nombre + ' ' + fecha.getDate() + '</div>' + (eventos.length ? eventos.map(x => '<button type="button" class="cobranza-event ' + (clave < hoy && x.estado !== 'PAGADA' ? 'atrasado' : '') + ' cartera-calendar-item" data-id="' + x.idCredito + '" data-parcialidad="' + x.idParcialidad + '"><strong>' + Utils.esc(x.clienteNombre || '') + '</strong><br>' + Utils.esc(x.folioCredito || ('#' + x.idCredito)) + ' · ' + Utils.formatMonto(x.saldo || 0) + '<span class="float-end">⋮</span></button>').join('') : '<small class="text-muted">Sin cobros</small>') + '</div>'; }).join('');
  el.querySelectorAll('.cartera-calendar-item').forEach(btn => btn.addEventListener('click', () => { const item = buscar(btn.dataset.id, btn.dataset.parcialidad) || state.calendario.find(x => String(x.idCredito) === btn.dataset.id && String(x.idParcialidad) === btn.dataset.parcialidad); if (item) { const acciones = [{ icon: 'fa-eye', text: 'Ver detalle del crédito', color: 'var(--info)', onClick: () => detalle(item) }]; if (item.saldo > 0 && Utils.hasPermiso('COBRANZA_ABONAR')) acciones.push({ icon: 'fa-money-bill-wave', text: 'Registrar abono', color: 'var(--success)', onClick: () => abrirAbono(item) }); Utils.abrirMenuKebab(btn, acciones); } }));
}
function buscar(id, parcialidad) { return state.items.find(x => String(x.idCredito) === String(id) && String(x.idParcialidad) === String(parcialidad)); }
function manejarClick(e) {
  const btn = e.target.closest('.cartera-kebab'); if (!btn) return;
  const item = buscar(btn.dataset.id, btn.dataset.parcialidad); if (!item) return;
  const acciones = [{ icon: 'fa-eye', text: 'Ver detalle del crédito', color: 'var(--info)', onClick: () => detalle(item) }];
  if (item.saldo > 0 && Utils.hasPermiso('COBRANZA_ABONAR')) acciones.push({ icon: 'fa-money-bill-wave', text: 'Registrar abono', color: 'var(--success)', onClick: () => abrirAbono(item) });
  Utils.abrirMenuKebab(btn, acciones);
}
async function detalle(item) { try { const ps = lista(await API.get('/creditos/' + item.idCredito + '/parcialidades')); const filas = ps.map(p => '<tr><td>#' + p.numero + '</td><td>' + Utils.formatDateTime(p.fechaVencimiento) + '</td><td>' + Utils.formatMonto((p.capitalProgramado || 0) + (p.interesProgramado || 0)) + '</td><td>' + Utils.formatMonto((p.capitalPagado || 0) + (p.interesPagado || 0)) + '</td><td>' + Utils.esc(p.estado || '') + '</td></tr>').join(''); Utils.showDialog('Detalle del crédito ' + Utils.esc(item.folioCredito || ('#' + item.idCredito)), '<p><strong>Cliente:</strong> ' + Utils.esc(item.clienteNombre || '-') + '<br><strong>Saldo:</strong> ' + Utils.formatMonto(item.saldo || 0) + '</p><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Parcialidad</th><th>Vencimiento</th><th>Programado</th><th>Pagado</th><th>Estado</th></tr></thead><tbody>' + (filas || '<tr><td colspan="5">Sin parcialidades</td></tr>') + '</tbody></table></div>'); } catch (err) { Utils.showToast(err.message, 'error'); } }
function abrirAbono(item) { state.selected = item; document.getElementById('carteraAbonoInfo').innerHTML = '<strong>' + Utils.esc(item.clienteNombre || '') + '</strong><br>' + Utils.esc(item.folioCredito || ('#' + item.idCredito)) + ' | Saldo: ' + Utils.formatMonto(item.saldo || 0); document.getElementById('carteraAbonoMonto').value = (item.saldo || 0).toFixed(2); document.getElementById('carteraAbonoCaja').value = state.cajas.length === 1 ? String(state.cajas[0].idCaja) : ''; bootstrap.Modal.getOrCreateInstance(document.getElementById('carteraAbonoModal')).show(); }
async function guardarAbono() { if (!state.selected) return; const monto = parseFloat(document.getElementById('carteraAbonoMonto').value); const idCaja = parseInt(document.getElementById('carteraAbonoCaja').value) || null; const idTipoPago = parseInt(document.getElementById('carteraAbonoTipoPago').value) || null; if (!monto || monto <= 0 || !idCaja || !idTipoPago) { Utils.showToast('Completa monto, caja y forma de pago', 'warning'); return; } try { await API.post('/creditos/cobranza/abonos', { idCredito: state.selected.idCredito, monto, tipo: 'PARCIAL', idTipoPago, idCaja }); bootstrap.Modal.getInstance(document.getElementById('carteraAbonoModal'))?.hide(); Utils.showToast('Cobranza registrada', 'success'); cargar(); } catch (err) { Utils.showToast(err.message, 'error'); } }
