/**
 * Térképkezelő és Valódi MGRS Méterrács Modul
 */
let map, marker;
let dynamicGridLayer;

function getUTMBandLetter(lat) {
  if (lat < -80 || lat > 84) return '';
  if (lat >= 72) return 'X';
  const letters = 'CDEFGHJKLMNPQRSTUVWX'; // I és O kizárva
  const idx = Math.floor((lat + 80) / 8);
  return letters[Math.min(idx, letters.length - 2)];
}

function initMapModule() {
  map = L.map('map', { 
    zoomControl: false, 
    attributionControl: false, 
    minZoom: 4, 
    maxZoom: 18 
  }).setView(CONFIG.DEFAULT_LAT_LNG, CONFIG.DEFAULT_ZOOM);

  L.control.zoom({ position: 'topright' }).addTo(map);

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17 });
  const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18 });

  osm.addTo(map);
  L.control.layers({ "🗺️ Utca": osm, "⛰️ Terep": topo, "🛰️ Műhold": sat }, null, { position: 'topleft' }).addTo(map);

  const customIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background:var(--accent-cyan); width:20px; height:20px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px #000;"></div>`,
    iconSize: [20, 20], 
    iconAnchor: [10, 10]
  });

  marker = L.marker(CONFIG.DEFAULT_LAT_LNG, { draggable: true, icon: customIcon }).addTo(map);
  marker.on('drag', (e) => updatePositionCoordinates(e.target.getLatLng()));
  map.on('click', (e) => { 
    marker.setLatLng(e.latlng); 
    updatePositionCoordinates(e.latlng); 
  });

  dynamicGridLayer = L.layerGroup().addTo(map);
  map.on('zoomend moveend', updateDynamicGrid);

  updatePositionCoordinates(L.latLng(CONFIG.DEFAULT_LAT_LNG[0], CONFIG.DEFAULT_LAT_LNG[1]));
  updateDynamicGrid();
}

function updateDynamicGrid() {
  if (!dynamicGridLayer) return;
  dynamicGridLayer.clearLayers();

  const zoom = map.getZoom();
  const bounds = map.getBounds();
  const statusBadge = document.getElementById('zoom-status');
  const statusDesc = document.getElementById('zoom-desc');

  if (zoom <= 6) {
    statusBadge.innerText = `ZOOM: ${zoom} (UTM Zónák & Sávok)`;
    statusDesc.innerText = 'Globális felosztás: 6° hosszúsági szeletek × 8° szélességi sávok (GZD).';
    drawGZDLevel(bounds);
  } else if (zoom >= 7 && zoom <= 9) {
    statusBadge.innerText = `ZOOM: ${zoom} (100 km MGRS Blokkok)`;
    statusDesc.innerText = 'Zónán belüli 100×100 km-es négyzetek katonai kétbetűs azonosítóval (pl. CT).';
    drawMetricMGRSGrid(bounds, 100000, '100k');
  } else if (zoom >= 10 && zoom <= 12) {
    statusBadge.innerText = `ZOOM: ${zoom} (10 km Rácsháló)`;
    statusDesc.innerText = '10×10 km-es navigációs háló (középszintű csapatmozgás és tájékozódás).';
    drawMetricMGRSGrid(bounds, 10000, '10k');
  } else {
    statusBadge.innerText = `ZOOM: ${zoom} (1 km Tüzérségi Méterrács)`;
    statusDesc.innerText = 'A vonalszámok (00–99) a 100 km-es blokk bal alsó sarkától mért km-ek. Ebből áll össze a 4 jegyű koordináta!';
    drawMetricMGRSGrid(bounds, 1000, '1k');
  }
}

function drawGZDLevel(b) {
  const minLng = Math.floor(b.getWest() / 6) * 6;
  const maxLng = Math.ceil(b.getEast() / 6) * 6;
  const minLat = Math.max(-80, Math.floor(b.getSouth() / 8) * 8);
  const maxLat = Math.min(84, Math.ceil(b.getNorth() / 8) * 8);

  for (let lng = minLng; lng <= maxLng; lng += 6) {
    L.polyline([[minLat, lng], [maxLat, lng]], { color: '#3b82f6', weight: 2, opacity: 0.75, dashArray: '8, 8' }).addTo(dynamicGridLayer);
  }
  for (let lat = minLat; lat <= maxLat; lat += 8) {
    L.polyline([[lat, minLng], [lat, maxLng]], { color: '#3b82f6', weight: 2, opacity: 0.75, dashArray: '8, 8' }).addTo(dynamicGridLayer);
  }

  for (let lng = minLng; lng < maxLng; lng += 6) {
    for (let lat = minLat; lat < maxLat; lat += 8) {
      const zNum = Math.floor((lng + 180) / 6) + 1;
      const band = getUTMBandLetter(lat + 4);
      const center = [lat + 4, lng + 3];
      if (b.contains(center) && band) {
        L.marker(center, {
          icon: L.divIcon({ className: 'grid-label-gzd', html: `${zNum}${band}`, iconSize: [50, 30], iconAnchor: [25, 15] }),
          interactive: false
        }).addTo(dynamicGridLayer);
      }
    }
  }
}

