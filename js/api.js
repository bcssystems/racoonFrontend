const API = (() => {
  const baseUrl = window.location.hostname === 'siga.racoonjw.com'
    ? `${window.location.origin}/api/v1`
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8030/api/v1' : '/api/v1');
  let csrfToken = null;
  let csrfPromise = null;
  let refreshPromise = null;
  let session = null;

  const authEndpoint = endpoint => /\/auth\/(login|refresh-token|logout|csrf)$/.test(endpoint);
  const mutation = method => !['GET', 'HEAD', 'OPTIONS'].includes(method);

  function cookie(name) {
    const prefix = `${name}=`;
    const value = document.cookie.split('; ').find(item => item.startsWith(prefix));
    return value ? decodeURIComponent(value.substring(prefix.length)) : null;
  }

  async function loadCsrf() {
    if (csrfPromise) return csrfPromise;
    csrfPromise = fetch(`${baseUrl}/auth/csrf`, { credentials: 'include', cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('No se pudo inicializar la protección CSRF'); return response.json(); })
      .then(data => { csrfToken = data.token; return csrfToken; })
      .finally(() => { csrfPromise = null; });
    return csrfPromise;
  }

  async function csrf() {
    if (!cookie('XSRF-TOKEN')) await loadCsrf();
    csrfToken = cookie('XSRF-TOKEN') || csrfToken;
    return csrfToken;
  }

  function clearAuthState() {
    session = null;
    ['authToken', 'refreshToken', 'username', 'userNombre', 'userRol'].forEach(key => localStorage.removeItem(key));
  }
  function setSession(data) { session = data || null; }

  async function refresh() {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        await csrf();
        const response = await fetch(`${baseUrl}/auth/refresh-token`, { method: 'POST', credentials: 'include', headers: { 'X-XSRF-TOKEN': cookie('XSRF-TOKEN') || csrfToken } });
        if (!response.ok) throw new Error('Sesión expirada');
        const data = await response.json(); setSession(data); return data;
      })().finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  async function logout() {
    try {
      await csrf();
      await fetch(`${baseUrl}/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'X-XSRF-TOKEN': cookie('XSRF-TOKEN') || csrfToken } });
    } finally { clearAuthState(); }
  }

  async function request(endpoint, options = {}, retry = true) {
    const method = options.method || 'GET';
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (mutation(method) && !endpoint.endsWith('/auth/csrf')) headers['X-XSRF-TOKEN'] = await csrf();
    const response = await fetch(`${baseUrl}${endpoint}`, { ...options, method, credentials: 'include', headers });
    if (response.status === 401 && retry && !authEndpoint(endpoint)) {
      try { await refresh(); return request(endpoint, options, false); }
      catch (_) { clearAuthState(); throw new Error('Sesión expirada'); }
    }
    if (!response.ok) {
      let message = `Error ${response.status}`;
      try { const error = await response.json(); message = error.message || error.error || message; } catch (_) { }
      throw new Error(message);
    }
    if (response.status === 204) return null;
    const text = await response.text(); return text ? JSON.parse(text) : null;
  }

  async function upload(endpoint, formData, retry = true) {
    const response = await fetch(`${baseUrl}${endpoint}`, { method: 'POST', credentials: 'include', body: formData, headers: { 'X-XSRF-TOKEN': await csrf() } });
    if (response.status === 401 && retry) { await refresh(); return upload(endpoint, formData, false); }
    if (!response.ok) { let message = 'Error al subir archivo'; try { const error = await response.json(); message = error.message || error.error || message; } catch (_) { } throw new Error(message); }
    return response.status === 204 ? null : response.json();
  }

  return {
    baseUrl, mediaBaseUrl: baseUrl.replace(/\/api\/v1\/?$/, ''), getSession: () => session, setSession,
    cargarCsrf: loadCsrf, cerrarSesion: logout, get: endpoint => request(endpoint),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
    del: endpoint => request(endpoint, { method: 'DELETE' }), upload, requestUpload: upload, request,
  };
})();
