/**
 * script.js
 * A Night to Remember — Unified Scene Controller
 * GSAP + Three.js — one master system, zero conflicts
 * Scene order: 0=Intro, 1=Countdown, 2=Hero, 3=Gallery, 4=Message, 5=Final
 */

/* ══════════════════════════════════════════════════════
   0. UTILITIES
══════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const $$ = sel => [...document.querySelectorAll(sel)];

/* Safety guard — if GSAP or THREE are missing, warn clearly */
if (typeof gsap === 'undefined') {
  console.error('[script.js] GSAP not found — check CDN script tag order');
}
if (typeof THREE === 'undefined') {
  console.error('[script.js] THREE.js not found — check CDN script tag order');
}

/* ══════════════════════════════════════════════════════
   1. THREE.JS PARTICLE SYSTEMS
══════════════════════════════════════════════════════ */
const Particles = (() => {
  const instances = {};

  function makeRenderer(canvas) {
    const r = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: false, powerPreference: 'low-power'
    });
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    r.setClearColor(0x000000, 0);
    canvas.style.pointerEvents = 'none';
    return r;
  }

  function sizeRenderer(renderer, camera, canvas) {
    const w = canvas.offsetWidth  || window.innerWidth;
    const h = canvas.offsetHeight || window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ── Generic floating dots ── */
  function createFloating(canvasId, opts = {}) {
    if (typeof THREE === 'undefined') return null;
    const canvas = $(canvasId);
    if (!canvas) return null;

    const {
      count    = window.innerWidth < 768 ? 400 : 800,
      color    = 0xd4af6e,
      size     = 0.03,
      speed    = 0.04,
      spread   = 14,
      depth    = 8,
      opacity  = 0.6,
    } = opts;

    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 5;
    const renderer = makeRenderer(canvas);
    sizeRenderer(renderer, camera, canvas);

    const geo    = new THREE.BufferGeometry();
    const pos    = new Float32Array(count * 3);
    const vel    = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random()-.5) * spread;
      pos[i*3+1] = (Math.random()-.5) * spread;
      pos[i*3+2] = (Math.random()-.5) * depth;
      vel[i]     = 0.003 + Math.random() * 0.006;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size, color, transparent: true, opacity,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let running  = true;
    let rafId    = null;
    let mouse    = { x: 0, y: 0 };
    let clock    = new THREE.Clock();

    const onResize = () => sizeRenderer(renderer, camera, canvas);
    window.addEventListener('resize', onResize);

    const onMouse = e => {
      mouse.x = (e.clientX / window.innerWidth  - .5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - .5) * 2;
    };
    document.addEventListener('mousemove', onMouse);

    const tick = () => {
      if (!running) return;
      rafId = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      const p = geo.attributes.position.array;

      for (let i = 0; i < count; i++) {
        p[i*3+1] += vel[i] * speed;
        if (p[i*3+1] > spread/2) p[i*3+1] = -spread/2;
      }
      geo.attributes.position.needsUpdate = true;
      points.rotation.y = t * 0.015 + mouse.x * 0.08;
      points.rotation.x = mouse.y * 0.05;
      renderer.render(scene, camera);
    };
    tick();

    return {
      start() { if (!running) { running = true; clock.start(); tick(); } },
      stop()  { running = false; cancelAnimationFrame(rafId); },
      destroy() {
        this.stop();
        window.removeEventListener('resize', onResize);
        document.removeEventListener('mousemove', onMouse);
        geo.dispose(); mat.dispose(); renderer.dispose();
      }
    };
  }

  /* ── Confetti burst for Final scene ── */
  function createBurst(canvasId) {
    if (typeof THREE === 'undefined') return null;
    const canvas = $(canvasId);
    if (!canvas) return null;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 4;
    const renderer = makeRenderer(canvas);
    sizeRenderer(renderer, camera, canvas);

    const count  = window.innerWidth < 768 ? 600 : 1400;
    const geo    = new THREE.BufferGeometry();
    const pos    = new Float32Array(count * 3);
    const vel    = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      [0.83, 0.69, 0.43],
      [0.78, 0.32, 0.42],
      [0.96, 0.94, 0.88],
    ];

    const reset = i => {
      pos[i*3]   = (Math.random()-.5) * .4;
      pos[i*3+1] = (Math.random()-.5) * .4;
      pos[i*3+2] = (Math.random()-.5) * .2;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.03 + Math.random() * 0.07;
      vel[i*3]   = Math.cos(angle) * speed;
      vel[i*3+1] = Math.abs(Math.sin(angle)) * speed + 0.02;
      vel[i*3+2] = (Math.random()-.5) * 0.02;
    };

    for (let i = 0; i < count; i++) {
      reset(i);
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i*3] = c[0]; colors[i*3+1] = c[1]; colors[i*3+2] = c[2];
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.04, vertexColors: true, transparent: true, opacity: .85,
      sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false,
    });

    scene.add(new THREE.Points(geo, mat));

    let running = true;
    let burst   = false;
    let clock   = new THREE.Clock();

    const onResize = () => sizeRenderer(renderer, camera, canvas);
    window.addEventListener('resize', onResize);

    const tick = () => {
      if (!running) return;
      requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      const p = geo.attributes.position.array;
      const v = vel;

      if (burst) {
        for (let i = 0; i < count; i++) {
          p[i*3]   += v[i*3];
          p[i*3+1] += v[i*3+1];
          p[i*3+2] += v[i*3+2];
          v[i*3+1] -= 0.0006;
          if (p[i*3+1] < -6 || Math.abs(p[i*3]) > 8) reset(i);
        }
        geo.attributes.position.needsUpdate = true;
      } else {
        scene.children[0].rotation.y = t * 0.07;
        scene.children[0].rotation.x = Math.sin(t*.3) * 0.1;
        mat.opacity = 0.6 + Math.sin(t*1.1) * .18;
      }
      renderer.render(scene, camera);
    };
    tick();

    return {
      fireBurst() { burst = true; },
      stop()      { running = false; },
      start()     { if (!running) { running = true; burst = false; clock.start(); tick(); } },
      reset()     {
        burst = false;
        for (let i = 0; i < count; i++) reset(i);
        geo.attributes.position.needsUpdate = true;
      },
      destroy()   {
        this.stop();
        window.removeEventListener('resize', onResize);
        geo.dispose(); mat.dispose(); renderer.dispose();
      }
    };
  }

  return { createFloating, createBurst };
})();

