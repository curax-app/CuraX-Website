
(() => {
    'use strict';

    /**
     * CuraX Hero Dynamic Text Rotator
     *
     * Phrase hold: 4500ms
     * Exit animation: 250ms
     * Enter animation: 250ms
     * Total rotation interval: 5000ms
     */

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

    const HOLD_DURATION = 4500;
    const EXIT_DURATION = 250;
    const ENTER_DURATION = 250;

    /**
     * Initializes the dynamic tagline.
     */
    function initializeRotator() {
        const element = document.getElementById('curaxDynamicText');

        if (!element) {
            console.error('CuraX Rotator: Dynamic text element not found.');
            return;
        }

        // Avoid creating multiple timers.
        if (element.dataset.rotatorInitialized === 'true') {
            return;
        }

        element.dataset.rotatorInitialized = 'true';

        const reducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        );

        let currentIndex = 0;
        let timer = null;
        let phaseTimer = null;

        /**
         * Displays the phrase at the supplied index.
         */
        function setPhrase(index) {
            element.textContent = PHRASES[index];
        }

        /**
         * Clears the active timeouts.
         */
        function clearTimers() {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }

            if (phaseTimer !== null) {
                clearTimeout(phaseTimer);
                phaseTimer = null;
            }
        }

        /**
         * Removes active animation classes.
         */
        function resetAnimation() {
            element.classList.remove(
                'curax-text-exit',
                'curax-text-enter'
            );
        }

        /**
         * Schedules the next phrase change.
         */
        function scheduleNext() {
            if (document.hidden) {
                return;
            }

            timer = setTimeout(
                rotatePhrase,
                HOLD_DURATION +
                (reducedMotion.matches
                    ? EXIT_DURATION + ENTER_DURATION
                    : 0)
            );
        }

        /**
         * Animates the current phrase out and
         * displays the next phrase from below.
         */
        function rotatePhrase() {
            timer = null;

            if (document.hidden) {
                return;
            }

            const nextIndex = (currentIndex + 1) % PHRASES.length;

            if (reducedMotion.matches) {
                currentIndex = nextIndex;
                setPhrase(currentIndex);
                scheduleNext();
                return;
            }

            resetAnimation();

            element.classList.add('curax-text-exit');

            phaseTimer = setTimeout(() => {
                currentIndex = nextIndex;

                resetAnimation();
                setPhrase(currentIndex);

                // Restart the CSS animation for the new phrase.
                void element.offsetWidth;

                element.classList.add('curax-text-enter');

                phaseTimer = setTimeout(() => {
                    phaseTimer = null;

                    resetAnimation();
                    scheduleNext();
                }, ENTER_DURATION);

            }, EXIT_DURATION);
        }

        /**
         * Resets playback when the page or motion
         * preference changes.
         */
        function restartRotator() {
            clearTimers();
            resetAnimation();

            currentIndex = 0;
            setPhrase(currentIndex);

            scheduleNext();
        }

        document.addEventListener(
            'visibilitychange',
            restartRotator
        );

        if (reducedMotion.addEventListener) {
            reducedMotion.addEventListener(
                'change',
                restartRotator
            );
        } else {
            reducedMotion.addListener(
                restartRotator
            );
        }

        // Start with the first phrase.
        setPhrase(currentIndex);
        scheduleNext();

        console.info(
            'CuraX dynamic text rotator initialized:',
            PHRASES.length,
            'phrases'
        );
    }

    /**
     * Initialize only after the DOM is ready.
     */
    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initializeRotator,
            { once: true }
        );
    } else {
        initializeRotator();
    }
})();
