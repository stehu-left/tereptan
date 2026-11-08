/**
 * Belépési pont
 * Itt hívjuk meg a modulok inicializáló függvényeit a DOM betöltése után.
 */

window.addEventListener('DOMContentLoaded', () => {
  // Térkép modul indítása
  if (typeof initMapModule === 'function') {
    initMapModule();
  } else {
    console.error('HIBA: initMapModule nem található. Ellenőrizd, hogy a js/map.js betöltődött-e!');
  }

  // Távcső modul indítása
  if (typeof initReticleModule === 'function') {
    initReticleModule();
  }

  // Vetület modul indítása
  if (typeof initTheoryModule === 'function') {
    initTheoryModule();
  }

  // Küldetés modul indítása
  if (typeof initMissionModule === 'function') {
    initMissionModule();
  } else {
    console.error('HIBA: initMissionModule nem található. Ellenőrizd, hogy a js/mission.js betöltődött-e!');
  }
});
