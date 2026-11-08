/**
 * Belépési pont
 * Itt hívjuk meg a modulok inicializáló függvényeit a DOM betöltése után.
 */

window.addEventListener('DOMContentLoaded', () => {
  // Térkép modul indítása (a js/map.js-ben van az initMapModule)
  if (typeof initMapModule === 'function') {
    initMapModule();
  } else {
    console.error('HIBA: initMapModule nem található. Ellenőrizd, hogy a js/map.js betöltődött-e!');
  }

  // Távcső modul indítása (a js/reticle.js-ben van az initReticleModule)
  if (typeof initReticleModule === 'function') {
    initReticleModule();
  }

  // Vetület modul indítása (a js/projection.js-ben van az initTheoryModule)
  if (typeof initTheoryModule === 'function') {
    initTheoryModule();
  }
});
