/**
 * animation-engine.js
 * Master GSAP Animation Engine
 * NON-DESTRUCTIVE — augments existing animations, never conflicts
 * Requires GSAP (already in index.html)
 * Scene order: 0=intro, 1=countdown, 2=hero, 3=gallery, 4=message, 5=finale
 */

;(function AnimationEngine() {
  'use strict';

  if (typeof gsap === 'undefined') {
    console.warn('[AnimationEngine] GSAP not found — retrying…');
    window.addEventListener('load', AnimationEngine);
    return;
  }

  gsap.config({ nullTargetWarn: false, trialWarn: false });
  gsap.defaults({ ease: 'power3.out', duration: 0.85 });

  /* ══════════════════════════════════════════
     1. MAGNETIC BUTTON SYSTEM
  ══════════════════════════════════════════ */
  const MagneticButtons = (() => {
    const STRENGTH = 0.28;

    function attach(el) {
      if (!el || el._magnet) return;
      el._magnet = true;

      const onMove = e => {
        const rect = el.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = (e.clientX - cx) * STRENGTH;
        const dy   = (e.clientY - cy) * STRENGTH;
        gsap.to(el, { x: dx, y: dy, duration: 0.5, ease: 'power2.out' });
      };

      const onLeave = () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      };

      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    }

    function init() {
      document.querySelectorAll(
        '.hero-cta, .replay-btn, .scene-continue-fixed, .photogrid-next'
      ).forEach(attach);

      const observer = new MutationObserver(mutations => {
        mutations.forEach(m => {
          m.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.querySelectorAll) {
              node.querySelectorAll(
                '.hero-cta, .replay-btn, .scene-continue-fixed, .photogrid-next'
              ).forEach(attach);
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     2. STAGGER REVEAL SYSTEM
  ══════════════════════════════════════════ */
  const StaggerReveal = (() => {
    function reveal(selector, options = {}) {
      const els = document.querySelectorAll(selector);
      if (!els.length) return;

      const {
        from     = { opacity: 0, y: 32, scale: 0.97 },
        to       = { opacity: 1, y: 0,  scale: 1 },
        stagger  = 0.1,
        delay    = 0,
        ease     = 'power3.out',
        duration = 0.8,
      } = options;

      return gsap.fromTo(els, from, {
        ...to, stagger, delay, ease, duration,
        clearProps: 'transform'
      });
    }

    function messageReveal() {
      const cards = document.querySelectorAll('.msg-card');
      cards.forEach((card, i) => {
        gsap.fromTo(card,
          { opacity: 0, y: 30, scale: 0.94 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: 0.85,
            delay: 0.15 + i * 0.13,
            ease: 'back.out(1.4)',
            clearProps: 'transform',
          }
        );
      });
    }

    return { reveal, messageReveal };
  })();

  /* ══════════════════════════════════════════
     3. HERO NAME LETTER-BY-LETTER ANIMATION
  ══════════════════════════════════════════ */
  const TextSplit = (() => {
    function splitAndAnimate(selector, opts = {}) {
      const el = document.querySelector(selector);
      if (!el) return;

      // If already split, restore plain text before re-splitting so chars
      // don't nest inside each other on replay.
      if (el._split) {
        el.innerHTML = el.textContent; // collapses spans back to text
        el._split = false;
      }
      el._split = true;

      const text  = el.textContent;
      const chars = text.split('');

      el.innerHTML = chars.map((ch, i) =>
        `<span class="split-char" style="display:inline-block;white-space:pre" data-i="${i}">${ch}</span>`
      ).join('');

      const spans = el.querySelectorAll('.split-char');
      const {
        delay    = 0,
        duration = 0.7,
        stagger  = 0.04,
        from     = { opacity: 0, y: '0.4em', filter: 'blur(8px)' },
        ease     = 'power3.out',
      } = opts;

      gsap.fromTo(spans, from, {
        opacity: 1, y: '0em', filter: 'blur(0px)',
        duration, stagger, delay, ease,
        clearProps: 'all'
      });
    }

    // Called by script.js initReplay() so the hero name re-splits on next visit
    function resetSplit(selector) {
      const el = document.querySelector(selector);
      if (!el) return;
      if (el._split) {
        el.innerHTML = el.textContent;
        el._split = false;
      }
    }

    return { splitAndAnimate, resetSplit };
  })();

  /* ══════════════════════════════════════════
     4. AMBIENT PARALLAX — mouse-driven depth
  ══════════════════════════════════════════ */
  const Parallax = (() => {
    let mx = 0, my = 0;
    let running = false;

    const layers = [
      { sel: '.orb-a',        depth: 0.014 },
      { sel: '.orb-b',        depth: 0.010 },
      { sel: '.hero-name',    depth: 0.006 },
      { sel: '.hero-pre',     depth: 0.004 },
      { sel: '.hero-tagline', depth: 0.003 },
      { sel: '.final-heart',  depth: 0.008 },
      { sel: '.final-title',  depth: 0.005 },
    ];

    function tick() {
      if (!running) return;
      requestAnimationFrame(tick);

      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;

      layers.forEach(({ sel, depth }) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const dx = (mx - cx) * depth;
        const dy = (my - cy) * depth;
        gsap.set(el, { x: dx, y: dy });
      });
    }

    function init() {
      if (window.matchMedia('(pointer: coarse)').matches) return;

      document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
      });

      running = true;
      tick();
    }

    function stop() { running = false; }

    return { init, stop };
  })();

  /* ══════════════════════════════════════════
     5. SCENE ENTER TIMELINE ENHANCER
     Scene indices: 2=hero, 3=gallery, 4=message, 5=finale
  ══════════════════════════════════════════ */
  const SceneEnhancer = (() => {
    const SCENE_FX = {
      2: () => {
        /* Hero: animate name letter-by-letter */
        setTimeout(() => {
          TextSplit.splitAndAnimate('.hero-name', {
            delay: 0.4, stagger: 0.06,
            from: { opacity: 0, y: '0.3em', filter: 'blur(10px)' }
          });
        }, 200);
      },
      3: () => {
        /* Photo grid: subtle shimmer glow on frames */
        gsap.fromTo('.photo-frame-inner',
          { boxShadow: '0 0 0 1px rgba(212,175,110,.0)' },
          { boxShadow: '0 0 0 1px rgba(212,175,110,.12)',
            duration: 1.2, stagger: .1, delay: .5, ease: 'power2.out' }
        );
      },
      4: () => {
        /* Message slider: subtle glow on first slide */
        gsap.fromTo('.msg-slide.active .msg-slide-content',
          { opacity: 0, x: 12 },
          { opacity: 1, x: 0, duration: .8, delay: .4, ease: 'power3.out', clearProps: 'all' }
        );
      },
      5: () => {
        gsap.fromTo('.final-heart',
          { scale: 0, rotation: -15, opacity: 0 },
          { scale: 1, rotation: 0, opacity: 1,
            duration: 1.1, delay: 0.9,
            ease: 'elastic.out(1.2, 0.5)' }
        );
      },
    };

    function init() {
      const scenes = document.querySelectorAll('.scene');
      scenes.forEach((scene, index) => {
        const observer = new MutationObserver(mutations => {
          mutations.forEach(m => {
            if (m.attributeName === 'class') {
              const isNowActive = scene.classList.contains('active');
              const wasActive   = m.oldValue && m.oldValue.includes('active');
              if (isNowActive && !wasActive && SCENE_FX[index]) {
                SCENE_FX[index]();
              }
            }
          });
        });
        observer.observe(scene, {
          attributes: true,
          attributeOldValue: true,
          attributeFilter: ['class']
        });
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     6. SCROLL PROGRESS INDICATOR ENHANCEMENT
  ══════════════════════════════════════════ */
  const ProgressEnhancer = (() => {
    function init() {
      const fill = document.getElementById('progress-fill');
      if (!fill) return;

      const observer = new MutationObserver(() => {
        gsap.fromTo(fill,
          { boxShadow: '4px 0 20px rgba(212,175,110,0.8)' },
          { boxShadow: '4px 0 0px rgba(212,175,110,0)',
            duration: 1.2, ease: 'power2.out' }
        );
      });

      observer.observe(fill, { attributes: true, attributeFilter: ['style'] });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     7. BOOT
  ══════════════════════════════════════════ */
  function boot() {
    MagneticButtons.init();
    Parallax.init();
    SceneEnhancer.init();
    ProgressEnhancer.init();

    window.AnimationEngine = {
      StaggerReveal,
      TextSplit,
      Parallax,
    };

    console.log('[AnimationEngine] ✓ Loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
