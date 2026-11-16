let metaActual = null;

export function init() {
  const fecha = document.getElementById('metasCobranzaFecha');
  if (fecha) { const hoy = new Date(); fecha.value = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-' + String(hoy.getDate()).padStart(2, '0'); }
  document.getElementById('btnActualizarMetas')?.addEventListener('click', cargar);
  document.getElementById('metasCobranzaBody')?.addEventListener('click', manejarClick);
  cargar();
}
async function cargar() {
  const ahora = new Date(); const fechaLocal = ahora.getFullYear() + '-' + String(ahora.getMonth() + 1).padStart(2, '0') + '-' + String(ahora.getDate()).padStart(2, '0');
  const fecha = document.getElementById('metasCobranzaFecha')?.value || fechaLocal;
  const miCartera = !Utils.hasPermiso('COBRANZA_VER_TODAS');
  try { metaActual = await API.get('/creditos/cobranza/progreso?fecha=' + encodeURIComponent(fecha) + '&miCartera=' + miCartera); render(); } catch (err) { Utils.showToast(err.message, 'error'); }
}
function render() {
  if (!metaActual) return;
  document.getElementById('metasTotal').textContent = Utils.formatMonto(metaActual.metaTotal || 0);
  document.getElementById('metasCobrado').textContent = Utils.formatMonto(metaActual.cobradoTotal || 0);
  document.getElementById('metasPorcentaje').textContent = Number(metaActual.porcentajeTotal || 0).toFixed(1) + '%';
  const body = document.getElementById('metasCobranzaBody'); const lista = Array.isArray(metaActual.cobradores) ? metaActual.cobradores : [];
  body.innerHTML = lista.length ? lista.map(c => { const p = Number(c.porcentaje || 0); return '<tr><td>' + Utils.esc(c.cobrador || '-') + '</td><td class="text-end">' + Utils.formatMonto(c.meta || 0) + '</td><td class="text-end">' + Utils.formatMonto(c.cobrado || 0) + '</td><td><div class="d-flex justify-content-between small"><span>' + p.toFixed(1) + '%</span><span>' + (p > 100 ? 'Meta superada' : '') + '</span></div><div class="cobranza-progress-track"><div class="cobranza-progress-bar" style="width:' + Math.min(100, Math.max(0, p)) + '%"></div></div></td><td class="text-end">' + Utils.formatMonto(c.restante || 0) + '</td><td><button type="button" class="btn-kebab-toggle kebab-trigger meta-kebab" data-id="' + c.idCobrador + '" title="Acciones"><i class="fas fa-ellipsis-v"></i></button></td></tr>'; }).join('') : '<tr><td colspan="6" class="text-center text-muted py-4">Sin metas para la fecha seleccionada</td></tr>';
}
function manejarClick(e) { const btn = e.target.closest('.meta-kebab'); if (!btn) return; Utils.abrirMenuKebab(btn, [{ icon: 'fa-wallet', text: 'Ver cartera del cobrador', color: 'var(--primary)', onClick: () => { sessionStorage.setItem('cobranzaCarteraCobrador', btn.dataset.id); Utils.cargarVista('pages/cartera-cobranza.html', 'cartera-cobranza'); } }]); }
