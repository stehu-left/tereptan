/**
 * Kartográfiai Vetületelméleti Animációs Szemléltető Modul
 */
let pCanvas, pCtx;
let animState = 'sphere';

function initTheoryModule() {
  pCanvas = document.getElementById('proj-canvas');
  pCtx = pCanvas.getContext('2d');
  drawProjectionView();
}

function setAnimState(st, btnEl) {
  animState = st;
  document.querySelectorAll('.btn-anim-m').forEach(b => b.classList.remove('active'));
  if (btnEl) btnEl.classList.add('active');
  const d = document.getElementById('anim-desc');
  if (st === 'sphere') d.innerText = '1. Gömbfelület: A Föld 3D-s gömb, a meridiánok a sarkoknál összefutnak.';
  if (st === 'flatten') d.innerText = '2. Narancshéj: Ha síkba terítjük ki egyben, a sarkoknál szétszakad a felület.';
  if (st === 'cylinder') d.innerText = '3. Henger: Egy hengerpalástot fektetünk egyetlen meridián érintőjére.';
  if (st === 'zones') d.innerText = '4. 60 UTM Zóna: 6 fokonként forgatva 60 darab torzulásmentes síkszeletet kapunk.';
  drawProjectionView();
}

function drawProjectionView() {
  if (!pCanvas || !pCtx) return;
  const w = pCanvas.width, h = pCanvas.height, cx = w/2, cy = h/2;
  pCtx.clearRect(0, 0, w, h);

  if (animState === 'sphere') {
    pCtx.strokeStyle = '#38bdf8'; 
    pCtx.lineWidth = 2;
    pCtx.beginPath(); 
    pCtx.arc(cx, cy, 75, 0, Math.PI*2); 
    pCtx.stroke();
    pCtx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    pCtx.strokeRect(cx - 50, cy - 50, 100, 100);
  } else if (animState === 'flatten') {
    pCtx.strokeStyle = '#fbbf24'; 
    pCtx.fillStyle = 'rgba(251, 191, 36, 0.15)';
    for (let i = -2; i <= 2; i++) {
      pCtx.beginPath();
      pCtx.moveTo(cx + i*40, cy - 70);
      pCtx.quadraticCurveTo(cx + i*40 + 20, cy, cx + i*40, cy + 70);
      pCtx.quadraticCurveTo(cx + i*40 - 20, cy, cx + i*40, cy - 70);
      pCtx.fill(); 
      pCtx.stroke();
    }
  } else if (animState === 'cylinder') {
    pCtx.strokeStyle = '#10b981'; 
    pCtx.strokeRect(cx - 50, cy - 80, 100, 160);
    pCtx.strokeStyle = '#38bdf8';
    pCtx.beginPath(); 
    pCtx.arc(cx, cy, 50, 0, Math.PI*2); 
    pCtx.stroke();
  } else if (animState === 'zones') {
    pCtx.strokeStyle = '#475569';
    for (let i = 0; i < 15; i++) pCtx.strokeRect(i * (w/15), 30, w/15, h - 60);
    pCtx.fillStyle = 'rgba(0, 229, 255, 0.3)';
    pCtx.fillRect(7 * (w/15), 30, 2 * (w/15), h - 60);
  }
}