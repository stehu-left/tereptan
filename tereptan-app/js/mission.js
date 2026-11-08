/**
 * Küldetés mód
 * A diák kap egy MGRS koordinátát, és a térképre kell kattintania a helyes négyzetre.
 */

let missionMap = null;
let missionMarker = null;
let missionGridLayer = null;
let missionCurrentTarget = null;
let missionCorrect = 0;
let missionAttempts = 0;
let missionAnswered = false;
let missionBlockRect = null;

// Pontossági szint: 3 = 1 km, 4 = 100 m, 5 = 10 m
const MISSION_ACCURACY = 3;

// Előre definiált magyarországi célpontok
const MISSION_TARGETS = [
  { name: 'Bp. Országház',  lat: 47.5072, lng: 19.0455, zoom: 14, hint: 'A Duna partján, a Parlament épülete.' },
  { name: 'Kékestető',      lat: 47.8727, lng: 20.0083, zoom: 14, hint: 'Magyarország legmagasabb pontja, Mátra.' },
  { name: 'Tihanyi Apátság',lat: 46.9142, lng: 17.8931, zoom: 14, hint: 'A Balaton északi partján, a Tihanyi-félszigeten.' },
  { name: 'Egri Vár',       lat: 47.9044, lng: 20.3791, zoom: 14, hint: 'Eger városában, a várhegyen.' },
  { name: 'Hortobágy',      lat: 47.5847, lng: 21.1489, zoom: 14, hint: 'A Kilenclyukú híd a hortobágyi pusztán.' },
  { name: 'Szeged Dóm',     lat: 46.2489, lng: 20.1483, zoom: 14, hint: 'A szegedi dóm, a Tisza partján.' },
  { name: 'Pécs Bazilika',  lat: 46.0786, lng: 18.2236, zoom: 14, hint: 'A pécsi székesegyház a Mecsek lábánál.' },
  { name: 'Debreceni Nagytemplom', lat: 47.5316, lng: 21.6244, zoom: 14, hint: 'Debrecen főterén álló református nagytemplom.' },
  { name: 'Győri Bazilika', lat: 47.6875, lng: 17.6351, zoom: 14, hint: 'A győri bazilika a belvárosban.' },
  { name: 'Miskolc Avas',   lat: 48.1031, lng: 20.7789, zoom: 14, hint: 'A miskolci Avas-tető, a város fölé magasodva.' }
];

function initMissionModule() {
  const mapContainer = document.getElementById('mission-map');
  if (!mapContainer) return;

  if (missionMap) {
    missionMap.invalidateSize();
    return;
  }

  missionMap = L.map('mission-map', {
    zoomControl: true,
    attributionControl: false,
    minZoom: 6,
    maxZoom: 18
  }).setView([47.0, 19.5], 7);

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
  osm.addTo(missionMap);

  // ÚJ: MGRS rács a küldetés térképen is (ugyanaz, mint a fő térképen)
  missionGridLayer = L.layerGroup().addTo(missionMap);
  missionMap.on('zoomend moveend', drawMissionGrid);
  drawMissionGrid();

  missionMap.on('click', onMissionMapClick);

  updateMissionStats();
  startNewMission();
}

// MGRS rács kirajzolása a küldetés térképre
function drawMissionGrid() {
  if (!missionGridLayer || !missionMap) return;
  missionGridLayer.clearLayers();

  const zoom = missionMap.getZoom();
  const bounds = missionMap.getBounds();

  // A célblokk kiemelése (ha van)
  if (missionBlockRect) {
    missionMap.removeLayer(missionBlockRect);
    missionBlockRect = null;
  }

  if (zoom <= 6) {
    drawMissionGZD(bounds);
  } else if (zoom >= 7 && zoom <= 9) {
    drawMissionBlocks(bounds, 100000, '100k');
  } else if (zoom >= 10 && zoom <= 12) {
    drawMissionBlocks(bounds, 10000, '10k');
  } else {
    drawMissionBlocks(bounds, 1000, '1k');
  }

  // Ha van célblokk, azt kiemeljük
  if (missionCurrentTarget) {
    highlightTargetBlock();
  }
}

