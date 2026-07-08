/**
 * state.js
 * Global Reactive State — single source of truth for runtime state
 * All systems read from and write to this store via the API.
 * Emits 'statechange' CustomEvents so systems can react without coupling.
 */

;(function() {
  'use strict';

  /* ── Private store ── */
  let _store = {
    // Scene state
    currentScene:   0,
    previousScene: -1,
    isAnimating:    false,

    // App lifecycle
    isReplay:       false,
    isLoaded:       false,
    hasStarted:     false,

    // Slider state
    msgSliderIndex: 0,

    // Performance
    fps:            60,
    isLowEnd:       false,
    isTouch:        false,
  };

  /* ── Listeners ── */
  const _listeners = {};

  function _emit(key, newVal, oldVal) {
    document.dispatchEvent(new CustomEvent('statechange', {
      detail: { key, newVal, oldVal },
      bubbles: false,
    }));
    if (_listeners[key]) {
      _listeners[key].forEach(fn => fn(newVal, oldVal));
    }
  }

  /* ══════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════ */
  const State = {

    /** Read a value */
    get(key) {
      return _store[key];
    },

    /** Write a value — triggers 'statechange' event */
    set(key, value) {
      if (!(key in _store)) {
        console.warn(`[State] Unknown key: "${key}"`);
      }
      const old = _store[key];
      if (old === value) return;
      _store[key] = value;
      _emit(key, value, old);
    },

    /** Subscribe to a specific key change */
    on(key, fn) {
      if (!_listeners[key]) _listeners[key] = [];
      _listeners[key].push(fn);
      return () => {
        _listeners[key] = _listeners[key].filter(f => f !== fn);
      };
    },

    /** Convenience: check animation lock */
    isLocked() {
      return _store.isAnimating;
    },

    /** Convenience: set animation lock */
    lock() {
      this.set('isAnimating', true);
    },

    /** Convenience: release animation lock */
    unlock() {
      this.set('isAnimating', false);
    },

    /** Reset to initial values (used on replay) */
    reset() {
      const previous = { ..._store };
      _store.currentScene   = 0;
      _store.previousScene  = -1;
      _store.isAnimating    = false;
      _store.isReplay       = true;
      _store.hasStarted     = false;
      _store.msgSliderIndex = 0;
      // Emit a bulk reset event
      document.dispatchEvent(new CustomEvent('statereset', {
        detail: { previous },
        bubbles: false,
      }));
      console.log('[State] ✓ Reset');
    },

    /** Dump for debugging */
    debug() {
      console.table({ ..._store });
    },
  };

  window.State = State;
  console.log('[State] ✓ Loaded');

})();
