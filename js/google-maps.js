/* Carga Google Maps solo cuando una vista realmente necesita un mapa. */
window.GoogleMapsLoader = (() => {
  let promise = null;
  return {
    load() {
      if (window.google?.maps) return Promise.resolve(window.google.maps);
      if (promise) return promise;
      promise = API.get('/catalogos/mapa-config').then(config => {
         if (!config?.googleMapsApiKey) throw new Error('Google Maps no está configurado');
         window.GoogleMapsMapId = config.googleMapsMapId || 'DEMO_MAP_ID';
         return new Promise((resolve, reject) => {
           const script = document.createElement('script');
           script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(config.googleMapsApiKey) + '&loading=async&libraries=marker&language=es&region=MX';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve(window.google.maps);
          script.onerror = () => reject(new Error('No se pudo cargar Google Maps'));
          document.head.appendChild(script);
        });
      });
      return promise;
    }
  };
})();
