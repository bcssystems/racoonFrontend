import { printRemisionVenta, printComprobanteAbono } from './printing.js';

let state = {
  caja: null,
  cajas: [],
  sucursales: [],
  clientes: [],
  productos: [],
  cart: [],
  editingVentaEspera: null,
  productSearchTimeout: null,
  reanudandoVentaId: null,
  activeEsperaId: null,
  esperaVentas: [],
  activeEsperaTab: null,
  cancelarVentas: [],
  cancelarAbonos: [],
  cancelarSelectedId: null,
  cancelarAccion: null,
  precioIndex: null,
  lastCortePreview: null,
  reservas: [],
  gastosPendientes: 0,
  idCotizacionActiva: null,
  configs: {},
  abonoPOSClienteId: null,
  posProductPanelOpen: false,
  posCreditoContext: null,
  cobrando: false,
  selectorCajaBound: false,
  cobradores: [],
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
  cargarCobradoresPOS();
  cargarConfiguraciones();
  const lastCajaId = localStorage.getItem('lastCajaId');
  const lastSucursalId = localStorage.getItem('lastSucursalId');
  if (lastCajaId && lastSucursalId) {
    autoEntrarCaja(lastCajaId, lastSucursalId);
  } else {
    mostrarSelectorCaja();
  }
}

async function cargarCobradoresPOS() {
  try {
    state.cobradores = await API.get('/creditos/cobradores') || [];
    const select = document.getElementById('posCreditoCobrador');
    if (select) {
      select.innerHTML = '<option value="">Sin asignar</option>' + state.cobradores.map(p =>
        '<option value="' + p.idPersona + '">' + Utils.esc((p.nombre || '') + ' ' + (p.apellido || '') + ' (' + (p.usuario || '') + ')') + '</option>'
      ).join('');
    }
  } catch (_) { /* La venta puede continuar sin cobrador */ }
}

async function autoEntrarCaja(id, sucursalId) {
  try {
    const caja = await API.get('/cajas/' + id);
    if (caja.estado === 'ABIERTA' && String(caja.idSucursal) === String(sucursalId)) {
      state.caja = caja;
      const selSuc = document.getElementById('posSucursalSelect');
      const cajaSel = document.getElementById('posCajaSelect');
      if (selSuc) selSuc.value = caja.idSucursal || '';
      if (cajaSel) {
        cajaSel.innerHTML = '<option value="' + caja.idCaja + '">' + Utils.esc(caja.nombre) + '</option>';
        cajaSel.value = caja.idCaja;
      }
      document.getElementById('pos-caja-selector')?.classList.add('d-none');
      iniciarPOS();
      actualizarCajaInfo();
      return;
    }
  } catch (_) {}
  mostrarSelectorCaja();
}

function bindEvents() {
  document.getElementById('btnEntrarCaja')?.addEventListener('click', entrarCaja);
  document.getElementById('btnCobrarPOS')?.addEventListener('click', cobrarVenta);
  document.getElementById('btnConfirmarCobroPOS')?.addEventListener('click', confirmarCobro);
  document.getElementById('posCobroModal')?.addEventListener('hidden.bs.modal', () => {
  });
  document.getElementById('btnConfirmarCreditoPOS')?.addEventListener('click', confirmarCreditoPOS);
  ['posCreditoPeriodicidad', 'posCreditoParcialidades', 'posCreditoInteres', 'posCreditoFechaPrimerPago'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', actualizarResumenCreditoPOS);
    document.getElementById(id)?.addEventListener('change', actualizarResumenCreditoPOS);
  });
  document.getElementById('posCreditoPeriodicidad')?.addEventListener('change', actualizarFechaPrimerPagoPOS);
  document.getElementById('btnEsperaPOS')?.addEventListener('click', ponerEnEspera);
  document.getElementById('btnNuevoClientePOS')?.addEventListener('click', () => abrirClienteModal());
  document.getElementById('btnGuardarPosCliente')?.addEventListener('click', guardarClienteDesdePOS);
  document.getElementById('posClienteCp')?.addEventListener('input', Utils.debounce(function() {
    const cp = this.value.trim();
    if (cp.length === 5) cargarColoniasPOS(cp, '');
  }, 500));
  document.getElementById('posClienteTieneCredito')?.addEventListener('change', function() {
    const group = document.getElementById('posClienteLimiteCreditoGroup');
    if (group) group.style.display = this.checked ? 'block' : 'none';
  });
  document.getElementById('btnIngresarEfectivo')?.addEventListener('click', () => {
    new bootstrap.Modal(document.getElementById('posIngresoModal')).show();
  });
  document.getElementById('btnGuardarIngreso')?.addEventListener('click', ingresarEfectivo);
  document.getElementById('btnConfirmarAbonoPOS')?.addEventListener('click', confirmarAbonoPOS);
  document.getElementById('btnCortePOS')?.addEventListener('click', previewCorte);
  document.getElementById('btnRealizarCortePOS')?.addEventListener('click', realizarCorte);
  document.getElementById('btnGastoPOS')?.addEventListener('click', () => {
    const el = document.getElementById('posGastoCajaInfo');
    if (el && state.caja) {
      el.textContent = 'Caja: ' + (state.caja.nombre || '—') + ' | Sucursal: ' + (state.caja.sucursalNombre || '—');
    }
    new bootstrap.Modal(document.getElementById('posGastoModal')).show();
  });
  document.getElementById('btnSolicitarGastoPOS')?.addEventListener('click', solicitarGasto);
  document.getElementById('btnCancelarVentaPOS')?.addEventListener('click', abrirCancelarVentaModal);
  document.getElementById('btnAbonoCreditoPOS')?.addEventListener('click', abrirAbonoCreditoDesdePOS);
  document.getElementById('btnConfirmarCancelarPOS')?.addEventListener('click', confirmarCancelarVenta);
  document.getElementById('btnConfirmarPrecioPOS')?.addEventListener('click', confirmarPrecio);
  document.getElementById('btnVentaRapidaPOS')?.addEventListener('click', () => {
    // VR no longer needs its own cliente select
    new bootstrap.Modal(document.getElementById('posVentaRapidaModal')).show();
  });
  document.getElementById('btnRealizarVentaRapidaPOS')?.addEventListener('click', realizarVentaRapida);
  document.getElementById('btnAbandonarCaja')?.addEventListener('click', abandonarCaja);
  document.getElementById('btnPromocionesPOS')?.addEventListener('click', abrirPromocionesModal);

  document.getElementById('btnVerInventario')?.addEventListener('click', () => {
    const input = document.getElementById('posProductSearch');
    if (input) {
      input.value = '';
      input.focus();
    }
    state.posProductPanelOpen = true;
    buscarProductos(true);
  });

  const searchInput = document.getElementById('posProductSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(state.productSearchTimeout);
      state.productSearchTimeout = setTimeout(buscarProductos, 300);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarProductos();
    });
    document.addEventListener('click', (e) => {
      const results = document.getElementById('posProductResults');
      if (results && !e.target.closest('.pos-panel-product-search')) {
        results.classList.add('d-none');
        state.posProductPanelOpen = false;
      }
    });
  }

  document.getElementById('posFilterCategoria')?.addEventListener('change', () => buscarProductos());
  document.getElementById('precioSelector')?.addEventListener('change', () => {
    actualizarPreciosSeleccionados();
    buscarProductos(true);
  });

  document.getElementById('posCliente')?.addEventListener('change', onPosClienteChange);
}

function getPrecioProducto(producto) {
  const index = parseInt(document.getElementById('precioSelector')?.value) || 1;
  const precio = index === 1 ? producto?.precioBase : producto?.['precio' + index];
  return precio != null ? precio : 0;
}

function actualizarPreciosSeleccionados() {
  state.cart.forEach(d => {
    const producto = state.productos.find(p => p.idProducto === d.idProducto);
    if (producto && d.sku !== 'VR' && d.sku !== 'ENVIO') d.precioUnitario = getPrecioProducto(producto);
  });
  renderCart();
}

