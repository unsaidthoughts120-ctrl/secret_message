/**
 * scene-manager.js
 * Scene State Manager — tracks, enhances, and broadcasts scene transitions
 * NON-DESTRUCTIVE — reads state from DOM, never overwrites App internals
 * Scene order: 0=intro, 1=countdown, 2=hero, 3=gallery, 4=message, 5=finale
 */

;(function SceneManager() {
  'use strict';

  /* ══════════════════════════════════════════
     1. STATE TRACKER
  ══════════════════════════════════════════ */
  const State = (() => {
    const NAMES = ['intro', 'countdown', 'hero', 'gallery', 'message', 'finale'];
    let _current  = 0;
    let _previous = -1;

    function emit(from, to) {
      const detail = {
        from,
        to,
        fromName:  NAMES[from] || 'unknown',
        toName:    NAMES[to]   || 'unknown',
        direction: to > from ? 'forward' : 'backward',
      };
      document.dispatchEvent(new CustomEvent('scenechange', { detail, bubbles: false }));
    }

    function findActive() {
      const scenes = document.querySelectorAll('.scene');
      let idx = 0;
      scenes.forEach((s, i) => { if (s.classList.contains('active')) idx = i; });
      return idx;
    }

    function init() {
      _current = findActive();

      const scenes = document.querySelectorAll('.scene');
      scenes.forEach((scene, i) => {
        const mo = new MutationObserver(() => {
          if (scene.classList.contains('active') && _current !== i) {
            _previous = _current;
            _current  = i;
            emit(_previous, _current);
          }
        });
        mo.observe(scene, { attributes: true, attributeFilter: ['class'] });
      });
    }

    function getCurrent()  { return _current; }
    function getPrevious() { return _previous; }
    function getName(i)    { return NAMES[i] || 'unknown'; }

    return { init, getCurrent, getPrevious, getName };
  })();

  /* ══════════════════════════════════════════
     2. AMBIENT BODY-CLASS SYNC
  ══════════════════════════════════════════ */
  const BodyClassSync = (() => {
    function sync(to) {
      document.body.classList.forEach(cls => {
        if (cls.startsWith('scene-')) document.body.classList.remove(cls);
      });
      document.body.classList.add('scene-' + State.getName(to));
    }

    function init() {
      sync(State.getCurrent());
      document.addEventListener('scenechange', e => sync(e.detail.to));
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     3. TRANSITION OVERLAY (luxury wipe feel)
  ══════════════════════════════════════════ */
  const TransitionOverlay = (() => {
    let overlay = null;

    function ensure() {
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = '__transition-overlay';
      Object.assign(overlay.style, {
        position:      'fixed',
        inset:         '0',
        zIndex:        '150',          /* below continue buttons (z:200) */
        pointerEvents: 'none',         /* never blocks clicks */
        opacity:       '0',
        background:    'linear-gradient(135deg, rgba(4,3,10,0.95) 0%, rgba(17,15,30,0.95) 100%)',
        backdropFilter:'blur(2px)',
      });
      document.body.appendChild(overlay);
      return overlay;
    }

    function flash() {
      if (typeof gsap === 'undefined') return;
      const el = ensure();
      gsap.timeline()
        .to(el, { opacity: 0.3, duration: 0.2, ease: 'power2.in' })
        .to(el, { opacity: 0,   duration: 0.4, ease: 'power2.out' });
    }

    function init() {
      ensure();
      document.addEventListener('scenechange', () => flash());
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     4. KEYBOARD HINT
  ══════════════════════════════════════════ */
  const KeyHint = (() => {
    let el  = null;
    let tid = null;

    // Show hint on hero and gallery scenes
    const SHOW_ON = new Set([2, 3, 4]);

    function ensure() {
      if (el) return el;
      el = document.createElement('div');
      el.id = '__key-hint';
      Object.assign(el.style, {
        position:      'fixed',
        bottom:        '1.6rem',
        left:          '50%',
        transform:     'translateX(-50%)',
        fontFamily:    'var(--f-display, serif)',
        fontSize:      '0.48rem',
        letterSpacing: '0.45em',
        textTransform: 'uppercase',
        color:         'rgba(212,175,110,0.35)',
        zIndex:        '80',
        pointerEvents: 'none',
        opacity:       '0',
        whiteSpace:    'nowrap',
        transition:    'opacity 0.5s ease',
      });
      document.body.appendChild(el);
      return el;
    }

    function show(text) {
      const hint = ensure();
      hint.textContent = text;
      hint.style.opacity = '1';
      clearTimeout(tid);
      tid = setTimeout(() => { hint.style.opacity = '0'; }, 3500);
    }

    function init() {
      if (window.matchMedia('(pointer: coarse)').matches) return;
      document.addEventListener('scenechange', e => {
        if (SHOW_ON.has(e.detail.to)) {
          setTimeout(() => show('↑ ↓ or → ← to navigate'), 1200);
        }
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     5. SCENE TIMING METRICS
  ══════════════════════════════════════════ */
  const Metrics = (() => {
    const times = {};
    let enter = Date.now();
    let scene = 0;

    function record(from) {
      const duration = Date.now() - enter;
      times[from]    = (times[from] || 0) + duration;
      enter = Date.now();
    }

    function init() {
      document.addEventListener('scenechange', e => record(e.detail.from));
    }

    function getReport() {
      const current = State.getCurrent();
      const now     = { ...times };
      now[current]  = (now[current] || 0) + (Date.now() - enter);
      return now;
    }

    return { init, getReport };
  })();

  /* ══════════════════════════════════════════
     6. BOOT
  ══════════════════════════════════════════ */
  function boot() {
    State.init();
    BodyClassSync.init();
    TransitionOverlay.init();
    KeyHint.init();
    Metrics.init();

    window.SceneManager = {
      State,
      Metrics,
      getCurrentScene: State.getCurrent,
    };

    console.log('[SceneManager] ✓ Loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
