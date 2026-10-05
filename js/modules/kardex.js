let state = {
  data: [],
  currentPage: 0,
  totalPages: 0,
  pageSize: 20,
  filterFechaInicio: '',
  filterFechaFin: '',
  filterTipo: '',
  filterSucursal: '',
};

export function init() {
  bindEvents();
  cargarSucursales();
  cargarMovimientos(0);
}

function bindEvents() {
  document.getElementById('filterKardexSucursal')?.addEventListener('change', e => {
    state.filterSucursal = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });

  document.getElementById('filterKardexFechaInicio')?.addEventListener('change', e => {
    state.filterFechaInicio = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });

  document.getElementById('filterKardexFechaFin')?.addEventListener('change', e => {
    state.filterFechaFin = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });

  document.getElementById('filterKardexTipo')?.addEventListener('change', e => {
    state.filterTipo = e.target.value;
    state.currentPage = 0;
    cargarMovimientos(0);
  });

  document.getElementById('btnExportarKardex')?.addEventListener('click', exportarCSV);
  document.getElementById('btnExportarKardexExcel')?.addEventListener('click', exportarExcel);
  document.getElementById('btnExportarKardexPdf')?.addEventListener('click', exportarPDF);
}

async function cargarSucursales() {
  try {
    const sucursales = await API.get('/sucursales');
    const sel = document.getElementById('filterKardexSucursal');
    if (sel) {
      sel.innerHTML = '<option value="">Todas</option>' +
        sucursales.map(s => '<option value="' + s.idSucursal + '">' + Utils.esc(s.nombre) + '</option>').join('');
    }
  } catch (_) {}
}

async function cargarMovimientos(page) {
  state.currentPage = page;
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('size', state.pageSize);

  if (state.filterFechaInicio) params.set('fechaInicio', state.filterFechaInicio + 'T00:00:00');
  if (state.filterFechaFin) params.set('fechaFin', state.filterFechaFin + 'T23:59:59');
  if (state.filterTipo) params.set('tipo', state.filterTipo);
  if (state.filterSucursal) params.set('idSucursal', state.filterSucursal);

  try {
    const result = await API.get('/kardex/todo?' + params.toString());
    state.data = result.content;
    state.totalPages = result.totalPages;
    renderTable();
    renderPagination();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function renderTable() {
  const tbody = document.getElementById('tableKardexBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-book"></i><p>No hay registros</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(r => {
    let badgeClass;
    if (r.tipo === 'ENTRADA' || r.tipo === 'ENTRADA_STOCK') badgeClass = 'badge-active';
    else if (r.tipo === 'SALIDA' || r.tipo === 'SALIDA_STOCK') badgeClass = 'badge-inactive';
    else if (r.tipo === 'AJUSTE' || r.tipo === 'AJUSTE_STOCK') badgeClass = 'badge bg-warning text-dark';
    else if (r.tipo === 'TRANSFERENCIA' || r.tipo === 'TRANSFERENCIA_STOCK') badgeClass = 'badge bg-info text-white';
    else if (r.tipo === 'CREAR' || r.tipo === 'CREACION') badgeClass = 'badge bg-info text-white';
    else if (r.tipo === 'ACTUALIZAR' || r.tipo === 'ACTUALIZACION') badgeClass = 'badge bg-primary text-white';
    else if (r.tipo === 'ELIMINAR') badgeClass = 'badge bg-danger text-white';
    else badgeClass = 'badge bg-secondary text-white';

    const tipoDisplay = r.tipo.replace('_STOCK', '').replace('_', ' ');
    const origenClass = r.origen === 'MOVIMIENTO' ? 'badge-active' : 'badge bg-secondary text-white';
    const stockDisplay = r.stockAnterior != null && r.stockNuevo != null
      ? r.stockAnterior + ' → ' + r.stockNuevo
      : '-';

    return `<tr>
      <td class="text-nowrap">${Utils.formatDateTime(r.fecha)}</td>
      <td><span class="${badgeClass}">${Utils.capitalize(tipoDisplay)}</span></td>
      <td>${Utils.esc(r.entidad)}</td>
      <td>${Utils.esc(r.detalle)}</td>
      <td class="fw-semibold">${r.cantidad != null ? r.cantidad : '-'}</td>
      <td>${stockDisplay}</td>
      <td>${Utils.esc(r.usuario)}</td>
      <td><span class="${origenClass}" style="font-size:0.7rem;padding:2px 8px;border-radius:10px">${r.origen}</span></td>
    </tr>`;
  }).join('');
}

function renderPagination() {
  const container = document.getElementById('paginationKardex');
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
      if (page >= 0 && page < state.totalPages) cargarMovimientos(page);
    });
  });
}