function drawMetricMGRSGrid(bounds, stepMeters, type) {
  const minZone = Math.max(1, Math.floor((bounds.getWest() + 180) / 6) + 1);
  const maxZone = Math.min(60, Math.floor((bounds.getEast() + 180) / 6) + 1);

  const bNorth = bounds.getNorth();
  const bSouth = bounds.getSouth();
  const bWest = bounds.getWest();
  const bEast = bounds.getEast();
  const latSpan = bNorth - bSouth;
  const lngSpan = bEast - bWest;

  for (let zone = minZone; zone <= maxZone; zone++) {
    const utmProj = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
    const zoneLngMin = (zone - 1) * 6 - 180;
    const zoneLngMax = zone * 6 - 180;

    const west = Math.max(bWest - lngSpan * 0.1, zoneLngMin);
    const east = Math.min(bEast + lngSpan * 0.1, zoneLngMax);
    if (west >= east) continue;

    const south = Math.max(-80, bSouth - latSpan * 0.1);
    const north = Math.min(84, bNorth + latSpan * 0.1);

    const swM = proj4('EPSG:4326', utmProj, [west, south]);
    const seM = proj4('EPSG:4326', utmProj, [east, south]);
    const nwM = proj4('EPSG:4326', utmProj, [west, north]);
    const neM = proj4('EPSG:4326', utmProj, [east, north]);

    const minE = Math.floor(Math.min(swM[0], seM[0], nwM[0], neM[0]) / stepMeters) * stepMeters;
    const maxE = Math.ceil(Math.max(swM[0], seM[0], nwM[0], neM[0]) / stepMeters) * stepMeters;
    const minN = Math.floor(Math.min(swM[1], seM[1], nwM[1], neM[1]) / stepMeters) * stepMeters;
    const maxN = Math.ceil(Math.max(swM[1], seM[1], nwM[1], neM[1]) / stepMeters) * stepMeters;

    const lineStyle = type === '100k' 
      ? { color: '#10b981', weight: 1.8, opacity: 0.7 }
      : (type === '10k' 
          ? { color: '#f59e0b', weight: 1.2, opacity: 0.5, dashArray: '4, 4' }
          : { color: '#ef4444', weight: 1.2, opacity: 0.55 });

    // Rögzítési pontok a képernyő szélén (kicsit beljebb)
    const topEdgeLat = bNorth - latSpan * 0.04;
    const leftEdgeLng = bWest + lngSpan * 0.04;

    // 1. FÜGGŐLEGES (EASTING) VONALAK ÉS FELSŐ CÍMKÉK
    for (let e = minE; e <= maxE; e += stepMeters) {
      const pS = proj4(utmProj, 'EPSG:4326', [e, minN]);
      const pN = proj4(utmProj, 'EPSG:4326', [e, maxN]);

      L.polyline([[pS[1], pS[0]], [pN[1], pN[0]]], lineStyle).addTo(dynamicGridLayer);

      if (type === '1k') {
        // A vonal metszéspontja a képernyő felső szélével:
        // A topEdgeLat szélességnél keressük a vonal hosszúságát.
        // Ehhez a képernyő jobb szélét (bEast) használjuk referencia hosszúságnak,
        // majd az így kapott UTM Northing-ot párosítjuk az 'e' Easting-gal.
        const refNorthing = proj4('EPSG:4326', utmProj, [bEast, topEdgeLat])[1];
        const labelPoint = proj4(utmProj, 'EPSG:4326', [e, refNorthing]);

        if (labelPoint[0] >= bWest && labelPoint[0] <= bEast) {
          const kmNum = String(Math.floor((e % 100000) / 1000)).padStart(2, '0');
          L.marker([topEdgeLat, labelPoint[0]], {
            icon: L.divIcon({
              className: 'grid-label-1k',
              html: kmNum,
              iconSize: [22, 16],
              iconAnchor: [11, 8]
            }),
            interactive: false
          }).addTo(dynamicGridLayer);
        }
      }
    }

    // 2. VÍZSZINTES (NORTHING) VONALAK ÉS BAL OLDALI CÍMKÉK
    for (let n = minN; n <= maxN; n += stepMeters) {
      const pW = proj4(utmProj, 'EPSG:4326', [minE, n]);
      const pE = proj4(utmProj, 'EPSG:4326', [maxE, n]);

      L.polyline([[pW[1], pW[0]], [pE[1], pE[0]]], lineStyle).addTo(dynamicGridLayer);

      if (type === '1k') {
        // A vonal metszéspontja a képernyő bal szélével:
        // A leftEdgeLng hosszúságnál keressük a vonal szélességét.
        // Ehhez a képernyő felső szélét (bNorth) használjuk referencia szélességnek,
        // majd az így kapott UTM Easting-ot párosítjuk az 'n' Northing-gal.
        const refEasting = proj4('EPSG:4326', utmProj, [leftEdgeLng, bNorth])[0];
        const labelPoint = proj4(utmProj, 'EPSG:4326', [refEasting, n]);

        if (labelPoint[1] >= bSouth && labelPoint[1] <= bNorth) {
          const kmNum = String(Math.floor((n % 100000) / 1000)).padStart(2, '0');
          L.marker([labelPoint[1], leftEdgeLng], {
            icon: L.divIcon({
              className: 'grid-label-1k',
              html: kmNum,
              iconSize: [22, 16],
              iconAnchor: [11, 8]
            }),
            interactive: false
          }).addTo(dynamicGridLayer);
        }
      }
    }

    // 3. 100 km ÉS 10 km BLOKKCÍMKÉK
    if (type === '100k' || type === '10k') {
      for (let e = minE; e < maxE; e += stepMeters) {
        for (let n = minN; n < maxN; n += stepMeters) {
          const centerGeo = proj4(utmProj, 'EPSG:4326', [e + stepMeters / 2, n + stepMeters / 2]);

          if (bounds.contains([centerGeo[1], centerGeo[0]])) {
            try {
              const code = mgrs.forward(centerGeo);
              const sq = code.substring(3, 5);
              if (type === '100k') {
                L.marker([centerGeo[1], centerGeo[0]], {
                  icon: L.divIcon({ className: 'grid-label-100k', html: sq, iconSize: [36, 22], iconAnchor: [18, 11] }),
                  interactive: false
                }).addTo(dynamicGridLayer);
              } else {
                const e1 = code.substring(5, 6);
                const n1 = code.substring(10, 11);
                L.marker([centerGeo[1], centerGeo[0]], {
                  icon: L.divIcon({ className: 'grid-label-10k', html: `${sq} ${e1}${n1}`, iconSize: [46, 18], iconAnchor: [23, 9] }),
                  interactive: false
                }).addTo(dynamicGridLayer);
              }
            } catch(err) {}
          }
        }
      }
    }
  }
}

