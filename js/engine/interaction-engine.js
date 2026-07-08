/**
 * interaction-engine.js
 * Premium Micro-Interaction & Interaction System
 * NON-DESTRUCTIVE — layers on top of existing interactions
 * Custom cursor REMOVED — default browser cursor used
 * Scene order: 0=intro, 1=countdown, 2=hero, 3=gallery, 4=message, 5=finale
 */

;(function InteractionEngine() {
  'use strict';

  if (typeof gsap === 'undefined') {
    window.addEventListener('load', InteractionEngine);
    return;
  }

  /* ══════════════════════════════════════════
     1. RIPPLE EFFECT ON CLICK
  ══════════════════════════════════════════ */
  const Ripple = (() => {
    const DURATION = 600;

    function createRipple(e, el) {
      const rect   = el.getBoundingClientRect();
      const size   = Math.max(rect.width, rect.height) * 2.2;
      const x      = e.clientX - rect.left - size / 2;
      const y      = e.clientY - rect.top  - size / 2;

      const ripple = document.createElement('span');
      ripple.className = '__ripple';

      Object.assign(ripple.style, {
        position:      'absolute',
        width:         size + 'px',
        height:        size + 'px',
        left:          x + 'px',
        top:           y + 'px',
        borderRadius:  '50%',
        background:    'rgba(212, 175, 110, 0.18)',
        transform:     'scale(0)',
        pointerEvents: 'none',
        zIndex:        '0',
      });

      const pos = window.getComputedStyle(el).position;
      if (pos === 'static') el.style.position = 'relative';
      el.style.overflow = 'hidden';

      el.appendChild(ripple);

      gsap.to(ripple, {
        scale: 1, opacity: 0,
        duration: DURATION / 1000,
        ease: 'power2.out',
        onComplete: () => ripple.remove()
      });
    }

    function init() {
      document.addEventListener('click', e => {
        const btn = e.target.closest('button, .gallery-item, .msg-card');
        if (btn) createRipple(e, btn);
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     2. MSG CARD TILT (desktop only)
  ══════════════════════════════════════════ */
  const CardTilt = (() => {
    const STRENGTH = 10;

    function attach(card) {
      if (card._tilt) return;
      card._tilt = true;

      if (window.matchMedia('(pointer: coarse)').matches) return;

      card.style.transformStyle = 'preserve-3d';
      card.style.willChange     = 'transform';

      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = ((e.clientX - cx) / (rect.width  / 2));
        const dy   = ((e.clientY - cy) / (rect.height / 2));
        const rotX = -dy * STRENGTH;
        const rotY =  dx * STRENGTH;

        gsap.to(card, {
          rotateX: rotX, rotateY: rotY, scale: 1.03,
          duration: 0.35, ease: 'power2.out',
          transformPerspective: 700,
        });

        const shimmer = card.querySelector('.__shimmer');
        if (shimmer) {
          const pctX = ((e.clientX - rect.left) / rect.width)  * 100;
          const pctY = ((e.clientY - rect.top)  / rect.height) * 100;
          shimmer.style.background =
            `radial-gradient(circle at ${pctX}% ${pctY}%, rgba(212,175,110,0.13) 0%, transparent 65%)`;
        }
      });

      card.addEventListener('mouseleave', () => {
        gsap.to(card, {
          rotateX: 0, rotateY: 0, scale: 1,
          duration: 0.7, ease: 'elastic.out(1, 0.5)',
          clearProps: 'transform',
        });
      });

      const shimmer = document.createElement('div');
      shimmer.className = '__shimmer';
      Object.assign(shimmer.style, {
        position:      'absolute',
        inset:         '0',
        pointerEvents: 'none',
        zIndex:        '3',
        transition:    'background 0.15s ease',
        borderRadius:  'inherit',
      });
      card.appendChild(shimmer);
    }

    function init() {
      document.querySelectorAll('.photo-frame, .msg-slide').forEach(attach);
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     3. DOT NAV HOVER TOOLTIP
  ══════════════════════════════════════════ */
  const DotTooltips = (() => {
    // Updated labels — 6 scenes, no story
    const LABELS = ['Intro', 'Opening', 'Sophia', 'Gallery', 'Messages', 'Finale'];

    function init() {
      if (window.matchMedia('(pointer: coarse)').matches) return;

      const dots = document.querySelectorAll('.dot');
      dots.forEach((dot, i) => {
        const tip = document.createElement('span');
        tip.textContent = LABELS[i] || `Scene ${i + 1}`;
        Object.assign(tip.style, {
          position:      'absolute',
          right:         '140%',
          top:           '50%',
          transform:     'translateY(-50%)',
          whiteSpace:    'nowrap',
          fontSize:      '0.45rem',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          fontFamily:    'var(--f-display, serif)',
          color:         'var(--g-bright)',
          opacity:       '0',
          pointerEvents: 'none',
          transition:    'opacity 0.25s ease',
          background:    'rgba(4,3,10,0.8)',
          padding:       '3px 8px',
          backdropFilter:'blur(8px)',
          border:        '1px solid rgba(212,175,110,0.15)',
        });

        dot.style.position = 'relative';
        dot.appendChild(tip);

        dot.addEventListener('mouseenter', () => { tip.style.opacity = '1'; });
        dot.addEventListener('mouseleave', () => { tip.style.opacity = '0'; });
      });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     4. CLICK BURST (dot & CTA clicks)
  ══════════════════════════════════════════ */
  const ClickBurst = (() => {
    function burst(x, y, color = '#d4af6e') {
      const COUNT = 8;
      for (let i = 0; i < COUNT; i++) {
        const el = document.createElement('div');
        Object.assign(el.style, {
          position:      'fixed',
          left:          x + 'px',
          top:           y + 'px',
          width:         '4px',
          height:        '4px',
          borderRadius:  '50%',
          background:    color,
          pointerEvents: 'none',
          zIndex:        '9999',
          transform:     'translate(-50%,-50%)',
          opacity:       '0.9',
        });
        document.body.appendChild(el);

        const angle = (i / COUNT) * Math.PI * 2;
        const dist  = 25 + Math.random() * 20;
        gsap.to(el, {
          x:        Math.cos(angle) * dist,
          y:        Math.sin(angle) * dist,
          opacity:  0,
          scale:    0.2,
          duration: 0.5 + Math.random() * 0.2,
          ease:     'power2.out',
          onComplete: () => el.remove()
        });
      }
    }

    function init() {
      document.querySelectorAll('.dot, .hero-cta, .replay-btn').forEach(el => {
        el.addEventListener('click', e => {
          burst(e.clientX, e.clientY);
        });
      });
    }

    return { init, burst };
  })();

  /* ══════════════════════════════════════════
     5. LIGHTBOX OPEN ANIMATION BOOST
  ══════════════════════════════════════════ */
  const LightboxBoost = (() => {
    function init() {
      const lightbox = document.getElementById('lightbox');
      if (!lightbox) return;

      const observer = new MutationObserver(() => {
        if (!lightbox.hidden) {
          gsap.fromTo('.lightbox-card',
            { filter: 'blur(4px)', scale: 0.88 },
            { filter: 'blur(0px)', scale: 1, duration: 0.5, ease: 'back.out(1.5)' }
          );
        }
      });

      observer.observe(lightbox, { attributes: true, attributeFilter: ['hidden'] });
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     6. ENSURE ALL BUTTONS ARE CLICKABLE
     Fixes any z-index or pointer-events issues
  ══════════════════════════════════════════ */
  const ButtonFix = (() => {
    function fix() {
      const btns = document.querySelectorAll(
        '.hero-cta, .replay-btn, .scene-continue-fixed, ' +
        '.msgslider-prev, .msgslider-next, ' +
        '#msgslider-prev, #msgslider-next, .dot'
      );
      btns.forEach(btn => {
        if (!btn.style.position || btn.style.position === 'static') {
          btn.style.position = 'relative';
        }
        const z = parseInt(window.getComputedStyle(btn).zIndex);
        if (!z || z < 5) btn.style.zIndex = '10';
      });

      // Continue buttons need high z-index but keep pointer-events
      const continueBtns = document.querySelectorAll(
        '.scene-continue-fixed, #photogrid-next, #scene4-continue'
      );
      continueBtns.forEach(btn => {
        btn.style.zIndex = '200';
        btn.style.pointerEvents = 'all';
      });
    }

    function init() {
      fix();
      document.addEventListener('scenechange', () => setTimeout(fix, 400));
    }

    return { init };
  })();

  /* ══════════════════════════════════════════
     7. BOOT
  ══════════════════════════════════════════ */
  function boot() {
    Ripple.init();
    CardTilt.init();
    DotTooltips.init();
    ClickBurst.init();
    LightboxBoost.init();
    ButtonFix.init();

    window.InteractionEngine = { ClickBurst };

    console.log('[InteractionEngine] ✓ Loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