function exportarCSV() {
  if (!state.data || state.data.length === 0) {
    Utils.showToast('No hay datos para exportar', 'warning');
    return;
  }

  const headers = ['Fecha', 'Tipo', 'Entidad', 'Detalle', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Usuario', 'Referencia', 'Origen'];
  const rows = state.data.map(r => [
    r.fecha,
    r.tipo,
    r.entidad,
    r.detalle,
    r.cantidad != null ? r.cantidad : '',
    r.stockAnterior != null ? r.stockAnterior : '',
    r.stockNuevo != null ? r.stockNuevo : '',
    r.usuario,
    r.referencia || '',
    r.origen
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => '"' + (v || '') + '"').join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'kardex_' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
  Utils.showToast('Kardex exportado', 'success');
}

function buildKardexRows() {
  const headers = ['Fecha', 'Tipo', 'Entidad', 'Detalle', 'Cantidad', 'Stock Anterior', 'Stock Nuevo', 'Usuario', 'Referencia', 'Origen'];
  const rows = state.data.map(r => [
    r.fecha,
    r.tipo,
    r.entidad,
    r.detalle,
    r.cantidad != null ? r.cantidad : '',
    r.stockAnterior != null ? r.stockAnterior : '',
    r.stockNuevo != null ? r.stockNuevo : '',
    r.usuario,
    r.referencia || '',
    r.origen
  ]);
  return { headers, rows };
}

function exportarExcel() {
  if (!state.data || state.data.length === 0) {
    Utils.showToast('No hay datos para exportar', 'warning');
    return;
  }
  const { headers, rows } = buildKardexRows();
  Utils.downloadXls('kardex_' + new Date().toISOString().slice(0, 10) + '.xls', 'Kardex', headers, rows);
  Utils.showToast('Kardex exportado a Excel', 'success');
}

function exportarPDF() {
  if (!state.data || state.data.length === 0) {
    Utils.showToast('No hay datos para exportar', 'warning');
    return;
  }
  const rowsHtml = state.data.map(r =>
    '<tr>' +
      '<td>' + Utils.formatDateTime(r.fecha) + '</td>' +
      '<td>' + Utils.capitalize(r.tipo.replace('_STOCK', '').replace('_', ' ')) + '</td>' +
      '<td>' + Utils.esc(r.entidad) + '</td>' +
      '<td>' + Utils.esc(r.detalle) + '</td>' +
      '<td class="right">' + (r.cantidad != null ? r.cantidad : '') + '</td>' +
      '<td class="right">' + (r.stockAnterior != null ? r.stockAnterior + ' → ' + r.stockNuevo : '') + '</td>' +
      '<td>' + Utils.esc(r.usuario) + '</td>' +
    '</tr>'
  ).join('');

  const body =
    '<h2>KARDEX DE MOVIMIENTOS</h2>' +
    '<h4>Generado: ' + new Date().toLocaleString() + ' | Registros: ' + state.data.length + '</h4>' +
    '<table>' +
      '<thead><tr><th>Fecha</th><th>Tipo</th><th>Entidad</th><th>Detalle</th><th class="right">Cant.</th><th class="right">Stock</th><th>Responsable</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody>' +
    '</table>';

  Utils.openPrintWindow('Kardex', body);
}
