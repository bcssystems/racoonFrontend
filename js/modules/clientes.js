let state = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  pageSize: 10,
  editingId: null,
  paises: [],
  detalleClienteId: null,
  showInactive: false,
};

const REGIMENES_FISCALES = [
  { value: "601", label: "601 - General de Ley Personas Morales" },
  { value: "603", label: "603 - Personas Morales con Fines no Lucrativos" },
  { value: "605", label: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { value: "606", label: "606 - Arrendamiento" },
  { value: "607", label: "607 - Enajenaci\u00f3n o Adquisici\u00f3n de Bienes" },
  { value: "608", label: "608 - Dem\u00e1s Ingresos" },
  { value: "610", label: "610 - Residentes en el Extranjero sin EP" },
  { value: "611", label: "611 - Dividendos (Socios y Accionistas)" },
  { value: "612", label: "612 - Personas F\u00edsicas con Act. Empresariales" },
  { value: "614", label: "614 - Ingresos por Intereses" },
  { value: "616", label: "616 - Sin Obligaciones Fiscales" },
  { value: "621", label: "621 - R\u00e9gimen de Incorporaci\u00f3n Fiscal" },
  { value: "625", label: "625 - Act. Empresariales con Plataformas Tecnol\u00f3gicas" },
  { value: "626", label: "626 - R\u00e9gimen Simplificado de Confianza" },
];

export function init() {
  bindEvents();
  initIneCameras();
  cargarPaises();
  cargarRegimenes();
  cargarClientes(0);
}

function bindEvents() {
  if (!Utils.hasPermiso('CLIENTES_CREAR')) {
    const btn = document.getElementById('btnNuevoCliente');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevoCliente')?.addEventListener('click', () => abrirModal(null));
  document.getElementById('btnGuardarCliente')?.addEventListener('click', guardarCliente);
  document.getElementById('tableClientesBody')?.addEventListener('click', handleTableClick);
  document.getElementById('btnDetalleCreditoCliente')?.addEventListener('click', irACreditosDesdeDetalle);
  document.getElementById('searchCliente')?.addEventListener('input', Utils.debounce(() => cargarClientes(0), 400));
  document.getElementById('filtroListaNegra')?.addEventListener('change', () => cargarClientes(0));
  document.getElementById('btnToggleClientesInactivos')?.addEventListener('click', toggleInactivos);
  document.getElementById('clienteTieneCredito')?.addEventListener('change', function () {
    toggleLimiteCreditoGroup(this.checked);
  });
  document.getElementById('clienteCp')?.addEventListener('input', Utils.debounce(function () {
    const cp = this.value.trim();
    if (cp.length === 5) cargarColonias(cp, '');
  }, 500));
  document.getElementById('btnSubirIne')?.addEventListener('click', subirIne);
  document.getElementById('ineFrontal')?.addEventListener('change', previewIne);
  document.getElementById('ineTrasera')?.addEventListener('change', previewIne);
}

async function cargarPaises() {
  try {
    state.paises = await API.get('/catalogos/paises');
    const sel = document.getElementById('clientePais');
    if (sel) {
      sel.innerHTML = '<option value="">Seleccionar...</option>' +
        state.paises.map(p => `<option value="${p.codigo}">${p.nombre} (${p.prefijo})</option>`).join('');
      Utils.makeSearchableSelect('clientePais');
      sel.addEventListener('change', aplicarPrefijoPais);
      aplicarPrefijoPais();
    }
  } catch (_) {}
}

function aplicarPrefijoPais() {
  const span = document.getElementById('clientePrefijo');
  if (!span) return;
  const codigo = document.getElementById('clientePais')?.value || '';
  const pais = state.paises.find(p => p.codigo === codigo);
  const prefijo = pais && pais.prefijo ? pais.prefijo : '+52';
  if (span.textContent !== prefijo) span.textContent = prefijo;
}

function cargarRegimenes() {
  const sel = document.getElementById('clienteRegimen');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      REGIMENES_FISCALES.map(r => `<option value="${r.value}">${r.label}</option>`).join('');
  }
}

async function cargarClientes(page) {
  state.currentPage = page;
  const search = document.getElementById('searchCliente')?.value || '';
  const soloListaNegra = document.getElementById('filtroListaNegra')?.checked || false;
  try {
    let result;
    if (soloListaNegra) {
      result = await API.get('/clientes/lista-negra');
      state.data = result || [];
      state.totalPages = 1;
    } else {
      result = await API.get('/clientes?search=' + encodeURIComponent(search) + '&activo=' + (state.showInactive ? 'false' : 'true') + '&page=' + page + '&size=' + state.pageSize);
      state.data = result.content;
      state.totalPages = result.totalPages;
    }
    renderTable();
    renderPagination();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function renderTable() {
  const tbody = document.getElementById('tableClientesBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12"><div class="empty-state"><i class="fas fa-address-book"></i><p>No hay clientes</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(c => {
    const saldo = c.saldoActual;
    const saldoFavor = c.saldoFavor || 0;
    const score = c.scoreCredito == null ? 100 : c.scoreCredito;
    const scoreClase = score >= 90 ? 'bg-success' : score >= 75 ? 'bg-info' : score >= 50 ? 'bg-warning text-dark' : 'bg-danger';
    const saldoRojo = saldo != null && saldo > 0;
    const creditoHtml = c.tieneCredito
      ? '<span class="badge bg-info"><i class="fas fa-check me-1"></i>S\u00ed</span>' + (c.tieneIne ? '' : ' <span class="badge bg-danger" title="Falta INE"><i class="fas fa-id-card"></i></span>')
      : '<span class="text-muted">-</span>';
    const limiteHtml = c.tieneCredito
      ? (c.limiteCredito != null ? Utils.formatMonto(c.limiteCredito) : '<span class="badge bg-warning text-dark">Ilimitado</span>')
      : '-';
    return `<tr${c.enListaNegra ? ' style="background:rgba(220,38,38,0.04)"' : ''}>
    <td>${Utils.esc(c.nombre)}</td>
    <td>${Utils.esc(c.apellidoPaterno || '')} ${Utils.esc(c.apellidoMaterno || '')}</td>
    <td>${Utils.esc(c.telefono) || '-'}</td>
    <td>${creditoHtml}</td>
    <td><span class="badge ${scoreClase}" title="Score crediticio">${score}/100</span></td>
    <td>${limiteHtml}</td>
     <td class="text-end" style="${saldoRojo ? 'color:var(--danger);font-weight:600' : ''}">${saldo != null ? Utils.formatMonto(saldo) : '-'}</td>
     <td class="text-end" style="${saldoFavor > 0 ? 'color:var(--success);font-weight:600' : ''}">${Utils.formatMonto(saldoFavor)}</td>
    <td class="text-center">
      <input type="checkbox" class="form-check-input" data-id="${c.idCliente}" data-ln="${c.enListaNegra ? 1 : 0}" data-nombre="${Utils.esc(c.nombre + ' ' + (c.apellidoPaterno||''))}" ${c.enListaNegra ? 'checked' : ''} title="Lista negra">
    </td>
    <td>${Utils.esc(c.motivoListaNegra) || '-'}</td>
    <td>${c.activo ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}</td>
    <td class="acciones-cell">
      <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${c.idCliente}" data-action="menu" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
    </td>
  </tr>`;
  }).join('');

  tbody.querySelectorAll('input[data-ln]').forEach(cb => {
    cb.addEventListener('change', e => {
      e.stopPropagation();
      toggleListaNegra(parseInt(cb.dataset.id), cb.checked, cb.dataset.nombre);
    });
  });
}

function toggleInactivos() {
  state.showInactive = !state.showInactive;
  state.currentPage = 0;
  const btn = document.getElementById('btnToggleClientesInactivos');
  if (btn) {
    btn.innerHTML = state.showInactive
      ? '<i class="fas fa-eye-slash me-1"></i> Mostrar activos'
      : '<i class="fas fa-eye me-1"></i> Mostrar inactivos';
  }
  cargarClientes(0);
}

function renderPagination() {
  const container = document.getElementById('paginationClientes');
  if (!container) return;
  if (state.totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '<nav><ul class="pagination pagination-sm justify-content-center mb-0">';
  html += `<li class="page-item ${state.currentPage === 0 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage - 1}"><i class="fas fa-chevron-left"></i></a></li>`;
  for (let i = 0; i < state.totalPages; i++) {
    if (i === 0 || i === state.totalPages - 1 || (i >= state.currentPage - 2 && i <= state.currentPage + 2)) {
      html += `<li class="page-item ${i === state.currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i + 1}</a></li>`;
    } else if (i === state.currentPage - 3 || i === state.currentPage + 3) {
      html += `<li class="page-item disabled"><a class="page-link" href="#">...</a></li>`;
    }
  }
  html += `<li class="page-item ${state.currentPage === state.totalPages - 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${state.currentPage + 1}"><i class="fas fa-chevron-right"></i></a></li>`;
  html += '</ul></nav>';
  container.innerHTML = html;

  container.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const page = parseInt(el.dataset.page);
      if (page >= 0 && page < state.totalPages) cargarClientes(page);
    });
  });
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    abrirAccionesCliente(kebab, id);
    return;
  }
  const item = e.target.closest('.btn-action');
  if (!item) return;
  e.preventDefault();
  const id = parseInt(item.dataset.id);
  if (item.dataset.action === 'edit' || item.classList.contains('btn-action-edit')) abrirModal(id);
  else if (item.dataset.action === 'delete' || item.classList.contains('btn-action-delete')) confirmarEliminar(id);
  else if (item.dataset.action === 'ine') abrirModalIne(id);
}

