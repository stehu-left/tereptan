/**
 * Fülváltás és felületi szinkronizáció
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
}

// Eseménykezelők hozzárendelése a HTML gombokhoz
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      const index = parseInt(this.getAttribute('data-index'), 10);
      switchTab(tabId, index);
    });
  });
});