// Zóna szint
function drawMissionGZD(b) {
  const minLng = Math.floor(b.getWest() / 6) * 6;
  const maxLng = Math.ceil(b.getEast() / 6) * 6;
  const minLat = Math.max(-80, Math.floor(b.getSouth() / 8) * 8);
  const maxLat = Math.min(84, Math.ceil(b.getNorth() / 8) * 8);

  for (let lng = minLng; lng <= maxLng; lng += 6) {
    L.polyline([[minLat, lng], [maxLat, lng]], {
      color: '#3b82f6', weight: 2, opacity: 0.65, dashArray: '8, 8'
    }).addTo(missionGridLayer);
  }
  for (let lat = minLat; lat <= maxLat; lat += 8) {
    L.polyline([[lat, minLng], [lat, maxLng]], {
      color: '#3b82f6', weight: 2, opacity: 0.65, dashArray: '8, 8'
    }).addTo(missionGridLayer);
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
        }).addTo(missionGridLayer);
      }
    }
  }
}

// 100 km / 10 km / 1 km rács (egyszerűsített, mert a fő map.js-ben már van)
function drawMissionBlocks(bounds, stepMeters, type) {
  const minZone = Math.max(1, Math.floor((bounds.getWest() + 180) / 6) + 1);
  const maxZone = Math.min(60, Math.floor((bounds.getEast() + 180) / 6) + 1);

  const bNorth = bounds.getNorth();
  const bSouth = bounds.getSouth();
  const bWest = bounds.getWest();
  const bEast = bounds.getEast();

  for (let zone = minZone; zone <= maxZone; zone++) {
    const utmProj = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;
    const zoneLngMin = (zone - 1) * 6 - 180;
    const zoneLngMax = zone * 6 - 180;

    const west = Math.max(bWest, zoneLngMin);
    const east = Math.min(bEast, zoneLngMax);
    if (west >= east) continue;

    const south = Math.max(-80, bSouth);
    const north = Math.min(84, bNorth);

    const swM = proj4('EPSG:4326', utmProj, [west, south]);
    const seM = proj4('EPSG:4326', utmProj, [east, south]);
    const nwM = proj4('EPSG:4326', utmProj, [west, north]);
    const neM = proj4('EPSG:4326', utmProj, [east, north]);

    const minE = Math.floor(Math.min(swM[0], seM[0], nwM[0], neM[0]) / stepMeters) * stepMeters;
    const maxE = Math.ceil(Math.max(swM[0], seM[0], nwM[0], neM[0]) / stepMeters) * stepMeters;
    const minN = Math.floor(Math.min(swM[1], seM[1], nwM[1], neM[1]) / stepMeters) * stepMeters;
    const maxN = Math.ceil(Math.max(swM[1], seM[1], nwM[1], neM[1]) / stepMeters) * stepMeters;

    const lineStyle = type === '100k'
      ? { color: '#10b981', weight: 1.5, opacity: 0.55 }
      : (type === '10k'
          ? { color: '#f59e0b', weight: 1, opacity: 0.4, dashArray: '4, 4' }
          : { color: '#ef4444', weight: 1, opacity: 0.35 });

    for (let e = minE; e <= maxE; e += stepMeters) {
      const pS = proj4(utmProj, 'EPSG:4326', [e, minN]);
      const pN = proj4(utmProj, 'EPSG:4326', [e, maxN]);
      L.polyline([[pS[1], pS[0]], [pN[1], pN[0]]], lineStyle).addTo(missionGridLayer);
    }

    for (let n = minN; n <= maxN; n += stepMeters) {
      const pW = proj4(utmProj, 'EPSG:4326', [minE, n]);
      const pE = proj4(utmProj, 'EPSG:4326', [maxE, n]);
      L.polyline([[pW[1], pW[0]], [pE[1], pE[0]]], lineStyle).addTo(missionGridLayer);
    }

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
                }).addTo(missionGridLayer);
              } else {
                const e1 = code.substring(5, 6);
                const n1 = code.substring(10, 11);
                L.marker([centerGeo[1], centerGeo[0]], {
                  icon: L.divIcon({ className: 'grid-label-10k', html: `${sq} ${e1}${n1}`, iconSize: [46, 18], iconAnchor: [23, 9] }),
                  interactive: false
                }).addTo(missionGridLayer);
              }
            } catch (err) {}
          }
        }
      }
    }
  }
}

