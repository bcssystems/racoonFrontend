import { printCotizacion } from './printing.js';

let state = { data: [], clientes: [], productos: [], cart: [], filtro: 'vigentes', productSearchTimeout: null, cancelandoId: null, sucursales: [], idSucursalSeleccionada: null, editingId: null, detalleActual: null };

export function init() {
  bindEvents();
  Utils.cargarOpcionesCategoria('cotFilterCategoria', 'Todas');
  cargarCotizaciones();
  cargarClientes();
  cargarSucursales();
}

function bindEvents() {
  if (!Utils.hasPermiso('COTIZACIONES_CREAR')) {
    const btn = document.getElementById('btnNuevaCotizacion');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnNuevaCotizacion')?.addEventListener('click', abrirModalNueva);
  document.getElementById('tableCotizacionesBody')?.addEventListener('click', handleTableClick);
  document.querySelectorAll('input[name="filtroCotizacion"]').forEach(r => {
    r.addEventListener('change', e => {
      state.filtro = e.target.value;
      cargarCotizaciones();
    });
  });
  document.getElementById('cotProductSearch')?.addEventListener('input', () => {
    clearTimeout(state.productSearchTimeout);
    state.productSearchTimeout = setTimeout(() => buscarProductos(false), 300);
  });
  document.getElementById('cotProductSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { clearTimeout(state.productSearchTimeout); buscarProductos(false); }
  });
  document.getElementById('btnCotVerInventario')?.addEventListener('click', () => {
    document.getElementById('cotProductSearch').value = '';
    buscarProductos(true);
  });
  document.getElementById('cotFilterCategoria')?.addEventListener('change', () => buscarProductos());
  document.getElementById('cotCobraEnvio')?.addEventListener('change', (e) => {
    document.getElementById('cotMontoEnvioWrapper')?.classList.toggle('d-none', !e.target.checked);
    actualizarTotalesCotizacion();
  });
  document.getElementById('cotMontoEnvio')?.addEventListener('input', actualizarTotalesCotizacion);
  document.getElementById('cotCartBody')?.addEventListener('click', handleCartClick);
  document.getElementById('btnGuardarCotizacion')?.addEventListener('click', guardarCotizacion);
  document.getElementById('btnConfirmarCancelarCot')?.addEventListener('click', confirmarCancelar);
  document.getElementById('btnImprimirCotizacion')?.addEventListener('click', () => {
    if (state.detalleActual) printCotizacion(state.detalleActual);
  });
  document.getElementById('cotSucursal')?.addEventListener('change', (e) => {
    state.idSucursalSeleccionada = parseInt(e.target.value) || null;
    if (state.productos.length > 0) buscarProductos(document.getElementById('cotProductSearch')?.value?.trim() ? false : true);
  });
  document.querySelectorAll('input[name="cotTipoVenta"]').forEach(r => {
    r.addEventListener('change', toggleCreditoFields);
  });
  document.getElementById('cotCreditoPlazo')?.addEventListener('change', actualizarResumenCredito);
  document.getElementById('cotCreditoInteres')?.addEventListener('input', actualizarResumenCredito);
  document.addEventListener('click', (e) => {
    const results = document.getElementById('cotProductResults');
    if (results && !e.target.closest('.cot-product-search-area')) {
      results.classList.add('d-none');
    }
  });
}

function toggleCreditoFields() {
  const tipo = document.querySelector('input[name="cotTipoVenta"]:checked')?.value || 'CONTADO';
  const isCredito = tipo === 'CREDITO';
  document.getElementById('cotCreditoPlazoWrapper')?.classList.toggle('d-none', !isCredito);
  document.getElementById('cotCreditoInteresWrapper')?.classList.toggle('d-none', !isCredito);
  document.getElementById('cotCreditoResumenWrapper')?.classList.toggle('d-none', !isCredito);
  if (isCredito) actualizarResumenCredito();
}

