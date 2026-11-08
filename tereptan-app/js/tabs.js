/**
 * Fülváltás és felületi szinkronizáció
 * (A HTML onclick kezeli a kattintásokat, itt csak a switchTab logika van.)
 */
function switchTab(tabId, index) {
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.d-nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');

  const mobileBtns = document.querySelectorAll('.nav-item');
  if (mobileBtns[index]) mobileBtns[index].classList.add('active');

  const desktopBtns = document.querySelectorAll('.d-nav-btn');
  if (desktopBtns[index]) desktopBtns[index].classList.add('active');

  if (tabId === 'tab-map') {
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        updateDynamicGrid();
      }
    }, 200);
  }
  if (tabId === 'tab-reticle') setTimeout(drawReticleView, 100);
  if (tabId === 'tab-theory') setTimeout(drawProjectionView, 100);

  // ÚJ: Küldetés térkép - lazy init + újraméretezés
  if (tabId === 'tab-mission') {
    setTimeout(() => {
      if (!missionMap && typeof initMissionModule === 'function') {
        initMissionModule();
      }
      if (missionMap) {
        missionMap.invalidateSize();
      }
    }, 250);
  }
}