// A cél 100 km-es blokkjának kiemelése narancssárga téglalappal
function highlightTargetBlock() {
  if (!missionCurrentTarget || !missionMap) return;

  const targetCode = mgrs.forward([missionCurrentTarget.lng, missionCurrentTarget.lat]);
  const zone = parseInt(targetCode.substring(0, 2), 10);
  const utmProj = `+proj=utm +zone=${zone} +datum=WGS84 +units=m +no_defs`;

  const coords = proj4('EPSG:4326', utmProj, [missionCurrentTarget.lng, missionCurrentTarget.lat]);
  const blockE = Math.floor(coords[0] / 100000) * 100000;
  const blockN = Math.floor(coords[1] / 100000) * 100000;

  // A 100 km-es blokk négy sarka
  const sw = proj4(utmProj, 'EPSG:4326', [blockE, blockN]);
  const se = proj4(utmProj, 'EPSG:4326', [blockE + 100000, blockN]);
  const ne = proj4(utmProj, 'EPSG:4326', [blockE + 100000, blockN + 100000]);
  const nw = proj4(utmProj, 'EPSG:4326', [blockE, blockN + 100000]);

  missionBlockRect = L.polygon(
    [[sw[1], sw[0]], [se[1], se[0]], [ne[1], ne[0]], [nw[1], nw[0]]],
    {
      color: '#f59e0b',
      weight: 3,
      fillOpacity: 0.12,
      dashArray: '6, 6'
    }
  ).addTo(missionMap);
}

// Kattintás a térképre
function onMissionMapClick(evt) {
  if (missionAnswered || !missionCurrentTarget) return;

  missionAttempts++;
  const lat = evt.latlng.lat;
  const lng = evt.latlng.lng;

  let userCode;
  try {
    userCode = mgrs.forward([lng, lat]);
  } catch (err) {
    showMissionFeedback(false, 'Hiba', 'Nem sikerült a koordinátát átalakítani.');
    return;
  }

  const targetCode = mgrs.forward([missionCurrentTarget.lng, missionCurrentTarget.lat]);
  const dist = distanceMeters(lat, lng, missionCurrentTarget.lat, missionCurrentTarget.lng);

  if (missionMarker) {
    missionMap.removeLayer(missionMarker);
  }
  missionMarker = L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'mission-click-marker',
      html: '<div style="background: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px #10b981;"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
  }).addTo(missionMap);

  const gzd = userCode.substring(0, 3);
  const sq = userCode.substring(3, 5);
  const rem = userCode.substring(5);
  const half = rem.length / 2;
  const userE = rem.substring(0, half);
  const userN = rem.substring(half);

  const targetSq = targetCode.substring(3, 5);
  const targetRem = targetCode.substring(5);
  const targetHalf = targetRem.length / 2;
  const targetE = targetRem.substring(0, targetHalf);
  const targetN = targetRem.substring(targetHalf);

  // Pontossági összehasonlítás: az első MISSION_ACCURACY jegyet nézzük
  const userEPart = userE.substring(0, MISSION_ACCURACY);
  const userNPart = userN.substring(0, MISSION_ACCURACY);
  const targetEPart = targetE.substring(0, MISSION_ACCURACY);
  const targetNPart = targetN.substring(0, MISSION_ACCURACY);

  const eMatch = userEPart === targetEPart;
  const nMatch = userNPart === targetNPart;
  const sqMatch = sq === targetSq;

  if (sqMatch && eMatch && nMatch) {
    missionAnswered = true;
    missionCorrect++;
    updateMissionStats();
    showMissionFeedback(
      true,
      '✅ Talált!',
      `Ez a(z) <strong>${gzd} ${sq} ${userEPart} ${userNPart}</strong> pont.<br>Kattints a "Következő küldetés" gombra!`
    );
    document.getElementById('btn-mission-next').style.display = 'flex';
  } else {
    const direction = getCompassDirection(missionCurrentTarget.lat, missionCurrentTarget.lng, lat, lng);
    let detail = `A kattintásod: <strong>${gzd} ${sq} ${userEPart} ${userNPart}</strong><br>`;
    if (dist > 1000) {
      detail += `Kb. <strong>${(dist / 1000).toFixed(1)} km</strong>-rel vagy a céltól <strong>${direction}</strong> irányban.`;
    } else {
      detail += `Kb. <strong>${Math.round(dist)} méter</strong>-rel vagy a céltól <strong>${direction}</strong> irányban.`;
    }
    showMissionFeedback(false, '❌ Nem talált', detail);
  }
}

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function getCompassDirection(targetLat, targetLng, userLat, userLng) {
  const dLng = userLng - targetLng;
  const dLat = userLat - targetLat;
  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
  const dirs = ['Észak', 'Északkelet', 'Kelet', 'Délkelet', 'Dél', 'Délnyugat', 'Nyugat', 'Északnyugat'];
  const idx = Math.round((angle + 360) % 360 / 45) % 8;
  return dirs[idx];
}