function abrirAccionesCliente(anchor, id) {
  const c = (state.data || []).find(x => x.idCliente === id);
  const items = [
    { icon: 'fa-eye', text: 'Ver', color: 'var(--info)', onClick: () => abrirDetalleCliente(id) },
    { icon: 'fa-file-invoice', text: 'Estado de cuenta', color: 'var(--primary)', onClick: () => irACreditos(id) },
    { icon: 'fa-list', text: 'Cr\u00e9ditos pendientes', color: 'var(--primary)', onClick: () => irACreditosPendientes(id) },
    { icon: 'fa-cash-register', text: 'Abonar', color: 'var(--success)', onClick: () => abonarEnPOS(id, c) },
    { icon: 'fa-wallet', text: 'Registrar anticipo', color: 'var(--success)', onClick: () => registrarSaldoFavor(id, c) },
    { icon: 'fa-id-card', text: 'INE' + (c && c.tieneIne ? '  \u2713' : ''), color: 'var(--warning)', onClick: () => abrirModalIne(id) },
  ];
  if (Utils.hasPermiso('CLIENTES_EDITAR')) {
    items.push({ icon: 'fa-edit', text: 'Editar', color: 'var(--primary)', onClick: () => abrirModal(id) });
  }
  if (Utils.hasPermiso('CLIENTES_EDITAR')) {
    items.push({ icon: 'fa-id-card', text: 'INE' + (c && c.tieneIne ? '  \u2713' : ''), color: 'var(--warning)', onClick: () => abrirModalIne(id) });
  }
  if (Utils.hasPermiso('CLIENTES_ELIMINAR')) {
    items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => confirmarEliminar(id) });
  }
  if (items.length === 0) {
    items.push({ icon: 'fa-eye', text: 'Ver', color: 'var(--info)', onClick: () => abrirDetalleCliente(id) });
  }
  Utils.abrirMenuKebab(anchor, items);
}

