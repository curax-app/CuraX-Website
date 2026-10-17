(() => {
    'use strict';

    // Update phrases here; only the fixed prefix lives in the HTML.
    const PHRASES = [
        'Understand care.',
        'Book appointments.',
        'Book treatments.',
        'Book procedures.',
        'Book surgeries.',
        'Organize records.',
        'Explore options.',
        'Prepare for visits.',
        'Stay informed.',
        'Navigate healthcare.'
    ];

    const HOLD_MS = 1300;
    const EXIT_MS = 250;
    const ENTER_MS = 250;

    function init() {
        const element = document.getElementById('curaxDynamicText');
        if (!element) {
            console.error('CuraX tagline: #curaxDynamicText not found');
            return;
        }
        if (element.dataset.curaxDynamicReady === 'true') return;
        element.dataset.curaxDynamicReady = 'true';

        const viewport = element.closest('.curax-tagline-window');
        if (!viewport) {
            console.error('CuraX tagline: phrase window not found');
            return;
        }

        // Reserve the space required by the longest phrase. Without this,
        // the centered flex row changes width on each text update, shifting
        // the stationary "A better way to" prefix sideways.
        function sizeWindow() {
            const measure = element.cloneNode(false);
            measure.removeAttribute('id');
            measure.removeAttribute('style');
            measure.className = '';
            measure.style.position = 'absolute';
            measure.style.visibility = 'hidden';
            measure.style.pointerEvents = 'none';
            measure.style.width = 'max-content';
            measure.style.maxWidth = 'none';
            measure.style.whiteSpace = 'nowrap';
            measure.style.transform = 'none';
            measure.style.animation = 'none';
            viewport.appendChild(measure);
            let maxWidth = 0;
            for (const phrase of PHRASES) {
                measure.textContent = phrase;
                maxWidth = Math.max(maxWidth, measure.getBoundingClientRect().width);
            }
            measure.remove();
            viewport.style.width = `${Math.ceil(maxWidth + 2)}px`;
        }

        sizeWindow();
        window.addEventListener('resize', sizeWindow, { passive: true });
        if (document.fonts?.ready) {
            document.fonts.ready.then(sizeWindow).catch(() => {});
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let index = 0;
        let holdTimer;
        let phaseTimer;

        function clearTimers() {
            clearTimeout(holdTimer);
            clearTimeout(phaseTimer);
        }

        function show(indexToShow) {
            element.textContent = PHRASES[indexToShow];
        }

        function resetClasses() {
            element.classList.remove('curax-text-exit', 'curax-text-enter');
        }

        function schedule() {
            clearTimeout(holdTimer);
            if (!document.hidden) holdTimer = setTimeout(next, HOLD_MS);
        }

        function next() {
            if (document.hidden) return;
            const following = (index + 1) % PHRASES.length;
            if (reducedMotion.matches) {
                index = following;
                show(index);
                holdTimer = setTimeout(next, HOLD_MS + EXIT_MS + ENTER_MS);
                return;
            }

            resetClasses();
            element.classList.add('curax-text-exit');
            phaseTimer = setTimeout(() => {
                index = following;
                resetClasses();
                show(index);
                // Reflow so the enter animation restarts on every phrase.
                void element.offsetWidth;
                element.classList.add('curax-text-enter');
                phaseTimer = setTimeout(() => {
                    resetClasses();
                    schedule();
                }, ENTER_MS);
            }, EXIT_MS);
        }

        function restart() {
            clearTimers();
            resetClasses();
            index = 0;
            show(index);
            schedule();
        }

        document.addEventListener('visibilitychange', restart);
        if (reducedMotion.addEventListener) {
            reducedMotion.addEventListener('change', restart);
        } else {
            reducedMotion.addListener(restart);
        }

        restart();
        console.info('CuraX dynamic tagline ready:', PHRASES.length, 'phrases');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
