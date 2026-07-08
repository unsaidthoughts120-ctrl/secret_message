/**
 * app-controller.js
 * Master Application Controller
 * Boots all systems in order, connects them, and manages lifecycle.
 * Reads from CONFIG, writes to State, coordinates all modules.
 *
 * Boot order:
 *   1. Preloader (images)
 *   2. script.js App (scene engine — already self-boots)
 *   3. scene-manager.js
 *   4. three-background.js
 *   5. animation-engine.js
 *   6. interaction-engine.js
 *   7. performance.js
 *   8. AppController enhancers (event guards, state sync)
 */

;(function AppController() {
  'use strict';

  /* ── Wait for required globals ── */
  function waitFor(keys, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const check = () => {
        if (keys.every(k => window[k] !== undefined)) return resolve();
        const t = Date.now() - start;
        if (t > timeout) return reject(new Error(`[AppController] Timeout waiting for: ${keys.filter(k => !window[k])}`));
        requestAnimationFrame(check);
      };
      const start = Date.now();
      check();
    });
  }

  /* ══════════════════════════════════════
     1. EVENT GUARD
     Central animation lock that ALL systems can check
  ══════════════════════════════════════ */
  const EventGuard = (() => {
    /* Patch all scene-navigation triggers with the guard */
    function applyToElement(el, eventType, originalHandler) {
      el.addEventListener(eventType, e => {
        if (window.State && State.isLocked()) {
          // Still allow dot navigation through (for power users)
          if (!el.classList.contains('dot')) return;
        }
        originalHandler(e);
      });
    }

    /* Global guard on all nav buttons — non-destructive */
    function init() {
      /* When scene is animating, disable pointer clicks on the body
         but keep pointer-events on active buttons so they feel responsive */
      document.addEventListener('statechange', e => {
        if (e.detail.key === 'isAnimating') {
          const locked = e.detail.newVal;
          // We don't set pointer-events: none on body (too aggressive).
          // Instead, individual goTo() in script.js checks isTransitioning.
          // AppController just syncs the state flag.
        }
      });
    }

    return { init, applyToElement };
  })();

  /* ══════════════════════════════════════
     2. STATE BRIDGE
     Keeps window.State in sync with App's internal state
     by listening to DOM events emitted by script.js and scene-manager.js
  ══════════════════════════════════════ */
  const StateBridge = (() => {
    function init() {
      if (!window.State) return;

      // scene-manager.js dispatches 'scenechange' with {from, to}
      document.addEventListener('scenechange', e => {
        const { from, to } = e.detail;
        State.set('previousScene', from);
        State.set('currentScene',  to);
        // Release animation lock after transition (transition is ~0.7s + 0.35s delay)
        const cfg = window.CONFIG;
        const dur = cfg ? (cfg.TIMING.transition + cfg.TIMING.transitionDelay) * 1000 : 1100;
        setTimeout(() => State.unlock(), dur + 200);
      });

      // Lock state when scene changes start
      document.addEventListener('scenechange', () => State.lock());

      // preloading complete
      document.addEventListener('preloadcomplete', () => {
        State.set('isLoaded', true);
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════
     3. REPLAY COORDINATOR
     Extra cleanup and state reset on replay
  ══════════════════════════════════════ */
  const ReplayCoordinator = (() => {
    function init() {
      /* script.js already has comprehensive replay logic in initReplay().
         We layer on top: reset State, sync systems. */
      const replayBtn = document.getElementById('replay-btn');
      if (!replayBtn) return;

      replayBtn.addEventListener('click', () => {
        if (window.State) {
          State.reset();
        }

        // Give script.js's replay a tiny head-start
        setTimeout(() => {
          // Re-signal other systems that replay happened
          document.dispatchEvent(new CustomEvent('appreplay', { bubbles: false }));
        }, 60);
      }, { capture: true }); // capture=true fires before script.js's bubble handler
    }

    return { init };
  })();

  /* ══════════════════════════════════════
     4. TIMING INTEGRATOR
     Patches GSAP defaults from CONFIG once GSAP is available
  ══════════════════════════════════════ */
  const TimingIntegrator = (() => {
    function init() {
      if (typeof gsap === 'undefined' || !window.CONFIG) return;

      const cfg = window.CONFIG;
      gsap.defaults({
        ease:     cfg.EASE.enter,
        duration: cfg.TIMING.reveal,
      });

      gsap.config({
        nullTargetWarn: false,
        trialWarn:      false,
        force3D:        true,
      });

      console.log('[AppController] GSAP configured from CONFIG');
    }

    return { init };
  })();

  /* ══════════════════════════════════════
     5. RESIZE COORDINATOR
     One shared resize handler — prevents multiple RAF loops
  ══════════════════════════════════════ */
  const ResizeCoordinator = (() => {
    const callbacks = new Set();
    let rafId = null;

    function onResize() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        callbacks.forEach(fn => fn());
      });
    }

    function register(fn) {
      callbacks.add(fn);
    }

    function init() {
      window.addEventListener('resize', onResize, { passive: true });
      window.ResizeCoordinator = { register };
    }

    return { init, register };
  })();

  /* ══════════════════════════════════════
     6. ACCESSIBILITY ENHANCEMENTS
  ══════════════════════════════════════ */
  const A11y = (() => {
    function init() {
      // Respect reduced motion
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (prefersReduced.matches && typeof gsap !== 'undefined') {
        gsap.globalTimeline.timeScale(8); // speedrun animations
        document.body.classList.add('reduced-motion');
        console.log('[AppController] Reduced motion detected — animations fast-forwarded');
      }

      // ARIA live region for scene announcements
      let liveRegion = document.getElementById('scene-announce');
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'scene-announce';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        Object.assign(liveRegion.style, {
          position: 'absolute',
          width: '1px', height: '1px',
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
        });
        document.body.appendChild(liveRegion);
      }

      const cfg = window.CONFIG;
      document.addEventListener('scenechange', e => {
        if (cfg && cfg.SCENES.names[e.detail.to]) {
          liveRegion.textContent = `Now viewing: ${cfg.SCENES.names[e.detail.to]}`;
        }
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════
     7. MOBILE TOUCH POLISH
  ══════════════════════════════════════ */
  const MobileEnhancer = (() => {
    function init() {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      if (!isTouch) return;

      if (window.State) State.set('isTouch', true);

      // Increase tap target sizes on mobile
      const style = document.createElement('style');
      style.id = '__mobile-touch-polish';
      style.textContent = `
        @media (pointer: coarse) {
          .dot { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
          .msgslider-prev, .msgslider-next { min-width: 48px; min-height: 48px; }
          .scene-continue-fixed { padding: 0.85rem 1.6rem; }
          .hero-cta { padding: 1rem 2.4rem; }
        }
      `;
      document.head.appendChild(style);

      // Prevent double-tap zoom on buttons — only suppress zoom, not tap clicks
      document.querySelectorAll('button').forEach(btn => {
        let lastTap = 0;
        btn.addEventListener('touchend', e => {
          const now = Date.now();
          if (now - lastTap < 300) e.preventDefault(); // block double-tap zoom only
          lastTap = now;
        }, { passive: false });
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════
     8. BOOT SEQUENCE
  ══════════════════════════════════════ */
  async function boot() {
    console.log('[AppController] Booting…');

    // Phase 1: Apply timing config as soon as GSAP loads
    TimingIntegrator.init();

    // Phase 2: Init shared utilities
    ResizeCoordinator.init();
    MobileEnhancer.init();
    A11y.init();
    EventGuard.init();

    // Phase 3: Wait for State and CONFIG to be available
    try {
      await waitFor(['State', 'CONFIG'], 3000);
    } catch (err) {
      console.warn('[AppController] State/CONFIG not ready — proceeding without');
    }

    // Phase 4: Wire up State bridge and replay coordinator
    StateBridge.init();
    ReplayCoordinator.init();

    // Phase 5: Mark app as started
    if (window.State) {
      State.set('hasStarted', true);
    }

    // Expose for debugging
    window.AppController = {
      State:     window.State,
      Config:    window.CONFIG,
      ResizeCoordinator,
      debug: () => {
        if (window.State) State.debug();
        if (window.PerformanceSystem) console.log('FPS:', window.PerformanceSystem.getFPS());
      }
    };

    console.log('[AppController] ✓ Fully booted');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();