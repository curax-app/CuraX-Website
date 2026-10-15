/* Shared browser-only motion engine. No framework, network requests or server callbacks. */
export const DEFAULT_WORDS = Object.freeze(['possibilities','opportunity','connections','growth','visibility','clarity','efficiency','confidence','potential']);
export const ALL_WORDS = Object.freeze([...DEFAULT_WORDS,'momentum','progress','innovation','reach','impact','coordination']);
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const INSTANCE = Symbol.for('curax.rotatingHero');
const ENTRANCE_MS = 1240;

export function normalizeOptions(input = {}) {
  const configured = Array.isArray(input.words) ? input.words : DEFAULT_WORDS;
  const words = [...new Set(configured.filter(word => typeof word === 'string').map(word => word.trim().replace(/\.+$/, '')).filter(Boolean))];
  const duration = (value, fallback, minimum, maximum) => Number.isFinite(value) ? Math.max(minimum, Math.min(maximum, value)) : fallback;
  const transitionDurationMs = duration(input.transitionDurationMs, 320, 100, 2000);
  // Keep explicit legacy hold settings compatible; new intervals include the slide.
  const legacyInterval = Number.isFinite(input.displayDurationMs) ? duration(input.displayDurationMs, 1480, 1000, 60000) + transitionDurationMs : 1800;
  const rotationIntervalMs = duration(Number.isFinite(input.rotationIntervalMs) ? input.rotationIntervalMs : legacyInterval, 1800, Math.max(1000, transitionDurationMs), 60000);
  return {
    words: words.length ? words : [...DEFAULT_WORDS],
    rotationIntervalMs,
    displayDurationMs: rotationIntervalMs - transitionDurationMs,
    transitionDurationMs,
    fadeDurationMs: duration(input.fadeDurationMs, Math.min(280, transitionDurationMs), 1, transitionDurationMs),
    parallax: input.parallax !== false,
    manageMeasurements: input.manageMeasurements !== false
  };
}