function actualizarResumenCredito() {
  const subtotal = state.cart.reduce((sum, d) => sum + (d.cantidad * d.precioUnitario), 0);
  const cobraEnvio = document.getElementById('cotCobraEnvio')?.checked || false;
  const montoEnvio = cobraEnvio ? (parseFloat(document.getElementById('cotMontoEnvio')?.value) || 0) : 0;
  const base = subtotal + montoEnvio;
  const interes = parseFloat(document.getElementById('cotCreditoInteres')?.value) || 0;
  const plazo = parseInt(document.getElementById('cotCreditoPlazo')?.value) || 1;
  const totalConInteres = base + (base * interes / 100);
  const pagoMensual = totalConInteres / plazo;
  const montoEl = document.getElementById('cotCreditoMontoTotal');
  const pagoEl = document.getElementById('cotCreditoPagoMensual');
  if (montoEl) montoEl.textContent = Utils.formatMonto(totalConInteres);
  if (pagoEl) pagoEl.textContent = Utils.formatMonto(pagoMensual) + ' x ' + plazo + ' meses';
}

function getStockSucursal(producto) {
  if (!state.idSucursalSeleccionada || !producto?.inventarioSucursales) return producto?.stockActual || 0;
  const inv = producto.inventarioSucursales.find(i => i.idSucursal === state.idSucursalSeleccionada);
  return inv != null ? inv.stock : 0;
}

function handleTableClick(e) {
  const kebab = e.target.closest('.kebab-trigger');
  if (kebab) {
    e.preventDefault();
    const id = parseInt(kebab.dataset.id);
    const c = state.data.find(x => x.idCotizacion === id);
    const vigente = c && c.estado === 'VIGENTE';
    const items = [
      { icon: 'fa-eye', text: 'Ver detalle', color: 'var(--info)', onClick: () => verDetalle(id) },
      { icon: 'fa-print', text: 'Imprimir / PDF', color: 'var(--secondary)', onClick: () => printCotizacion(c) },
    ];
    if (vigente) {
      if (Utils.hasPermiso('COTIZACIONES_CREAR')) {
        items.push({ icon: 'fa-pen', text: 'Editar', color: 'var(--warning)', onClick: () => abrirModalEditar(id) });
      }
      items.push({ icon: 'fa-cash-register', text: 'Ir a Caja', color: 'var(--success)', onClick: () => irACaja(id) });
      if (Utils.hasPermiso('COTIZACIONES_CANCELAR')) {
        items.push({ danger: true, icon: 'fa-ban', text: 'Cancelar', onClick: () => abrirCancelar(id) });
      }
    }
    Utils.abrirMenuKebab(kebab, items);
    return;
  }
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = parseInt(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'ver') verDetalle(id);
  else if (action === 'ir-a-caja') irACaja(id);
  else if (action === 'cancelar') abrirCancelar(id);
}

function handleCartClick(e) {
  const btn = e.target.closest('.cot-cart-remove');
  if (!btn) return;
  const idx = parseInt(btn.dataset.index);
  state.cart.splice(idx, 1);
  renderCart();
}

async function cargarCotizaciones() {
  try {
    if (state.filtro === 'todas') {
      state.data = await API.get('/cotizaciones');
    } else {
      const estadoMap = { vigentes: 'VIGENTE', expiradas: 'EXPIRADA', convertidas: 'CONVERTIDA', canceladas: 'CANCELADA' };
      state.data = await API.get('/cotizaciones?estado=' + estadoMap[state.filtro]);
    }
    renderTable();
  } catch (err) {
    state.data = [];
    renderTable();
  }
}

