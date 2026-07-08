/**
 * performance.js
 * Performance Optimization System
 * NON-DESTRUCTIVE — monitors, throttles, and optimizes existing systems
 */

;(function PerformanceSystem() {
  'use strict';

  /* ══════════════════════════════════════════
     1. FPS MONITOR & ADAPTIVE QUALITY
     Drops particle density if FPS falls below threshold
  ══════════════════════════════════════════ */
  const FPSGuard = (() => {
    let frames    = 0;
    let lastTime  = performance.now();
    let fps       = 60;
    let degraded  = false;
    const TARGET  = 45; // minimum acceptable FPS

    function measure() {
      frames++;
      const now     = performance.now();
      const elapsed = now - lastTime;

      if (elapsed >= 1000) {
        fps      = Math.round((frames * 1000) / elapsed);
        frames   = 0;
        lastTime = now;

        if (fps < TARGET && !degraded) {
          degraded = true;
          applyLowQuality();
        } else if (fps >= TARGET + 10 && degraded) {
          degraded = false;
          removeLowQuality();
        }
      }
      requestAnimationFrame(measure);
    }

    function applyLowQuality() {
      /* Inject a class for CSS to reduce expensive effects */
      document.body.classList.add('perf-low');

      /* Disable grain overlay (expensive on some GPUs) */
      const grain = document.createElement('style');
      grain.id = '__perf-low-style';
      grain.textContent = `
        body::before { display: none !important; }
        .orb { filter: blur(40px) !important; }
        canvas { image-rendering: pixelated; }
        .hero-name { text-shadow: none !important; }
        .final-heart { filter: none !important; }
        #canvas-ambient { display: none !important; }
      `;
      document.head.appendChild(grain);
      console.log('[Performance] ⚠ Low FPS detected — quality reduced');
    }

    function removeLowQuality() {
      document.body.classList.remove('perf-low');
      const el = document.getElementById('__perf-low-style');
      if (el) el.remove();
      console.log('[Performance] ✓ FPS recovered — quality restored');
    }

    function init() {
      requestAnimationFrame(measure);
    }

    function getFPS() { return fps; }

    return { init, getFPS };
  })();

  /* ══════════════════════════════════════════
     2. VISIBILITY PAUSE
     Pause all animations when tab is hidden
  ══════════════════════════════════════════ */
  const VisibilityPause = (() => {
    let wasPaused = false;

    function init() {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          wasPaused = true;

          /* Pause GSAP */
          if (typeof gsap !== 'undefined') {
            gsap.globalTimeline.pause();
          }

          /* Pause Three.js ambient */
          if (window.ThreeBackground) {
            window.ThreeBackground.AmbientCanvas.stop();
          }
        } else {
          /* Resume */
          if (typeof gsap !== 'undefined') {
            gsap.globalTimeline.resume();
          }
          if (window.ThreeBackground) {
            window.ThreeBackground.AmbientCanvas.start();
          }
          wasPaused = false;
        }
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     3. RAF THROTTLER
     Provides a shared, throttled requestAnimationFrame
     so multiple systems don't each spin their own loop
  ══════════════════════════════════════════ */
  const SharedRAF = (() => {
    const callbacks = new Set();
    let   started   = false;
    let   rafId     = null;

    function loop() {
      rafId = requestAnimationFrame(loop);
      callbacks.forEach(cb => cb());
    }

    function add(fn)    { callbacks.add(fn); if (!started) { started = true; loop(); } }
    function remove(fn) { callbacks.delete(fn); if (!callbacks.size) { cancelAnimationFrame(rafId); started = false; } }

    return { add, remove };
  })();

  /* ══════════════════════════════════════════
     4. IMAGE LAZY-LOAD ENHANCE
     Adds intersection observer for gallery & message images
     with a fade-in reveal instead of abrupt load
  ══════════════════════════════════════════ */
  const LazyReveal = (() => {
    function init() {
      const images = document.querySelectorAll(
        '.gallery-img-wrap img, .msg-img-wrap img'
      );

      if (!images.length || !('IntersectionObserver' in window)) return;

      /* Set initially invisible */
      images.forEach(img => {
        if (!img.complete) {
          img.style.opacity = '0';
          img.style.transition = 'opacity 0.6s ease';
        }
      });

      const obs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const img = entry.target;

          const reveal = () => {
            img.style.opacity = '1';
            obs.unobserve(img);
          };

          if (img.complete) {
            reveal();
          } else {
            img.addEventListener('load', reveal, { once: true });
            img.addEventListener('error', reveal, { once: true });
          }
        });
      }, { threshold: 0.1, rootMargin: '50px' });

      images.forEach(img => obs.observe(img));
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     5. WILL-CHANGE MANAGER
     Sets/clears will-change to avoid memory waste
  ══════════════════════════════════════════ */
  const WillChange = (() => {
    /* Set will-change only on entering scene, clear on leaving */
    const ANIMATED_SELECTORS = [
      '.hero-name', '.hero-cta', '.final-title', '.final-heart',
      '.gallery-item', '.msg-card', '.story-panel',
    ];

    function set() {
      ANIMATED_SELECTORS.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.style.willChange = 'transform, opacity';
        });
      });
    }

    function clear() {
      ANIMATED_SELECTORS.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          el.style.willChange = 'auto';
        });
      });
    }

    function init() {
      /* Set on load */
      set();

      /* Clear when page is about to be left */
      window.addEventListener('pagehide', clear);

      /* Also clear after animations settle */
      setTimeout(clear, 5000);

      /* Re-set when scene changes */
      document.addEventListener('scenechange', () => {
        set();
        setTimeout(clear, 2000);
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     6. PRELOAD CRITICAL FONTS
  ══════════════════════════════════════════ */
  const FontPreload = (() => {
    function init() {
      /* Force browser to preload fonts used by GSAP text animations */
      const probe = document.createElement('div');
      Object.assign(probe.style, {
        fontFamily: '"Cinzel", serif',
        position:   'fixed',
        opacity:    '0',
        top:        '-999px',
        fontSize:   '0px',
      });
      probe.textContent = 'ABCDEF';
      document.body.appendChild(probe);
      setTimeout(() => probe.remove(), 500);
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     7. SCROLL JANK PREVENTION
     Passive event listeners for touch events
  ══════════════════════════════════════════ */
  const ScrollOptimize = (() => {
    function init() {
      /* Ensure gallery scene allows overflow scroll without jank */
      const gallery = document.getElementById('scene-3');
      if (gallery) {
        gallery.style.overscrollBehavior = 'contain';
        gallery.style.webkitOverflowScrolling = 'touch';
      }

      /* Message scene */
      const message = document.getElementById('scene-4');
      if (message) {
        message.style.overscrollBehavior = 'contain';
      }
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     8. DEVICE CAPABILITY DETECTION
  ══════════════════════════════════════════ */
  const DeviceDetect = (() => {
    function init() {
      const isLowEnd = (
        navigator.hardwareConcurrency <= 2 ||
        navigator.deviceMemory <= 2
      );
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      const isHiDPI = devicePixelRatio > 1.5;

      document.body.dataset.lowEnd = isLowEnd;
      document.body.dataset.touch  = isTouch;
      document.body.dataset.hidpi  = isHiDPI;

      if (isLowEnd) {
        document.body.classList.add('device-low-end');
        /* Inject minimal style */
        const s = document.createElement('style');
        s.textContent = `
          .device-low-end body::before { opacity: 0.01 !important; }
          .device-low-end .orb { opacity: 0.2 !important; }
          .device-low-end #canvas-ambient { display: none !important; }
        `;
        document.head.appendChild(s);
      }

      return { isLowEnd, isTouch, isHiDPI };
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     9. BOOT
  ══════════════════════════════════════════ */
  function boot() {
    DeviceDetect.init();
    FontPreload.init();
    LazyReveal.init();
    WillChange.init();
    ScrollOptimize.init();
    VisibilityPause.init();

    /* FPS monitoring — start after 3s to let page settle */
    setTimeout(() => FPSGuard.init(), 3000);

    /* Expose for debugging */
    window.PerformanceSystem = {
      SharedRAF,
      getFPS:   FPSGuard.getFPS,
    };

    console.log('[PerformanceSystem] ✓ Loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
