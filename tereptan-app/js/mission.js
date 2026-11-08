/**
 * Küldetés mód
 * A diák kap egy MGRS koordinátát, és a térképre kell kattintania a helyes négyzetre.
 */

let missionMap = null;
let missionMarker = null;
let missionCurrentTarget = null;
let missionCorrect = 0;
let missionAttempts = 0;
let missionAnswered = false;

// Előre definiált magyarországi célpontok (MGRS kód + szélesség/hosszúság)
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
  
  // Ha már létezik, ne hozzuk létre újra
  if (missionMap) {
    missionMap.invalidateSize();
    return;
  }

  missionMap = L.map('mission-map', {
    zoomControl: true,
    attributionControl: false,
    minZoom: 6,
    maxZoom: 18
  }).setView([47.5, 19.0], 7);

  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
  osm.addTo(missionMap);

  missionMap.on('click', onMissionMapClick);

  updateMissionStats();
  startNewMission();
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

  // Zöld jelölő a kattintás helyére
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

  // Felhasználó MGRS komponensei (JAVÍTOTT változónevek)
  const gzd = userCode.substring(0, 3);
  const sq = userCode.substring(3, 5);
  const rem = userCode.substring(5);
  const half = rem.length / 2;
  const userE = rem.substring(0, half);
  const userN = rem.substring(half);

  // Cél MGRS komponensei
  const targetGzd = targetCode.substring(0, 3);
  const targetSq = targetCode.substring(3, 5);
  const targetRem = targetCode.substring(5);
  const targetHalf = targetRem.length / 2;
  const targetE = targetRem.substring(0, targetHalf);
  const targetN = targetRem.substring(targetHalf);

  const eMatch = userE.substring(0, 3) === targetE.substring(0, 3);
  const nMatch = userN.substring(0, 3) === targetN.substring(0, 3);
  const sqMatch = sq === targetSq;

  if (sqMatch && eMatch && nMatch) {
    missionAnswered = true;
    missionCorrect++;
    updateMissionStats();
    showMissionFeedback(
      true,
      '✅ Talált!',
      `Ez a(z) <strong>${gzd} ${sq} ${userE.substring(0,3)} ${userN.substring(0,3)}</strong> pont.<br>Kattints a "Következő küldetés" gombra!`
    );
    document.getElementById('btn-mission-next').style.display = 'flex';
  } else {
    const direction = getCompassDirection(missionCurrentTarget.lat, missionCurrentTarget.lng, lat, lng);
    let detail = `A kattintásod: <strong>${gzd} ${sq} ${userE.substring(0,3)} ${userN.substring(0,3)}</strong><br>`;
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
  const eStr = rem.substring(0, half).substring(0, 3);
  const nStr = rem.substring(half).substring(0, 3);

  const displayCode = `${gzd} ${sq} ${eStr} ${nStr}`;

  document.getElementById('mission-target-code').innerText = displayCode;
  document.getElementById('mission-target-hint').innerHTML =
    `<i class="fa-solid fa-lightbulb"></i><span>${missionCurrentTarget.hint}</span>`;

  if (missionMap) {
    missionMap.setView([47.5, 19.0], 7);
    if (missionMarker) {
      missionMap.removeLayer(missionMarker);
      missionMarker = null;
    }
  }
}

function nextMission() {
  startNewMission();
}

function showMissionHint() {
  if (!missionCurrentTarget) return;
  if (!missionMap) return;
  const offsetLat = missionCurrentTarget.lat + (Math.random() - 0.5) * 0.1;
  const offsetLng = missionCurrentTarget.lng + (Math.random() - 0.5) * 0.1;
  missionMap.setView([offsetLat, offsetLng], 11);
  showMissionFeedback(
    true,
    '💡 Segítség',
    `A térkép most a cél közelébe mozdult. A cél: <strong>${missionCurrentTarget.name}</strong>.`
  );
}