async function mostrarSelectorCaja() {
  window.__cajaAbierta = false;
  detenerPollingCaja();
  document.getElementById('pos-caja-selector')?.classList.remove('d-none');
  document.getElementById('pos-interface')?.classList.add('d-none');
  try {
    state.sucursales = await API.get('/sucursales');
    const selSuc = document.getElementById('posSucursalSelect');
    const cajaSel = document.getElementById('posCajaSelect');
    const entrarBtn = document.getElementById('btnEntrarCaja');
    if (!selSuc || !cajaSel || !entrarBtn) return;

    selSuc.innerHTML = '<option value="">-- Selecciona una sucursal --</option>' +
      state.sucursales.map(s => '<option value="' + s.idSucursal + '">' + Utils.esc(s.nombre) + '</option>').join('');
    cajaSel.innerHTML = '<option value="">-- Primero selecciona sucursal --</option>';
    cajaSel.disabled = true;
    entrarBtn.disabled = true;

    if (!state.selectorCajaBound) {
      selSuc.addEventListener('change', async () => {
        const idSucursal = parseInt(selSuc.value);
        entrarBtn.disabled = true;
        if (!idSucursal) {
          cajaSel.innerHTML = '<option value="">-- Primero selecciona sucursal --</option>';
          cajaSel.disabled = true;
          return;
        }
        try {
          state.cajas = await API.get('/cajas/sucursal/' + idSucursal);
          cajaSel.innerHTML = '<option value="">-- Selecciona una caja --</option>' +
            state.cajas.map(c => '<option value="' + c.idCaja + '">' + Utils.esc(c.nombre) + '</option>').join('');
          cajaSel.disabled = false;
        } catch (_) {
          cajaSel.innerHTML = '<option value="">Error al cargar cajas</option>';
          cajaSel.disabled = true;
          Utils.showToast('No se pudieron cargar las cajas de la sucursal', 'error');
        }
      });
      cajaSel.addEventListener('change', () => {
        entrarBtn.disabled = !parseInt(cajaSel.value);
      });
      state.selectorCajaBound = true;
    }
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function entrarCaja() {
  const id = parseInt(document.getElementById('posCajaSelect')?.value);
  const idSucursal = parseInt(document.getElementById('posSucursalSelect')?.value);
  if (!idSucursal) { Utils.showToast('Selecciona una sucursal', 'warning'); return; }
  if (!id) { Utils.showToast('Selecciona una caja', 'warning'); return; }
  try {
    state.caja = await API.get('/cajas/' + id);
    if (String(state.caja.idSucursal) !== String(idSucursal)) {
      Utils.showToast('La caja no pertenece a la sucursal seleccionada', 'error');
      return;
    }
    if (state.caja.estado === 'CERRADA') {
      const saldo = await Utils.promptInput('Saldo Inicial', '\u00bfCon cu\u00e1nto efectivo comienzas?', '0');
      if (saldo === null) return;
      await API.post('/cajas/' + id + '/apertura', { saldoInicial: parseFloat(saldo) || 0 });
      state.caja = await API.get('/cajas/' + id);
      Utils.showToast('Caja abierta exitosamente', 'success');
    }
    localStorage.setItem('lastCajaId', String(id));
    localStorage.setItem('lastSucursalId', String(idSucursal));
    document.getElementById('pos-caja-selector')?.classList.add('d-none');
    iniciarPOS();
    actualizarCajaInfo();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cargarProductosParaVenta() {
  if (!state.caja?.idSucursal) return;
  try {
    const data = await API.get('/productos/para-venta?page=0&size=500&sort=sku,ASC&idSucursal=' + state.caja.idSucursal);
    state.productos = data.content || [];
    actualizarOpcionesPrecio();
  } catch (_) { state.productos = []; }
}

async function cargarCotizacionDesdeLocalStorage() {
  try {
    const raw = localStorage.getItem('cotizacionParaVenta');
    if (!raw) return;
    const quote = JSON.parse(raw);
    localStorage.removeItem('cotizacionParaVenta');
    state.idCotizacionActiva = quote.idCotizacion || null;
    const precioSelector = document.getElementById('precioSelector');
    if (precioSelector) precioSelector.value = String(quote.precioSeleccionado || 1);

    if (state.cart.length > 0) {
      await ponerEnEspera();
      if (state.cart.length > 0) {
        Utils.showToast('No se pudo cargar la cotizaci\u00f3n: guarda la venta actual en espera para continuar.', 'error');
        return;
      }
    }

    await limpiarCart();

    if (quote.idCliente) {
      const sel = document.getElementById('posCliente');
      if (sel) sel.value = quote.idCliente;
    }

    if (quote.detalles && quote.detalles.length > 0) {
      for (const d of quote.detalles) {
        try {
          await API.post('/carrito/agregar', {
            idCaja: state.caja.idCaja,
            idProducto: d.idProducto,
            cantidad: 1,
          });
          if (d.cantidad > 1) {
            await API.put('/carrito/actualizar', {
              idCaja: state.caja.idCaja,
              idProducto: d.idProducto,
              cantidad: d.cantidad,
            });
          }
        } catch (_) {}
        const producto = state.productos.find(p => p.idProducto === d.idProducto);
        state.cart.push({
          idProducto: d.idProducto,
          nombre: producto ? producto.nombre : d.productoNombre || 'Producto',
          sku: producto ? producto.sku : d.productoSku || '',
          cantidad: d.cantidad,
          precioUnitario: d.precioUnitario,
          stockActual: producto ? getStockSucursal(producto) : 0,
        });
      }
    }

    if (quote.cobraEnvio && quote.montoEnvio > 0) {
      state.cart.push({
        idProducto: null,
        nombre: 'Env\u00edo' + (quote.paqueteria ? ' - ' + quote.paqueteria : ''),
        sku: 'ENVIO',
        cantidad: 1,
        precioUnitario: quote.montoEnvio,
        stockActual: 0,
        descripcion: 'Env\u00edo' + (quote.paqueteria ? ' - ' + quote.paqueteria : ''),
      });
    }

    renderCart();
    if (quote.detalles && quote.detalles.length > 0) {
      Utils.showToast('Cotizaci\u00f3n #' + (quote.idCotizacion || '') + ' cargada en el carrito', 'success');
    }
  } catch (_) {}
}

async function iniciarPOS() {
  document.getElementById('pos-interface').classList.remove('d-none');
  state.reanudandoVentaId = null;
  window.__cajaAbierta = true;
  actualizarSaldoCaja();
  Utils.cargarOpcionesCategoria('posFilterCategoria', 'Todas las categor&iacute;as');
  cargarClientesSelect('posCliente');
  cargarClientesSelect('posVrCliente');
  cargarPaises('posClientePais');
  cargarRegimenes('posClienteRegimen');
  state.cart = [];
  await cargarProductosParaVenta();
  await cargarReservasSucursal();
  await sincronizarCarritoDesdeServidor();
  await cargarCotizacionDesdeLocalStorage();
  await verificarGastosPendientes();
  cargarEsperas();
  iniciarPollingCaja();
  actualizarCajaInfo();
  abrirAbonoPOSDesdeLocalStorage();
}

function actualizarCajaInfo() {
  const el = document.getElementById('posCajaInfo');
  if (el && state.caja) {
    el.textContent = 'Caja: ' + (state.caja.nombre || '—') + ' | Sucursal: ' + (state.caja.sucursalNombre || '—');
  }
}

async function verificarGastosPendientes() {
  if (!state.caja?.idCaja) return;
  try {
    const count = await API.get('/gastos/pendientes/' + state.caja.idCaja + '/count');
    state.gastosPendientes = count || 0;
    actualizarBotonCorte();
  } catch (_) { state.gastosPendientes = 0; }
}

function actualizarBotonCorte() {
  const btn = document.getElementById('btnCortePOS');
  if (!btn) return;
  if (state.gastosPendientes > 0) {
    btn.disabled = true;
    btn.classList.add('disabled');
    btn.title = 'Hay ' + state.gastosPendientes + ' gasto(s) pendiente(s) por autorizar';
  } else {
    btn.disabled = false;
    btn.classList.remove('disabled');
    btn.title = '';
  }
}

function actualizarSaldoCaja() {}

async function refreshCaja() {
  if (!state.caja) return;
  try {
    state.caja = await API.get('/cajas/' + state.caja.idCaja);
    actualizarSaldoCaja();
  } catch (_) {}
}

function getStockSucursal(producto) {
  if (!state.caja?.idSucursal || !producto?.inventarioSucursales) return producto?.stockActual || 0;
  const inv = producto.inventarioSucursales.find(i => i.idSucursal === state.caja.idSucursal);
  return inv != null ? inv.stock : 0;
}

function cantidadEnEsperaSucursal(idProducto) {
  let total = 0;
  (state.esperaVentas || []).forEach(v => {
    (v.detalles || []).forEach(d => {
      if (d.idProducto === idProducto) total += (d.cantidad || 0);
    });
  });
  return total;
}

function stockCajaDisponible(producto) {
  if (!producto) return 0;
  return getStockSucursal(producto) + cantidadEnEsperaSucursal(producto.idProducto);
}

function isReservadoPorOtraCaja(productoId) {
  return state.reservas.some(r => r.idProducto === productoId && r.idCaja !== state.caja?.idCaja);
}

async function cargarReservasSucursal() {
  if (!state.caja?.idSucursal) return;
  try {
    state.reservas = await API.get('/carrito/reservados/' + state.caja.idSucursal);
  } catch (_) {
    state.reservas = [];
  }
}

async function sincronizarCarritoDesdeServidor() {
  if (!state.caja?.idCaja) return;

  const reservasCaja = state.reservas.filter(r => r.idCaja === state.caja.idCaja);

  const serverItems = reservasCaja.map(r => {
    const prod = state.productos.find(p => p.idProducto === r.idProducto);
    return {
      idProducto: r.idProducto,
      nombre: r.productoNombre || (prod ? prod.nombre : 'Producto'),
      sku: r.productoSku || (prod ? prod.sku : ''),
      cantidad: r.cantidad,
       precioUnitario: prod ? getPrecioProducto(prod) : 0,
    };
  });

  try {
    const rapidos = await API.get('/carrito/rapidos/' + state.caja.idCaja);
    const vrItems = rapidos.map(r => ({
      idProducto: -r.idItemRapido,
      nombre: r.descripcion,
      sku: 'VR',
      cantidad: r.cantidad,
      precioUnitario: r.precioVenta,
      precioCompra: r.precioCompra || null,
      costoVenta: r.precioCompra || null,
      stockActual: 999999,
      _idRapido: r.idItemRapido,
    }));
    state.cart = [...serverItems, ...vrItems];
  } catch (_) {
    state.cart = serverItems;
  }

  renderCart();
}

function iniciarPollingCaja() {
  detenerPollingCaja();
  state._pollInterval = setInterval(async () => {
    if (!state.caja) { detenerPollingCaja(); return; }
    await cargarReservasSucursal();
    if (state.posProductPanelOpen && state.productos.length > 0) {
      const list = document.getElementById('posProductList');
      if (list) buscarProductos(true);
    }
    const reservasCaja = state.reservas.filter(r => r.idCaja === state.caja.idCaja);
    const cartServerCount = state.cart.filter(d => d.sku !== 'VR' && d.sku !== 'ENVIO').length;
    if (reservasCaja.length !== cartServerCount) {
      const envioItems = state.cart.filter(d => d.sku === 'ENVIO');
      const nuevosCart = reservasCaja.map(r => {
        const existente = state.cart.find(d => d.idProducto === r.idProducto);
        if (existente) return { ...existente, cantidad: r.cantidad };
        const prod = state.productos.find(p => p.idProducto === r.idProducto);
        return {
          idProducto: r.idProducto,
          nombre: r.productoNombre || (prod ? prod.nombre : 'Producto'),
          sku: r.productoSku || (prod ? prod.sku : ''),
          cantidad: r.cantidad,
           precioUnitario: prod ? getPrecioProducto(prod) : 0,
        };
      });
      state.cart = [...envioItems, ...nuevosCart];
    }
    try {
      const rapidos = await API.get('/carrito/rapidos/' + state.caja.idCaja);
      const existingVr = state.cart.filter(d => d.sku === 'VR');
      const serverVrIds = rapidos.map(r => r.idItemRapido);
      const nuevosVr = rapidos.map(r => {
        const existente = existingVr.find(v => v._idRapido === r.idItemRapido);
        return {
          idProducto: -r.idItemRapido,
          nombre: r.descripcion,
          sku: 'VR',
          cantidad: existente ? existente.cantidad : r.cantidad,
          precioUnitario: r.precioVenta,
          precioCompra: r.precioCompra || null,
          costoVenta: r.precioCompra || null,
          stockActual: 999999,
          _idRapido: r.idItemRapido,
        };
      });
      const vrChanged = JSON.stringify(existingVr.map(v => v._idRapido).sort()) !== JSON.stringify(serverVrIds.sort())
        || existingVr.some(v => { const s = rapidos.find(r => r.idItemRapido === v._idRapido); return s && s.cantidad !== v.cantidad; });
      if (vrChanged || (state.cart.some(d => d.sku === 'VR') !== rapidos.length > 0)) {
        state.cart = [...state.cart.filter(d => d.sku !== 'VR'), ...nuevosVr];
      }
    } catch (_) {}
    renderCart();
  }, 5000);
}

function detenerPollingCaja() {
  if (state._pollInterval) {
    clearInterval(state._pollInterval);
    state._pollInterval = null;
  }
}

async function cargarConfiguraciones() {
  try {
    const list = await API.get('/configuraciones');
    state.configs = {};
    (list || []).forEach(c => { if (c.clave) state.configs[c.clave] = c.valor; });
  } catch (_) {}
}

async function onPosClienteChange() {
  const id = parseInt(document.getElementById('posCliente').value) || null;
  if (id) {
    const cli = state.clientes.find(c => c.idCliente === id);
    if (cli && cli.enListaNegra) {
      Utils.showToast('Este cliente est\u00e1 en lista negra', 'warning');
    }
  }
  actualizarPreciosCart();
  if (bootstrap.Modal.getInstance(document.getElementById('posCobroModal'))) {
    cargarFormasPagoCobro();
  }
}

async function cargarClientesSelect(selectId) {
  try {
    const result = await API.get('/clientes?page=0&size=500');
    state.clientes = result.content || [];
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const label = selectId === 'posVrCliente' ? 'Mostrador' : 'Cliente mostrador...';
    sel.innerHTML = `<option value="">${label}</option>` +
      state.clientes.map(c =>
        `<option value="${c.idCliente}">${Utils.esc(c.nombre + ' ' + (c.apellidoPaterno || ''))}</option>`
      ).join('');
    if (selectId === 'posCliente') {
      Utils.makeSearchableSelect('posCliente');
    }
  } catch (_) {}
}

async function cargarPaises(selectId) {
  try {
    const paises = await API.get('/catalogos/paises');
    const sel = document.getElementById(selectId);
    if (sel) {
      sel.innerHTML = paises.map(p =>
        `<option value="${p.codigo}" ${p.codigo === 'MX' ? 'selected' : ''}>${p.nombre} (${p.prefijo})</option>`
      ).join('');
    }
  } catch (_) {}
}

function cargarRegimenes(selectId) {
  const sel = document.getElementById(selectId);
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      REGIMENES_FISCALES.map(r => `<option value="${r.value}">${r.label}</option>`).join('');
  }
}

function actualizarPreciosCart() {
  state.cart.forEach(d => {
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p && getPrecioProducto(p) > 0) {
      d.precioUnitario = getPrecioProducto(p);
    }
  });
  renderCart();
}

async function buscarProductos(showAll) {
  const q = document.getElementById('posProductSearch')?.value?.trim() || '';
  const results = document.getElementById('posProductResults');
  const list = document.getElementById('posProductList');
  if (!results || !list) return;

  if (q.length < 1 && !showAll) {
    results.classList.add('d-none');
    state.posProductPanelOpen = false;
    return;
  }

  try {
    const hasQuery = q.length > 0;
    const caja = state.caja;
    const cat = document.getElementById('posFilterCategoria')?.value || '';
    const filtros = [];
    if (cat) filtros.push('idCategoria=' + cat);
    if (caja?.idSucursal) filtros.push('idSucursal=' + caja.idSucursal);
    const filtroStr = filtros.length ? '&' + filtros.join('&') : '';
    const url = hasQuery
      ? '/productos/para-venta?search=' + encodeURIComponent(q) + '&page=0&size=20' + filtroStr
      : '/productos/para-venta?page=0&size=50&sort=sku,ASC' + filtroStr;
    const data = await API.get(url);
    state.productos = data.content || [];
    actualizarOpcionesPrecio();
    if (state.productos.length === 0) {
      list.innerHTML = '<div class="pos-product-result-item text-muted">Sin resultados</div>';
    } else {
      const sorted = [...state.productos].sort((a, b) => {
        const stA = getStockSucursal(a) > 0 ? 0 : 1;
        const stB = getStockSucursal(b) > 0 ? 0 : 1;
        return stA - stB;
      });

      list.innerHTML = sorted.map(p => {
        const stock = getStockSucursal(p);
        const sinStock = stock <= 0;
        const reservado = isReservadoPorOtraCaja(p.idProducto);
        const precioMostrar = getPrecioProducto(p);
        const sinPrecio = precioMostrar <= 0;
        const disabled = reservado || sinStock || sinPrecio;
        const unidad = (p.unidadMedida || 'UNIDAD').toLowerCase();
        return `<div class="pos-product-result-item ${disabled ? 'text-muted opacity-50' : ''}" data-id="${p.idProducto}" data-sin-stock="${sinStock}">
          <div>
            <div class="fw-semibold small">${Utils.esc(p.nombre)}</div>
            <small class="text-muted">SKU: ${Utils.esc(p.sku || '-')}</small>
            ${sinStock ? '<br><small class="badge bg-secondary mt-1"><i class="fas fa-times-circle me-1"></i>Sin stock</small>' : ''}
            ${reservado ? '<br><small class="badge bg-warning text-dark mt-1"><i class="fas fa-lock me-1"></i>En uso en otra caja</small>' : ''}
            ${sinPrecio ? '<br><small class="badge bg-secondary mt-1"><i class="fas fa-tag me-1"></i>Precio no configurado</small>' : ''}
          </div>
          <div class="text-end">
            <small class="text-muted">${Utils.esc(unidad)} | Stock: ${stock}</small>
            <div class="fw-bold" style="color:var(--primary)">${Utils.formatMonto(precioMostrar)}</div>
            <button class="btn btn-sm ${disabled ? 'btn-secondary' : 'btn-success'} pos-add-cart" data-id="${p.idProducto}" style="font-size:0.7rem" ${disabled ? 'disabled' : ''}>
              <i class="fas fa-cart-plus"></i>
            </button>
          </div>
        </div>`;
      }).join('');

      list.querySelectorAll('.pos-add-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const prodId = parseInt(btn.dataset.id);
          agregarAlCart(prodId);
        });
      });

      list.querySelectorAll('.pos-product-result-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.pos-add-cart')) return;
          if (item.dataset.sinStock === 'true') {
            Utils.showToast('Producto sin stock en esta sucursal', 'warning');
            return;
          }
          const prodId = parseInt(item.dataset.id);
          agregarAlCart(prodId);
        });
      });
    }
    results.classList.remove('d-none');
  } catch (_) {
    list.innerHTML = '<div class="pos-product-result-item text-muted">Error al buscar</div>';
    results.classList.remove('d-none');
  }
}

