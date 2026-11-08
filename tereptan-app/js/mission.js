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
// A koordináták valós, ismert helyek (Országház, Kékestető, stb.)
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

  // Saját térkép a küldetés fülhöz
  missionMap = L.map('mission-map', {
    zoomControl: true,
    attributionControl: false,
    minZoom: 6,
    maxZoom: 18
  }).setView([47.5, 19.0], 7);

  // Ugyanaz a térkép-szolgáltató, mint a fő térképnél
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
  osm.addTo(missionMap);

  // Kattintás esemény
  missionMap.on('click', onMissionMapClick);

  // Statisztika inicializálása
  updateMissionStats();

  // Első küldetés indítása
  startNewMission();
}

// Kattintás a térképre
function onMissionMapClick(e) {
  if (missionAnswered || !missionCurrentTarget) return;

  missionAttempts++;
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  // Felhasználó MGRS kódja
  let userCode;
  try {
    userCode = mgrs.forward([lng, lat]);
  } catch (err) {
    showMissionFeedback(false, 'Hiba', 'Nem sikerült a koordinátát átalakítani.');
    return;
  }

  // Cél MGRS kódja
  const targetCode = mgrs.forward([missionCurrentTarget.lng, missionCurrentTarget.lat]);

  // Távolság számítása (méterben)
  const dist = distanceMeters(lat, lng, missionCurrentTarget.lat, missionCurrentTarget.lng);

  // A zöld jelölő áthelyezése a kattintás helyére
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

  // Értékelés
  const gzd = userCode.substring(0, 3);
  const sq = userCode.substring(3, 5);
  const rem = userCode.substring(5);
  const half = rem.length / 2;
  const e = rem.substring(0, half);
  const n = rem.substring(half);

  // 100 m-es pontosságú összehasonlítás (a cél 6 jegyű kódja)
  const targetRem = targetCode.substring(5);
  const targetHalf = targetRem.length / 2;
  const targetE = targetRem.substring(0, targetHalf);
  const targetN = targetRem.substring(targetHalf);

  const eMatch = e.substring(0, 3) === targetE.substring(0, 3);
  const nMatch = n.substring(0, 3) === targetN.substring(0, 3);
  const sqMatch = sq === targetCode.substring(3, 5);

  if (sqMatch && eMatch && nMatch) {
    // TALÁLT!
    missionAnswered = true;
    missionCorrect++;
    updateMissionStats();
    showMissionFeedback(
      true,
      '✅ Talált!',
      `Ez a(z) <strong>${gzd} ${sq} ${e.substring(0,3)} ${n.substring(0,3)}</strong> pont.<br>Kattints a "Következő küldetés" gombra!`
    );
    document.getElementById('btn-mission-next').style.display = 'flex';
  } else {
    // NEM TALÁLT
    const direction = getCompassDirection(missionCurrentTarget.lat, missionCurrentTarget.lng, lat, lng);
    let detail = `A kattintásod: <strong>${gzd} ${sq} ${e.substring(0,3)} ${n.substring(0,3)}</strong><br>`;
    if (dist > 1000) {
      detail += `Kb. <strong>${(dist / 1000).toFixed(1)} km</strong>-rel vagy a céltól <strong>${direction}</strong> irányban.`;
    } else {
      detail += `Kb. <strong>${Math.round(dist)} méter</strong>-rel vagy a céltól <strong>${direction}</strong> irányban.`;
    }
    showMissionFeedback(false, '❌ Nem talált', detail);
  }
}

// Két pont távolsága méterben (Haversine)
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

// Irány kiszámítása (É, ÉK, K, ...)
function getCompassDirection(targetLat, targetLng, userLat, userLng) {
  const dLng = userLng - targetLng;
  const dLat = userLat - targetLat;
  const angle = Math.atan2(dLng, dLat) * 180 / Math.PI;
  const dirs = ['Észak', 'Északkelet', 'Kelet', 'Délkelet', 'Dél', 'Délnyugat', 'Nyugat', 'Északnyugat'];
  const idx = Math.round((angle + 360) % 360 / 45) % 8;
  return dirs[idx];
}

// Visszajelzés megjelenítése
function showMissionFeedback(success, title, detail) {
  const fb = document.getElementById('mission-feedback');
  fb.style.display = 'block';
  fb.className = 'm-card mission-feedback ' + (success ? 'success' : 'error');
  document.getElementById('mission-feedback-text').innerHTML = title;
  document.getElementById('mission-feedback-detail').innerHTML = detail;
}

// Statisztika frissítése
function updateMissionStats() {
  document.getElementById('score-correct').innerText = missionCorrect;
  document.getElementById('score-attempts').innerText = missionAttempts;
  const acc = missionAttempts > 0
    ? Math.round(missionCorrect / missionAttempts * 100) + '%'
    : '—';
  document.getElementById('score-accuracy').innerText = acc;
  document.getElementById('mission-stats').innerText = `${missionCorrect} / ${missionAttempts}`;
}

// Új küldetés indítása
function startNewMission() {
  // Véletlenszerű célpont
  missionCurrentTarget = MISSION_TARGETS[Math.floor(Math.random() * MISSION_TARGETS.length)];

  // Állapot visszaállítása
  missionAnswered = false;
  document.getElementById('btn-mission-next').style.display = 'none';
  document.getElementById('mission-feedback').style.display = 'none';

  // Cél MGRS kódja (100 m-es pontossággal)
  let targetCode;
  try {
    targetCode = mgrs.forward([missionCurrentTarget.lng, missionCurrentTarget.lat]);
  } catch (err) {
    console.error('MGRS hiba:', err);
    return;
  }

  // 100 m-es pontosságú kód: zóna (3) + blokk (2) + 3+3 jegy
  const gzd = targetCode.substring(0, 3);
  const sq = targetCode.substring(3, 5);
  const rem = targetCode.substring(5);
  const half = rem.length / 2;
  const e = rem.substring(0, half).substring(0, 3);
  const n = rem.substring(half).substring(0, 3);

  const displayCode = `${gzd} ${sq} ${e} ${n}`;

  // Cél kódjának megjelenítése
  document.getElementById('mission-target-code').innerText = displayCode;
  document.getElementById('mission-target-hint').innerHTML =
    `<i class="fa-solid fa-lightbulb"></i><span>${missionCurrentTarget.hint}</span>`;

  // Térkép mozgatása egy áttekintő nézetbe (nem a célra, hogy ne legyen túl könnyű)
  missionMap.setView([47.5, 19.0], 7);

  // Ha volt jelölő, eltávolítjuk
  if (missionMarker) {
    missionMap.removeLayer(missionMarker);
    missionMarker = null;
  }
}

// Segítség gomb
function showMissionHint() {
  if (!missionCurrentTarget) return;
  // A cél környékére mozgatjuk a térképet (de nem pontosan a célra)
  const offsetLat = missionCurrentTarget.lat + (Math.random() - 0.5) * 0.1;
  const offsetLng = missionCurrentTarget.lng + (Math.random() - 0.5) * 0.1;
  missionMap.setView([offsetLat, offsetLng], 11);
  showMissionFeedback(
    true,
    '💡 Segítség',
    `A térkép most a cél közelébe mozdult. A cél: <strong>${missionCurrentTarget.name}</strong>.`
  );
}