const CAMPOS = {
  fondoCajas: 'cfg-fondoCajas',
  tasaInteresMoraPagare: 'cfg-tasaInteresMoraPagare',
  diasListaNegra: 'cfg-diasListaNegra',
  titularPagare: 'cfg-titularPagare',
  descripcionEmpresa: 'cfg-descripcionEmpresa',
  direccionEmpresa: 'cfg-direccionEmpresa',
  pieTicket: 'cfg-footerTicket'
};

let configs = [];

export function init() {
  bindEvents();
  cargar();
}

function bindEvents() {
  if (!Utils.hasPermiso('CONFIGURACION_EDITAR')) {
    const btn = document.getElementById('btnGuardarConfig');
    if (btn) btn.style.display = 'none';
  }
  document.getElementById('btnGuardarConfig')?.addEventListener('click', guardarTodo);
  document.querySelectorAll('.form-control').forEach(i => {
    i.addEventListener('keydown', e => { if (e.key === 'Enter') guardarTodo(); });
  });
}

async function cargar() {
  try {
    configs = await API.get('/configuraciones');
    configs.forEach(c => {
      const id = CAMPOS[c.clave];
      if (!id) return;
      const el = document.getElementById(id);
      if (el && el.type !== 'file') el.value = c.valor;
      if (c.clave === 'logoTicket' && c.valor) {
        const logo = document.getElementById('cfg-logoActual');
        if (logo) logo.innerHTML = 'Logo actual: <a href="' + Utils.esc(API.mediaBaseUrl + c.valor) + '" target="_blank" rel="noopener">ver archivo</a>';
      }
      const desc = document.getElementById('desc-' + c.clave);
      if (desc) desc.textContent = c.descripcion || '';
    });
  } catch (err) {
    Utils.showToast(err.message, 'error');
  }
}

async function guardarTodo() {
  let ok = true;
  for (const c of configs) {
    const id = CAMPOS[c.clave];
    if (!id) continue;
    const valor = document.getElementById(id)?.value ?? c.valor;
    if (valor === '') { Utils.showToast('El campo ' + c.clave + ' no puede estar vac&iacute;o', 'warning'); ok = false; break; }
    try {
      await API.put('/configuraciones/' + encodeURIComponent(c.clave), { clave: c.clave, valor: String(valor).trim() });
    } catch (err) {
      Utils.showToast(err.message, 'error');
      ok = false;
      break;
    }
  }
  const archivo = document.getElementById('cfg-logoArchivo')?.files?.[0];
  if (ok && archivo) {
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      await API.requestUpload('/configuraciones/logo', form);
    } catch (err) {
      Utils.showToast(err.message, 'error');
      ok = false;
    }
  }
  if (ok) Utils.showToast('Configuraci&oacute;n guardada', 'success');
}
