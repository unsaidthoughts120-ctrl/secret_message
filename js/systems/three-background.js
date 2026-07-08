/**
 * three-background.js
 * Premium Three.js Visual Enhancement Layer
 * ONE persistent ambient canvas behind ALL scenes — consistent background everywhere
 * NON-DESTRUCTIVE — does not interfere with scene-specific particle canvases
 */

;(function ThreeBackground() {
  'use strict';

  if (typeof THREE === 'undefined') {
    console.warn('[ThreeBackground] Three.js not found');
    return;
  }

  /* ── Skip only on very low-power mobile ── */
  const LOW_POWER = (
    navigator.hardwareConcurrency <= 2 &&
    window.matchMedia('(max-width: 480px)').matches
  );
  if (LOW_POWER) {
    console.log('[ThreeBackground] Skipped (low-power)');
    return;
  }

  /* ══════════════════════════════════════════
     1. GLOBAL AMBIENT CANVAS
     Persistent behind ALL scenes (z-index: -1)
     Same starfield / nebula visible on EVERY scene
  ══════════════════════════════════════════ */
  const AmbientCanvas = (() => {
    let renderer, scene, camera, clock;
    let nebulaParticles, starField;
    let running = true;
    let rafId   = null;

    function buildStarField(count = 1400) {
      const geo  = new THREE.BufferGeometry();
      const pos  = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        pos[i*3]   = (Math.random() - 0.5) * 32;
        pos[i*3+1] = (Math.random() - 0.5) * 32;
        pos[i*3+2] = (Math.random() - 0.5) * 16;
        sizes[i]   = Math.random();
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        uniforms: {
          uTime:       { value: 0 },
          uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
        },
        vertexShader: `
          attribute float aSize;
          uniform float uTime;
          uniform float uPixelRatio;
          varying float vAlpha;

          void main() {
            vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
            float twinkle = 0.5 + 0.5 * sin(uTime * 1.8 + position.x * 3.0 + position.y * 2.1);
            vAlpha = twinkle * aSize * 0.7;
            gl_PointSize = (2.0 + aSize * 2.5) * uPixelRatio * (300.0 / -mvPos.z);
            gl_Position  = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          varying float vAlpha;

          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            float alpha = (1.0 - d * 2.0) * vAlpha;
            gl_FragColor = vec4(0.94, 0.87, 0.72, alpha * 0.6);
          }
        `
      });

      return new THREE.Points(geo, mat);
    }

    function buildNebula(count = 340) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);

      const clusters = [
        { cx: -3, cy:  2, cz: -2, color: [0.78, 0.32, 0.42], r: 5.5 },
        { cx:  3, cy: -1, cz: -3, color: [0.84, 0.69, 0.43], r: 6.5 },
        { cx:  0, cy:  0, cz: -4, color: [0.65, 0.28, 0.45], r: 4 },
      ];

      for (let i = 0; i < count; i++) {
        const c      = clusters[i % clusters.length];
        const theta  = Math.random() * Math.PI * 2;
        const phi    = Math.acos(2 * Math.random() - 1);
        const radius = Math.pow(Math.random(), 0.5) * c.r;

        pos[i*3]   = c.cx + Math.sin(phi) * Math.cos(theta) * radius;
        pos[i*3+1] = c.cy + Math.sin(phi) * Math.sin(theta) * radius;
        pos[i*3+2] = c.cz + Math.cos(phi) * radius * 0.4;

        col[i*3]   = c.color[0] + (Math.random() - 0.5) * 0.15;
        col[i*3+1] = c.color[1] + (Math.random() - 0.5) * 0.1;
        col[i*3+2] = c.color[2] + (Math.random() - 0.5) * 0.1;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        vertexColors: true,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec3 vColor;
          uniform float uTime;

          void main() {
            vColor = color;
            float sway = sin(uTime * 0.3 + position.x) * 0.06;
            vec3 displaced = position + vec3(sway, sway * 0.5, 0.0);
            vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
            gl_PointSize = 60.0 / -mvPos.z;
            gl_Position  = projectionMatrix * mvPos;
          }
        `,
        fragmentShader: `
          varying vec3 vColor;

          void main() {
            float d = distance(gl_PointCoord, vec2(0.5));
            if (d > 0.5) discard;
            float alpha = (1.0 - d * 2.0);
            alpha = alpha * alpha * 0.11;
            gl_FragColor = vec4(vColor, alpha);
          }
        `
      });

      return new THREE.Points(geo, mat);
    }

    function resize() {
      if (!renderer || !camera) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function init() {
      /* Create canvas — prepended to body, stays behind everything */
      const canvas = document.createElement('canvas');
      canvas.id = 'canvas-ambient';
      Object.assign(canvas.style, {
        position:      'fixed',
        inset:         '0',
        width:         '100%',
        height:        '100%',
        zIndex:        '-1',      /* always behind all scenes */
        pointerEvents: 'none',
        opacity:       '0.6',
      });
      document.body.prepend(canvas);

      /* Renderer */
      renderer = new THREE.WebGLRenderer({
        canvas, alpha: true, antialias: false, powerPreference: 'low-power'
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.setSize(window.innerWidth, window.innerHeight, false);

      /* Scene + Camera */
      scene  = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 100);
      camera.position.z = 6;

      clock = new THREE.Clock();

      /* Objects */
      starField       = buildStarField();
      nebulaParticles = buildNebula();
      scene.add(starField);
      scene.add(nebulaParticles);

      window.addEventListener('resize', resize);

      /* Gentle mouse-driven camera drift */
      let targetX = 0, targetY = 0;
      if (!window.matchMedia('(pointer: coarse)').matches) {
        document.addEventListener('mousemove', e => {
          targetX = (e.clientX / window.innerWidth  - 0.5) * 0.5;
          targetY = (e.clientY / window.innerHeight - 0.5) * 0.3;
        });
      }

      const tick = () => {
        if (!running) return;
        rafId  = requestAnimationFrame(tick);
        const t = clock.getElapsedTime();

        /* Update shader uniforms */
        starField.material.uniforms.uTime.value       = t;
        nebulaParticles.material.uniforms.uTime.value = t;

        /* Gentle rotation */
        starField.rotation.y       = t * 0.007;
        starField.rotation.x       = Math.sin(t * 0.22) * 0.01;
        nebulaParticles.rotation.y = t * 0.003;
        nebulaParticles.rotation.z = Math.sin(t * 0.14) * 0.007;

        /* Camera drift */
        camera.position.x += (targetX - camera.position.x) * 0.025;
        camera.position.y += (-targetY - camera.position.y) * 0.025;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };
      tick();

      console.log('[ThreeBackground] ✓ Ambient canvas active — persistent across all scenes');
    }

    function stop()  { running = false; cancelAnimationFrame(rafId); }
    function start() {
      if (!running) {
        running = true;
        if (clock) clock.start();
        const canvas = document.getElementById('canvas-ambient');
        if (canvas) {
          const tick = () => {
            if (!running) return;
            rafId = requestAnimationFrame(tick);
            const t = clock.getElapsedTime();
            starField.material.uniforms.uTime.value       = t;
            nebulaParticles.material.uniforms.uTime.value = t;
            starField.rotation.y       = t * 0.007;
            nebulaParticles.rotation.y = t * 0.003;
            renderer.render(scene, camera);
          };
          tick();
        }
      }
    }

    return { init, stop, start };
  })();

  /* ══════════════════════════════════════════
     2. BOOT — no scene-reactive opacity changes
     The background stays consistent and alive at all times
  ══════════════════════════════════════════ */
  function boot() {
    AmbientCanvas.init();

    window.ThreeBackground = { AmbientCanvas };
    console.log('[ThreeBackground] ✓ Loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();