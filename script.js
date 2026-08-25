document.addEventListener("DOMContentLoaded", () => {
    const statusEl = document.getElementById('server-status');

    function showStatus(message) {
        if (!statusEl) return;
        statusEl.textContent = message;
        statusEl.classList.remove('hidden');
        statusEl.classList.add('show');
    }

    function hideStatus() {
        if (!statusEl) return;
        statusEl.classList.remove('show');
        statusEl.classList.add('hidden');
    }

    // Quick backend reachability check
    async function checkBackend() {
        if (window.location.protocol === 'file:') {
            showStatus('Please open the website through the server (e.g. http://localhost:3000). The contact form needs the backend to work.');
            return;
        }

        try {
            const resp = await fetch('/_status', { cache: 'no-store' });
            if (!resp.ok) throw new Error('status ' + resp.status);
            hideStatus();
        } catch (err) {
            console.warn('Backend _status check failed:', err);
            showStatus('Server not reachable — please start the backend (e.g. run `npm start`) and reload the page.');
        }
    }

    checkBackend();

    
    // --- 1. BULLET NAVIGATION FOR HERO SLIDESHOW (Auto-rotation every 2 seconds) ---
    const slides = document.querySelectorAll(".hero-slideshow .slide");
    const bullets = document.querySelectorAll(".slide-bullet");
    let currentIndex = 0;

    function showSlide(index) {
        if (slides.length === 0) return;
        
        // Hide all slides and bullets
        slides.forEach(slide => slide.classList.remove("active"));
        bullets.forEach(bullet => bullet.classList.remove("active"));
        
        // Show selected slide
        currentIndex = index;
        slides[currentIndex].classList.add("active");
        bullets[currentIndex].classList.add("active");
    }

    // Add click handlers to bullets
    bullets.forEach((bullet, index) => {
        bullet.addEventListener("click", () => showSlide(index));
    });

    // Auto-rotate slideshow every 2 seconds
    setInterval(() => {
        const nextIndex = (currentIndex + 1) % slides.length;
        showSlide(nextIndex);
    }, 2000);


    // --- 2. GENTLE SLIDING-WINDOW SCROLL REVEAL ANIMATION SYSTEM ---
    const elementsToReveal = document.querySelectorAll(".scroll-reveal");

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("reveal-active");
                // Keeps observing or unobserves for smooth entrance
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -8% 0px', // Creates the "sliding up over current window" effect
        threshold: 0.15 
    });

    elementsToReveal.forEach(el => revealObserver.observe(el));


    // --- 3. FORM HANDLER SUBMIT INTERACTION ---
    const webForm = document.getElementById('webForm');
    if (webForm) {
        webForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                const formData = new FormData(this);
                const payload = new URLSearchParams();

                for (const [key, value] of formData.entries()) {
                    payload.append(key, value.trim());
                }

                try {
                    const response = await fetch('/submit-contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: payload.toString()
                    });

                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message || `Submission failed (${response.status})`);

                    alert(result.message || 'Thank you for contacting ShreeBalaji Biosolutions. Our commercial team will get back to you shortly.');
                    this.reset();
                } catch (error) {
                    console.error('Form submit error:', error);
                    alert('Unable to submit the form right now. Please make sure the Node server is running and try again.');
                    // keep the status banner visible so user knows server may be down
                    showStatus('Server not reachable — please start the backend (e.g. run `npm start`) and reload the page.');
                }
            });
    }
});
