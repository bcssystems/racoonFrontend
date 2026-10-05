const Auth = {
  init() {
    this.bindEvents();
    this.checkAuthStatus();
  },

  bindEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.login();
      });
    }

    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const pass = document.getElementById('password');
        const icon = document.getElementById('toggle-password-icon');
        if (pass.type === 'password') {
          pass.type = 'text';
          icon.className = 'fas fa-eye-slash';
        } else {
          pass.type = 'password';
          icon.className = 'fas fa-eye';
        }
      });
    }
  },

  async login() {
    const usuario = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');
    const btnText = document.getElementById('btn-login-text');
    const btnLoader = document.getElementById('btn-login-loader');

    if (!usuario || !password) {
      Utils.showToast('Ingresa usuario y contraseña', 'warning');
      return;
    }

    btn.disabled = true;
    btnText.classList.add('d-none');
    btnLoader.classList.remove('d-none');

    try {
      const response = await API.post('/auth/login', { usuario, password });

      localStorage.setItem('authToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('username', response.usuario);
      localStorage.setItem('userNombre', response.nombre);
      localStorage.setItem('userRol', response.rol);

      Utils.showToast('Inicio de sesión exitoso', 'success');
      this.checkAuthStatus();
    } catch (err) {
      Utils.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btnText.classList.remove('d-none');
      btnLoader.classList.add('d-none');
    }
  },

  logout() {
    if (this._loggingOut) return;
    this._loggingOut = true;

    const token = localStorage.getItem('authToken');
    if (token) {
      fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
      }).catch(() => {});
    }

    localStorage.clear();
    Utils.showToast('Sesión cerrada', 'info');
    this.checkAuthStatus();
    this._loggingOut = false;
  },

  checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');

    if (token && !API.tokenExpirado()) {
      loginView.classList.add('d-none');
      dashboardView.classList.remove('d-none');
      if (typeof Dashboard !== 'undefined') {
        Dashboard.init();
      }
    } else {
      if (token) {
        localStorage.clear();
      }
      loginView.classList.remove('d-none');
      dashboardView.classList.add('d-none');
    }
  },
};