async function agregarAlCart(prodId) {
  const p = state.productos.find(x => x.idProducto === prodId);
  if (!p) return;

  const precio = getPrecioProducto(p);
  if (precio <= 0) {
    Utils.showToast('El precio seleccionado no está configurado para este producto', 'warning');
    return;
  }

  const stockSuc = getStockSucursal(p);
  if (stockSuc <= 0) {
    Utils.showToast('Producto sin stock en esta sucursal', 'warning');
    return;
  }

  const existente = state.cart.find(d => d.idProducto === prodId);
  if (existente) {
    if (existente.cantidad >= stockCajaDisponible(p)) {
      Utils.showToast('Stock insuficiente en esta sucursal', 'warning');
      return;
    }
    try {
      await API.put('/carrito/actualizar', {
        idCaja: state.caja.idCaja,
        idProducto: prodId,
        cantidad: existente.cantidad + 1,
      });
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return;
    }
    existente.cantidad++;
  } else {
    try {
      await API.post('/carrito/agregar', {
        idCaja: state.caja.idCaja,
        idProducto: prodId,
        cantidad: 1,
      });
    } catch (err) {
      Utils.showToast(err.message, 'error');
      return;
    }
    state.cart.push({
      idProducto: prodId,
      nombre: p.nombre,
      sku: p.sku,
      cantidad: 1,
      precioUnitario: precio,
      stockActual: getStockSucursal(p),
      unidadMedida: p.unidadMedida || 'PIEZA',
    });
  }

  renderCart();
  document.getElementById('posProductResults')?.classList.add('d-none');
  state.posProductPanelOpen = false;
  document.getElementById('posProductSearch').value = '';
}

function renderCart() {
  const tbody = document.getElementById('posCartBody');
  if (!tbody) return;

  if (state.cart.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state py-3"><i class="fas fa-cart-plus"></i><p>Agrega productos a la venta</p></div></td></tr>';
  } else {
    tbody.innerHTML = state.cart.map((d, i) => {
      const unidad = (d.unidadMedida || 'UNIDAD').toUpperCase();
      const step = unidad === 'KG' ? '0.01' : '1';
      const stockVisible = ['VR', 'ENVIO'].includes(d.sku || '') ? '' : '<td class="text-center small text-muted">' + (d.stockActual != null ? d.stockActual : '-') + '</td>';
      return '<tr>' +
      '<td>' +
        '<div class="fw-semibold small">' + Utils.esc(d.nombre) + '</div>' +
        '<small class="text-muted" style="font-size:0.65rem">' + (d.sku || '') + '</small>' +
      '</td>' +
      stockVisible +
      '<td class="text-center small text-muted">' + Utils.esc(unidad.toLowerCase()) + '</td>' +
      '<td>' +
        '<div class="d-flex align-items-center gap-1">' +
          '<button class="pos-cart-qty-btn pos-cart-qty-minus" data-index="' + i + '"><i class="fas fa-minus"></i></button>' +
          '<input type="number" class="form-control form-control-sm pos-cart-qty-input text-center" data-index="' + i + '" value="' + d.cantidad + '" min="1" step="' + step + '" style="width:55px;font-size:0.8rem;padding:2px 4px">' +
          '<button class="pos-cart-qty-btn pos-cart-qty-plus" data-index="' + i + '"><i class="fas fa-plus"></i></button>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<div class="d-flex align-items-center gap-1">' +
          '<span>' + Utils.formatMonto(d.precioUnitario) + '</span>' +
          (puedeEditarPrecio(d) ? '<button class="pos-cart-price" data-index="' + i + '" title="Modificar precio"><i class="fas fa-pen" style="font-size:0.65rem"></i></button>' : '') +
        '</div>' +
      '</td>' +
      '<td class="fw-semibold">' + Utils.formatMonto(d.cantidad * d.precioUnitario) + '</td>' +
      '<td><button class="pos-cart-remove" data-index="' + i + '"><i class="fas fa-times"></i></button></td>' +
    '</tr>';
    }).join('');

    tbody.querySelectorAll('.pos-cart-qty-input').forEach(input => {
      input.addEventListener('change', async () => {
        const i = parseInt(input.dataset.index);
        const item = state.cart[i];
        if (!item) return;
        let newQty = parseFloat(input.value) || 1;
        if (newQty < 1) newQty = 1;
        if (item.sku === 'VR') {
          item.cantidad = newQty;
          try { await API.put('/carrito/rapidos/' + item._idRapido, { idCaja: state.caja.idCaja, cantidad: newQty }); } catch (_) {}
          renderCart();
          return;
        }
        if (item.sku === 'ENVIO') { renderCart(); return; }
        const p = state.productos.find(x => x.idProducto === item.idProducto);
        if (p && newQty > stockCajaDisponible(p)) {
          Utils.showToast('Stock insuficiente en esta sucursal', 'warning');
          input.value = item.cantidad;
          return;
        }
        try {
          await API.put('/carrito/actualizar', {
            idCaja: state.caja.idCaja,
            idProducto: item.idProducto,
            cantidad: newQty,
          });
        } catch (err) { Utils.showToast(err.message, 'error'); input.value = item.cantidad; return; }
        item.cantidad = newQty;
        renderCart();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      });
    });
    tbody.querySelectorAll('.pos-cart-qty-minus').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.index);
        const item = state.cart[i];
        if (item.sku === 'VR') {
          if (item.cantidad > 1) {
            item.cantidad--;
            try { await API.put('/carrito/rapidos/' + item._idRapido, { idCaja: state.caja.idCaja, cantidad: item.cantidad }); } catch (_) {}
          } else {
            try { await API.del('/carrito/rapidos/' + item._idRapido); } catch (_) {}
            state.cart.splice(i, 1);
          }
          renderCart();
          return;
        }
        if (item.sku === 'ENVIO') {
          state.cart.splice(i, 1);
          renderCart();
          return;
        }
        if (item.cantidad > 1) {
          try {
            await API.put('/carrito/actualizar', {
              idCaja: state.caja.idCaja,
              idProducto: item.idProducto,
              cantidad: item.cantidad - 1,
            });
          } catch (err) { Utils.showToast(err.message, 'error'); return; }
          item.cantidad--;
        } else {
          try {
            await API.del('/carrito/quitar/' + item.idProducto + '?idCaja=' + state.caja.idCaja);
          } catch (_) {}
          state.cart.splice(i, 1);
        }
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-qty-plus').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.index);
        const item = state.cart[i];
        const p = state.productos.find(x => x.idProducto === item.idProducto);
        if (item.sku === 'VR') {
          item.cantidad++;
          try { await API.put('/carrito/rapidos/' + item._idRapido, { idCaja: state.caja.idCaja, cantidad: item.cantidad }); } catch (_) {}
          renderCart();
          return;
        }
        if (item.sku === 'ENVIO') {
          state.cart.splice(i, 1);
          renderCart();
          return;
        }
        if (p && item.cantidad >= stockCajaDisponible(p)) {
          Utils.showToast('Stock insuficiente en esta sucursal', 'warning');
          return;
        }
        try {
          await API.put('/carrito/actualizar', {
            idCaja: state.caja.idCaja,
            idProducto: item.idProducto,
            cantidad: item.cantidad + 1,
          });
        } catch (err) { Utils.showToast(err.message, 'error'); return; }
        item.cantidad++;
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const i = parseInt(btn.dataset.index);
        const item = state.cart[i];
        if (item.sku === 'VR') {
          if (item._idRapido) {
            try { await API.del('/carrito/rapidos/' + item._idRapido); } catch (_) {}
          }
        } else if (item.sku === 'ENVIO') {
          // ENVIO items are local-only, no server API needed
        } else if (state.caja?.idCaja) {
          try {
            await API.del('/carrito/quitar/' + item.idProducto + '?idCaja=' + state.caja.idCaja);
          } catch (_) {}
        }
        state.cart.splice(i, 1);
        renderCart();
      });
    });

    tbody.querySelectorAll('.pos-cart-price').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirModalPrecio(parseInt(btn.dataset.index));
      });
    });
  }

  recalcularTotales();
}

function recalcularTotales() {
  let subtotal = 0;
  let descuento = 0;

  state.cart.forEach(d => {
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p) {
      const precioBase = p.precioBase || 0;
      const precioActual = d.precioUnitario;
      d.subtotal = d.cantidad * d.precioUnitario;
      subtotal += d.subtotal;
      descuento += (precioBase - precioActual) * d.cantidad;
    } else {
      // VR items (temp negative IDs) always contribute to subtotal
      d.subtotal = d.cantidad * d.precioUnitario;
      subtotal += d.subtotal;
    }
  });

  descuento = Math.max(0, descuento);
  const total = Math.max(0, subtotal);

  document.getElementById('posSubtotal').textContent = Utils.formatMonto(subtotal);
  document.getElementById('posDescuento').textContent = '-' + Utils.formatMonto(descuento);
  document.getElementById('posTotal').textContent = Utils.formatMonto(total);
}

async function limpiarCart() {
  if (state.caja?.idCaja) {
    try {
      await API.del('/carrito/limpiar?idCaja=' + state.caja.idCaja);
    } catch (_) {}
    try {
      await API.del('/carrito/rapidos/limpiar?idCaja=' + state.caja.idCaja);
    } catch (_) {}
  }
  state.cart = [];
  state.activeEsperaId = null;
  state.reanudandoVentaId = null;
  renderCart();
}

function puedeEditarPrecio(d) {
  return Utils.hasPermiso('VENTAS_EDITAR_PRECIO') && !!(d && d.idProducto && d.sku !== 'VR' && d.sku !== 'ENVIO');
}

function abrirModalPrecio(index) {
  const item = state.cart[index];
  if (!item || !puedeEditarPrecio(item)) return;
  state.precioIndex = index;
  const elProducto = document.getElementById('posPrecioProducto');
  const elActual = document.getElementById('posPrecioActual');
  const elNuevo = document.getElementById('posPrecioNuevo');
  if (elProducto) elProducto.textContent = item.nombre + ' (' + item.sku + ')';
  if (elActual) elActual.textContent = Utils.formatMonto(item.precioUnitario);
  if (elNuevo) {
    elNuevo.value = item.precioUnitario;
    elNuevo.disabled = false;
  }
  const label = document.getElementById('btnConfirmarPrecioPOSLabel');
  if (label) label.textContent = 'Aplicar Precio';
  new bootstrap.Modal(document.getElementById('posPrecioModal')).show();
}

function confirmarPrecio() {
  const index = state.precioIndex;
  if (index == null) return;
  const item = state.cart[index];
  const elNuevo = document.getElementById('posPrecioNuevo');
  const nuevo = parseFloat(elNuevo.value);
  if (!nuevo || nuevo <= 0) { Utils.showToast('Ingresa un precio v\u00e1lido', 'warning'); return; }
  item.precioUnitario = nuevo;
  state.precioIndex = null;
  bootstrap.Modal.getInstance(document.getElementById('posPrecioModal'))?.hide();
  renderCart();
  Utils.showToast('Precio actualizado en la l\u00ednea', 'success');
}

async function cobrarVenta() {
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }
  if (state.cart.length === 0) { Utils.showToast('Agrega productos a la venta', 'warning'); return; }

  for (const d of state.cart) {
    if (d.sku === 'ENVIO' || d.sku === 'VR') continue;
    const p = state.productos.find(x => x.idProducto === d.idProducto);
    if (p && getStockSucursal(p) + cantidadEnEsperaSucursal(d.idProducto) < d.cantidad) {
      Utils.showToast('Stock insuficiente en esta sucursal: ' + d.nombre, 'error');
      return;
    }
  }

  const total = Utils.parseMonto(document.getElementById('posTotal').textContent);

  state.posCreditoContext = null;
  document.getElementById('posCobroTotal').textContent = Utils.formatMonto(total);
  document.getElementById('posCobroNota').value = '';
  await cargarFormasPagoCobro();
  new bootstrap.Modal(document.getElementById('posCobroModal')).show();
}

