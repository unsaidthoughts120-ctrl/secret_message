/**
 * preloader.js
 * Image Preloader — loads all images before the experience begins
 * Integrates with State and the loading overlay in index.html
 * Reports progress via events and updates the loading UI
 */

;(function Preloader() {
  'use strict';

  /* ── Image sources to preload ── */
  /* These mirror the src values in index.html — update when you add photos */
  const IMAGE_SRCS = [
    'assets/img1.jpg',
    'assets/img2.jpg',
    'assets/img3.jpg',
    'assets/img4.jpg',
    'assets/images/msg1.jpg',
    'assets/images/msg2.jpg',
    'assets/images/msg3.jpg',
  ];

  /* ══════════════════════════════════════
     CORE LOADER
  ══════════════════════════════════════ */
  const ImageLoader = (() => {
    function loadOne(src) {
      return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve({ src, ok: true });
        img.onerror = () => resolve({ src, ok: false }); // never reject — graceful
        img.src = src;
      });
    }

    async function loadAll(srcs, onProgress) {
      let loaded = 0;
      const total = srcs.length;

      const results = await Promise.all(
        srcs.map(src =>
          loadOne(src).then(result => {
            loaded++;
            const pct = Math.round((loaded / total) * 100);
            if (typeof onProgress === 'function') onProgress(pct, result);
            return result;
          })
        )
      );

      const failed = results.filter(r => !r.ok).map(r => r.src);
      if (failed.length) {
        console.warn('[Preloader] Failed to load:', failed);
      }

      return results;
    }

    return { loadAll };
  })();

  /* ══════════════════════════════════════
     LOADING OVERLAY UI
  ══════════════════════════════════════ */
  const LoadingUI = (() => {
    const el = {
      overlay:     null,
      bar:         null,
      percentage:  null,
      label:       null,
    };

    function init() {
      el.overlay    = document.getElementById('loading-overlay');
      el.bar        = document.getElementById('loading-bar-fill');
      el.percentage = document.getElementById('loading-percentage');
      el.label      = document.getElementById('loading-label');

      if (!el.overlay) {
        console.warn('[Preloader] Loading overlay not found in DOM');
      }
    }

    function setProgress(pct) {
      if (el.bar)        el.bar.style.width = pct + '%';
      if (el.percentage) el.percentage.textContent = pct + '%';
    }

    function setLabel(text) {
      if (el.label) el.label.textContent = text;
    }

    function hide(onDone) {
      if (!el.overlay) { if (onDone) onDone(); return; }

      const cfg = window.CONFIG || {};
      const dur = (cfg.TIMING && cfg.TIMING.loaderFadeOut) || 0.8;

      if (typeof gsap !== 'undefined') {
        gsap.to(el.overlay, {
          opacity: 0,
          duration: dur,
          ease: 'power2.inOut',
          onComplete: () => {
            el.overlay.style.display = 'none';
            if (window.State && window.State.set) window.State.set('isLoaded', true);
            if (onDone) onDone();
          }
        });
      } else {
        el.overlay.style.transition = `opacity ${dur}s ease`;
        el.overlay.style.opacity = '0';
        setTimeout(() => {
          el.overlay.style.display = 'none';
          if (window.State) window.State.set('isLoaded', true);
          if (onDone) onDone();
        }, dur * 1000);
      }
    }

    return { init, setProgress, setLabel, hide };
  })();

  /* ══════════════════════════════════════
     MAIN RUN
  ══════════════════════════════════════ */
  async function run(onReady) {
    LoadingUI.init();
    LoadingUI.setProgress(0);
    LoadingUI.setLabel('Preparing your evening…');

    const cfg = window.CONFIG || {};
    const minShow = (cfg.TIMING && cfg.TIMING.loaderMinShow) || 800;
    const startTime = Date.now();

    // Load images — update UI on each image loaded
    await ImageLoader.loadAll(IMAGE_SRCS, (pct, result) => {
      LoadingUI.setProgress(pct);
    });

    LoadingUI.setProgress(100);
    LoadingUI.setLabel('All set…');

    // Enforce minimum visible time (prevents jarring flash-and-gone)
    const elapsed = Date.now() - startTime;
    const wait    = Math.max(0, minShow - elapsed);

    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('preloadcomplete', { bubbles: false }));
      LoadingUI.hide(onReady);
    }, wait);
  }

  window.Preloader = { run };
  console.log('[Preloader] ✓ Loaded');

})();
