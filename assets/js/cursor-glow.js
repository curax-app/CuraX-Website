(() => {
  'use strict';
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const preferenceKey = 'curax-cursor-glow';
  const toggle = document.querySelector('.cursor-toggle');
  let enabled = true;
  try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch (_) {}

  const layer = document.createElement('div');
  layer.className = 'cx-cursor-layer';
  layer.setAttribute('aria-hidden', 'true');
  const topLayer = typeof layer.showPopover === 'function';
  if (topLayer) layer.setAttribute('popover', 'manual');
  const make = (name, parent = layer) => {
    const node = document.createElement('div'); node.className = name; parent.append(node); return node;
  };
  const trails = Array.from({length: 7}, () => ({node: make('cx-cursor-trail'), x: 0, y: 0}));
  const ring = make('cx-cursor-ring');
  make('cx-cursor-orbit', ring);
  const dot = make('cx-cursor-dot');
  const ripple = make('cx-cursor-ripple');
  const wave = make('cx-cursor-ripple-wave', ripple);
  document.body.append(layer);

  let frame = 0, lastTime = 0, lastMove = 0, hasPosition = false, active = false;
  let x = 0, y = 0, ringX = 0, ringY = 0, rippleAnimation = null;
  const allowed = () => enabled && finePointer.matches && !reducedMotion.matches && !document.hidden;
  const position = (node, px, py, scale = 1) => {
    node.style.transform = `translate3d(${px.toFixed(2)}px,${py.toFixed(2)}px,0) scale(${scale})`;
  };
  function hide() {
    active = false; hasPosition = false;
    layer.classList.remove('cx-cursor-visible', 'cx-cursor-hot');
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastTime = 0;
    if (rippleAnimation) rippleAnimation.cancel();
  }
  function show() {
    if (!topLayer && document.querySelector('dialog[open]')) return false;
    if (topLayer && !layer.matches(':popover-open')) {
      try { layer.showPopover(); } catch (_) { return false; }
    }
    active = true; layer.classList.add('cx-cursor-visible'); return true;
  }
  function syncPreference() {
    if (toggle) {
      toggle.hidden = !finePointer.matches || reducedMotion.matches;
      toggle.textContent = `Cursor glow: ${enabled ? 'On' : 'Off'}`;
      toggle.setAttribute('aria-label', `${enabled ? 'Turn off' : 'Turn on'} cursor glow`);
      toggle.setAttribute('aria-pressed', String(enabled));
    }
    if (!allowed()) hide();
  }
  function animate(time) {
    frame = 0;
    if (!active || !allowed()) { hide(); return; }
    const dt = Math.min(40, Math.max(1, lastTime ? time - lastTime : 16));
    lastTime = time;
    const ease = 1 - Math.exp(-dt / 68);
    ringX += (x - ringX) * ease; ringY += (y - ringY) * ease;
    position(ring, ringX, ringY); position(dot, x, y);
    const freshness = Math.max(0, 1 - (time - lastMove) / 450);
    let leadX = ringX, leadY = ringY;
    trails.forEach((trail, index) => {
      const lag = 1 - Math.exp(-dt / (34 + index * 5));
      trail.x += (leadX - trail.x) * lag; trail.y += (leadY - trail.y) * lag;
      const distance = Math.hypot(x - trail.x, y - trail.y);
      trail.node.style.opacity = String(freshness * Math.min(1, distance / 25) * (0.42 - index * 0.045));
      position(trail.node, trail.x, trail.y, 1 - index * 0.085);
      leadX = trail.x; leadY = trail.y;
    });
    if (freshness > 0 || Math.hypot(x - ringX, y - ringY) > 0.12) frame = requestAnimationFrame(animate);
    else lastTime = 0;
  }
  function move(event) {
    if (event.pointerType === 'touch' || !allowed()) { hide(); return; }
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],iframe')) { hide(); return; }
    x = event.clientX; y = event.clientY; lastMove = performance.now();
    if (!hasPosition) {
      ringX = x; ringY = y; trails.forEach(trail => { trail.x = x; trail.y = y; trail.node.style.opacity = '0'; });
      position(ring, x, y); position(dot, x, y); hasPosition = true;
    }
    if (!show()) { hide(); return; }
    layer.classList.toggle('cx-cursor-hot', Boolean(target?.closest('a[href],button:not(:disabled),summary,[role="button"]:not([aria-disabled="true"])')));
    if (!frame) frame = requestAnimationFrame(animate);
  }
  document.addEventListener('pointermove', move, {passive: true});
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') { hide(); return; }
    if (!active || !allowed() || typeof wave.animate !== 'function') return;
    position(ripple, event.clientX, event.clientY);
    if (rippleAnimation) rippleAnimation.cancel();
    rippleAnimation = wave.animate([
      {transform: 'translate(-50%,-50%) scale(.6)', opacity: .65},
      {transform: 'translate(-50%,-50%) scale(2.3)', opacity: 0}
    ], {duration: 580, easing: 'cubic-bezier(.16,1,.3,1)'});
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', hide);
  document.addEventListener('keydown', hide);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); });
  window.addEventListener('blur', hide);
  window.addEventListener('pagehide', hide);
  window.addEventListener('resize', hide, {passive: true});
  const watch = media => {
    if (media.addEventListener) media.addEventListener('change', syncPreference);
    else media.addListener(syncPreference);
  };
  watch(finePointer); watch(reducedMotion);
  if (toggle) toggle.addEventListener('click', () => {
    enabled = !enabled;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch (_) {}
    syncPreference();
  });
  window.addEventListener('storage', event => {
    if (event.key === preferenceKey || event.key === null) {
      try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch (_) {}
      syncPreference();
    }
  });
  // Refresh top-layer order when an invite or information dialog opens.
  if ('MutationObserver' in window) {
    const observer = new MutationObserver(() => {
      if (!active) return;
      if (!topLayer) { hide(); return; }
      try { if (layer.matches(':popover-open')) layer.hidePopover(); layer.showPopover(); } catch (_) { hide(); }
    });
    document.querySelectorAll('dialog').forEach(dialog => observer.observe(dialog, {attributes: true, attributeFilter: ['open']}));
  }
  syncPreference();
})();