async function cargarFormasPagoCobro() {
  const container = document.getElementById('posCobroPagos');
  container.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i> Cargando formas de pago...</div>';

  try {
    const tipos = await API.get('/tipos-pago');
    const total = Utils.parseMonto(document.getElementById('posCobroTotal').textContent);
    const clienteIdSel = parseInt(document.getElementById('posCliente').value) || null;
    const clienteCredito = state.clientes.find(c => c && c.idCliente === clienteIdSel) || null;
    const clienteHabilitaCredito = !!(clienteCredito && clienteCredito.tieneCredito);
    const clienteCreditoNombres = clienteCredito
      ? Utils.esc((clienteCredito.nombre || '') + ' ' + (clienteCredito.apellidoPaterno || '')) + (clienteHabilitaCredito ? '' : ' <span class="text-danger">(sin cr\u00e9dito)</span>')
      : '<span class="text-muted">Selecciona un cliente en el POS</span>';

    if (!tipos || tipos.length === 0) {
      container.innerHTML = '<div class="text-center py-3 text-muted">No hay formas de pago configuradas</div>';
      return;
    }

    const saldoFavorDisponible = clienteCredito ? (clienteCredito.saldoFavor || 0) : 0;
    const saldoFavorHtml = saldoFavorDisponible > 0
      ? '<div class="payment-row border rounded p-2 mb-1" style="background:rgba(16,185,129,.08)">' +
        '<div class="row g-2 align-items-center"><div class="col-3"><span class="fw-semibold small text-success"><i class="fas fa-wallet me-1"></i>Saldo a favor</span></div>' +
        '<div class="col-3"><div class="input-group input-group-sm"><span class="input-group-text">$</span>' +
        '<input type="number" class="form-control payment-saldo-favor" step="0.01" min="0" max="' + saldoFavorDisponible.toFixed(2) + '" value="0.00"></div></div>' +
        '<div class="col-6"><small class="text-muted">Disponible: <strong>' + Utils.formatMonto(saldoFavorDisponible) + '</strong></small></div></div></div>'
      : '';

    container.innerHTML = saldoFavorHtml + tipos.map((t) => {
      const isEfectivo = t.nombre.toUpperCase() === 'EFECTIVO';
      return `<div class="payment-row border rounded p-2 mb-1">
        <div class="row g-2 align-items-center">
          <div class="col-3">
            <span class="fw-semibold small">${Utils.esc(t.nombre)}</span>
          </div>
          <div class="col-3">
            <div class="input-group input-group-sm">
              <span class="input-group-text">$</span>
              <input type="number" class="form-control payment-monto" data-id="${t.idTipoPago}" step="0.01" min="0" value="0.00">
            </div>
          </div>
          <div class="col-6">
            <input type="text" class="form-control form-control-sm payment-referencia" data-id="${t.idTipoPago}" placeholder="${isEfectivo ? '' : 'Referencia (ej. \u00faltimos 4 d\u00edgitos)'}" ${isEfectivo ? 'disabled' : ''}>
          </div>
        </div>
      </div>`;
    }).join('') +

      `<div class="payment-row payment-credito-row border rounded p-2 mb-1" style="background:rgba(13,110,253,.05)">
        <div class="row g-2 align-items-center">
          <div class="col-3">
            <span class="fw-semibold small text-primary"><i class="fas fa-credit-card me-1"></i>CR\u00c9DITO</span>
            <input type="hidden" class="payment-credito" value="1">
          </div>
          <div class="col-3">
            <div class="input-group input-group-sm">
              <span class="input-group-text">$</span>
              <input type="number" class="form-control payment-monto payment-credito-monto" data-credito="1" step="0.01" min="0" value="0.00" ${clienteHabilitaCredito ? '' : 'disabled'}>
            </div>
          </div>
          <div class="col-6">
            <small class="text-muted">Cliente: <strong>${clienteCreditoNombres}</strong><br>${clienteHabilitaCredito ? '' : '<span class="text-danger" style="font-size:0.7rem">Selecciona un cliente con cr\u00e9dito habilitado</span>'}</small>
          </div>
        </div>
      </div>`;

    container.oninput = recalcularSumaCobro;

    container.querySelectorAll('.payment-monto').forEach(input => {
      const seleccionarMonto = () => input.select();
      input.addEventListener('focus', seleccionarMonto);
      input.addEventListener('click', seleccionarMonto);
    });
    container.querySelectorAll('.payment-saldo-favor').forEach(input => {
      const seleccionarMonto = () => input.select();
      input.addEventListener('focus', seleccionarMonto);
      input.addEventListener('click', seleccionarMonto);
    });

    recalcularSumaCobro();
  } catch (err) {
    container.innerHTML = '<div class="text-center py-3 text-danger">Error al cargar formas de pago</div>';
  }
}

function recalcularSumaCobro() {
  let suma = 0;
  document.querySelectorAll('.payment-monto').forEach(inp => {
    suma += parseFloat(inp.value) || 0;
  });
  document.querySelectorAll('.payment-saldo-favor').forEach(inp => {
    suma += parseFloat(inp.value) || 0;
  });
  const total = Utils.parseMonto(document.getElementById('posCobroTotal').textContent);
  const el = document.getElementById('posCobroSuma');
  const cambioEl = document.getElementById('posCobroCambio');
  const cambioVal = document.getElementById('posCobroCambioValor');
  const restanteEl = document.getElementById('posCobroRestante');
  el.textContent = Utils.formatMonto(suma);
  if (restanteEl) restanteEl.textContent = Utils.formatMonto(Math.max(0, total - suma));

  if (suma + 0.01 < total) {
    el.style.color = 'var(--danger)';
    cambioEl.classList.add('d-none');
  } else {
    el.style.color = 'var(--success)';
    if (suma > total + 0.01) {
      cambioVal.textContent = Utils.formatMonto(suma - total);
      cambioEl.classList.remove('d-none');
    } else {
      cambioEl.classList.add('d-none');
    }
  }
}