function renderTable() {
  const tbody = document.getElementById('tableCotizacionesBody');
  if (!tbody) return;

  if (!state.data || state.data.length === 0) {
    const msg = state.filtro === 'todas' ? 'No hay cotizaciones' : 'No hay cotizaciones ' + state.filtro;
    tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fas fa-file-invoice"></i><p>' + msg + '</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = state.data.map(c => {
    const estadoBadge = getEstadoBadge(c.estado);
    const envioText = c.cobraEnvio ? Utils.formatMonto(c.montoEnvio) : '-';
    const expiracion = c.fechaExpiracion ? new Date(c.fechaExpiracion).toLocaleDateString('es-MX') : '-';
    const creacion = c.fechaCreacion ? new Date(c.fechaCreacion).toLocaleDateString('es-MX') : '-';
    const tipoVenta = c.tipoVenta || 'CONTADO';
    const tipoBadge = tipoVenta === 'CREDITO' ? ' <span class="badge bg-info" style="font-size:0.6rem">CR&Eacute;DITO</span>' : '';

    return '<tr>' +
      '<td class="fw-bold">#' + c.idCotizacion + tipoBadge + '</td>' +
      '<td>' + Utils.esc(c.clienteNombre || '-') + '</td>' +
      '<td>' + Utils.esc(c.paqueteria || '-') + '</td>' +
      '<td>' + envioText + '</td>' +
      '<td class="fw-bold">' + Utils.formatMonto(c.total) + '</td>' +
      '<td>' + estadoBadge + '</td>' +
      '<td>' + expiracion + '</td>' +
      '<td>' + creacion + '</td>' +
      '<td class="acciones-cell"><button type="button" class="btn-kebab-toggle kebab-trigger" data-id="' + c.idCotizacion + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td>' +
    '</tr>';
  }).join('');
}

function getEstadoBadge(estado) {
  const map = {
    VIGENTE: 'bg-success',
    EXPIRADA: 'bg-warning text-dark',
    CONVERTIDA: 'bg-info',
    CANCELADA: 'bg-danger',
  };
  return '<span class="badge ' + (map[estado] || 'bg-secondary') + '">' + estado + '</span>';
}

async function cargarClientes() {
  try {
    const result = await API.get('/clientes?page=0&size=500');
    state.clientes = result.content || [];
    const sel = document.getElementById('cotCliente');
    if (sel) {
      sel.innerHTML = '<option value="">Seleccionar cliente...</option>' +
        state.clientes.map(c =>
          '<option value="' + c.idCliente + '">' + Utils.esc(c.nombre + ' ' + (c.apellidoPaterno || '')) + '</option>'
        ).join('');
    }
  } catch (_) {}
}

async function cargarSucursales() {
  try {
    state.sucursales = await API.get('/sucursales');
    const sel = document.getElementById('cotSucursal');
    if (sel) {
      sel.innerHTML = '<option value="">Seleccionar sucursal...</option>' +
        state.sucursales.map(s => '<option value="' + s.idSucursal + '">' + Utils.esc(s.nombre) + '</option>').join('');
    }
  } catch (_) {}
}

async function abrirModalNueva() {
  state.cart = [];
  state.editingId = null;
  state.idSucursalSeleccionada = null;
  const form = document.getElementById('cotCliente');
  if (form) form.value = '';
  const sucSel = document.getElementById('cotSucursal');
  if (sucSel) sucSel.value = '';
  document.getElementById('cotizacionModalTitle').textContent = 'Nueva Cotizaci\u00f3n';
  document.getElementById('cotDiasVigencia').value = '15';
  document.getElementById('cotPaqueteria').value = '';
  document.getElementById('cotCobraEnvio').checked = false;
  document.getElementById('cotMontoEnvio').value = '0';
  document.getElementById('cotMontoEnvioWrapper')?.classList.add('d-none');
  document.getElementById('cotNota').value = '';
  document.getElementById('cotProductSearch').value = '';
  document.getElementById('cotProductResults')?.classList.add('d-none');
  document.getElementById('cotTipoContado').checked = true;
  document.getElementById('cotTipoCredito').checked = false;
  document.getElementById('cotCreditoPlazo').value = '3';
  document.getElementById('cotCreditoInteres').value = '0';
  toggleCreditoFields();
  renderCart();
  new bootstrap.Modal(document.getElementById('cotizacionModal')).show();
}

