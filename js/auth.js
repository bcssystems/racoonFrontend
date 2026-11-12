const Auth = {
  init() { this.bindEvents(); this.checkAuthStatus(); },
  bindEvents() {
    document.getElementById('login-form')?.addEventListener('submit', e => { e.preventDefault(); this.login(); });
    document.getElementById('toggle-password')?.addEventListener('click', () => {
      const input = document.getElementById('password'); const icon = document.getElementById('toggle-password-icon');
      input.type = input.type === 'password' ? 'text' : 'password'; if (icon) icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
  },
  async login() {
    const usuario = document.getElementById('username').value.trim(); const password = document.getElementById('password').value;
    const button = document.getElementById('btn-login'); const text = document.getElementById('btn-login-text'); const loader = document.getElementById('btn-login-loader');
    if (!usuario || !password) return Utils.showToast('Ingresa usuario y contraseña', 'warning');
    button.disabled = true; text?.classList.add('d-none'); loader?.classList.remove('d-none');
    try { await API.cargarCsrf(); const session = await API.post('/auth/login', { usuario, password }); API.setSession(session); Utils.showToast('Inicio de sesión exitoso', 'success'); this.showDashboard(); }
    catch (error) { Utils.showToast(error.message || 'Credenciales incorrectas', 'error'); }
    finally { button.disabled = false; text?.classList.remove('d-none'); loader?.classList.add('d-none'); }
  },
  async logout() { await API.cerrarSesion().catch(() => {}); this.showLogin(); Utils.showToast('Sesión cerrada', 'info'); },
  async checkAuthStatus() {
    try { await API.cargarCsrf(); const session = await API.get('/auth/me'); API.setSession(session); this.showDashboard(); }
    catch (_) { this.showLogin(); }
  },
  showLogin() { document.getElementById('login-view')?.classList.remove('d-none'); document.getElementById('dashboard-view')?.classList.add('d-none'); },
  showDashboard() { document.getElementById('login-view')?.classList.add('d-none'); document.getElementById('dashboard-view')?.classList.remove('d-none'); Dashboard.init(); },
};