async function confirmarCobro() {
  if (state.cobrando) return;
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }


  const total = Utils.parseMonto(document.getElementById('posCobroTotal').textContent);
  const subtotal = Utils.parseMonto(document.getElementById('posSubtotal').textContent);
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;
  const nota = document.getElementById('posCobroNota').value.trim() || null;

  const pagos = [];
  let montoCredito = 0;
  const saldoFavorInput = document.querySelector('.payment-saldo-favor');
  const montoSaldoFavor = saldoFavorInput ? (parseFloat(saldoFavorInput.value) || 0) : 0;
  const clienteSeleccionado = clienteId ? state.clientes.find(c => c.idCliente === clienteId) : null;
  if (montoSaldoFavor > 0.01) {
    if (!clienteSeleccionado) {
      Utils.showToast('Selecciona un cliente para usar saldo a favor', 'warning');
      return;
    }
    if (montoSaldoFavor > (clienteSeleccionado.saldoFavor || 0) + 0.001) {
      Utils.showToast('El saldo a favor excede el disponible del cliente', 'warning');
      return;
    }
    if (montoSaldoFavor > total + 0.001) {
      Utils.showToast('El saldo a favor no puede exceder el total', 'warning');
      return;
    }
  }
  document.querySelectorAll('.payment-monto').forEach(inp => {
    const monto = parseFloat(inp.value) || 0;
    if (monto <= 0) return;
    if (inp.dataset.credito) {
      montoCredito += monto;
      return;
    }
    const idTipoPago = parseInt(inp.dataset.id);
    const refInput = document.querySelector(`.payment-referencia[data-id="${idTipoPago}"]`);
    const referencia = refInput ? refInput.value.trim() || null : null;
    pagos.push({ idTipoPago, monto, referencia });
  });

  if (montoCredito > 0.01) {
    if (!clienteId) {
      Utils.showToast('Selecciona un cliente en el POS para venta a cr\u00e9dito', 'warning');
      return;
    }
    const cliente = state.clientes.find(c => c.idCliente === clienteId);
    if (!cliente || !cliente.tieneCredito) {
      Utils.showToast('El cliente seleccionado no tiene cr\u00e9dito habilitado', 'warning');
      return;
    }
    if (cliente.limiteCredito != null) {
      const disp = cliente.limiteCredito - (cliente.saldoActual || 0);
      if (montoCredito > disp) {
        Utils.showToast('El total excede el l\u00edmite de cr\u00e9dito disponible (' + Utils.formatMonto(disp) + ')', 'warning');
        return;
      }
    }
    const sumaPagos = pagos.reduce((s, p) => s + p.monto, 0);
    if (Math.abs((sumaPagos + montoCredito + montoSaldoFavor) - total) > 0.01) {
      Utils.showToast('Los pagos y el monto a cr\u00e9dito deben cubrir exactamente el total', 'warning');
      return;
    }
    await pedirConfirmarCredito(total, subtotal, clienteId, nota, pagos, montoCredito, montoSaldoFavor);
    return;
  }

  if (pagos.length === 0 && montoSaldoFavor <= 0.01) {
    Utils.showToast('Selecciona al menos una forma de pago', 'warning');
    return;
  }

  const sumaPagos = pagos.reduce((s, p) => s + p.monto, 0);
  if (sumaPagos + montoSaldoFavor + 0.01 < total) {
    Utils.showToast('La suma de los pagos debe ser al menos igual al total', 'warning');
    return;
  }

  const request = {
    idCaja: state.caja.idCaja,
    idCliente: clienteId || null,
    tipoVenta: montoCredito > 0 ? 'CREDITO' : 'CONTADO',
    precioSeleccionado: 1,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    nota: nota,
    detalles: state.cart.map(d => ({
      idProducto: d.sku === 'ENVIO' || d.sku === 'VR' ? null : d.idProducto,
      descripcion: d.sku === 'ENVIO' || d.sku === 'VR' ? (d.descripcion || d.nombre) : null,
      tipoDetalle: d.sku === 'VR' ? 'RAPIDO' : (d.sku === 'ENVIO' ? 'ENVIO' : 'PRODUCTO'),
      idItemRapido: d.sku === 'VR' ? d._idRapido : null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
      atributosText: null,
      costoUnitario: d.costoVenta || d.precioCompra || null,
    })),
    pagos: pagos,
    montoCredito: montoCredito || null,
    montoSaldoFavor: montoSaldoFavor || null,
  };

  state.cobrando = true;
  const btn = document.getElementById('btnConfirmarCobroPOS');
  if (btn) { btn.disabled = true; btn.dataset.originalText = btn.innerHTML; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Procesando...'; }

  try {
    let ventaCreada;
    if (state.activeEsperaId) {
      const idVenta = state.activeEsperaId;
      await guardarEsperaActiva();
      ventaCreada = await API.post('/ventas/' + idVenta + '/pagar', pagos);
    } else {
      ventaCreada = await API.post('/ventas', request);
    }
    Utils.showToast('Venta registrada exitosamente', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCobroModal'))?.hide();
    await limpiarCart();
    await refreshCaja();
    await cargarEsperas();
    imprimirTicketVenta(ventaCreada);
    if (state.idCotizacionActiva) {
      try {
        await API.post('/cotizaciones/' + state.idCotizacionActiva + '/convertir');
      } catch (_) {}
      state.idCotizacionActiva = null;
    }
  } catch (err) {
    Utils.showToast(err.message, 'error');
    await cargarEsperas();
  } finally {
    state.cobrando = false;
    const btn = document.getElementById('btnConfirmarCobroPOS');
    if (btn) { btn.disabled = false; if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText; }
  }
}

async function pedirConfirmarCredito(total, subtotal, clienteId, nota, pagos, montoCredito, montoSaldoFavor) {
  const cliente = state.clientes.find(c => c.idCliente === clienteId);
  state.posCreditoContext = { pagos, montoCredito, montoSaldoFavor };
  document.getElementById('posCreditoTotal').textContent = Utils.formatMonto(montoCredito);
  document.getElementById('posCreditoClienteName').textContent = (cliente ? (cliente.nombre || '') + ' ' + (cliente.apellidoPaterno || '') : '');
  document.getElementById('posCreditoMontoOriginal').textContent = Utils.formatMonto(montoCredito);
  document.getElementById('posCreditoPeriodicidad').value = 'MENSUAL';
  document.getElementById('posCreditoParcialidades').value = '1';
  document.getElementById('posCreditoInteres').value = '0';
  const fechaHoy = fechaLocalPOS(0);
  const fechaMaxima = fechaLocalPOS(10);
  const fechaPrimerPagoInput = document.getElementById('posCreditoFechaPrimerPago');
  fechaPrimerPagoInput.min = fechaHoy;
  fechaPrimerPagoInput.max = fechaMaxima;
  fechaPrimerPagoInput.value = fechaLocalPOS(7);
  actualizarResumenCreditoPOS();
  bootstrap.Modal.getInstance(document.getElementById('posCobroModal'))?.hide();
  new bootstrap.Modal(document.getElementById('posCreditoModal')).show();
}

function fechaLocalPOS(diasDesdeHoy) {
  const fecha = new Date();
  fecha.setHours(12, 0, 0, 0);
  fecha.setDate(fecha.getDate() + diasDesdeHoy);
  return fecha.getFullYear() + '-' + String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
}

function actualizarResumenCreditoPOS() {
  const monto = Utils.parseMonto(document.getElementById('posCreditoMontoOriginal')?.textContent || '0');
  const periodicidad = document.getElementById('posCreditoPeriodicidad')?.value || 'MENSUAL';
  const cantidad = parseInt(document.getElementById('posCreditoParcialidades')?.value) || 1;
  const tasa = parseFloat(document.getElementById('posCreditoInteres')?.value) || 0;
  const meses = periodicidad === 'QUINCENAL' ? cantidad / 2 : periodicidad === 'SEMANAL' ? cantidad / 4 : cantidad;
  const interes = monto * tasa / 100 * meses;
  const total = monto + interes;
  const parcialidad = total / cantidad;
  const el = document.getElementById('posCreditoResumenPlan');
  if (el) el.innerHTML = '<div><strong>Capital:</strong> ' + Utils.formatMonto(monto) + '</div>' +
    '<div><strong>Inter&eacute;s total:</strong> ' + Utils.formatMonto(interes) + '</div>' +
    '<div><strong>Total a pagar:</strong> ' + Utils.formatMonto(total) + '</div>' +
    '<div><strong>Parcialidad:</strong> ' + Utils.formatMonto(parcialidad) + ' x ' + cantidad + '</div>';
}

function actualizarFechaPrimerPagoPOS() {
  const periodicidad = document.getElementById('posCreditoPeriodicidad')?.value || 'MENSUAL';
  // La fecha sugerida siempre permanece dentro del rango permitido de 0 a 10 días.
  const dias = periodicidad === 'SEMANAL' ? 7 : 10;
  const input = document.getElementById('posCreditoFechaPrimerPago');
  if (input) input.value = fechaLocalPOS(dias);
}

async function confirmarCreditoPOS() {
  if (state.cobrando) return;
  if (!state.caja) { Utils.showToast('No hay caja activa', 'error'); return; }
  if (state.activeEsperaId) {
    Utils.showToast('Una venta en espera es de contado y debe cobrarse desde el formulario de pago', 'warning');
    return;
  }

  const total = Utils.parseMonto(document.getElementById('posCobroTotal').textContent);
  const credito = state.posCreditoContext || { pagos: [], montoCredito: total, montoSaldoFavor: 0 };
  const subtotal = Utils.parseMonto(document.getElementById('posSubtotal').textContent);
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;
  const nota = document.getElementById('posCobroNota').value.trim() || null;
  if (!nota) {
    Utils.showToast('La nota es obligatoria para las ventas a crédito', 'warning');
    return;
  }
  const periodicidad = document.getElementById('posCreditoPeriodicidad').value || 'MENSUAL';
  const numeroParcialidades = parseInt(document.getElementById('posCreditoParcialidades').value) || 1;
  const porcentajeInteres = parseFloat(document.getElementById('posCreditoInteres').value) || 0;
  const fechaPrimerPago = document.getElementById('posCreditoFechaPrimerPago').value || null;
  const fechaMinimaPago = fechaLocalPOS(0);
  const fechaMaximaPago = fechaLocalPOS(10);
  if (!fechaPrimerPago || fechaPrimerPago < fechaMinimaPago || fechaPrimerPago > fechaMaximaPago) {
    Utils.showToast('La primera fecha de pago debe estar entre hoy y 10 días después de la venta', 'warning');
    return;
  }
  const idCobrador = parseInt(document.getElementById('posCreditoCobrador')?.value) || null;
  const plazoMeses = periodicidad === 'QUINCENAL' ? Math.ceil(numeroParcialidades / 2)
    : periodicidad === 'SEMANAL' ? Math.ceil(numeroParcialidades / 4) : numeroParcialidades;

  const request = {
    idCaja: state.caja.idCaja,
    idCliente: clienteId,
    tipoVenta: 'CREDITO',
    precioSeleccionado: 1,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    nota: nota,
    plazoMeses: plazoMeses,
    porcentajeInteres: porcentajeInteres,
    periodicidad: periodicidad,
    numeroParcialidades: numeroParcialidades,
    fechaPrimerPago: fechaPrimerPago,
    idCobrador: idCobrador,
    detalles: state.cart.map(d => ({
      idProducto: d.sku === 'ENVIO' || d.sku === 'VR' ? null : d.idProducto,
      descripcion: d.sku === 'ENVIO' || d.sku === 'VR' ? (d.descripcion || d.nombre) : null,
      tipoDetalle: d.sku === 'VR' ? 'RAPIDO' : (d.sku === 'ENVIO' ? 'ENVIO' : 'PRODUCTO'),
      idItemRapido: d.sku === 'VR' ? d._idRapido : null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
      atributosText: null,
      costoUnitario: d.costoVenta || d.precioCompra || null,
    })),
    pagos: credito.pagos,
    montoCredito: credito.montoCredito,
    montoSaldoFavor: credito.montoSaldoFavor || null,
  };
  state.cobrando = true;
  const btn = document.getElementById('btnConfirmarCreditoPOS');
  if (btn) btn.disabled = true;
  try {
    const ventaCreada = await API.post('/ventas', request);
    Utils.showToast('Venta a cr\u00e9dito registrada', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCreditoModal'))?.hide();
    const cInfo = state.clientes.find(c => c.idCliente === clienteId);
    await limpiarCart();
    await refreshCaja();
    await cargarEsperas();
    imprimirTicketVenta(ventaCreada, 1, true, plazoMeses, porcentajeInteres, cInfo);
    if (state.idCotizacionActiva) {
      try {
        await API.post('/cotizaciones/' + state.idCotizacionActiva + '/convertir');
      } catch (_) {}
        state.idCotizacionActiva = null;
      }
      state.posCreditoContext = null;
  } catch (err) { Utils.showToast(err.message, 'error'); }
  finally {
    state.cobrando = false;
    if (btn) btn.disabled = false;
  }
}

function imprimirTicketVenta(venta, copies, esCredito, plazoMeses, porcentajeInteres, clienteInfo) {
  printRemisionVenta(venta, {
    esCredito,
    plazoMeses,
    porcentajeInteres,
    clienteInfo,
    copies,
    configs: state.configs,
  });
}

function imprimirTicketCorte(corte) {
  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  const horaStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Corte de Caja #${corte.idCorte || ''}</title>
  <style>
    @page { size: letter; margin: 0.5in; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; padding: 20px; }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 20px; font-weight: bold; letter-spacing: 2px; color: #2563EB; margin-bottom: 2px; }
    .header .sub { font-size: 10px; color: #666; }
    .header .logo { max-height: 72px; max-width: 340px; margin-bottom: 4px; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .info-table { width: 100%; font-size: 11px; margin-bottom: 8px; }
    .info-table td { padding: 2px 4px; }
    .info-table td:last-child { text-align: right; }
    .section-title { font-size: 13px; font-weight: bold; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-table td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
    .data-table td:last-child { text-align: right; font-weight: 600; }
    .data-table .total-row td { font-size: 14px; font-weight: bold; border-top: 2px solid #000; border-bottom: none; padding-top: 8px; }
    .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <img src="assets/imgs/logotex.png" class="logo" alt="Logotex">
    <div class="sub">Corte de Caja</div>
  </div>
  <div class="divider"></div>
  <table class="info-table">
    <tr><td><strong>Corte #</strong></td><td>${corte.idCorte || '-'}</td></tr>
    <tr><td><strong>Fecha de Corte</strong></td><td>${fechaStr}</td></tr>
    <tr><td><strong>Hora</strong></td><td>${horaStr}</td></tr>
    <tr><td><strong>Caja</strong></td><td>${Utils.esc(corte.cajaNombre || '')}</td></tr>
    <tr><td><strong>Sucursal</strong></td><td>${Utils.esc(corte.sucursalNombre || '')}</td></tr>
    <tr><td><strong>Usuario</strong></td><td>${Utils.esc(corte.usuario || '')}</td></tr>
    <tr><td><strong>Apertura</strong></td><td>${corte.fechaApertura ? new Date(corte.fechaApertura).toLocaleString('es-MX') : '-'}</td></tr>
    <tr><td><strong>Cierre</strong></td><td>${corte.fechaCierre ? new Date(corte.fechaCierre).toLocaleString('es-MX') : now.toLocaleString('es-MX')}</td></tr>
  </table>
  <div class="divider"></div>
  <div class="section-title">Resumen del Corte</div>
  <table class="data-table">
    <tr><td>Saldo Inicial</td><td>${Utils.formatMonto(corte.saldoInicial || 0)}</td></tr>
    <tr><td>Total Ventas</td><td>${Utils.formatMonto(corte.totalVentas || 0)}</td></tr>
    <tr><td style="padding-left:20px">Ventas Contado</td><td>${Utils.formatMonto(corte.totalVentasContado || 0)}</td></tr>
    <tr><td style="padding-left:20px">Ventas Cr\u00e9dito</td><td>${Utils.formatMonto(corte.totalVentasCredito || 0)}</td></tr>
    <tr><td>Total Ingresos</td><td style="color:#059669">+${Utils.formatMonto(corte.totalIngresos || 0)}</td></tr>
    <tr><td>Total Egresos</td><td style="color:#dc2626">-${Utils.formatMonto(corte.totalEgresos || 0)}</td></tr>
    <tr><td>Abonos (Cr\u00e9ditos)</td><td style="color:#0891b2">+${Utils.formatMonto(corte.totalAbonos || 0)}</td></tr>
    <tr class="total-row"><td>Saldo Final</td><td>${Utils.formatMonto(corte.saldoFinalContado || 0)}</td></tr>
  </table>
  ${corte.detallePagos && corte.detallePagos.length > 0 ? `
  <div class="divider"></div>
  <div class="section-title">Desglose por Forma de Pago</div>
  <table class="data-table" style="font-size:11px">
    <tr style="font-weight:bold;border-bottom:1px solid #000">
      <td style="width:40%">M\u00e9todo</td>
      <td style="width:20%;text-align:center">Sistema</td>
      <td style="width:20%;text-align:center">Real</td>
      <td style="width:20%;text-align:center">Diferencia</td>
    </tr>
    ${corte.detallePagos.map(d => {
      const diff = (d.montoReal != null) ? (d.montoReal - (d.monto || 0)) : null;
      const diffStr = diff != null ? ((diff >= 0 ? '+' : '') + Utils.formatMonto(diff)) : 'Sin conteo';
      return `
    <tr>
      <td>${Utils.esc(d.tipoPagoNombre || '')}</td>
      <td style="text-align:center">${Utils.formatMonto(d.monto || 0)}</td>
      <td style="text-align:center">${d.montoReal != null ? Utils.formatMonto(d.montoReal) : '-'}</td>
      <td style="text-align:center">${diffStr}</td>
    </tr>`;
    }).join('')}
    <tr style="font-weight:bold;border-top:2px solid #000;border-bottom:none">
      <td style="padding-top:6px">Total</td>
      <td style="text-align:center;padding-top:6px">${Utils.formatMonto(corte.detallePagos.reduce((s, d) => s + (d.monto || 0), 0))}</td>
      <td style="text-align:center;padding-top:6px">${corte.totalReal != null ? Utils.formatMonto(corte.totalReal) : '-'}</td>
      <td style="text-align:center;padding-top:6px">${corte.diferencia != null ? ((corte.diferencia >= 0 ? '+' : '') + Utils.formatMonto(corte.diferencia)) : '-'}</td>
    </tr>
  </table>` : ''}
  ${corte.saldoEsperado != null ? `
  <div class="divider"></div>
  <table class="data-table">
    <tr><td>Saldo Esperado en Caja</td><td>${Utils.formatMonto(corte.saldoEsperado)}</td></tr>
  </table>` : ''}
  <div class="footer">
    <p>--- Fin del Corte ---</p>
    <p>${fechaStr} ${horaStr}</p>
  </div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
}

function construirDetallesEspera() {
  return state.cart
    .filter(d => d.idProducto != null && d.idProducto > 0)
    .map(d => ({
      idProducto: d.idProducto,
      descripcion: null,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      subtotal: d.cantidad * d.precioUnitario,
    }));
}

async function guardarEsperaActiva() {
  if (!state.activeEsperaId) return;

  if (state.cart.length === 0) {
    try {
      await API.post('/ventas/' + state.activeEsperaId + '/cancelar-espera', {});
    } catch (_) {}
    state.activeEsperaId = null;
    await cargarEsperas();
    return;
  }

  const total = Utils.parseMonto(document.getElementById('posTotal').textContent);
  const subtotal = Utils.parseMonto(document.getElementById('posSubtotal').textContent);
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;
  const request = {
    idCliente: clienteId || null,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    nota: null,
    detalles: construirDetallesEspera(),
  };
  await API.put('/ventas/' + state.activeEsperaId + '/espera', request);
}

async function ponerEnEspera() {
  if (state.cart.length === 0 || !state.caja) return;

  if (state.activeEsperaId) {
    try {
      await guardarEsperaActiva();
      state.activeEsperaId = null;
      Utils.showToast('Venta en espera guardada', 'success');
      await limpiarCart();
      await cargarEsperas();
    } catch (err) { Utils.showToast(err.message, 'error'); }
    return;
  }

  const total = Utils.parseMonto(document.getElementById('posTotal').textContent);
  const subtotal = Utils.parseMonto(document.getElementById('posSubtotal').textContent);
  const clienteId = parseInt(document.getElementById('posCliente').value) || null;

  const request = {
    idCaja: state.caja.idCaja,
    idCliente: clienteId || null,
    tipoVenta: 'CONTADO',
    precioSeleccionado: 1,
    subtotal: subtotal,
    descuento: subtotal - total,
    total: total,
    nota: null,
    detalles: construirDetallesEspera(),
    pagos: null,
  };

  try {
    const venta = await API.post('/ventas', request);
    await API.post('/ventas/' + venta.idVenta + '/espera', {});
    Utils.showToast('Venta puesta en espera', 'success');
    await limpiarCart();
    await cargarEsperas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function ingresarEfectivo() {
  const monto = parseFloat(document.getElementById('posIngresoMonto').value);
  const motivo = document.getElementById('posIngresoMotivo').value.trim();
  if (!monto || monto <= 0) { Utils.showToast('Monto inv\u00e1lido', 'warning'); return; }
  if (!motivo) { Utils.showToast('Motivo requerido', 'warning'); return; }

  try {
    await API.post('/cajas/' + state.caja.idCaja + '/ingresos', { monto, motivo });
    Utils.showToast('Ingreso registrado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posIngresoModal'))?.hide();
    document.getElementById('posIngresoMonto').value = '';
    document.getElementById('posIngresoMotivo').value = '';
    await refreshCaja();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function abrirAbonoPOSDesdeLocalStorage() {
  if (!state.caja?.idCaja) return;
  const raw = localStorage.getItem('abonoParaPOS');
  if (!raw) return;
  localStorage.removeItem('abonoParaPOS');
  try {
    const data = JSON.parse(raw);
    abrirAbonoPOS(data);
  } catch (_) {}
}

async function abrirAbonoPOS(data) {
  state.abonoPOSClienteId = data?.idCliente || null;
  const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('abonoPOSModal'));
  document.getElementById('abonoPOSClienteName').textContent = (data?.nombre || 'Cliente') + (data?.idCliente ? '' : '');
  document.getElementById('abonoPOSCajaInfo').textContent = (state.caja?.nombre || '—') + ' | Sucursal: ' + (state.caja?.sucursalNombre || '—');
  recalcularSumaAbonoPOS();

  try {
    const tipos = await API.get('/tipos-pago');
    cargarFormasPagoAbonoPOS(tipos);
  } catch (_) {
    document.getElementById('abonoPOSPagos').innerHTML = '<div class="text-danger small">Sin formas de pago</div>';
  }

  const selCredito = document.getElementById('abonoPOSCredito');
  selCredito.innerHTML = '<option value="">Cargando cr\u00e9ditos...</option>';
  if (data?.idCliente) {
    try {
      const creditos = await API.get('/creditos/clientes/' + data.idCliente + '/creditos');
      const activos = (creditos || []).filter(c => c.estado === 'ACTIVO' && (c.saldoPendiente || 0) > 0);
      selCredito.innerHTML = '<option value="-1">Abono general (repartir entre todos)</option>' +
        activos.map(c =>
          `<option value="${c.idCredito}">Cr\u00e9dito #${c.idCredito} \u2014 saldo ${Utils.formatMonto(c.saldoPendiente || 0)}</option>`).join('');
      if (data?.idCredito && activos.some(c => c.idCredito === data.idCredito)) {
        selCredito.value = String(data.idCredito);
      }
    } catch (_) {
      selCredito.innerHTML = '<option value="-1">Abono general (repartir entre todos)</option>';
    }
  } else {
    selCredito.innerHTML = '<option value="-1">Abono general</option>';
  }

  modal.show();
}

async function confirmarAbonoPOS() {
  if (!state.caja?.idCaja) { Utils.showToast('No hay caja activa', 'error'); return; }
  const idCliente = state.abonoPOSClienteId;
  const idCredito = parseInt(document.getElementById('abonoPOSCredito').value) || 0;

  if (!idCliente) { Utils.showToast('Cliente no disponible', 'warning'); return; }

  const pagos = [];
  let monto = 0;
  document.querySelectorAll('.abono-pago-monto').forEach(inp => {
    const montoPago = parseFloat(inp.value) || 0;
    if (montoPago <= 0) return;
    const row = inp.closest('.payment-row');
    const ref = (row?.querySelector('.abono-pago-referencia')?.value || '').trim();
    pagos.push({ idTipoPago: parseInt(inp.dataset.id), monto: montoPago, referencia: ref || null });
    monto += montoPago;
  });

  if (pagos.length === 0 || monto <= 0) { Utils.showToast('Registra al menos una forma de pago con monto', 'warning'); return; }

  try {
    let resultadoAbono;
    if (idCredito === -1 || idCredito === 0) {
      resultadoAbono = await API.post('/creditos/abonos/general', { idCliente: idCliente, monto: monto, pagos: pagos, idCaja: state.caja.idCaja });
    } else {
      resultadoAbono = await API.post('/creditos/abonos', { idCredito: idCredito, monto: monto, tipo: 'PARCIAL', pagos: pagos, idCaja: state.caja.idCaja });
    }
    Utils.showToast('Abono registrado e ingreso a caja', 'success');
    bootstrap.Modal.getInstance(document.getElementById('abonoPOSModal'))?.hide();
    await refreshCaja();
    await cargarClientesSelect('posCliente');
    printComprobanteAbono(resultadoAbono, {
      clienteNombre: document.getElementById('abonoPOSClienteName')?.textContent || 'Cliente',
      cajaNombre: state.caja?.nombre || '',
    });
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function cargarFormasPagoAbonoPOS(tipos) {
  const container = document.getElementById('abonoPOSPagos');
  if (!tipos || tipos.length === 0) {
    container.innerHTML = '<div class="text-center py-3 text-muted">No hay formas de pago configuradas</div>';
    return;
  }
  container.innerHTML = tipos.map(t => {
    const isEfectivo = t.nombre.toUpperCase() === 'EFECTIVO';
    return `<div class="payment-row border rounded p-2 mb-1">
      <div class="row g-2 align-items-center">
        <div class="col-3">
          <span class="fw-semibold small">${Utils.esc(t.nombre)}</span>
        </div>
        <div class="col-3">
          <div class="input-group input-group-sm">
            <span class="input-group-text">$</span>
            <input type="number" class="form-control abono-pago-monto" data-id="${t.idTipoPago}" step="0.01" min="0" value="0.00">
          </div>
        </div>
        <div class="col-6">
          <input type="text" class="form-control form-control-sm abono-pago-referencia" data-id="${t.idTipoPago}" placeholder="${isEfectivo ? '' : 'Referencia (ej. \u00faltimos 4 d\u00edgitos)'}" ${isEfectivo ? 'disabled' : ''}>
        </div>
      </div>
    </div>`;
  }).join('');
  container.addEventListener('input', recalcularSumaAbonoPOS);
  recalcularSumaAbonoPOS();
}

function recalcularSumaAbonoPOS() {
  let suma = 0;
  document.querySelectorAll('.abono-pago-monto').forEach(inp => {
    suma += parseFloat(inp.value) || 0;
  });
  const el = document.getElementById('abonoPOSSuma');
  if (el) el.textContent = Utils.formatMonto(suma);
}

async function solicitarGasto() {
  const desc = document.getElementById('posGastoDesc').value.trim();
  const monto = parseFloat(document.getElementById('posGastoMonto').value);
  if (!desc) { Utils.showToast('Descripci\u00f3n requerida', 'warning'); return; }
  if (!monto || monto <= 0) { Utils.showToast('Monto inv\u00e1lido', 'warning'); return; }

  try {
    await API.post('/gastos', { idCaja: state.caja.idCaja, descripcion: desc, monto });
    Utils.showToast('Gasto solicitado, espera autorizaci\u00f3n', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posGastoModal'))?.hide();
    document.getElementById('posGastoDesc').value = '';
    document.getElementById('posGastoMonto').value = '';
    await verificarGastosPendientes();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function previewCorte() {
  if (!state.caja) return;
  try {
    const corte = await API.get('/cajas/' + state.caja.idCaja + '/corte-preview');
    state.lastCortePreview = corte;
    const body = document.getElementById('posCorteBody');
    const gastos = corte.gastos || [];
    const gastosHtml = (gastos.length === 0)
      ? '<div class="text-center text-muted small py-2">No hubo gastos en este per\u00edodo</div>'
      : '<div class="table-responsive"><table class="table table-sm table-custom mb-0">' +
        '<thead><tr><th>Descripci\u00f3n</th><th class="text-end">Monto</th><th>Solicit\u00f3</th><th>Estado</th></tr></thead>' +
        '<tbody>' + gastos.map(g => {
          const badge = { 'PENDIENTE': 'badge-warning', 'AUTORIZADO': 'badge-active', 'RECHAZADO': 'badge-inactive' }[g.estado] || 'badge-inactive';
          return '<tr><td>' + Utils.esc(g.descripcion) + '</td>' +
            '<td class="text-end"><strong>' + Utils.formatMonto(g.monto) + '</strong></td>' +
            '<td>' + Utils.esc(g.usuario || '-') + '</td>' +
            '<td><span class="badge-status ' + badge + '">' + g.estado + '</span></td></tr>';
        }).join('') + '</tbody></table></div>';
    body.innerHTML = `
      <div class="row g-3">
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Saldo Inicial</small>
          <h5 class="mb-0">${Utils.formatMonto(corte.saldoInicial)}</h5>
        </div></div>
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Ventas</small>
          <h5 class="mb-0 text-success">${Utils.formatMonto(corte.totalVentas)}</h5>
        </div></div>
        <div class="col-4"><div class="panel-card p-3 text-center">
          <small class="text-muted">Saldo Esperado</small>
          <h5 class="mb-0" style="color:var(--primary)">${Utils.formatMonto(corte.saldoEsperado)}</h5>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Contado</small>
          <div>${Utils.formatMonto(corte.totalVentasContado)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Cr\u00e9dito</small>
          <div>${Utils.formatMonto(corte.totalVentasCredito)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Ingresos</small>
          <div class="text-success fw-semibold">+${Utils.formatMonto(corte.totalIngresos)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Egresos</small>
          <div class="text-danger fw-semibold">-${Utils.formatMonto(corte.totalEgresos)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Abonos (Cr\u00e9ditos)</small>
          <div class="fw-semibold" style="color:var(--info)">+${Utils.formatMonto(corte.totalAbonos || 0)}</div>
        </div></div>
        <div class="col-6"><div class="panel-card p-3 text-center">
          <small class="text-muted">Total Gastos</small>
          <div class="text-danger fw-semibold">-${Utils.formatMonto(corte.totalGastos)}</div>
        </div></div>
      </div>
      <hr>
      <h6 class="fw-semibold"><i class="fas fa-money-bill-wave me-1" style="color:var(--primary)"></i>Gastos del per\u00edodo</h6>
      ${gastosHtml}
      ${corte.detallePagos && corte.detallePagos.length > 0 ? `
      <hr>
      <h6 class="fw-semibold">Desglose por Forma de Pago</h6>
      <p class="text-muted small mb-2">Ingresa el monto real contado para cada forma de pago</p>
      <div class="table-responsive">
        <table class="table table-sm table-custom mb-0">
          <thead>
            <tr>
              <th>Forma de Pago</th>
              <th class="text-end" style="width:180px">Monto Real</th>
            </tr>
          </thead>
          <tbody>
            ${corte.detallePagos.map((d, i) => `
            <tr>
              <td>${Utils.esc(d.tipoPagoNombre || '')}</td>
              <td class="text-end">
                <input type="number" class="form-control form-control-sm corte-real-input text-end" data-id="${d.idTipoPago}" data-sistema="${(d.monto || 0)}" step="0.01" min="0" value="${(d.monto || 0).toFixed(2)}">
              </td>
            </tr>`).join('')}
            <tr class="border-top">
              <td class="fw-bold">Total</td>
              <td class="text-end fw-bold" id="posCorteTotalReal">${Utils.formatMonto(corte.detallePagos.reduce((s, d) => s + (d.monto || 0), 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <script>
        document.querySelectorAll('.corte-real-input').forEach(inp => {
          inp.addEventListener('input', function() {
            let totalReal = 0;
            document.querySelectorAll('.corte-real-input').forEach(i => totalReal += parseFloat(i.value) || 0);
            document.getElementById('posCorteTotalReal').textContent = Utils.formatMonto(totalReal);
          });
        });
      </script>` : ''}
      <hr>
      <div class="text-center">
        <h5>Saldo Final</h5>
        <h3 class="fw-bold" style="color:var(--primary)">${Utils.formatMonto(corte.saldoFinalContado)}</h3>
      </div>
    `;
    new bootstrap.Modal(document.getElementById('posCorteModal')).show();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function realizarCorte() {
  if (!state.caja) return;
  if (state.esperaVentas.length > 0) {
    const ok = await Utils.confirm('Ventas en Espera',
      'Hay ' + state.esperaVentas.length + ' venta(s) en espera. \u00bfRealizar corte de todas formas?');
    if (!ok) return;
  }
  try {
    const pendientes = await API.get('/gastos/pendientes/' + state.caja.idCaja + '/count');
    if (pendientes > 0) {
      Utils.showToast('No se puede realizar el corte. Hay ' + pendientes + ' gasto(s) pendiente(s) por autorizar.', 'error');
      return;
    }
  } catch (_) {}
  try {
    const corteCreado = await API.post('/cajas/' + state.caja.idCaja + '/corte', {});
    const inputs = document.querySelectorAll('.corte-real-input');
    if (inputs.length > 0 && corteCreado?.idCorte) {
      const pagos = [];
      inputs.forEach(inp => {
        pagos.push({ idTipoPago: parseInt(inp.dataset.id), montoReal: parseFloat(inp.value) || 0 });
      });
      await API.put('/cortes/' + corteCreado.idCorte + '/detalle-pagos', { pagos });
    }
    Utils.showToast('Corte realizado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posCorteModal'))?.hide();
    const cortePrint = corteCreado || state.lastCortePreview;
    if (cortePrint) imprimirTicketCorte(cortePrint);
    localStorage.removeItem('lastCajaId');
    localStorage.removeItem('lastSucursalId');
    state.caja = null;
    mostrarSelectorCaja();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function cargarEsperas() {
  if (!state.caja) return;
  try {
    state.esperaVentas = await API.get('/ventas/caja/' + state.caja.idCaja + '/espera');
    if (state.activeEsperaId && !state.esperaVentas.some(v => v.idVenta === state.activeEsperaId)) {
      await limpiarCart();
      Utils.showToast('La venta en espera cambió de estado y se recargó el carrito', 'warning');
    }
    renderEsperas();
  } catch (_) {}
}

function renderEsperas() {
  const tabsContainer = document.getElementById('posEsperaTabs');
  const tabsPanel = document.getElementById('posEsperaTabsPanel');
  if (!tabsContainer) return;

  if (!state.esperaVentas || state.esperaVentas.length === 0) {
    if (tabsPanel) tabsPanel.classList.add('d-none');
    tabsContainer.innerHTML = '';
    return;
  }
  if (tabsPanel) tabsPanel.classList.remove('d-none');

  if (!state.activeEsperaTab || !state.esperaVentas.find(v => v.idVenta === state.activeEsperaTab)) {
    state.activeEsperaTab = state.esperaVentas[0].idVenta;
  }

  tabsContainer.innerHTML = state.esperaVentas.map(v => {
    const isActive = v.idVenta === state.activeEsperaTab;
    const cliente = v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador';
    const etiqueta = cliente;
    const titulo = 'Recuperar la cuenta de ' + cliente;
    return `<li class="nav-item pos-espera-item" role="presentation">
      <button class="nav-link ${isActive ? 'active' : ''}" id="espera-tab-${v.idVenta}" data-espera-id="${v.idVenta}"
        type="button" role="tab" aria-selected="${isActive}"
        style="font-size:0.72rem;padding:4px 8px;white-space:nowrap;cursor:pointer"
        title="${titulo}">
        ${etiqueta} <small class="text-muted" style="font-weight:600">${Utils.formatMonto(v.total)}</small>
      </button>
      <button type="button" class="pos-espera-close" data-espera-del="${v.idVenta}"
        title="Eliminar venta en espera" aria-label="Eliminar venta en espera">&#10005;</button>
    </li>`;
  }).join('');

  tabsContainer.querySelectorAll('[data-espera-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = parseInt(btn.dataset.esperaId);
      state.activeEsperaTab = id;
      const venta = state.esperaVentas.find(v => v.idVenta === id);
      await reanudarEspera(id);
    });
  });

  tabsContainer.querySelectorAll('.pos-espera-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      eliminarEspera(parseInt(btn.dataset.esperaDel));
    });
  });
}

async function eliminarEspera(idVenta) {
  const venta = state.esperaVentas.find(v => v.idVenta === idVenta);
  const ventaId = parseInt(idVenta);
  const ok = await Utils.confirm('Eliminar venta en espera',
    'Se eliminar\u00e1 la cuenta de ' + (venta?.clienteNombre || 'Mostrador')
    + ' por ' + Utils.formatMonto(venta?.total != null ? venta.total : 0) + '. \u00bfContinuar?');
  if (!ok) return;
  try {
    await API.post('/ventas/' + ventaId + '/cancelar-espera', {});
    if (state.activeEsperaTab === ventaId) state.activeEsperaTab = null;
    if (state.activeEsperaId === ventaId) {
      state.activeEsperaId = null;
      await limpiarCart();
    }
    Utils.showToast('Venta en espera eliminada', 'success');
    await cargarEsperas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function reanudarEspera(idVenta) {
  if (state.activeEsperaId === idVenta) {
    document.getElementById('posProductSearch')?.focus();
    return;
  }
  try {
    if (!state.activeEsperaId && state.cart.length > 0) {
      await ponerEnEspera();
      if (state.cart.length > 0) {
        Utils.showToast('No se pudo guardar la venta actual en espera. Intenta de nuevo.', 'error');
        return;
      }
    }

    if (state.activeEsperaId) {
      await guardarEsperaActiva();
      state.activeEsperaId = null;
    }

    await limpiarCart();

    const venta = await API.get('/ventas/' + idVenta);
    if (!venta.detalles || venta.detalles.length === 0) {
      Utils.showToast('La venta no tiene productos', 'warning');
      return;
    }

    for (const d of venta.detalles) {
      await API.post('/carrito/agregar', {
        idCaja: state.caja.idCaja,
        idProducto: d.idProducto,
        cantidad: 1,
      });
      if (d.cantidad > 1) {
        await API.put('/carrito/actualizar', {
          idCaja: state.caja.idCaja,
          idProducto: d.idProducto,
          cantidad: d.cantidad,
        });
      }
    }

    state.activeEsperaId = idVenta;
    state.cart = venta.detalles.map(d => {
      const prod = state.productos.find(x => x.idProducto === d.idProducto);
      return {
        idProducto: d.idProducto,
        nombre: d.productoNombre || d.descripcion || 'Producto',
        sku: d.productoSku || '',
        cantidad: d.cantidad,
        precioUnitario: d.precioUnitario,
        unidadMedida: d.unidadMedida || 'UNIDAD',
        stockActual: prod ? stockCajaDisponible(prod) : 0,
      };
    });
    actualizarPreciosCart();

    Utils.showToast('Venta en espera recuperada. Modifica y cobra.', 'success');
    await cargarEsperas();

    if (venta.clienteId) {
      const sel = document.getElementById('posCliente');
      if (sel) {
        const opt = sel.querySelector(`option[value="${venta.clienteId}"]`);
        if (opt) opt.selected = true;
      }
    }

    document.getElementById('posProductSearch')?.focus();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function abrirCancelarVentaModal() {
  if (!state.caja) return;
  state.cancelarSelectedId = null;
  state.cancelarAccion = null;
  document.getElementById('btnConfirmarCancelarPOS').classList.add('d-none');
  document.getElementById('posCancelarEmpty').classList.add('d-none');
  document.getElementById('posCancelarPanel').classList.add('d-none');
  document.getElementById('posCancelarCodigo').value = '';
  document.getElementById('posCancelarMotivo').value = '';

  try {
    state.cancelarVentas = await API.get('/ventas/sucursal/' + state.caja.idSucursal);
    state.cancelarAbonos = (await API.get('/cajas/' + state.caja.idCaja + '/movimientos') || [])
      .filter(m => m.idAbono && !m.cancelado);
  } catch (_) {
    state.cancelarVentas = [];
    state.cancelarAbonos = [];
  }

  const body = document.getElementById('posCancelarVentaBody');
  if (state.cancelarVentas.length === 0) {
    body.innerHTML = '';
    document.getElementById('posCancelarEmpty').classList.remove('d-none');
  } else {
    body.innerHTML = state.cancelarVentas.map(v => {
      const noCancelable = v.estado === 'CANCELADA';
      const badge = { 'CANCELADA': 'badge-inactive', 'SOLICITADA_CANCELACION': 'badge-warning' }[v.estado] || 'badge-active';
      return `<tr class="pos-cancelar-row ${v.estado === 'CANCELADA' ? 'text-muted' : ''}" data-id="${v.idVenta}" style="cursor:pointer">
        <td>
          <input type="radio" name="cancelarSel" value="${v.idVenta}" ${noCancelable ? 'disabled' : ''}
            class="form-check-input pos-cancelar-radio">
        </td>
        <td>${v.idVenta}</td>
        <td>${v.clienteNombre ? Utils.esc(v.clienteNombre) : 'Mostrador'}</td>
        <td>${Utils.formatMonto(v.total)}</td>
        <td>${new Date(v.fecha).toLocaleString()}</td>
        <td><span class="badge-status ${badge}">${v.estado}</span></td>
      </tr>`;
    }).join('');

    body.querySelectorAll('.pos-cancelar-radio').forEach(r => {
      r.addEventListener('change', () => {
        state.cancelarSelectedId = parseInt(r.value);
        prepararAccionCancelar();
      });
    });

    body.querySelectorAll('.pos-cancelar-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('input')) return;
        const radio = row.querySelector('.pos-cancelar-radio');
        if (radio && !radio.disabled) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change'));
        }
      });
    });
  }

  const abonosBody = document.getElementById('posCancelarAbonoBody');
  if (abonosBody) {
    abonosBody.innerHTML = state.cancelarAbonos.length
      ? state.cancelarAbonos.map(m => `<tr>
          <td>${m.idAbono}</td>
          <td>${Utils.esc(m.clienteNombre || 'Cliente')}</td>
          <td>Cr&eacute;dito #${m.idCredito}</td>
          <td>${Utils.formatMonto(m.monto)}</td>
          <td>${new Date(m.fecha).toLocaleString()}</td>
          <td><button type="button" class="btn btn-sm btn-outline-danger pos-cancelar-abono" data-movimiento-id="${m.idMovimientoCaja}">
            <i class="fas fa-ban me-1"></i>Cancelar</button></td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="text-center text-muted py-3">No hay abonos activos en esta caja</td></tr>';
    abonosBody.querySelectorAll('.pos-cancelar-abono').forEach(btn => {
      btn.addEventListener('click', () => cancelarAbonoPOS(parseInt(btn.dataset.movimientoId)));
    });
  }

  new bootstrap.Modal(document.getElementById('posCancelarModal')).show();
}

async function cancelarAbonoPOS(idMovimiento) {
  const movimiento = state.cancelarAbonos.find(m => m.idMovimientoCaja === idMovimiento);
  if (!movimiento) return;
  const ok = await Utils.confirm(
    'Se cancelará el abono de ' + (movimiento.clienteNombre || 'Cliente') +
      ' al crédito #' + movimiento.idCredito + ' y se revertirá el ingreso de caja.',
    'Cancelar abono');
  if (!ok) return;
  try {
    await API.post('/cajas/movimientos/' + idMovimiento + '/cancelar');
    Utils.showToast('Abono cancelado correctamente', 'success');
    state.cancelarAbonos = state.cancelarAbonos.filter(m => m.idMovimientoCaja !== idMovimiento);
    document.querySelector('.pos-cancelar-abono[data-movimiento-id="' + idMovimiento + '"]')?.closest('tr')?.remove();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

function abrirAbonoCreditoDesdePOS() {
  const idCliente = parseInt(document.getElementById('posCliente')?.value) || null;
  if (!idCliente) {
    Utils.showToast('Selecciona un cliente para registrar el abono', 'warning');
    return;
  }
  const cliente = state.clientes.find(c => c.idCliente === idCliente);
  abrirAbonoPOS({
    idCliente,
    nombre: cliente ? [cliente.nombre, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(' ') : 'Cliente'
  });
}

async function prepararAccionCancelar() {
  const id = state.cancelarSelectedId;
  const panel = document.getElementById('posCancelarPanel');
  const info = document.getElementById('posCancelarInfo');
  const motivoGroup = document.getElementById('posCancelarMotivoGroup');
  const codigoGroup = document.getElementById('posCancelarCodigoGroup');
  const label = document.getElementById('btnConfirmarCancelarPOSLabel');
  const btn = document.getElementById('btnConfirmarCancelarPOS');

  if (Utils.hasPermiso('VENTAS_CANCELAR') || Utils.hasPermiso('CANCELACIONES_AUTORIZAR')) {
    state.cancelarAccion = 'directa';
    panel.classList.add('d-none');
    label.textContent = 'Autorizar y Cancelar';
    btn.classList.remove('d-none');
    return;
  }

  panel.classList.remove('d-none');
  btn.classList.add('d-none');
  document.getElementById('posCancelarCodigo').value = '';
  document.getElementById('posCancelarMotivo').value = '';

  let venta = null;
  try { venta = await API.get('/ventas/' + id); } catch (_) {}

  if (venta && venta.estado === 'SOLICITADA_CANCELACION') {
    state.cancelarAccion = 'autorizar';
    info.textContent = 'Ya existe una solicitud de cancelaci\u00f3n pendiente. Ingresa el c\u00f3digo que el administrador gener\u00f3 en el m\u00f3dulo de Autorizaciones.';
    motivoGroup.classList.add('d-none');
    codigoGroup.classList.remove('d-none');
    label.textContent = 'Autorizar y Cancelar';
  } else {
    state.cancelarAccion = 'solicitar';
    info.textContent = 'No tienes permiso directo para cancelar. Indica el motivo para enviar la solicitud al administrador.';
    motivoGroup.classList.remove('d-none');
    codigoGroup.classList.add('d-none');
    label.textContent = 'Solicitar Cancelaci\u00f3n';
  }
  btn.classList.remove('d-none');
}

async function confirmarCancelarVenta() {
  if (!state.cancelarSelectedId) { Utils.showToast('Selecciona una venta', 'warning'); return; }
  const modalEl = document.getElementById('posCancelarModal');
  const id = state.cancelarSelectedId;

  try {
    if (state.cancelarAccion === 'autorizar' || state.cancelarAccion === 'directa') {
      if (state.cancelarAccion === 'autorizar') {
        const codigo = document.getElementById('posCancelarCodigo').value.trim();
        if (!/^\d{4}$/.test(codigo)) { Utils.showToast('Ingresa el c\u00f3digo de 4 d\u00edgitos', 'warning'); return; }
      }
      const ok = await Utils.confirm('Se cancelar\u00e1 la venta #' + id + ' y se revertir\u00e1 el stock, el saldo de la caja y el cr\u00e9dito en su caso.', 'Autorizar cancelaci\u00f3n');
      if (!ok) return;
      const codigo = state.cancelarAccion === 'autorizar' ? document.getElementById('posCancelarCodigo').value.trim() : null;
      await API.post('/ventas/' + id + '/cancelar', codigo ? { codigo } : {});
      Utils.showToast('Venta #' + id + ' cancelada', 'success');
    } else {
      const motivo = document.getElementById('posCancelarMotivo').value.trim();
      if (!motivo) { Utils.showToast('Indica el motivo de la cancelaci\u00f3n', 'warning'); return; }
      await API.post('/ventas/' + id + '/solicitar-cancelacion', { motivo });
      Utils.showToast('Solicitud de cancelaci\u00f3n enviada. El administrador autorizar\u00e1 con un c\u00f3digo', 'success');
    }
    state.cancelarSelectedId = null;
    state.cancelarAccion = null;
    bootstrap.Modal.getInstance(modalEl)?.hide();
    await cargarEsperas();
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

async function realizarVentaRapida() {
  if (!state.caja) return;
  const desc = document.getElementById('posVrDescripcion').value.trim();
  const precioVenta = parseFloat(document.getElementById('posVrVenta').value);
  const precioCompra = parseFloat(document.getElementById('posVrCompra').value) || null;
  const cantidad = parseInt(document.getElementById('posVrCantidad').value) || 1;

  if (!desc) { Utils.showToast('Descripci\u00f3n requerida', 'warning'); return; }
  if (!precioVenta || precioVenta <= 0) { Utils.showToast('Precio inv\u00e1lido', 'warning'); return; }

  try {
    const resp = await API.post('/carrito/rapidos', {
      idCaja: state.caja.idCaja,
      descripcion: desc,
      precioVenta: precioVenta,
      precioCompra: precioCompra,
      cantidad: cantidad,
    });

    state.cart.push({
      idProducto: -resp.idItemRapido,
      nombre: desc,
      sku: 'VR',
      cantidad: cantidad,
      precioUnitario: precioVenta,
      stockActual: 999999,
      _idRapido: resp.idItemRapido,
      precioCompra: precioCompra,
      costoVenta: precioCompra,
    });

    renderCart();
    bootstrap.Modal.getInstance(document.getElementById('posVentaRapidaModal'))?.hide();
    document.getElementById('posVrDescripcion').value = '';
    document.getElementById('posVrVenta').value = '';
    document.getElementById('posVrCantidad').value = '1';
    document.getElementById('posVrCompra').value = '';
    Utils.showToast('Item agregado al carrito', 'success');
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function abandonarCaja() {
  if (state.cart.length > 0) {
    const ok = await Utils.confirm('Carrito lleno',
      'Tienes productos en el carrito. \u00bfAbandonar de todas formas?');
    if (!ok) return;
  }
  try {
    const pendientes = await API.get('/gastos/pendientes/' + state.caja.idCaja + '/count');
    if (pendientes > 0) {
      const ok = await Utils.confirm('Gastos Pendientes',
        'Hay ' + pendientes + ' gasto(s) pendiente(s) por autorizar. \u00bfAbandonar caja de todas formas?');
      if (!ok) return;
    }
  } catch (_) {}
  window.__cajaAbierta = false;
  detenerPollingCaja();
  localStorage.removeItem('lastCajaId');
  localStorage.removeItem('lastSucursalId');
  await limpiarCart();
  state.caja = null;
  state.reanudandoVentaId = null;
  state.esperaVentas = [];
  mostrarSelectorCaja();
}

function actualizarOpcionesPrecio() {
  const selector = document.getElementById('precioSelector');
  if (!selector) return;
  [...selector.options].forEach(option => {
    const index = parseInt(option.value);
    option.disabled = index > 1 && !state.productos.some(p => p['precio' + index] != null && p['precio' + index] > 0);
  });
  if (selector.selectedOptions[0]?.disabled) selector.value = '1';
}

function abrirClienteModal() {
  document.getElementById('formPosCliente').reset();
  document.getElementById('posClienteEstado').value = '';
  document.getElementById('posClienteMunicipio').value = '';
  document.getElementById('posClienteColonia').innerHTML = '<option value="">Seleccionar...</option>';
  const group = document.getElementById('posClienteLimiteCreditoGroup');
  if (group) group.style.display = 'none';
  cargarPaises('posClientePais');
  cargarRegimenes('posClienteRegimen');
  new bootstrap.Modal(document.getElementById('posClienteModal')).show();
}

async function guardarClienteDesdePOS() {
  function buildDireccionPOS() {
    const calle = document.getElementById('posClienteCalle')?.value?.trim() || '';
    const numExt = document.getElementById('posClienteNumExt')?.value?.trim() || '';
    const numInt = document.getElementById('posClienteNumInt')?.value?.trim() || '';
    const colonia = document.getElementById('posClienteColonia')?.value || '';
    const municipio = document.getElementById('posClienteMunicipio')?.value?.trim() || '';
    const estado = document.getElementById('posClienteEstado')?.value?.trim() || '';
    const cp = document.getElementById('posClienteCp')?.value?.trim() || '';
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

  const tieneCredito = document.getElementById('posClienteTieneCredito').checked;
  const data = {
    nombre: document.getElementById('posClienteNombre').value.trim(),
    apellidoPaterno: document.getElementById('posClienteApaterno').value.trim(),
    apellidoMaterno: document.getElementById('posClienteAmaterno').value.trim(),
    telefono: document.getElementById('posClienteTelefono').value.trim(),
    codigoPais: document.getElementById('posClientePais').value,
    whatsapp: document.getElementById('posClienteWhatsapp').value.trim(),
    empresa: document.getElementById('posClienteEmpresa').value.trim(),
    regimenFiscal: document.getElementById('posClienteRegimen').value,
    rfc: document.getElementById('posClienteRfc')?.value?.trim() || null,
    representanteLegal: document.getElementById('posClienteRepresentanteLegal')?.value?.trim() || null,
    direccionEntrega: document.getElementById('posClienteDireccionEntrega')?.value?.trim() || null,
    cp: document.getElementById('posClienteCp')?.value?.trim() || null,
    direccion: buildDireccionPOS() || null,
    tieneCredito: tieneCredito,
    limiteCredito: tieneCredito ? (parseFloat(document.getElementById('posClienteLimiteCredito').value) || 0) : 0,
  };

  if (!data.nombre) { Utils.showToast('Nombre requerido', 'warning'); return; }
  if (!data.apellidoPaterno) { Utils.showToast('Apellido paterno requerido', 'warning'); return; }
  if (!data.telefono) { Utils.showToast('Tel\u00e9fono requerido', 'warning'); return; }


  try {
    await API.post('/clientes', data);
    Utils.showToast('Cliente creado', 'success');
    bootstrap.Modal.getInstance(document.getElementById('posClienteModal'))?.hide();
    await cargarClientesSelect('posCliente');
  } catch (err) { Utils.showToast(err.message, 'error'); }
}

const cpCachePOS = {};

async function cargarColoniasPOS(cp, selectedColonia) {
  if (!cp || cp.length !== 5) return;
  if (cpCachePOS[cp]) {
    aplicarDatosCPPOS(cpCachePOS[cp], selectedColonia);
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
      cpCachePOS[cp] = result;
      aplicarDatosCPPOS(result, selectedColonia);
    }
  } catch (_) {
    document.getElementById('posClienteEstado').value = '';
    document.getElementById('posClienteColonia').innerHTML = '<option value="">No disponible</option>';
  }
}

function aplicarDatosCPPOS(result, selectedColonia) {
  const sel = document.getElementById('posClienteColonia');
  if (sel) {
    sel.innerHTML = '<option value="">Seleccionar...</option>' +
      result.colonias.map(c => `<option value="${c}" ${c === selectedColonia ? 'selected' : ''}>${c}</option>`).join('');
    sel.disabled = false;
  }
  const estadoInput = document.getElementById('posClienteEstado');
  if (estadoInput) estadoInput.value = result.estado;
}

// --- Promociones y Combos POS Integration ---

async function abrirPromocionesModal() {
  new bootstrap.Modal(document.getElementById('posPromocionModal')).show();
  await Promise.all([cargarPromosActivas(), cargarCombosActivos()]);
}

async function cargarPromosActivas() {
  const container = document.getElementById('posPromosContainer');
  if (!container) return;
  try {
    const promos = await API.get('/promociones/activas');
    const filtered = promos.filter(p => p.tipo === 'PROMOCION');
    if (filtered.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-percent fa-2x mb-2"></i><p>No hay promociones activas</p></div>';
      return;
    }
    container.innerHTML = filtered.map(p => `
      <div class="col-md-6">
        <div class="card card-sm border-primary promo-card" data-id="${p.idPromocion}" data-tipo="PROMOCION" style="cursor:pointer">
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold small">${Utils.esc(p.nombre)}</div>
                <small class="text-muted">${p.productoNombre ? Utils.esc(p.productoNombre) : ''}</small>
              </div>
              <div class="text-end">
                <div class="badge bg-danger">-${p.descuentoPorcentaje}%</div>
                <div class="fw-bold mt-1" style="color:var(--primary)">${Utils.formatMonto(p.precioFinal || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`).join('');

    container.querySelectorAll('.promo-card').forEach(card => {
      card.addEventListener('click', () => aplicarPromocion(parseInt(card.dataset.id)));
    });
  } catch (_) {
    container.innerHTML = '<div class="text-center py-4 text-danger">Error al cargar promociones</div>';
  }
}

async function cargarCombosActivos() {
  const container = document.getElementById('posCombosContainer');
  if (!container) return;
  try {
    const combos = await API.get('/promociones/activas');
    const filtered = combos.filter(c => c.tipo === 'COMBO');
    if (filtered.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted"><i class="fas fa-boxes fa-2x mb-2"></i><p>No hay combos activos</p></div>';
      return;
    }
    container.innerHTML = filtered.map(c => `
      <div class="col-md-6">
        <div class="card card-sm border-info combo-card" data-id="${c.idPromocion}" data-tipo="COMBO" style="cursor:pointer">
          <div class="card-body p-2">
            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="fw-semibold small">${Utils.esc(c.nombre)}</div>
                <small class="text-muted">${(c.detalles || []).length} producto(s)</small>
              </div>
              <div class="text-end">
                <div class="badge bg-info">-${c.descuentoPorcentaje}%</div>
                <div class="fw-bold mt-1" style="color:var(--primary)">${Utils.formatMonto(c.precioFinal || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>`).join('');

    container.querySelectorAll('.combo-card').forEach(card => {
      card.addEventListener('click', () => aplicarCombo(parseInt(card.dataset.id)));
    });
  } catch (_) {
    container.innerHTML = '<div class="text-center py-4 text-danger">Error al cargar combos</div>';
  }
}

async function aplicarPromocion(promoId) {
  try {
    const promo = await API.get('/promociones/' + promoId);
    if (!promo.idProducto) {
      Utils.showToast('La promoci\u00f3n no tiene producto asignado', 'warning');
      return;
    }

    const productExists = state.productos.find(p => p.idProducto === promo.idProducto);
    if (!productExists) {
      const data = await API.get('/productos?search=&activo=true&page=0&size=500');
      state.productos = data.content || [];
    }

    const prod = state.productos.find(p => p.idProducto === promo.idProducto);
    if (!prod) {
      Utils.showToast('Producto no encontrado en el inventario', 'warning');
      return;
    }

    if (getStockSucursal(prod) <= 0) {
      Utils.showToast('Producto sin stock en esta sucursal', 'warning');
      return;
    }

    const idx = state.cart.findIndex(d => d.idProducto === promo.idProducto);
    if (idx >= 0) {
      const stockSuc = getStockSucursal(prod);
      if (state.cart[idx].cantidad >= stockSuc) {
        Utils.showToast('Stock insuficiente', 'warning');
        return;
      }
      state.cart[idx].cantidad++;
    } else {
      state.cart.push({
        idProducto: promo.idProducto,
        nombre: prod.nombre,
        sku: prod.sku,
        cantidad: 1,
        precioUnitario: promo.precioFinal || 0,
        stockActual: getStockSucursal(prod),
        _promoNombre: promo.nombre,
        _promoId: promoId,
      });
    }

    renderCart();
    Utils.showToast('Promoci\u00f3n aplicada: ' + promo.nombre, 'success');
    bootstrap.Modal.getInstance(document.getElementById('posPromocionModal'))?.hide();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function aplicarCombo(comboId) {
  try {
    const combo = await API.get('/promociones/' + comboId);
    const detalles = combo.detalles || [];
    if (detalles.length === 0) {
      Utils.showToast('El combo no tiene productos', 'warning');
      return;
    }

    const data = await API.get('/productos?activo=true&page=0&size=500');
    const allProductos = data.content || [];
    const desc = combo.descuentoPorcentaje || 0;

    let skipped = 0;
    for (const det of detalles) {
      const prod = allProductos.find(p => p.idProducto === det.idProducto);
      if (!prod) { skipped++; continue; }

      const unitPrice = (prod.precioBase || 0) * (1 - desc / 100);
      const stockSuc = state.caja?.idSucursal
        ? (prod.inventarioSucursales || []).find(i => i.idSucursal === state.caja.idSucursal)?.stock || 0
        : prod.stockActual || 0;

      if (stockSuc < det.cantidad) { skipped++; continue; }

      const existing = state.cart.find(d => d.idProducto === det.idProducto);
      if (existing) {
        existing.cantidad += det.cantidad;
      } else {
        state.cart.push({
          idProducto: det.idProducto,
          nombre: prod.nombre,
          sku: prod.sku,
          cantidad: det.cantidad,
          precioUnitario: unitPrice,
          stockActual: stockSuc,
          _comboNombre: combo.nombre,
          _comboId: comboId,
        });
      }
    }

    if (skipped === detalles.length) {
      Utils.showToast('No se pudo agregar ning\u00fan producto del combo (sin stock)', 'warning');
      return;
    }

    renderCart();
    Utils.showToast('Combo aplicado: ' + combo.nombre + (skipped > 0 ? ' (' + skipped + ' producto(s) sin stock omitidos)' : ''), 'success');
    bootstrap.Modal.getInstance(document.getElementById('posPromocionModal'))?.hide();
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}