async function abrirModalEditar(id) {
  try {
    const c = await API.get('/cotizaciones/' + id);
    state.editingId = id;
    state.cart = [];
    state.idSucursalSeleccionada = null;

    document.getElementById('cotizacionModalTitle').textContent = 'Editar Cotizaci\u00f3n #' + id;
    const form = document.getElementById('cotCliente');
    if (form) form.value = c.idCliente || '';
    const sucSel = document.getElementById('cotSucursal');
    if (sucSel) sucSel.value = '';
    document.getElementById('cotDiasVigencia').value = c.diasVigencia != null ? c.diasVigencia : '15';
    document.getElementById('cotPaqueteria').value = c.paqueteria || '';
    document.getElementById('cotCobraEnvio').checked = !!c.cobraEnvio;
    document.getElementById('cotMontoEnvio').value = c.montoEnvio != null ? c.montoEnvio : '0';
    document.getElementById('cotMontoEnvioWrapper')?.classList.toggle('d-none', !c.cobraEnvio);
    document.getElementById('cotNota').value = c.nota || '';
    document.getElementById('cotProductSearch').value = '';
    document.getElementById('cotProductResults')?.classList.add('d-none');

    const tipoVenta = c.tipoVenta || 'CONTADO';
    const isCredito = tipoVenta === 'CREDITO';
    document.getElementById('cotTipoContado').checked = !isCredito;
    document.getElementById('cotTipoCredito').checked = isCredito;
    document.getElementById('cotCreditoPlazo').value = c.plazoMeses != null ? c.plazoMeses : '3';
    document.getElementById('cotCreditoInteres').value = c.porcentajeInteres != null ? c.porcentajeInteres : '0';
    toggleCreditoFields();

    state.cart = (c.detalles || []).map(d => ({
      idProducto: d.idProducto,
      nombre: d.productoNombre,
      sku: d.productoSku || '',
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      stockActual: null,
    }));

    renderCart();
    new bootstrap.Modal(document.getElementById('cotizacionModal')).show();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function buscarProductos(showAll) {
  const q = document.getElementById('cotProductSearch')?.value?.trim() || '';
  const results = document.getElementById('cotProductResults');
  const list = document.getElementById('cotProductList');
  if (!results || !list) return;

  if (q.length < 1 && !showAll) {
    results.classList.add('d-none');
    return;
  }

  try {
    const hasQuery = q.length > 0;
    const cat = document.getElementById('cotFilterCategoria')?.value || '';
    const filtros = [];
    if (cat) filtros.push('idCategoria=' + cat);
    if (state.idSucursalSeleccionada) filtros.push('idSucursal=' + state.idSucursalSeleccionada);
    const filtroStr = filtros.length ? '&' + filtros.join('&') : '';
    const url = hasQuery
      ? '/productos/para-venta?search=' + encodeURIComponent(q) + '&page=0&size=20' + filtroStr
      : '/productos/para-venta?page=0&size=50&sort=sku,ASC' + filtroStr;
    const data = await API.get(url);
    state.productos = data.content || [];
    if (state.productos.length === 0) {
      list.innerHTML = '<div class="pos-product-result-item text-muted">Sin resultados</div>';
    } else {
      const sorted = [...state.productos].sort((a, b) => {
        const stA = getStockSucursal(a) > 0 ? 0 : 1;
        const stB = getStockSucursal(b) > 0 ? 0 : 1;
        return stA - stB;
      });

      list.innerHTML = sorted.map(p => {
        const precio = p.precioBase || 0;
        const stock = getStockSucursal(p);
        const sinStock = stock <= 0;
        const disabled = sinStock;
        return '<div class="pos-product-result-item ' + (disabled ? 'text-muted opacity-50' : '') + '" data-id="' + p.idProducto + '">' +
          '<div>' +
            '<div class="fw-semibold small">' + Utils.esc(p.nombre) + '</div>' +
            '<small class="text-muted">SKU: ' + Utils.esc(p.sku || '-') + ' | ' + Utils.formatMonto(precio) + ' | Stock: ' + stock + '</small>' +
            (sinStock ? '<br><small class="badge bg-secondary mt-1"><i class="fas fa-times-circle me-1"></i>Sin stock</small>' : '') +
          '</div>' +
          '<div class="text-end">' +
            '<button class="btn btn-sm ' + (disabled ? 'btn-secondary' : 'btn-success') + ' pos-add-cart" data-id="' + p.idProducto + '" style="font-size:0.7rem" ' + (disabled ? 'disabled' : '') + '>' +
              '<i class="fas fa-cart-plus"></i>' +
            '</button>' +
          '</div>' +
        '</div>';
      }).join('');

      list.querySelectorAll('.pos-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!btn.disabled) agregarAlCart(parseInt(btn.dataset.id));
        });
      });

      list.querySelectorAll('.pos-product-result-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.pos-add-cart')) return;
          const btn = item.querySelector('.pos-add-cart');
          if (btn && !btn.disabled) agregarAlCart(parseInt(item.dataset.id));
        });
      });
    }
    results.classList.remove('d-none');
  } catch (_) {
    list.innerHTML = '<div class="pos-product-result-item text-muted">Error al buscar</div>';
    results.classList.remove('d-none');
  }
}