function showMissionFeedback(success, title, detail) {
  const fb = document.getElementById('mission-feedback');
  fb.style.display = 'block';
  fb.className = 'm-card mission-feedback ' + (success ? 'success' : 'error');
  document.getElementById('mission-feedback-text').innerHTML = title;
  document.getElementById('mission-feedback-detail').innerHTML = detail;
}

function updateMissionStats() {
  document.getElementById('score-correct').innerText = missionCorrect;
  document.getElementById('score-attempts').innerText = missionAttempts;
  const acc = missionAttempts > 0
    ? Math.round(missionCorrect / missionAttempts * 100) + '%'
    : '—';
  document.getElementById('score-accuracy').innerText = acc;
  document.getElementById('mission-stats').innerText = `${missionCorrect} / ${missionAttempts}`;
}

function startNewMission() {
  missionCurrentTarget = MISSION_TARGETS[Math.floor(Math.random() * MISSION_TARGETS.length)];
  missionAnswered = false;

  const nextBtn = document.getElementById('btn-mission-next');
  if (nextBtn) nextBtn.style.display = 'none';
  const fb = document.getElementById('mission-feedback');
  if (fb) fb.style.display = 'none';

  let targetCode;
  try {
    targetCode = mgrs.forward([missionCurrentTarget.lng, missionCurrentTarget.lat]);
  } catch (err) {
    console.error('MGRS hiba:', err);
    return;
  }

  const gzd = targetCode.substring(0, 3);
  const sq = targetCode.substring(3, 5);
  const rem = targetCode.substring(5);
  const half = rem.length / 2;
  const eStr = rem.substring(0, half).substring(0, MISSION_ACCURACY);
  const nStr = rem.substring(half).substring(0, MISSION_ACCURACY);

  const displayCode = `${gzd} ${sq} ${eStr} ${nStr}`;

  document.getElementById('mission-target-code').innerText = displayCode;
  document.getElementById('mission-target-hint').innerHTML =
    `<i class="fa-solid fa-lightbulb"></i><span>${missionCurrentTarget.hint}</span>`;

  if (missionMap) {
    // Először a célzónára mozgatunk (hogy látszódjék a blokk)
    missionMap.setView([47.0, 19.5], 7);

    // Töröljük az előző markert
    if (missionMarker) {
      missionMap.removeLayer(missionMarker);
      missionMarker = null;
    }

    // Kiemeljük a célblokkot (de nem a pontos helyet!)
    if (missionBlockRect) {
      missionMap.removeLayer(missionBlockRect);
      missionBlockRect = null;
    }
    setTimeout(() => {
      drawMissionGrid();
    }, 300);
  }
}

function nextMission() {
  startNewMission();
}

function showMissionHint() {
  if (!missionCurrentTarget || !missionMap) return;

  // A cél környékére mozgatjuk a térképet
  const offsetLat = missionCurrentTarget.lat + (Math.random() - 0.5) * 0.1;
  const offsetLng = missionCurrentTarget.lng + (Math.random() - 0.5) * 0.1;
  missionMap.setView([offsetLat, offsetLng], 10);

  // Kiemeljük a célblokkot
  setTimeout(() => {
    highlightTargetBlock();
  }, 400);

  // Visszajelzés
  showMissionFeedback(
    true,
    '💡 Segítség',
    `A térkép most a cél közelébe mozdult. A narancssárga téglalap a keresett <strong>100 km-es blokk</strong>. A cél: <strong>${missionCurrentTarget.name}</strong>.`
  );
}