function updatePositionCoordinates(ll) {
  document.getElementById('disp-wgs').innerText = `${ll.lat.toFixed(4)}°, ${ll.lng.toFixed(4)}°`;
  try {
    const code = mgrs.forward([ll.lng, ll.lat]);
    const gzd = code.substring(0, 3);
    const sq = code.substring(3, 5);
    const rem = code.substring(5);
    const half = rem.length / 2;
    const e = rem.substring(0, half);
    const n = rem.substring(half);

    document.getElementById('dec-gzd').innerText = gzd;
    document.getElementById('dec-sq').innerText = sq;
    document.getElementById('dec-east').innerText = e;
    document.getElementById('dec-north').innerText = n;
    document.getElementById('disp-utm').innerText = `Zóna ${gzd} E: ${e.padEnd(5, '0')}m, N: ${n.padEnd(5, '0')}m`;

    renderPrecisionLadder(gzd, sq, e, n);
    updateRadioPanelData(ll.lat, ll.lng, gzd, sq, e, n);
  } catch(err) { 
    console.error(err); 
  }
}

function renderPrecisionLadder(gzd, sq, east, north) {
  document.getElementById('precisionLadder').innerHTML = `
    <div class="prec-step"><div><span class="prec-badge">10 km</span></div><div class="prec-code">${gzd} ${sq} <span style="color:var(--accent-amber)">${east.substring(0,1)}</span><span style="color:var(--accent-red)">${north.substring(0,1)}</span></div></div>
    <div class="prec-step active"><div><span class="prec-badge">100 m</span></div><div class="prec-code">${gzd} ${sq} <span style="color:var(--accent-amber)">${east.substring(0,3)}</span> <span style="color:var(--accent-red)">${north.substring(0,3)}</span></div></div>
    <div class="prec-step"><div><span class="prec-badge">1 m</span></div><div class="prec-code">${gzd} ${sq} <span style="color:var(--accent-amber)">${east}</span> <span style="color:var(--accent-red)">${north}</span></div></div>
  `;
}

function flyToLocation(lat, lng, zoomLevel = 13) {
  map.flyTo([lat, lng], zoomLevel, { duration: 1.2 });
  marker.setLatLng([lat, lng]);
  updatePositionCoordinates(L.latLng(lat, lng));
}