function agregarAlCart(prodId) {
  const p = state.productos.find(x => x.idProducto === prodId);
  if (!p) return;

  const stock = getStockSucursal(p);
  if (stock <= 0) {
    Utils.showToast('No hay stock de ' + p.nombre + ' en la sucursal seleccionada', 'error');
    return;
  }

  const precio = p.precioBase || 0;

  const existente = state.cart.find(d => d.idProducto === prodId);
  if (existente) {
    if (existente.cantidad >= stock) {
      Utils.showToast('Stock insuficiente: solo hay ' + stock + ' unidades de ' + p.nombre, 'warning');
      return;
    }
    if (stock <= 5 && existente.cantidad + 1 >= stock) {
      Utils.showToast('Quedan solo ' + stock + ' unidades de ' + p.nombre, 'warning');
    }
    existente.cantidad++;
  } else {
    if (stock <= 5) {
      Utils.showToast('Quedan solo ' + stock + ' unidades de ' + p.nombre, 'warning');
    }
    state.cart.push({
      idProducto: prodId,
      nombre: p.nombre,
      sku: p.sku,
      cantidad: 1,
      precioUnitario: precio,
      stockActual: stock,
    });
  }

  renderCart();
  document.getElementById('cotProductResults')?.classList.add('d-none');
  document.getElementById('cotProductSearch').value = '';
}

