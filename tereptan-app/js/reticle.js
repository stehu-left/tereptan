/**
 * Vonás / Mil Távcső és Távolságbecslő Szimulátor Modul
 */
let reticleCanvas, reticleCtx;
let activeAngleSystem = 'NATO'; // 'NATO' (6400) vagy 'WARSAW' (6000)
let currentTargetState = { type: 'truck', h: 2.5, name: 'Teherautó' };
let currentSimulatedDist = 500;
let reticleTargetOffset = { x: 0, y: 0 };
let isReticleDragging = false;
let reticleDragStart = { x: 0, y: 0 };

function initReticleModule() {
  reticleCanvas = document.getElementById('reticle-canvas');
  reticleCtx = reticleCanvas.getContext('2d');

  reticleCanvas.addEventListener('touchstart', (e) => startReticleDrag(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  window.addEventListener('touchmove', (e) => { 
    if(isReticleDragging) moveReticleDrag(e.touches[0].clientX, e.touches[0].clientY); 
  }, { passive: true });
  window.addEventListener('touchend', () => isReticleDragging = false);

  reticleCanvas.addEventListener('mousedown', (e) => startReticleDrag(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => { 
    if(isReticleDragging) moveReticleDrag(e.clientX, e.clientY); 
  });
  window.addEventListener('mouseup', () => isReticleDragging = false);

  drawReticleView();
}

function drawReticleView() {
  if (!reticleCanvas || !reticleCtx) return;
  const w = reticleCanvas.width, h = reticleCanvas.height;
  const cx = w / 2, cy = h / 2;
  reticleCtx.clearRect(0, 0, w, h);

  const g = reticleCtx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0f172a'); 
  g.addColorStop(0.65, '#1e293b'); 
  g.addColorStop(0.66, '#141e17'); 
  g.addColorStop(1, '#080d09');
  reticleCtx.fillStyle = g; 
  reticleCtx.fillRect(0, 0, w, h);

  const ppm = CONFIG.PIXELS_PER_MIL;
  const rad = currentTargetState.h / currentSimulatedDist;
  const mils = activeAngleSystem === 'NATO' 
    ? (rad * (6400 / (2 * Math.PI))) 
    : (rad * (6000 / (2 * Math.PI)));
  const pxH = mils * ppm;
  const ratio = CONFIG.TARGET_PRESETS[currentTargetState.type]?.ratio || 1.0;
  const pxW = pxH * ratio;

  const tx = cx + reticleTargetOffset.x;
  const ty = cy + reticleTargetOffset.y;

  reticleCtx.fillStyle = 'rgba(56, 189, 248, 0.3)'; 
  reticleCtx.strokeStyle = '#38bdf8'; 
  reticleCtx.lineWidth = 2;

  if (currentTargetState.type === 'soldier') {
    reticleCtx.beginPath();
    reticleCtx.arc(tx, ty - pxH + pxH*0.15, pxH*0.15, 0, Math.PI*2);
    reticleCtx.rect(tx - pxW/2, ty - pxH + pxH*0.3, pxW, pxH*0.7);
    reticleCtx.fill(); 
    reticleCtx.stroke();
  } else {
    reticleCtx.beginPath();
    reticleCtx.rect(tx - pxW/2, ty - pxH, pxW, pxH);
    reticleCtx.fill(); 
    reticleCtx.stroke();
  }

  reticleCtx.strokeStyle = '#ef4444'; 
  reticleCtx.fillStyle = '#ef4444'; 
  reticleCtx.lineWidth = 1.5;
  reticleCtx.font = '12px JetBrains Mono'; 
  reticleCtx.textAlign = 'center'; 
  reticleCtx.textBaseline = 'middle';

  reticleCtx.beginPath();
  reticleCtx.moveTo(cx, 0); reticleCtx.lineTo(cx, h);
  reticleCtx.moveTo(0, cy); reticleCtx.lineTo(w, cy);
  reticleCtx.stroke();

  for (let i = -16; i <= 16; i++) {
    if (i === 0) continue;
    const d = i * ppm;
    const isM = (i % 5 === 0);
    const l = isM ? 14 : 7;

    reticleCtx.beginPath();
    reticleCtx.moveTo(cx - l/2, cy - d); reticleCtx.lineTo(cx + l/2, cy - d);
    reticleCtx.moveTo(cx + d, cy - l/2); reticleCtx.lineTo(cx + d, cy + l/2);
    reticleCtx.stroke();

    if (isM) {
      reticleCtx.fillText(Math.abs(i), cx + 18, cy - d);
      reticleCtx.fillText(Math.abs(i), cx + d, cy + 18);
    }
  }

  reticleCtx.beginPath();
  reticleCtx.arc(cx, cy, cx - 4, 0, Math.PI * 2);
  reticleCtx.strokeStyle = '#05080c'; 
  reticleCtx.lineWidth = 16; 
  reticleCtx.stroke();

  document.getElementById('live-calc').innerText = 
    `D = (${currentTargetState.h}m × 1000) / ${mils.toFixed(1)}${activeAngleSystem === 'NATO' ? 'mil' : 'v'} = ${currentSimulatedDist} m`;
}

function setTarget(t, h, name, btnEl) {
  currentTargetState = { type: t, h, name };
  document.querySelectorAll('.btn-target-m').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  document.getElementById('target-info-tag').innerText = `M = ${h} m`;
  drawReticleView();
}

function setAngleSystem(sys) {
  activeAngleSystem = sys;
  document.getElementById('btn-sys-nato').classList.toggle('active', sys === 'NATO');
  document.getElementById('btn-sys-warsaw').classList.toggle('active', sys === 'WARSAW');
  drawReticleView();
}

function updateDistance(v) {
  currentSimulatedDist = parseInt(v);
  document.getElementById('dist-display').innerText = currentSimulatedDist + ' m';
  drawReticleView();
}

function startReticleDrag(clientX, clientY) {
  isReticleDragging = true;
  const rect = reticleCanvas.getBoundingClientRect();
  reticleDragStart = { 
    x: (clientX - rect.left) * (reticleCanvas.width / rect.width) - reticleTargetOffset.x, 
    y: (clientY - rect.top) * (reticleCanvas.height / rect.height) - reticleTargetOffset.y 
  };
}

function moveReticleDrag(clientX, clientY) {
  if (!isReticleDragging) return;
  const rect = reticleCanvas.getBoundingClientRect();
  reticleTargetOffset.x = (clientX - rect.left) * (reticleCanvas.width / rect.width) - reticleDragStart.x;
  reticleTargetOffset.y = (clientY - rect.top) * (reticleCanvas.height / rect.height) - reticleDragStart.y;
  drawReticleView();
}