async function registrarSaldoFavor(id, cliente) {
  try {
    const cajas = (await API.get('/cajas') || []).filter(c => c.estado === 'ABIERTA');
    const tipos = await API.get('/tipos-pago') || [];
    const html = '<div class="small mb-3">Cliente: <strong>' + Utils.esc((cliente.nombre || '') + ' ' + (cliente.apellidoPaterno || '')) + '</strong><br>Saldo actual a favor: <strong>' + Utils.formatMonto(cliente.saldoFavor || 0) + '</strong></div>' +
      '<label class="form-label">Monto del anticipo</label><input type="number" id="saldoFavorMonto" class="form-control mb-2" min="0.01" step="0.01" placeholder="0.00">' +
      '<label class="form-label">Caja abierta</label><select id="saldoFavorCaja" class="form-select mb-2"><option value="">Seleccionar...</option>' + cajas.map(c => '<option value="' + c.idCaja + '">' + Utils.esc(c.nombre) + '</option>').join('') + '</select>' +
      '<label class="form-label">Forma de pago</label><select id="saldoFavorTipoPago" class="form-select mb-2"><option value="">Seleccionar...</option>' + tipos.map(t => '<option value="' + t.idTipoPago + '">' + Utils.esc(t.nombre) + '</option>').join('') + '</select>' +
      '<label class="form-label">Concepto</label><input type="text" id="saldoFavorConcepto" class="form-control" value="Anticipo" maxlength="300">' +
      '<div class="text-end mt-3"><button class="btn btn-success btn-sm" id="btnGuardarSaldoFavor">Registrar anticipo</button></div>';
    Utils.showDialog('Saldo a favor', html);
    document.getElementById('btnGuardarSaldoFavor')?.addEventListener('click', async () => {
      const monto = parseFloat(document.getElementById('saldoFavorMonto').value) || 0;
      const idCaja = parseInt(document.getElementById('saldoFavorCaja').value) || null;
      const idTipoPago = parseInt(document.getElementById('saldoFavorTipoPago').value) || null;
      if (monto <= 0 || !idCaja || !idTipoPago) { Utils.showToast('Completa monto, caja y forma de pago', 'warning'); return; }
      try {
        await API.post('/clientes/' + id + '/saldo-favor', { monto, idCaja, idTipoPago, concepto: document.getElementById('saldoFavorConcepto').value.trim() });
        document.getElementById('dynamicDialog')?.remove();
        Utils.showToast('Anticipo registrado como saldo a favor', 'success');
        cargarClientes(state.currentPage);
      } catch (err) { Utils.showToast(err.message, 'error'); }
    });
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function irACreditos(id) {
  localStorage.setItem('creditosParaCliente', JSON.stringify({ id, vista: 'estado' }));
  document.querySelector('[data-view="pages/creditos.html"]')?.click();
}

function irACreditosPendientes(id) {
  localStorage.setItem('creditosParaCliente', JSON.stringify({ id, vista: 'creditos' }));
  document.querySelector('[data-view="pages/creditos.html"]')?.click();
}

function irACreditosDesdeDetalle() {
  const id = state.detalleClienteId;
  if (!id) return;
  localStorage.setItem('creditosParaCliente', JSON.stringify({ id, vista: 'creditos' }));
  document.querySelector('[data-view="pages/creditos.html"]')?.click();
}

function abonarEnPOS(id, c) {
  localStorage.setItem('abonoParaPOS', JSON.stringify({
    idCliente: id,
    nombre: (c?.nombre || '') + ' ' + (c?.apellidoPaterno || ''),
  }));
  Utils.showToast('Abriendo POS para registrar el abono', 'info');
  document.querySelector('[data-view="pages/ventas.html"]')?.click();
}

function abrirDetalleCliente(id) {
  const c = (state.data || []).find(x => x.idCliente === id);
  if (!c) { Utils.showToast('Cliente no encontrado', 'warning'); return; }
  state.detalleClienteId = id;

  const formatear = v => v ? Utils.esc(String(v)) : '-';
  const gen = [];
  gen.push('<div class="mb-1"><span class="text-muted">RFC:</span> <strong>' + formatear(c.rfc) + '</strong></div>');
  gen.push('<div class="mb-1"><span class="text-muted">R\u00e9gimen fiscal:</span> ' + formatear(c.regimenFiscal) + '</div>');
  gen.push('<div class="mb-1"><span class="text-muted">WhatsApp:</span> ' + formatear(c.whatsapp) + '</div>');
  gen.push('<div class="mb-1"><span class="text-muted">Empresa:</span> ' + formatear(c.empresa) + '</div>');
  gen.push('<div class="mb-1"><span class="text-muted">Contacto:</span> ' + formatear(c.representanteLegal) + '</div>');
  gen.push('<div class="mb-1"><span class="text-muted">Credencial INE:</span> ' + (c.tieneIne ? '<span class="text-success">Registrada</span>' : '<span class="text-danger">No registrada</span>') + '</div>');
  gen.push('<div class="mb-0"><span class="text-muted">Registro:</span> ' + (c.fechaRegistro ? Utils.formatDateTime(c.fechaRegistro) : '-') + '</div>');
  document.getElementById('clienteDetalleGeneral').innerHTML = gen.join('');

  const dir = [];
  const direccionNum = [c.calle, c.numExt, c.numInt].filter(Boolean).join(' ') || '-';
  dir.push('<div class="mb-1"><span class="text-muted">Direcci\u00f3n:</span> ' + formatear(direccionNum) + '</div>');
  dir.push('<div class="mb-1"><span class="text-muted">Colonia:</span> ' + formatear(c.colonia) + '</div>');
  dir.push('<div class="mb-1"><span class="text-muted">C.P.:</span> ' + formatear(c.cp) + '</div>');
  dir.push('<div class="mb-1"><span class="text-muted">Municipio:</span> ' + formatear(c.municipio) + '</div>');
  dir.push('<div class="mb-1"><span class="text-muted">Estado:</span> ' + formatear(c.estado) + '</div>');
  dir.push('<div class="mb-0"><span class="text-muted">Entrega:</span> ' + formatear(c.direccionEntrega) + '</div>');
  document.getElementById('clienteDetalleDireccion').innerHTML = dir.join('');

  const cred = [];
  cred.push('<div class="mb-1"><span class="text-muted">Cr\u00e9dito:</span> ' + (c.tieneCredito ? '<span class="text-success">Habilitado</span>' : '<span class="text-muted">No</span>') + '</div>');
  cred.push('<div class="mb-1"><span class="text-muted">L\u00edmite:</span> ' + (c.tieneCredito ? (c.limiteCredito != null ? Utils.formatMonto(c.limiteCredito) : 'Ilimitado') : '-') + '</div>');
   cred.push('<div class="mb-1"><span class="text-muted">Saldo a deber:</span> <strong>' + (c.saldoActual != null ? Utils.formatMonto(c.saldoActual) : '-') + '</strong></div>');
   cred.push('<div class="mb-1"><span class="text-muted">Saldo a favor:</span> <strong class="text-success">' + Utils.formatMonto(c.saldoFavor || 0) + '</strong></div>');
   cred.push('<div class="mb-1"><span class="text-muted">Score crediticio:</span> <strong>' + (c.scoreCredito == null ? 100 : c.scoreCredito) + '/100</strong></div>');
  cred.push('<div class="mb-0"><span class="text-muted">Lista negra:</span> ' + (c.enListaNegra ? '<span class="text-danger">' + formatear(c.motivoListaNegra) + '</span>' : '<span class="text-success">No</span>') + '</div>');
  document.getElementById('clienteDetalleCredito').innerHTML = cred.join('');

  new bootstrap.Modal(document.getElementById('clienteDetalleModal')).show();
}

function abrirModal(id) {
  state.editingId = id;
  const modal = new bootstrap.Modal(document.getElementById('clienteModal'));
  document.getElementById('clienteModalTitle').textContent = id ? 'Editar Cliente' : 'Nuevo Cliente';
  document.getElementById('formCliente').reset();
  aplicarPrefijoPais();

  if (id) {
    const c = state.data.find(c => c.idCliente === id);
    if (c) {
      document.getElementById('clienteId').value = c.idCliente;
      document.getElementById('clienteNombre').value = c.nombre || '';
      document.getElementById('clienteApaterno').value = c.apellidoPaterno || '';
      document.getElementById('clienteAmaterno').value = c.apellidoMaterno || '';
      document.getElementById('clienteTelefono').value = c.telefono || '';
      const ladaEl = document.getElementById('clienteLada');
      if (ladaEl) {
        const tel = (c.telefono || '').replace(/\D/g, '');
        if (tel.length === 10) {
          ladaEl.value = tel.slice(0, 3);
          document.getElementById('clienteTelefono').value = tel.slice(3);
        } else {
          ladaEl.value = '';
          document.getElementById('clienteTelefono').value = c.telefono || '';
        }
      }
      document.getElementById('clientePais').value = c.codigoPais || '';
      Utils.updateSearchableOptions('clientePais');
      aplicarPrefijoPais();
      document.getElementById('clienteWhatsapp').value = c.whatsapp || '';
      document.getElementById('clienteEmpresa').value = c.empresa || '';
      document.getElementById('clienteRegimen').value = c.regimenFiscal || '';
      document.getElementById('clienteRfc').value = c.rfc || '';
      document.getElementById('clienteRepresentanteLegal').value = c.representanteLegal || '';
      document.getElementById('clienteDireccionEntrega').value = c.direccionEntrega || '';
      document.getElementById('clienteCp').value = c.cp || '';
      document.getElementById('clienteEstado').value = c.estado || '';
      document.getElementById('clienteMunicipio').value = c.municipio || '';
      document.getElementById('clienteCalle').value = c.calle || '';
      document.getElementById('clienteNumExt').value = c.numExt || '';
      document.getElementById('clienteNumInt').value = c.numInt || '';
      if (c.cp) cargarColonias(c.cp, c.colonia || '');
      document.getElementById('clienteTieneCredito').checked = c.tieneCredito || false;
      document.getElementById('clienteCreditoIlimitado').checked = c.limiteCredito == null && c.tieneCredito;
      document.getElementById('clienteLimiteCredito').value = c.limiteCredito || '';
      toggleLimiteCreditoGroup(c.tieneCredito || false);
    }
  }
  modal.show();
}

function toggleLimiteCreditoGroup(show) {
  document.getElementById('clienteLimiteCreditoGroup').style.display = show ? 'block' : 'none';
  document.getElementById('clienteCreditoIlimitadoGroup').style.display = show ? 'block' : 'none';
}

function combinarTelefonoCliente() {
  const lada = document.getElementById('clienteLada')?.value.replace(/\D/g, '').trim() || '';
  const num = document.getElementById('clienteTelefono').value.trim();
  const local = num.replace(/\D/g, '');
  if (lada && local.length >= 7) return lada + local;
  return num;
}

async function guardarCliente() {
  const tieneCredito = document.getElementById('clienteTieneCredito').checked;
  const ilimitado = document.getElementById('clienteCreditoIlimitado').checked;
  const data = {
    nombre: document.getElementById('clienteNombre').value.trim(),
    apellidoPaterno: document.getElementById('clienteApaterno').value.trim(),
    apellidoMaterno: document.getElementById('clienteAmaterno').value.trim(),
    telefono: combinarTelefonoCliente(),
    codigoPais: document.getElementById('clientePais').value,
    whatsapp: document.getElementById('clienteWhatsapp').value.trim(),
    empresa: document.getElementById('clienteEmpresa').value.trim(),
    regimenFiscal: document.getElementById('clienteRegimen').value,
    rfc: document.getElementById('clienteRfc').value.trim(),
    representanteLegal: document.getElementById('clienteRepresentanteLegal').value.trim(),
    direccionEntrega: document.getElementById('clienteDireccionEntrega').value.trim(),
    cp: document.getElementById('clienteCp').value.trim(),
    calle: document.getElementById('clienteCalle').value.trim(),
    numExt: document.getElementById('clienteNumExt').value.trim(),
    numInt: document.getElementById('clienteNumInt').value.trim(),
    colonia: document.getElementById('clienteColonia')?.value || '',
    municipio: document.getElementById('clienteMunicipio').value.trim(),
    estado: document.getElementById('clienteEstado').value.trim(),
    direccion: buildDireccionString(),
    tieneCredito,
  };
  if (!data.nombre) { Utils.showToast('El nombre es obligatorio', 'warning'); return; }
  if (!data.apellidoPaterno) { Utils.showToast('El apellido paterno es obligatorio', 'warning'); return; }
  if (!data.telefono) { Utils.showToast('El tel\u00e9fono es obligatorio', 'warning'); return; }

  if (tieneCredito) {
    data.limiteCredito = ilimitado ? null : (parseFloat(document.getElementById('clienteLimiteCredito').value) || 0);
  } else {
    data.limiteCredito = 0;
  }

  try {
    if (state.editingId) {
      await API.put('/clientes/' + state.editingId, data);
      Utils.showToast('Cliente actualizado', 'success');
    } else {
      await API.post('/clientes', data);
      Utils.showToast('Cliente creado', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('clienteModal'))?.hide();
    cargarClientes(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function confirmarEliminar(id) {
  const confirmed = await Utils.confirmAction('\u00bfEliminar este cliente?', 'Confirmar', 'Eliminar');
  if (!confirmed) return;
  try {
    await API.del('/clientes/' + id);
    Utils.showToast('Cliente eliminado', 'success');
    cargarClientes(state.currentPage);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function toggleListaNegra(id, enListaNegra, nombre) {
  if (!enListaNegra) {
    const ok = await Utils.confirm('\u00bfQuitar de la lista negra a ' + nombre + '?', 'Lista negra');
    if (!ok) { cargarClientes(state.currentPage); return; }
  }
  try {
    const motivo = enListaNegra ? await Utils.promptInput('Agregar a lista negra', 'Motivo', '') : null;
    await API.put('/clientes/' + id + '/lista-negra', { enListaNegra, motivo });
    Utils.showToast(enListaNegra ? 'Cliente en lista negra' : 'Cliente retirado de lista negra', 'success');
    cargarClientes(state.currentPage);
  } catch (err) {
    Utils.showToast(err.message, 'error');
    cargarClientes(state.currentPage);
  }
}

function abrirModalIne(id) {
  state.ineClienteId = id;
  detenerCamaraIne(false);
  ['Frontal', 'Trasera'].forEach(side => {
    const low = side.toLowerCase();
    const input = document.getElementById('ine' + side);
    if (input) input.value = '';
    document.getElementById('ine' + side + 'Preview').innerHTML = '<span class="text-muted small">Cargando...</span>';
    resetIneUiSide(side);
    document.getElementById('ine' + low + 'Retake')?.classList.add('d-none');
  });
  document.getElementById('ineCodigoLector').value = '';
  const c = state.data.find(x => x.idCliente === id);
  document.getElementById('clienteIneTitle').textContent = 'INE - ' + (c ? c.nombre + ' ' + (c.apellidoPaterno || '') : '') ;
  API.get('/clientes/' + id + '/ine').then(ine => {
    if (ine && (ine.urlFotoFrontal || ine.urlFotoTrasera)) {
      if (ine.urlFotoFrontal) renderIneStored('Frontal', ine.urlFotoFrontal);
      if (ine.urlFotoTrasera) renderIneStored('Trasera', ine.urlFotoTrasera);
      if (ine.codigoLector) document.getElementById('ineCodigoLector').value = ine.codigoLector;
    }
  }).catch(() => {});
  new bootstrap.Modal(document.getElementById('clienteIneModal')).show();
}

function renderIneStored(side, url) {
  const preview = document.getElementById('ine' + side + 'Preview');
  if (!preview) return;
  const src = (url || '').match(/^https?:\/\//) ? url : API.mediaBaseUrl + url;
  preview.innerHTML = '<img src="' + Utils.esc(src) + '" class="img-fluid border rounded" style="max-height:140px" alt="INE ' + side + '">' +
    '<div class="small mt-1"><a target="_blank" rel="noopener" href="' + Utils.esc(src) + '">Ver</a> · <a download="ine-' + side.toLowerCase() + '.jpg" href="' + Utils.esc(src) + '">Descargar</a> · <span class="text-muted">Reemplaza usando cámara o archivo</span></div>';
}

function previewIne(e) {
  const file = e.target.files[0];
  if (!file) return;
  const target = e.target.id === 'ineFrontal' ? 'ineFrontalPreview' : 'ineTraseraPreview';
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById(target).innerHTML = '<img src="' + reader.result + '" class="img-fluid border rounded" style="max-height:140px">';
  };
  reader.readAsDataURL(file);
}

// ------- Captura de INE con cámara y detección de bordes -------

const INE_CAM = { stream: null, side: null, rafId: null, goodSince: null, throttle: 0, det: null };

function initIneCameras() {
  const soporta = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  ['Frontal', 'Trasera'].forEach(side => {
    const low = side.toLowerCase();
    const el = id => document.getElementById(id);
    if (!soporta) {
      el(`ine${side}Activate`)?.classList.add('d-none');
      el(`ine${low}FileToggle`)?.classList.remove('d-none');
    } else {
      el(`ine${side}Activate`)?.addEventListener('click', () => activarCamaraIne(side));
      el(`ine${side}Capture`)?.addEventListener('click', () => capturarIne(side, false));
      el(`ine${low}FileToggle`)?.addEventListener('click', e => {
        e.preventDefault();
        el(`ine${low}FileRow`).classList.toggle('d-none');
      });
      el(`ine${low}Retake`)?.addEventListener('click', e => {
        e.preventDefault();
        activarCamaraIne(side);
      });
    }
  });
  document.getElementById('clienteIneModal')?.addEventListener('hidden.bs.modal', () => detenerCamaraIne(true));
}

function resetIneUiSide(side) {
  const low = side.toLowerCase();
  const el = id => document.getElementById(id);
  const video = el(`ine${side}Video`);
  const overlay = el(`ine${side}Overlay`);
  if (video) { video.classList.add('d-none'); video.srcObject = null; }
  if (overlay) { overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height); overlay.classList.add('d-none'); }
  el(`ine${side}Placeholder`)?.classList.remove('d-none');
  el(`ine${side}Activate`)?.classList.remove('d-none');
  el(`ine${side}Capture`)?.classList.add('d-none');
  el(`ine${low}FileRow`)?.classList.add('d-none');
  el(`ine${low}FileToggle`)?.classList.remove('d-none');
  el(`ine${low}Retake`)?.classList.add('d-none');
}

function detenerCamaraIne(resetUi) {
  if (INE_CAM.rafId) { cancelAnimationFrame(INE_CAM.rafId); INE_CAM.rafId = null; }
  if (INE_CAM.stream) {
    INE_CAM.stream.getTracks().forEach(t => t.stop());
    INE_CAM.stream = null;
  }
  if (resetUi && INE_CAM.side) {
    const side = INE_CAM.side;
    const video = document.getElementById(`ine${side}Video`);
    if (video) video.classList.add('d-none');
    const overlay = document.getElementById(`ine${side}Overlay`);
    if (overlay) overlay.classList.add('d-none');
    document.getElementById(`ine${side}Placeholder`)?.classList.remove('d-none');
    document.getElementById(`ine${side}Activate`)?.classList.remove('d-none');
    document.getElementById(`ine${side}Capture`)?.classList.add('d-none');
    const low = side.toLowerCase();
    document.getElementById(`ine${low}FileToggle`)?.classList.remove('d-none');
    document.getElementById(`ine${low}Retake`)?.classList.remove('d-none');
  }
  INE_CAM.side = null;
  INE_CAM.goodSince = null;
  INE_CAM.throttle = 0;
  INE_CAM.det = null;
}

async function activarCamaraIne(side) {
  detenerCamaraIne(false);
  const low = side.toLowerCase();
  const $ = id => document.getElementById(id);
  const video = $(`ine${side}Video`);
  const overlay = $(`ine${side}Overlay`);
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Este navegador no permite el acceso a la c\u00e1mara en este contexto. Abre la app en localhost y haz Ctrl+F5.');
    }
    if (!video || !overlay) {
      throw new Error('Los elementos de c\u00e1mara tienen un estado obsoleto. Haz Ctrl+F5 para recargar la p\u00e1gina.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    INE_CAM.stream = stream;
    INE_CAM.side = side;
    video.srcObject = stream;
    await video.play();
    video.classList.remove('d-none');
    overlay.classList.remove('d-none');
    $(`ine${side}Placeholder`)?.classList.add('d-none');
    $(`ine${side}Activate`)?.classList.add('d-none');
    $(`ine${side}Capture`)?.classList.remove('d-none');
    $(`ine${low}FileToggle`)?.classList.add('d-none');
    $(`ine${low}Retake`)?.classList.add('d-none');
    INE_CAM.goodSince = null;
    INE_CAM.throttle = 0;
    loopDeteccionIne();
  } catch (err) {
    detenerCamaraIne(false);
    Utils.showToast('No se pudo acceder a la c\u00e1mara: ' + (err.message || 'permiso denegado'), 'error');
  }
}

function loopDeteccionIne() {
  if (!INE_CAM.stream || !INE_CAM.side) return;
  const ahora = performance.now();
  if (ahora - INE_CAM.throttle >= 110) {
    INE_CAM.throttle = ahora;
    const video = document.getElementById(`ine${INE_CAM.side}Video`);
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      const det = detectarDocumento(video);
      const overlay = document.getElementById(`ine${INE_CAM.side}Overlay`);
      if (det) {
        INE_CAM.det = det;
        dibujarOverlay(overlay, det);
        if (!INE_CAM.goodSince) INE_CAM.goodSince = ahora;
        if (ahora - INE_CAM.goodSince >= 3000) {
          capturarIne(INE_CAM.side, true);
          return;
        }
      } else {
        INE_CAM.goodSince = null;
        if (overlay) overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
      }
    }
  }
  INE_CAM.rafId = requestAnimationFrame(loopDeteccionIne);
}

function detectarDocumento(video) {
  const RW = 380;
  const RH = Math.max(240, Math.round(video.videoHeight * RW / video.videoWidth));
  const cv = document.createElement('canvas');
  cv.width = RW; cv.height = RH;
  const cctx = cv.getContext('2d', { willReadFrequently: true });
  cctx.drawImage(video, 0, 0, RW, RH);
  const img = cctx.getImageData(0, 0, RW, RH);
  const d = img.data;
  const n = RW * RH;
  const luz = new Float32Array(n);
  for (let i = 0, k = 0; i < n; i++, k += 4) luz[i] = 0.299 * d[k] + 0.587 * d[k + 1] + 0.114 * d[k + 2];

  const grad = new Float32Array(n);
  let maxG = 0;
  for (let y = 1; y < RH - 1; y++) {
    for (let x = 1; x < RW - 1; x++) {
      const i = y * RW + x;
      const gx = luz[i - RW - 1] + 2 * luz[i - 1] + luz[i + RW - 1] - luz[i - RW + 1] - 2 * luz[i + 1] - luz[i + RW + 1];
      const gy = luz[i - RW - 1] + 2 * luz[i - RW] + luz[i - RW + 1] - luz[i + RW - 1] - 2 * luz[i + RW] - luz[i + RW + 1];
      const m = Math.sqrt(gx * gx + gy * gy);
      grad[i] = m;
      if (m > maxG) maxG = m;
    }
  }
  if (maxG < 6) return null;

  const umbral = maxG * 0.2;
  const borde = new Uint8Array(n);
  for (let i = 0; i < n; i++) borde[i] = grad[i] >= umbral ? 1 : 0;

  const dil = new Uint8Array(borde);
  for (let y = 1; y < RH - 1; y++) {
    for (let x = 1; x < RW - 1; x++) {
      if (borde[y * RW + x]) {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) dil[(y + dy) * RW + (x + dx)] = 1;
      }
    }
  }

  const etiqueta = new Int32Array(n).fill(-1);
  const cola = new Int32Array(n);
  const areas = [];
  let etiquetaN = 0;
  for (let i = 0; i < n; i++) {
    if (!dil[i] || etiqueta[i] !== -1) continue;
    let frente = 0, fin = 0;
    cola[fin++] = i;
    etiqueta[i] = etiquetaN;
    areas.push(0);
    while (frente < fin) {
      const p = cola[frente++];
      areas[etiquetaN]++;
      const x = p % RW;
      const py = (p - x) / RW;
      if (x > 0 && dil[p - 1] && etiqueta[p - 1] === -1) { etiqueta[p - 1] = etiquetaN; cola[fin++] = p - 1; }
      if (x < RW - 1 && dil[p + 1] && etiqueta[p + 1] === -1) { etiqueta[p + 1] = etiquetaN; cola[fin++] = p + 1; }
      if (py > 0 && dil[p - RW] && etiqueta[p - RW] === -1) { etiqueta[p - RW] = etiquetaN; cola[fin++] = p - RW; }
      if (py < RH - 1 && dil[p + RW] && etiqueta[p + RW] === -1) { etiqueta[p + RW] = etiquetaN; cola[fin++] = p + RW; }
    }
    etiquetaN++;
  }

  let mejor = -1, mejorArea = 0;
  for (let e = 0; e < etiquetaN; e++) if (areas[e] > mejorArea) { mejorArea = areas[e]; mejor = e; }
  if (mejor >= 0 && mejorArea >= 80) {
    let minX = RW, maxX = -1, minY = RH, maxY = -1;
    for (let y = 0; y < RH; y++) {
      const r = y * RW;
      for (let x = 0; x < RW; x++) {
        if (etiqueta[r + x] === mejor) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX > 0) {
      const w = maxX - minX, h = maxY - minY;
      const fracA = w / RW, fracB = h / RH;
      const ratio = w / Math.max(1, h);
      if (fracA >= 0.32 && fracA <= 0.95 && fracB >= 0.32 && fracB <= 0.95 && ratio >= 1.25 && ratio <= 2.5) {
        let topPx = 0, botPx = 0, leftPx = 0, rightPx = 0;
        for (let x = minX; x <= maxX; x++) {
          if (etiqueta[minY * RW + x] === mejor) topPx++;
          if (etiqueta[maxY * RW + x] === mejor) botPx++;
        }
        for (let y = minY; y <= maxY; y++) {
          if (etiqueta[y * RW + minX] === mejor) leftPx++;
          if (etiqueta[y * RW + maxX] === mejor) rightPx++;
        }
        const minimo = { t: topPx >= w * 0.55, b: botPx >= w * 0.55, l: leftPx >= h * 0.55, r: rightPx >= h * 0.55 };
        if (minimo.t && minimo.b && minimo.l && minimo.r) {
          return { box: { x: minX, y: minY, w, h }, ok: true, rw: RW, rh: RH };
        }
      }
    }
  }

  const hProj = new Float32Array(RH), vProj = new Float32Array(RW);
  for (let y = 0; y < RH; y++) { let s = 0; const r = y * RW; for (let x = 0; x < RW; x++) s += dil[r + x]; hProj[y] = s; }
  for (let x = 0; x < RW; x++) { let s = 0; for (let y = 0; y < RH; y++) s += dil[y * RW + x]; vProj[x] = s; }
  let hMax = 0, vMax = 0;
  for (let y = 0; y < RH; y++) if (hProj[y] > hMax) hMax = hProj[y];
  for (let x = 0; x < RW; x++) if (vProj[x] > vMax) vMax = vProj[x];

  const hu = hMax * 0.3, vu = vMax * 0.3;
  let top = -1, bottom = -1, left = -1, right = -1;
  for (let y = 0; y < RH; y++) if (hProj[y] >= hu) { top = y; break; }
  for (let y = RH - 1; y >= 0; y--) if (hProj[y] >= hu) { bottom = y; break; }
  for (let x = 0; x < RW; x++) if (vProj[x] >= vu) { left = x; break; }
  for (let x = RW - 1; x >= 0; x--) if (vProj[x] >= vu) { right = x; break; }
  if (top < 0 || bottom <= top || left < 0 || right <= left) return null;

  const anchoT = right - left, altoT = bottom - top;
  const fracA = anchoT / RW, fracB = altoT / RH;
  if (fracA < 0.32 || fracA > 0.95 || fracB < 0.32 || fracB > 0.95) return null;
  const ratio = anchoT / Math.max(1, altoT);
  if (ratio < 1.25 || ratio > 2.5) return null;
  return { box: { x: left, y: top, w: anchoT, h: altoT }, ok: false, rw: RW, rh: RH };
}

function dibujarOverlay(ov, det) {
  if (!ov) return;
  const w = ov.clientWidth || 320, h = ov.clientHeight || 240;
  if (ov.width !== w || ov.height !== h) { ov.width = w; ov.height = h; }
  const ctx = ov.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  const scx = w / det.rw, scy = h / det.rh;
  const x = det.box.x * scx, y = det.box.y * scy;
  const bw = det.box.w * scx, bh = det.box.h * scy;
  const g = Math.max(8, Math.min(w, h) * 0.04);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, bw, bh);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y + g); ctx.lineTo(x, y); ctx.lineTo(x + g, y);
  ctx.moveTo(x + bw - g, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + g);
  ctx.moveTo(x, y + bh - g); ctx.lineTo(x, y + bh); ctx.lineTo(x + g, y + bh);
  ctx.moveTo(x + bw - g, y + bh); ctx.lineTo(x + bw, y + bh); ctx.lineTo(x + bw, y + bh - g);
  ctx.stroke();
}

function recortarDocumento(src, det) {
  const scx = src.width / det.rw;
  const scy = src.height / det.rh;
  const margenX = Math.round(0.02 * det.box.w * scx);
  const margenY = Math.round(0.02 * det.box.h * scy);
  const x0 = Math.max(0, Math.round(det.box.x * scx) - margenX);
  const y0 = Math.max(0, Math.round(det.box.y * scy) - margenY);
  const x1 = Math.min(src.width, Math.round((det.box.x + det.box.w) * scx) + margenX);
  const y1 = Math.min(src.height, Math.round((det.box.y + det.box.h) * scy) + margenY);
  const w = x1 - x0, h = y1 - y0;
  if (w < 80 || h < 80) return src;

  const TARGET = 900;
  const out = document.createElement('canvas');
  out.width = TARGET;
  out.height = Math.max(200, Math.round(TARGET * h / w));
  out.getContext('2d').drawImage(src, x0, y0, w, h, 0, 0, out.width, out.height);
  return out;
}

async function capturarIne(side, auto) {
  const low = side.toLowerCase();
  const video = document.getElementById(`ine${side}Video`);
  if (!video || !video.videoWidth) return;
  const w = video.videoWidth, h = video.videoHeight;
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  src.getContext('2d').drawImage(video, 0, 0, w, h);

  let out = src;
  if (INE_CAM.det) out = recortarDocumento(src, INE_CAM.det);

  detenerCamaraIne(true);

  const blob = await new Promise(res => out.toBlob(res, 'image/jpeg', 0.92));
  if (!blob) { Utils.showToast('No se pudo generar la imagen', 'error'); return; }
  const file = new File([blob], 'ine_' + low + '.jpg', { type: 'image/jpeg' });
  const dt = new DataTransfer();
  dt.items.add(file);
  const input = document.getElementById('ine' + (side === 'Frontal' ? 'Frontal' : 'Trasera'));
  if (input) input.files = dt.files;
  document.getElementById('ine' + (side === 'Frontal' ? 'Frontal' : 'Trasera') + 'Preview').innerHTML =
    '<img src="' + out.toDataURL('image/jpeg', 0.85) + '" class="img-fluid border rounded" style="max-height:140px">';
  Utils.showToast((auto ? 'Cara ' : 'Foto ') + (side === 'Frontal' ? 'frontal' : 'trasera') + ' capturada', 'success');
}

async function subirIne() {
  const id = state.ineClienteId;
  const frontal = document.getElementById('ineFrontal').files[0];
  const trasera = document.getElementById('ineTrasera').files[0];
  if (!frontal && !trasera) {
    Utils.showToast('Selecciona al menos una imagen (frontal o trasera)', 'warning');
    return;
  }
  const formData = new FormData();
  if (frontal) formData.append('frontal', frontal);
  if (trasera) formData.append('trasera', trasera);
  const codigo = document.getElementById('ineCodigoLector')?.value.trim();
  if (codigo) formData.append('codigoLector', codigo);
  try {
    await API.requestUpload('/clientes/' + id + '/ine', formData);
    Utils.showToast('INE guardado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('clienteIneModal'))?.hide();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function buildDireccionString() {
  const calle = document.getElementById('clienteCalle').value.trim();
  const numExt = document.getElementById('clienteNumExt').value.trim();
  const numInt = document.getElementById('clienteNumInt').value.trim();
  const colonia = document.getElementById('clienteColonia')?.value || '';
  const municipio = document.getElementById('clienteMunicipio').value.trim();
  const estado = document.getElementById('clienteEstado').value.trim();
  const cp = document.getElementById('clienteCp').value.trim();

  const parts = [];
  if (calle) parts.push(calle);
  if (numExt) parts.push('Ext. ' + numExt);
  if (numInt) parts.push('Int. ' + numInt);
  if (colonia) parts.push(colonia);
  if (municipio) parts.push(municipio);
  if (estado) parts.push(estado);
  if (cp) parts.push('C.P. ' + cp);

  return parts.join(', ');
}

const cpCache = {};

async function cargarColonias(cp, selectedColonia) {
  if (!cp || cp.length !== 5) return;
  if (cpCache[cp]) {
    aplicarDatosCP(cpCache[cp], selectedColonia);
    return;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://api.zippopotam.us/MX/' + cp, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (data && data.places) {
      const result = {
        colonias: data.places.map(p => p['place name']),
        estado: data.places[0]?.state || ''
      };
      cpCache[cp] = result;
      aplicarDatosCP(result, selectedColonia);
    }
  } catch (_) {
    document.getElementById('clienteEstado').value = '';
    document.getElementById('clienteColonia').innerHTML = '<option value="">No disponible</option>';
  }
}

function aplicarDatosCP(result, selectedColonia) {
  const sel = document.getElementById('clienteColonia');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      result.colonias.map(c => `<option value="${c}" ${c === selectedColonia ? 'selected' : ''}>${c}</option>`).join('');
    sel.disabled = false;
  }
  const estadoInput = document.getElementById('clienteEstado');
  if (estadoInput) estadoInput.value = result.estado;
}