function renderCart() {
  const tbody = document.getElementById('cotCartBody');
  if (!tbody) return;

  if (state.cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state py-3"><i class="fas fa-cart-plus"></i><p>Agrega productos a la cotizaci\u00f3n</p></div></td></tr>';
  } else {
    tbody.innerHTML = state.cart.map((d, i) => {
      const stock = d.stockActual;
      const sinStock = stock != null && stock <= 0;
      const exceedsStock = stock != null && d.cantidad > stock;
      const stockHtml = stock == null
        ? '<span class="text-muted">&mdash;</span>'
        : '<span class="fw-semibold ' + (exceedsStock ? 'text-danger' : (sinStock ? 'text-danger' : (stock <= 5 ? 'text-warning' : ''))) + '">' + stock + '</span>';
      return '<tr>' +
        '<td>' +
          '<div class="fw-semibold small">' + Utils.esc(d.nombre) + '</div>' +
          '<small class="text-muted" style="font-size:0.65rem">' + (d.sku || '') + '</small>' +
        '</td>' +
        '<td>' +
          '<div class="d-flex align-items-center gap-1">' +
            '<button class="pos-cart-qty-btn cot-cart-minus" data-index="' + i + '"><i class="fas fa-minus"></i></button>' +
            '<span class="fw-semibold px-1">' + d.cantidad + '</span>' +
            '<button class="pos-cart-qty-btn cot-cart-plus" data-index="' + i + '"><i class="fas fa-plus"></i></button>' +
          '</div>' +
        '</td>' +
        '<td>' + stockHtml + '</td>' +
        '<td>' + Utils.formatMonto(d.precioUnitario) + '</td>' +
        '<td class="fw-semibold' + (exceedsStock ? ' text-danger' : '') + '">' + Utils.formatMonto(d.cantidad * d.precioUnitario) + '</td>' +
        '<td><button class="cot-cart-remove" data-index="' + i + '"><i class="fas fa-times"></i></button></td>' +
      '</tr>';
    }).join('');

    tbody.querySelectorAll('.cot-cart-minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.index);
        if (state.cart[i].cantidad > 1) state.cart[i].cantidad--;
        else state.cart.splice(i, 1);
        renderCart();
      });
    });
    tbody.querySelectorAll('.cot-cart-plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.index);
        const item = state.cart[i];
        if (item.stockActual != null && item.cantidad >= item.stockActual) {
          Utils.showToast('Stock insuficiente: solo hay ' + item.stockActual + ' unidades de ' + item.nombre, 'warning');
          return;
        }
        item.cantidad++;
        renderCart();
      });
    });
  }

  actualizarTotalesCotizacion();
}

function actualizarPreciosCart() {
  state.cart.forEach(d => {
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p && p.precioBase > 0) {
      d.precioUnitario = p.precioBase;
    }
  });
  renderCart();
}

function actualizarTotalesCotizacion() {
  const subtotal = state.cart.reduce((sum, d) => sum + (d.cantidad * d.precioUnitario), 0);
  const cobraEnvio = document.getElementById('cotCobraEnvio')?.checked || false;
  const montoEnvio = cobraEnvio ? (parseFloat(document.getElementById('cotMontoEnvio')?.value) || 0) : 0;
  const total = subtotal + montoEnvio;

  document.getElementById('cotSubtotal').textContent = Utils.formatMonto(subtotal);
  document.getElementById('cotEnvioTotal').textContent = Utils.formatMonto(montoEnvio);
  document.getElementById('cotTotal').textContent = Utils.formatMonto(total);

  const tipo = document.querySelector('input[name="cotTipoVenta"]:checked')?.value || 'CONTADO';
  if (tipo === 'CREDITO') actualizarResumenCredito();
}

