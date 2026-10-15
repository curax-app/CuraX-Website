
(() => {
    'use strict';

    const cards = [
        ...document.querySelectorAll('.patient-card, .provider-card')
    ];

    if (cards.length !== 2) return;

    const motion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    );

    const DURATION = 8000;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    let userPaused = false;
    let documentVisible = !document.hidden;
    let cardsVisible = !('IntersectionObserver' in window);

    let animations = [];
    let animationStarted = false;

    /**
     * Creates a rounded rectangular SVG path.
     *
     * Patient:
     * Starts at top-right and travels down the right edge.
     *
     * Provider:
     * Starts at top-left and travels down the left edge.
     *
     * Each path's direction is encoded in its geometry,
     * so both can use the same animation settings.
     */
    function contour(width, height, reverse) {
        const x = 1;
        const y = 1;
        const right = width - 1;
        const bottom = height - 1;

        const radius = Math.max(
            0,
            Math.min(
                15,
                (right - x) / 2,
                (bottom - y) / 2
            )
        );

        if (!reverse) {
            // PATIENT: top-right -> downward -> clockwise
            return `
                M ${right} ${y + radius}
                V ${bottom - radius}
                Q ${right} ${bottom} ${right - radius} ${bottom}
                H ${x + radius}
                Q ${x} ${bottom} ${x} ${bottom - radius}
                V ${y + radius}
                Q ${x} ${y} ${x + radius} ${y}
                H ${right - radius}
                Q ${right} ${y} ${right} ${y + radius}
                Z
            `;
        }

        // PROVIDER: top-left -> downward -> counterclockwise
        return `
            M ${x} ${y + radius}
            V ${bottom - radius}
            Q ${x} ${bottom} ${x + radius} ${bottom}
            H ${right - radius}
            Q ${right} ${bottom} ${right} ${bottom - radius}
            V ${y + radius}
            Q ${right} ${y} ${right - radius} ${y}
            H ${x + radius}
            Q ${x} ${y} ${x} ${y + radius}
            Z
        `;
    }

    /**
     * Creates or updates an SVG path for the glow.
     */
    function ensurePath(element, pathData, className) {
        let path = element;

        if (element.tagName.toLowerCase() !== 'path') {
            path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('class', className);
            element.replaceWith(path);
        }

        path.setAttribute('d', pathData);
        path.setAttribute('pathLength', '100');

        return path;
    }

    /**
     * Builds the glow geometry for one card.
     */
    function sizeBorder(card) {
        const svg = card.querySelector('.card-pulse');

        if (!svg) return;

        const width = card.clientWidth;
        const height = card.clientHeight;

        if (width <= 2 || height <= 2) return;

        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const reverse = card.classList.contains('provider-card');

        const pathData = contour(
            width,
            height,
            reverse
        );

        const trailElement = svg.querySelector('.pulse-trail');
        const headElement = svg.querySelector('.pulse-head');

        if (!trailElement || !headElement) return;

        ensurePath(trailElement, pathData, 'pulse-trail');
        ensurePath(headElement, pathData, 'pulse-head');

        card.classList.add('pulse-ready');
    }

    /**
     * CSS defines the presentation of the glow.
     * The Web Animations API controls its timing.
     *
     * Both paths use identical offsets because their
     * geometry already defines opposite directions.
     */
    function createGlowAnimation(element, startOffset, endOffset) {
        const animation = element.animate(
            [
                {
                    strokeDashoffset: String(startOffset)
                },
                {
                    strokeDashoffset: String(endOffset)
                }
            ],
            {
                duration: DURATION,
                iterations: Infinity,
                easing: 'linear',
                fill: 'both'
            }
        );

        animation.pause();

        return animation;
    }

    /**
     * Initializes animations for both cards
     * on one shared timeline.
     */
    function initializeAnimations() {
        if (animationStarted) return;

        const paths = [];

        cards.forEach(card => {
            sizeBorder(card);

            const svg = card.querySelector('.card-pulse');

            if (!svg) return;

            const trail = svg.querySelector('.pulse-trail');
            const head = svg.querySelector('.pulse-head');

            if (!trail || !head) return;

            paths.push({ trail, head });
        });

        if (paths.length !== 2) return;

        animationStarted = true;

        // Disable the original CSS keyframe animation.
        paths.forEach(({ trail, head }) => {
            trail.style.animation = 'none';
            head.style.animation = 'none';
        });

        // Negative offsets advance the glowing segments
        // along the SVG path's drawing direction.
        paths.forEach(({ trail, head }) => {
            trail.style.strokeDasharray = '12 88';
            head.style.strokeDasharray = '3 97';

            animations.push(
                createGlowAnimation(trail, 0, -100)
            );

            animations.push(
                createGlowAnimation(head, -8, -108)
            );
        });

        // Align all four animations at the same phase.
        animations.forEach(animation => {
            animation.currentTime = 0;
        });

        updatePlayback();
    }

    /**
     * Synchronizes all animations.
     */
    function updatePlayback() {
        const paused =
            userPaused ||
            !documentVisible ||
            !cardsVisible ||
            motion.matches;

        cards.forEach(card => {
            card.classList.toggle('pulse-paused', paused);
        });

        animations.forEach(animation => {
            if (paused) {
                animation.pause();
            } else {
                animation.play();
            }
        });

        cards.forEach(card => {
            const control = card.querySelector('.pulse-control');

            if (!control) return;

            control.hidden = false;
            control.disabled = motion.matches;

            control.textContent = motion.matches
                ? 'Glow still'
                : userPaused
                    ? 'Resume glows'
                    : 'Pause glows';

            control.setAttribute(
                'aria-pressed',
                String(userPaused)
            );

            control.setAttribute(
                'aria-label',
                motion.matches
                    ? 'Border glow animation disabled by reduced motion'
                    : userPaused
                        ? 'Resume both card border animations'
                        : 'Pause both card border animations'
            );
        });
    }

    /**
     * Shared pause and resume controls.
     */
    cards.forEach(card => {
        const control = card.querySelector('.pulse-control');

        if (!control) return;

        control.addEventListener('click', () => {
            userPaused = !userPaused;
            updatePlayback();
        });
    });

    /**
     * Update the SVG paths when cards resize.
     */
    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(entries => {
            entries.forEach(entry => {
                sizeBorder(entry.target);
            });
        });

        cards.forEach(card => {
            resizeObserver.observe(card);
        });
    } else {
        window.addEventListener(
            'resize',
            () => cards.forEach(sizeBorder),
            { passive: true }
        );
    }

    /**
     * Synchronize visibility across both cards.
     */
    if ('IntersectionObserver' in window) {
        const visibleCards = new Set();

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    visibleCards.add(entry.target);
                } else {
                    visibleCards.delete(entry.target);
                }
            });

            cardsVisible = visibleCards.size > 0;

            updatePlayback();
        }, {
            threshold: 0
        });

        cards.forEach(card => observer.observe(card));
    }

    /**
     * Pause when the browser tab is hidden.
     */
    document.addEventListener(
        'visibilitychange',
        () => {
            documentVisible = !document.hidden;
            updatePlayback();
        }
    );

    /**
     * Respect reduced-motion settings.
     */
    const handleMotionChange = () => updatePlayback();

    if (motion.addEventListener) {
        motion.addEventListener('change', handleMotionChange);
    } else {
        motion.addListener(handleMotionChange);
    }

    /**
     * Preserve the original interactive glow
     * that follows pointer movement.
     */
    cards.forEach(card => {
        card.addEventListener(
            'pointermove',
            event => {
                if (
                    event.pointerType === 'touch' ||
                    motion.matches
                ) {
                    return;
                }

                const bounds = card.getBoundingClientRect();

                const glowX = Math.max(
                    0,
                    Math.min(
                        100,
                        ((event.clientX - bounds.left) / bounds.width) * 100
                    )
                );

                const glowY = Math.max(
                    0,
                    Math.min(
                        100,
                        ((event.clientY - bounds.top) / bounds.height) * 100
                    )
                );

                card.style.setProperty(
                    '--glow-x',
                    `${glowX}%`
                );

                card.style.setProperty(
                    '--glow-y',
                    `${glowY}%`
                );
            },
            { passive: true }
        );

        card.addEventListener('pointerleave', () => {
            card.style.removeProperty('--glow-x');
            card.style.removeProperty('--glow-y');
        });
    });

    /**
     * Initialize both animations after layout.
     */
    requestAnimationFrame(() => {
        initializeAnimations();
    });
})();