export function createRotatingHero(root, configuration = {}) {
  if (!root) throw new Error('CuraX hero root is required.');
  if (root[INSTANCE]) root[INSTANCE].dispose();
  const copy = root.querySelector('[data-hero-copy]');
  const title = root.querySelector('[data-hero-title]');
  const current = root.querySelector('[data-word-current]');
  const next = root.querySelector('[data-word-next]');
  const sizer = root.querySelector('[data-word-sizer]');
  const prefix = root.querySelector('[data-word-prefix]');
  const firstLine = root.querySelector('[data-fit-static]');
  const wordWindow = root.querySelector('[data-word-window]');
  if (![copy,title,current,next,sizer,prefix,firstLine,wordWindow].every(Boolean)) throw new Error('CuraX hero markup is incomplete.');
  const toggle = root.querySelector('[data-hero-toggle]');
  const landscape = root.querySelector('[data-hero-landscape]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
  const supportsMotion = typeof current.animate === 'function';
  const removers = [];
  let options = normalizeOptions(configuration), disposed = false, generation = 0, index = 0;
  let inView = !('IntersectionObserver' in window), manualPaused = false, backgroundPaused = false;
  let running = false, phase = 'static', remaining = 0, deadline = 0, timer = 0;
  let entrance = [], transition = [], fitFrame = 0, scrollFrame = 0, observedWidth = -1;
  let intersectionObserver, resizeObserver, removalObserver;
  const listen = (target, type, handler, settings) => {
    target.addEventListener(type, handler, settings);
    removers.push(() => target.removeEventListener(type, handler, settings));
  };
  const watch = (media, handler) => {
    if (media.addEventListener) listen(media, 'change', handler);
    else { media.addListener(handler); removers.push(() => media.removeListener(handler)); }
  };
  const visible = () => !disposed && inView && !document.hidden;
  const canRun = () => visible() && !reduced.matches && !manualPaused && supportsMotion;
  function stopClock(preserve = true) {
    if (timer) { clearTimeout(timer); if (preserve) remaining = Math.max(0, deadline - performance.now()); }
    timer = 0;
  }
  function cancelAnimations() {
    generation++; stopClock(false);
    [...entrance,...transition].forEach(animation => animation.cancel());
    entrance = []; transition = []; running = false;
  }
  function measureWords() {
    if (!options.manageMeasurements) return;
    const words = [...new Set([...options.words,'possibilities'])];
    const fragment = document.createDocumentFragment();
    words.forEach(word => { const span = document.createElement('span'); span.textContent = word + '.'; fragment.append(span); });
    sizer.replaceChildren(fragment);
  }
  function fitHeadline() {
    fitFrame = 0;
    if (disposed || !root.isConnected) return;
    // This read/write work occurs only at setup, font load, or width changes, never per word.
    title.style.removeProperty('--cx-title-fit');
    const base = parseFloat(getComputedStyle(title).fontSize);
    const gap = parseFloat(getComputedStyle(prefix.parentElement).columnGap) || base * .22;
    const required = Math.max(firstLine.getBoundingClientRect().width, prefix.getBoundingClientRect().width + wordWindow.getBoundingClientRect().width + gap);
    const available = copy.clientWidth;
    if (required > available && available > 0) title.style.setProperty('--cx-title-fit', `${base * (available - 2) / required}px`);
  }
  function queueFit() { if (!disposed && !fitFrame) fitFrame = requestAnimationFrame(fitHeadline); }
  function resetParallax() { if (landscape) landscape.style.removeProperty('--cx-parallax-y'); }
  function updateParallax() {
    scrollFrame = 0;
    if (!landscape || !visible() || reduced.matches || !desktop.matches || !options.parallax || backgroundPaused) { resetParallax(); return; }
    const y = Math.max(-22, Math.min(22, -root.getBoundingClientRect().top * .05));
    landscape.style.setProperty('--cx-parallax-y', `${y.toFixed(2)}px`);
  }
  function queueParallax() {
    if (!disposed && !scrollFrame && visible() && desktop.matches && !reduced.matches && options.parallax && !backgroundPaused) scrollFrame = requestAnimationFrame(updateParallax);
  }
  function refreshToggle() {
    if (!toggle) return;
    toggle.hidden = reduced.matches || !supportsMotion || options.words.length < 2;
    toggle.textContent = manualPaused ? 'Resume headline' : 'Pause headline';
    toggle.setAttribute('aria-pressed', String(manualPaused));
    toggle.setAttribute('aria-label', manualPaused ? 'Resume rotating headline' : 'Pause rotating headline');
  }
  function onClock() {
    timer = 0; remaining = 0;
    if (!canRun()) return;
    if (phase === 'entrance') {
      entrance.forEach(animation => animation.cancel()); entrance = [];
      phase = options.words.length > 1 ? 'hold' : 'idle'; remaining = options.displayDurationMs;
      sync();
    } else if (phase === 'hold') beginTransition();
  }
  function sync() {
    if (disposed) return;
    const play = canRun();
    if (!play) {
      stopClock();
      [...entrance,...transition].forEach(animation => { if (animation.playState !== 'finished') animation.pause(); });
      running = false; resetParallax();
    } else {
      if (!running) { [...entrance,...transition].forEach(animation => { if (animation.playState !== 'finished') animation.play(); }); running = true; }
      if (!timer && (phase === 'entrance' || phase === 'hold')) {
        deadline = performance.now() + remaining; timer = setTimeout(onClock, remaining);
      }
      queueParallax();
    }
    refreshToggle();
  }
  function beginTransition() {
    if (disposed || !canRun() || options.words.length < 2) return;
    phase = 'transition';
    const nextIndex = (index + 1) % options.words.length;
    next.textContent = options.words[nextIndex] + '.';
    const timing = {duration: options.transitionDurationMs, easing: EASING, fill: 'both'};
    const fadeTiming = {duration: options.fadeDurationMs, easing: EASING, fill: 'both'};
    const serial = generation;
    transition = [
      current.animate([{transform:'translate3d(0,0,0)',filter:'blur(0px)'},{transform:'translate3d(0,-105%,0)',filter:'blur(2px)'}], timing),
      next.animate([{transform:'translate3d(0,105%,0)',filter:'blur(2px)'},{transform:'translate3d(0,0,0)',filter:'blur(0px)'}], timing),
      current.animate([{opacity:1},{opacity:0}], fadeTiming),
      next.animate([{opacity:0},{opacity:1}], fadeTiming)
    ];
    Promise.all(transition.map(animation => animation.finished)).then(() => {
      if (disposed || serial !== generation) return;
      index = nextIndex; current.textContent = options.words[index] + '.';
      transition.forEach(animation => animation.cancel()); transition = [];
      next.textContent = options.words[(index + 1) % options.words.length] + '.';
      phase = 'hold'; remaining = options.displayDurationMs; sync();
    }).catch(() => { /* Disposal, reconfiguration and reduced motion cancel safely. */ });
  }
  function setupMotion() {
    cancelAnimations(); index = 0;
    current.textContent = reduced.matches || !supportsMotion ? 'possibilities.' : options.words[0] + '.';
    next.textContent = options.words[1 % options.words.length] + '.';
    if (reduced.matches || !supportsMotion) { phase = 'static'; remaining = 0; resetParallax(); refreshToggle(); return; }
    const stages = {eyebrow:[0,560,0],first:[100,700,10],second:[220,700,10],description:[420,620,6],audiences:[500,620,0],location:[540,620,0],actions:[620,600,8],note:[740,500,0]};
    entrance = [...root.querySelectorAll('[data-hero-enter]')].map(node => {
      const [delay,duration,rise] = stages[node.dataset.heroEnter] || [0,600,6];
      const animation = node.animate([{opacity:0,transform:`translate3d(0,${rise}px,0)`},{opacity:1,transform:'translate3d(0,0,0)'}], {delay,duration,easing:EASING,fill:'both'});
      animation.pause(); animation.currentTime = 0; return animation;
    });
    phase = 'entrance'; remaining = ENTRANCE_MS; sync();
  }
  function update(configuration = {}) {
    if (disposed) return;
    const nextOptions = normalizeOptions(configuration);
    if (JSON.stringify(options) === JSON.stringify(nextOptions)) return;
    options = nextOptions; measureWords(); queueFit(); setupMotion();
  }
  function setPaused(value) { if (!disposed) { manualPaused = Boolean(value); sync(); } }
  function dispose() {
    if (disposed) return;
    disposed = true; cancelAnimations();
    if (fitFrame) cancelAnimationFrame(fitFrame);
    if (scrollFrame) cancelAnimationFrame(scrollFrame);
    intersectionObserver?.disconnect(); resizeObserver?.disconnect(); removalObserver?.disconnect();
    removers.forEach(remove => remove());
    title.style.removeProperty('--cx-title-fit'); resetParallax();
    if (toggle) toggle.hidden = true;
    delete root[INSTANCE];
  }
  const controller = {update,setPaused,dispose,refresh:sync};
  root[INSTANCE] = controller;
  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; sync(); }, {threshold:0});
    intersectionObserver.observe(root);
  }
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (Math.abs(width - observedWidth) > .5) { observedWidth = width; queueFit(); }
    }); resizeObserver.observe(copy);
  } else listen(window, 'resize', queueFit, {passive:true});
  if ('MutationObserver' in window) {
    removalObserver = new MutationObserver(() => { if (!root.isConnected) dispose(); });
    removalObserver.observe(document.body, {childList:true,subtree:true});
  }
  listen(document, 'visibilitychange', sync);
  listen(window, 'scroll', queueParallax, {passive:true});
  listen(window, 'resize', queueParallax, {passive:true});
  listen(document, 'curax:background-motion', event => { backgroundPaused = Boolean(event.detail?.paused); updateParallax(); });
  if (toggle) listen(toggle, 'click', () => setPaused(!manualPaused));
  watch(reduced, () => { setupMotion(); queueFit(); });
  watch(desktop, updateParallax);
  if (document.fonts) {
    document.fonts.ready.then(() => { if (!disposed) queueFit(); });
    if (document.fonts.addEventListener) listen(document.fonts, 'loadingdone', queueFit);
  }
  measureWords(); queueFit(); setupMotion();
  return controller;
}