async function guardarCotizacion() {
  if (state.cart.length === 0) {
    Utils.showToast('Agrega al menos un producto', 'warning');
    return;
  }

  const idCliente = document.getElementById('cotCliente')?.value;
  if (!idCliente) {
    Utils.showToast('Selecciona un cliente', 'warning');
    return;
  }

  if (!state.editingId && !state.idSucursalSeleccionada) {
    Utils.showToast('Selecciona una sucursal', 'warning');
    return;
  }

  const diasVigencia = parseInt(document.getElementById('cotDiasVigencia')?.value) || 15;
  const paqueteria = document.getElementById('cotPaqueteria')?.value?.trim() || null;
  const cobraEnvio = document.getElementById('cotCobraEnvio')?.checked || false;
  const montoEnvio = cobraEnvio ? (parseFloat(document.getElementById('cotMontoEnvio')?.value) || 0) : null;
  const precioSeleccionado = 1;
  const tipoVenta = document.querySelector('input[name="cotTipoVenta"]:checked')?.value || 'CONTADO';
  const plazoMeses = tipoVenta === 'CREDITO' ? (parseInt(document.getElementById('cotCreditoPlazo')?.value) || null) : null;
  const porcentajeInteres = tipoVenta === 'CREDITO' ? (parseFloat(document.getElementById('cotCreditoInteres')?.value) || 0) : null;
  const nota = document.getElementById('cotNota')?.value?.trim() || null;

  const detalles = state.cart.map(d => ({
    idProducto: d.idProducto,
    cantidad: d.cantidad,
    precioUnitario: d.precioUnitario,
  }));

  try {
    const payload = {
      idCliente: parseInt(idCliente),
      paqueteria,
      cobraEnvio,
      montoEnvio,
      precioSeleccionado,
      diasVigencia,
      tipoVenta,
      plazoMeses,
      porcentajeInteres,
      nota,
      detalles,
    };

    let creada = null;
    if (state.editingId) {
      await API.put('/cotizaciones/' + state.editingId, payload);
      Utils.showToast('Cotizaci\u00f3n actualizada', 'success');
    } else {
      creada = await API.post('/cotizaciones', payload);
      Utils.showToast('Cotizaci\u00f3n guardada exitosamente', 'success');
    }
    state.editingId = null;
    bootstrap.Modal.getInstance(document.getElementById('cotizacionModal'))?.hide();
    cargarCotizaciones();

    if (creada) {
      const imprimir = await Utils.confirm('Cotizaci\u00f3n #' + creada.idCotizacion + ' guardada por ' + Utils.formatMonto(creada.total), '\u00bfDeseas imprimir la cotizaci\u00f3n?');
      if (imprimir) printCotizacion(creada);
    }
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function verDetalle(id) {
  try {
    const c = await API.get('/cotizaciones/' + id);
    state.detalleActual = c;
    document.getElementById('cotDetalleTitle').textContent = 'Cotizaci\u00f3n #' + c.idCotizacion;

    const envioHtml = c.cobraEnvio
      ? '<div class="col-md-4"><small class="text-muted">Env\u00edo</small><div class="fw-bold">' + Utils.formatMonto(c.montoEnvio) + '</div></div>'
      : '';

    const tipoVenta = c.tipoVenta || 'CONTADO';
    const tipoBadge = tipoVenta === 'CREDITO'
      ? '<span class="badge bg-info">CR&Eacute;DITO</span>'
      : '<span class="badge bg-success">CONTADO</span>';

    let html = '<div class="row g-2 mb-3">' +
      '<div class="col-md-4"><small class="text-muted">Cliente</small><div class="fw-semibold">' + Utils.esc(c.clienteNombre || '-') + '</div></div>' +
      '<div class="col-md-4"><small class="text-muted">Paqueter\u00eda</small><div>' + Utils.esc(c.paqueteria || '-') + '</div></div>' +
      envioHtml +
      '<div class="col-md-4"><small class="text-muted">D\u00edas Vigencia</small><div>' + c.diasVigencia + '</div></div>' +
      '<div class="col-md-4"><small class="text-muted">Expira</small><div>' + (c.fechaExpiracion ? new Date(c.fechaExpiracion).toLocaleDateString('es-MX') : '-') + '</div></div>' +
      '<div class="col-md-4"><small class="text-muted">Precio</small><div>Precio base</div></div>' +
      '<div class="col-md-4"><small class="text-muted">Estado</small><div>' + getEstadoBadge(c.estado) + '</div></div>' +
      '<div class="col-md-4"><small class="text-muted">Tipo Venta</small><div>' + tipoBadge + '</div></div>';

    if (tipoVenta === 'CREDITO') {
      const plazo = c.plazoMeses || '-';
      const interes = c.porcentajeInteres || 0;
      const totalConInteres = c.total + (c.total * interes / 100);
      const pagoMensual = totalConInteres / (c.plazoMeses || 1);
      html += '<div class="col-md-4"><small class="text-muted">Plazo</small><div>' + plazo + ' meses</div></div>' +
        '<div class="col-md-4"><small class="text-muted">Inter\u00e9s</small><div>' + interes + '%</div></div>' +
        '<div class="col-md-4"><small class="text-muted">Total c/inter\u00e9s</small><div class="fw-bold text-info">' + Utils.formatMonto(totalConInteres) + '</div></div>' +
        '<div class="col-md-4"><small class="text-muted">Pago mensual</small><div class="fw-bold">' + Utils.formatMonto(pagoMensual) + '</div></div>';
    }

    html += '</div>';

    html += '<div class="table-responsive"><table class="table table-custom mb-0 table-sm"><thead><tr>' +
      '<th>Producto</th><th>SKU</th><th>Cant</th><th>Precio</th><th>Subtotal</th>' +
    '</tr></thead><tbody>';

    for (const d of (c.detalles || [])) {
      html += '<tr>' +
        '<td class="fw-semibold">' + Utils.esc(d.productoNombre) + '</td>' +
        '<td class="text-muted">' + Utils.esc(d.productoSku || '-') + '</td>' +
        '<td>' + d.cantidad + '</td>' +
        '<td>' + Utils.formatMonto(d.precioUnitario) + '</td>' +
        '<td class="fw-bold">' + Utils.formatMonto(d.subtotal) + '</td>' +
      '</tr>';
    }

    html += '</tbody></table></div>';
    html += '<div class="text-end mt-3"><span class="fw-bold fs-5" style="color:var(--primary)">Total: ' + Utils.formatMonto(c.total) + '</span></div>';

    if (c.nota) {
      html += '<div class="mt-3 p-3 rounded small" style="background:#fff8e6;border:1px solid #f0d58c"><strong>Nota:</strong> ' + Utils.esc(c.nota) + '</div>';
    }

    document.getElementById('cotDetalleBody').innerHTML = html;
    new bootstrap.Modal(document.getElementById('cotizacionDetalleModal')).show();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

function irACaja(id) {
  const cotizacion = state.data.find(c => c.idCotizacion === id);
  if (!cotizacion) return;

  const quoteData = {
    idCotizacion: cotizacion.idCotizacion,
    clienteNombre: cotizacion.clienteNombre,
    idCliente: cotizacion.idCliente,
    paqueteria: cotizacion.paqueteria,
    cobraEnvio: cotizacion.cobraEnvio,
    montoEnvio: cotizacion.montoEnvio,
    precioSeleccionado: cotizacion.precioSeleccionado || 1,
    tipoVenta: cotizacion.tipoVenta || 'CONTADO',
    plazoMeses: cotizacion.plazoMeses || null,
    porcentajeInteres: cotizacion.porcentajeInteres || 0,
    detalles: cotizacion.detalles,
  };

  localStorage.setItem('cotizacionParaVenta', JSON.stringify(quoteData));

  document.querySelector('[data-view="pages/ventas.html"]')?.click();

  Utils.showToast('Cotizaci\u00f3n cargada en el POS. Selecciona una caja para continuar.', 'success');
}

function abrirCancelar(id) {
  const cotizacion = state.data.find(c => c.idCotizacion === id);
  if (!cotizacion) return;
  state.cancelandoId = id;
  document.getElementById('cotCancelarFolio').textContent = '#' + cotizacion.idCotizacion;
  new bootstrap.Modal(document.getElementById('cotCancelarModal')).show();
}

async function confirmarCancelar() {
  if (!state.cancelandoId) return;
  try {
    await API.post('/cotizaciones/' + state.cancelandoId + '/cancelar');
    Utils.showToast('Cotizaci\u00f3n cancelada', 'success');
    bootstrap.Modal.getInstance(document.getElementById('cotCancelarModal'))?.hide();
    state.cancelandoId = null;
    cargarCotizaciones();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}
