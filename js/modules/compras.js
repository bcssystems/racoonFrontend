let state = { compras: [], productos: [], sucursales: [], proveedores: [], detalles: [], guardando: false };
let productoModal = null;

export function init() {
  bindEvents();
  cargarStats();
  cargarCatalogo();
  cargarCompras();
}

function bindEvents() {
  if (!Utils.hasPermiso('RECEPCIONES_CREAR')) {
    const btn = document.getElementById('btnNuevaCompra');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevaCompra')?.addEventListener('click', abrirModal);
  document.getElementById('btnGuardarCompra')?.addEventListener('click', guardar);
  document.getElementById('btnAgregarDetalle')?.addEventListener('click', () => agregarDetalle());
  document.getElementById('searchCompras')?.addEventListener('input', Utils.debounce(cargarCompras, 300));
  document.getElementById('filtroSucursalCompra')?.addEventListener('change', cargarCompras);
  document.getElementById('tableComprasBody')?.addEventListener('click', handleTableClick);
  document.getElementById('modalCompra')?.addEventListener('shown.bs.modal', () => {
    document.getElementById('cmpSucursal')?.focus();
  });
}

async function cargarStats() {
  try {
    const stats = await API.get('/recepciones/stats');
    document.getElementById('statCompras').textContent = stats.totalRecepciones || 0;
    document.getElementById('statCantidad').textContent = Math.round((stats.totalCantidad || 0) * 100) / 100;
    document.getElementById('statProductosRecibidos').textContent = '';
    document.getElementById('statCantidad30').textContent = Math.round((stats.cantidad30Dias || 0) * 100) / 100;
  } catch (err) { /* silencioso */ }
}

async function cargarCatalogo() {
  try {
    state.sucursales = await API.get('/sucursales');
    state.sucursales = state.sucursales || [];
    const selSuc = document.getElementById('cmpSucursal');
    if (selSuc) selSuc.innerHTML = state.sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
    if (state.sucursales.length === 1 && selSuc) selSuc.value = state.sucursales[0].idSucursal;

    const selFiltro = document.getElementById('filtroSucursalCompra');
    if (selFiltro) selFiltro.innerHTML = '<option value="">Todas las sucursales</option>' +
      state.sucursales.map(s => `<option value="${s.idSucursal}">${Utils.esc(s.nombre)}</option>`).join('');
  } catch (err) {
    state.sucursales = [];
    Utils.showToast('Error al cargar sucursales: ' + err.message, 'error');
  }

  try {
    const res = await API.get('/proveedores?size=200');
    state.proveedores = res.content || res || [];
    const selProv = document.getElementById('cmpProveedor');
    if (selProv) selProv.innerHTML = '<option value="">Sin proveedor</option>' +
      state.proveedores.map(p => `<option value="${p.idProveedor}">${Utils.esc(p.nombre)}</option>`).join('');
  } catch (err) {
    state.proveedores = [];
    Utils.showToast('Error al cargar proveedores: ' + err.message, 'error');
  }

  try {
    const page = await API.get('/productos?size=1000&activo=true');
    state.productos = page.content || page || [];
  } catch (err) {
    state.productos = [];
    Utils.showToast('Error al cargar el inventario: ' + err.message, 'error');
  }

  if (state.productos.length === 0) {
    Utils.showToast('No hay productos activos en el inventario', 'warning');
  }
}

async function cargarCompras() {
  const search = document.getElementById('searchCompras')?.value || '';
  const idSucursal = document.getElementById('filtroSucursalCompra')?.value || '';
  try {
    const q = new URLSearchParams({ search });
    if (idSucursal) q.set('idSucursal', idSucursal);
    state.compras = await API.get('/recepciones?' + q.toString());
    renderTable();
  } catch (err) {
    state.compras = [];
    renderTable();
  }
}

function renderTable() {
  const tbody = document.getElementById('tableComprasBody');
  if (!tbody) return;
  if (!state.compras || state.compras.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-truck-loading"></i><p>No hay compras</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = state.compras.map(r => `<tr>
    <td><span class="badge-status badge-active">${Utils.esc(r.folio)}</span></td>
    <td>${Utils.esc(r.proveedorNombre) || '-'}</td>
    <td>${Utils.esc(r.sucursalNombre)}</td>
    <td><strong>${Math.round(r.totalCantidad * 100) / 100}</strong></td>
    <td>${Utils.esc(r.usuario) || '-'}</td>
    <td>${Utils.formatDateTime(r.fechaRecepcion)}</td>
    <td class="acciones-cell">
      <button type="button" class="btn-kebab-toggle kebab-trigger" data-id="${r.idRecepcion}" data-action="menu" title="Acciones"><i class="fas fa-ellipsis-v"></i></button>
    </td>
  </tr>`).join('');
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const items = [
      { icon: 'fa-eye', text: 'Ver detalle', color: 'var(--primary)', onClick: () => verCompra(id) },
      { icon: 'fa-print', text: 'Imprimir factura', color: 'var(--success)', onClick: () => imprimirFactura(id) },
    ];
    if (Utils.hasPermiso('RECEPCIONES_ELIMINAR')) {
      items.push({ danger: true, icon: 'fa-trash', text: 'Eliminar', onClick: () => eliminarCompra(id) });
    }
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const btn = e.target.closest('.btn-action');
  if (!btn) return;
  e.preventDefault();
  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'ver') verCompra(id);
  else if (action === 'imprimir') imprimirFactura(id);
  else if (action === 'eliminar') eliminarCompra(id);
}

async function verCompra(id) {
  try {
    const r = await API.get('/recepciones/' + id);
    const filas = (r.detalles || []).map(d => `<tr>
      <td>${Utils.esc(d.sku)}</td><td>${Utils.esc(d.productoNombre)}</td>
      <td>${d.cantidad}</td>
      <td>${Utils.formatMonto(d.precioCompra)}</td><td>${Utils.formatMonto(d.subtotal)}</td>
    </tr>`).join('');
    const body = `
      <div class="mb-2"><strong>Folio:</strong> ${Utils.esc(r.folio)} &nbsp; <strong>Proveedor:</strong> ${Utils.esc(r.proveedorNombre) || '-'}</div>
      <div class="mb-2"><strong>Sucursal:</strong> ${Utils.esc(r.sucursalNombre)} &nbsp; <strong>Fecha:</strong> ${Utils.formatDateTime(r.fechaRecepcion)}</div>
      ${r.nota ? `<div class="mb-3"><strong>Nota:</strong> ${Utils.esc(r.nota)}</div>` : ''}
      <div class="table-responsive"><table class="table table-sm table-custom mb-2">
        <thead><tr><th>SKU</th><th>Producto</th><th>Cantidad</th><th>P.Compra</th><th>Subtotal</th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>
       <div class="d-flex justify-content-end gap-4"><div class="fw-bold">Total cantidad: ${r.totalCantidad}</div></div>`;
    Utils.showDialog('Compra ' + Utils.esc(r.folio), body);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function imprimirFactura(id) {
  try {
    const r = await API.get('/recepciones/' + id);
    imprimirTicket(r);
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function imprimirTicket(r) {
  const filas = (r.detalles || []).map(d => `<tr>
    <td>${Utils.esc(d.productoNombre)}</td><td>${Utils.esc(d.sku)}</td>
     <td style="text-align:center">${d.cantidad}</td>
    <td style="text-align:right">${Utils.formatMonto(d.precioCompra)}</td>
    <td style="text-align:right">${Utils.formatMonto(d.subtotal)}</td>
  </tr>`).join('');
  const total = (r.detalles || []).reduce((s, d) => s + d.subtotal, 0);

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Compra ${Utils.esc(r.folio)}</title>
    <style>
      body{font-family:Inter,Segoe UI,sans-serif;font-size:13px;color:#0f172a;margin:0;padding:24px}
      h1{margin:0;font-size:22px;color:#1e3a5f}
      .header{border-bottom:3px solid #2563eb;padding-bottom:10px;margin-bottom:14px}
      .row{display:flex;justify-content:space-between;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;margin-top:6px}
      th{background:#eff6ff;color:#1e3a5f;text-align:left;padding:6px}
      td{padding:6px;border-bottom:1px solid #e2e8f0}
      .totales{margin-top:12px;display:flex;justify-content:flex-end;gap:30px;font-weight:700}
      .muted{color:#64748b;font-size:11px}
      @media print{body{padding:0}}
    </style></head><body>
    <div class="header" style="text-align:center;border-bottom:3px solid #2563EB;padding-bottom:8px;margin-bottom:10px">
      <img src="assets/imgs/logotex.png" style="max-height:72px;max-width:340px" alt="Logotex">
      <div style="font-size:13px;font-weight:700;color:#1e3a5f;margin-top:4px">Nota de Compra / Factura</div>
      <div class="muted">PRISCILA ARONG KIM LOPEZ</div>
    </div>
    <div class="row">
      <div><b>Folio:</b> ${Utils.esc(r.folio)}<br><b>Fecha:</b> ${Utils.formatDateTime(r.fechaRecepcion)}</div>
      <div style="text-align:right"><b>Proveedor:</b> ${Utils.esc(r.proveedorNombre) || 'Consignaci&oacute;n'}<br>
      ${r.proveedorRfc ? '<b>RFC:</b> ' + Utils.esc(r.proveedorRfc) + '<br>' : ''}<b>Usuario:</b> ${Utils.esc(r.usuario) || '-'}</div>
    </div>
    <div class="muted" style="margin-bottom:4px"><b>Sucursal:</b> ${Utils.esc(r.sucursalNombre)}${r.nota ? ' &nbsp;|&nbsp; <b>Nota:</b> ' + Utils.esc(r.nota) : ''}</div>
    <table>
       <thead><tr><th>Producto</th><th>SKU</th><th style="text-align:center">Cantidad</th><th style="text-align:right">Precio</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
    <div class="totales">
       <span>Total cantidad: ${r.totalCantidad}</span>
      <span>Total: ${Utils.formatMonto(total)}</span>
    </div>
    <p class="muted" style="margin-top:24px">Documento generado por el sistema de Logotex — Gracias por su preferencia.</p>
    <script>window.onload=function(){window.print();}<\/script>
  </body></html>`;

  const win = window.open('', '_blank', 'width=820,height=600');
  if (!win) { Utils.showToast('Habilita las ventanas emergentes', 'error'); return; }
  win.document.write(html);
  win.document.close();
}

async function eliminarCompra(id) {
  const confirmed = await Utils.confirm('Esta acci&oacute;n descontar&aacute; el stock de la compra. \u00bfContinuar?', 'Eliminar compra');
  if (!confirmed) return;
  try {
    await API.del('/recepciones/' + id);
    Utils.showToast('Compra eliminada', 'success');
    cargarStats();
    cargarCompras();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function abrirModal() {
  state.detalles = [];
  document.getElementById('tableDetallesCompra').innerHTML = '';
  document.getElementById('cmpNota').value = '';
  actualizarTotales();
  const modal = document.getElementById('modalCompra');
  if (!modal) return;
  if (!productoModal) productoModal = new bootstrap.Modal(modal, { backdrop: 'static' });
  productoModal.show();
}

function agregarDetalle(producto, cantidad, precio) {
  if (!state.productos || state.productos.length === 0) {
    Utils.showToast('No hay productos en el inventario para agregar', 'warning');
    return;
  }
  const opts = state.productos.map(p =>
    `<option value="${p.idProducto}" data-nombre="${Utils.esc(p.nombre)}">${Utils.esc(p.sku)} - ${Utils.esc(p.nombre)}</option>`).join('');
  const uid = 'det-producto-' + Date.now() + Math.floor(Math.random() * 1000);
  const fila = document.createElement('tr');
  fila.innerHTML = `
    <td>
      <select id="${uid}" class="form-select form-select-sm det-producto">${opts}</select>
    </td>
     <td><input type="number" class="form-control form-control-sm det-cantidad" value="${cantidad || ''}" min="1" placeholder="Cantidad"></td>
    <td><input type="number" class="form-control form-control-sm det-precio" value="${precio || ''}" min="0" step="0.01" placeholder="$"></td>
    <td class="det-subtotal text-end fw-semibold">$0.00</td>
    <td><button class="btn-action" style="color:var(--danger)" data-action="quitar"><i class="fas fa-times"></i></button></td>`;
  document.getElementById('tableDetallesCompra').appendChild(fila);
  Utils.makeSearchableSelect(uid);
  const detInput = fila.querySelector('.searchable-input');
  if (detInput) {
    detInput.placeholder = 'Buscar producto...';
    detInput.focus();
  }
  const sel = fila.querySelector('.det-producto');
  if (producto && state.productos.find(p => p.idProducto === producto)) {
    sel.value = producto;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  ['input', 'change'].forEach(ev => {
   fila.querySelector('.det-cantidad').addEventListener(ev, () => recalcularFila(fila));
    fila.querySelector('.det-precio').addEventListener(ev, () => recalcularFila(fila));
    sel.addEventListener(ev, () => recalcularFila(fila));
  });
  fila.querySelector('button[data-action="quitar"]').addEventListener('click', () => {
    fila.remove();
    actualizarTotales();
  });
  recalcularFila(fila);
}

function recalcularFila(fila) {
  const sel = fila.querySelector('.det-producto');
   const cantidad = parseFloat(fila.querySelector('.det-cantidad').value) || 0;
  const precio = parseFloat(fila.querySelector('.det-precio').value) || 0;
   fila.querySelector('.det-subtotal').textContent = Utils.formatMonto(cantidad * precio);
  actualizarTotales();
}

function actualizarTotales() {
  const filas = document.querySelectorAll('#tableDetallesCompra tr');
  let cantidad = 0;
  let total = 0;
  filas.forEach(f => {
    const qty = parseFloat(f.querySelector('.det-cantidad')?.value) || 0;
    const precio = parseFloat(f.querySelector('.det-precio')?.value) || 0;
    cantidad += qty;
    total += qty * precio;
  });
  document.getElementById('cmpTotalCantidad').textContent = cantidad;
  document.getElementById('cmpTotalCompra').textContent = Utils.formatMonto(total);
}

async function guardar() {
  if (state.guardando) return;
  const idSucursal = document.getElementById('cmpSucursal').value;
  const idProveedor = document.getElementById('cmpProveedor').value;
  const nota = document.getElementById('cmpNota').value;
  const detalles = [];
  const filas = document.querySelectorAll('#tableDetallesCompra tr');

  if (!idSucursal) { Utils.showToast('Selecciona una sucursal', 'warning'); return; }
  if (filas.length === 0) { Utils.showToast('Agrega al menos un producto', 'warning'); return; }

  for (const f of filas) {
    const idProducto = parseInt(f.querySelector('.det-producto').value);
     const cantidad = parseInt(f.querySelector('.det-cantidad').value);
    const precio = parseFloat(f.querySelector('.det-precio').value);
    if (!cantidad || cantidad <= 0) { Utils.showToast('Indica la cantidad de cada producto', 'warning'); return; }
    if (!Number.isFinite(precio) || precio < 0) { Utils.showToast('Precio de compra inv&aacute;lido', 'warning'); return; }
     detalles.push({ idProducto, cantidad, precioCompra: precio });
  }

  state.guardando = true;
  const btn = document.getElementById('btnGuardarCompra');
  if (btn) { btn.disabled = true; btn.dataset.originalText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Guardando...'; }
  try {
    await API.post('/recepciones', { idSucursal: parseInt(idSucursal), idProveedor: idProveedor ? parseInt(idProveedor) : null, nota, detalles });
    Utils.showToast('Compra registrada', 'success');
    productoModal.hide();
    cargarStats();
    cargarCompras();
  } catch (err) { Utils.showToast(err.message, 'error'); }
  finally {
    state.guardando = false;
    if (btn) { btn.disabled = false; if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText; }
  }
}
