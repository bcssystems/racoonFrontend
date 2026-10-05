const API = {
  baseUrl: '/api/v1',
  _mediaBaseUrl: undefined,
  get mediaBaseUrl() {
    if (this._mediaBaseUrl !== undefined) return this._mediaBaseUrl;
    if (/^https?:\/\//.test(this.baseUrl)) {
      try {
        this._mediaBaseUrl = new URL(this.baseUrl).origin;
      } catch (_) {
        this._mediaBaseUrl = '';
      }
    } else {
      this._mediaBaseUrl = '';
    }
    return this._mediaBaseUrl;
  },
  set mediaBaseUrl(val) { this._mediaBaseUrl = val; },

  getToken() {
    return localStorage.getItem('authToken');
  },

  tokenExpirado() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch (_) {
      return true;
    }
  },

  cerrarSesion(mensaje) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    localStorage.removeItem('userNombre');
    localStorage.removeItem('userRol');
    if (typeof Utils !== 'undefined') {
      Utils.showToast(mensaje || 'Sesión expirada. Inicia sesión nuevamente.', 'error', 6000);
    }
    setTimeout(() => {
      if (typeof Auth !== 'undefined' && Auth.checkAuthStatus) {
        Auth.checkAuthStatus();
      }
    }, 500);
  },

  async request(endpoint, options = {}) {
    if (this.tokenExpirado()) {
      this.cerrarSesion('Tu sesión ha expirado. Inicia sesión nuevamente.');
      throw new Error('Sesión expirada');
    }

    const url = this.baseUrl + endpoint;
    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (err) {
      throw new Error('Error de conexión con el servidor');
    }

    if (!response.ok) {
      let message = 'Error en la solicitud';
      try {
        const err = await response.json();
        message = err.error || err.message || message;
      } catch (_) {}

      if (response.status === 401) {
        this.cerrarSesion('Sesión expirada. Inicia sesión nuevamente.');
        throw new Error('Sesión expirada');
      }

      throw new Error(message);
    }

    if (response.status === 204) return null;
    return response.json();
  },

  async requestUpload(endpoint, formData) {
    if (this.tokenExpirado()) {
      this.cerrarSesion('Tu sesión ha expirado.');
      throw new Error('Sesión expirada');
    }

    const url = this.baseUrl + endpoint;
    const config = {
      method: 'POST',
      headers: {},
      body: formData,
    };

    const token = this.getToken();
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        let message = 'Error al subir archivo';
        try {
          const err = await response.json();
          message = err.error || message;
        } catch (_) {}

        if (response.status === 401) {
          this.cerrarSesion('Sesión expirada. Inicia sesión nuevamente.');
          throw new Error('Sesión expirada');
        }

        throw new Error(message);
      }
      return response.json();
    } catch (err) {
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint);
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  del(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  startTokenCheck() {
    setInterval(() => {
      if (this.tokenExpirado()) {
        this.cerrarSesion('Tu sesión ha expirado. Inicia sesión nuevamente.');
      }
    }, 60000);
  },
};

API.startTokenCheck();
