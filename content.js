/**
 * Neuro-Vibe Content Script
 * Professional-grade Holographic Cursor and DOM Interaction.
 */
(function() {
    console.log("[Neuro-Vibe] Content Script Professional Active");

    let cursor = null;
    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    const SMOOTHING = 0.25; // Professional EMA alpha for local rendering

    function initCursor() {
        if (cursor) return;
        cursor = document.createElement('div');
        cursor.id = 'neuro-holographic-cursor';
        Object.assign(cursor.style, {
            position: 'fixed',
            width: '24px',
            height: '24px',
            backgroundColor: 'rgba(74, 222, 128, 0.5)',
            boxShadow: '0 0 20px rgba(74, 222, 128, 0.8), inset 0 0 10px #fff',
            border: '2px solid #fff',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: '2147483647',
            top: '0',
            left: '0',
            display: 'none',
            transition: 'transform 0.05s linear',
            boxSizing: 'border-box'
        });
        (document.body || document.documentElement).appendChild(cursor);
        console.log("[Neuro-Vibe] Holographic Cursor Injected");
        requestAnimationFrame(animate);
    }

    function animate() {
        currentX += (targetX - currentX) * SMOOTHING;
        currentY += (targetY - currentY) * SMOOTHING;
        if (cursor) {
            cursor.style.transform = `translate(${currentX}px, ${currentY}px)`;
        }
        requestAnimationFrame(animate);
    }

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!cursor) initCursor();
        if (msg.type === 'CURSOR_MOVE') {
            // Optional: console.log every 100th move to verify connection
            if (Math.random() < 0.01) console.log("[Neuro-Vibe] Heartbeat: Cursor moving...");
        }

        switch (msg.type) {
            case 'CURSOR_MOVE':
                cursor.style.display = 'block';
                targetX = (1 - msg.x) * window.innerWidth;
                targetY = msg.y * window.innerHeight;
                break;
            case 'CURSOR_HIDE':
                cursor.style.display = 'none';
                break;
            case 'VIRTUAL_CLICK':
                performClick(currentX, currentY);
                break;
            case 'VIRTUAL_RIGHT_CLICK':
                performRightClick(currentX, currentY);
                break;
            case 'SCROLL':
                window.scrollBy({ top: msg.amount, behavior: 'smooth' });
                break;
            case 'APPLY_THEME':
                applyAccessibilityTheme(msg.theme);
                break;
        }
    });

    function performClick(x, y) {
        const el = document.elementFromPoint(x, y);
        if (el) {
            // Professional event dispatching (simulates real user interaction better than .click())
            const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y });
            const up = new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y });
            const click = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y });
            
            el.dispatchEvent(down);
            el.dispatchEvent(up);
            el.dispatchEvent(click);
            
            cursorAnimation('pulse-click');
        }
    }

    function performRightClick(x, y) {
        const el = document.elementFromPoint(x, y);
        if (el) {
            const ev = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: x,
                clientY: y
            });
            el.dispatchEvent(ev);
            cursorAnimation('pulse-right');
        }
    }

    function cursorAnimation(cls) {
        cursor.classList.add(cls);
        setTimeout(() => cursor.classList.remove(cls), 300);
    }

    function applyAccessibilityTheme(theme) {
        switch (theme) {
            case 'DYSLEXIA':
                document.body.style.fontFamily = 'OpenDyslexic, sans-serif';
                break;
            case 'FOCUS':
                // spotlight logic...
                break;
            case 'CLEAN':
                // Reset styles
                document.body.style.fontFamily = '';
                break;
        }
    }
})();
