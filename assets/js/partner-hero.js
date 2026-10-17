
/* =========================================================
   CuraX Partner - Dynamic Hero Headline
   Independent of CuraX User homepage
   ========================================================= */

(() => {
    'use strict';

    const WORDS = [
        'possibilities.',
        'opportunity.',
        'connections.',
        'efficiency.',
        'clarity.',
        'growth.',
        'confidence.',
        'visibility.',
        'potential.'
    ];

    const HOLD_DURATION = 1000;
    const TRANSITION_DURATION = 800;

    function initializePartnerHero() {
        const root = document.querySelector('[data-curax-hero]');

        if (!root || root.dataset.partnerRotatorReady === 'true') {
            return;
        }

        const current = root.querySelector('[data-word-current]');
        const next = root.querySelector('[data-word-next]');
        const sizer = root.querySelector('[data-word-sizer]');

        if (!current || !next) {
            console.error('CuraX Partner: Rotating headline elements missing.');
            return;
        }

        root.dataset.partnerRotatorReady = 'true';

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        );

        let index = 0;
        let timer = null;
        let animations = [];

        function measureWords() {
            if (!sizer) return;

            sizer.replaceChildren();

            WORDS.forEach(word => {
                const span = document.createElement('span');
                span.textContent = word;
                sizer.appendChild(span);
            });
        }

        function showCurrentWord() {
            current.textContent = WORDS[index];
            next.textContent = WORDS[(index + 1) % WORDS.length];
        }

        function clearAnimations() {
            animations.forEach(animation => animation.cancel());
            animations = [];
        }

        function scheduleNext() {
            clearTimeout(timer);

            if (!document.hidden) {
                timer = setTimeout(rotateWord, HOLD_DURATION);
            }
        }

        async function rotateWord() {
            if (document.hidden) return;

            if (reducedMotion.matches) {
                index = (index + 1) % WORDS.length;
                showCurrentWord();
                scheduleNext();
                return;
            }

            next.textContent = WORDS[(index + 1) % WORDS.length];

            const options = {
                duration: TRANSITION_DURATION,
                easing: 'cubic-bezier(.22, 1, .36, 1)',
                fill: 'forwards'
            };

            const outgoing = current.animate([
                { transform: 'translateY(0)', opacity: 1 },
                { transform: 'translateY(-105%)', opacity: 0 }
            ], options);

            const incoming = next.animate([
                { transform: 'translateY(105%)', opacity: 0 },
                { transform: 'translateY(0)', opacity: 1 }
            ], options);

            animations = [outgoing, incoming];

            try {
                await Promise.all(
                    animations.map(animation => animation.finished)
                );
            } catch {
                return;
            }

            index = (index + 1) % WORDS.length;

            clearAnimations();
            showCurrentWord();
            scheduleNext();
        }

        function restart() {
            clearTimeout(timer);
            clearAnimations();

            index = 0;
            showCurrentWord();
            scheduleNext();
        }

        document.addEventListener('visibilitychange', restart);

        if (reducedMotion.addEventListener) {
            reducedMotion.addEventListener('change', restart);
        }

        measureWords();
        showCurrentWord();
        scheduleNext();

        console.info(
            'CuraX Partner headline initialized:',
            WORDS.length,
            'words'
        );
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializePartnerHero,
            { once: true }
        );
    } else {
        initializePartnerHero();
    }
})();
