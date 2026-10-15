(() => {
    'use strict';

    const track = document.getElementById('curax-tagline-track');
    if (!track) return;

    const windowElement = track.closest('.curax-tagline-window');
    const items = Array.from(track.querySelectorAll('.curax-tagline-item'));
    if (!windowElement || items.length < 2) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const INTERVAL_MS = 2600;
    const TRANSITION_MS = 480;
    const EASING = 'cubic-bezier(.22, 1, .36, 1)';

    // The final cloned item makes the last-to-first slide seamless.
    const clone = items[0].cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);

    let index = 0;
    let timer = null;
    let moving = false;
    let stepHeight = 0;

    function measure() {
        stepHeight = items[0].getBoundingClientRect().height;
        const maxWidth = Math.max(...items.map(item => item.scrollWidth));
        // The width is sized for the longest phrase to prevent layout movement.
        windowElement.style.width = `${Math.ceil(maxWidth + 2)}px`;
        track.style.transition = 'none';
        track.style.transform = `translate3d(0, ${-index * stepHeight}px, 0)`;
        // Flush the style so the next transition is always applied cleanly.
        void track.offsetHeight;
    }

    function stop() {
        if (timer !== null) window.clearInterval(timer);
        timer = null;
    }

    function resetToFirst() {
        track.style.transition = 'none';
        index = 0;
        track.style.transform = 'translate3d(0, 0, 0)';
        moving = false;
    }

    function next() {
        if (moving || reduceMotion.matches || document.hidden || !stepHeight) return;
        moving = true;
        index += 1;
        track.style.transition = `transform ${TRANSITION_MS}ms ${EASING}`;
        track.style.transform = `translate3d(0, ${-index * stepHeight}px, 0)`;
    }

    track.addEventListener('transitionend', event => {
        if (event.target !== track || event.propertyName !== 'transform') return;
        if (index === items.length) resetToFirst();
        else moving = false;
    });

    function sync() {
        stop();
        if (reduceMotion.matches) {
            resetToFirst();
            return;
        }
        if (!document.hidden) timer = window.setInterval(next, INTERVAL_MS);
    }

    measure();
    sync();
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('visibilitychange', sync);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', sync);
    else reduceMotion.addListener(sync);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
})();