/* ══════════════════════════════════════════════════════
   2. SCENE MANAGER
   Scene order: 0=Intro, 1=Countdown, 2=Hero, 3=Gallery, 4=Message, 5=Final
══════════════════════════════════════════════════════ */
const App = (() => {
  const TOTAL_SCENES = 6;
  let currentScene  = 0;
  let isTransitioning = false;

  /* Particle instances */
  let pIntro  = null;
  let pHero   = null;
  let pFinal  = null;

  /* Countdown RAF — hoisted so replay can cancel a mid-tick loop */
  let countdownRafId = null;

  const progressFill = $('progress-fill');
  const dots = $$('.dot');
  const scenes = $$('.scene');

  function updateProgress(index) {
    const pct = (index / (TOTAL_SCENES - 1)) * 100;
    if (progressFill) progressFill.style.width = pct + '%';
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
  }

  function goTo(index) {
    if (index === currentScene || isTransitioning) return;
    if (index < 0 || index >= TOTAL_SCENES) return;

    isTransitioning = true;
    const from = scenes[currentScene];
    const to   = scenes[index];

    onLeave(currentScene);

    gsap.to(from, {
      opacity: 0, duration: .7, ease: 'power2.in',
      onComplete() {
        from.classList.remove('active');
        from.style.pointerEvents = 'none';
      }
    });

    to.classList.add('active');
    to.style.opacity = 0;
    to.style.pointerEvents = 'all';

    gsap.to(to, {
      opacity: 1, duration: .7, delay: .35, ease: 'power2.out',
      onComplete() {
        isTransitioning = false;
        onEnter(index);
      }
    });

    currentScene = index;
    updateProgress(index);
  }

  function onEnter(index) {
    switch(index) {
      case 0: enterIntro();     break;
      case 1: enterCountdown(); break;
      case 2: enterHero();      break;
      case 3: enterPhotoGrid(); break;
      case 4: enterMessage();   break;
      case 5: enterFinal();     break;
    }
  }

  function onLeave(index) {
    switch(index) {
      case 0: if (pIntro) { pIntro.stop(); }  break;
      case 2: if (pHero)  { pHero.stop(); }   break;
      case 5: if (pFinal) { pFinal.stop(); }  break;
    }

    /* ── Hide & disable fixed continue buttons when leaving their scene ──
       Both #photogrid-next and #scene4-continue are position:fixed at the
       same bottom-right coordinates. If both are opacity>0 and clickable
       simultaneously, a single click in scene 3 fires BOTH handlers:
       goTo(4) then goTo(5) — skipping scene 4 entirely.
       Solution: always hide the button for the scene we're leaving. */
    if (index === 3) {
      const btn = $('photogrid-next');
      if (btn) { gsap.set(btn, { opacity: 0 }); btn.style.pointerEvents = 'none'; }
    }
    if (index === 4) {
      const btn = $('scene4-continue');
      if (btn) { gsap.set(btn, { opacity: 0 }); btn.style.pointerEvents = 'none'; }
    }
  }

  /* ══════════════════════════════
     SCENE 0 — INTRO
  ══════════════════════════════ */
  function enterIntro() {
    if (!pIntro) {
      pIntro = Particles.createFloating('canvas-intro', {
        count: window.innerWidth < 768 ? 300 : 700,
        color: 0xc8637a,
        size: 0.028,
        opacity: 0.45,
        spread: 16,
      });
    } else {
      pIntro.start();
    }

    const tl = gsap.timeline();
    tl.fromTo('.intro-eyebrow',  { opacity:0, y:16 }, { opacity:1, y:0, duration:1, ease:'power3.out' })
      .fromTo('.intro-line-1',   { opacity:0, y:30 }, { opacity:1, y:0, duration:1, ease:'power3.out' }, '-=.5')
      .fromTo('.intro-line-2',   { opacity:0, y:30 }, { opacity:1, y:0, duration:1, ease:'power3.out' }, '-=.7')
      .fromTo('.intro-rule',     { opacity:0 },       { opacity:1, duration:.8 }, '-=.4')
      .fromTo('.intro-begin',    { opacity:0 },       { opacity:1, duration:.8 }, '-=.2');
  }

  function bindIntroClick() {
    // Use a named handler stored on the element so we can reliably remove it.
    // Avoid cloneNode — it creates a detached DOM node and makes the closed-over
    // `scenes[0]` reference stale, causing goTo() to animate a ghost element.
    const scene0 = scenes[0];

    // Remove any previously attached handler to prevent duplicate firings on replay
    if (scene0._introClickHandler) {
      scene0.removeEventListener('click', scene0._introClickHandler);
      scene0._introClickHandler = null;
    }

    const handler = e => {
      if (e.target.closest('#scene-dots')) return;
      scene0.removeEventListener('click', handler);
      scene0._introClickHandler = null;
      goTo(1);
    };

    scene0._introClickHandler = handler;
    scene0.addEventListener('click', handler);
  }

  /* ══════════════════════════════
     SCENE 1 — COUNTDOWN
  ══════════════════════════════ */
  function enterCountdown() {
    const numEl  = $('countdown-num');
    const ringEl = $('ring-progress-el');
    const circumference = 339.29;
    let count = 3;

    if (numEl) numEl.textContent = '3';
    if (ringEl) ringEl.style.strokeDashoffset = '0';

    const duration = 1000;
    let start = null;

    // Cancel any previous countdown loop still ticking from before a replay
    if (countdownRafId) { cancelAnimationFrame(countdownRafId); countdownRafId = null; }

    const animate = ts => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / duration, 1);

      if (ringEl) {
        ringEl.style.strokeDashoffset = (circumference * progress).toFixed(2);
      }

      if (progress >= 1) {
        count--;
        start = ts;
        if (count > 0) {
          if (numEl) numEl.textContent = count;
          gsap.fromTo(numEl, { scale:.6, opacity:.3 }, { scale:1, opacity:1, duration:.4, ease:'back.out(2)' });
          if (ringEl) ringEl.style.strokeDashoffset = '0';
          countdownRafId = requestAnimationFrame(animate);
        } else {
          countdownRafId = null;
          gsap.fromTo(numEl,
            { scale:1, opacity:1 },
            { scale:3, opacity:0, duration:.6, ease:'power2.in',
              onComplete: () => goTo(2)
            }
          );
          return;
        }
      } else {
        countdownRafId = requestAnimationFrame(animate);
      }
    };

    gsap.fromTo(numEl, { scale:.6, opacity:0 }, {
      scale:1, opacity:1, duration:.5, ease:'back.out(2)',
      onComplete: () => { countdownRafId = requestAnimationFrame(animate); }
    });
  }

  /* ══════════════════════════════
     SCENE 2 — HERO
  ══════════════════════════════ */
  function enterHero() {
    if (!pHero) {
      pHero = Particles.createFloating('canvas-hero', {
        count: window.innerWidth < 768 ? 350 : 900,
        color: 0xd4af6e,
        size: 0.022,
        opacity: 0.55,
        spread: 18,
        speed: 0.03,
      });
    } else {
      pHero.start();
    }

    const tl = gsap.timeline({ defaults: { ease:'power3.out' } });
    tl.fromTo('.hero-pre',     { opacity:0, y:20 }, { opacity:1, y:0, duration:.9 })
      .fromTo('.hero-name',    { opacity:0, y:40, filter:'blur(12px)' },
                               { opacity:1, y:0,  filter:'blur(0px)', duration:1.1 }, '-=.5')
      .fromTo('.hero-rule',    { opacity:0, scaleX:.3 }, { opacity:1, scaleX:1, duration:.8 }, '-=.4')
      .fromTo('.hero-tagline', { opacity:0, y:16 }, { opacity:1, y:0, duration:.8 }, '-=.5')
      .fromTo('.hero-cta',     { opacity:0, y:20 }, { opacity:1, y:0, duration:.7 }, '-=.4');
  }

  /* ══════════════════════════════
     SCENE 3 — PHOTO GRID (formerly scene 4)
  ══════════════════════════════ */
  function enterPhotoGrid() {
    gsap.fromTo('.photogrid-eyebrow',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }
    );
    gsap.fromTo('.photo-frame',
      { opacity: 0, y: 28, scale: 0.96 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: .8, stagger: .12, delay: .2, ease: 'power3.out',
        clearProps: 'transform'
      }
    );
    // Animate the continue button in — re-enable pointer-events on complete
    const pgNext = $('photogrid-next');
    if (pgNext) {
      gsap.set(pgNext, { pointerEvents: 'none' });
      gsap.fromTo(pgNext,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: .7, delay: .9, ease: 'power3.out',
          onComplete() { pgNext.style.pointerEvents = 'all'; }
        }
      );
    }
  }

  /* ══════════════════════════════
     SCENE 4 — MESSAGE SLIDER (formerly scene 5)
  ══════════════════════════════ */
  let msgSliderIndex = 0;
  let msgSlides      = [];
  let msgPips        = [];

  function enterMessage() {
    msgSliderIndex = 0;
    msgSlides = $$('.msg-slide');
    msgPips   = $$('.msgslider-pip');

    const track = $('msgslider-track');
    if (track) gsap.set(track, { x: 0 });

    msgSlides.forEach((s, i) => {
      s.classList.toggle('active', i === 0);
    });
    updateMsgPips(0);

    gsap.fromTo('.msgslider-eyebrow',
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: .9, ease: 'power3.out' }
    );
    gsap.fromTo('.msgslider-viewport',
      { opacity: 0, y: 24, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: .9, delay: .2, ease: 'power3.out', clearProps: 'transform' }
    );
    gsap.fromTo('.msgslider-nav',
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: .7, delay: .5, ease: 'power3.out' }
    );
    // Animate the fixed continue button in — re-enable pointer-events on complete
    const s4Btn = $('scene4-continue');
    if (s4Btn) {
      gsap.set(s4Btn, { pointerEvents: 'none' });
      gsap.fromTo(s4Btn,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: .6, delay: .75, ease: 'power3.out',
          onComplete() { s4Btn.style.pointerEvents = 'all'; }
        }
      );
    }
  }

  function showMsgSlide(nextIndex, direction) {
    if (!msgSlides.length) return;
    if (nextIndex === msgSliderIndex) return;
    const track = $('msgslider-track');
    if (!track) return;

    nextIndex = Math.max(0, Math.min(nextIndex, msgSlides.length - 1));

    const slideWidth = track.parentElement.offsetWidth;
    gsap.to(track, {
      x: -(nextIndex * slideWidth),
      duration: .65,
      ease: 'power3.inOut',
    });

    msgSlides[msgSliderIndex].classList.remove('active');
    msgSlides[nextIndex].classList.add('active');
    msgSliderIndex = nextIndex;
    updateMsgPips(nextIndex);
  }

  function updateMsgPips(index) {
    msgPips.forEach((p, i) => p.classList.toggle('active', i === index));
  }

  /* ══════════════════════════════
     SCENE 5 — FINAL (formerly scene 6)
  ══════════════════════════════ */
  function enterFinal() {
    if (!pFinal) {
      pFinal = Particles.createBurst('canvas-final');
    } else {
      pFinal.start();
      pFinal.reset();
    }

    const tl = gsap.timeline({ defaults: { ease:'power3.out' } });
    tl.fromTo('.final-pre',     { opacity:0, y:16 }, { opacity:1, y:0, duration:.9 })
      .fromTo('.final-title',   { opacity:0, y:30, filter:'blur(10px)' },
                                { opacity:1, y:0,  filter:'blur(0px)', duration:1.2 }, '-=.5')
      .fromTo('.final-heart',   { opacity:0, scale:.5 }, { opacity:1, scale:1, duration:.8, ease:'back.out(2.5)' }, '-=.4')
      .fromTo('.final-tagline', { opacity:0, y:20 }, { opacity:1, y:0, duration:.8 }, '-=.3')
      .fromTo('.replay-btn',    { opacity:0, y:16 }, { opacity:1, y:0, duration:.7 }, '-=.3')
      .call(() => {
        setTimeout(() => { if (pFinal) pFinal.fireBurst(); }, 600);
      });
  }

  /* ══════════════════════════════
     DOT NAVIGATION
  ══════════════════════════════ */
  function initDotNav() {
    $$('.dot').forEach((dot, i) => {
      dot.addEventListener('click', () => goTo(i));
    });
  }

  /* ══════════════════════════════
     KEYBOARD NAVIGATION
  ══════════════════════════════ */
  function initKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        goTo(currentScene + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        goTo(currentScene - 1);
      }
    });
  }

  /* ══════════════════════════════
     TOUCH / SWIPE
  ══════════════════════════════ */
  function initSwipe() {
    let startX = 0, startY = 0;
    document.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      // Don't swipe-navigate on gallery/message scenes (they have their own scroll/slide)
      if ([3, 4].includes(currentScene)) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 50) {
        goTo(currentScene + (dy < 0 ? 1 : -1));
      }
    }, { passive: true });
  }

  /* ══════════════════════════════
     PHOTO GRID NEXT BUTTON (scene 3 → 4)
  ══════════════════════════════ */
  function initPhotogridNext() {
    const btn = $('photogrid-next');
    if (!btn) return;
    // Guard: only add listener once
    if (btn._pgNextBound) return;
    btn._pgNextBound = true;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      goTo(4);
    });
  }

  /* ══════════════════════════════
     MESSAGE SLIDER BUTTONS (scene 4)
  ══════════════════════════════ */
  function initMsgSlider() {
    const prevBtn = $('msgslider-prev');
    const nextBtn = $('msgslider-next');

    if (prevBtn) prevBtn.addEventListener('click', () => {
      showMsgSlide(msgSliderIndex - 1, -1);
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      showMsgSlide(msgSliderIndex + 1, 1);
    });

    document.addEventListener('click', e => {
      const pip = e.target.closest('.msgslider-pip');
      if (!pip) return;
      const idx = $$('.msgslider-pip').indexOf(pip);
      if (idx >= 0) showMsgSlide(idx, idx > msgSliderIndex ? 1 : -1);
    });

    let swStartX = 0;
    const viewport = $('msgslider-viewport');
    if (viewport) {
      viewport.addEventListener('touchstart', e => {
        swStartX = e.touches[0].clientX;
      }, { passive: true });
      viewport.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - swStartX;
        if (Math.abs(dx) > 45) showMsgSlide(msgSliderIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }, { passive: true });
    }
  }

  /* ══════════════════════════════
     HERO CTA → goes to scene 3 (gallery, formerly scene 4)
  ══════════════════════════════ */
  function initHeroCTA() {
    const btn = $('hero-cta');
    if (btn) btn.addEventListener('click', () => goTo(3));
  }

  /* ══════════════════════════════
     SCENE 4 CONTINUE (→ scene 5 final)
  ══════════════════════════════ */
  function initMessageContinue() {
    const continueBtn = $('scene4-continue');
    if (!continueBtn) return;
    // Guard: only add listener once
    if (continueBtn._s4ContinueBound) return;
    continueBtn._s4ContinueBound = true;
    continueBtn.addEventListener('click', e => {
      e.stopPropagation();
      goTo(5);
    });
  }

  /* ══════════════════════════════
     REPLAY — full reset
  ══════════════════════════════ */
  function initReplay() {
    const btn = $('replay-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {

      // ── 1. Cancel any mid-tick countdown loop (BUG 6) ──────────────────
      if (countdownRafId) { cancelAnimationFrame(countdownRafId); countdownRafId = null; }

      // ── 2. Kill ALL GSAP activity — timelines AND tweens (BUG 1) ────────
      // gsap.killTweensOf('*') only kills standalone tweens, not timelines.
      // globalTimeline.clear() kills everything including nested timelines.
      gsap.globalTimeline.clear();

      // ── 3. Destroy particle instances fully (BUG 8) ─────────────────────
      // destroy() disposes the WebGL renderer + removes resize/mouse listeners.
      // Calling stop() alone leaks a WebGL context every replay cycle.
      if (pIntro) { pIntro.destroy(); pIntro = null; }
      if (pHero)  { pHero.destroy();  pHero  = null; }
      if (pFinal) { pFinal.destroy(); pFinal = null; }

      // ── 4. Reset slider state ────────────────────────────────────────────
      msgSliderIndex = 0;

      // ── 5. Unlock transition gate ────────────────────────────────────────
      isTransitioning = false;
      currentScene    = 0;

      // ── 6. Reset scroll (BUG 7) ──────────────────────────────────────────
      window.scrollTo(0, 0);

      // ── 7. Reset all scene DOM to initial state ───────────────────────────
      // Re-query from live DOM so we get current nodes (not stale clones).
      const allScenes = $$('.scene');
      allScenes.forEach((s, i) => {
        gsap.set(s, { opacity: i === 0 ? 1 : 0, clearProps: 'filter,transform,scale,x,y' });
        s.style.pointerEvents = i === 0 ? 'all' : 'none';
        if (i === 0) s.classList.add('active');
        else         s.classList.remove('active');
      });

      // ── 8. Clear TextSplit _split flag so hero name re-animates (BUG 4) ──
      // splitAndAnimate() guards with el._split = true; without clearing it
      // the letter-by-letter animation is permanently skipped after first run.
      if (window.AnimationEngine && window.AnimationEngine.TextSplit) {
        window.AnimationEngine.TextSplit.resetSplit('.hero-name');
      } else {
        // Fallback if animation-engine hasn't loaded yet
        const heroName = document.querySelector('.hero-name');
        if (heroName && heroName._split) {
          heroName.innerHTML = heroName.textContent;
          heroName._split = false;
        }
      }

      // ── 9. scenes array stays valid — no cloneNode used any more ─────────
      // bindIntroClick() now uses addEventListener/removeEventListener on the
      // LIVE scene element, so the closed-over `scenes` array is always current.

      // ── 10. Hide & disable continue buttons ──────────────────────────────
      const pgNext = $('photogrid-next');
      if (pgNext) { gsap.set(pgNext, { opacity: 0 }); pgNext.style.pointerEvents = 'none'; }
      const s4Btn = $('scene4-continue');
      if (s4Btn)  { gsap.set(s4Btn,  { opacity: 0 }); s4Btn.style.pointerEvents  = 'none'; }

      // ── 11. Reset progress + dots ─────────────────────────────────────────
      updateProgress(0);

      // ── 12. Re-bind intro click (it was removed after first use) ──────────
      bindIntroClick();

      // ── 13. Start intro ───────────────────────────────────────────────────
      // Small delay lets the DOM settle after gsap.globalTimeline.clear()
      setTimeout(() => enterIntro(), 50);
    });
  }

  /* ══════════════════════════════
     BOOT
  ══════════════════════════════ */
  function init() {
    scenes.forEach((s, i) => {
      s.style.opacity = i === 0 ? '1' : '0';
      s.style.pointerEvents = i === 0 ? 'all' : 'none';
      if (i === 0) s.classList.add('active');
      else         s.classList.remove('active');
    });

    updateProgress(0);
    initDotNav();
    initKeyboard();
    initSwipe();
    bindIntroClick();
    initHeroCTA();
    initPhotogridNext();
    initMsgSlider();
    initMessageContinue();
    initReplay();

    /* Ensure both fixed continue buttons start hidden & non-interactive.
       They share the same bottom-right position; having both clickable
       at once is the root cause of the scene-3→5 skip bug. */
    const pgNext = $('photogrid-next');
    if (pgNext) { gsap.set(pgNext, { opacity: 0 }); pgNext.style.pointerEvents = 'none'; }
    const s4Btn = $('scene4-continue');
    if (s4Btn)  { gsap.set(s4Btn,  { opacity: 0 }); s4Btn.style.pointerEvents  = 'none'; }

    enterIntro();
  }

  return { init };
})();

/* ══════════════════════════════════════════════════════
   3. BOOT
══════════════════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
