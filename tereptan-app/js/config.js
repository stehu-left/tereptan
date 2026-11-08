/**
 * Globális konfiguráció, vetületi definíciók és alapadatok
 */
const CONFIG = {
  DEFAULT_LAT_LNG: [47.5072, 19.0455], // Budapest (Országház)
  DEFAULT_ZOOM: 12,
  PIXELS_PER_MIL: 18,
  
  // Proj4 vetületek
  PROJ_DEFS: [
    ['EPSG:32633', '+proj=utm +zone=33 +datum=WGS84 +units=m +no_defs'],
    ['EPSG:32634', '+proj=utm +zone=34 +datum=WGS84 +units=m +no_defs']
  ],

  // Alapértelmezett célpontok adatai
  TARGET_PRESETS: {
    truck: { h: 2.5, name: 'Teherautó', ratio: 1.8 },
    tank: { h: 2.8, name: 'Harckocsi', ratio: 2.2 },
    soldier: { h: 1.8, name: 'Katona', ratio: 0.45 },
    tree: { h: 5.0, name: 'Fa / Vadles', ratio: 0.8 },
    tower: { h: 25.0, name: 'Templom', ratio: 0.6 }
  }
};

// Proj4 inicializálása
if (typeof proj4 !== 'undefined') {
  proj4.defs(CONFIG.PROJ_DEFS);
}