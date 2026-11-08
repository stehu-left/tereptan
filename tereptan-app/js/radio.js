/**
 * Rádióforgalom szimuláció és hangszintézis (TTS) modul
 */
let currentRadioUtterance = null;

function updateRadioPanelData(lat, lng, gzd, sq, east, north) {
  const degText = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  document.getElementById('radio-degrees').innerText = degText;
  document.getElementById('deg-chars').innerText = degText.length;
  document.getElementById('deg-time').innerText = `~${Math.ceil(degText.length / 2.5)} s`;

  const latStr = lat.toFixed(5).replace('.', ' egész ').split('').join(' ');
  const lngStr = lng.toFixed(5).replace('.', ' egész ').split('').join(' ');
  document.getElementById('radio-degrees-spoken').innerText = `„${latStr}, ${lngStr}”`;

  const mgrsShort = `${gzd} ${sq} ${east.substring(0,3)} ${north.substring(0,3)}`;
  document.getElementById('radio-mgrs').innerText = mgrsShort;
  document.getElementById('mgrs-chars').innerText = mgrsShort.length;
  document.getElementById('mgrs-time').innerText = `~${Math.ceil(mgrsShort.length / 3)} s`;

  const spokenMgrs = `${gzd.split('').join('-')} ${sq.split('').join('-')}, ${east.substring(0,3).split('').join('-')}, ${north.substring(0,3).split('').join('-')}`;
  document.getElementById('radio-mgrs-spoken').innerText = `„${spokenMgrs}”`;
}

function speakRadioVariant(type) {
  if (!('speechSynthesis' in window)) {
    alert('A böngésződ nem támogatja a felolvasást.');
    return;
  }
  window.speechSynthesis.cancel();

  const degBtn = document.getElementById('btn-listen-deg');
  const mgrsBtn = document.getElementById('btn-listen-mgrs');
  degBtn.classList.remove('playing'); 
  mgrsBtn.classList.remove('playing');

  const textToSpeak = type === 'deg' 
    ? document.getElementById('radio-degrees-spoken').innerText.replace(/[„”]/g, '')
    : document.getElementById('radio-mgrs-spoken').innerText.replace(/[„”]/g, '');

  if (type === 'deg') degBtn.classList.add('playing'); 
  else mgrsBtn.classList.add('playing');

  currentRadioUtterance = new SpeechSynthesisUtterance(textToSpeak);
  currentRadioUtterance.lang = 'hu-HU';
  currentRadioUtterance.rate = 0.9;
  currentRadioUtterance.onend = () => { 
    degBtn.classList.remove('playing'); 
    mgrsBtn.classList.remove('playing'); 
  };
  window.speechSynthesis.speak(currentRadioUtterance);
}